# Usage counters (Oct 2026)

What Lambda counts, how, and where the numbers live. The site itself is static
files on GitHub Pages; this folder is its only server part, a Cloudflare Worker
(`lambda-counts`, at https://lambda-counts.torryscott.workers.dev) with a D1
database (`lambda-counts`). It replaced GoatCounter on 2026-10-05.

## What is counted

| Kind | When |
| --- | --- |
| `page/<name>` | a page opens: home, atlas, quiz, glossary, print, link-builder, accessibility (`counts.js` with `data-page`) |
| `visit-day` | the first page a browser opens on a given UTC day (a date kept in that browser's localStorage, never sent) |
| `atlas/<view>` | the atlas shows a view (atlas.html, after `loadView`) |
| `quiz-start/<scope>/<mode>` | Begin is pressed; scope is `everything`, a group (`surface`, `midsagittal`, `coronal`) or a view id, mode is `name` or `describe` |
| `quiz-finish/<scope>/<mode>` | that run reaches its score (`finish()`); a retry of the missed questions counts neither |
| `print-pdf` | the printable atlas finished building a PDF download |
| `print-paper` | the printable atlas goes to the print dialog (`beforeprint`, from the button or the browser's own Print) |
| `link-copied` | the link builder's Copy link |
| `visit-day-class` | the first page a browser opens on a given day through a given instructor's link |
| `quiz-score/<mode>/<band>` | a counted quiz reaches its score; band is `under-50`, `50-69`, `70-89` or `90-100` percent correct. Private: left out of the public totals |

### Classes and quiz results (Oct 7, 2026; private)

A **class** is an instructor's link: its `?class=` name and its `?on=` and
`?views=` selection. `counts.js` names it with an 8-character hash of those
three, the same for every student on the link, and adds it as `?c=` to every
ping from a page opened through it, so each class has its own totals
(`class_hits`). The link builder's Copy link, and a browser's first page of the
day through a link, also send `POST /api/class` with the class name and how
many structures and views the link includes (`classes`). A link with no class
name shows as "Unnamed link"; renaming a class makes a new one.

**Quiz results**: in a quiz started with Begin, each question's result becomes
final when the student moves on: `right`, `wrong`, `skip` (blank or Skip),
`timeout`, or `override` (wrong, then Count mine as correct). They go in one
`POST /api/answers` when the quiz ends or the page is left: the mode and
`[code, result]` pairs, the code being the structure's in codes.js. What was
typed is never sent. Retries of the missed questions are not recorded.

Both are for the author only: `GET /api/private` answers with them, and with
the score ranges, only to `Authorization: Bearer <DASHBOARD_KEY>`. The usage
page's Private view asks for the key once and keeps it in that browser.

The Worker accepts only the kinds in `KINDS` (worker/index.js). **A new view
needs its id added to `VIEWS` there**, and in the lists at the top of
usage.html's script, or its pings are dropped and it has no row.

A ping is one empty `POST /api/hit/<kind>` made with `navigator.sendBeacon`
(plus `?c=` on an instructor's link). It carries no body, no cookie and nothing
about a person; the Worker stores `(day, kind, n)` and a running total per
kind. The class and answers reports above carry small text bodies, and nothing
in them identifies a student either. It drops a ping
whose Origin is not the site (or localhost, for `wrangler dev`), whose
User-Agent names a crawler or an HTTP library, whose `Sec-Fetch-Site` says
nobody's page made it, or which Cloudflare flags as a verified bot. A scraper
impersonating a browser still gets through, as with every counter.

Pages send nothing when `navigator.webdriver` is set (automated browsers) or
when the browser was switched off on the usage page (`lambda.nocount` in
localStorage). Turn that off on your own devices so your visits do not count.

## Reading the numbers

- **usage.html** on the site: totals, tables by page, view, quiz and mode, and a
  chart by day, week or month for any row.
- The home page footer: "Opened N times since September 2026 · M quizzes taken",
  linking to usage.html.
- `GET /api/counts`: `{since, carriedFrom, counts: {kind: n}, carried: {kind: n}}`.
- `GET /api/daily`: `{since, hits: {kind: [[day, n], ...]}}`; a day with no row had zero.

## Carried over from GoatCounter

GoatCounter counted page visits and quiz runs from 2026-09-07 to the switch.
`carry-over.py` read its public per-page counters once and wrote
`carry-over.sql`, which put those totals in the `carried` table. The footer and
the usage tables add them in; the charts start on the switch day, since
GoatCounter's daily history was not imported (it is still in the GoatCounter
account, tsdennis.goatcounter.com). GoatCounter counted a page once per visitor
session, this counter counts every open, so the totals climb a little faster
than before.

## The private view's key

The key is a Worker secret, set once (and again to change it) from this folder:

    npx --yes wrangler@4.86.0 secret put DASHBOARD_KEY

It prompts for the value; use a long passphrase. Then enter the same passphrase
under Private view on usage.html. Without the secret, `/api/private` answers 503
and the page says so.

## Setup, deploy, and local runs

Done on 2026-10-05; for a fresh database repeat steps 2 to 4.

1. `npx wrangler login` (once per machine).
2. `npx wrangler d1 create lambda-counts`, with the binding `lambda_counts` in `wrangler.jsonc`.
3. `npx wrangler d1 execute lambda-counts --remote --file schema.sql` (safe to run again: every table is
   `IF NOT EXISTS`), then `classes-since.sql` once, which records the day the class log began.
4. `npx wrangler deploy` from this folder.

Wrangler 4.86 runs on the Node 20 here; newer releases need Node 22, and the
local runtime of 4.86 accepts compatibility dates up to 2026-05-03, hence the
date in wrangler.jsonc.

To try the site with a working counter on this machine: run `python3
scripts/serve.py` for the site, and in this folder
`npx wrangler d1 execute lambda-counts --local --file schema.sql` once, then
`npx wrangler dev --local --port 8787 --ip 127.0.0.1`. Pages served from
localhost send their pings there (counts.js), never to the live counter. For
the private view locally, put a throwaway `DASHBOARD_KEY=...` line in
`worker/.dev.vars` (ignored by git).
