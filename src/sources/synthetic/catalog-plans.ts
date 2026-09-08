/**
 * The synthetic tenant: plan types, crop plans, activities, and what those activities consume, capture
 * and record on.
 *
 * Crop plan plot counts are primary. Every activity, resource, attribute and form total is summed from
 * the links, so the reuse figure on an activity is arithmetic rather than opinion.
 */

export interface PlanTypeRow {
  key: string;
  crop: string;
  label: string;
  sections: string;
  attrKinds: string;
  status: string;
  note?: string;
}

export const PLAN_TYPES: PlanTypeRow[] = [
  { key: 'pot_seed_production_pop', crop: 'potato', label: 'Potato Seed Production POP', sections: 'Land preparation, planting, crop care, roguing, dehaulming, harvest', attrKinds: 'Standard, Custom, Table', status: 'Active' },
  { key: 'pot_processing_contract_pop', crop: 'potato', label: 'Potato Processing Contract POP', sections: 'Land preparation, planting, nutrition, protection, pre-harvest sampling, harvest', attrKinds: 'Standard, Custom, Table', status: 'Active', note: 'Carries the dry matter sampling step that the table POP does not.' },
  { key: 'pot_table_market_pop', crop: 'potato', label: 'Potato Table Market POP', sections: 'Land preparation, planting, crop care, harvest', attrKinds: 'Standard, Table', status: 'Active' },
  { key: 'wht_irrigated_pop', crop: 'wheat', label: 'Wheat Irrigated POP', sections: 'Sowing, nutrition, irrigation, protection, harvest', attrKinds: 'Standard, Table', status: 'Active' },
  { key: 'wht_late_sown_pop', crop: 'wheat', label: 'Wheat Late Sown POP', sections: 'Sowing, nutrition, irrigation, harvest', attrKinds: 'Standard', status: 'Active', note: 'Built for the post-paddy window. Drops protection steps that do not pay back in a short season.' },
  { key: 'pdy_transplanted_pop', crop: 'paddy', label: 'Paddy Transplanted POP', sections: 'Nursery, transplanting, nutrition, water, protection, harvest', attrKinds: 'Standard, Custom, Table', status: 'Active' },
  { key: 'pdy_dsr_pop', crop: 'paddy', label: 'Paddy Direct Seeded POP', sections: 'Sowing, weed management, nutrition, water, harvest', attrKinds: 'Standard, Custom', status: 'Active' },
  { key: 'tom_open_field_pop', crop: 'tomato', label: 'Tomato Open Field POP', sections: 'Nursery, transplanting, fertigation, protection, harvest', attrKinds: 'Standard, Custom, Table', status: 'Active' },
  { key: 'tom_polyhouse_pop', crop: 'tomato', label: 'Tomato Polyhouse POP', sections: 'Nursery, transplanting, fertigation, protection, harvest, grading', attrKinds: 'Standard, Custom, Table', status: 'Active' },
  { key: 'chl_rainfed_pop', crop: 'chilli', label: 'Chilli Rainfed POP', sections: 'Nursery, transplanting, nutrition, protection, harvest, drying', attrKinds: 'Standard, Custom', status: 'Active' },
  { key: 'mze_rabi_grain_pop', crop: 'maize', label: 'Maize Grain POP', sections: 'Sowing, weed management, nutrition, harvest', attrKinds: 'Standard', status: 'Active', note: 'Ten activities against a 14-activity average. The newest plan type in the tenant and the thinnest.' },
];

export type Archetype =
  | 'potato_table'
  | 'potato_seed'
  | 'potato_processing'
  | 'wheat_irrigated'
  | 'wheat_late'
  | 'paddy_transplanted'
  | 'paddy_dsr'
  | 'tomato_open'
  | 'tomato_poly'
  | 'chilli_rainfed'
  | 'maize_grain';

export interface CropPlanRow {
  key: string;
  label: string;
  planType: string;
  variety: string;
  season: string;
  archetype: Archetype;
  status: string;
  costPerAcre: number;
  plots: number;
  projects: number;
  note?: string;
}

