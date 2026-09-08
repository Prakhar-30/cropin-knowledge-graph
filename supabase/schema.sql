-- Cropin configuration-assist knowledge graph - Supabase schema
--
-- Run this once in the Supabase SQL editor. It creates three things:
--
--   1. Platform master tables. A stand-in for the tenant database the graph reports over. Table and
--      column names follow ontology/nomenclature.md, so the mapping file is realistic rather than
--      invented. In a real deployment these already exist and this section is skipped.
--
--   2. Aggregate views. The graph is small; the operational tables are not. Every derived weight is
--      computed here, in the database, and the pipeline only ever selects from these views. This is the
--      architectural claim in section 3.1 of the build brief made concrete: SQL for aggregation, the
--      graph materialised as a document, traversal in memory.
--
--   3. The graph store (kg_*). Where a built document is pushed so the API and the viewer can serve it
--      without a file. It is a derived artefact and can be rebuilt from scratch at any time - never a
--      source of truth.
--
-- Everything is readable with the publishable (anon) key. Writes need the service role key.

-- =====================================================================================
-- 1. PLATFORM MASTERS
-- =====================================================================================

create table if not exists crop_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  code text,
  category text,
  unit text,
  price_unit text,
  calibration text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists variety_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  crop_key text not null,
  code text,
  seed_source text,
  maturity text,
  calibration text,
  seasons_of_history int,
  note text,
  primary key (tenant_id, key)
);

create table if not exists variety_parameters (
  tenant_id text not null,
  variety_key text not null,
  expected_yield numeric,
  max_attainable numeric,
  harvest_duration int,
  est_days_to_harvest int,
  base_temp numeric,
  deduction numeric,
  price_unit text,
  primary key (tenant_id, variety_key)
);

create table if not exists sub_variety_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  variety_key text not null,
  code text,
  purpose text,
  grade_expectation text,
  lot_handling text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists crop_growth_stages (
  tenant_id text not null,
  key text not null,
  crop_key text not null,
  name text not null,
  stage_order int,
  days int,
  cumulative int,
  gdd int,
  critical boolean,
  note text,
  primary key (tenant_id, key)
);

-- Sowing Window. The nearest existing platform object is a project crop target date; a reusable
-- configuration window does not exist today. See ontology/nomenclature.md section 2.
create table if not exists crop_target_dates (
  tenant_id text not null,
  key text not null,
  crop_key text not null,
  region_key text not null,
  season_key text not null,
  ideal_window text,
  outer_window text,
  cost_of_breach text,
  primary key (tenant_id, key)
);

create table if not exists seed_grades (
  tenant_id text not null,
  key text not null,
  name text not null,
  class text,
  purity text,
  certification text,
  used_at text,
  primary key (tenant_id, key)
);

create table if not exists harvest_grades (
  tenant_id text not null,
  key text not null,
  crop_key text not null,
  name text not null,
  spec text,
  threshold text,
  contract text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists places_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  type text,
  level text,
  zone text,
  districts text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists season_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  months text,
  calendar_window text,
  type text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists soil_type_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  texture text,
  whc text,
  ph text,
  notes text,
  primary key (tenant_id, key)
);

create table if not exists irrigation_type_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  method text,
  efficiency text,
  capacity text,
  suited text,
  primary key (tenant_id, key)
);

create table if not exists plan_type_master (
  tenant_id text not null,
  key text not null,
  crop_key text not null,
  name text not null,
  sections text,
  attr_kinds text,
  status text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists crop_plan (
  tenant_id text not null,
  key text not null,
  name text not null,
  plan_type_key text not null,
  variety_key text not null,
  season_key text not null,
  status text,
  cost_per_acre int,
  activity_count int,
  note text,
  primary key (tenant_id, key)
);

create table if not exists plan_activity (
  tenant_id text not null,
  key text not null,
  name text not null,
  type text,
  scheduling text,
  offset_rule text,
  duration text,
  approval text,
  note text,
  primary key (tenant_id, key)
);

create table if not exists plan_attributes (
  tenant_id text not null,
  key text not null,
  name text not null,
  kind text,
  data_type text,
  unit text,
  required text,
  primary key (tenant_id, key)
);

create table if not exists resource_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  category text,
  unit text,
  cost text,
  owner text,
  primary key (tenant_id, key)
);

create table if not exists form_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  type text,
  version text,
  fields text,
  consent text,
  note text,
  primary key (tenant_id, key)
);

