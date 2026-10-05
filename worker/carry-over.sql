-- GoatCounter's totals when this counter took over (2026-10-05, UTC), from its public
-- per-page counters. Written by carry-over.py; applied once.
INSERT INTO carried (kind, n) VALUES
  ('page/home', 293),
  ('page/atlas', 143),
  ('page/quiz', 53),
  ('page/glossary', 20),
  ('page/accessibility', 1),
  ('page/link-builder', 24),
  ('page/print', 28),
  ('quiz-start', 33)
ON CONFLICT(kind) DO UPDATE SET n = excluded.n;
INSERT INTO meta (key, value) VALUES ('counting_since', '2026-10-05'), ('carried_from', '2026-09-07')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;
