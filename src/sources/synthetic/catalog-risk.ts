/**
 * The synthetic tenant: risk configuration and the observed layer.
 *
 * The observed layer is the one that did not exist in the original conception of this graph and turned
 * out to carry the most weight. Every contradiction worth acting on lives here: stages that do not run to
 * their configured duration, warnings that arrive too late to act on, and yield gaps that turn out to be
 * weather rather than variety.
 */

export interface DiseaseRow {
  key: string;
  crop: string;
  label: string;
  type: string;
  conditions: string;
  symptoms: string;
  mitigation: string;
  model: string;
  note?: string;
}

export const DISEASES: DiseaseRow[] = [
  { key: 'late_blight', crop: 'potato', label: 'Late Blight', type: 'Fungal disease', conditions: '10 to 24 C with relative humidity above 90 percent for 10 hours or more', symptoms: 'Water soaked lesions on leaf margins, white sporulation on the underside, rapid collapse of the canopy', mitigation: 'Preventive mancozeb, curative metalaxyl once lesions appear', model: 'DEWS model available, run daily on a 7 day forecast' },
  { key: 'early_blight', crop: 'potato', label: 'Early Blight', type: 'Fungal disease', conditions: 'Warm 24 to 29 C with alternating wet and dry spells', symptoms: 'Concentric dark rings on older leaves, defoliation from the base upward', mitigation: 'Preventive mancozeb at tuber initiation', model: 'DEWS model available' },
  { key: 'potato_tuber_moth', crop: 'potato', label: 'Potato Tuber Moth', type: 'Insect pest', conditions: 'Dry weather above 28 C, exposed tubers from poor earthing up', symptoms: 'Tunnelling in tubers, frass at entry holes, damage found at grading', mitigation: 'Pheromone traps at 8 per acre, earthing up, timely harvest', model: 'DEWS model available, degree day driven' },
  { key: 'black_scurf', crop: 'potato', label: 'Black Scurf', type: 'Soil borne fungal disease', conditions: 'Cool wet soil at planting, infected seed', symptoms: 'Black sclerotia on tuber skin, stem canker, uneven emergence', mitigation: 'Seed treatment, avoid cold wet planting windows', model: 'No DEWS model. Managed through the sowing window instead' },
  { key: 'yellow_rust', crop: 'wheat', label: 'Yellow Rust', type: 'Fungal disease', conditions: '10 to 18 C with dew on the leaf for 3 hours or more', symptoms: 'Yellow pustules in stripes along the leaf veins', mitigation: 'Preventive propiconazole at first report in the district', model: 'DEWS model available, best hit rate in the book at 88.9 percent' },
  { key: 'karnal_bunt', crop: 'wheat', label: 'Karnal Bunt', type: 'Fungal disease', conditions: 'Cool humid weather at flowering, 18 to 24 C with rain', symptoms: 'Partly bunted grain with a fishy odour, detected only at grading', mitigation: 'Seed treatment and clean seed sourcing', model: 'DEWS model available but the weakest performer, 50 percent hit rate' },
  { key: 'powdery_mildew_wheat', crop: 'wheat', label: 'Powdery Mildew', type: 'Fungal disease', conditions: '15 to 22 C with high humidity and dense canopy', symptoms: 'White powdery growth on the upper leaf surface', mitigation: 'Preventive sulphur or triazole spray', model: 'DEWS model available' },
  { key: 'aphid_wheat', crop: 'wheat', label: 'Wheat Aphid', type: 'Insect pest', conditions: 'Mild 15 to 25 C, still weather after irrigation', symptoms: 'Colonies on the ear and flag leaf, honeydew and sooty mould', mitigation: 'Insecticide spray only above the economic threshold', model: 'No DEWS model' },
  { key: 'bacterial_leaf_blight', crop: 'paddy', label: 'Bacterial Leaf Blight', type: 'Bacterial disease', conditions: '25 to 34 C with standing water and wind damage to leaves', symptoms: 'Water soaked stripes turning straw yellow from the leaf tip', mitigation: 'Balanced nitrogen, drain the field, copper based spray', model: 'DEWS model available. Flood triggered, so lead time is the shortest in the book at 1.4 days' },
  { key: 'blast_rice', crop: 'paddy', label: 'Rice Blast', type: 'Fungal disease', conditions: 'Night temperature 20 to 26 C with long dew periods', symptoms: 'Spindle shaped lesions with grey centres, neck rot at flowering', mitigation: 'Preventive tricyclazole at panicle initiation', model: 'DEWS model available' },
  { key: 'brown_plant_hopper', crop: 'paddy', label: 'Brown Plant Hopper', type: 'Insect pest', conditions: 'High humidity, dense canopy, excess nitrogen, continuous flooding', symptoms: 'Hopper burn in circular patches, plants dry from the base', mitigation: 'Alternate wetting and drying, avoid excess nitrogen, targeted insecticide', model: 'DEWS model available' },
  { key: 'stem_borer_rice', crop: 'paddy', label: 'Yellow Stem Borer', type: 'Insect pest', conditions: 'Warm humid tillering period, staggered transplanting nearby', symptoms: 'Dead hearts at tillering, white ears at flowering', mitigation: 'Pheromone traps, clipping of egg masses at transplanting', model: 'DEWS model available', note: 'The mitigating activity, pheromone trap installation, is not in either paddy plan. Configured risk with no configured response.' },
  { key: 'early_blight_tomato', crop: 'tomato', label: 'Early Blight', type: 'Fungal disease', conditions: 'Warm wet weather 24 to 29 C, splash from overhead irrigation', symptoms: 'Target spot lesions on lower leaves, stem collar rot in seedlings', mitigation: 'Preventive mancozeb, switch from overhead to drip', model: 'DEWS model available' },
  { key: 'tomato_leaf_curl_virus', crop: 'tomato', label: 'Tomato Leaf Curl Virus', type: 'Viral disease, whitefly vectored', conditions: 'Dry warm weather with high whitefly pressure', symptoms: 'Upward curling and thickening of leaves, severe stunting, no fruit set', mitigation: 'Vector control, barrier crops, resistant hybrids where available', model: 'No DEWS model. Vector pressure is not a weather variable the model reads' },
  { key: 'fruit_borer_tomato', crop: 'tomato', label: 'Fruit Borer', type: 'Insect pest', conditions: 'Warm dry weather at fruit set', symptoms: 'Circular bore holes in fruit, frass at the entry point', mitigation: 'Pheromone traps, need based insecticide', model: 'DEWS model available' },
  { key: 'thrips_chilli', crop: 'chilli', label: 'Chilli Thrips', type: 'Insect pest', conditions: 'Dry spells above 30 C, breaks in the monsoon', symptoms: 'Upward leaf curl, silvering, flower drop, murda complex', mitigation: 'Need based insecticide rotation, blue sticky traps', model: 'DEWS model available' },
  { key: 'anthracnose_chilli', crop: 'chilli', label: 'Anthracnose', type: 'Fungal disease', conditions: 'Rain at fruit maturity, 25 to 30 C with wet fruit surfaces', symptoms: 'Sunken circular lesions on ripening fruit, dieback of twigs', mitigation: 'Preventive spray at fruit development, harvest ahead of rain', model: 'DEWS model available' },
  { key: 'fall_armyworm', crop: 'maize', label: 'Fall Armyworm', type: 'Insect pest', conditions: 'Warm weather, staggered planting, continuous maize in the area', symptoms: 'Ragged whorl feeding, sawdust like frass in the whorl', mitigation: 'Early scouting, need based insecticide into the whorl', model: 'No DEWS model configured for this tenant yet' },
];