-- Diseases and agricultural alerts share the platform's alert module, so they share a table and are
-- separated by `kind`. Two concepts, one source.
create table if not exists alert_master (
  tenant_id text not null,
  key text not null,
  name text not null,
  kind text not null check (kind in ('disease', 'alert')),
  crop_key text,
  category text,
  conditions text,
  symptoms text,
  advisory text,
  mitigation text,
  dews_model text,
  area_pct numeric,
  note text,
  primary key (tenant_id, key)
);

-- ---------------------------------------------------------------- junctions

create table if not exists crop_plan_activity (
  tenant_id text not null,
  crop_plan_key text not null,
  activity_key text not null,
  primary key (tenant_id, crop_plan_key, activity_key)
);

create table if not exists activity_stage_anchor (
  tenant_id text not null,
  activity_key text not null,
  stage_key text not null,
  primary key (tenant_id, activity_key, stage_key)
);

create table if not exists activity_resource (
  tenant_id text not null,
  activity_key text not null,
  resource_key text not null,
  primary key (tenant_id, activity_key, resource_key)
);

create table if not exists activity_attribute (
  tenant_id text not null,
  activity_key text not null,
  attribute_key text not null,
  primary key (tenant_id, activity_key, attribute_key)
);

create table if not exists activity_form (
  tenant_id text not null,
  activity_key text not null,
  form_key text not null,
  primary key (tenant_id, activity_key)
);

create table if not exists crop_grade (
  tenant_id text not null,
  crop_key text not null,
  grade_key text not null,
  primary key (tenant_id, crop_key, grade_key)
);

create table if not exists variety_grade (
  tenant_id text not null,
  owner_kind text not null check (owner_kind in ('variety', 'sub_variety')),
  owner_key text not null,
  grade_kind text not null check (grade_kind in ('harvest_grade', 'seed_grade')),
  grade_key text not null,
  primary key (tenant_id, owner_kind, owner_key, grade_key)
);

create table if not exists variety_disease (
  tenant_id text not null,
  variety_key text not null,
  disease_key text not null,
  incidence_pct numeric not null,
  primary key (tenant_id, variety_key, disease_key)
);

create table if not exists disease_stage (
  tenant_id text not null,
  disease_key text not null,
  stage_key text not null,
  primary key (tenant_id, disease_key, stage_key)
);

create table if not exists risk_mitigation (
  tenant_id text not null,
  risk_kind text not null check (risk_kind in ('disease', 'alert')),
  risk_key text not null,
  activity_key text not null,
  primary key (tenant_id, risk_key, activity_key)
);

create table if not exists crop_alert (
  tenant_id text not null,
  crop_key text not null,
  alert_key text not null,
  plots int,
  primary key (tenant_id, crop_key, alert_key)
);

-- ------------------------------------------------------- operational aggregates
-- In a real deployment these are views over plot, task and harvest tables. They are tables here so a
-- demo tenant can be seeded without shipping a plot-level fact table. The three that the platform can
-- compute but does not expose as configuration objects are flagged in nomenclature.md section 3.

create table if not exists agg_variety_plot_count (
  tenant_id text not null,
  variety_key text not null,
  plots int,
  growers int,
  projects int,
  expected numeric,
  achieved numeric,
  primary key (tenant_id, variety_key)
);

create table if not exists agg_variety_region (
  tenant_id text not null,
  variety_key text not null,
  region_key text not null,
  plots int,
  primary key (tenant_id, variety_key, region_key)
);

create table if not exists agg_variety_season (
  tenant_id text not null,
  variety_key text not null,
  season_key text not null,
  plots int,
  primary key (tenant_id, variety_key, season_key)
);

create table if not exists agg_variety_soil (
  tenant_id text not null,
  variety_key text not null,
  soil_key text not null,
  plots int,
  primary key (tenant_id, variety_key, soil_key)
);

create table if not exists agg_variety_irrigation (
  tenant_id text not null,
  variety_key text not null,
  irrigation_key text not null,
  plots int,
  primary key (tenant_id, variety_key, irrigation_key)
);

create table if not exists agg_sub_variety_plots (
  tenant_id text not null,
  sub_variety_key text not null,
  plots int,
  growers int,
  primary key (tenant_id, sub_variety_key)
);

create table if not exists agg_crop_plan_plots (
  tenant_id text not null,
  crop_plan_key text not null,
  plots int,
  projects int,
  primary key (tenant_id, crop_plan_key)
);

create table if not exists agg_sowing_window_plots (
  tenant_id text not null,
  window_key text not null,
  plots int,
  primary key (tenant_id, window_key)
);

