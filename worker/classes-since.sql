-- The day the class log and quiz results began (applied once, with schema.sql's new tables).
INSERT INTO meta (key, value) VALUES ('classes_since', date('now'))
ON CONFLICT(key) DO NOTHING;
