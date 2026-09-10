import { GroundedCitation } from '../types';
import { parseCSVRow } from './foodCsvParser';

export interface MicronutrientFoodItem {
  foodName: string;
  category: string;
  iron: number;
  b12: number;
  calcium: number;
  vitD: number;
  vitC: number;
  folate: number;
}

export interface NutrientFileConfig {
  nutrientKey: 'iron' | 'calcium' | 'b12' | 'vitC' | 'vitD' | 'folate';
  fileName: string;
  displayName: string;
  unit: string;
  primaryField: keyof Omit<MicronutrientFoodItem, 'foodName' | 'category'>;
}

export const NUTRIENT_FILE_CONFIGS: Record<string, NutrientFileConfig> = {
  iron: {
    nutrientKey: 'iron',
    fileName: 'iron rich foods - iron rich foods.csv',
    displayName: 'Iron',
    unit: 'mg',
    primaryField: 'iron',
  },
  calcium: {
    nutrientKey: 'calcium',
    fileName: 'calcium rich foods - calcium rich foods.csv',
    displayName: 'Calcium',
    unit: 'mg',
    primaryField: 'calcium',
  },
  b12: {
    nutrientKey: 'b12',
    fileName: 'vit b12 foods - b12 top foods.csv',
    displayName: 'Vitamin B12',
    unit: 'µg',
    primaryField: 'b12',
  },
  vitC: {
    nutrientKey: 'vitC',
    fileName: 'vit c rich foods - vit c rich foods.csv',
    displayName: 'Vitamin C',
    unit: 'mg',
    primaryField: 'vitC',
  },
  vitD: {
    nutrientKey: 'vitD',
    fileName: 'vit d rich foods - vit d rich foods.csv',
    displayName: 'Vitamin D',
    unit: 'µg',
    primaryField: 'vitD',
  },
  folate: {
    nutrientKey: 'folate',
    fileName: 'folate rich - Sheet1.csv',
    displayName: 'Folate',
    unit: 'µg',
    primaryField: 'folate',
  },
};

const cachedNutrientFiles: Record<string, MicronutrientFoodItem[]> = {};