create table if not exists agg_stage_observation (
  tenant_id text not null,
  key text not null,
  crop_key text not null,
  stage_key text not null,
  region_key text not null,
  season_key text not null,
  configured_days int,
  observed_days int,
  plots int,
  note text,
  primary key (tenant_id, key)
);

create table if not exists agg_season_outcome (
  tenant_id text not null,
  key text not null,
  name text not null,
  crop_key text not null,
  variety_key text not null,
  region_key text not null,
  season_key text not null,
  rainfall text,
  mean_tmax text,
  heat_events text,
  expected numeric,
  achieved numeric,
  grade_outcome text,
  plots int,
  note text,
  primary key (tenant_id, key)
);

create table if not exists agg_dews_history (
  tenant_id text not null,
  key text not null,
  name text not null,
  disease_key text not null,
  region_key text not null,
  season_key text not null,
  warnings int,
  critical int,
  followed int,
  hit_rate numeric,
  lead_days numeric,
  threshold int,
  note text,
  primary key (tenant_id, key)
);

-- =====================================================================================
-- 2. AGGREGATE VIEWS
-- Every derived link weight is computed here. The pipeline never sums these itself, which is what keeps
-- one number from disagreeing with another.
-- =====================================================================================

-- A crop's plots are the sum of its varieties'. Nothing else.
create or replace view v_crop_plots as
select v.tenant_id, v.crop_key as crop_key, sum(coalesce(a.plots, 0))::int as plots
from variety_master v
left join agg_variety_plot_count a on a.tenant_id = v.tenant_id and a.variety_key = v.key
group by v.tenant_id, v.crop_key;

-- Every growth stage of a crop sits behind all of that crop's plots.
create or replace view v_crop_stage_plots as
select s.tenant_id, s.key as stage_key, s.crop_key, coalesce(c.plots, 0) as plots
from crop_growth_stages s
left join v_crop_plots c on c.tenant_id = s.tenant_id and c.crop_key = s.crop_key;

-- Plan types carry the plots of the crop plans built from them.
create or replace view v_plan_type_plots as
select p.tenant_id, p.plan_type_key, sum(coalesce(a.plots, 0))::int as plots
from crop_plan p
left join agg_crop_plan_plots a on a.tenant_id = p.tenant_id and a.crop_plan_key = p.key
group by p.tenant_id, p.plan_type_key;

-- An activity's reach: the crop plans that include it, summed. Plans do not share plots, so this is a
-- true plot count rather than an occurrence count.
create or replace view v_activity_plots as
select cpa.tenant_id, cpa.activity_key, sum(coalesce(a.plots, 0))::int as plots
from crop_plan_activity cpa
left join agg_crop_plan_plots a on a.tenant_id = cpa.tenant_id and a.crop_plan_key = cpa.crop_plan_key
group by cpa.tenant_id, cpa.activity_key;

-- The same, split by crop, which is what a stage anchor weight needs.
create or replace view v_activity_crop_plots as
select cpa.tenant_id, cpa.activity_key, v.crop_key, sum(coalesce(a.plots, 0))::int as plots
from crop_plan_activity cpa
join crop_plan p on p.tenant_id = cpa.tenant_id and p.key = cpa.crop_plan_key
join variety_master v on v.tenant_id = p.tenant_id and v.key = p.variety_key
left join agg_crop_plan_plots a on a.tenant_id = cpa.tenant_id and a.crop_plan_key = cpa.crop_plan_key
group by cpa.tenant_id, cpa.activity_key, v.crop_key;

-- Stage anchors with their weight resolved.
create or replace view v_activity_stage_weighted as
select asa.tenant_id, asa.activity_key, asa.stage_key, coalesce(w.plots, 0) as plots
from activity_stage_anchor asa
join crop_growth_stages s on s.tenant_id = asa.tenant_id and s.key = asa.stage_key
left join v_activity_crop_plots w
  on w.tenant_id = asa.tenant_id and w.activity_key = asa.activity_key and w.crop_key = s.crop_key;

-- Susceptibility in plots: the variety's plots times the recorded incidence.
create or replace view v_variety_disease_plots as
select vd.tenant_id, vd.variety_key, vd.disease_key,
       round(coalesce(a.plots, 0) * vd.incidence_pct / 100.0)::int as plots,
       vd.incidence_pct
from variety_disease vd
left join agg_variety_plot_count a on a.tenant_id = vd.tenant_id and a.variety_key = vd.variety_key;