export const CROP_PLANS: CropPlanRow[] = [
  { key: 'cp_pukhraj_rabi_table', label: 'Pukhraj Table Rabi', planType: 'pot_table_market_pop', variety: 'kufri_pukhraj', season: 'rabi', archetype: 'potato_table', status: 'Active', costPerAcre: 42800, plots: 2210, projects: 9 },
  { key: 'cp_pukhraj_rabi_seed', label: 'Pukhraj Seed Rabi', planType: 'pot_seed_production_pop', variety: 'kufri_pukhraj', season: 'rabi', archetype: 'potato_seed', status: 'Active', costPerAcre: 51400, plots: 1272, projects: 5 },
  { key: 'cp_jyoti_rabi_seed', label: 'Jyoti Seed Rabi', planType: 'pot_seed_production_pop', variety: 'kufri_jyoti', season: 'rabi', archetype: 'potato_seed', status: 'Active', costPerAcre: 49900, plots: 1810, projects: 11 },
  { key: 'cp_chipsona_rabi_processing', label: 'Chipsona Processing Rabi', planType: 'pot_processing_contract_pop', variety: 'kufri_chipsona_1', season: 'rabi', archetype: 'potato_processing', status: 'Active', costPerAcre: 54200, plots: 1245, projects: 9 },
  { key: 'cp_rosetta_rabi_processing', label: 'Lady Rosetta Processing Rabi', planType: 'pot_processing_contract_pop', variety: 'lady_rosetta', season: 'rabi', archetype: 'potato_processing', status: 'Active', costPerAcre: 57600, plots: 964, projects: 7, note: 'Ran on the national stage set. In Gujarat bulking finished three days before the scheduled top dressing.' },
  { key: 'cp_santana_rabi_processing', label: 'Santana Processing Rabi', planType: 'pot_processing_contract_pop', variety: 'santana', season: 'rabi', archetype: 'potato_processing', status: 'Active', costPerAcre: 56100, plots: 412, projects: 4 },
  { key: 'cp_hd2967_rabi_irrigated', label: 'HD 2967 Irrigated Rabi', planType: 'wht_irrigated_pop', variety: 'hd_2967', season: 'rabi', archetype: 'wheat_irrigated', status: 'Active', costPerAcre: 21400, plots: 2960, projects: 12 },
  { key: 'cp_hd3086_rabi_irrigated', label: 'HD 3086 Irrigated Rabi', planType: 'wht_irrigated_pop', variety: 'hd_3086', season: 'rabi', archetype: 'wheat_irrigated', status: 'Active', costPerAcre: 21900, plots: 2140, projects: 10 },
  { key: 'cp_pbw725_rabi_late', label: 'PBW 725 Late Sown Rabi', planType: 'wht_late_sown_pop', variety: 'pbw_725', season: 'rabi', archetype: 'wheat_late', status: 'Active', costPerAcre: 19200, plots: 730, projects: 6 },
  { key: 'cp_pb1121_kharif_transplanted', label: 'PB 1121 Transplanted Kharif', planType: 'pdy_transplanted_pop', variety: 'pusa_basmati_1121', season: 'kharif', archetype: 'paddy_transplanted', status: 'Active', costPerAcre: 26800, plots: 2415, projects: 11 },
  { key: 'cp_pb1509_kharif_dsr', label: 'PB 1509 Direct Seeded Kharif', planType: 'pdy_dsr_pop', variety: 'pusa_basmati_1509', season: 'kharif', archetype: 'paddy_dsr', status: 'Active', costPerAcre: 23100, plots: 1680, projects: 9 },
  { key: 'cp_swarna_kharif_transplanted', label: 'Swarna Transplanted Kharif', planType: 'pdy_transplanted_pop', variety: 'swarna', season: 'kharif', archetype: 'paddy_transplanted', status: 'Active', costPerAcre: 25400, plots: 1120, projects: 7 },
  { key: 'cp_abhinav_zaid_open', label: 'Abhinav Open Field Zaid', planType: 'tom_open_field_pop', variety: 'abhinav', season: 'zaid', archetype: 'tomato_open', status: 'Active', costPerAcre: 88500, plots: 880, projects: 6 },
  { key: 'cp_namdhari_kharif_poly', label: 'Namdhari 585 Polyhouse', planType: 'tom_polyhouse_pop', variety: 'namdhari_585', season: 'kharif', archetype: 'tomato_poly', status: 'Active', costPerAcre: 142000, plots: 640, projects: 5 },
  { key: 'cp_byadgi_kharif_rainfed', label: 'Byadgi Rainfed Kharif', planType: 'chl_rainfed_pop', variety: 'byadgi_dabbi', season: 'kharif', archetype: 'chilli_rainfed', status: 'Active', costPerAcre: 46700, plots: 1290, projects: 8 },
  { key: 'cp_pioneer_kharif_grain', label: 'Pioneer 3396 Grain Kharif', planType: 'mze_rabi_grain_pop', variety: 'pioneer_3396', season: 'kharif', archetype: 'maize_grain', status: 'Active', costPerAcre: 24300, plots: 720, projects: 5 },
];

export interface ActivityRow {
  key: string;
  label: string;
  type: string;
  scheduling: string;
  offset: string;
  duration: string;
  approval: string;
  note?: string;
}