export function cleanFoodDisplayName(rawName: string): string {
  let n = rawName.replace(/^"|"$/g, '').trim();
  const lower = n.toLowerCase();

  if (lower.includes('thyme')) return 'Thyme (Dried)';
  if (lower.includes('basil')) return 'Basil (Dried)';
  if (lower.includes('spearmint')) return 'Spearmint (Dried)';
  if (lower.includes('marjoram')) return 'Marjoram (Dried)';
  if (lower.includes('whale')) return 'Beluga Whale Meat (Dried)';
  if (lower.includes('ralston')) return 'Ralston Enriched Wheat Bran Flakes';
  if (lower.includes('oatmeal') && lower.includes('honey')) return 'Babyfood Oatmeal Cereal with Honey (Dry)';
  if (lower.includes('oatmeal') && (lower.includes('fort') || lower.includes('dry'))) return 'Babyfood Oatmeal Cereal (Dry Fortified)';
  if (lower.includes('seaweed')) return 'Seaweed (Emi-Tsunomata, Dry)';
  if (lower.includes('cumin')) return 'Cumin Seed';
  if (lower.includes('kellogg') && lower.includes('all-bran')) return "Kellogg's All-Bran Complete Wheat Flakes";
  if (lower.includes('whl grain total')) return 'General Mills Whole Grain Total Cereal';
  if (lower.includes('total raisin bran')) return 'General Mills Total Raisin Bran Cereal';
  if (lower.includes('tofu')) return 'Tofu (Dried-Frozen, Koyadofu)';
  if (lower.includes('savory')) return 'Savory (Ground)';
  if (lower.includes('whey')) return 'Acid Whey (Dried)';
  if (lower.includes('dill')) return 'Dill Weed (Dried)';
  if (lower.includes('celery seed')) return 'Celery Seed';
  if (lower.includes('sage')) return 'Sage (Ground)';
  if (lower.includes('sisymbrium')) return 'Sisymbrium Seeds (Dried)';
  if (lower.includes('smelt')) return 'Smelt Fish (Dried)';
  if (lower.includes('clam')) return 'Clams (Cooked, Moist Heat)';
  if (lower.includes('beef') && lower.includes('liver') && lower.includes('bld')) return 'Beef Liver (Cooked, Boiled)';
  if (lower.includes('beef') && lower.includes('liver') && lower.includes('pan-fried')) return 'Beef Liver (Cooked, Pan-Fried)';
  if (lower.includes('beef') && lower.includes('liver') && lower.includes('brsd')) return 'Beef Liver (Cooked, Braised)';
  if (lower.includes('beef') && lower.includes('liver')) return 'Beef Liver (Raw)';
  if (lower.includes('lamb') && lower.includes('liver') && lower.includes('pan-fried')) return 'Lamb Liver (Cooked, Pan-Fried)';
  if (lower.includes('lamb') && lower.includes('liver') && lower.includes('braised')) return 'Lamb Liver (Cooked, Braised)';
  if (lower.includes('lamb') && lower.includes('liver') && lower.includes('fried')) return 'Lamb Liver (Cooked, Fried)';
  if (lower.includes('lamb') && lower.includes('liver')) return 'Lamb Liver (Raw)';
  if (lower.includes('lamb') && lower.includes('kidney')) return 'Lamb Kidneys (Cooked, Braised)';
  if (lower.includes('veal') && lower.includes('liver') && lower.includes('braised')) return 'Veal Liver (Cooked, Braised)';
  if (lower.includes('veal') && lower.includes('liver') && lower.includes('pan-fried')) return 'Veal Liver (Cooked, Pan-Fried)';
  if (lower.includes('veal') && lower.includes('liver')) return 'Veal Liver (Raw)';
  if (lower.includes('cod liver')) return 'Cod Liver Oil';
  if (lower.includes('crimini') || (lower.includes('mushroom') && lower.includes('brown'))) return 'Crimini Mushrooms (UV-Exposed, Raw)';
  if (lower.includes('portabella')) return 'Portabella Mushrooms (UV-Exposed, Raw)';
  if (lower.includes('maitake')) return 'Maitake Mushrooms (Raw)';
  if (lower.includes('halibut')) return 'Greenland Halibut (Raw)';
  if (lower.includes('mushroom') && lower.includes('white')) return 'White Mushrooms (UV-Exposed, Raw)';
  if (lower.includes('mackerel')) return 'Salted Mackerel';
  if (lower.includes('carp')) return 'Carp (Raw)';
  if (lower.includes('eel')) return 'Eel (Raw)';
  if (lower.includes('salmon') && lower.includes('wo/ skn')) return 'Sockeye Salmon (Canned, Drained)';
  if (lower.includes('salmon') && lower.includes('cnd,drnd')) return 'Sockeye Salmon (Canned)';
  if (lower.includes('salmon') && lower.includes('total can')) return 'Sockeye Salmon (Total Can Contents)';
  if (lower.includes('salmon') && lower.includes('smoked')) return 'Chinook Salmon (Smoked)';
  if (lower.includes('salmon')) return 'Sockeye Salmon (Cooked, Dry Heat)';
  if (lower.includes('trout')) return 'Rainbow Trout (Cooked)';
  if (lower.includes('garam masala')) return 'Garam Masala';
  if (lower.includes('amaranth ladoo') || lower.includes('rajgira')) return 'Amaranth Ladoo (Rajgira Ladoo)';
  if (lower.includes('mustard seeds')) return 'Mustard Seeds Tadka (Baghar)';
  if (lower.includes('sesame ladoo') || lower.includes('til ke')) return 'Sesame Ladoo (Til ke Ladoo)';
  if (lower.includes('finger millet') || lower.includes('ragi biscuit')) return 'Finger Millet Biscuit (Ragi Biscuit)';
  if (lower.includes('yeast extract')) return 'Yeast Extract Spread';
  if (lower.includes('cap\'n crunch')) return "Quaker Cap'n Crunch w/ Crunchberries";
  if (lower.includes('yardlong')) return 'Yardlong Beans (Raw)';
  if (lower.includes('mothbeans')) return 'Mothbeans (Raw)';
  if (lower.includes('cowpeas')) return 'Cowpeas / Catjang (Raw)';
  if (lower.includes('mung')) return 'Mung Beans (Raw)';
  if (lower.includes('chicken') && lower.includes('liver')) return 'Chicken Liver (Raw)';
  if (lower.includes('chickpeas') || lower.includes('garbanzo')) return 'Chickpeas / Bengal Gram (Raw)';
  if (lower.includes('peanut butter')) return 'Peanut Butter (Fortified)';
  if (lower.includes('peppers') && (lower.includes('sweet') || lower.includes('swt'))) return 'Sweet Green Peppers (Freeze-Dried)';
  if (lower.includes('acerola')) return 'Acerola / West Indian Cherry (Raw)';
  if (lower.includes('chives')) return 'Chives (Freeze-Dried)';
  if (lower.includes('coriander')) return 'Coriander Leaf (Dried)';
  if (lower.includes('rose hips')) return 'Wild Rose Hips';
  if (lower.includes('appl,carrot')) return 'Babyfood Apple, Carrot & Squash';
  if (lower.includes('orange-flavor')) return 'Orange Drink Mix (Fortified Powder)';
  if (lower.includes('fruit-flav drk')) return 'Fruit Drink Mix (High Vitamin C Powder)';
  if (lower.includes('tea,grn')) return 'Instant Green Tea Lemon (Fortified)';
  if (lower.includes('fruit-flavored drk')) return 'Fruit-Flavored Drink Mix (Powder)';
  if (lower.includes('gelatin dssrt')) return 'Gelatin Dessert Mix (Added Vitamin C)';
  if (lower.includes('snicke marath') || lower.includes('formul bar')) return 'Fortified Energy Snack Bar';
  if (lower.includes('candy rolls')) return 'Yogurt-Covered Fruit Rolls';
  if (lower.includes('rice w/ pears')) return 'Babyfood Rice Cereal with Pears & Apple';

  return n
    .replace(/\s+/g, ' ')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(', ');
}