-- A disease's plots are the sum of the varieties it was recorded on.
create or replace view v_disease_plots as
select tenant_id, disease_key, sum(plots)::int as plots
from v_variety_disease_plots
group by tenant_id, disease_key;

-- The crop level statement of the same fact, so the two can be cross checked.
create or replace view v_crop_disease_plots as
select a.tenant_id, a.crop_key, a.key as disease_key, coalesce(d.plots, 0) as plots
from alert_master a
left join v_disease_plots d on d.tenant_id = a.tenant_id and d.disease_key = a.key
where a.kind = 'disease';

create or replace view v_alert_plots as
select tenant_id, alert_key, sum(coalesce(plots, 0))::int as plots
from crop_alert
group by tenant_id, alert_key;

-- Disease criticality and mitigation both carry the risk's own plot count.
create or replace view v_disease_stage_weighted as
select ds.tenant_id, ds.disease_key, ds.stage_key, coalesce(d.plots, 0) as plots
from disease_stage ds
left join v_disease_plots d on d.tenant_id = ds.tenant_id and d.disease_key = ds.disease_key;

create or replace view v_risk_mitigation_weighted as
select m.tenant_id, m.risk_kind, m.risk_key, m.activity_key,
       coalesce(case when m.risk_kind = 'disease' then d.plots else al.plots end, 0) as plots
from risk_mitigation m
left join v_disease_plots d on d.tenant_id = m.tenant_id and d.disease_key = m.risk_key
left join v_alert_plots al on al.tenant_id = m.tenant_id and al.alert_key = m.risk_key;

-- Grade usage. A variety delegates to its sub varieties where they exist, so no plot is counted at two
-- levels of the hierarchy.
create or replace view v_grade_usage as
select g.tenant_id, g.owner_kind, g.owner_key, g.grade_kind, g.grade_key,
       coalesce(case when g.owner_kind = 'variety' then av.plots else asv.plots end, 0) as plots
from variety_grade g
left join agg_variety_plot_count av on av.tenant_id = g.tenant_id and av.variety_key = g.owner_key
left join agg_sub_variety_plots asv on asv.tenant_id = g.tenant_id and asv.sub_variety_key = g.owner_key;

-- =====================================================================================
-- 3. THE GRAPH STORE
-- A built document, pushed. Derived, rebuildable, never a source of truth.
-- =====================================================================================

create table if not exists kg_builds (
  tenant_id text not null,
  built_at timestamptz not null,
  schema_version text not null,
  source text,
  source_snapshot text,
  meta jsonb not null,
  counts jsonb not null,
  primary key (tenant_id, built_at)
);

create table if not exists kg_concepts (
  tenant_id text not null,
  id text not null,
  key text not null,
  label text not null,
  layer text not null,
  definition text,
  decide text,
  source text,
  label_scope text,
  records int,
  primary key (tenant_id, id)
);

create table if not exists kg_records (
  tenant_id text not null,
  id text not null,
  concept text not null,
  label text not null,
  attrs jsonb not null default '{}',
  usage jsonb not null default '{}',
  note text,
  summary text,
  primary key (tenant_id, id)
);

create table if not exists kg_links (
  tenant_id text not null,
  from_id text not null,
  to_id text not null,
  rel text not null,
  plots int,
  note text,
  primary key (tenant_id, rel, from_id, to_id)
);

create index if not exists kg_records_concept_idx on kg_records (tenant_id, concept);
create index if not exists kg_links_from_idx on kg_links (tenant_id, from_id);
create index if not exists kg_links_to_idx on kg_links (tenant_id, to_id);

-- =====================================================================================
-- READ ACCESS
-- Everything is readable with the publishable key. Writes need the service role key, which bypasses
-- RLS - so the ingestion path is read-only by policy, not only by convention.
-- =====================================================================================

do $rls$
declare
  t text;
  -- Only the tables this file creates. Anything else in the project is left alone.
  targets text[] := array[
    'crop_master',
    'variety_master',
    'variety_parameters',
    'sub_variety_master',
    'crop_growth_stages',
    'crop_target_dates',
    'seed_grades',
    'harvest_grades',
    'places_master',
    'season_master',
    'soil_type_master',
    'irrigation_type_master',
    'plan_type_master',
    'crop_plan',
    'plan_activity',
    'plan_attributes',
    'resource_master',
    'form_master',
    'alert_master',
    'crop_plan_activity',
    'activity_stage_anchor',
    'activity_resource',
    'activity_attribute',
    'activity_form',
    'crop_grade',
    'variety_grade',
    'variety_disease',
    'disease_stage',
    'risk_mitigation',
    'crop_alert',
    'agg_variety_plot_count',
    'agg_variety_region',
    'agg_variety_season',
    'agg_variety_soil',
    'agg_variety_irrigation',
    'agg_sub_variety_plots',
    'agg_crop_plan_plots',
    'agg_sowing_window_plots',
    'agg_stage_observation',
    'agg_season_outcome',
    'agg_dews_history',
    'kg_builds',
    'kg_concepts',
    'kg_records',
    'kg_links'
  ];