export const ACTIVITIES: ActivityRow[] = [
  { key: 'land_preparation', label: 'Land Preparation', type: 'Tillage', scheduling: 'Scheduled', offset: '14 days before sowing', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'soil_health_test', label: 'Soil Health Test', type: 'Assessment', scheduling: 'Scheduled', offset: '21 days before sowing', duration: '1 day', approval: 'No approval' },
  { key: 'seed_treatment', label: 'Seed Treatment', type: 'Input application', scheduling: 'Scheduled', offset: '1 day before sowing', duration: '1 day', approval: 'No approval' },
  { key: 'sowing', label: 'Sowing or Planting', type: 'Establishment', scheduling: 'Scheduled', offset: 'Day 0, stage anchored', duration: '1 to 3 days', approval: 'Supervisor approval' },
  { key: 'transplanting', label: 'Transplanting', type: 'Establishment', scheduling: 'Scheduled', offset: 'At transplanting stage', duration: '1 to 2 days', approval: 'Supervisor approval' },
  { key: 'basal_fertiliser', label: 'Basal Fertiliser', type: 'Input application', scheduling: 'Scheduled', offset: 'At sowing', duration: '1 day', approval: 'No approval' },
  { key: 'first_irrigation', label: 'First Irrigation', type: 'Water management', scheduling: 'Scheduled', offset: '5 days after sowing', duration: '1 day', approval: 'No approval' },
  { key: 'gap_filling', label: 'Gap Filling', type: 'Establishment', scheduling: 'Conditional', offset: '10 days after establishment, if germination below 85 percent', duration: '1 day', approval: 'No approval' },
  { key: 'weeding_manual', label: 'Manual Weeding', type: 'Crop care', scheduling: 'Recurring', offset: 'Every 21 days from establishment', duration: '1 to 2 days', approval: 'No approval' },
  { key: 'herbicide_application', label: 'Herbicide Application', type: 'Protection', scheduling: 'Scheduled', offset: 'At early vegetative stage', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'top_dressing_nitrogen', label: 'Nitrogen Top Dressing', type: 'Input application', scheduling: 'Scheduled', offset: 'At tillering or vegetative stage', duration: '1 day', approval: 'No approval' },
  { key: 'earthing_up', label: 'Earthing Up', type: 'Crop care', scheduling: 'Scheduled', offset: 'At tuber initiation', duration: '1 day', approval: 'No approval' },
  { key: 'micronutrient_spray', label: 'Micronutrient Spray', type: 'Input application', scheduling: 'Scheduled', offset: 'At flowering or tuber initiation', duration: '1 day', approval: 'No approval' },
  { key: 'fungicide_preventive_spray', label: 'Preventive Fungicide Spray', type: 'Protection', scheduling: 'Conditional', offset: 'On DEWS probability above threshold', duration: '1 day', approval: 'Supervisor approval', note: 'The activity DEWS is supposed to trigger. Useful only where lead time exceeds the time it takes to get a sprayer to the plot.' },
  { key: 'fungicide_curative_spray', label: 'Curative Fungicide Spray', type: 'Protection', scheduling: 'Unscheduled', offset: 'On alert raised', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'insecticide_spray', label: 'Insecticide Spray', type: 'Protection', scheduling: 'Conditional', offset: 'On pest incidence above 5 percent', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'pheromone_trap_install', label: 'Pheromone Trap Installation', type: 'Protection', scheduling: 'Scheduled', offset: 'At vegetative stage, 8 traps per acre', duration: '1 day', approval: 'No approval' },
  { key: 'scouting_visit', label: 'Scouting Visit', type: 'Assessment', scheduling: 'Recurring', offset: 'Every 7 days through the critical stages', duration: 'Half day', approval: 'No approval' },
  { key: 'irrigation_scheduled', label: 'Scheduled Irrigation', type: 'Water management', scheduling: 'Recurring', offset: 'On irrigation advisory, within the 7 day window', duration: '1 day', approval: 'No approval' },
  { key: 'drip_fertigation', label: 'Drip Fertigation', type: 'Input application', scheduling: 'Recurring', offset: 'Every 4 days from establishment', duration: 'Half day', approval: 'No approval' },
  { key: 'haulm_cutting', label: 'Haulm Cutting', type: 'Crop care', scheduling: 'Scheduled', offset: 'At maturation, 12 days before harvest', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'dehaulming_check', label: 'Dehaulming Check', type: 'Assessment', scheduling: 'Scheduled', offset: '2 days after haulm cutting', duration: 'Half day', approval: 'Supervisor approval' },
  { key: 'pre_harvest_sampling', label: 'Pre Harvest Sampling', type: 'Assessment', scheduling: 'Scheduled', offset: '7 days before harvest', duration: 'Half day', approval: 'Supervisor approval', note: 'Where dry matter is measured. Absent from the table POP, which is why grade failures surface only at the gate on table lots.' },
  { key: 'harvest_operation', label: 'Harvest Operation', type: 'Harvest', scheduling: 'Scheduled', offset: 'At harvest stage', duration: '2 to 5 days', approval: 'Supervisor approval' },
  { key: 'grading_and_sorting', label: 'Grading and Sorting', type: 'Post harvest', scheduling: 'Scheduled', offset: 'Immediately after harvest', duration: '1 to 3 days', approval: 'Supervisor approval' },
  { key: 'post_harvest_storage', label: 'Post Harvest Storage', type: 'Post harvest', scheduling: 'Scheduled', offset: 'Within 3 days of grading', duration: '1 day', approval: 'Supervisor approval' },
  { key: 'yield_recording', label: 'Yield Recording', type: 'Assessment', scheduling: 'Scheduled', offset: 'At harvest close', duration: 'Half day', approval: 'Supervisor approval' },
  { key: 'plot_boundary_audit', label: 'Plot Boundary Audit', type: 'Assessment', scheduling: 'Scheduled', offset: 'Before the project opens', duration: 'Half day', approval: 'Supervisor approval', note: 'Configured but attached to no crop plan. Boundary audits are being run outside the plan, so they do not appear in task completion.' },
  { key: 'farmer_training_session', label: 'Farmer Training Session', type: 'Engagement', scheduling: 'Unscheduled', offset: 'Before the season starts', duration: '1 day', approval: 'No approval' },
];

