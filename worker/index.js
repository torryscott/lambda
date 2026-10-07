// Lambda usage counters (Oct 2026). See worker/README.md.
//
// The site is static files on GitHub Pages (torryscott.github.io/lambda).
// This Worker is its only server part: it keeps whole-day counts in a D1
// database and answers these paths.
//
//   POST /api/hit/<kind>[?c=<class>]
//                          one empty ping from a page of the site; kind is
//                          one of KINDS below. No cookie or identifier of a
//                          person is read or stored. c names the instructor's
//                          link the page was opened through (a hash of its
//                          class name and selection, see counts.js), and the
//                          ping is then also counted for that class.
//   POST /api/class?c=<class>
//                          what that link is: {name, s, v, how}, its class
//                          name, how many structures and views it includes,
//                          and "built" when the link builder copied it.
//   POST /api/answers[?c=<class>]
//                          one finished batch of quiz answers, {m, a}: the
//                          mode and [code, result] pairs. Only the result is
//                          kept (right, wrong, skip, timeout, override), never
//                          what was typed.
//   GET  /api/counts       running totals per kind, plus what GoatCounter
//                          counted before this counter took over, for the
//                          home page footer and the usage page.
//   GET  /api/daily        the same counts day by day, for the usage page's
//                          charts.
//   GET  /api/private      the class log, per-class totals, quiz results by
//                          structure and score ranges, for the author only:
//                          it needs "Authorization: Bearer <DASHBOARD_KEY>",
//                          a Worker secret (README).
//
// Pings from other sites, crawlers, HTTP libraries and Cloudflare's verified
// bots are dropped (fromSite, isCountable). Storage is whole-day integers:
// hits(day, kind, n) and totals(kind, n) for everything, class_hits(day,
// class, kind, n) for pings made through an instructor's link, classes for
// what each link is, and answers(day, class, mode, code, result, n).
// carried(kind, n) holds GoatCounter's totals on the day of the switch, and
// meta(key, value) the dates (worker/carry-over.sql). Without the database
// binding, pings are dropped and the GETs answer 503; the pages hide their
// counters and nothing else changes.

const PAGES = ["home", "atlas", "quiz", "glossary", "print", "link-builder", "accessibility"];
// The views in views.js. A new view needs its id added here, or its pings
// are dropped.
const VIEWS = ["dorsal", "lateral", "ventral", "posterior-internal", "pulled-back-lateral", "midsagittal",
  "coronal-a", "coronal-b", "coronal-c", "coronal-d", "coronal-e", "coronal-f"];
// A quiz runs over everything, one group of views, or one view. Midsagittal
// is both a group and that group's only view, so it is one scope.
const SCOPES = [...new Set(["everything", "surface", "midsagittal", "coronal", ...VIEWS])];
const MODES = ["name", "describe"];
const BANDS = ["under-50", "50-69", "70-89", "90-100"];   // a finished quiz's percent correct
const KINDS = new Set([
  ...PAGES.map(p => "page/" + p),
  ...VIEWS.map(v => "atlas/" + v),
  ...SCOPES.flatMap(s => MODES.flatMap(m => ["quiz-start/" + s + "/" + m, "quiz-finish/" + s + "/" + m])),
  ...MODES.flatMap(m => BANDS.map(b => "quiz-score/" + m + "/" + b)),
  "print-pdf", "print-paper", "link-copied", "visit-day", "visit-day-class",
]);
// Counted like the rest, but left out of the public totals: how well quizzes
// go is for the author's private view.
const PRIVATE_KIND = /^quiz-score\//;
const RESULTS = new Set(["right", "wrong", "skip", "timeout", "override"]);
const CODE = /^[A-Z]{1,2}\d{1,3}$/;      // a structure's code in codes.js, e.g. D5 or M12
const CLASS_ID = /^[0-9a-f]{8}$/;

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
function classOf(url) { const c = url.searchParams.get("c"); return c && CLASS_ID.test(c) ? c : null; }