/** `susceptible` links. incidence is the percentage of that variety's plots the risk was recorded on. */
export const SUSCEPTIBILITY: Array<{ variety: string; disease: string; incidence: number }> = [
  { variety: 'kufri_pukhraj', disease: 'late_blight', incidence: 52 },
  { variety: 'kufri_pukhraj', disease: 'early_blight', incidence: 31 },
  { variety: 'kufri_pukhraj', disease: 'potato_tuber_moth', incidence: 18 },
  { variety: 'kufri_jyoti', disease: 'late_blight', incidence: 44 },
  { variety: 'kufri_jyoti', disease: 'black_scurf', incidence: 22 },
  { variety: 'kufri_chipsona_1', disease: 'late_blight', incidence: 48 },
  { variety: 'kufri_chipsona_1', disease: 'early_blight', incidence: 26 },
  { variety: 'kufri_chipsona_1', disease: 'black_scurf', incidence: 15 },
  { variety: 'lady_rosetta', disease: 'late_blight', incidence: 56 },
  { variety: 'lady_rosetta', disease: 'early_blight', incidence: 34 },
  { variety: 'santana', disease: 'late_blight', incidence: 41 },
  { variety: 'kufri_bahar', disease: 'early_blight', incidence: 29 },
  { variety: 'hd_2967', disease: 'yellow_rust', incidence: 38 },
  { variety: 'hd_2967', disease: 'powdery_mildew_wheat', incidence: 21 },
  { variety: 'hd_2967', disease: 'aphid_wheat', incidence: 17 },
  { variety: 'hd_3086', disease: 'yellow_rust', incidence: 31 },
  { variety: 'hd_3086', disease: 'karnal_bunt', incidence: 12 },
  { variety: 'pbw_725', disease: 'yellow_rust', incidence: 42 },
  { variety: 'pbw_725', disease: 'powdery_mildew_wheat', incidence: 24 },
  { variety: 'durum_sharbati', disease: 'karnal_bunt', incidence: 19 },
  { variety: 'pusa_basmati_1121', disease: 'bacterial_leaf_blight', incidence: 46 },
  { variety: 'pusa_basmati_1121', disease: 'blast_rice', incidence: 33 },
  { variety: 'pusa_basmati_1121', disease: 'brown_plant_hopper', incidence: 22 },
  { variety: 'pusa_basmati_1509', disease: 'bacterial_leaf_blight', incidence: 39 },
  { variety: 'pusa_basmati_1509', disease: 'stem_borer_rice', incidence: 25 },
  { variety: 'swarna', disease: 'blast_rice', incidence: 41 },
  { variety: 'swarna', disease: 'brown_plant_hopper', incidence: 28 },
  { variety: 'swarna', disease: 'stem_borer_rice', incidence: 19 },
  { variety: 'ir_64', disease: 'bacterial_leaf_blight', incidence: 44 },
  { variety: 'ir_64', disease: 'blast_rice', incidence: 36 },
  { variety: 'abhinav', disease: 'early_blight_tomato', incidence: 37 },
  { variety: 'abhinav', disease: 'tomato_leaf_curl_virus', incidence: 29 },
  { variety: 'abhinav', disease: 'fruit_borer_tomato', incidence: 24 },
  { variety: 'namdhari_585', disease: 'tomato_leaf_curl_virus', incidence: 26 },
  { variety: 'namdhari_585', disease: 'fruit_borer_tomato', incidence: 21 },
  { variety: 'byadgi_dabbi', disease: 'thrips_chilli', incidence: 47 },
  { variety: 'byadgi_dabbi', disease: 'anthracnose_chilli', incidence: 32 },
  { variety: 'teja_s17', disease: 'thrips_chilli', incidence: 39 },
  { variety: 'sankeshwar_32', disease: 'anthracnose_chilli', incidence: 35 },
  { variety: 'pioneer_3396', disease: 'fall_armyworm', incidence: 33 },
  { variety: 'dkc_9144', disease: 'fall_armyworm', incidence: 28 },
];

