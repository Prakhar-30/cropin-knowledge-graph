/**
 * The synthetic tenant: crop hierarchy, crop configuration and growing context.
 *
 * All values here are invented. They are realistic in shape and internally consistent, but nothing came
 * from a real tenant. Variety plot counts are the only primary numbers in this file; every split below
 * them is expressed as a share and allocated to an exact sum at build time.
 */
import type { Share } from './allocate.js';

/* ------------------------------------------------------------------- context */

export interface RegionRow {
  key: string;
  label: string;
  type: string;
  level: string;
  zone: string;
  districts: string;
  note?: string;
}

export const REGIONS: RegionRow[] = [
  { key: 'gujarat', label: 'Gujarat', type: 'Production belt', level: 'State', zone: 'Semi-arid western plain', districts: 'Banaskantha, Sabarkantha, Aravalli, Patan', note: 'The processing potato belt. Warm February onwards, which is what shortens bulking here.' },
  { key: 'punjab', label: 'Punjab', type: 'Production belt', level: 'State', zone: 'Trans-Gangetic plain', districts: 'Ludhiana, Jalandhar, Patiala, Sangrur' },
  { key: 'uttar_pradesh', label: 'Uttar Pradesh', type: 'Production belt', level: 'State', zone: 'Upper Gangetic plain', districts: 'Agra, Farrukhabad, Kannauj, Meerut' },
  { key: 'west_bengal', label: 'West Bengal', type: 'Production belt', level: 'State', zone: 'Lower Gangetic plain', districts: 'Hooghly, Bardhaman, Midnapore', note: 'High humidity through the season. Late blight pressure is the highest of any region here.' },
  { key: 'maharashtra', label: 'Maharashtra', type: 'Production belt', level: 'State', zone: 'Western plateau', districts: 'Nashik, Pune, Ahmednagar, Satara' },
  { key: 'karnataka', label: 'Karnataka', type: 'Production belt', level: 'State', zone: 'Southern plateau', districts: 'Belagavi, Haveri, Dharwad, Kolar' },
  { key: 'madhya_pradesh', label: 'Madhya Pradesh', type: 'Production belt', level: 'State', zone: 'Central plateau', districts: 'Indore, Dewas, Ujjain, Vidisha' },
  { key: 'haryana', label: 'Haryana', type: 'Production belt', level: 'State', zone: 'Trans-Gangetic plain', districts: 'Karnal, Kaithal, Kurukshetra, Sirsa' },
];

export interface SeasonRow {
  key: string;
  label: string;
  months: string;
  window: string;
  type: string;
  note?: string;
}

export const SEASONS: SeasonRow[] = [
  { key: 'rabi', label: 'Rabi', months: 'October to March', window: 'Sown Oct-Nov, harvested Feb-Mar', type: 'Winter, irrigated' },
  { key: 'kharif', label: 'Kharif', months: 'June to October', window: 'Sown Jun-Jul, harvested Sep-Oct', type: 'Monsoon, largely rainfed' },
  { key: 'zaid', label: 'Zaid', months: 'February to June', window: 'Sown Feb-Mar, harvested May-Jun', type: 'Summer, fully irrigated' },
  { key: 'spring', label: 'Spring', months: 'January to April', window: 'Sown Jan, harvested Apr', type: 'Short spring crop', note: 'Used only for the spring potato crop in the northern plain.' },
  { key: 'annual', label: 'Annual', months: 'All year', window: 'Continuous, staggered planting', type: 'Protected cultivation', note: 'Polyhouse production that does not sit inside a single season.' },
];

export interface SoilRow {
  key: string;
  label: string;
  texture: string;
  whc: string;
  ph: string;
  notes: string;
}

export const SOILS: SoilRow[] = [
  { key: 'alluvial', label: 'Alluvial', texture: 'Sandy loam to silty loam', whc: '140 mm/m', ph: '6.5 to 7.8', notes: 'The default across the Gangetic and trans-Gangetic plain.' },
  { key: 'black_cotton', label: 'Black Cotton', texture: 'Clay, montmorillonitic', whc: '200 mm/m', ph: '7.5 to 8.5', notes: 'Holds water well and cracks on drying. Slow to drain after unseasonal rain.' },
  { key: 'red_loam', label: 'Red Loam', texture: 'Sandy clay loam', whc: '110 mm/m', ph: '5.8 to 6.8', notes: 'Low organic carbon. Responds strongly to micronutrient correction.' },
  { key: 'sandy_loam', label: 'Sandy Loam', texture: 'Sandy loam', whc: '90 mm/m', ph: '6.8 to 7.5', notes: 'Preferred for processing potato because of easy digging and clean skin finish.' },
  { key: 'clay_loam', label: 'Clay Loam', texture: 'Clay loam', whc: '170 mm/m', ph: '6.5 to 7.5', notes: 'Good for transplanted paddy. Waterlogs where drainage is poor.' },
  { key: 'laterite', label: 'Laterite', texture: 'Gravelly clay loam', whc: '85 mm/m', ph: '5.2 to 6.2', notes: 'Acidic and low in bases. Needs liming before intensive cropping.' },
];

export interface IrrigationRow {
  key: string;
  label: string;
  method: string;
  efficiency: string;
  capacity: string;
  suited: string;
}

export const IRRIGATIONS: IrrigationRow[] = [
  { key: 'flood', label: 'Flood', method: 'Surface flooding of the basin', efficiency: '55 percent', capacity: '60 mm per irrigation event', suited: 'Transplanted paddy and heavy soils' },
  { key: 'furrow', label: 'Furrow', method: 'Water run down ridges and furrows', efficiency: '60 percent', capacity: '45 mm per event', suited: 'Ridge-planted potato' },
  { key: 'sprinkler', label: 'Sprinkler', method: 'Overhead sprinkler set', efficiency: '75 percent', capacity: '25 mm per day', suited: 'Wheat, potato on light soils' },
  { key: 'drip', label: 'Drip', method: 'Surface or sub-surface drip line', efficiency: '90 percent', capacity: '12 mm per day', suited: 'Tomato, chilli, high value crops' },
  { key: 'centre_pivot', label: 'Centre Pivot', method: 'Mechanised centre pivot', efficiency: '75 percent', capacity: '18 mm per day', suited: 'Large contiguous processing blocks' },
  { key: 'rainfed', label: 'Rainfed', method: 'No applied irrigation', efficiency: 'Not applicable', capacity: 'Rainfall only', suited: 'Kharif chilli, maize, durum wheat' },
  { key: 'canal', label: 'Canal', method: 'Scheduled canal release', efficiency: '50 percent', capacity: '70 mm per turn, on roster', suited: 'Paddy and wheat inside a command area' },
];