/** Activity list per plan archetype. A crop plan includes exactly this set. */
export const ARCHETYPE_ACTIVITIES: Record<Archetype, string[]> = {
  potato_table: ['land_preparation', 'seed_treatment', 'sowing', 'basal_fertiliser', 'first_irrigation', 'gap_filling', 'weeding_manual', 'top_dressing_nitrogen', 'earthing_up', 'fungicide_preventive_spray', 'insecticide_spray', 'irrigation_scheduled', 'haulm_cutting', 'harvest_operation'],
  potato_seed: ['land_preparation', 'soil_health_test', 'seed_treatment', 'sowing', 'basal_fertiliser', 'first_irrigation', 'gap_filling', 'weeding_manual', 'top_dressing_nitrogen', 'earthing_up', 'fungicide_preventive_spray', 'insecticide_spray', 'scouting_visit', 'haulm_cutting', 'dehaulming_check', 'harvest_operation'],
  potato_processing: ['land_preparation', 'soil_health_test', 'seed_treatment', 'sowing', 'basal_fertiliser', 'herbicide_application', 'top_dressing_nitrogen', 'earthing_up', 'micronutrient_spray', 'fungicide_preventive_spray', 'irrigation_scheduled', 'pre_harvest_sampling', 'harvest_operation', 'grading_and_sorting'],
  wheat_irrigated: ['land_preparation', 'soil_health_test', 'seed_treatment', 'sowing', 'basal_fertiliser', 'first_irrigation', 'herbicide_application', 'top_dressing_nitrogen', 'irrigation_scheduled', 'fungicide_preventive_spray', 'scouting_visit', 'harvest_operation', 'yield_recording'],
  wheat_late: ['land_preparation', 'seed_treatment', 'sowing', 'basal_fertiliser', 'first_irrigation', 'herbicide_application', 'top_dressing_nitrogen', 'irrigation_scheduled', 'harvest_operation', 'yield_recording'],
  paddy_transplanted: ['land_preparation', 'soil_health_test', 'seed_treatment', 'sowing', 'transplanting', 'gap_filling', 'basal_fertiliser', 'first_irrigation', 'weeding_manual', 'top_dressing_nitrogen', 'irrigation_scheduled', 'fungicide_preventive_spray', 'insecticide_spray', 'scouting_visit', 'harvest_operation'],
  paddy_dsr: ['land_preparation', 'soil_health_test', 'seed_treatment', 'sowing', 'basal_fertiliser', 'herbicide_application', 'top_dressing_nitrogen', 'irrigation_scheduled', 'fungicide_preventive_spray', 'insecticide_spray', 'scouting_visit', 'harvest_operation', 'yield_recording'],
  tomato_open: ['land_preparation', 'soil_health_test', 'sowing', 'transplanting', 'gap_filling', 'basal_fertiliser', 'drip_fertigation', 'micronutrient_spray', 'fungicide_preventive_spray', 'fungicide_curative_spray', 'insecticide_spray', 'pheromone_trap_install', 'scouting_visit', 'harvest_operation'],
  tomato_poly: ['land_preparation', 'sowing', 'transplanting', 'gap_filling', 'basal_fertiliser', 'drip_fertigation', 'micronutrient_spray', 'fungicide_preventive_spray', 'insecticide_spray', 'pheromone_trap_install', 'harvest_operation', 'grading_and_sorting'],
  chilli_rainfed: ['land_preparation', 'soil_health_test', 'sowing', 'transplanting', 'gap_filling', 'basal_fertiliser', 'weeding_manual', 'top_dressing_nitrogen', 'fungicide_preventive_spray', 'insecticide_spray', 'harvest_operation', 'post_harvest_storage'],
  maize_grain: ['land_preparation', 'seed_treatment', 'sowing', 'basal_fertiliser', 'first_irrigation', 'herbicide_application', 'top_dressing_nitrogen', 'insecticide_spray', 'scouting_visit', 'harvest_operation'],
};

/**
 * Stage anchors, per crop. An activity that appears in a crop's plans without an entry here is an
 * unscheduled task in that crop, which the platform supports and which the graph should show honestly.
 */
