# Architecture

Five stages. Each is independently testable and knows nothing about the stages after it.

```
  source adapters   →   build   →   derive   →   validate   →   emit
   rows → records        graph      metrics     invariants      json
   and links
```

`src/core/pipeline.ts` is the only module that knows the order.

---

## 1. Sources

A source hands the builder records and links. Three implementations sit behind one protocol
(`src/sources/base.ts`):

| Source | For | How it reads |
|---|---|---|
| `synthetic` | the reference dataset and parity testing | a catalog in `src/sources/synthetic/catalog-*.ts` |
| `csv` | fixtures and tests | a directory of `<table>.csv` files |
| `supabase` | real work | master tables and aggregate views over PostgREST |

`csv` and `supabase` share one declarative mapping contract, so the same mapping file describes the same
tenant against either backend. A table reader returns `null` - not an empty array - when a table does
not exist, which is what lets a missing operational table become a reported gap rather than a crash.

### Why aggregation lives in SQL

The graph is small: low thousands of nodes, low tens of thousands of links per tenant. The hard work is
aggregation over large operational tables - plots, tasks, harvest records - and a relational engine does
that far better than anything in this process would.

So `supabase/schema.sql` defines the aggregate views, and the pipeline only ever selects from them. A
crop's plot count is `sum(varieties)` in a view; an activity's reach is `sum(the crop plans that include
it)` in a view; a susceptibility weight is `variety plots × recorded incidence` in a view. Nothing in
`src/` sums what SQL should have summed.

Revisit only if a tenant exceeds roughly 100k nodes. A graph database would buy nothing here and cost a
dependency, an operational surface, and a second query language.

---

## 2. Build

`build.ts` indexes records, sorts everything deterministically, and constructs the adjacency.

It fails hard only on the things that make everything after it meaningless: a duplicate record id, a
record pointing at a concept that does not exist, an id whose prefix disagrees with its concept, a row
carrying the wrong tenant, or a mapping supplying a number the ontology says is derived. Everything else
is validate's job, so that a single report names every problem at once rather than stopping at the first.

**Record membership** (`record.concept`) is an attribute in the document and an edge for traversal. The
brief left that decision open; this is the resolution. It keeps 338 membership rows out of `links` while
leaving every concept reachable from its own records.

---

## 3. Derive

Everything is driven by `ontology/derivations.yaml`. Nothing in `derive.ts` knows what a crop or a region
is, which is the point - the consistency property comes from the rules being declarative rather than
scattered through code.

1. **Rollups.** Sum the weighted incoming links for each target concept. Recomputed in one pass in a
   defined order after every link is loaded, never incrementally updated, because an incremental update
   is how a total quietly stops matching its parts.
2. **Computed metrics.** Evaluated by `expr.ts`, a ~120-line recursive-descent evaluator supporting
   arithmetic, parentheses, and `round`/`abs`/`min`/`max`. Deliberately not `eval`: derivation rules are
   data, and data from a mapping file must never become executable code. A rule whose input is missing
   yields no metric and is reported, rather than yielding a wrong number.
3. **Summaries.** Always generated, never authored, so they cannot drift from the data.

### Weighted and unweighted relations

A relation declares whether the plot count applies to it. Unweighted relations exist so a derived total
can never be counted twice through two different paths: a region's plot count sums `grown in region`,
and the sowing windows and observations that also point at that region contribute nothing to it.

Three concepts - resource, plan attribute, form - roll up a metric named `used_on` rather than `plots`,
because the sets behind those links overlap. One plot can appear under many activities, so summing the
activities' plot counts is an occurrence count, not a plot count, and naming it `plots` would have been
a lie in the same key everything else tells the truth in.

---

## 4. Validate

Thirteen document-level invariants, each reporting the offending ids rather than a count, plus two that
need I/O and therefore live in the test suite.

| # | Invariant |
|---|---|
| 1 | No dangling endpoints |
| 2 | Every relation is registered |
| 3 | Every link matches an allowed concept pair |
| 4 | Cardinality holds |
| 5 | No orphan records |
| 6 | ID format and prefix agreement |
| 7 | No duplicate labels within a concept, or within its `label_scope` |
| 8 | Rollup, partition and cross-check arithmetic, recomputed independently |
| 9 | Single connected component, undirected |
| 10 | Parity with the prototype document (`--parity`) |
| 11 | Idempotence - byte-identical rebuilds (`tests/invariants.test.ts`) |
| 12 | Viewer smoke test in a real browser (`tests/viewer.smoke.ts`) |
| 13 | Every relation has both headings and an order |
| 14 | No tenant leakage |
| 15 | Attributes declared and in display order |

Invariant 15 is an addition: `attrs` is an ordered map whose insertion order is the display order, so it
is worth asserting that the order matches what `concepts.yaml` declares and that no undeclared attribute
appears.

### Three checks that the fixtures changed

Building the deliberately-degraded CSV fixture tenant exposed three checks that were wrong, not three
tenants that were:

1. **Label uniqueness is scoped.** Growth stages, harvest grades and diseases are crop-scoped
   vocabularies: two crops may both have a stage called Harvest, and that is correct rather than a
   collision. A concept can now declare `label_scope: Crop`, and uniqueness is checked within it. The
   alternative - renaming everything to "Potato Harvest" - would have made every label redundant in the
   context it is actually read in.