/* ------------------------------------------------------------------ hierarchy */

export interface CropRow {
  key: string;
  label: string;
  code: string;
  category: string;
  unit: string;
  priceUnit: string;
  calibration: string;
  note?: string;
}

export const CROPS: CropRow[] = [
  { key: 'potato', label: 'Potato', code: 'CRP-POT', category: 'Tuber', unit: 't/ha', priceUnit: '50 kg bag', calibration: 'Calibrated, 3 seasons', note: 'The most configured crop in the tenant. Seed, table and processing all run off one stage set, which is where the regional stage deviation bites.' },
  { key: 'wheat', label: 'Wheat', code: 'CRP-WHT', category: 'Cereal', unit: 't/ha', priceUnit: 'Quintal', calibration: 'Calibrated, 3 seasons' },
  { key: 'paddy', label: 'Paddy', code: 'CRP-PDY', category: 'Cereal', unit: 't/ha', priceUnit: 'Quintal', calibration: 'Calibrated, 2 seasons' },
  { key: 'tomato', label: 'Tomato', code: 'CRP-TOM', category: 'Vegetable', unit: 't/ha', priceUnit: '25 kg crate', calibration: 'Calibrated, 2 seasons' },
  { key: 'chilli', label: 'Chilli', code: 'CRP-CHL', category: 'Spice', unit: 't/ha', priceUnit: 'Quintal', calibration: 'Base model, 1 season' },
  { key: 'maize', label: 'Maize', code: 'CRP-MZE', category: 'Cereal', unit: 't/ha', priceUnit: 'Quintal', calibration: 'Base model, 1 season', note: 'Newest crop in the tenant. No agricultural alert configured against it yet, and only one plan attached.' },
];

export interface VarietyRow {
  key: string;
  crop: string;
  label: string;
  code: string;
  seedSource: string;
  maturity: string;
  calibration: string;
  seasonsOfHistory: number;
  /** Primary. Everything below a variety is a split of this number. */
  plots: number;
  growers: number;
  projects: number;
  expected: number;
  achieved: number;
  /** Crop Parameters record values. */
  maxAttainable: number;
  harvestDuration: number;
  estDaysToHarvest: number;
  baseTemp: number;
  deduction: number;
  note?: string;
  regions: Share[];
  seasons: Share[];
  soils: Share[];
  irrigation: Share[];
}