export const CRITICAL_STAGES: Array<{ disease: string; stage: string }> = [
  { disease: 'late_blight', stage: 'pot_tuber_initiation' },
  { disease: 'late_blight', stage: 'pot_tuber_bulking' },
  { disease: 'early_blight', stage: 'pot_vegetative' },
  { disease: 'early_blight', stage: 'pot_tuber_bulking' },
  { disease: 'potato_tuber_moth', stage: 'pot_tuber_bulking' },
  { disease: 'potato_tuber_moth', stage: 'pot_maturation' },
  { disease: 'black_scurf', stage: 'pot_planting' },
  { disease: 'black_scurf', stage: 'pot_harvest' },
  { disease: 'yellow_rust', stage: 'wht_booting' },
  { disease: 'yellow_rust', stage: 'wht_grain_filling' },
  { disease: 'karnal_bunt', stage: 'wht_booting' },
  { disease: 'karnal_bunt', stage: 'wht_grain_filling' },
  { disease: 'powdery_mildew_wheat', stage: 'wht_tillering' },
  { disease: 'powdery_mildew_wheat', stage: 'wht_jointing' },
  { disease: 'aphid_wheat', stage: 'wht_booting' },
  { disease: 'bacterial_leaf_blight', stage: 'pdy_tillering' },
  { disease: 'bacterial_leaf_blight', stage: 'pdy_panicle_initiation' },
  { disease: 'blast_rice', stage: 'pdy_tillering' },
  { disease: 'blast_rice', stage: 'pdy_flowering' },
  { disease: 'brown_plant_hopper', stage: 'pdy_tillering' },
  { disease: 'stem_borer_rice', stage: 'pdy_tillering' },
  { disease: 'stem_borer_rice', stage: 'pdy_panicle_initiation' },
  { disease: 'early_blight_tomato', stage: 'tom_vegetative' },
  { disease: 'early_blight_tomato', stage: 'tom_fruit_development' },
  { disease: 'tomato_leaf_curl_virus', stage: 'tom_transplanting' },
  { disease: 'tomato_leaf_curl_virus', stage: 'tom_vegetative' },
  { disease: 'fruit_borer_tomato', stage: 'tom_fruit_set' },
  { disease: 'fruit_borer_tomato', stage: 'tom_fruit_development' },
  { disease: 'thrips_chilli', stage: 'chl_vegetative' },
  { disease: 'thrips_chilli', stage: 'chl_flowering' },
  { disease: 'anthracnose_chilli', stage: 'chl_fruit_development' },
  { disease: 'fall_armyworm', stage: 'mze_vegetative' },
  { disease: 'fall_armyworm', stage: 'mze_tasselling' },
];

