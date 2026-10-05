-- Lambda usage counters: the whole of what is stored. No IP, no user agent,
-- no timestamp finer than the day, no identifier of any kind.
CREATE TABLE IF NOT EXISTS hits (
  day  TEXT NOT NULL,              -- YYYY-MM-DD, UTC
  kind TEXT NOT NULL,              -- one of KINDS in index.js, e.g. 'atlas/dorsal'
  n    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, kind)
);

-- The running total per kind, moved in the same transaction as hits, so the
-- footer reads a few dozen rows instead of every day's.
CREATE TABLE IF NOT EXISTS totals (
  kind TEXT PRIMARY KEY,
  n    INTEGER NOT NULL DEFAULT 0
);

-- What GoatCounter had counted when this counter took over (carry-over.sql).
CREATE TABLE IF NOT EXISTS carried (
  kind TEXT PRIMARY KEY,           -- page/<name>, or quiz-start for all quiz runs
  n    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,          -- counting_since, carried_from
  value TEXT NOT NULL
);