export const VARIETIES: VarietyRow[] = [
  {
    key: 'kufri_pukhraj', crop: 'potato', label: 'Kufri Pukhraj', code: 'VAR-POT-001',
    seedSource: 'Own multiplication', maturity: 'Early, 90 to 100 days', calibration: 'Calibrated, 3 seasons',
    seasonsOfHistory: 3, plots: 3482, growers: 1910, projects: 14, expected: 28.0, achieved: 26.8,
    maxAttainable: 34.0, harvestDuration: 95, estDaysToHarvest: 100, baseTemp: 7.0, deduction: 4.0,
    note: 'The workhorse variety. Table and seed lots are tracked separately below it.',
    regions: [{ key: 'gujarat', share: 41 }, { key: 'uttar_pradesh', share: 32 }, { key: 'punjab', share: 14 }, { key: 'west_bengal', share: 8 }, { key: 'haryana', share: 5 }],
    seasons: [{ key: 'rabi', share: 93 }, { key: 'spring', share: 7 }],
    soils: [{ key: 'alluvial', share: 55 }, { key: 'sandy_loam', share: 30 }, { key: 'clay_loam', share: 15 }],
    irrigation: [{ key: 'furrow', share: 45 }, { key: 'sprinkler', share: 35 }, { key: 'drip', share: 20 }],
  },
  {
    key: 'kufri_jyoti', crop: 'potato', label: 'Kufri Jyoti', code: 'VAR-POT-002',
    seedSource: 'Own multiplication', maturity: 'Medium, 100 to 110 days', calibration: 'Calibrated, 3 seasons',
    seasonsOfHistory: 3, plots: 1810, growers: 1044, projects: 11, expected: 25.5, achieved: 25.1,
    maxAttainable: 31.0, harvestDuration: 105, estDaysToHarvest: 110, baseTemp: 7.0, deduction: 4.0,
    regions: [{ key: 'uttar_pradesh', share: 48 }, { key: 'punjab', share: 26 }, { key: 'haryana', share: 18 }, { key: 'west_bengal', share: 8 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 70 }, { key: 'sandy_loam', share: 30 }],
    irrigation: [{ key: 'furrow', share: 50 }, { key: 'flood', share: 30 }, { key: 'sprinkler', share: 20 }],
  },
  {
    key: 'kufri_chipsona_1', crop: 'potato', label: 'Kufri Chipsona-1', code: 'VAR-POT-003',
    seedSource: 'Certified purchase', maturity: 'Medium, 100 to 110 days', calibration: 'Calibrated, 3 seasons',
    seasonsOfHistory: 3, plots: 1245, growers: 712, projects: 9, expected: 30.0, achieved: 29.4,
    maxAttainable: 36.0, harvestDuration: 105, estDaysToHarvest: 108, baseTemp: 7.0, deduction: 3.5,
    note: 'Processing variety with the best grade record in the book: 88 percent chips grade A in West Bengal.',
    regions: [{ key: 'west_bengal', share: 46 }, { key: 'gujarat', share: 29 }, { key: 'uttar_pradesh', share: 18 }, { key: 'punjab', share: 7 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 60 }, { key: 'clay_loam', share: 40 }],
    irrigation: [{ key: 'sprinkler', share: 45 }, { key: 'drip', share: 30 }, { key: 'furrow', share: 25 }],
  },
  {
    key: 'lady_rosetta', crop: 'potato', label: 'Lady Rosetta', code: 'VAR-POT-004',
    seedSource: 'Imported certified', maturity: 'Early, 85 to 95 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 964, growers: 505, projects: 7, expected: 32.0, achieved: 27.4,
    maxAttainable: 38.0, harvestDuration: 90, estDaysToHarvest: 95, baseTemp: 7.5, deduction: 3.0,
    note: 'Ran 14.4 percent under expected yield and only 58 percent chips grade A. Both failures trace to heat during bulking, not to two separate problems.',
    regions: [{ key: 'gujarat', share: 70 }, { key: 'maharashtra', share: 22 }, { key: 'karnataka', share: 8 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'sandy_loam', share: 62 }, { key: 'black_cotton', share: 38 }],
    irrigation: [{ key: 'centre_pivot', share: 48 }, { key: 'drip', share: 32 }, { key: 'sprinkler', share: 20 }],
  },
  {
    key: 'santana', crop: 'potato', label: 'Santana', code: 'VAR-POT-005',
    seedSource: 'Imported certified', maturity: 'Medium, 95 to 105 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 412, growers: 233, projects: 4, expected: 31.0, achieved: 28.9,
    maxAttainable: 37.0, harvestDuration: 100, estDaysToHarvest: 104, baseTemp: 7.5, deduction: 3.0,
    note: 'One season of history. Sits on the base model, so the 6.8 percent gap is not yet evidence of anything.',
    regions: [{ key: 'gujarat', share: 82 }, { key: 'maharashtra', share: 18 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'sandy_loam', share: 100 }],
    irrigation: [{ key: 'centre_pivot', share: 60 }, { key: 'drip', share: 40 }],
  },
  {
    key: 'kufri_bahar', crop: 'potato', label: 'Kufri Bahar', code: 'VAR-POT-006',
    seedSource: 'Own multiplication', maturity: 'Late, 110 to 120 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 188, growers: 121, projects: 3, expected: 24.0, achieved: 24.6,
    maxAttainable: 29.0, harvestDuration: 115, estDaysToHarvest: 120, baseTemp: 7.0, deduction: 4.5,
    note: 'The smallest variety in the book and the only one reading above expectation. On one season of history that is noise, not performance.',
    regions: [{ key: 'uttar_pradesh', share: 100 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 100 }],
    irrigation: [{ key: 'flood', share: 100 }],
  },
  {
    key: 'hd_2967', crop: 'wheat', label: 'HD 2967', code: 'VAR-WHT-001',
    seedSource: 'Certified purchase', maturity: 'Medium, 140 to 150 days', calibration: 'Calibrated, 3 seasons',
    seasonsOfHistory: 3, plots: 2960, growers: 1712, projects: 12, expected: 5.4, achieved: 5.2,
    maxAttainable: 6.4, harvestDuration: 145, estDaysToHarvest: 148, baseTemp: 5.0, deduction: 2.0,
    regions: [{ key: 'punjab', share: 52 }, { key: 'haryana', share: 24 }, { key: 'madhya_pradesh', share: 14 }, { key: 'uttar_pradesh', share: 10 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 66 }, { key: 'clay_loam', share: 24 }, { key: 'sandy_loam', share: 10 }],
    irrigation: [{ key: 'canal', share: 44 }, { key: 'sprinkler', share: 31 }, { key: 'flood', share: 25 }],
  },
  {
    key: 'hd_3086', crop: 'wheat', label: 'HD 3086', code: 'VAR-WHT-002',
    seedSource: 'Certified purchase', maturity: 'Medium, 140 to 150 days', calibration: 'Calibrated, 3 seasons',
    seasonsOfHistory: 3, plots: 2140, growers: 1288, projects: 10, expected: 5.6, achieved: 5.5,
    maxAttainable: 6.6, harvestDuration: 145, estDaysToHarvest: 147, baseTemp: 5.0, deduction: 2.0,
    regions: [{ key: 'haryana', share: 46 }, { key: 'punjab', share: 34 }, { key: 'uttar_pradesh', share: 20 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 80 }, { key: 'sandy_loam', share: 20 }],
    irrigation: [{ key: 'canal', share: 65 }, { key: 'flood', share: 35 }],
  },
  {
    key: 'pbw_725', crop: 'wheat', label: 'PBW 725', code: 'VAR-WHT-003',
    seedSource: 'Certified purchase', maturity: 'Late sown, 130 to 140 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 730, growers: 448, projects: 6, expected: 5.2, achieved: 4.9,
    maxAttainable: 6.0, harvestDuration: 135, estDaysToHarvest: 138, baseTemp: 5.0, deduction: 2.5,
    note: 'Grown deliberately late, after paddy harvest. The stage set is the standard wheat one, which is why grain filling reads short here.',
    regions: [{ key: 'punjab', share: 70 }, { key: 'haryana', share: 30 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'alluvial', share: 100 }],
    irrigation: [{ key: 'canal', share: 60 }, { key: 'flood', share: 40 }],
  },
  {
    key: 'durum_sharbati', crop: 'wheat', label: 'Durum Sharbati', code: 'VAR-WHT-004',
    seedSource: 'Own multiplication', maturity: 'Medium, 135 to 145 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 415, growers: 260, projects: 4, expected: 4.8, achieved: 4.4,
    maxAttainable: 5.6, harvestDuration: 140, estDaysToHarvest: 143, baseTemp: 5.5, deduction: 2.5,
    regions: [{ key: 'madhya_pradesh', share: 100 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'black_cotton', share: 100 }],
    irrigation: [{ key: 'rainfed', share: 55 }, { key: 'sprinkler', share: 45 }],
  },
  {
    key: 'pusa_basmati_1121', crop: 'paddy', label: 'Pusa Basmati 1121', code: 'VAR-PDY-001',
    seedSource: 'Certified purchase', maturity: 'Long, 140 to 145 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 2415, growers: 1502, projects: 11, expected: 4.3, achieved: 4.1,
    maxAttainable: 5.2, harvestDuration: 142, estDaysToHarvest: 145, baseTemp: 10.0, deduction: 2.0,
    regions: [{ key: 'punjab', share: 49 }, { key: 'haryana', share: 31 }, { key: 'uttar_pradesh', share: 14 }, { key: 'west_bengal', share: 6 }],
    seasons: [{ key: 'kharif', share: 100 }],
    soils: [{ key: 'alluvial', share: 68 }, { key: 'clay_loam', share: 32 }],
    irrigation: [{ key: 'flood', share: 55 }, { key: 'canal', share: 35 }, { key: 'sprinkler', share: 10 }],
  },
  {
    key: 'pusa_basmati_1509', crop: 'paddy', label: 'Pusa Basmati 1509', code: 'VAR-PDY-002',
    seedSource: 'Certified purchase', maturity: 'Short, 115 to 120 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 1680, growers: 1044, projects: 9, expected: 4.6, achieved: 4.5,
    maxAttainable: 5.4, harvestDuration: 118, estDaysToHarvest: 120, baseTemp: 10.0, deduction: 2.0,
    regions: [{ key: 'haryana', share: 55 }, { key: 'punjab', share: 45 }],
    seasons: [{ key: 'kharif', share: 100 }],
    soils: [{ key: 'alluvial', share: 75 }, { key: 'clay_loam', share: 25 }],
    irrigation: [{ key: 'flood', share: 60 }, { key: 'canal', share: 40 }],
  },
  {
    key: 'swarna', crop: 'paddy', label: 'Swarna', code: 'VAR-PDY-003',
    seedSource: 'Truthful label', maturity: 'Long, 145 to 150 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 1120, growers: 806, projects: 7, expected: 5.8, achieved: 5.6,
    maxAttainable: 6.8, harvestDuration: 147, estDaysToHarvest: 150, baseTemp: 10.0, deduction: 2.5,
    regions: [{ key: 'west_bengal', share: 62 }, { key: 'uttar_pradesh', share: 29 }, { key: 'haryana', share: 9 }],
    seasons: [{ key: 'kharif', share: 100 }],
    soils: [{ key: 'clay_loam', share: 70 }, { key: 'alluvial', share: 30 }],
    irrigation: [{ key: 'flood', share: 70 }, { key: 'canal', share: 30 }],
  },
  {
    key: 'ir_64', crop: 'paddy', label: 'IR 64', code: 'VAR-PDY-004',
    seedSource: 'Truthful label', maturity: 'Medium, 125 to 130 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 645, growers: 470, projects: 5, expected: 5.0, achieved: 4.7,
    maxAttainable: 6.0, harvestDuration: 127, estDaysToHarvest: 130, baseTemp: 10.0, deduction: 2.5,
    regions: [{ key: 'west_bengal', share: 55 }, { key: 'karnataka', share: 45 }],
    seasons: [{ key: 'kharif', share: 72 }, { key: 'zaid', share: 28 }],
    soils: [{ key: 'clay_loam', share: 60 }, { key: 'laterite', share: 40 }],
    irrigation: [{ key: 'flood', share: 65 }, { key: 'canal', share: 35 }],
  },
  {
    key: 'abhinav', crop: 'tomato', label: 'Abhinav', code: 'VAR-TOM-001',
    seedSource: 'Hybrid purchase', maturity: 'Medium, 135 to 145 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 880, growers: 604, projects: 6, expected: 62.0, achieved: 58.5,
    maxAttainable: 78.0, harvestDuration: 140, estDaysToHarvest: 145, baseTemp: 10.0, deduction: 6.0,
    regions: [{ key: 'maharashtra', share: 62 }, { key: 'karnataka', share: 38 }],
    seasons: [{ key: 'zaid', share: 68 }, { key: 'kharif', share: 32 }],
    soils: [{ key: 'black_cotton', share: 58 }, { key: 'red_loam', share: 42 }],
    irrigation: [{ key: 'drip', share: 75 }, { key: 'sprinkler', share: 25 }],
  },
  {
    key: 'namdhari_585', crop: 'tomato', label: 'Namdhari 585', code: 'VAR-TOM-002',
    seedSource: 'Hybrid purchase', maturity: 'Medium, 135 to 145 days', calibration: 'Calibrated, 2 seasons',
    seasonsOfHistory: 2, plots: 640, growers: 441, projects: 5, expected: 65.0, achieved: 63.2,
    maxAttainable: 82.0, harvestDuration: 140, estDaysToHarvest: 143, baseTemp: 10.0, deduction: 6.0,
    note: 'Part of the book runs under protected cultivation, which is why it carries an annual season alongside kharif and rabi.',
    regions: [{ key: 'karnataka', share: 60 }, { key: 'maharashtra', share: 40 }],
    seasons: [{ key: 'kharif', share: 45 }, { key: 'rabi', share: 30 }, { key: 'annual', share: 25 }],
    soils: [{ key: 'red_loam', share: 65 }, { key: 'black_cotton', share: 35 }],
    irrigation: [{ key: 'drip', share: 80 }, { key: 'sprinkler', share: 20 }],
  },
  {
    key: 'heemsohna', crop: 'tomato', label: 'Heemsohna', code: 'VAR-TOM-003',
    seedSource: 'Hybrid purchase', maturity: 'Early, 120 to 130 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 305, growers: 214, projects: 3, expected: 58.0, achieved: 52.9,
    maxAttainable: 72.0, harvestDuration: 125, estDaysToHarvest: 128, baseTemp: 10.0, deduction: 6.5,
    note: 'No disease has been recorded against it yet. That is a reporting gap, not a resistant variety.',
    regions: [{ key: 'maharashtra', share: 100 }],
    seasons: [{ key: 'zaid', share: 100 }],
    soils: [{ key: 'black_cotton', share: 100 }],
    irrigation: [{ key: 'drip', share: 100 }],
  },
  {
    key: 'byadgi_dabbi', crop: 'chilli', label: 'Byadgi Dabbi', code: 'VAR-CHL-001',
    seedSource: 'Own selection', maturity: 'Long, 175 to 185 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 1290, growers: 918, projects: 8, expected: 2.8, achieved: 2.6,
    maxAttainable: 3.6, harvestDuration: 180, estDaysToHarvest: 185, baseTemp: 12.0, deduction: 8.0,
    regions: [{ key: 'karnataka', share: 78 }, { key: 'maharashtra', share: 22 }],
    seasons: [{ key: 'kharif', share: 100 }],
    soils: [{ key: 'red_loam', share: 58 }, { key: 'black_cotton', share: 33 }, { key: 'laterite', share: 9 }],
    irrigation: [{ key: 'rainfed', share: 65 }, { key: 'drip', share: 35 }],
  },
  {
    key: 'teja_s17', crop: 'chilli', label: 'Teja S17', code: 'VAR-CHL-002',
    seedSource: 'Certified purchase', maturity: 'Medium, 165 to 175 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 980, growers: 702, projects: 7, expected: 3.1, achieved: 3.0,
    maxAttainable: 4.0, harvestDuration: 170, estDaysToHarvest: 175, baseTemp: 12.0, deduction: 8.0,
    regions: [{ key: 'karnataka', share: 55 }, { key: 'madhya_pradesh', share: 45 }],
    seasons: [{ key: 'kharif', share: 70 }, { key: 'rabi', share: 30 }],
    soils: [{ key: 'black_cotton', share: 58 }, { key: 'red_loam', share: 42 }],
    irrigation: [{ key: 'rainfed', share: 60 }, { key: 'drip', share: 40 }],
  },
  {
    key: 'sankeshwar_32', crop: 'chilli', label: 'Sankeshwar 32', code: 'VAR-CHL-003',
    seedSource: 'Own selection', maturity: 'Long, 175 to 185 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 260, growers: 190, projects: 3, expected: 2.6, achieved: 2.3,
    maxAttainable: 3.4, harvestDuration: 180, estDaysToHarvest: 186, baseTemp: 12.0, deduction: 8.5,
    regions: [{ key: 'karnataka', share: 100 }],
    seasons: [{ key: 'kharif', share: 100 }],
    soils: [{ key: 'red_loam', share: 100 }],
    irrigation: [{ key: 'rainfed', share: 100 }],
  },
  {
    key: 'pioneer_3396', crop: 'maize', label: 'Pioneer 3396', code: 'VAR-MZE-001',
    seedSource: 'Hybrid purchase', maturity: 'Medium, 110 to 120 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 720, growers: 430, projects: 5, expected: 8.5, achieved: 8.2,
    maxAttainable: 10.5, harvestDuration: 115, estDaysToHarvest: 118, baseTemp: 10.0, deduction: 3.0,
    regions: [{ key: 'madhya_pradesh', share: 60 }, { key: 'karnataka', share: 40 }],
    seasons: [{ key: 'kharif', share: 65 }, { key: 'rabi', share: 35 }],
    soils: [{ key: 'black_cotton', share: 55 }, { key: 'red_loam', share: 45 }],
    irrigation: [{ key: 'rainfed', share: 50 }, { key: 'sprinkler', share: 50 }],
  },
  {
    key: 'dkc_9144', crop: 'maize', label: 'DKC 9144', code: 'VAR-MZE-002',
    seedSource: 'Hybrid purchase', maturity: 'Medium, 110 to 120 days', calibration: 'Base model, 1 season',
    seasonsOfHistory: 1, plots: 480, growers: 291, projects: 4, expected: 8.8, achieved: 8.9,
    maxAttainable: 11.0, harvestDuration: 115, estDaysToHarvest: 117, baseTemp: 10.0, deduction: 3.0,
    regions: [{ key: 'madhya_pradesh', share: 100 }],
    seasons: [{ key: 'rabi', share: 100 }],
    soils: [{ key: 'black_cotton', share: 100 }],
    irrigation: [{ key: 'sprinkler', share: 65 }, { key: 'rainfed', share: 35 }],
  },
];