export const DISEASE_MITIGATIONS: Array<{ disease: string; activity: string }> = [
  { disease: 'late_blight', activity: 'fungicide_preventive_spray' },
  { disease: 'late_blight', activity: 'fungicide_curative_spray' },
  { disease: 'early_blight', activity: 'fungicide_preventive_spray' },
  { disease: 'potato_tuber_moth', activity: 'pheromone_trap_install' },
  { disease: 'potato_tuber_moth', activity: 'insecticide_spray' },
  { disease: 'black_scurf', activity: 'seed_treatment' },
  { disease: 'yellow_rust', activity: 'fungicide_preventive_spray' },
  { disease: 'karnal_bunt', activity: 'seed_treatment' },
  { disease: 'powdery_mildew_wheat', activity: 'fungicide_preventive_spray' },
  { disease: 'aphid_wheat', activity: 'insecticide_spray' },
  { disease: 'bacterial_leaf_blight', activity: 'fungicide_preventive_spray' },
  { disease: 'blast_rice', activity: 'fungicide_preventive_spray' },
  { disease: 'brown_plant_hopper', activity: 'insecticide_spray' },
  { disease: 'stem_borer_rice', activity: 'pheromone_trap_install' },
  { disease: 'early_blight_tomato', activity: 'fungicide_preventive_spray' },
  { disease: 'tomato_leaf_curl_virus', activity: 'insecticide_spray' },
  { disease: 'fruit_borer_tomato', activity: 'pheromone_trap_install' },
  { disease: 'thrips_chilli', activity: 'insecticide_spray' },
  { disease: 'anthracnose_chilli', activity: 'fungicide_preventive_spray' },
  { disease: 'fall_armyworm', activity: 'insecticide_spray' },
];

export interface AlertRow {
  key: string;
  label: string;
  class: string;
  trigger: string;
  advisory: string;
  /** Mean area impacted, percent. Primary metric. */
  areaPct: number;
  note?: string;
}

export const ALERTS: AlertRow[] = [
  { key: 'hail', label: 'Hail', class: 'Non biotic', trigger: 'Hail reported within the plot boundary during a convective event', advisory: 'Assess standing crop within 48 hours, photograph damage, notify insurer', areaPct: 22.4, note: 'The costliest alert in the book at 22.4 percent mean area impacted, and no mitigating activity is configured against it.' },
  { key: 'frost', label: 'Frost', class: 'Non biotic', trigger: 'Forecast minimum below 2 C for two consecutive nights', advisory: 'Light irrigation the evening before, smoke screens on the windward edge', areaPct: 14.8 },
  { key: 'drought_stress', label: 'Drought Stress', class: 'Non biotic', trigger: 'Fourteen consecutive days with precipitation below 0.5 mm per day', advisory: 'Prioritise irrigation to critical stages, defer top dressing', areaPct: 12.9 },
  { key: 'waterlogging', label: 'Waterlogging', class: 'Non biotic', trigger: 'Rainfall above 80 mm in 48 hours on a plot with poor drainage', advisory: 'Open drainage channels, defer nitrogen, watch for bacterial blight', areaPct: 11.4 },
  { key: 'heat_wave', label: 'Heat Wave', class: 'Non biotic', trigger: 'Maximum above 38 C for three consecutive days', advisory: 'Irrigate to cool the canopy, avoid midday operations, expect grade loss', areaPct: 9.6 },
  { key: 'pest_outbreak_generic', label: 'Pest Outbreak', class: 'Biotic', trigger: 'Pest incidence above 10 percent recorded on three neighbouring plots', advisory: 'Raise scouting frequency, prepare need based spray', areaPct: 8.4 },
  { key: 'unseasonal_rain', label: 'Unseasonal Rain', class: 'Non biotic', trigger: 'Rainfall above 20 mm outside the expected seasonal pattern', advisory: 'Defer spraying and harvest, re-apply preventive fungicide after the rain', areaPct: 7.2 },
  { key: 'wind_damage', label: 'Wind Damage', class: 'Non biotic', trigger: 'Wind speed above 45 km per hour during grain filling or fruiting', advisory: 'Inspect for lodging, plan early harvest of affected blocks', areaPct: 6.1 },
];

