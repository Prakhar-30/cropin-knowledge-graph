# Decisions

Section 9 of `knowledge-graph-conceptual-findings.md` listed eight questions to settle before building
the data structure. Here is what each one is now, and why.

---

### 1. Storage: property graph or relational?

**Relational, with the graph materialised as a document and traversal in memory.**

The graph is small - low thousands of nodes, low tens of thousands of links per tenant. The hard work is
aggregation over large operational tables, which a relational engine does far better. So the aggregates
are Postgres views, the graph is a JSON document, and traversal is a dict of adjacency sets built at
load. A graph database would buy nothing at this size and cost a dependency, an operational surface and
a second query language.

The `kg_*` tables in `supabase/schema.sql` store built documents so the API can serve one without a
file. They are a cache of a derived artefact, not a source of truth.

Revisit above roughly 100k nodes for a single tenant.

### 2. Is `record of` an edge or a typed attribute?

**An attribute in the document, an edge for traversal.**

`records[].concept` carries it, so 338 membership rows stay out of `links` and every count in
`meta.counts` means what it says. `buildAdjacency` adds membership as an edge, so a concept is reachable
from its own records and the component check is meaningful. Traversal cost is unaffected: the adjacency
is built once.

### 3. Where do derived numbers live - computed on read, or materialised?

**Materialised at build time, in the document.**

A rebuild is cheap - the whole pipeline runs in under a second on this tenant - and a scheduled rebuild
is explicitly enough. Computing on read would put the evidence rule in the reader's hands, which is
exactly where it must not be: the guarantee that no two numbers contradict each other holds because
every number was produced in one pass by one engine and then checked.

Freshness is stated rather than assumed: `meta.source_snapshot` is the as-of date of the underlying
data and `meta.built_at` is when the document was produced. Both are on screen.

### 4. Multi-tenancy: shared concept layer, or everything per tenant?

**Concepts and relation definitions are global and ship in the repo. Records and links are per tenant.**

The ontology is product knowledge, not customer data. It is version-controlled YAML, identical for every
tenant, and a change to it is a code review rather than a data migration. Every record and link carries
`tenant_id`; a build runs for exactly one tenant; invariant 14 asserts no other tenant's rows appear.

Cross-tenant aggregation is a genuine asset and is deliberately **not built**. When it is, it belongs in
its own module behind an explicit flag, with the k-anonymity floor - 5 or more tenants and 50 or more
plots - in place from the first line of code, never as a later addition.

### 5. Override semantics: how does a variety override its crop's stage set?

**Not modelled yet, and the graph is now the evidence that it needs to be.**

Inheritance with override needs explicit rules rather than convention, and inventing those rules in a
read-only reporting layer would be inventing platform behaviour. What this build does instead is make
the gap visible: `Stage Observation` records show that the same configured stage runs 9% short in
Gujarat and 9% long in Uttar Pradesh, from one national stage set. The observed layer states the problem
precisely enough to design the override against.

When it is designed, the shape it wants is a `stage_override` record scoped to (crop, region) - a
sibling of `Sowing Window`, which is the same kind of object.

### 6. Where does the display vocabulary live?

**In the ontology, as recommended.**

`relations.yaml` carries both headings, the display order, the weighting and the valid concept pairs.
`meta.sections` in the emitted document is that table, so the viewer never invents a heading, and
invariant 13 asserts a raw relation key can never reach the UI.

The internal vocabulary and the display vocabulary are separate concerns, and both belong in the data.

### 7. Weight recency: should a link's plot count decay with age?

**No decay in the weights. Calibration state is surfaced instead.**

A decayed weight is a number nobody can reconstruct, and the whole value of the weights is that they can
be reconstructed. Two seasons at half weight and one season at full weight read identically, which
destroys exactly the distinction a user needs.

What a user actually needs is to know how much history is behind a number, so that is stated directly:
every variety carries `Seasons of history` and `Calibration state`, and the panel shows them next to the
gap. A variety with one season on the base model will read as underperforming whatever the field did -
that is a fact about the model, not the field, and it belongs on screen rather than smeared into a
weight.

If recency is wanted later, the honest form is a second, separately named metric - `plots_last_season`
alongside `plots` - not a modification of the first.

### 8. Write path: reporting layer or product?

**Read-only reporting layer in phase 1, and enforced rather than promised.**

Every source only ever issues selects. Mapping files are rejected before a connection opens if they
contain anything resembling DDL or DML. The Supabase policies grant select and nothing else, which is
verified: an insert with the publishable key is refused by RLS. The one command that writes anything
(`push`) writes to the graph store's own `kg_*` tables, never back to a master.

Nothing is architected against phase 2. The mapping layer already has the shape a write path needs -
a declarative statement of which platform field a graph value came from - so proposing a change back to
the masters is an addition rather than a rewrite.

---

## Decisions this build made that the findings did not raise

### Label uniqueness is scoped by a declared attribute

Two crops may both have a growth stage called Harvest. That is correct, not a collision. Rather than
renaming every stage to "Potato Harvest" - which makes the label redundant in the context it is actually
read in - a concept declares `label_scope: Crop`, and uniqueness is checked within it. The invariant
still catches the defect it was written for, which was two records colliding inside one scope.

### Overlapping-set metrics get their own name

A resource, plan attribute or form sums the plot counts of the activities that use it, and those sets
overlap - one plot appears under many activities. That total is an occurrence count, not a plot count,
so it is named `used_on` and captioned "Times used". Calling it `plots` would have been a lie in the
same key everything else tells the truth in.

### Availability links carry no weight

A crop's `graded by` links say a grade is available for that crop; a variety's say it was used. Only the
usage links carry a weight, and a variety delegates to its sub varieties where they exist, so no plot is
counted at two levels of the hierarchy. 191 of 1,149 links in the reference tenant are unweighted by
design, and `meta.coverage.unweighted_links` says so on screen rather than leaving a reader to assume a
missing number is a zero.

### Sowing Window survives as ours

Three concepts in the earlier prototypes were ours rather than the platform's. Residue limit and
pre-harvest interval fell outside the final scope. **Sowing Window survives and is recommended**, for
the reason the findings gave: the sowing date is load-bearing for growing degree days, stage,
progression, harvest window, yield and disease probability; every model states it assumes the date is
accurate; and nothing in the platform validates it. `ontology/nomenclature.md` badges it as ours and
names the nearest existing object (a project crop target date).