export interface SubVarietyRow {
  key: string;
  variety: string;
  label: string;
  code: string;
  purpose: string;
  gradeExpectation: string;
  lotHandling: string;
  plots: number;
  growers: number;
  note?: string;
}

/** Where sub varieties exist they partition the parent variety exactly, on both plots and growers. */
export const SUB_VARIETIES: SubVarietyRow[] = [
  { key: 'pukhraj_table_stock', variety: 'kufri_pukhraj', label: 'Pukhraj Table Stock', code: 'SUB-POT-001', purpose: 'Table market', gradeExpectation: '80 percent table grade A', lotHandling: 'Graded and bagged at plot side', plots: 2210, growers: 1210 },
  { key: 'pukhraj_seed_stock', variety: 'kufri_pukhraj', label: 'Pukhraj Seed Stock', code: 'SUB-POT-002', purpose: 'Seed multiplication', gradeExpectation: '90 percent in 25 to 45 mm size', lotHandling: 'Cold stored, lot number tracked', plots: 1272, growers: 700 },
  { key: 'jyoti_seed_stock', variety: 'kufri_jyoti', label: 'Jyoti Seed Stock', code: 'SUB-POT-003', purpose: 'Seed multiplication', gradeExpectation: '88 percent in 25 to 45 mm size', lotHandling: 'Cold stored, foundation class', plots: 1810, growers: 1044 },
  { key: 'chipsona_grade_a_stock', variety: 'kufri_chipsona_1', label: 'Chipsona Grade A Stock', code: 'SUB-POT-004', purpose: 'Processing contract', gradeExpectation: '85 percent chips grade A', lotHandling: 'Direct to processor, dry matter tested', plots: 812, growers: 465 },
  { key: 'chipsona_seed_stock', variety: 'kufri_chipsona_1', label: 'Chipsona Seed Stock', code: 'SUB-POT-005', purpose: 'Seed multiplication', gradeExpectation: 'Breeder class purity', lotHandling: 'Isolated blocks, roguing recorded', plots: 433, growers: 247 },
  { key: 'lr_processing_lot', variety: 'lady_rosetta', label: 'LR Processing Lot', code: 'SUB-POT-006', purpose: 'Processing contract', gradeExpectation: '80 percent chips grade A', lotHandling: 'Direct to processor', plots: 720, growers: 378, note: 'Delivered 58 percent against an 80 percent grade expectation. The grade expectation was never revised after the first season.' },
  { key: 'lr_seed_lot', variety: 'lady_rosetta', label: 'LR Seed Lot', code: 'SUB-POT-007', purpose: 'Seed multiplication', gradeExpectation: '85 percent in 28 to 50 mm size', lotHandling: 'Cold stored', plots: 244, growers: 127 },
  { key: 'hd2967_certified', variety: 'hd_2967', label: 'HD2967 Certified', code: 'SUB-WHT-001', purpose: 'Grain and seed sale', gradeExpectation: 'Mill grade 1 on 75 percent of lots', lotHandling: 'Bulk, certified tag', plots: 1990, growers: 1152 },
  { key: 'hd2967_foundation', variety: 'hd_2967', label: 'HD2967 Foundation', code: 'SUB-WHT-002', purpose: 'Seed multiplication', gradeExpectation: 'Foundation class purity', lotHandling: 'Isolated blocks, field inspection', plots: 970, growers: 560 },
  { key: 'hd3086_certified', variety: 'hd_3086', label: 'HD3086 Certified', code: 'SUB-WHT-003', purpose: 'Grain and seed sale', gradeExpectation: 'Mill grade 1 on 78 percent of lots', lotHandling: 'Bulk, certified tag', plots: 2140, growers: 1288 },
  { key: 'pb1121_export_grade', variety: 'pusa_basmati_1121', label: 'PB1121 Export Grade', code: 'SUB-PDY-001', purpose: 'Export contract', gradeExpectation: 'Grain length 7.2 mm and above', lotHandling: 'Separate drying yard, lot sealed', plots: 1560, growers: 970 },
  { key: 'pb1121_domestic', variety: 'pusa_basmati_1121', label: 'PB1121 Domestic', code: 'SUB-PDY-002', purpose: 'Domestic market', gradeExpectation: 'Domestic grade', lotHandling: 'Bulk', plots: 855, growers: 532 },
  { key: 'pb1509_export_grade', variety: 'pusa_basmati_1509', label: 'PB1509 Export Grade', code: 'SUB-PDY-003', purpose: 'Export contract', gradeExpectation: 'Grain length 7.0 mm and above', lotHandling: 'Separate drying yard', plots: 1680, growers: 1044 },
  { key: 'swarna_truthful_label', variety: 'swarna', label: 'Swarna Truthful Label', code: 'SUB-PDY-004', purpose: 'Seed sale', gradeExpectation: 'Truthful label declaration', lotHandling: 'Bulk, self declared', plots: 1120, growers: 806 },
  { key: 'abhinav_hybrid_f1', variety: 'abhinav', label: 'Abhinav Hybrid F1', code: 'SUB-TOM-001', purpose: 'Table market', gradeExpectation: '75 percent table grade A', lotHandling: 'Crated at plot side', plots: 880, growers: 604 },
  { key: 'byadgi_kaddi', variety: 'byadgi_dabbi', label: 'Byadgi Kaddi', code: 'SUB-CHL-001', purpose: 'Export dry chilli', gradeExpectation: 'Colour value 120 ASTA and above', lotHandling: 'Sun dried, bagged', plots: 690, growers: 491 },
  { key: 'byadgi_dabbi_select', variety: 'byadgi_dabbi', label: 'Byadgi Dabbi Select', code: 'SUB-CHL-002', purpose: 'Oleoresin extraction', gradeExpectation: 'Colour value 140 ASTA and above', lotHandling: 'Sun dried, graded by colour', plots: 600, growers: 427 },
];