/** `alert observed` links. plots is the historical count of plots the alert was raised on. */
export const ALERT_OBSERVATIONS: Array<{ crop: string; alert: string; plots: number }> = [
  { crop: 'potato', alert: 'heat_wave', plots: 1240 },
  { crop: 'potato', alert: 'unseasonal_rain', plots: 910 },
  { crop: 'potato', alert: 'frost', plots: 620 },
  { crop: 'potato', alert: 'waterlogging', plots: 480 },
  { crop: 'potato', alert: 'hail', plots: 340 },
  { crop: 'wheat', alert: 'heat_wave', plots: 1640 },
  { crop: 'wheat', alert: 'unseasonal_rain', plots: 1120 },
  { crop: 'wheat', alert: 'frost', plots: 780 },
  { crop: 'wheat', alert: 'hail', plots: 410 },
  { crop: 'paddy', alert: 'waterlogging', plots: 1380 },
  { crop: 'paddy', alert: 'pest_outbreak_generic', plots: 640 },
  { crop: 'paddy', alert: 'drought_stress', plots: 520 },
  { crop: 'tomato', alert: 'heat_wave', plots: 560 },
  { crop: 'tomato', alert: 'unseasonal_rain', plots: 380 },
  { crop: 'tomato', alert: 'hail', plots: 190 },
  { crop: 'chilli', alert: 'drought_stress', plots: 730 },
  { crop: 'maize', alert: 'wind_damage', plots: 210 },
];

export const ALERT_MITIGATIONS: Array<{ alert: string; activity: string }> = [
  { alert: 'frost', activity: 'irrigation_scheduled' },
  { alert: 'heat_wave', activity: 'irrigation_scheduled' },
  { alert: 'drought_stress', activity: 'irrigation_scheduled' },
  { alert: 'waterlogging', activity: 'land_preparation' },
  { alert: 'unseasonal_rain', activity: 'fungicide_preventive_spray' },
  { alert: 'pest_outbreak_generic', activity: 'scouting_visit' },
];

/* ------------------------------------------------------------------ observed */

export interface StageObservationRow {
  key: string;
  crop: string;
  stage: string;
  region: string;
  season: string;
  configuredDays: number;
  observedDays: number;
  plots: number;
  note?: string;
}