export function categorizeFood(cleanName: string, rawName: string): string {
  const n = (cleanName + ' ' + rawName).toLowerCase();

  // Herbs & Spices
  if (
    n.includes('thyme') ||
    n.includes('basil') ||
    n.includes('spearmint') ||
    n.includes('marjoram') ||
    n.includes('cumin') ||
    n.includes('savory') ||
    n.includes('dill') ||
    n.includes('celery seed') ||
    n.includes('sage') ||
    n.includes('chive') ||
    n.includes('coriander') ||
    n.includes('garam masala') ||
    n.includes('mustard seed') ||
    n.includes('spices')
  ) {
    return 'Herbs & Spices';
  }

  // Meat & Seafood (prioritize before cereals/other)
  if (
    n.includes('whale') ||
    n.includes('clam') ||
    n.includes('beef') ||
    n.includes('lamb') ||
    n.includes('veal') ||
    n.includes('liver') ||
    n.includes('kidney') ||
    n.includes('smelt') ||
    n.includes('fish') ||
    n.includes('salmon') ||
    n.includes('halibut') ||
    n.includes('mackerel') ||
    n.includes('carp') ||
    n.includes('eel') ||
    n.includes('trout') ||
    n.includes('chicken') ||
    n.includes('meat')
  ) {
    return 'Meat & Seafood';
  }

  // Fortified Cereals
  if (
    n.includes('cereal') ||
    n.includes('crl') ||
    n.includes('bran') ||
    n.includes('oatmeal') ||
    n.includes("cap'n crunch") ||
    n.includes('biscuit') ||
    n.includes('wheat flakes') ||
    n.includes('total')
  ) {
    return 'Fortified Cereals';
  }

  // Legumes, Seeds & Nuts
  if (
    n.includes('bean') ||
    n.includes('mothbean') ||
    n.includes('cowpea') ||
    n.includes('mung') ||
    n.includes('chickpea') ||
    n.includes('tofu') ||
    n.includes('peanut') ||
    n.includes('sesame') ||
    n.includes('amaranth') ||
    n.includes('seed')
  ) {
    return 'Legumes, Seeds & Nuts';
  }

  // Vegetables & Fruits
  if (
    n.includes('pepper') ||
    n.includes('acerola') ||
    n.includes('mushroom') ||
    n.includes('rose hip') ||
    n.includes('carrot') ||
    n.includes('appl')
  ) {
    return 'Vegetables & Fruits';
  }

  return 'Other';
}