// A small JSON body (the pages send text/plain, which needs no CORS
// preflight). Anything malformed or oversized reads as null.
async function body(req) {
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len > 16384) return null;
  try {
    const text = await req.text();
    return text.length <= 16384 ? JSON.parse(text) : null;
  } catch (e) { return null; }
}

// One batch is one transaction: the day's row, the running total and the
// class's row move together, so the footer (totals), the charts (hits) and
// the private view (class_hits) always agree.
async function bump(d, kind, cls) {
  const writes = [
    d.prepare("INSERT INTO hits (day, kind, n) VALUES (date('now'), ?, 1) " +
              "ON CONFLICT(day, kind) DO UPDATE SET n = n + 1").bind(kind),
    d.prepare("INSERT INTO totals (kind, n) VALUES (?, 1) " +
              "ON CONFLICT(kind) DO UPDATE SET n = n + 1").bind(kind),
  ];
  if (cls) writes.push(d.prepare("INSERT INTO class_hits (day, class, kind, n) VALUES (date('now'), ?, ?, 1) " +
                                 "ON CONFLICT(day, class, kind) DO UPDATE SET n = n + 1").bind(cls, kind));
  await d.batch(writes);
}

// What an instructor's link is. The first report creates the row; later ones
// only fill in a count that was missing and note that the builder copied it.
// A cap keeps a flood of made-up links from growing the table without end.
async function noteClass(d, cls, b) {
  if (!b || typeof b !== "object") return;
  const name = String(b.name || "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 60);
  const count = v => (Number.isInteger(v) && v >= 0 && v <= 1000 ? v : null);
  const built = b.how === "built" ? 1 : 0;
  const known = await d.prepare("SELECT 1 FROM classes WHERE id = ?").bind(cls).first();
  if (!known) {
    const total = await d.prepare("SELECT COUNT(*) AS n FROM classes").first();
    if (total && total.n >= 5000) return;
  }
  await d.prepare(
    "INSERT INTO classes (id, name, structures, views, first_seen, built) VALUES (?, ?, ?, ?, date('now'), ?) " +
    "ON CONFLICT(id) DO UPDATE SET structures = COALESCE(classes.structures, excluded.structures), " +
    "views = COALESCE(classes.views, excluded.views), built = classes.built + excluded.built"
  ).bind(cls, name, count(b.s), count(b.v), built).run();
}

// One batch of answers, summed per structure and result before writing, so
// a long quiz is a few dozen row updates in one transaction.
async function noteAnswers(d, cls, b) {
  if (!b || !MODES.includes(b.m) || !Array.isArray(b.a)) return;
  const sums = new Map();
  for (const item of b.a.slice(0, 300)) {
    if (!Array.isArray(item) || !CODE.test(item[0]) || !RESULTS.has(item[1])) continue;
    const key = item[0] + " " + item[1];
    sums.set(key, (sums.get(key) || 0) + 1);
  }
  if (!sums.size) return;
  await d.batch([...sums].map(([key, n]) => {
    const [code, result] = key.split(" ");
    return d.prepare(
      "INSERT INTO answers (day, class, mode, code, result, n) VALUES (date('now'), ?, ?, ?, ?, ?) " +
      "ON CONFLICT(day, class, mode, code, result) DO UPDATE SET n = n + excluded.n"
    ).bind(cls || "", b.m, code, result, n);
  }));
}

async function meta(d) {
  const out = {};
  for (const r of ((await d.prepare("SELECT key, value FROM meta").all()).results || [])) out[r.key] = r.value;
  return out;
}

// The private view's key, compared in constant time.
async function authorized(req, env) {
  const key = env.DASHBOARD_KEY || "";
  const given = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!key || !given) return false;
  const enc = new TextEncoder();
  const a = enc.encode(given), b = enc.encode(key);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

const NO_STORE = { "Cache-Control": "no-store" };
// The public counts are totals, readable from any page (the usage page is on
// GitHub Pages, and a local copy of it must work too).
const CORS = { "Access-Control-Allow-Origin": "*" };
function unavailable(why) {
  return Response.json({ error: why }, { status: 503, headers: Object.assign({}, CORS, NO_STORE) });
}
const isPublic = kind => !PRIVATE_KIND.test(kind);

export { KINDS, fromSite, isCountable };

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const d = db(env);
    const post = url.pathname.startsWith("/api/hit/") || url.pathname === "/api/class" || url.pathname === "/api/answers";

    if (post) {
      if (req.method !== "POST") return new Response(null, { status: 405, headers: NO_STORE });
      if (d && fromSite(req) && isCountable(req)) {
        const cls = classOf(url);
        try {
          if (url.pathname === "/api/class") { if (cls) await noteClass(d, cls, await body(req)); }
          else if (url.pathname === "/api/answers") await noteAnswers(d, cls, await body(req));
          else {
            const kind = url.pathname.slice("/api/hit/".length);
            if (KINDS.has(kind)) await bump(d, kind, cls);
          }
        } catch (e) { console.log("count failed:", url.pathname, String(e)); }   // a full day's quota or a hiccup: an undercount, never an error to the visitor
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
        const pick = rows => Object.fromEntries((rows.results || []).filter(r => isPublic(r.kind)).map(r => [r.kind, Number(r.n) || 0]));
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
        for (const r of rows.results || []) if (isPublic(r.kind)) (hits[r.kind] = hits[r.kind] || []).push([r.day, Number(r.n) || 0]);
        // A kind with no row on a day had zero that day.
        return Response.json({ updated: new Date().toISOString(), since: m.counting_since || null, hits },
          { headers: Object.assign({ "Cache-Control": "public, max-age=60" }, CORS) });
      } catch (e) { return unavailable("counter database unavailable"); }
    }

    if (url.pathname === "/api/private") {
      // The key travels in a header, so the browser asks first (preflight).
      const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization",
                     "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400", "Vary": "Origin" };
      if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
      if (!env.DASHBOARD_KEY) return Response.json({ error: "no key set" }, { status: 503, headers: Object.assign({}, cors, NO_STORE) });
      if (!(await authorized(req, env))) return Response.json({ error: "wrong key" }, { status: 401, headers: Object.assign({}, cors, NO_STORE) });
      if (!d) return unavailable("counter database not configured");
      try {
        const [classes, daily, answers, scores, m] = await Promise.all([
          d.prepare("SELECT id, name, structures, views, first_seen, built FROM classes").all(),
          d.prepare("SELECT class, day, kind, n FROM class_hits ORDER BY day").all(),
          d.prepare("SELECT class, mode, code, result, SUM(n) AS n FROM answers GROUP BY class, mode, code, result").all(),
          d.prepare("SELECT kind, n FROM totals WHERE kind LIKE 'quiz-score/%'").all(),
          meta(d),
        ]);
        const classDaily = {};
        for (const r of daily.results || []) {
          const c = (classDaily[r.class] = classDaily[r.class] || {});
          (c[r.kind] = c[r.kind] || []).push([r.day, Number(r.n) || 0]);
        }
        return Response.json({
          updated: new Date().toISOString(),
          since: m.counting_since || null,
          classesSince: m.classes_since || null,      // when the class log began
          classes: classes.results || [],
          classDaily,                                  // {class: {kind: [[day, n], ...]}}
          answers: (answers.results || []).map(r => [r.class, r.mode, r.code, r.result, Number(r.n) || 0]),
          scores: Object.fromEntries((scores.results || []).map(r => [r.kind, Number(r.n) || 0])),
        }, { headers: Object.assign({}, cors, NO_STORE) });
      } catch (e) { return unavailable("counter database unavailable"); }
    }

    return new Response("Lambda usage counter. See https://github.com/torryscott/lambda/tree/main/worker\n",
      { status: url.pathname === "/" ? 200 : 404, headers: Object.assign({ "Content-Type": "text/plain; charset=utf-8" }, NO_STORE) });
  },
};