export const STAGE_OBSERVATIONS: StageObservationRow[] = [
  { key: 'so_potato_bulking_gujarat', crop: 'potato', stage: 'pot_tuber_bulking', region: 'gujarat', season: 'rabi', configuredDays: 35, observedDays: 32, plots: 1180, note: 'Nine percent short. Activities anchored to the end of bulking fire after the crop has already finished bulking.' },
  { key: 'so_potato_bulking_uttar_pradesh', crop: 'potato', stage: 'pot_tuber_bulking', region: 'uttar_pradesh', season: 'rabi', configuredDays: 35, observedDays: 38, plots: 940, note: 'The same configured stage runs long here. One national stage set cannot serve both regions.' },
  { key: 'so_potato_initiation_gujarat', crop: 'potato', stage: 'pot_tuber_initiation', region: 'gujarat', season: 'rabi', configuredDays: 20, observedDays: 19, plots: 1180 },
  { key: 'so_potato_vegetative_gujarat', crop: 'potato', stage: 'pot_vegetative', region: 'gujarat', season: 'rabi', configuredDays: 25, observedDays: 23, plots: 1140 },
  { key: 'so_potato_maturation_west_bengal', crop: 'potato', stage: 'pot_maturation', region: 'west_bengal', season: 'rabi', configuredDays: 15, observedDays: 17, plots: 610 },
  { key: 'so_wheat_tillering_punjab', crop: 'wheat', stage: 'wht_tillering', region: 'punjab', season: 'rabi', configuredDays: 30, observedDays: 28, plots: 2410 },
  { key: 'so_wheat_grain_filling_punjab', crop: 'wheat', stage: 'wht_grain_filling', region: 'punjab', season: 'rabi', configuredDays: 30, observedDays: 26, plots: 2380, note: 'Terminal heat cuts grain filling short. The harvest window prediction is built on 30 days and reads late every season.' },
  { key: 'so_wheat_grain_filling_madhya_pradesh', crop: 'wheat', stage: 'wht_grain_filling', region: 'madhya_pradesh', season: 'rabi', configuredDays: 30, observedDays: 24, plots: 690, note: 'Twenty percent short, the largest deviation in the book.' },
  { key: 'so_paddy_tillering_punjab', crop: 'paddy', stage: 'pdy_tillering', region: 'punjab', season: 'kharif', configuredDays: 30, observedDays: 31, plots: 2210 },
  { key: 'so_paddy_flowering_haryana', crop: 'paddy', stage: 'pdy_flowering', region: 'haryana', season: 'kharif', configuredDays: 15, observedDays: 16, plots: 1520 },
  { key: 'so_paddy_grain_filling_west_bengal', crop: 'paddy', stage: 'pdy_grain_filling', region: 'west_bengal', season: 'kharif', configuredDays: 25, observedDays: 27, plots: 990 },
  { key: 'so_tomato_fruit_development_maharashtra', crop: 'tomato', stage: 'tom_fruit_development', region: 'maharashtra', season: 'zaid', configuredDays: 30, observedDays: 27, plots: 760 },
  { key: 'so_chilli_fruit_development_karnataka', crop: 'chilli', stage: 'chl_fruit_development', region: 'karnataka', season: 'kharif', configuredDays: 45, observedDays: 49, plots: 1130 },
  { key: 'so_maize_grain_filling_madhya_pradesh', crop: 'maize', stage: 'mze_grain_filling', region: 'madhya_pradesh', season: 'kharif', configuredDays: 35, observedDays: 33, plots: 640 },
];

export interface SeasonOutcomeRow {
  key: string;
  label: string;
  crop: string;
  variety: string;
  region: string;
  season: string;
  rainfall: string;
  meanTmax: string;
  heatEvents: string;
  expected: number;
  achieved: number;
  grade: string;
  plots: number;
  note?: string;
}

