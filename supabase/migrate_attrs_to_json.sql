-- Run once if supabase/schema.sql was applied before attrs became json.
--
-- jsonb normalises objects and sorts their keys, which silently reorders the attribute panel on every
-- record that goes through the graph store. json keeps the document as written.
--
-- Existing rows have already lost their order, so re-push after this:
--   npm run graph -- push --file dist/demo/graph.json

alter table kg_records alter column attrs type json using attrs::json;
