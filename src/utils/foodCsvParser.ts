import { CuratedFood } from '../data/foodDatabase';

export interface ParseResult {
  foods: CuratedFood[];
  totalRows: number;
  parsedCount: number;
  skippedCount: number;
  detectedHeaders: string[];
  delimiter: string;
}

/**
 * Universal CSV parser capable of processing 13k - 50k+ rows with diverse nutritional column schemas
 */
export function parseFoodCSV(csvText: string): CuratedFood[] {
  const result = parseFoodCSVWithStats(csvText);
  return result.foods;
}

export function parseFoodCSVWithStats(csvText: string): ParseResult {
  if (!csvText || !csvText.trim()) {
    return {
      foods: [],
      totalRows: 0,
      parsedCount: 0,
      skippedCount: 0,
      detectedHeaders: [],
      delimiter: ',',
    };
  }

  // Detect delimiter: comma, tab, or semicolon
  const firstLines = csvText.slice(0, 3000).split(/\r?\n/).filter(Boolean);
  const sampleLine = firstLines[0] || '';
  const commaCount = (sampleLine.match(/,/g) || []).length;
  const semiCount = (sampleLine.match(/;/g) || []).length;
  const tabCount = (sampleLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';
  else if (semiCount > commaCount) delimiter = ';';

  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) {
    return {
      foods: [],
      totalRows: 0,
      parsedCount: 0,
      skippedCount: 0,
      detectedHeaders: [],
      delimiter,
    };
  }

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const rawHeaders = parseCSVRow(lines[0], delimiter);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  // Comprehensive column index detection
  const nameIdx = headers.findIndex(
    (h) =>
      h.includes('food') ||
      h.includes('name') ||
      h.includes('item') ||
      h.includes('desc') ||
      h.includes('shrt_desc') ||
      h.includes('long_desc') ||
      h.includes('title') ||
      h.includes('product')
  );

  const ironIdx = headers.findIndex(
    (h) =>
      (h.includes('iron') || h.includes('fe_') || h.includes('fe ') || h === 'fe' || h.includes('(fe)')) &&
      !h.includes('protein')
  );

  const b12Idx = headers.findIndex(
    (h) =>
      h.includes('b12') ||
      h.includes('b-12') ||
      h.includes('cobalamin') ||
      h.includes('vitb12') ||
      h.includes('vit_b12')
  );

  const calciumIdx = headers.findIndex(
    (h) =>
      h.includes('calcium') ||
      h.includes('ca_') ||
      h.includes('ca ') ||
      h === 'ca' ||
      h.includes('(ca)')
  );

  const vitDIdx = headers.findIndex(
    (h) =>
      h.includes('vit_d') ||
      h.includes('vit d') ||
      h.includes('vitamin_d') ||
      h.includes('vitamin d') ||
      h.includes('vitd') ||
      h.includes('cholecalciferol') ||
      h.includes('ergocalciferol')
  );

  const vitCIdx = headers.findIndex(
    (h) =>
      h.includes('vit_c') ||
      h.includes('vit c') ||
      h.includes('vitamin_c') ||
      h.includes('vitamin c') ||
      h.includes('vitc') ||
      h.includes('ascorbic')
  );

  const folateIdx = headers.findIndex(
    (h) =>
      h.includes('folate') ||
      h.includes('folic') ||
      h.includes('b9') ||
      h.includes('b-9') ||
      h.includes('dfe') ||
      h.includes('vitb9')
  );

  const portionIdx = headers.findIndex(
    (h) =>
      h.includes('portion') ||
      h.includes('serving') ||
      h.includes('weight') ||
      h.includes('unit') ||
      h.includes('measure')
  );

  const categoryIdx = headers.findIndex(
    (h) =>
      h.includes('category') ||
      h.includes('group') ||
      h.includes('food_group') ||
      h.includes('type')
  );

  const parsedList: CuratedFood[] = [];
  let skippedCount = 0;
  const timestamp = Date.now().toString(36);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skippedCount++;
      continue;
    }

    const fields = parseCSVRow(line, delimiter);
    const rawName = fields[nameIdx >= 0 ? nameIdx : 0];
    if (!rawName || rawName.trim().length === 0 || rawName.toLowerCase() === 'null') {
      skippedCount++;
      continue;
    }

    const name = formatFoodTitle(rawName);
    const ironVal = parseNutrientNumber(ironIdx >= 0 ? fields[ironIdx] : '');
    const b12Val = parseNutrientNumber(b12Idx >= 0 ? fields[b12Idx] : '');
    const calciumVal = parseNutrientNumber(calciumIdx >= 0 ? fields[calciumIdx] : '');
    const vitDVal = parseNutrientNumber(vitDIdx >= 0 ? fields[vitDIdx] : '');
    const vitCVal = parseNutrientNumber(vitCIdx >= 0 ? fields[vitCIdx] : '');
    const folateVal = parseNutrientNumber(folateIdx >= 0 ? fields[folateIdx] : '');
    const customPortion = portionIdx >= 0 && fields[portionIdx] ? fields[portionIdx].trim() : '100g standard serving';

    const vitDMcg = Math.round(vitDVal * 10) / 10;

    let category: 'Grains & Millets' | 'Legumes & Pulses' | 'Leafy Greens & Veggies' | 'Fruits & Nuts' | 'Dairy & Animal' | 'Traditional Preparations';
    if (categoryIdx >= 0 && fields[categoryIdx]) {
      category = mapExplicitCategory(fields[categoryIdx], name);
    } else {
      category = categorizeFoodName(name);
    }

    parsedList.push({
      id: `imported-${i}-${timestamp}`,
      name,
      category,
      standardPortion: customPortion || '100g standard serving',
      ironMg: Math.round(ironVal * 100) / 100,
      b12Mcg: Math.round(b12Val * 100) / 100,
      calciumMg: Math.round(calciumVal * 10) / 10,
      vitaminDMcg: vitDMcg,
      vitaminCMg: Math.round(vitCVal * 10) / 10,
      folateMcg: Math.round(folateVal * 10) / 10,
      absorptionBoosters: ironVal > 2 ? ['High iron nutrient density', 'Enhance with Vitamin C'] : [],
      absorptionBlockers: calciumVal > 150 && ironVal > 2 ? ['Calcium competition (buffer dairy by 1h)'] : [],
      recommendedPairing: ironVal > 2 ? 'Pair with lemon or amla for enhanced uptake' : 'Balanced portion',
      mealType: 'Lunch',
    });
  }

  return {
    foods: parsedList,
    totalRows: lines.length - 1,
    parsedCount: parsedList.length,
    skippedCount,
    detectedHeaders: rawHeaders,
    delimiter,
  };
}

