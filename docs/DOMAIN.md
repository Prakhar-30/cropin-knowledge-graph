# Cropin Cloud, and where this graph sits in it

Distilled from the platform walkthrough (`Cropin_Cloud_Walkthrough_v2-1`, version 2.135.0). Written down
so the next person does not have to re-derive it, and so every scope decision can be traced to something
the deck actually says.

---

## The platform in one view

Cropin is an agtech platform bringing **digitization** and **intelligence** to the agricultural value
chain. It is configurable: each organisation sets it up to match how it actually works. Two halves:

- **Digitization** - data collection, monitoring and day-to-day execution.
- **Intelligence** - predictive insight, monitoring tools and advanced analytics.

You work through it in a fixed order, each stage depending on the one before:

**Setup Flow → Configuration → Projects → Cropin Intelligence**

| Part | What it holds |
|---|---|
| **1. Setup Flow** | Company details and preferences, sub companies, certifications and GDPR consent, media, user roles across Connect and Grow, users mapped to reporting managers |
| **2. Configuration** | Plan types, contractors, farmers, assets, farm resources, the crop hierarchy, crop plans and packages, alerts, forms, places, tags, Smart Compute, plot approval |
| **3. Projects** | Planning (crop and user targets), Detailing (plot validation, boundaries, splitting), Monitoring (crop, user, farmer, plot, contractor, weather), and Field Activities alongside all three |
| **4. Dashboard** | Production monitoring on a map: active farmers, active assets, three separate area measures, raised alerts, total tasks |
| **5. Cropin Intelligence** | Smart Advisory (a weather rule engine), Farm Engagement (communication), DEWS (disease prediction), Insights and Report Builder |
| **6. Plot Level Intelligence** | PlotRisk: yield estimation, crop stage in growing degree days, crop health across three proxies and five classes, the DEWS model, irrigation advisory, plot weather |
| **7. Industry use cases** | Agri input and seed, contract farming, food processing, BFSI, commodity, government |
| **8. Enablement** | Boundaries first, then model-specific client data. Stated baselines 70-75 percent, two seasons to target accuracy, structured feedback throughout |

Two relationships set up in Configuration and used everywhere after: **Client → Contractor → Farmers**,
and **Farmer → Asset → Crop → Variety → Sub Variety**.

---

## The parts this graph models

The graph covers the second chain and what hangs off it. In the platform's own terms:

| Graph layer | Platform source |
|---|---|
| Crop hierarchy | Configuration §2.6, the Crops module - "the backbone of the platform" |
| Crop configuration | Crop stages, crop parameters, seed and harvest grades (§2.6); crop target dates (§3.1) |
| Where and when it is grown | Places, Seasons (§2 module list); soil type on an asset (§2.4); irrigation type (Parts 6 and 8) |
| Plan and field activity | Plan Types (§2.1), Crop Plans and Packages (§2.7), Forms (§2.9), Farm Resources (§2.5) |
| Disease, pest and alerts | Alerts (§2.8), DEWS (§4.3 and Part 6) |
| What actually happened | Aggregations over crop stage history, seasonal weather and harvest, and DEWS warning history |

## The parts it deliberately does not model

- **People and org** - company, sub company, user roles, users, contractors, farmers.
- **Plot-level records** - assets, plots, projects, tasks.
- **Model internals** - NDVI, NDRE and LSWI as objects rather than as attributes.
- **Compliance and market** - certifications, GDPR consent, MRL, price.
- **The feedback loop** - the structured feedback form in Part 8.

Removing these made the graph *more* useful, not less, because everything remaining answers one
question: what should I configure, and what does our own history say about that choice.

---

## The domain facts the graph is built to expose

These come from the deck and are the reason particular concepts and metrics exist.

### The sowing date is load-bearing and unvalidated

Growing degree days, crop stage, lifecycle progression, harvest window, yield range and disease
probability all count from the sowing date. Part 8 states the assumption explicitly for crop health,
crop stage, crop yield and DEWS: *the sowing date provided is accurate*. Nothing in Setup, Configuration
or Projects validates it. A wrong or late date propagates silently into every model output.

→ `Sowing Window` exists as a first-class configuration object with an ideal window, an outer window and
the cost of breaching it.

### Crop stage is measured in heat units, not calendar days

Part 6: the model predicts the current stage and lifecycle progression from growing degree days
accumulated since sowing, and reports growth rate as slow, fast or normal plus a harvest window. Heat
units are more reliable than calendar days for tracking crop and pest development.

→ Growth stages carry both a configured duration in days and accumulated GDD, and `Stage Observation`
records compare configured against observed duration per region.

### Configured stage sets do not fit every region

The same configured stage runs shorter in one region and longer in another, so activities anchored to
stage boundaries fire late in one place and early in the other from one configuration. Neither regional
overrides nor observed-duration feedback exists in the platform today.

→ The `observed` layer carries the deviation, per crop, stage, region and season, with the plot count
behind it.

