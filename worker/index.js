// Lambda usage counters (Oct 2026). See worker/README.md.
//
// The site is static files on GitHub Pages (torryscott.github.io/lambda).
// This Worker is its only server part: it keeps whole-day counts in a D1
// database and answers three paths.
//
//   POST /api/hit/<kind>   one empty ping from a page of the site; kind is
//                          one of KINDS below. No body, no cookie, no
//                          identifier is read or stored. Pings from other
//                          sites, crawlers, HTTP libraries and Cloudflare's
//                          verified bots are dropped (fromSite, isCountable).
//   GET  /api/counts       running totals per kind, plus what GoatCounter
//                          counted before this counter took over, for the
//                          home page footer and the usage page.
//   GET  /api/daily        the same counts day by day, for the usage page's
//                          charts.
//
// Storage is hits(day, kind, n) and totals(kind, n): whole-day integers and
// nothing else. carried(kind, n) holds GoatCounter's totals on the day of
// the switch, and meta(key, value) the dates (worker/carry-over.sql).
// Without the database binding, pings are dropped and the GETs answer 503;
// the pages hide their counters and nothing else changes.

const PAGES = ["home", "atlas", "quiz", "glossary", "print", "link-builder", "accessibility"];
// The views in views.js. A new view needs its id added here, or its pings
// are dropped.
const VIEWS = ["dorsal", "lateral", "ventral", "posterior-internal", "pulled-back-lateral", "midsagittal",
  "coronal-a", "coronal-b", "coronal-c", "coronal-d", "coronal-e", "coronal-f"];
// A quiz runs over everything, one group of views, or one view. Midsagittal
// is both a group and that group's only view, so it is one scope.
const SCOPES = [...new Set(["everything", "surface", "midsagittal", "coronal", ...VIEWS])];
const MODES = ["name", "describe"];
const KINDS = new Set([
  ...PAGES.map(p => "page/" + p),
  ...VIEWS.map(v => "atlas/" + v),
  ...SCOPES.flatMap(s => MODES.flatMap(m => ["quiz-start/" + s + "/" + m, "quiz-finish/" + s + "/" + m])),
  "print-pdf", "print-paper", "link-copied", "visit-day",
]);

const SITE = "https://torryscott.github.io";
const LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

// Did a page of the site send this? A browser sends Origin on every POST
// (sendBeacon included); Referer is the fallback for the rare agent that
// omits it. Local pages count too, for `wrangler dev`: the site's own pages
// on localhost send their pings there, never here.
function fromSite(req) {
  const origin = req.headers.get("Origin");
  if (origin) return origin === SITE || LOCAL.test(origin);
  try {
    const o = new URL(req.headers.get("Referer") || "").origin;
    return o === SITE || LOCAL.test(o);
  } catch (e) { return false; }
}

// Crawlers and scripts announce themselves in the User-Agent; this is the
// well-behaved majority (search engines, link previewers, AI crawlers,
// monitors, HTTP libraries). A scraper pretending to be Chrome gets past
// it, as it gets past every counter.
const BOT_UA = /bot|crawl|spider|slurp|scan|monitor|headless|lighthouse|pagespeed|python-requests|python-urllib|curl\/|wget\/|httpclient|java\/|go-http-client|libwww|okhttp|axios\/|node-fetch|undici|phantomjs|facebookexternalhit|embedly|whatsapp|telegrambot|skypeuripreview|discordbot|pinterest|linkedinbot|twitterbot|applebot|gptbot|claudebot|anthropic|ccbot|bytespider|petalbot|semrush|ahrefs|mj12|yandex|baidu|duckduck|bingpreview|ia_archiver|archive\.org|feedfetcher|validator|uptime|pingdom|datadog|newrelic|siteimprove/i;