export const SEASON_OUTCOMES: SeasonOutcomeRow[] = [
  { key: 'swo_rosetta_gujarat_rabi_2024', label: 'Lady Rosetta, Gujarat, Rabi 2024-25', crop: 'potato', variety: 'lady_rosetta', region: 'gujarat', season: 'rabi', rainfall: '42 mm', meanTmax: '33.8 C', heatEvents: '6 days above 36 C during tuber bulking', expected: 32.0, achieved: 27.4, grade: '58 percent chips grade A, 42 percent of lots failed on dry matter', plots: 720, note: 'The yield gap and the grade failure are the same event. Heat during bulking depressed both tonnage and dry matter, and they were reported as two separate problems.' },
  { key: 'swo_pukhraj_gujarat_rabi_2024', label: 'Kufri Pukhraj, Gujarat, Rabi 2024-25', crop: 'potato', variety: 'kufri_pukhraj', region: 'gujarat', season: 'rabi', rainfall: '48 mm', meanTmax: '32.1 C', heatEvents: '2 days above 36 C during bulking', expected: 28.0, achieved: 26.9, grade: '81 percent table grade A', plots: 1420 },
  { key: 'swo_pukhraj_uttar_pradesh_rabi_2024', label: 'Kufri Pukhraj, Uttar Pradesh, Rabi 2024-25', crop: 'potato', variety: 'kufri_pukhraj', region: 'uttar_pradesh', season: 'rabi', rainfall: '61 mm', meanTmax: '29.4 C', heatEvents: 'None', expected: 28.0, achieved: 27.6, grade: '84 percent table grade A', plots: 1180 },
  { key: 'swo_chipsona_west_bengal_rabi_2024', label: 'Kufri Chipsona-1, West Bengal, Rabi 2024-25', crop: 'potato', variety: 'kufri_chipsona_1', region: 'west_bengal', season: 'rabi', rainfall: '88 mm', meanTmax: '28.6 C', heatEvents: 'None', expected: 30.0, achieved: 29.8, grade: '88 percent chips grade A', plots: 610, note: 'The best grade outcome in the book, in the region with the highest disease pressure. Cool bulking beats everything else.' },
  { key: 'swo_jyoti_uttar_pradesh_rabi_2024', label: 'Kufri Jyoti, Uttar Pradesh, Rabi 2024-25', crop: 'potato', variety: 'kufri_jyoti', region: 'uttar_pradesh', season: 'rabi', rainfall: '57 mm', meanTmax: '29.9 C', heatEvents: '1 day above 36 C', expected: 25.5, achieved: 25.2, grade: '86 percent in seed size', plots: 940 },
  { key: 'swo_hd2967_punjab_rabi_2024', label: 'HD 2967, Punjab, Rabi 2024-25', crop: 'wheat', variety: 'hd_2967', region: 'punjab', season: 'rabi', rainfall: '96 mm', meanTmax: '31.2 C', heatEvents: '4 days above 35 C during grain filling', expected: 5.4, achieved: 5.1, grade: 'Mill grade 1 on 76 percent of lots', plots: 2410 },
  { key: 'swo_hd3086_haryana_rabi_2024', label: 'HD 3086, Haryana, Rabi 2024-25', crop: 'wheat', variety: 'hd_3086', region: 'haryana', season: 'rabi', rainfall: '84 mm', meanTmax: '30.8 C', heatEvents: '2 days above 35 C', expected: 5.6, achieved: 5.5, grade: 'Mill grade 1 on 79 percent of lots', plots: 1290 },
  { key: 'swo_pb1121_punjab_kharif_2024', label: 'Pusa Basmati 1121, Punjab, Kharif 2024', crop: 'paddy', variety: 'pusa_basmati_1121', region: 'punjab', season: 'kharif', rainfall: '612 mm', meanTmax: '34.1 C', heatEvents: 'None', expected: 4.3, achieved: 4.0, grade: 'Export grade on 68 percent of lots', plots: 2210 },
  { key: 'swo_pb1509_haryana_kharif_2024', label: 'Pusa Basmati 1509, Haryana, Kharif 2024', crop: 'paddy', variety: 'pusa_basmati_1509', region: 'haryana', season: 'kharif', rainfall: '548 mm', meanTmax: '34.6 C', heatEvents: '1 dry spell of 11 days', expected: 4.6, achieved: 4.5, grade: 'Export grade on 71 percent of lots', plots: 1520 },
  { key: 'swo_swarna_west_bengal_kharif_2024', label: 'Swarna, West Bengal, Kharif 2024', crop: 'paddy', variety: 'swarna', region: 'west_bengal', season: 'kharif', rainfall: '1,284 mm', meanTmax: '32.9 C', heatEvents: 'Waterlogging in 3 spells', expected: 5.8, achieved: 5.4, grade: 'Domestic grade', plots: 990, note: 'Waterlogging, then bacterial leaf blight. The DEWS warning for it fired 1.4 days ahead, which was not enough to act on.' },
  { key: 'swo_abhinav_maharashtra_zaid_2025', label: 'Abhinav, Maharashtra, Zaid 2025', crop: 'tomato', variety: 'abhinav', region: 'maharashtra', season: 'zaid', rainfall: '12 mm', meanTmax: '36.2 C', heatEvents: '9 days above 38 C at fruit set', expected: 62.0, achieved: 55.1, grade: '64 percent table grade A', plots: 760, note: 'Fruit set ran into the heat wave window. The sowing window for this region and season exists to prevent exactly this.' },
  { key: 'swo_byadgi_karnataka_kharif_2024', label: 'Byadgi Dabbi, Karnataka, Kharif 2024', crop: 'chilli', variety: 'byadgi_dabbi', region: 'karnataka', season: 'kharif', rainfall: '742 mm', meanTmax: '30.4 C', heatEvents: 'None', expected: 2.8, achieved: 2.7, grade: 'Colour value 126 ASTA, export grade on 82 percent', plots: 1130 },
];

export interface DewsHistoryRow {
  key: string;
  label: string;
  disease: string;
  region: string;
  season: string;
  warnings: number;
  critical: number;
  followed: number;
  hitRate: number;
  leadDays: number;
  threshold: number;
  note?: string;
}

