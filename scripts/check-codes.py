#!/usr/bin/env python3
"""Verify codes.js against the data files.

Every flag in a data/<view>.json must have a code; codes and flags must be
unique. Codes for retired structures stay reserved and are listed.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
codes_js = (ROOT / "codes.js").read_text()
pairs = re.findall(r"^\s+([A-Z]+\d+):\s+'(inc_[a-z_]+)',", codes_js, re.M)
codes = dict(pairs)
flags = {f: c for c, f in pairs}
problems = []
if len(codes) != len(pairs): problems.append("duplicate code in codes.js")
if len(flags) != len(pairs): problems.append("one flag has two codes in codes.js")

# The link builder reads the data files at runtime, so the data files are the
# authoritative list of what can be assigned.
used = set()
for p in sorted((ROOT / "data").glob("*.json")):
    for s in json.loads(p.read_text())["structures"]:
        used.add(s["flag"])
        if s["flag"] not in flags: problems.append(f"{p.name}: flag has no code: {s['flag']}")
retired = [flags[f] for f in flags if f not in used]   # codes stay reserved after a structure is retired

# Bit positions: every code exactly once, so inclusion links resolve.
m = re.search(r"var BITS = \[(.*?)\];", codes_js, re.S)
bits = re.findall(r"'([A-Z]+\d+)'", m.group(1)) if m else []
if not bits: problems.append("codes.js: BITS list not found")
if len(bits) != len(set(bits)): problems.append("codes.js: a code appears twice in BITS")
for c in codes:
    if c not in bits: problems.append(f"codes.js: code {c} has no bit position (append it to BITS)")
for c in bits:
    if c not in codes: problems.append(f"codes.js: BITS names an unknown code {c}")
views_js = (ROOT / "views.js").read_text()
m = re.search(r"var VIEW_BITS = \[(.*?)\];", views_js, re.S)
view_bits = re.findall(r"'([a-z-]+)'", m.group(1)) if m else []
data_views = [p.stem for p in sorted((ROOT / "data").glob("*.json"))]
if len(view_bits) != len(set(view_bits)): problems.append("views.js: a view appears twice in VIEW_BITS")
for v in data_views:
    if v not in view_bits: problems.append(f"views.js: view {v} has no bit position (append it to VIEW_BITS)")

print(f"{len(codes)} codes · {len(bits)} bit positions · {len(used)} flags in use across "
      f"{len(data_views)} data files · {len(view_bits)} view bits")
if retired: print(f"  retired codes (kept reserved): {', '.join(sorted(retired, key=lambda c: (c[0], int(c[1:]))))}")
for m in problems: print("  !!", m)
sys.exit(1 if problems else 0)