// Would a person's browser have sent this? The User-Agent names no crawler
// or HTTP library; the Sec-Fetch headers, when present, say a page made the
// request (the site is on another host than this Worker, so cross-site is
// the normal case, and "none" means someone typed the address); and
// Cloudflare does not flag it as a verified bot.
function isCountable(req) {
  const ua = req.headers.get("User-Agent") || "";
  if (!ua || BOT_UA.test(ua)) return false;
  const site = req.headers.get("Sec-Fetch-Site");
  if (site && site === "none") return false;
  const mode = req.headers.get("Sec-Fetch-Mode");
  if (mode && mode !== "no-cors" && mode !== "cors" && mode !== "same-origin") return false;
  const cf = req.cf || {};
  if (cf.verifiedBotCategory) return false;
  if (cf.botManagement && cf.botManagement.verifiedBot) return false;
  return true;
}

function db(env) { return env.lambda_counts || env.DB || null; }

// One batch is one transaction: the day's row and the running total move
// together, so the footer (totals) and the charts (hits) always agree.
async function bump(d, kind) {
  await d.batch([
    d.prepare("INSERT INTO hits (day, kind, n) VALUES (date('now'), ?, 1) " +
              "ON CONFLICT(day, kind) DO UPDATE SET n = n + 1").bind(kind),
    d.prepare("INSERT INTO totals (kind, n) VALUES (?, 1) " +
              "ON CONFLICT(kind) DO UPDATE SET n = n + 1").bind(kind),
  ]);
}

async function meta(d) {
  const out = {};
  for (const r of ((await d.prepare("SELECT key, value FROM meta").all()).results || [])) out[r.key] = r.value;
  return out;
}

const NO_STORE = { "Cache-Control": "no-store" };
// The counts are public totals, readable from any page (the usage page is on
// GitHub Pages, and a local copy of it must work too).
const CORS = { "Access-Control-Allow-Origin": "*" };
function unavailable(why) {
  return Response.json({ error: why }, { status: 503, headers: Object.assign({}, CORS, NO_STORE) });
}

export { KINDS, fromSite, isCountable };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const d = db(env);

    if (url.pathname.startsWith("/api/hit/")) {
      if (req.method !== "POST") return new Response(null, { status: 405, headers: NO_STORE });
      const kind = url.pathname.slice("/api/hit/".length);
      if (d && KINDS.has(kind) && fromSite(req) && isCountable(req)) {
        try { await bump(d, kind); }
        catch (e) { console.log("count failed:", kind, String(e)); }   // a full day's quota or a hiccup: an undercount, never an error to the visitor
      }
      return new Response(null, { status: 204, headers: NO_STORE });
    }

    if (url.pathname === "/api/counts") {
      if (!d) return unavailable("counter database not configured");
      try {
        const [totals, carried, m] = await Promise.all([
          d.prepare("SELECT kind, n FROM totals").all(),
          d.prepare("SELECT kind, n FROM carried").all(),
          meta(d),
        ]);
        const pick = rows => Object.fromEntries((rows.results || []).map(r => [r.kind, Number(r.n) || 0]));
        return Response.json({
          updated: new Date().toISOString(),
          since: m.counting_since || null,            // the first day this counter ran
          carriedFrom: m.carried_from || null,         // when GoatCounter started
          counts: pick(totals),
          carried: pick(carried),                      // GoatCounter's totals as of `since`
        }, { headers: Object.assign({ "Cache-Control": "public, max-age=60" }, CORS) });
      } catch (e) { return unavailable("counter database unavailable"); }
    }

    if (url.pathname === "/api/daily") {
      if (!d) return unavailable("counter database not configured");
      try {
        const [rows, m] = await Promise.all([
          d.prepare("SELECT day, kind, n FROM hits ORDER BY day, kind").all(),
          meta(d),
        ]);
        const hits = {};
        for (const r of rows.results || []) (hits[r.kind] = hits[r.kind] || []).push([r.day, Number(r.n) || 0]);
        // A kind with no row on a day had zero that day.
        return Response.json({ updated: new Date().toISOString(), since: m.counting_since || null, hits },
          { headers: Object.assign({ "Cache-Control": "public, max-age=60" }, CORS) });
      } catch (e) { return unavailable("counter database unavailable"); }
    }

    return new Response("Lambda usage counter. See https://github.com/torryscott/lambda/tree/main/worker\n",
      { status: url.pathname === "/" ? 200 : 404, headers: Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, NO_STORE) });
  },
};
