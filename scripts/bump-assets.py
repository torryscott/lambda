#!/usr/bin/env python3
"""Stamp the shared scripts with a version so browsers refetch them when they change.

GitHub Pages caches files for ten minutes. A page that loads a fresh HTML file
but a cached codes.js or views.js from before a change breaks in ways that look
random. Every <script src="…codes.js|views.js|print-export.js"> gets ?v=<hash of
the file>, so a changed script is a new URL. Run this before committing a change
to any of those files (or all the time; it is idempotent).
"""
import hashlib, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ["codes.js", "views.js", "print-export.js"]
hashes = {a: hashlib.sha1((ROOT / a).read_bytes()).hexdigest()[:8] for a in ASSETS}
pat = re.compile(r'(<script src=")((?:\.\./)?)(' + '|'.join(re.escape(a) for a in ASSETS) + r')(?:\?v=[0-9a-f]+)?(")')
changed = 0
for html in list(ROOT.glob("*.html")) + list((ROOT / "tools").glob("*.html")):
    text = html.read_text()
    new = pat.sub(lambda m: f'{m.group(1)}{m.group(2)}{m.group(3)}?v={hashes[m.group(3)]}{m.group(4)}', text)
    if new != text:
        html.write_text(new); changed += 1
print(" ".join(f"{a}={h}" for a, h in hashes.items()), f"· {changed} page(s) updated")