begin
  foreach t in array targets loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists kg_read on public.%I', t);
    execute format('create policy kg_read on public.%I for select using (true)', t);
  end loop;
end $rls$;


-- =====================================================================================
-- 4. DISPLAY VIEWS
-- A record's attributes are display-ready strings. The label of a related record has to come from
-- somewhere, and a join in the database is the honest place for it - the alternative is a lookup per row
-- in the mapping layer, which is the N+1 the architecture rules out. Numeric formatting stays in the
-- mapping file, where the presentation contract lives.
-- =====================================================================================

create or replace view v_variety_display as
select v.*, a.plots, a.growers, a.projects, a.expected, a.achieved
from variety_master v
left join agg_variety_plot_count a on a.tenant_id = v.tenant_id and a.variety_key = v.key;

create or replace view v_sub_variety_display as
select s.*, a.plots, a.growers
from sub_variety_master s
left join agg_sub_variety_plots a on a.tenant_id = s.tenant_id and a.sub_variety_key = s.key;

create or replace view v_crop_parameters_display as
select p.*, v.name as variety_name, v.crop_key
from variety_parameters p
join variety_master v on v.tenant_id = p.tenant_id and v.key = p.variety_key;

create or replace view v_growth_stage_display as
select s.*, c.name as crop_name
from crop_growth_stages s
join crop_master c on c.tenant_id = s.tenant_id and c.key = s.crop_key;

create or replace view v_harvest_grade_display as
select g.*, c.name as crop_name
from harvest_grades g
join crop_master c on c.tenant_id = g.tenant_id and c.key = g.crop_key;

create or replace view v_sowing_window_display as
select w.*, c.name as crop_name, r.name as region_name, s.name as season_name,
       coalesce(p.plots, 0) as plots
from crop_target_dates w
join crop_master c on c.tenant_id = w.tenant_id and c.key = w.crop_key
join places_master r on r.tenant_id = w.tenant_id and r.key = w.region_key
join season_master s on s.tenant_id = w.tenant_id and s.key = w.season_key
left join agg_sowing_window_plots p on p.tenant_id = w.tenant_id and p.window_key = w.key;

create or replace view v_plan_type_display as
select p.*, c.name as crop_name
from plan_type_master p
join crop_master c on c.tenant_id = p.tenant_id and c.key = p.crop_key;

create or replace view v_crop_plan_display as
select p.*, pt.name as plan_type_name, v.name as variety_name, s.name as season_name,
       a.plots, a.projects
from crop_plan p
join plan_type_master pt on pt.tenant_id = p.tenant_id and pt.key = p.plan_type_key
join variety_master v on v.tenant_id = p.tenant_id and v.key = p.variety_key
join season_master s on s.tenant_id = p.tenant_id and s.key = p.season_key
left join agg_crop_plan_plots a on a.tenant_id = p.tenant_id and a.crop_plan_key = p.key;

create or replace view v_disease_display as
select a.*, c.name as crop_name
from alert_master a
join crop_master c on c.tenant_id = a.tenant_id and c.key = a.crop_key
where a.kind = 'disease';

create or replace view v_alert_display as
select * from alert_master where kind = 'alert';

create or replace view v_stage_observation_display as
select o.*, c.name as crop_name, s.name as stage_name, r.name as region_name, se.name as season_name,
       round((o.observed_days - o.configured_days) * 100.0 / o.configured_days, 1) as deviation_pct
from agg_stage_observation o
join crop_master c on c.tenant_id = o.tenant_id and c.key = o.crop_key
join crop_growth_stages s on s.tenant_id = o.tenant_id and s.key = o.stage_key
join places_master r on r.tenant_id = o.tenant_id and r.key = o.region_key
join season_master se on se.tenant_id = o.tenant_id and se.key = o.season_key;