/* --------------------------------------------------------------- crop config */

export interface StageRow {
  key: string;
  crop: string;
  label: string;
  order: number;
  days: number;
  cumulative: number;
  gdd: number;
  critical: boolean;
  note?: string;
}

export const STAGES: StageRow[] = [
  { key: 'pot_planting', crop: 'potato', label: 'Planting', order: 1, days: 5, cumulative: 5, gdd: 60, critical: false },
  { key: 'pot_sprouting', crop: 'potato', label: 'Sprouting', order: 2, days: 15, cumulative: 20, gdd: 210, critical: false },
  { key: 'pot_vegetative', crop: 'potato', label: 'Vegetative Growth', order: 3, days: 25, cumulative: 45, gdd: 520, critical: true },
  { key: 'pot_tuber_initiation', crop: 'potato', label: 'Tuber Initiation', order: 4, days: 20, cumulative: 65, gdd: 760, critical: true },
  { key: 'pot_tuber_bulking', crop: 'potato', label: 'Tuber Bulking', order: 5, days: 35, cumulative: 100, gdd: 1180, critical: true, note: 'Configured at 35 days nationally. Observed at 32 in Gujarat and 38 in Uttar Pradesh, so activities anchored here fire early in one and late in the other.' },
  { key: 'pot_maturation', crop: 'potato', label: 'Maturation', order: 6, days: 15, cumulative: 115, gdd: 1350, critical: false },
  { key: 'pot_harvest', crop: 'potato', label: 'Harvest', order: 7, days: 10, cumulative: 125, gdd: 1450, critical: false },

  { key: 'wht_sowing', crop: 'wheat', label: 'Sowing', order: 1, days: 5, cumulative: 5, gdd: 50, critical: false },
  { key: 'wht_germination', crop: 'wheat', label: 'Germination', order: 2, days: 12, cumulative: 17, gdd: 180, critical: false },
  { key: 'wht_tillering', crop: 'wheat', label: 'Tillering', order: 3, days: 30, cumulative: 47, gdd: 520, critical: true },
  { key: 'wht_jointing', crop: 'wheat', label: 'Jointing', order: 4, days: 20, cumulative: 67, gdd: 760, critical: false },
  { key: 'wht_booting', crop: 'wheat', label: 'Booting', order: 5, days: 18, cumulative: 85, gdd: 980, critical: true },
  { key: 'wht_grain_filling', crop: 'wheat', label: 'Grain Filling', order: 6, days: 30, cumulative: 115, gdd: 1420, critical: true, note: 'Runs 13 percent short in Punjab and 20 percent short in Madhya Pradesh. Terminal heat, not a configuration error, but the configuration has not been adjusted for it.' },
  { key: 'wht_harvest', crop: 'wheat', label: 'Harvest', order: 7, days: 10, cumulative: 125, gdd: 1550, critical: false },

  { key: 'pdy_nursery', crop: 'paddy', label: 'Nursery', order: 1, days: 21, cumulative: 21, gdd: 260, critical: false },
  { key: 'pdy_transplanting', crop: 'paddy', label: 'Transplanting', order: 2, days: 7, cumulative: 28, gdd: 340, critical: false },
  { key: 'pdy_tillering', crop: 'paddy', label: 'Tillering', order: 3, days: 30, cumulative: 58, gdd: 700, critical: true },
  { key: 'pdy_panicle_initiation', crop: 'paddy', label: 'Panicle Initiation', order: 4, days: 20, cumulative: 78, gdd: 950, critical: true },
  { key: 'pdy_flowering', crop: 'paddy', label: 'Flowering', order: 5, days: 15, cumulative: 93, gdd: 1160, critical: true },
  { key: 'pdy_grain_filling', crop: 'paddy', label: 'Grain Filling', order: 6, days: 25, cumulative: 118, gdd: 1450, critical: false },
  { key: 'pdy_harvest', crop: 'paddy', label: 'Harvest', order: 7, days: 12, cumulative: 130, gdd: 1600, critical: false },

  { key: 'tom_sowing', crop: 'tomato', label: 'Sowing', order: 1, days: 6, cumulative: 6, gdd: 70, critical: false },
  { key: 'tom_transplanting', crop: 'tomato', label: 'Transplanting', order: 2, days: 22, cumulative: 28, gdd: 330, critical: false },
  { key: 'tom_vegetative', crop: 'tomato', label: 'Vegetative', order: 3, days: 25, cumulative: 53, gdd: 620, critical: false },
  { key: 'tom_flowering', crop: 'tomato', label: 'Flowering', order: 4, days: 18, cumulative: 71, gdd: 840, critical: true },
  { key: 'tom_fruit_set', crop: 'tomato', label: 'Fruit Set', order: 5, days: 15, cumulative: 86, gdd: 1010, critical: true },
  { key: 'tom_fruit_development', crop: 'tomato', label: 'Fruit Development', order: 6, days: 30, cumulative: 116, gdd: 1380, critical: true },
  { key: 'tom_harvest', crop: 'tomato', label: 'Harvest', order: 7, days: 25, cumulative: 141, gdd: 1650, critical: false },

  { key: 'chl_nursery', crop: 'chilli', label: 'Nursery', order: 1, days: 30, cumulative: 30, gdd: 360, critical: false },
  { key: 'chl_transplanting', crop: 'chilli', label: 'Transplanting', order: 2, days: 10, cumulative: 40, gdd: 480, critical: false },
  { key: 'chl_vegetative', crop: 'chilli', label: 'Vegetative', order: 3, days: 35, cumulative: 75, gdd: 900, critical: false },
  { key: 'chl_flowering', crop: 'chilli', label: 'Flowering', order: 4, days: 25, cumulative: 100, gdd: 1200, critical: true },
  { key: 'chl_fruit_development', crop: 'chilli', label: 'Fruit Development', order: 5, days: 45, cumulative: 145, gdd: 1750, critical: true },
  { key: 'chl_harvest', crop: 'chilli', label: 'Harvest', order: 6, days: 35, cumulative: 180, gdd: 2150, critical: false },

  { key: 'mze_sowing', crop: 'maize', label: 'Sowing', order: 1, days: 5, cumulative: 5, gdd: 60, critical: false },
  { key: 'mze_emergence', crop: 'maize', label: 'Emergence', order: 2, days: 12, cumulative: 17, gdd: 200, critical: false },
  { key: 'mze_vegetative', crop: 'maize', label: 'Vegetative V6 to V12', order: 3, days: 33, cumulative: 50, gdd: 620, critical: true },
  { key: 'mze_tasselling', crop: 'maize', label: 'Tasselling', order: 4, days: 18, cumulative: 68, gdd: 840, critical: true },
  { key: 'mze_grain_filling', crop: 'maize', label: 'Grain Filling', order: 5, days: 35, cumulative: 103, gdd: 1280, critical: true },
  { key: 'mze_harvest', crop: 'maize', label: 'Harvest', order: 6, days: 12, cumulative: 115, gdd: 1420, critical: false },
];