2. **A partition over a relation a tenant does not use at all is vacuous.** It is skipped and reported as
   coverage, rather than failing as a contradiction. Where any such link exists, the sum must still be
   exact.
3. **A concept with no records is a coverage gap, not a graph island.** The component check now considers
   only populated nodes.

---

## 5. Emit

The document is built in a fixed construction order rather than serialised with sorted keys: records
sorted by id, links sorted by relation order then endpoints, attributes in the order `attr_order`
declares.

**This is a deliberate deviation from the brief**, which asked for sorted keys. Globally sorting keys
would destroy the attribute display order that the same section of the brief requires (`attrs` values
are "ordered, display-ready strings"). Deterministic construction delivers the property sorted keys were
there for - byte-identical rebuilds - without breaking the one that conflicts with it. Idempotence is
tested directly.

---

## The document contract

`src/core/model.ts` is the contract, expressed as zod schemas. The viewer reads these exact field names.
Additive changes are fine; renames and removals are not.

Additions this build makes to the shape in the brief, all additive:

| Field | Why |
|---|---|
| `meta.source` | which source produced the document, shown in the UI |
| `meta.layer_order` | so the viewer does not have to re-derive layer order |
| `meta.sections[rel].weighted` | so the viewer knows whether a missing weight is a gap or expected |
| `meta.coverage.unweighted_links`, `metrics_not_computed` | the two coverage facts the brief's list did not have a home for |
| `meta.graph` | component count, longest and mean path |
| `concepts[].key`, `records` | saves the viewer parsing ids and counting |
| `concepts[].label_scope` | the uniqueness scope, so a listing can qualify a repeated label |

---

## The API

`src/server/index.ts` serves a document from disk or from the graph store, plus the derived views the
viewer needs: grouped sections for a node, a route, a hop neighbourhood, a label search.

Sections are resolved server-side as well as in the viewer because the display headings are part of the
document contract, and both implementations obey it rather than inventing their own. Nothing in the API
builds a graph and nothing writes.

---

## The viewer

The viewer imports **nothing** from `src/`. It reads the emitted document and derives everything else
itself, because one delivery mode is a single self-contained HTML file with the document inlined and no
server behind it. If the viewer needed the pipeline to interpret the pipeline's own output, that would
not be a contract.

Layout decisions, and why:

- **No force simulation.** Physics layouts jitter, overlap, and hand you a different picture every load.
- **Four purpose-built layouts, not one general one.** A general layout answers no question well.
- **Label collision is solved, not hoped away.** Nodes are pushed out along their own angle (radial) or
  down their own column (columnar) until label boxes clear. The columnar pass compares globally, because
  a 42-character record label is wider than the gap between columns and reaches into its neighbour.
  Measured: zero overlaps in every mode, in unit tests and in a real browser.
- **Cap what you draw, and say so.** Lineage from a hub can pull hundreds of nodes; drawing them all
  shrinks every label to nothing. The cap is 118 and the number omitted is stated.
- **Weight the edges.** Thickness by plot count communicates proven-versus-experimental faster than any
  label.
- **Question-shaped section headings**, straight from `relations.yaml`. A raw relation key never reaches
  the UI, and an invariant enforces it.

The six layer hues were validated rather than eyeballed: every adjacent pair clears the CVD separation,
normal-vision and contrast checks against this surface. Two non-adjacent pairs sit below the all-pairs
target, which is unavoidable at six hues in one lightness band, so identity never rests on colour -
every node carries its label, every layer column carries a heading, and the legend is always present.

---

## Deviations from the build brief, and why

| Brief | Built | Why |
|---|---|---|
| Python, pydantic, SQLAlchemy, typer | TypeScript, zod, PostgREST, commander | The stack was specified by the user as Vite, Supabase and Express. Every architectural rule in the brief is preserved; only the language changed. `pyproject.toml` becomes `package.json`, `pydantic` becomes `zod`, and the viewer and pipeline share one language. |
| "Do not rebuild the visualisation" | Viewer built | The prototype HTML was listed as "if supplied" and was not supplied. It is rebuilt to the visualisation principles in the findings document rather than reinvented. |
| Raw SQL in the mapping file | Table and view names in the mapping file | The publishable key reaches Postgres through PostgREST, which does not accept arbitrary SQL. Aggregation therefore lives in named views, which is where the brief wanted it anyway; the mapping names the view instead of embedding the query. A future direct-Postgres reader can accept `sql:` without changing the spec. |
| Serialise with sorted keys | Deterministic construction order | Sorting keys globally would break the attribute display order the same section requires. See stage 5. |
| 14 invariants | 13 in-document, 2 in tests, 1 added | 11 and 12 need I/O; 15 protects the attribute order contract. |

## Out of scope, deliberately

People and org, plot-level records, model internals, compliance and market, and the feedback loop. The
narrow scope is why the thing is useful: everything left answers one question.

Also out: writing back to platform masters, a graph database, real-time updates, authentication, and
cross-tenant benchmarking.
