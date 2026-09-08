# Nomenclature reconciliation

Every concept and relation label in `concepts.yaml` / `relations.yaml` traced back to the platform
walkthrough (`Cropin_Cloud_Walkthrough_v2-1`, version 2.135.0). Where the walkthrough uses a different
word, **the walkthrough wins** and the change is recorded here.

Reference format: `Part n, SECTION` plus the onboarding-documentation section number the deck cites.

---

## 1. Concepts with a confirmed platform term

| Concept label | Walkthrough reference | Term used there | Verdict |
|---|---|---|---|
| Crop | Part 2, CROPS (doc 2.6) | "Crops module ... Crop to Variety to Sub Variety" | confirmed |
| Variety | Part 2, CROPS (doc 2.6) | "variety name" | confirmed |
| Sub Variety | Part 2, CROPS (doc 2.6) | "sub variety name" | confirmed |
| Growth Stage | Part 2, CROPS (doc 2.6) | "Crop stages ... growth stages so crop progression can be monitored" | confirmed. Deck lists Sowing, Germination, Vegetative stage, Flowering, Harvest as the example set |
| Crop Parameters | Part 2, CROPS (doc 2.6) | "Custom crop parameters", "What you configure on a crop" | confirmed |
| Seed Grade | Part 2, CROPS (doc 2.6) | "Seed Grades set out the quality classifications used during sowing and seed selection" | confirmed |
| Harvest Grade | Part 2, CROPS (doc 2.6) | "Harvest Grades set out the expected output quality categories" | confirmed |
| Region | Part 2, FARMERS (doc 2.3); Configuration module list | "Places", "region" | **kept as Region.** The configuration module is called *Places*; Region is the level within it that plots roll up to and the level the deck itself uses in prose ("region", "operational area"). Recorded as a deliberate divergence |
| Season | Part 2, configuration module list; Part 3.1 | "Seasons" | confirmed |
| Soil Type | Part 2, ASSETS (doc 2.4) | "Agricultural information, covering soil type" | confirmed |
| Irrigation Type | Part 6, IRRIGATION ADVISORY; Part 8 | "Type of irrigation ... for example pivot" | confirmed |
| Plan Type | Part 2, PLAN TYPES (doc 2.1) | "Plan Types are templates that define the structure and parameters of agricultural activities" | confirmed |
| Crop Plan | Part 2, CROP PLANS AND PACKAGES (doc 2.7) | "Each crop variety or sub variety can have several plans or packages linked to it" | confirmed |
| Plan Activity | Part 2, PLAN TYPES / 2.7 | "Scheduled activities", "Unscheduled activities", "Recurring tasks" | confirmed. Deck also calls these Tasks in Part 3.4 when they exist against a plot |
| Plan Attribute | Part 2, PLAN TYPES (doc 2.1) | "Custom Attributes", "Table Attributes", "Standard Attributes" | confirmed. The three kinds are carried as the `Kind` attribute |
| Resource or Input | Part 2, FARM RESOURCES (doc 2.5) | "Farm Resources ... operational tools, machinery and equipment" | **widened deliberately.** The platform object covers machinery only; inputs (fertiliser, chemistry, seed) appear in the deck as "Resource requirements" and "Resource allocation" on a plan (doc 2.1, 2.7). One concept covers both because an activity consumes them the same way |
| Form | Part 2, ALERTS AND FORMS (doc 2.9) | "general forms, farmer forms, operational forms and survey forms" | confirmed. Four types carried as the `Form type` attribute |
| Disease or Pest | Part 2, ALERTS (doc 2.8); Part 5, DEWS; Part 6, DEWS | "pest infestation detection, disease identification"; "disease models available 80 or more" | confirmed |
| Alert Type | Part 2, ALERTS (doc 2.8) | "alert name, alert type, applicable crops, crop varieties, symptoms, advisory recommendations" | confirmed |

## 2. Concepts that are ours, not the platform's

| Concept | Why it exists | Status |
|---|---|---|
| **Sowing Window** | The sketch called for an "ideal DOS". Part 6 (crop stage) and Part 8 (every model requirement) state that the sowing date is assumed accurate; Part 8 repeats it for crop health, crop stage, crop yield and DEWS. Nothing in Setup, Configuration or Projects validates it. The nearest platform object is **Crop Targets / target dates** in Part 3.1, which sets a target date per crop target in a project - not a reusable configuration window | **Ours.** Recommended for the platform. Mapped against `crop_target_dates` as the closest existing table |