export interface SowingWindowRow {
  key: string;
  crop: string;
  region: string;
  season: string;
  ideal: string;
  outer: string;
  cost: string;
  plots: number;
}

export const SOWING_WINDOWS: SowingWindowRow[] = [
  { key: 'sw_potato_gujarat_rabi', crop: 'potato', region: 'gujarat', season: 'rabi', ideal: '20 Oct to 10 Nov', outer: '10 Oct to 25 Nov', cost: 'Each week late costs about 0.9 t/ha, because bulking is pushed into February heat', plots: 2140 },
  { key: 'sw_potato_uttar_pradesh_rabi', crop: 'potato', region: 'uttar_pradesh', season: 'rabi', ideal: '25 Oct to 15 Nov', outer: '15 Oct to 30 Nov', cost: 'Each week late costs about 0.6 t/ha', plots: 1810 },
  { key: 'sw_potato_west_bengal_rabi', crop: 'potato', region: 'west_bengal', season: 'rabi', ideal: '05 Nov to 25 Nov', outer: '28 Oct to 05 Dec', cost: 'Sowing before the window raises late blight exposure sharply', plots: 1245 },
  { key: 'sw_potato_punjab_rabi', crop: 'potato', region: 'punjab', season: 'rabi', ideal: '15 Oct to 05 Nov', outer: '05 Oct to 20 Nov', cost: 'Each week late costs about 0.7 t/ha', plots: 980 },
  { key: 'sw_wheat_punjab_rabi', crop: 'wheat', region: 'punjab', season: 'rabi', ideal: '01 Nov to 20 Nov', outer: '25 Oct to 30 Nov', cost: 'Each week past 30 Nov costs roughly 0.15 t/ha to terminal heat', plots: 2960 },
  { key: 'sw_wheat_haryana_rabi', crop: 'wheat', region: 'haryana', season: 'rabi', ideal: '05 Nov to 25 Nov', outer: '28 Oct to 05 Dec', cost: 'Each week past the window costs roughly 0.14 t/ha', plots: 2140 },
  { key: 'sw_wheat_madhya_pradesh_rabi', crop: 'wheat', region: 'madhya_pradesh', season: 'rabi', ideal: '10 Nov to 30 Nov', outer: '01 Nov to 10 Dec', cost: 'Grain filling collapses on late sowing here; observed 20 percent short', plots: 730 },
  { key: 'sw_paddy_punjab_kharif', crop: 'paddy', region: 'punjab', season: 'kharif', ideal: '20 Jun to 10 Jul', outer: '10 Jun to 20 Jul', cost: 'Early transplanting breaches the state water calendar', plots: 2415 },
  { key: 'sw_paddy_haryana_kharif', crop: 'paddy', region: 'haryana', season: 'kharif', ideal: '25 Jun to 15 Jul', outer: '15 Jun to 25 Jul', cost: 'Late transplanting runs grain filling into cool nights', plots: 1680 },
  { key: 'sw_paddy_west_bengal_kharif', crop: 'paddy', region: 'west_bengal', season: 'kharif', ideal: '15 Jun to 05 Jul', outer: '05 Jun to 15 Jul', cost: 'Late transplanting collides with the flood window', plots: 1120 },
  { key: 'sw_tomato_maharashtra_zaid', crop: 'tomato', region: 'maharashtra', season: 'zaid', ideal: '01 Feb to 20 Feb', outer: '25 Jan to 28 Feb', cost: 'Fruit set moves into 38 C days and aborts; observed 11 percent yield gap', plots: 880 },
  { key: 'sw_tomato_karnataka_kharif', crop: 'tomato', region: 'karnataka', season: 'kharif', ideal: '01 Jul to 20 Jul', outer: '20 Jun to 31 Jul', cost: 'Late planting raises leaf curl virus pressure', plots: 640 },
  { key: 'sw_chilli_karnataka_kharif', crop: 'chilli', region: 'karnataka', season: 'kharif', ideal: '10 Jun to 30 Jun', outer: '01 Jun to 10 Jul', cost: 'Nursery raised late misses the first monsoon flush', plots: 1290 },
  { key: 'sw_maize_madhya_pradesh_kharif', crop: 'maize', region: 'madhya_pradesh', season: 'kharif', ideal: '20 Jun to 10 Jul', outer: '10 Jun to 20 Jul', cost: 'Tasselling in peak rain reduces pollination', plots: 720 },
];