export const DEWS_HISTORY: DewsHistoryRow[] = [
  { key: 'dews_late_blight_gujarat_rabi', label: 'Late Blight, Gujarat, Rabi', disease: 'late_blight', region: 'gujarat', season: 'rabi', warnings: 34, critical: 12, followed: 11, hitRate: 91.7, leadDays: 3.2, threshold: 75 },
  { key: 'dews_late_blight_uttar_pradesh_rabi', label: 'Late Blight, Uttar Pradesh, Rabi', disease: 'late_blight', region: 'uttar_pradesh', season: 'rabi', warnings: 41, critical: 15, followed: 12, hitRate: 80.0, leadDays: 2.9, threshold: 75 },
  { key: 'dews_early_blight_gujarat_rabi', label: 'Early Blight, Gujarat, Rabi', disease: 'early_blight', region: 'gujarat', season: 'rabi', warnings: 28, critical: 9, followed: 6, hitRate: 66.7, leadDays: 2.4, threshold: 75 },
  { key: 'dews_tuber_moth_gujarat_rabi', label: 'Potato Tuber Moth, Gujarat, Rabi', disease: 'potato_tuber_moth', region: 'gujarat', season: 'rabi', warnings: 19, critical: 6, followed: 5, hitRate: 83.3, leadDays: 5.8, threshold: 70, note: 'The best lead time in the book at 5.8 days, because the model is degree day driven rather than event driven. Five days is enough to get a sprayer or traps to the plot.' },
  { key: 'dews_yellow_rust_punjab_rabi', label: 'Yellow Rust, Punjab, Rabi', disease: 'yellow_rust', region: 'punjab', season: 'rabi', warnings: 47, critical: 18, followed: 16, hitRate: 88.9, leadDays: 4.1, threshold: 75 },
  { key: 'dews_karnal_bunt_haryana_rabi', label: 'Karnal Bunt, Haryana, Rabi', disease: 'karnal_bunt', region: 'haryana', season: 'rabi', warnings: 22, critical: 8, followed: 4, hitRate: 50.0, leadDays: 2.2, threshold: 75, note: 'Half the critical warnings were followed by nothing. Raising the threshold would cut the noise but the disease is only detectable at grading, so a false positive is cheaper than a miss.' },
  { key: 'dews_blb_punjab_kharif', label: 'Bacterial Leaf Blight, Punjab, Kharif', disease: 'bacterial_leaf_blight', region: 'punjab', season: 'kharif', warnings: 38, critical: 14, followed: 11, hitRate: 78.6, leadDays: 1.9, threshold: 75 },
  { key: 'dews_blast_west_bengal_kharif', label: 'Rice Blast, West Bengal, Kharif', disease: 'blast_rice', region: 'west_bengal', season: 'kharif', warnings: 52, critical: 21, followed: 17, hitRate: 81.0, leadDays: 2.6, threshold: 75 },
  { key: 'dews_bph_punjab_kharif', label: 'Brown Plant Hopper, Punjab, Kharif', disease: 'brown_plant_hopper', region: 'punjab', season: 'kharif', warnings: 31, critical: 11, followed: 9, hitRate: 81.8, leadDays: 3.4, threshold: 70 },
  { key: 'dews_blb_west_bengal_kharif', label: 'Bacterial Leaf Blight, West Bengal, Kharif', disease: 'bacterial_leaf_blight', region: 'west_bengal', season: 'kharif', warnings: 44, critical: 16, followed: 8, hitRate: 50.0, leadDays: 1.4, threshold: 75, note: 'Flood triggered, so the warning and the event arrive together. 1.4 days notice is only actionable where the drainage work is already planned.' },
  { key: 'dews_thrips_karnataka_kharif', label: 'Chilli Thrips, Karnataka, Kharif', disease: 'thrips_chilli', region: 'karnataka', season: 'kharif', warnings: 26, critical: 9, followed: 7, hitRate: 77.8, leadDays: 4.6, threshold: 70 },
  { key: 'dews_fruit_borer_maharashtra_zaid', label: 'Fruit Borer, Maharashtra, Zaid', disease: 'fruit_borer_tomato', region: 'maharashtra', season: 'zaid', warnings: 24, critical: 8, followed: 6, hitRate: 75.0, leadDays: 3.9, threshold: 75 },
];
