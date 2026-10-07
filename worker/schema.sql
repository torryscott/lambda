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

-- Instructor links and quiz results (Oct 2026), for the author's private view.
-- A class is an instructor's link: the hash of its class name and selection
-- (counts.js) names it. Nothing here identifies a student.
CREATE TABLE IF NOT EXISTS classes (
  id         TEXT PRIMARY KEY,     -- 8 hex characters from counts.js
  name       TEXT NOT NULL,        -- the class name typed in the link builder, '' if none
  structures INTEGER,              -- how many structures the link includes; NULL = all
  views      INTEGER,              -- how many views it includes; NULL = all
  first_seen TEXT NOT NULL,        -- YYYY-MM-DD, UTC
  built      INTEGER NOT NULL DEFAULT 0   -- times the link builder copied it
);
CREATE TABLE IF NOT EXISTS class_hits (
  day   TEXT NOT NULL,
  class TEXT NOT NULL,
  kind  TEXT NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, class, kind)
);
-- One row per day, class ('' for no class link), quiz mode, structure code and
-- result: right, wrong, skip, timeout, or override (marked correct by the
-- student). What was typed is never sent.
CREATE TABLE IF NOT EXISTS answers (
  day    TEXT NOT NULL,
  class  TEXT NOT NULL,
  mode   TEXT NOT NULL,
  code   TEXT NOT NULL,
  result TEXT NOT NULL,
  n      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, class, mode, code, result)
);