export const STAGE_ANCHORS: Record<string, Array<{ activity: string; stage: string }>> = {
  potato: [
    { activity: 'land_preparation', stage: 'pot_planting' },
    { activity: 'soil_health_test', stage: 'pot_planting' },
    { activity: 'seed_treatment', stage: 'pot_planting' },
    { activity: 'sowing', stage: 'pot_planting' },
    { activity: 'basal_fertiliser', stage: 'pot_planting' },
    { activity: 'first_irrigation', stage: 'pot_sprouting' },
    { activity: 'gap_filling', stage: 'pot_sprouting' },
    { activity: 'weeding_manual', stage: 'pot_vegetative' },
    { activity: 'herbicide_application', stage: 'pot_vegetative' },
    { activity: 'top_dressing_nitrogen', stage: 'pot_vegetative' },
    { activity: 'earthing_up', stage: 'pot_tuber_initiation' },
    { activity: 'micronutrient_spray', stage: 'pot_tuber_initiation' },
    { activity: 'fungicide_preventive_spray', stage: 'pot_tuber_bulking' },
    { activity: 'insecticide_spray', stage: 'pot_tuber_bulking' },
    { activity: 'irrigation_scheduled', stage: 'pot_tuber_bulking' },
    { activity: 'scouting_visit', stage: 'pot_tuber_bulking' },
    { activity: 'haulm_cutting', stage: 'pot_maturation' },
    { activity: 'dehaulming_check', stage: 'pot_maturation' },
    { activity: 'pre_harvest_sampling', stage: 'pot_maturation' },
    { activity: 'harvest_operation', stage: 'pot_harvest' },
    { activity: 'grading_and_sorting', stage: 'pot_harvest' },
  ],
  wheat: [
    { activity: 'land_preparation', stage: 'wht_sowing' },
    { activity: 'soil_health_test', stage: 'wht_sowing' },
    { activity: 'seed_treatment', stage: 'wht_sowing' },
    { activity: 'sowing', stage: 'wht_sowing' },
    { activity: 'basal_fertiliser', stage: 'wht_sowing' },
    { activity: 'first_irrigation', stage: 'wht_germination' },
    { activity: 'herbicide_application', stage: 'wht_tillering' },
    { activity: 'top_dressing_nitrogen', stage: 'wht_tillering' },
    { activity: 'irrigation_scheduled', stage: 'wht_jointing' },
    { activity: 'fungicide_preventive_spray', stage: 'wht_booting' },
    { activity: 'scouting_visit', stage: 'wht_grain_filling' },
    { activity: 'harvest_operation', stage: 'wht_harvest' },
    { activity: 'yield_recording', stage: 'wht_harvest' },
  ],
  paddy: [
    { activity: 'land_preparation', stage: 'pdy_nursery' },
    { activity: 'soil_health_test', stage: 'pdy_nursery' },
    { activity: 'seed_treatment', stage: 'pdy_nursery' },
    { activity: 'sowing', stage: 'pdy_nursery' },
    { activity: 'transplanting', stage: 'pdy_transplanting' },
    { activity: 'gap_filling', stage: 'pdy_transplanting' },
    { activity: 'basal_fertiliser', stage: 'pdy_transplanting' },
    { activity: 'first_irrigation', stage: 'pdy_transplanting' },
    { activity: 'weeding_manual', stage: 'pdy_tillering' },
    { activity: 'herbicide_application', stage: 'pdy_tillering' },
    { activity: 'top_dressing_nitrogen', stage: 'pdy_tillering' },
    { activity: 'irrigation_scheduled', stage: 'pdy_panicle_initiation' },
    { activity: 'fungicide_preventive_spray', stage: 'pdy_flowering' },
    { activity: 'insecticide_spray', stage: 'pdy_flowering' },
    { activity: 'scouting_visit', stage: 'pdy_grain_filling' },
    { activity: 'harvest_operation', stage: 'pdy_harvest' },
    { activity: 'yield_recording', stage: 'pdy_harvest' },
  ],
  tomato: [
    { activity: 'land_preparation', stage: 'tom_sowing' },
    { activity: 'soil_health_test', stage: 'tom_sowing' },
    { activity: 'sowing', stage: 'tom_sowing' },
    { activity: 'transplanting', stage: 'tom_transplanting' },
    { activity: 'gap_filling', stage: 'tom_transplanting' },
    { activity: 'basal_fertiliser', stage: 'tom_transplanting' },
    { activity: 'drip_fertigation', stage: 'tom_vegetative' },
    { activity: 'micronutrient_spray', stage: 'tom_flowering' },
    { activity: 'pheromone_trap_install', stage: 'tom_flowering' },
    { activity: 'fungicide_preventive_spray', stage: 'tom_fruit_set' },
    { activity: 'fungicide_curative_spray', stage: 'tom_fruit_development' },
    { activity: 'insecticide_spray', stage: 'tom_fruit_development' },
    { activity: 'scouting_visit', stage: 'tom_fruit_development' },
    { activity: 'harvest_operation', stage: 'tom_harvest' },
    { activity: 'grading_and_sorting', stage: 'tom_harvest' },
  ],
  chilli: [
    { activity: 'land_preparation', stage: 'chl_nursery' },
    { activity: 'soil_health_test', stage: 'chl_nursery' },
    { activity: 'sowing', stage: 'chl_nursery' },
    { activity: 'transplanting', stage: 'chl_transplanting' },
    { activity: 'gap_filling', stage: 'chl_transplanting' },
    { activity: 'basal_fertiliser', stage: 'chl_transplanting' },
    { activity: 'weeding_manual', stage: 'chl_vegetative' },
    { activity: 'top_dressing_nitrogen', stage: 'chl_vegetative' },
    { activity: 'fungicide_preventive_spray', stage: 'chl_flowering' },
    { activity: 'insecticide_spray', stage: 'chl_fruit_development' },
    { activity: 'harvest_operation', stage: 'chl_harvest' },
    { activity: 'post_harvest_storage', stage: 'chl_harvest' },
  ],
  maize: [
    { activity: 'land_preparation', stage: 'mze_sowing' },
    { activity: 'seed_treatment', stage: 'mze_sowing' },
    { activity: 'sowing', stage: 'mze_sowing' },
    { activity: 'basal_fertiliser', stage: 'mze_sowing' },
    { activity: 'first_irrigation', stage: 'mze_emergence' },
    { activity: 'herbicide_application', stage: 'mze_vegetative' },
    { activity: 'top_dressing_nitrogen', stage: 'mze_vegetative' },
    { activity: 'insecticide_spray', stage: 'mze_tasselling' },
    { activity: 'scouting_visit', stage: 'mze_grain_filling' },
    { activity: 'harvest_operation', stage: 'mze_harvest' },
  ],
};

export interface ResourceRow {
  key: string;
  label: string;
  category: string;
  unit: string;
  cost: string;
  owner: string;
}

