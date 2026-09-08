/**
 * Turns the synthetic catalog into rows for the platform master tables in supabase/schema.sql.
 *
 * This is what makes the Supabase path demonstrable rather than theoretical: seed a real database with
 * a realistic schema, then have the pipeline read it back through the mapping file and reproduce the
 * reference document. Nothing here is part of the ingestion path - it is a fixture generator.
 */
import { allocate } from '../sources/synthetic/allocate.js';
import {
  CROPS,
  GRADE_USAGE,
  HARVEST_GRADES,
  IRRIGATIONS,
  REGIONS,
  SEASONS,
  SEED_GRADES,
  SOILS,
  SOWING_WINDOWS,
  STAGES,
  SUB_VARIETIES,
  VARIETIES,
} from '../sources/synthetic/catalog-core.js';
import {
  ACTIVITIES,
  ACTIVITY_ATTRIBUTES,
  ACTIVITY_FORMS,
  ACTIVITY_RESOURCES,
  ARCHETYPE_ACTIVITIES,
  ATTRIBUTES,
  CROP_PLANS,
  FORMS,
  PLAN_TYPES,
  RESOURCES,
  STAGE_ANCHORS,
} from '../sources/synthetic/catalog-plans.js';
import {
  ALERTS,
  ALERT_MITIGATIONS,
  ALERT_OBSERVATIONS,
  CRITICAL_STAGES,
  DEWS_HISTORY,
  DISEASES,
  DISEASE_MITIGATIONS,
  SEASON_OUTCOMES,
  STAGE_OBSERVATIONS,
  SUSCEPTIBILITY,
} from '../sources/synthetic/catalog-risk.js';

export type SeedRow = Record<string, string | number | boolean | null>;
export type SeedTables = Array<{ table: string; rows: SeedRow[] }>;