### DEWS accuracy is not the constraint - lead time is

Part 6: DEWS runs daily on a 7-day forecast interval, uses rainy days, total rainfall, Tmax, Tmin, RH
and Tmean, offers 80 or more disease models across 40 or more crops, and classes output as High (above
70 percent), Moderate (40-70), Low (0-30) and No Disease. The critical warning threshold defaults to 75
percent and is configurable. Target accuracy for forewarning is 60 percent.

What the deck does not report is lead time. Across the observed history in this graph, hit rates are
respectable while lead time ranges from 1.4 days on a flood-triggered model to 5.8 on a degree-day-driven
one. A warning with two days' notice is only actionable where the sprayer is already on the farm.

→ `DEWS History` carries warnings fired, critical warnings, how many were followed by disease, hit rate,
mean lead time and the configured threshold. The `decide` text says to judge a configuration on lead
time, not only on hit rate.

### Yield gaps and grade gaps have different causes

A lot can hit tonnage and fail the contract on dry matter, and the two failures often share a cause but
need different remedies. In this tenant, Lady Rosetta ran 14.4 percent under expected yield *and*
delivered 58 percent chips grade A against an 80 percent expectation - both from heat during bulking,
reported as two problems.

→ Grade expectation lives on the sub variety, separately from the yield parameters on the variety, and
`Season Weather and Outcome` pairs the weather with both outcomes so the shared cause is visible.

### Non-biotic alerts cost more than diseases

Frost at 14.8 percent mean area impacted, hail at 22.4, waterlogging at 11.4 - all above late blight at
8.4. They are cheaper to configure, because the trigger is weather rather than a disease model, and they
are currently an afterthought.

→ `Alert Type` carries mean area impacted as a primary metric, and its `decide` text says not to leave
the non-biotic ones until last.

### Uncalibrated variety, not the plot, is often the real problem

Part 8: crop stage and crop yield both have a 75 percent baseline that improves with client input, crop
yield's base model works everywhere at 70 percent, and **two seasons are needed to reach target
accuracy** for crop health, crop stage and crop yield alike. A variety with one season of history sits
on the base model and will read as underperforming whatever the field did.

→ Every variety carries `Calibration state` and `Seasons of history`, and the panel shows them beside
the gap.

### The three area measures are not interchangeable

Declared, audited and usable area each have different plot counts behind them, and only usable area is
the correct divisor for yield. A footnote in the documentation and a material source of error in
practice.

→ Out of scope here, because plot-level records are out of scope, but recorded in
`ontology/nomenclature.md` so it is not mistaken for an oversight.

---

## Vocabulary this graph borrows

| Term | As the deck defines it |
|---|---|
| **Plan Type** | A reusable template defining the structure and parameters of a field activity; assignable to crops, varieties and sub varieties |
| **Crop hierarchy** | Crop → Variety → Sub Variety, used throughout the system |
| **Farm Resource** | Operational tools, machinery and equipment - tractors, sprayers, irrigation systems, harvesting equipment, storage |
| **Smart Compute** | Calculation across entities: attribute calculations, KPI computations, monitoring metrics, business logic automation, trigger-based calculations |
| **Plot Approval** | The validation layer for farmer-submitted plots, which stops invalid or duplicate records entering operational workflows |
| **Smart Advisory** | A weather and climate rule engine that triggers automated advisories when configured conditions are met |
| **DEWS** | The Disease Early Warning System: it predicts how likely a disease is, rather than detecting one that exists |
| **NDVI / NDRE / LSWI** | The raw indices behind Canopy Greenness, Canopy Nitrogen Uptake and Canopy Water Stress. LSWI runs the opposite way: higher means more stress |
| **Growing degree days** | Heat units accumulated since sowing; more reliable than calendar days |
| **Harvest window** | The predicted date range in which the crop reaches maturity |
| **Effective irrigation** | The recommendation as given. A 30 mm recommendation on a 75 percent efficient system means 37.5 mm actually applied |

Full term-by-term reconciliation, including where this graph diverges from the deck and why, is in
`ontology/nomenclature.md`.

---

## Points the sources leave open

Carried from the deck's own "worth confirming" slide, so they are not mistaken for our errors:

- The significance of sub companies, and how an Executive Profile works, are open questions in the
  onboarding documentation itself.
- The documentation lists a Configuration module called **Crop Allocation**; the live menu shows **Crop
  Application**.
- The documentation describes **Cropin Grow** and **SmartFarm Plus**; the product is branded **Cropin
  Cloud**.
- Harvest Re-estimate, plots not geofenced, Loss Reported, Yield Rank and Average Harvest Loss
  percentage appear on screens with no written definition.
- The Crop Health view shows four tabs including Crop Germination, while the documentation describes
  three health proxies.
- The logic that compresses the five crop-health buckets into three is held in Confluence.
- Sustainability and Deforestation Monitoring appear on screens and in no document.