export const RESOURCES: ResourceRow[] = [
  { key: 'tractor_with_rotavator', label: 'Tractor with Rotavator', category: 'Machinery', unit: 'hour', cost: 'INR 850 per hour', owner: 'Contractor' },
  { key: 'tractor_with_cultivator', label: 'Tractor with Cultivator', category: 'Machinery', unit: 'hour', cost: 'INR 700 per hour', owner: 'Contractor' },
  { key: 'potato_planter', label: 'Potato Planter', category: 'Machinery', unit: 'hour', cost: 'INR 950 per hour', owner: 'Contractor' },
  { key: 'seed_drill', label: 'Seed Drill', category: 'Machinery', unit: 'hour', cost: 'INR 800 per hour', owner: 'Contractor' },
  { key: 'transplanter', label: 'Paddy Transplanter', category: 'Machinery', unit: 'hour', cost: 'INR 1,100 per hour', owner: 'Contractor' },
  { key: 'boom_sprayer', label: 'Boom Sprayer', category: 'Machinery', unit: 'hour', cost: 'INR 600 per hour', owner: 'Contractor' },
  { key: 'knapsack_sprayer', label: 'Knapsack Sprayer', category: 'Equipment', unit: 'unit', cost: 'INR 2,400 per unit', owner: 'Farmer' },
  { key: 'drip_lateral_set', label: 'Drip Lateral Set', category: 'Equipment', unit: 'acre', cost: 'INR 18,500 per acre', owner: 'Farmer' },
  { key: 'sprinkler_set', label: 'Sprinkler Set', category: 'Equipment', unit: 'acre', cost: 'INR 12,500 per acre', owner: 'Farmer' },
  { key: 'haulm_cutter', label: 'Haulm Cutter', category: 'Machinery', unit: 'hour', cost: 'INR 750 per hour', owner: 'Contractor' },
  { key: 'potato_digger', label: 'Potato Digger', category: 'Machinery', unit: 'hour', cost: 'INR 900 per hour', owner: 'Contractor' },
  { key: 'combine_harvester', label: 'Combine Harvester', category: 'Machinery', unit: 'hour', cost: 'INR 2,200 per hour', owner: 'Contractor' },
  { key: 'grading_conveyor', label: 'Grading Conveyor', category: 'Equipment', unit: 'hour', cost: 'INR 500 per hour', owner: 'Company' },
  { key: 'cold_store_space', label: 'Cold Store Space', category: 'Facility', unit: 'tonne month', cost: 'INR 1,450 per tonne month', owner: 'Company' },
  { key: 'seed_tuber', label: 'Seed Tuber', category: 'Seed', unit: 'kg', cost: 'INR 32 per kg', owner: 'Company supplied' },
  { key: 'certified_wheat_seed', label: 'Certified Wheat Seed', category: 'Seed', unit: 'kg', cost: 'INR 42 per kg', owner: 'Company supplied' },
  { key: 'paddy_nursery_seed', label: 'Paddy Nursery Seed', category: 'Seed', unit: 'kg', cost: 'INR 78 per kg', owner: 'Company supplied' },
  { key: 'hybrid_tomato_seed', label: 'Hybrid Tomato Seed', category: 'Seed', unit: '10 g pack', cost: 'INR 1,250 per pack', owner: 'Company supplied' },
  { key: 'dap_fertiliser', label: 'DAP', category: 'Fertiliser', unit: '50 kg bag', cost: 'INR 1,350 per bag', owner: 'Company supplied' },
  { key: 'urea_fertiliser', label: 'Urea', category: 'Fertiliser', unit: '45 kg bag', cost: 'INR 267 per bag', owner: 'Company supplied' },
  { key: 'mop_fertiliser', label: 'Muriate of Potash', category: 'Fertiliser', unit: '50 kg bag', cost: 'INR 1,700 per bag', owner: 'Company supplied' },
  { key: 'micronutrient_mix', label: 'Micronutrient Mix', category: 'Fertiliser', unit: 'kg', cost: 'INR 320 per kg', owner: 'Company supplied' },
  { key: 'mancozeb_fungicide', label: 'Mancozeb', category: 'Chemistry', unit: 'kg', cost: 'INR 480 per kg', owner: 'Company supplied' },
  { key: 'metalaxyl_fungicide', label: 'Metalaxyl plus Mancozeb', category: 'Chemistry', unit: 'kg', cost: 'INR 1,250 per kg', owner: 'Company supplied' },
  { key: 'imidacloprid_insecticide', label: 'Imidacloprid', category: 'Chemistry', unit: 'litre', cost: 'INR 1,850 per litre', owner: 'Company supplied' },
  { key: 'pheromone_trap', label: 'Pheromone Trap', category: 'Consumable', unit: 'unit', cost: 'INR 95 per unit', owner: 'Company supplied' },
  { key: 'field_labour', label: 'Field Labour', category: 'Labour', unit: 'person day', cost: 'INR 420 per person day', owner: 'Farmer arranged' },
];