export interface SeedGradeRow {
  key: string;
  label: string;
  class: string;
  purity: string;
  certification: string;
  usedAt: string;
}

export const SEED_GRADES: SeedGradeRow[] = [
  { key: 'breeder', label: 'Breeder', class: 'Breeder seed', purity: '99.9 percent', certification: 'Breeder institution tag', usedAt: 'Isolated multiplication blocks only' },
  { key: 'foundation', label: 'Foundation', class: 'Foundation seed', purity: '99.5 percent', certification: 'White tag, state certification', usedAt: 'Seed multiplication plots' },
  { key: 'certified', label: 'Certified', class: 'Certified seed', purity: '99.0 percent', certification: 'Blue tag, state certification', usedAt: 'Commercial production plots' },
  { key: 'truthful_label', label: 'Truthful Label', class: 'Truthfully labelled', purity: 'Self declared', certification: 'Producer declaration only', usedAt: 'Farmer saved and local exchange' },
];

export interface HarvestGradeRow {
  key: string;
  crop: string;
  label: string;
  spec: string;
  threshold: string;
  contract: string;
  note?: string;
}

export const HARVEST_GRADES: HarvestGradeRow[] = [
  { key: 'chips_grade_a', crop: 'potato', label: 'Chips Grade A', spec: 'Dry matter 20 percent and above, 40 to 75 mm, no greening', threshold: '80 percent of lot', contract: 'Processing contract' },
  { key: 'table_grade_a', crop: 'potato', label: 'Table Grade A', spec: '55 to 75 mm, clean skin, no mechanical damage', threshold: '75 percent of lot', contract: 'Table market' },
  { key: 'table_grade_b', crop: 'potato', label: 'Table Grade B', spec: '35 to 55 mm, minor blemish permitted', threshold: 'Balance of lot', contract: 'Table market', note: 'Configured but never recorded against a variety. Grade splits are being entered against grade A only.' },
  { key: 'seed_size_25_45', crop: 'potato', label: 'Seed Size 25 to 45 mm', spec: '25 to 45 mm, sprout free at grading', threshold: '85 percent of lot', contract: 'Seed multiplication' },
  { key: 'undersize_reject', crop: 'potato', label: 'Undersize Reject', spec: 'Below 35 mm or damaged', threshold: 'Below 10 percent of lot', contract: 'Not sold', note: 'Configured but never recorded. Rejection is being captured as a deduction percentage instead, which loses the reason.' },
  { key: 'mill_grade_1', crop: 'wheat', label: 'Mill Grade 1', spec: 'Protein 11.5 percent and above, moisture below 12 percent', threshold: '75 percent of lot', contract: 'Miller contract' },
  { key: 'mill_grade_2', crop: 'wheat', label: 'Mill Grade 2', spec: 'Protein 10 to 11.5 percent', threshold: 'Balance of lot', contract: 'Miller contract' },
  { key: 'export_basmati', crop: 'paddy', label: 'Export Grade Basmati', spec: 'Grain length 7.2 mm and above, moisture below 13 percent', threshold: '70 percent of lot', contract: 'Export contract' },
  { key: 'domestic_grade', crop: 'paddy', label: 'Domestic Grade', spec: 'Grain length below 7.2 mm', threshold: 'Balance of lot', contract: 'Domestic market' },
  { key: 'table_grade_a_tom', crop: 'tomato', label: 'Table Grade A', spec: 'Firm, 60 to 90 g, uniform colour', threshold: '75 percent of lot', contract: 'Table market' },
  { key: 'processing_grade', crop: 'tomato', label: 'Processing Grade', spec: 'Brix 4.5 and above', threshold: '70 percent of lot', contract: 'Processing contract' },
  { key: 'export_dry_grade', crop: 'chilli', label: 'Export Dry Grade', spec: 'Colour value 120 ASTA and above, aflatoxin within limit', threshold: '80 percent of lot', contract: 'Export contract' },
];