Two further concepts from the earlier prototypes - **Residue limit (MRL)** and **Pre-harvest interval** -
were also ours and fell outside the final scope. They are not in this ontology.

## 3. Concepts the platform can compute but does not expose

These three are the real integration risk. Each needs an aggregation query written against operational
tables; none is a configuration object with a master table to read.

| Concept | Where the underlying data exists | What has to be built |
|---|---|---|
| **Stage Observation** | Part 6, CROP STAGE: the model runs daily from sowing until 99.99 percent progression and the data is aggregated; "View Full Season Data" exists per plot | An aggregation of per-plot stage history to crop x stage x region x season, comparing observed duration against the configured duration in `crop_growth_stages` |
| **Season Weather and Outcome** | Part 5, SMART ADVISORY (40 years of history, 7-day forecast); Part 3.3 Weather and Calendar; harvest data in Batch Reports | A join of seasonal weather aggregates to harvest outcome per variety x region x season |
| **DEWS History** | Part 5, DEWS (last triggered date on the dashboard); Part 6, DEWS (daily run, 7-day forecast interval, configurable critical threshold, default 75 percent) | A retrospective join of fired warnings to subsequent observed infestation, producing hit rate and lead time. Lead time is not a figure the platform reports today |

## 4. Field lists confirmed against the deck

**Crop Parameters** (Part 2, CROPS; Part 6/8) - expected yield, harvest duration, estimated days to
harvest, standard deductions, price unit quantity, location specific parameters. Maximum attainable yield
comes from Part 8, CROP YIELD ("the variety info template also captures maximum attainable yield, which is
the yield potential of the crop under ideal conditions"). Base temperature comes from Part 8, CROP STAGE
("the base temperature of the variety should be provided"). All seven are carried.

**Plan Attribute kinds** - Custom, Table, Standard (Part 2, PLAN TYPES). All three carried.

**Form types** - general, farmer, operational, survey (Part 2, doc 2.9). All four carried.

**Growth stage example set** - Sowing, Germination, Vegetative stage, Flowering, Harvest (Part 2, doc 2.6).
The synthetic tenant uses crop-specific stage sets that extend this, which is what the deck describes as
configurable.

**Crop health classes** - Normal, Near Normal, Slight Deviation, Moderate Deviation, High Deviation
(Part 6, THE FIVE BUCKETS). Carried as vocabulary in `Grade outcome` and observation notes only; plot-level
health records are out of scope.

**DEWS classes** - Class 3 High above 70 percent, Class 2 Moderate 40 to 70 percent, Class 1 Low 0 to 30
percent, Class 0 No Disease (Part 6, THE DEWS MODEL). Critical warning threshold default 75 percent.
Carried on DEWS History records.

## 5. Naming differences the deck itself flags

Recorded so they are not mistaken for our errors:

- The documentation lists a Configuration module called **Crop Allocation**; the live menu shows **Crop
  Application** (Part 2, module list). Neither is in scope.
- The documentation describes **Cropin Grow** and **SmartFarm Plus**; the product is branded **Cropin
  Cloud** (WORTH CONFIRMING). This ontology says nothing about product branding.
- **Harvest Re-estimate**, **plots not geofenced**, **Loss Reported**, **Yield Rank** and **Average Harvest
  Loss percentage** appear on screens with no written definition (WORTH CONFIRMING). None is carried.
- The Crop Health view shows four tabs including **Crop Germination** while the documentation describes
  three health proxies. Out of scope either way.
- The logic compressing the five crop-health buckets into three is held in Confluence, not in these
  sources.

## 6. Deliberately out of scope

Per the build brief: people and org (Company, Sub Company, User Role, User, Contractor, Farmer), plot-level
records (Asset, Plot, Project, Task), model internals (NDVI, NDRE, LSWI, growing degree days as objects
rather than attributes), compliance and market (certifications, GDPR consent, MRL, price), and the
structured feedback loop (Part 8, THE STRUCTURED FEEDBACK FORM).

The narrow scope is the reason the graph is useful: everything left answers one question - *what should I
configure, and what does our own history say about that choice.*