export const ACTIVITY_RESOURCES: Record<string, string[]> = {
  land_preparation: ['tractor_with_rotavator', 'tractor_with_cultivator', 'field_labour'],
  seed_treatment: ['mancozeb_fungicide', 'field_labour'],
  sowing: ['seed_tuber', 'certified_wheat_seed', 'paddy_nursery_seed', 'hybrid_tomato_seed', 'potato_planter', 'seed_drill', 'field_labour'],
  transplanting: ['transplanter', 'field_labour'],
  basal_fertiliser: ['dap_fertiliser', 'mop_fertiliser', 'field_labour'],
  first_irrigation: ['sprinkler_set', 'field_labour'],
  gap_filling: ['seed_tuber', 'field_labour'],
  weeding_manual: ['field_labour'],
  herbicide_application: ['boom_sprayer', 'knapsack_sprayer', 'field_labour'],
  top_dressing_nitrogen: ['urea_fertiliser', 'field_labour'],
  earthing_up: ['tractor_with_cultivator', 'field_labour'],
  micronutrient_spray: ['micronutrient_mix', 'knapsack_sprayer', 'field_labour'],
  fungicide_preventive_spray: ['mancozeb_fungicide', 'boom_sprayer', 'knapsack_sprayer', 'field_labour'],
  fungicide_curative_spray: ['metalaxyl_fungicide', 'boom_sprayer', 'field_labour'],
  insecticide_spray: ['imidacloprid_insecticide', 'knapsack_sprayer', 'field_labour'],
  pheromone_trap_install: ['pheromone_trap', 'field_labour'],
  scouting_visit: ['field_labour'],
  irrigation_scheduled: ['sprinkler_set', 'drip_lateral_set', 'field_labour'],
  drip_fertigation: ['drip_lateral_set', 'urea_fertiliser', 'micronutrient_mix', 'field_labour'],
  haulm_cutting: ['haulm_cutter', 'field_labour'],
  dehaulming_check: ['field_labour'],
  pre_harvest_sampling: ['field_labour'],
  harvest_operation: ['potato_digger', 'combine_harvester', 'field_labour'],
  grading_and_sorting: ['grading_conveyor', 'field_labour'],
  post_harvest_storage: ['cold_store_space', 'field_labour'],
  yield_recording: ['field_labour'],
  plot_boundary_audit: ['field_labour'],
  farmer_training_session: ['field_labour'],
};

export interface AttributeRow {
  key: string;
  label: string;
  kind: 'Standard' | 'Custom' | 'Table';
  dataType: string;
  unit: string;
  required: string;
}

export const ATTRIBUTES: AttributeRow[] = [
  { key: 'area_covered_acre', label: 'Area Covered', kind: 'Standard', dataType: 'Number', unit: 'acre', required: 'Required' },
  { key: 'date_of_operation', label: 'Date of Operation', kind: 'Standard', dataType: 'Date', unit: 'Not applicable', required: 'Required' },
  { key: 'geolocation_capture', label: 'Geolocation Capture', kind: 'Standard', dataType: 'Geo point', unit: 'Not applicable', required: 'Required' },
  { key: 'operator_name', label: 'Operator Name', kind: 'Standard', dataType: 'Text', unit: 'Not applicable', required: 'Optional' },
  { key: 'machine_hours', label: 'Machine Hours', kind: 'Standard', dataType: 'Number', unit: 'hour', required: 'Optional' },
  { key: 'labour_count', label: 'Labour Count', kind: 'Standard', dataType: 'Number', unit: 'persons', required: 'Required' },
  { key: 'seed_rate', label: 'Seed Rate', kind: 'Standard', dataType: 'Number', unit: 'kg per acre', required: 'Required' },
  { key: 'seed_lot_number', label: 'Seed Lot Number', kind: 'Custom', dataType: 'Text', unit: 'Not applicable', required: 'Required' },
  { key: 'fertiliser_product', label: 'Fertiliser Product', kind: 'Table', dataType: 'Lookup', unit: 'Not applicable', required: 'Required' },
  { key: 'fertiliser_quantity', label: 'Fertiliser Quantity', kind: 'Table', dataType: 'Number', unit: 'kg', required: 'Required' },
  { key: 'water_quantity_applied', label: 'Water Quantity Applied', kind: 'Custom', dataType: 'Number', unit: 'mm', required: 'Required' },
  { key: 'irrigation_hours', label: 'Irrigation Hours', kind: 'Custom', dataType: 'Number', unit: 'hour', required: 'Optional' },
  { key: 'chemical_product', label: 'Chemical Product', kind: 'Table', dataType: 'Lookup', unit: 'Not applicable', required: 'Required' },
  { key: 'chemical_dose', label: 'Chemical Dose', kind: 'Table', dataType: 'Number', unit: 'ml per litre', required: 'Required' },
  { key: 'spray_volume', label: 'Spray Volume', kind: 'Custom', dataType: 'Number', unit: 'litre per acre', required: 'Optional' },
  { key: 'pest_incidence_pct', label: 'Pest Incidence', kind: 'Custom', dataType: 'Number', unit: 'percent', required: 'Optional' },
  { key: 'crop_stage_observed', label: 'Crop Stage Observed', kind: 'Standard', dataType: 'Lookup', unit: 'Not applicable', required: 'Required' },
  { key: 'photo_evidence', label: 'Photo Evidence', kind: 'Standard', dataType: 'Image', unit: 'Not applicable', required: 'Required' },
  { key: 'harvest_quantity_kg', label: 'Harvest Quantity', kind: 'Standard', dataType: 'Number', unit: 'kg', required: 'Required' },
  { key: 'grade_split_pct', label: 'Grade Split', kind: 'Custom', dataType: 'Number', unit: 'percent', required: 'Optional' },
];

