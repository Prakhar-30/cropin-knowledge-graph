/**
 * The synthetic source.
 *
 * Turns the catalog into records and links. This is the reference dataset the parity invariant regresses
 * against: 23 concepts, 338 records, 1,149 links. It exists so the pipeline can be exercised end to end
 * without a database, and so a change to derivation or emission shows up as a diff against a known good
 * document.
 *
 * Only the numbers marked primary in derivations.yaml are read from the catalog. Every split of a variety
 * plot count is allocated here to an exact sum, and every other weight is computed from those.
 */
import type { GraphRecord, Link, SourceBundle } from '../../core/model.js';
import { conceptId, recordId } from '../../core/ids.js';
import type { Source, SourceOptions } from '../base.js';
import { allocate, pctOf } from './allocate.js';
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
} from './catalog-core.js';
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
} from './catalog-plans.js';
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
} from './catalog-risk.js';

const SNAPSHOT = '2026-09-07';

const fmtNum = (n: number) => n.toLocaleString('en-IN');

export class SyntheticSource implements Source {
  readonly name = 'synthetic';

  async load({ tenantId, snapshot }: SourceOptions): Promise<SourceBundle> {
    const t = tenantId;
    const records: GraphRecord[] = [];
    const links: Link[] = [];

    const rec = (
      concept: string,
      key: string,
      label: string,
      attrs: Record<string, string>,
      usage: Record<string, number> = {},
      note?: string,
    ) => {
      records.push({
        id: recordId(concept, key),
        concept: conceptId(concept),
        label,
        attrs,
        usage,
        ...(note ? { note } : {}),
        tenant_id: t,
      });
    };

    const link = (from: string, to: string, rel: string, plots?: number, note?: string) => {
      links.push({ from, to, rel, ...(plots === undefined ? {} : { plots }), ...(note ? { note } : {}), tenant_id: t });
    };

    /* ------------------------------------------------- derived aggregates */

    const varietyByKey = new Map(VARIETIES.map((v) => [v.key, v]));
    const cropPlots = new Map<string, number>();
    for (const v of VARIETIES) cropPlots.set(v.crop, (cropPlots.get(v.crop) ?? 0) + v.plots);

    /** susceptible weight per (variety, disease), and the crop level roll up of it. */
    const susceptibleWeight = new Map<string, number>();
    const diseasePlots = new Map<string, number>();
    for (const s of SUSCEPTIBILITY) {
      const v = varietyByKey.get(s.variety);
      if (!v) throw new Error(`susceptibility references unknown variety ${s.variety}`);
      const w = pctOf(v.plots, s.incidence);
      susceptibleWeight.set(`${s.variety}|${s.disease}`, w);
      diseasePlots.set(s.disease, (diseasePlots.get(s.disease) ?? 0) + w);
    }

    const alertPlots = new Map<string, number>();
    for (const a of ALERT_OBSERVATIONS) alertPlots.set(a.alert, (alertPlots.get(a.alert) ?? 0) + a.plots);

    /** Plots behind each activity: the crop plans that include it, summed. Plans do not share plots. */
    const activityPlots = new Map<string, number>();
    const activityPlanCount = new Map<string, number>();
    for (const plan of CROP_PLANS) {
      for (const a of ARCHETYPE_ACTIVITIES[plan.archetype]) {
        activityPlots.set(a, (activityPlots.get(a) ?? 0) + plan.plots);
        activityPlanCount.set(a, (activityPlanCount.get(a) ?? 0) + 1);
      }
    }

    /** Plots behind an (activity, crop) pairing, used for the stage anchor weight. */
    const activityCropPlots = new Map<string, number>();
    for (const plan of CROP_PLANS) {
      const crop = varietyByKey.get(plan.variety)!.crop;
      for (const a of ARCHETYPE_ACTIVITIES[plan.archetype]) {
        const k = `${a}|${crop}`;
        activityCropPlots.set(k, (activityCropPlots.get(k) ?? 0) + plan.plots);
      }
    }

    /* --------------------------------------------------------- context */

    for (const r of REGIONS) {
      rec('region', r.key, r.label, {
        Type: r.type,
        'Administrative level': r.level,
        'Agro climatic zone': r.zone,
        'Districts covered': r.districts,
      }, {}, r.note);
    }
    for (const s of SEASONS) {
      rec('season', s.key, s.label, { Months: s.months, Window: s.window, Type: s.type }, {}, s.note);
    }
    for (const s of SOILS) {
      rec('soil_type', s.key, s.label, {
        Texture: s.texture,
        'Water holding capacity': s.whc,
        'pH range': s.ph,
        Notes: s.notes,
      });
    }
    for (const i of IRRIGATIONS) {
      rec('irrigation_type', i.key, i.label, {
        Method: i.method,
        'Application efficiency': i.efficiency,
        'Effective capacity per day': i.capacity,
        'Suited to': i.suited,
      });
    }

    /* ------------------------------------------------------ hierarchy */

    for (const c of CROPS) {
      rec('crop', c.key, c.label, {
        'Crop code': c.code,
        Category: c.category,
        'Default yield unit': c.unit,
        'Price unit quantity': c.priceUnit,
        'Calibration state': c.calibration,
      }, {}, c.note);
    }

    for (const v of VARIETIES) {
      rec('variety', v.key, v.label, {
        'Variety code': v.code,
        'Seed source': v.seedSource,
        'Maturity class': v.maturity,
        'Calibration state': v.calibration,
        'Seasons of history': `${v.seasonsOfHistory}`,
      }, {
        plots: v.plots,
        growers: v.growers,
        projects: v.projects,
        expected: v.expected,
        achieved: v.achieved,
      }, v.note);

      rec('crop_parameters', v.key, `${v.label} parameters`, {
        'Expected yield': `${v.expected.toFixed(1)} t/ha`,
        'Maximum attainable yield': `${v.maxAttainable.toFixed(1)} t/ha`,
        'Harvest duration': `${v.harvestDuration} days`,
        'Estimated days to harvest': `${v.estDaysToHarvest} days`,
        'Base temperature': `${v.baseTemp.toFixed(1)} C`,
        'Standard deduction': `${v.deduction.toFixed(1)} percent`,
        'Price unit quantity': CROPS.find((c) => c.key === v.crop)!.priceUnit,
      });

      link(recordId('variety', v.key), recordId('crop', v.crop), 'variety of', v.plots);
      link(recordId('variety', v.key), recordId('crop_parameters', v.key), 'has parameters', v.plots);

      for (const { key, value } of allocate(v.plots, v.regions)) {
        link(recordId('variety', v.key), recordId('region', key), 'grown in region', value);
      }
      for (const { key, value } of allocate(v.plots, v.seasons)) {
        link(recordId('variety', v.key), recordId('season', key), 'grown in season', value);
      }
      for (const { key, value } of allocate(v.plots, v.soils)) {
        link(recordId('variety', v.key), recordId('soil_type', key), 'grown on soil', value);
      }
      for (const { key, value } of allocate(v.plots, v.irrigation)) {
        link(recordId('variety', v.key), recordId('irrigation_type', key), 'irrigated by', value);
      }
    }

    for (const s of SUB_VARIETIES) {
      rec('sub_variety', s.key, s.label, {
        'Sub variety code': s.code,
        Purpose: s.purpose,
        'Grade expectation': s.gradeExpectation,
        'Lot handling': s.lotHandling,
      }, { plots: s.plots, growers: s.growers }, s.note);
      link(recordId('sub_variety', s.key), recordId('variety', s.variety), 'sub variety of', s.plots);
    }

    /* ---------------------------------------------------- crop config */

    for (const s of STAGES) {
      rec('growth_stage', s.key, s.label, {
        Crop: CROPS.find((c) => c.key === s.crop)!.label,
        'Stage order': `${s.order}`,
        'Configured duration': `${s.days} days`,
        'Cumulative days from sowing': `${s.cumulative} days`,
        'Growing degree days': `${fmtNum(s.gdd)} GDD`,
        'Critical stage': s.critical ? 'Yes' : 'No',
      }, {}, s.note);
      link(recordId('crop', s.crop), recordId('growth_stage', s.key), 'has growth stage', cropPlots.get(s.crop) ?? 0);
    }

    for (const w of SOWING_WINDOWS) {
      rec('sowing_window', w.key, `${CROPS.find((c) => c.key === w.crop)!.label} in ${REGIONS.find((r) => r.key === w.region)!.label}, ${SEASONS.find((s) => s.key === w.season)!.label}`, {
        Crop: CROPS.find((c) => c.key === w.crop)!.label,
        Region: REGIONS.find((r) => r.key === w.region)!.label,
        Season: SEASONS.find((s) => s.key === w.season)!.label,
        'Ideal window': w.ideal,
        'Outer window': w.outer,
        'Cost of breach': w.cost,
      }, { plots: w.plots });
      link(recordId('sowing_window', w.key), recordId('crop', w.crop), 'sowing window for');
      link(recordId('sowing_window', w.key), recordId('region', w.region), 'window in region');
      link(recordId('sowing_window', w.key), recordId('season', w.season), 'window in season');
    }

    for (const g of SEED_GRADES) {
      rec('seed_grade', g.key, g.label, {
        Class: g.class,
        'Genetic purity': g.purity,
        Certification: g.certification,
        'Used at': g.usedAt,
      });
    }
    for (const g of HARVEST_GRADES) {
      rec('harvest_grade', g.key, g.label, {
        Crop: CROPS.find((c) => c.key === g.crop)!.label,
        Specification: g.spec,
        'Acceptance threshold': g.threshold,
        'Contract type': g.contract,
      }, {}, g.note);
      // Crop level: the grade is available for the crop. No weight - availability is not usage.
      link(recordId('crop', g.crop), recordId('harvest_grade', g.key), 'graded by', undefined, 'Available for the crop');
    }
    for (const g of GRADE_USAGE) {
      const plots = g.fromKind === 'variety'
        ? varietyByKey.get(g.from)!.plots
        : SUB_VARIETIES.find((s) => s.key === g.from)!.plots;
      link(recordId(g.fromKind, g.from), recordId(g.toKind, g.to), 'graded by', plots);
    }

    /* ----------------------------------------------------------- plans */

    for (const p of PLAN_TYPES) {
      rec('plan_type', p.key, p.label, {
        Crop: CROPS.find((c) => c.key === p.crop)!.label,
        Sections: p.sections,
        'Attribute kinds': p.attrKinds,
        Status: p.status,
      }, {}, p.note);
      link(recordId('plan_type', p.key), recordId('crop', p.crop), 'plan type for');
    }

    for (const plan of CROP_PLANS) {
      const activities = ARCHETYPE_ACTIVITIES[plan.archetype];
      rec('crop_plan', plan.key, plan.label, {
        'Plan type': PLAN_TYPES.find((p) => p.key === plan.planType)!.label,
        Variety: varietyByKey.get(plan.variety)!.label,
        Season: SEASONS.find((s) => s.key === plan.season)!.label,
        Activities: `${activities.length} activities`,
        Status: plan.status,
        'Cost per acre': `INR ${fmtNum(plan.costPerAcre)}`,
      }, { plots: plan.plots, projects: plan.projects }, plan.note);

      link(recordId('crop_plan', plan.key), recordId('plan_type', plan.planType), 'built from', plan.plots);
      link(recordId('crop_plan', plan.key), recordId('variety', plan.variety), 'plan for variety', plan.plots);
      link(recordId('crop_plan', plan.key), recordId('season', plan.season), 'plan for season', plan.plots);
      for (const a of activities) {
        link(recordId('crop_plan', plan.key), recordId('plan_activity', a), 'includes activity', plan.plots);
      }
    }

    for (const a of ACTIVITIES) {
      const reuse = activityPlanCount.get(a.key) ?? 0;
      rec('plan_activity', a.key, a.label, {
        'Activity type': a.type,
        Scheduling: a.scheduling,
        'Offset rule': a.offset,
        Duration: a.duration,
        Approval: a.approval,
      }, {}, a.note ?? (reuse === 0 ? 'Configured but attached to no crop plan.' : undefined));
    }

    for (const [crop, anchors] of Object.entries(STAGE_ANCHORS)) {
      for (const anchor of anchors) {
        const w = activityCropPlots.get(`${anchor.activity}|${crop}`);
        link(recordId('plan_activity', anchor.activity), recordId('growth_stage', anchor.stage), 'scheduled at', w);
      }
    }

    for (const r of RESOURCES) {
      rec('resource_or_input', r.key, r.label, {
        Category: r.category,
        Unit: r.unit,
        'Indicative cost': r.cost,
        Owner: r.owner,
      });
    }
    for (const [activity, resources] of Object.entries(ACTIVITY_RESOURCES)) {
      for (const res of resources) {
        link(recordId('plan_activity', activity), recordId('resource_or_input', res), 'requires resource', activityPlots.get(activity) ?? 0);
      }
    }

    for (const a of ATTRIBUTES) {
      rec('plan_attribute', a.key, a.label, {
        Kind: a.kind,
        'Data type': a.dataType,
        Unit: a.unit,
        Required: a.required,
      });
    }
    for (const [activity, attrs] of Object.entries(ACTIVITY_ATTRIBUTES)) {
      for (const attr of attrs) {
        link(recordId('plan_activity', activity), recordId('plan_attribute', attr), 'captures', activityPlots.get(activity) ?? 0);
      }
    }

    for (const f of FORMS) {
      rec('form', f.key, f.label, {
        'Form type': f.type,
        Version: f.version,
        Fields: f.fields,
        Consent: f.consent,
      }, {}, f.note);
    }
    for (const [activity, form] of Object.entries(ACTIVITY_FORMS)) {
      link(recordId('plan_activity', activity), recordId('form', form), 'recorded on form', activityPlots.get(activity) ?? 0);
    }

    /* ------------------------------------------------------------ risk */

    for (const d of DISEASES) {
      rec('disease_or_pest', d.key, d.label, {
        Type: d.type,
        Crop: CROPS.find((c) => c.key === d.crop)!.label,
        'Favourable conditions': d.conditions,
        Symptoms: d.symptoms,
        Mitigation: d.mitigation,
        'DEWS model': d.model,
      }, {}, d.note);
      link(recordId('crop', d.crop), recordId('disease_or_pest', d.key), 'prone to', diseasePlots.get(d.key) ?? 0);
    }
    for (const s of SUSCEPTIBILITY) {
      link(
        recordId('variety', s.variety),
        recordId('disease_or_pest', s.disease),
        'susceptible',
        susceptibleWeight.get(`${s.variety}|${s.disease}`),
        `Recorded on ${s.incidence} percent of this variety's plots`,
      );
    }
    for (const c of CRITICAL_STAGES) {
      link(recordId('disease_or_pest', c.disease), recordId('growth_stage', c.stage), 'critical at', diseasePlots.get(c.disease) ?? 0);
    }
    for (const m of DISEASE_MITIGATIONS) {
      link(recordId('disease_or_pest', m.disease), recordId('plan_activity', m.activity), 'mitigated by', diseasePlots.get(m.disease) ?? 0);
    }

    for (const a of ALERTS) {
      rec('alert_type', a.key, a.label, {
        Class: a.class,
        Trigger: a.trigger,
        Advisory: a.advisory,
        'Mean area impacted': `${a.areaPct.toFixed(1)} percent`,
      }, { area_pct: a.areaPct }, a.note);
    }
    for (const o of ALERT_OBSERVATIONS) {
      link(recordId('crop', o.crop), recordId('alert_type', o.alert), 'alert observed', o.plots);
    }
    for (const m of ALERT_MITIGATIONS) {
      link(recordId('alert_type', m.alert), recordId('plan_activity', m.activity), 'mitigated by', alertPlots.get(m.alert) ?? 0);
    }

    /* -------------------------------------------------------- observed */

    for (const o of STAGE_OBSERVATIONS) {
      const stage = STAGES.find((s) => s.key === o.stage)!;
      const region = REGIONS.find((r) => r.key === o.region)!;
      const deviation = ((o.observedDays - o.configuredDays) / o.configuredDays) * 100;
      rec('stage_observation', o.key, `${stage.label} in ${region.label}`, {
        Crop: CROPS.find((c) => c.key === o.crop)!.label,
        Stage: stage.label,
        Region: region.label,
        Season: SEASONS.find((s) => s.key === o.season)!.label,
        'Configured duration': `${o.configuredDays} days`,
        'Observed duration': `${o.observedDays} days`,
        Deviation: `${deviation > 0 ? '+' : ''}${deviation.toFixed(1)} percent`,
        'Plots behind it': `${fmtNum(o.plots)} plots`,
      }, { plots: o.plots, configured_days: o.configuredDays, observed_days: o.observedDays }, o.note);
      link(recordId('stage_observation', o.key), recordId('growth_stage', o.stage), 'stage observed');
      link(recordId('stage_observation', o.key), recordId('crop', o.crop), 'observed for crop');
      link(recordId('stage_observation', o.key), recordId('region', o.region), 'observed in region');
    }

    for (const o of SEASON_OUTCOMES) {
      const gap = ((o.achieved - o.expected) / o.expected) * 100;
      const unit = CROPS.find((c) => c.key === o.crop)!.unit;
      rec('season_weather_outcome', o.key, o.label, {
        Crop: CROPS.find((c) => c.key === o.crop)!.label,
        Variety: varietyByKey.get(o.variety)!.label,
        Region: REGIONS.find((r) => r.key === o.region)!.label,
        Season: SEASONS.find((s) => s.key === o.season)!.label,
        Rainfall: o.rainfall,
        'Mean Tmax': o.meanTmax,
        'Heat events': o.heatEvents,
        'Expected yield': `${o.expected.toFixed(1)} ${unit}`,
        'Achieved yield': `${o.achieved.toFixed(1)} ${unit}`,
        Gap: `${gap > 0 ? '+' : ''}${gap.toFixed(1)} percent`,
        'Grade outcome': o.grade,
      }, { plots: o.plots, expected: o.expected, achieved: o.achieved }, o.note);
      link(recordId('season_weather_outcome', o.key), recordId('variety', o.variety), 'outcome for');
      link(recordId('season_weather_outcome', o.key), recordId('crop', o.crop), 'season record for');
      link(recordId('season_weather_outcome', o.key), recordId('region', o.region), 'observed in region');
      link(recordId('season_weather_outcome', o.key), recordId('season', o.season), 'observed in season');
    }

    for (const d of DEWS_HISTORY) {
      rec('dews_history', d.key, d.label, {
        Disease: DISEASES.find((x) => x.key === d.disease)!.label,
        Region: REGIONS.find((r) => r.key === d.region)!.label,
        Season: SEASONS.find((s) => s.key === d.season)!.label,
        'Warnings fired': `${d.warnings}`,
        'Critical warnings': `${d.critical}`,
        'Followed by disease': `${d.followed}`,
        'Hit rate': `${d.hitRate.toFixed(1)} percent`,
        'Mean lead time': `${d.leadDays.toFixed(1)} days`,
        'Critical threshold': `${d.threshold} percent probability`,
      }, { warnings: d.warnings, hit_rate: d.hitRate, lead_days: d.leadDays }, d.note);
      link(recordId('dews_history', d.key), recordId('disease_or_pest', d.disease), 'warnings for');
      link(recordId('dews_history', d.key), recordId('region', d.region), 'observed in region');
      link(recordId('dews_history', d.key), recordId('season', d.season), 'observed in season');
    }

    return {
      tenant_id: t,
      source_snapshot: snapshot ?? SNAPSHOT,
      source_name: this.name,
      records,
      links,
      metrics_not_computed: [],
    };
  }
}