/**
 * `graded by` links. Crop level links declare availability and carry no weight; variety and sub variety
 * links carry usage. A variety delegates to its sub varieties where they exist, so no plot is counted at
 * two levels of the hierarchy.
 */
export const GRADE_USAGE: Array<{ from: string; fromKind: 'variety' | 'sub_variety'; to: string; toKind: 'harvest_grade' | 'seed_grade' }> = [
  { from: 'santana', fromKind: 'variety', to: 'chips_grade_a', toKind: 'harvest_grade' },
  { from: 'kufri_bahar', fromKind: 'variety', to: 'table_grade_a', toKind: 'harvest_grade' },
  { from: 'pbw_725', fromKind: 'variety', to: 'mill_grade_1', toKind: 'harvest_grade' },
  { from: 'durum_sharbati', fromKind: 'variety', to: 'mill_grade_2', toKind: 'harvest_grade' },
  { from: 'ir_64', fromKind: 'variety', to: 'domestic_grade', toKind: 'harvest_grade' },
  { from: 'namdhari_585', fromKind: 'variety', to: 'table_grade_a_tom', toKind: 'harvest_grade' },
  { from: 'heemsohna', fromKind: 'variety', to: 'processing_grade', toKind: 'harvest_grade' },
  { from: 'teja_s17', fromKind: 'variety', to: 'export_dry_grade', toKind: 'harvest_grade' },
  { from: 'sankeshwar_32', fromKind: 'variety', to: 'export_dry_grade', toKind: 'harvest_grade' },
  { from: 'santana', fromKind: 'variety', to: 'certified', toKind: 'seed_grade' },
  { from: 'kufri_bahar', fromKind: 'variety', to: 'truthful_label', toKind: 'seed_grade' },
  { from: 'pbw_725', fromKind: 'variety', to: 'certified', toKind: 'seed_grade' },
  { from: 'durum_sharbati', fromKind: 'variety', to: 'certified', toKind: 'seed_grade' },
  { from: 'ir_64', fromKind: 'variety', to: 'truthful_label', toKind: 'seed_grade' },
  { from: 'pioneer_3396', fromKind: 'variety', to: 'certified', toKind: 'seed_grade' },
  { from: 'chipsona_grade_a_stock', fromKind: 'sub_variety', to: 'chips_grade_a', toKind: 'harvest_grade' },
  { from: 'lr_processing_lot', fromKind: 'sub_variety', to: 'chips_grade_a', toKind: 'harvest_grade' },
  { from: 'pukhraj_table_stock', fromKind: 'sub_variety', to: 'table_grade_a', toKind: 'harvest_grade' },
  { from: 'pb1121_export_grade', fromKind: 'sub_variety', to: 'export_basmati', toKind: 'harvest_grade' },
  { from: 'pukhraj_seed_stock', fromKind: 'sub_variety', to: 'certified', toKind: 'seed_grade' },
  { from: 'jyoti_seed_stock', fromKind: 'sub_variety', to: 'foundation', toKind: 'seed_grade' },
  { from: 'swarna_truthful_label', fromKind: 'sub_variety', to: 'truthful_label', toKind: 'seed_grade' },
  { from: 'chipsona_seed_stock', fromKind: 'sub_variety', to: 'breeder', toKind: 'seed_grade' },
];