function parseNumber(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

export async function fetchAndParseNutrientCsv(config: NutrientFileConfig): Promise<MicronutrientFoodItem[]> {
  if (cachedNutrientFiles[config.nutrientKey] && cachedNutrientFiles[config.nutrientKey].length > 0) {
    return cachedNutrientFiles[config.nutrientKey];
  }

  try {
    const encodedUri = `/${encodeURIComponent(config.fileName)}`;
    const res = await fetch(encodedUri);
    if (!res.ok) {
      throw new Error(`Failed to load ${config.fileName} (${res.status})`);
    }

    const csvText = await res.text();
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];

    const items: MicronutrientFoodItem[] = [];
    const seenNames = new Set<string>();

    // Header: food_name,iron_mg_100g,b12_mcg_100g,calcium_mg_100g,vit_d_mcg_100g,vit_c_mg_100g,folate_dfe_mcg_100g
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = parseCSVRow(line, ',');
      if (cols.length < 2) continue;

      const cleanName = cleanFoodDisplayName(cols[0]);
      const category = categorizeFood(cleanName, cols[0]);
      const iron = parseNumber(cols[1]);
      const b12 = parseNumber(cols[2]);
      const calcium = parseNumber(cols[3]);
      const vitD = parseNumber(cols[4]);
      const vitC = parseNumber(cols[5]);
      const folate = parseNumber(cols[6]);

      // Deduplicate exact same clean food name within the same dataset
      const dedupeKey = `${cleanName}-${category}`;
      if (seenNames.has(dedupeKey)) continue;
      seenNames.add(dedupeKey);

      if (cleanName) {
        items.push({
          foodName: cleanName,
          category,
          iron,
          b12,
          calcium,
          vitD,
          vitC,
          folate,
        });
      }
    }

    // Sort descending by primary nutrient field
    items.sort((a, b) => (b[config.primaryField] || 0) - (a[config.primaryField] || 0));

    cachedNutrientFiles[config.nutrientKey] = items;
    return items;
  } catch (err) {
    console.error(`Error loading CSV for ${config.fileName}:`, err);
    return [];
  }
}

export function detectNutrientFromFileQuery(
  rawQuery: string
): 'iron' | 'calcium' | 'b12' | 'vitC' | 'vitD' | 'folate' {
  const query = rawQuery.toLowerCase().trim();

  // Calcium check
  if (
    query.includes('calcium') ||
    query.includes('cal ') ||
    query.includes('ca ') ||
    query.includes('bone') ||
    query.includes('hypocalcemia') ||
    query.includes('osteopenia')
  ) {
    return 'calcium';
  }

  // B12 check
  if (
    query.includes('b12') ||
    query.includes('b-12') ||
    query.includes('cobalamin') ||
    query.includes('cyanocobalamin') ||
    query.includes('methylcobalamin')
  ) {
    return 'b12';
  }

  // Vit C check
  if (
    query.includes('vit c') ||
    query.includes('vitc') ||
    query.includes('vitamin c') ||
    query.includes('ascorbic') ||
    query.includes('citrus')
  ) {
    return 'vitC';
  }

  // Vit D check
  if (
    query.includes('vit d') ||
    query.includes('vitd') ||
    query.includes('vitamin d') ||
    query.includes('cholecalciferol') ||
    query.includes('ergocalciferol') ||
    query.includes('rickets')
  ) {
    return 'vitD';
  }

  // Folate check
  if (query.includes('folate') || query.includes('folic') || query.includes('b9')) {
    return 'folate';
  }

  // Default to iron
  return 'iron';
}

/**
 * Returns ONLY a structured, categorized list followed by a simple comparison table.
 * Strictly avoids disclaimers, medical warnings, citations, URLs, external website references, or "Next Actions" buttons.
 */
export async function generateMicronutrientCsvResponse(rawQuery: string): Promise<{
  text: string;
  citations: GroundedCitation[];
}> {
  const nutrientKey = detectNutrientFromFileQuery(rawQuery);
  const config = NUTRIENT_FILE_CONFIGS[nutrientKey];
  const items = await fetchAndParseNutrientCsv(config);

  // Group food items logically by category
  const categoryOrder = [
    'Herbs & Spices',
    'Fortified Cereals',
    'Meat & Seafood',
    'Legumes, Seeds & Nuts',
    'Vegetables & Fruits',
    'Other',
  ];

  const grouped: Record<string, MicronutrientFoodItem[]> = {};
  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  }

  // Build the structured categorized list
  let categorizedListText = `### ${config.displayName}-Rich Foods\n\n`;

  // Sort categories according to preferred categoryOrder, then any other category
  const existingCategories = Object.keys(grouped).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
  });

  for (const cat of existingCategories) {
    const catItems = grouped[cat];
    categorizedListText += `#### ${cat}\n`;
    for (const item of catItems) {
      const primaryVal = item[config.primaryField];
      categorizedListText += `- **${item.foodName}**: ${primaryVal} ${config.unit} per 100g\n`;
    }
    categorizedListText += `\n`;
  }

  // Return ONLY the structured, categorized list with no summary matrix table, disclaimers, warnings, citations, or next action buttons
  const text = categorizedListText.trim();

  return {
    text,
    citations: [],
  };
}
