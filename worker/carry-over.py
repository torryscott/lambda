#!/usr/bin/env python3
"""Write carry-over.sql: GoatCounter's totals on the day this counter took over.

GoatCounter counted Lambda from 2026-09-07 until the switch to this counter.
Its public per-page counters are read once and stored in the `carried` table,
so the totals on the site keep going instead of starting again at zero.
Run once, at the switch, then apply with
    npx wrangler d1 execute lambda-counts --remote --file carry-over.sql
"""
import datetime, json, pathlib, urllib.request

GC = "https://tsdennis.goatcounter.com/counter/{}.json"
PAGES = {  # counter kind -> GoatCounter paths (the home page was two paths there)
    "page/home": ["/lambda/", "/lambda/index.html"], "page/atlas": ["/lambda/atlas.html"],
    "page/quiz": ["/lambda/quiz.html"], "page/glossary": ["/lambda/glossary.html"],
    "page/accessibility": ["/lambda/accessibility.html"], "page/link-builder": ["/lambda/tools/link-builder.html"],
    "page/print": ["/lambda/print.html"], "quiz-start": ["quiz-run"],
}

def count(path):
    with urllib.request.urlopen(GC.format(path), timeout=20) as r:
        return int(json.load(r)["count"].replace(",", ""))

today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
rows = {kind: sum(count(p) for p in paths) for kind, paths in PAGES.items()}
sql = [f"-- GoatCounter's totals when this counter took over ({today}, UTC), from its public",
       "-- per-page counters. Written by carry-over.py; applied once.",
       "INSERT INTO carried (kind, n) VALUES"]
sql.append(",\n".join(f"  ('{k}', {n})" for k, n in rows.items()))
sql[-1] += "\nON CONFLICT(kind) DO UPDATE SET n = excluded.n;"
sql.append("INSERT INTO meta (key, value) VALUES ('counting_since', '%s'), ('carried_from', '2026-09-07')\n"
           "ON CONFLICT(key) DO UPDATE SET value = excluded.value;" % today)
out = pathlib.Path(__file__).with_name("carry-over.sql")
out.write_text("\n".join(sql) + "\n")
print(out.read_text())