export const ACTIVITY_ATTRIBUTES: Record<string, string[]> = {
  land_preparation: ['machine_hours', 'area_covered_acre', 'geolocation_capture'],
  soil_health_test: ['geolocation_capture', 'photo_evidence'],
  seed_treatment: ['chemical_product', 'chemical_dose'],
  sowing: ['date_of_operation', 'seed_rate', 'seed_lot_number', 'area_covered_acre', 'geolocation_capture'],
  transplanting: ['date_of_operation', 'area_covered_acre', 'labour_count'],
  basal_fertiliser: ['fertiliser_product', 'fertiliser_quantity', 'area_covered_acre'],
  first_irrigation: ['water_quantity_applied', 'irrigation_hours'],
  gap_filling: ['labour_count', 'area_covered_acre'],
  weeding_manual: ['labour_count', 'area_covered_acre', 'photo_evidence'],
  herbicide_application: ['chemical_product', 'chemical_dose', 'spray_volume'],
  top_dressing_nitrogen: ['fertiliser_product', 'fertiliser_quantity', 'crop_stage_observed'],
  earthing_up: ['machine_hours', 'area_covered_acre'],
  micronutrient_spray: ['chemical_product', 'chemical_dose', 'spray_volume'],
  fungicide_preventive_spray: ['chemical_product', 'chemical_dose', 'spray_volume', 'crop_stage_observed', 'photo_evidence'],
  fungicide_curative_spray: ['chemical_product', 'chemical_dose', 'pest_incidence_pct', 'photo_evidence'],
  insecticide_spray: ['chemical_product', 'chemical_dose', 'pest_incidence_pct', 'spray_volume'],
  pheromone_trap_install: ['geolocation_capture', 'labour_count'],
  scouting_visit: ['crop_stage_observed', 'pest_incidence_pct', 'photo_evidence', 'geolocation_capture'],
  irrigation_scheduled: ['water_quantity_applied', 'irrigation_hours', 'area_covered_acre'],
  drip_fertigation: ['water_quantity_applied', 'fertiliser_product', 'fertiliser_quantity', 'irrigation_hours'],
  haulm_cutting: ['machine_hours', 'area_covered_acre', 'date_of_operation'],
  dehaulming_check: ['crop_stage_observed', 'photo_evidence'],
  pre_harvest_sampling: ['harvest_quantity_kg', 'grade_split_pct', 'geolocation_capture', 'photo_evidence'],
  harvest_operation: ['date_of_operation', 'harvest_quantity_kg', 'area_covered_acre', 'labour_count', 'machine_hours', 'photo_evidence'],
  grading_and_sorting: ['grade_split_pct', 'harvest_quantity_kg'],
  post_harvest_storage: ['harvest_quantity_kg', 'grade_split_pct'],
  yield_recording: ['harvest_quantity_kg', 'area_covered_acre', 'date_of_operation'],
  plot_boundary_audit: ['geolocation_capture', 'area_covered_acre', 'photo_evidence'],
  farmer_training_session: ['geolocation_capture', 'labour_count', 'operator_name', 'photo_evidence'],
};

export interface FormRow {
  key: string;
  label: string;
  type: string;
  version: string;
  fields: string;
  consent: string;
  note?: string;
}

export const FORMS: FormRow[] = [
  { key: 'field_operation_log', label: 'Field Operation Log', type: 'Operational', version: 'v3', fields: '12 fields', consent: 'No consent' },
  { key: 'sowing_record', label: 'Sowing Record', type: 'Operational', version: 'v2', fields: '9 fields', consent: 'No consent' },
  { key: 'input_application_log', label: 'Input Application Log', type: 'Operational', version: 'v4', fields: '11 fields', consent: 'No consent', note: 'Version 4. Earlier versions used a free text product name, so pre-v3 records cannot be joined to the resource master.' },
  { key: 'irrigation_log', label: 'Irrigation Log', type: 'Operational', version: 'v2', fields: '7 fields', consent: 'No consent' },
  { key: 'scouting_observation', label: 'Scouting Observation', type: 'General', version: 'v5', fields: '14 fields', consent: 'No consent' },
  { key: 'harvest_and_grading', label: 'Harvest and Grading', type: 'Operational', version: 'v3', fields: '13 fields', consent: 'No consent' },
  { key: 'farmer_profile_survey', label: 'Farmer Profile Survey', type: 'Farmer', version: 'v2', fields: '22 fields', consent: 'Consent captured' },
  { key: 'plot_audit_survey', label: 'Plot Audit Survey', type: 'Survey', version: 'v1', fields: '10 fields', consent: 'No consent' },
];

/** One form per activity at most. Seven activities record nothing on a form. */
export const ACTIVITY_FORMS: Record<string, string> = {
  land_preparation: 'field_operation_log',
  gap_filling: 'field_operation_log',
  sowing: 'sowing_record',
  transplanting: 'sowing_record',
  seed_treatment: 'input_application_log',
  basal_fertiliser: 'input_application_log',
  top_dressing_nitrogen: 'input_application_log',
  micronutrient_spray: 'input_application_log',
  herbicide_application: 'input_application_log',
  fungicide_preventive_spray: 'input_application_log',
  fungicide_curative_spray: 'input_application_log',
  insecticide_spray: 'input_application_log',
  first_irrigation: 'irrigation_log',
  irrigation_scheduled: 'irrigation_log',
  drip_fertigation: 'irrigation_log',
  scouting_visit: 'scouting_observation',
  dehaulming_check: 'scouting_observation',
  pre_harvest_sampling: 'harvest_and_grading',
  harvest_operation: 'harvest_and_grading',
  grading_and_sorting: 'harvest_and_grading',
  plot_boundary_audit: 'plot_audit_survey',
  farmer_training_session: 'farmer_profile_survey',
};