/** Insertion order matters only for readability; there are no foreign keys to satisfy. */
export function buildMasterRows(tenantId: string): SeedTables {
  const t = tenantId;

  const crop_master = CROPS.map((c) => ({
    tenant_id: t, key: c.key, name: c.label, code: c.code, category: c.category,
    unit: c.unit, price_unit: c.priceUnit, calibration: c.calibration, note: c.note ?? null,
  }));

  const variety_master = VARIETIES.map((v) => ({
    tenant_id: t, key: v.key, name: v.label, crop_key: v.crop, code: v.code,
    seed_source: v.seedSource, maturity: v.maturity, calibration: v.calibration,
    seasons_of_history: v.seasonsOfHistory, note: v.note ?? null,
  }));

  const variety_parameters = VARIETIES.map((v) => ({
    tenant_id: t, variety_key: v.key, expected_yield: v.expected, max_attainable: v.maxAttainable,
    harvest_duration: v.harvestDuration, est_days_to_harvest: v.estDaysToHarvest,
    base_temp: v.baseTemp, deduction: v.deduction,
    price_unit: CROPS.find((c) => c.key === v.crop)!.priceUnit,
  }));

  const sub_variety_master = SUB_VARIETIES.map((s) => ({
    tenant_id: t, key: s.key, name: s.label, variety_key: s.variety, code: s.code,
    purpose: s.purpose, grade_expectation: s.gradeExpectation, lot_handling: s.lotHandling,
    note: s.note ?? null,
  }));

  const crop_growth_stages = STAGES.map((s) => ({
    tenant_id: t, key: s.key, crop_key: s.crop, name: s.label, stage_order: s.order,
    days: s.days, cumulative: s.cumulative, gdd: s.gdd, critical: s.critical, note: s.note ?? null,
  }));

  const crop_target_dates = SOWING_WINDOWS.map((w) => ({
    tenant_id: t, key: w.key, crop_key: w.crop, region_key: w.region, season_key: w.season,
    ideal_window: w.ideal, outer_window: w.outer, cost_of_breach: w.cost,
  }));

  const seed_grades = SEED_GRADES.map((g) => ({
    tenant_id: t, key: g.key, name: g.label, class: g.class, purity: g.purity,
    certification: g.certification, used_at: g.usedAt,
  }));

  const harvest_grades = HARVEST_GRADES.map((g) => ({
    tenant_id: t, key: g.key, crop_key: g.crop, name: g.label, spec: g.spec,
    threshold: g.threshold, contract: g.contract, note: g.note ?? null,
  }));

  const places_master = REGIONS.map((r) => ({
    tenant_id: t, key: r.key, name: r.label, type: r.type, level: r.level, zone: r.zone,
    districts: r.districts, note: r.note ?? null,
  }));

  const season_master = SEASONS.map((s) => ({
    tenant_id: t, key: s.key, name: s.label, months: s.months, calendar_window: s.window, type: s.type,
    note: s.note ?? null,
  }));

  const soil_type_master = SOILS.map((s) => ({
    tenant_id: t, key: s.key, name: s.label, texture: s.texture, whc: s.whc, ph: s.ph, notes: s.notes,
  }));

  const irrigation_type_master = IRRIGATIONS.map((i) => ({
    tenant_id: t, key: i.key, name: i.label, method: i.method, efficiency: i.efficiency,
    capacity: i.capacity, suited: i.suited,
  }));

  const plan_type_master = PLAN_TYPES.map((p) => ({
    tenant_id: t, key: p.key, crop_key: p.crop, name: p.label, sections: p.sections,
    attr_kinds: p.attrKinds, status: p.status, note: p.note ?? null,
  }));

  const crop_plan = CROP_PLANS.map((p) => ({
    tenant_id: t, key: p.key, name: p.label, plan_type_key: p.planType, variety_key: p.variety,
    season_key: p.season, status: p.status, cost_per_acre: p.costPerAcre,
    activity_count: ARCHETYPE_ACTIVITIES[p.archetype].length, note: p.note ?? null,
  }));

  const plan_activity = ACTIVITIES.map((a) => ({
    tenant_id: t, key: a.key, name: a.label, type: a.type, scheduling: a.scheduling,
    offset_rule: a.offset, duration: a.duration, approval: a.approval, note: a.note ?? null,
  }));

  const plan_attributes = ATTRIBUTES.map((a) => ({
    tenant_id: t, key: a.key, name: a.label, kind: a.kind, data_type: a.dataType, unit: a.unit,
    required: a.required,
  }));

  const resource_master = RESOURCES.map((r) => ({
    tenant_id: t, key: r.key, name: r.label, category: r.category, unit: r.unit, cost: r.cost,
    owner: r.owner,
  }));

  const form_master = FORMS.map((f) => ({
    tenant_id: t, key: f.key, name: f.label, type: f.type, version: f.version, fields: f.fields,
    consent: f.consent, note: f.note ?? null,
  }));

  const alert_master = [
    ...DISEASES.map((d) => ({
      tenant_id: t, key: d.key, name: d.label, kind: 'disease', crop_key: d.crop, category: d.type,
      conditions: d.conditions, symptoms: d.symptoms, advisory: null, mitigation: d.mitigation,
      dews_model: d.model, area_pct: null, note: d.note ?? null,
    })),
    ...ALERTS.map((a) => ({
      tenant_id: t, key: a.key, name: a.label, kind: 'alert', crop_key: null, category: a.class,
      conditions: a.trigger, symptoms: null, advisory: a.advisory, mitigation: null,
      dews_model: null, area_pct: a.areaPct, note: a.note ?? null,
    })),
  ];

  /* junctions */

  const crop_plan_activity = CROP_PLANS.flatMap((p) =>
    ARCHETYPE_ACTIVITIES[p.archetype].map((a) => ({ tenant_id: t, crop_plan_key: p.key, activity_key: a })),
  );

  const activity_stage_anchor = Object.values(STAGE_ANCHORS).flatMap((anchors) =>
    anchors.map((a) => ({ tenant_id: t, activity_key: a.activity, stage_key: a.stage })),
  );

  const activity_resource = Object.entries(ACTIVITY_RESOURCES).flatMap(([activity, resources]) =>
    resources.map((r) => ({ tenant_id: t, activity_key: activity, resource_key: r })),
  );

  const activity_attribute = Object.entries(ACTIVITY_ATTRIBUTES).flatMap(([activity, attrs]) =>
    attrs.map((a) => ({ tenant_id: t, activity_key: activity, attribute_key: a })),
  );

  const activity_form = Object.entries(ACTIVITY_FORMS).map(([activity, form]) => ({
    tenant_id: t, activity_key: activity, form_key: form,
  }));

  const crop_grade = HARVEST_GRADES.map((g) => ({ tenant_id: t, crop_key: g.crop, grade_key: g.key }));

  const variety_grade = GRADE_USAGE.map((g) => ({
    tenant_id: t, owner_kind: g.fromKind, owner_key: g.from, grade_kind: g.toKind, grade_key: g.to,
  }));

  const variety_disease = SUSCEPTIBILITY.map((s) => ({
    tenant_id: t, variety_key: s.variety, disease_key: s.disease, incidence_pct: s.incidence,
  }));

  const disease_stage = CRITICAL_STAGES.map((c) => ({
    tenant_id: t, disease_key: c.disease, stage_key: c.stage,
  }));

  const risk_mitigation = [
    ...DISEASE_MITIGATIONS.map((m) => ({ tenant_id: t, risk_kind: 'disease', risk_key: m.disease, activity_key: m.activity })),
    ...ALERT_MITIGATIONS.map((m) => ({ tenant_id: t, risk_kind: 'alert', risk_key: m.alert, activity_key: m.activity })),
  ];

  const crop_alert = ALERT_OBSERVATIONS.map((o) => ({
    tenant_id: t, crop_key: o.crop, alert_key: o.alert, plots: o.plots,
  }));

  /* aggregates */

  const agg_variety_plot_count = VARIETIES.map((v) => ({
    tenant_id: t, variety_key: v.key, plots: v.plots, growers: v.growers, projects: v.projects,
    expected: v.expected, achieved: v.achieved,
  }));

  const agg_variety_region = VARIETIES.flatMap((v) =>
    allocate(v.plots, v.regions).map((a) => ({ tenant_id: t, variety_key: v.key, region_key: a.key, plots: a.value })),
  );
  const agg_variety_season = VARIETIES.flatMap((v) =>
    allocate(v.plots, v.seasons).map((a) => ({ tenant_id: t, variety_key: v.key, season_key: a.key, plots: a.value })),
  );
  const agg_variety_soil = VARIETIES.flatMap((v) =>
    allocate(v.plots, v.soils).map((a) => ({ tenant_id: t, variety_key: v.key, soil_key: a.key, plots: a.value })),
  );
  const agg_variety_irrigation = VARIETIES.flatMap((v) =>
    allocate(v.plots, v.irrigation).map((a) => ({ tenant_id: t, variety_key: v.key, irrigation_key: a.key, plots: a.value })),
  );

  const agg_sub_variety_plots = SUB_VARIETIES.map((s) => ({
    tenant_id: t, sub_variety_key: s.key, plots: s.plots, growers: s.growers,
  }));

  const agg_crop_plan_plots = CROP_PLANS.map((p) => ({
    tenant_id: t, crop_plan_key: p.key, plots: p.plots, projects: p.projects,
  }));

  const agg_sowing_window_plots = SOWING_WINDOWS.map((w) => ({
    tenant_id: t, window_key: w.key, plots: w.plots,
  }));

  const agg_stage_observation = STAGE_OBSERVATIONS.map((o) => ({
    tenant_id: t, key: o.key, crop_key: o.crop, stage_key: o.stage, region_key: o.region,
    season_key: o.season, configured_days: o.configuredDays, observed_days: o.observedDays,
    plots: o.plots, note: o.note ?? null,
  }));

  const agg_season_outcome = SEASON_OUTCOMES.map((o) => ({
    tenant_id: t, key: o.key, name: o.label, crop_key: o.crop, variety_key: o.variety,
    region_key: o.region, season_key: o.season, rainfall: o.rainfall, mean_tmax: o.meanTmax,
    heat_events: o.heatEvents, expected: o.expected, achieved: o.achieved, grade_outcome: o.grade,
    plots: o.plots, note: o.note ?? null,
  }));

  const agg_dews_history = DEWS_HISTORY.map((d) => ({
    tenant_id: t, key: d.key, name: d.label, disease_key: d.disease, region_key: d.region,
    season_key: d.season, warnings: d.warnings, critical: d.critical, followed: d.followed,
    hit_rate: d.hitRate, lead_days: d.leadDays, threshold: d.threshold, note: d.note ?? null,
  }));

  return [
    { table: 'crop_master', rows: crop_master },
    { table: 'variety_master', rows: variety_master },
    { table: 'variety_parameters', rows: variety_parameters },
    { table: 'sub_variety_master', rows: sub_variety_master },
    { table: 'crop_growth_stages', rows: crop_growth_stages },
    { table: 'crop_target_dates', rows: crop_target_dates },
    { table: 'seed_grades', rows: seed_grades },
    { table: 'harvest_grades', rows: harvest_grades },
    { table: 'places_master', rows: places_master },
    { table: 'season_master', rows: season_master },
    { table: 'soil_type_master', rows: soil_type_master },
    { table: 'irrigation_type_master', rows: irrigation_type_master },
    { table: 'plan_type_master', rows: plan_type_master },
    { table: 'crop_plan', rows: crop_plan },
    { table: 'plan_activity', rows: plan_activity },
    { table: 'plan_attributes', rows: plan_attributes },
    { table: 'resource_master', rows: resource_master },
    { table: 'form_master', rows: form_master },
    { table: 'alert_master', rows: alert_master },
    { table: 'crop_plan_activity', rows: crop_plan_activity },
    { table: 'activity_stage_anchor', rows: activity_stage_anchor },
    { table: 'activity_resource', rows: activity_resource },
    { table: 'activity_attribute', rows: activity_attribute },
    { table: 'activity_form', rows: activity_form },
    { table: 'crop_grade', rows: crop_grade },
    { table: 'variety_grade', rows: variety_grade },
    { table: 'variety_disease', rows: variety_disease },
    { table: 'disease_stage', rows: disease_stage },
    { table: 'risk_mitigation', rows: risk_mitigation },
    { table: 'crop_alert', rows: crop_alert },
    { table: 'agg_variety_plot_count', rows: agg_variety_plot_count },
    { table: 'agg_variety_region', rows: agg_variety_region },
    { table: 'agg_variety_season', rows: agg_variety_season },
    { table: 'agg_variety_soil', rows: agg_variety_soil },
    { table: 'agg_variety_irrigation', rows: agg_variety_irrigation },
    { table: 'agg_sub_variety_plots', rows: agg_sub_variety_plots },
    { table: 'agg_crop_plan_plots', rows: agg_crop_plan_plots },
    { table: 'agg_sowing_window_plots', rows: agg_sowing_window_plots },
    { table: 'agg_stage_observation', rows: agg_stage_observation },
    { table: 'agg_season_outcome', rows: agg_season_outcome },
    { table: 'agg_dews_history', rows: agg_dews_history },
  ];
}