create or replace view v_season_outcome_display as
select o.*, c.name as crop_name, c.unit as crop_unit, v.name as variety_name,
       r.name as region_name, se.name as season_name,
       round((o.achieved - o.expected) * 100.0 / o.expected, 1) as gap_pct
from agg_season_outcome o
join crop_master c on c.tenant_id = o.tenant_id and c.key = o.crop_key
join variety_master v on v.tenant_id = o.tenant_id and v.key = o.variety_key
join places_master r on r.tenant_id = o.tenant_id and r.key = o.region_key
join season_master se on se.tenant_id = o.tenant_id and se.key = o.season_key;

create or replace view v_dews_history_display as
select d.*, a.name as disease_name, r.name as region_name, se.name as season_name
from agg_dews_history d
join alert_master a on a.tenant_id = d.tenant_id and a.key = d.disease_key
join places_master r on r.tenant_id = d.tenant_id and r.key = d.region_key
join season_master se on se.tenant_id = d.tenant_id and se.key = d.season_key;

-- Weighted junctions. A junction row on its own carries no evidence; joined to its aggregate it does.

create or replace view v_crop_plan_activity_weighted as
select cpa.tenant_id, cpa.crop_plan_key, cpa.activity_key, coalesce(a.plots, 0) as plots
from crop_plan_activity cpa
left join agg_crop_plan_plots a on a.tenant_id = cpa.tenant_id and a.crop_plan_key = cpa.crop_plan_key;

create or replace view v_activity_resource_weighted as
select ar.tenant_id, ar.activity_key, ar.resource_key, coalesce(p.plots, 0) as plots
from activity_resource ar
left join v_activity_plots p on p.tenant_id = ar.tenant_id and p.activity_key = ar.activity_key;

create or replace view v_activity_attribute_weighted as
select aa.tenant_id, aa.activity_key, aa.attribute_key, coalesce(p.plots, 0) as plots
from activity_attribute aa
left join v_activity_plots p on p.tenant_id = aa.tenant_id and p.activity_key = aa.activity_key;

create or replace view v_activity_form_weighted as
select af.tenant_id, af.activity_key, af.form_key, coalesce(p.plots, 0) as plots
from activity_form af
left join v_activity_plots p on p.tenant_id = af.tenant_id and p.activity_key = af.activity_key;

-- Mitigation, with the record id prefix each risk kind maps to.
create or replace view v_risk_mitigation_display as
select m.*, case when m.risk_kind = 'disease' then 'disease_or_pest' else 'alert_type' end as risk_prefix
from v_risk_mitigation_weighted m;


-- =====================================================================================
-- 5. READ ACCESS
-- The publishable key reads everything this file creates and writes nothing. Grants are listed
-- explicitly rather than applied to the whole schema, so an unrelated table in the same project keeps
-- whatever privileges it already had.
-- =====================================================================================

grant usage on schema public to anon, authenticated;
grant select on crop_master, variety_master, variety_parameters, sub_variety_master, crop_growth_stages, crop_target_dates, seed_grades, harvest_grades, places_master, season_master, soil_type_master, irrigation_type_master, plan_type_master, crop_plan, plan_activity, plan_attributes, resource_master, form_master, alert_master, crop_plan_activity, activity_stage_anchor, activity_resource, activity_attribute, activity_form, crop_grade, variety_grade, variety_disease, disease_stage, risk_mitigation, crop_alert, agg_variety_plot_count, agg_variety_region, agg_variety_season, agg_variety_soil, agg_variety_irrigation, agg_sub_variety_plots, agg_crop_plan_plots, agg_sowing_window_plots, agg_stage_observation, agg_season_outcome, agg_dews_history, kg_builds, kg_concepts, kg_records, kg_links to anon, authenticated;
grant select on v_crop_plots, v_crop_stage_plots, v_plan_type_plots, v_activity_plots, v_activity_crop_plots, v_activity_stage_weighted, v_variety_disease_plots, v_disease_plots, v_crop_disease_plots, v_alert_plots, v_disease_stage_weighted, v_risk_mitigation_weighted, v_grade_usage, v_variety_display, v_sub_variety_display, v_crop_parameters_display, v_growth_stage_display, v_harvest_grade_display, v_sowing_window_display, v_plan_type_display, v_crop_plan_display, v_disease_display, v_alert_display, v_stage_observation_display, v_season_outcome_display, v_dews_history_display, v_crop_plan_activity_weighted, v_activity_resource_weighted, v_activity_attribute_weighted, v_activity_form_weighted, v_risk_mitigation_display to anon, authenticated;