function parseNutrientNumber(val: string | undefined): number {
  if (!val) return 0;
  // Strip non-numeric chars like mg, ug, mcg, ~, <
  const cleaned = val.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseCSVRow(line: string, delimiter = ','): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let buffer = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double quote
        buffer += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(buffer.trim().replace(/^["']|["']$/g, ''));
      buffer = '';
    } else {
      buffer += char;
    }
  }
  fields.push(buffer.trim().replace(/^["']|["']$/g, ''));
  return fields;
}

export function formatFoodTitle(name: string): string {
  if (!name) return '';
  let clean = name.replace(/^["'\s]+|["'\s]+$/g, '').trim();

  // If already reasonable, return formatted
  if (clean.length > 0) {
    // Replace multiple consecutive spaces
    clean = clean.replace(/\s+/g, ' ');
    // If all caps, convert to title case
    if (clean === clean.toUpperCase() && clean.length > 3) {
      clean = clean
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
  }

  return clean;
}

function mapExplicitCategory(
  catStr: string,
  name: string
): 'Grains & Millets' | 'Legumes & Pulses' | 'Leafy Greens & Veggies' | 'Fruits & Nuts' | 'Dairy & Animal' | 'Traditional Preparations' {
  const lower = catStr.toLowerCase();
  if (lower.includes('cereal') || lower.includes('grain') || lower.includes('millet') || lower.includes('flour') || lower.includes('bakery') || lower.includes('pasta')) {
    return 'Grains & Millets';
  }
  if (lower.includes('pulse') || lower.includes('legume') || lower.includes('bean') || lower.includes('dal') || lower.includes('nut')) {
    return 'Legumes & Pulses';
  }
  if (lower.includes('vegetable') || lower.includes('green') || lower.includes('leaf') || lower.includes('salad') || lower.includes('tuber')) {
    return 'Leafy Greens & Veggies';
  }
  if (lower.includes('fruit') || lower.includes('berry') || lower.includes('nut') || lower.includes('seed')) {
    return 'Fruits & Nuts';
  }
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('meat') || lower.includes('poultry') || lower.includes('fish') || lower.includes('egg') || lower.includes('animal') || lower.includes('beef') || lower.includes('pork') || lower.includes('seafood')) {
    return 'Dairy & Animal';
  }
  return categorizeFoodName(name);
}

export function categorizeFoodName(
  name: string
): 'Grains & Millets' | 'Legumes & Pulses' | 'Leafy Greens & Veggies' | 'Fruits & Nuts' | 'Dairy & Animal' | 'Traditional Preparations' {
  const lower = name.toLowerCase();

  if (
    lower.includes('rice') ||
    lower.includes('roti') ||
    lower.includes('bread') ||
    lower.includes('cereal') ||
    lower.includes('wheat') ||
    lower.includes('corn') ||
    lower.includes('oat') ||
    lower.includes('flour') ||
    lower.includes('pancake') ||
    lower.includes('waffle') ||
    lower.includes('cracker') ||
    lower.includes('cookie') ||
    lower.includes('pasta') ||
    lower.includes('noodle') ||
    lower.includes('biscuit') ||
    lower.includes('dalia') ||
    lower.includes('porridge') ||
    lower.includes('semolina') ||
    lower.includes('suji') ||
    lower.includes('poha') ||
    lower.includes('quinoa') ||
    lower.includes('barley') ||
    lower.includes('rye') ||
    lower.includes('bajra') ||
    lower.includes('jowar') ||
    lower.includes('ragi')
  ) {
    return 'Grains & Millets';
  }

  if (
    lower.includes('dal') ||
    lower.includes('bean') ||
    lower.includes('gram') ||
    lower.includes('pea') ||
    lower.includes('lentil') ||
    lower.includes('chana') ||
    lower.includes('chickpea') ||
    lower.includes('tofu') ||
    lower.includes('soy') ||
    lower.includes('lobia') ||
    lower.includes('rajma') ||
    lower.includes('moong') ||
    lower.includes('urad') ||
    lower.includes('matar') ||
    lower.includes('edamame')
  ) {
    return 'Legumes & Pulses';
  }

  if (
    lower.includes('spinach') ||
    lower.includes('palak') ||
    lower.includes('saag') ||
    lower.includes('leaf') ||
    lower.includes('leaves') ||
    lower.includes('methi') ||
    lower.includes('cabbage') ||
    lower.includes('broccoli') ||
    lower.includes('carrot') ||
    lower.includes('tomato') ||
    lower.includes('potato') ||
    lower.includes('onion') ||
    lower.includes('cauliflower') ||
    lower.includes('gourd') ||
    lower.includes('cucumber') ||
    lower.includes('radish') ||
    lower.includes('turnip') ||
    lower.includes('pepper') ||
    lower.includes('brinjal') ||
    lower.includes('eggplant') ||
    lower.includes('okra') ||
    lower.includes('bhindi') ||
    lower.includes('mushroom') ||
    lower.includes('soup') ||
    lower.includes('vegetable') ||
    lower.includes('veg') ||
    lower.includes('beetroot') ||
    lower.includes('chaulai') ||
    lower.includes('bathua') ||
    lower.includes('moringa')
  ) {
    return 'Leafy Greens & Veggies';
  }

  if (
    lower.includes('apple') ||
    lower.includes('mango') ||
    lower.includes('banana') ||
    lower.includes('orange') ||
    lower.includes('berry') ||
    lower.includes('pear') ||
    lower.includes('grape') ||
    lower.includes('lemon') ||
    lower.includes('peach') ||
    lower.includes('papaya') ||
    lower.includes('guava') ||
    lower.includes('amla') ||
    lower.includes('nut') ||
    lower.includes('almond') ||
    lower.includes('cashew') ||
    lower.includes('seed') ||
    lower.includes('fruit') ||
    lower.includes('date') ||
    lower.includes('fig') ||
    lower.includes('pomegranate') ||
    lower.includes('raisin') ||
    lower.includes('walnut') ||
    lower.includes('pistachio') ||
    lower.includes('flax') ||
    lower.includes('chia') ||
    lower.includes('sesame') ||
    lower.includes('til')
  ) {
    return 'Fruits & Nuts';
  }

  if (
    lower.includes('milk') ||
    lower.includes('yogurt') ||
    lower.includes('curd') ||
    lower.includes('paneer') ||
    lower.includes('cheese') ||
    lower.includes('chicken') ||
    lower.includes('mutton') ||
    lower.includes('fish') ||
    lower.includes('egg') ||
    lower.includes('beef') ||
    lower.includes('pork') ||
    lower.includes('lamb') ||
    lower.includes('turkey') ||
    lower.includes('shrimp') ||
    lower.includes('meat') ||
    lower.includes('seafood') ||
    lower.includes('salmon') ||
    lower.includes('tuna') ||
    lower.includes('butter') ||
    lower.includes('ghee') ||
    lower.includes('prawn') ||
    lower.includes('crab') ||
    lower.includes('liver')
  ) {
    return 'Dairy & Animal';
  }

  return 'Traditional Preparations';
}
