import fs from 'fs';
import path from 'path';

/**
 * Universal CLI script to parse any food CSV dataset (e.g. 13,000+ items from BigQuery/USDA/IFCT)
 * Usage:
 *   npx tsx scripts/parse_food_csv.ts [path/to/food_data.csv]
 */

const candidateFiles = [
  process.argv[2],
  'food_data.csv',
  'foods.csv',
  'food_dataset.csv',
  'temp_food_data.csv',
  'usda_foods.csv',
  'bigquery_foods.csv',
  'dataset.csv',
].filter(Boolean) as string[];

let targetCsvPath: string | null = null;
for (const cand of candidateFiles) {
  const fullPath = path.isAbsolute(cand) ? cand : path.join(process.cwd(), cand);
  if (fs.existsSync(fullPath)) {
    targetCsvPath = fullPath;
    break;
  }
}

if (!targetCsvPath) {
  console.log('⚠️ No CSV file found in root directory.');
  console.log('To run this script with your 13k CSV file:');
  console.log('  1. Place your CSV file in the root folder named "food_data.csv"');
  console.log('  2. OR run: npx tsx scripts/parse_food_csv.ts <path_to_file.csv>');
  process.exit(0);
}

console.log(`📂 Reading CSV from: ${targetCsvPath}`);
const csvRaw = fs.readFileSync(targetCsvPath, 'utf8');

function parseCSV(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  // Parse header
  const headerLine = lines[0].toLowerCase();
  const rawHeaders = parseCSVRow(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().trim());

  const nameIdx = headers.findIndex((h) =>
    h.includes('food') ||
    h.includes('name') ||
    h.includes('item') ||
    h.includes('desc') ||
    h.includes('shrt_desc') ||
    h.includes('title')
  );

  const ironIdx = headers.findIndex((h) =>
    (h.includes('iron') || h.includes('fe_') || h.includes('fe ') || h === 'fe' || h.includes('(fe)')) &&
    !h.includes('protein')
  );

  const b12Idx = headers.findIndex((h) =>
    h.includes('b12') || h.includes('b-12') || h.includes('cobalamin') || h.includes('vitb12')
  );

  const calciumIdx = headers.findIndex((h) =>
    h.includes('calcium') || h.includes('ca_') || h.includes('ca ') || h === 'ca' || h.includes('(ca)')
  );

  const vitDIdx = headers.findIndex((h) =>
    h.includes('vit_d') || h.includes('vit d') || h.includes('vitamin_d') || h.includes('vitd')
  );

  const vitCIdx = headers.findIndex((h) =>
    h.includes('vit_c') || h.includes('vit c') || h.includes('vitamin_c') || h.includes('ascorbic')
  );

  const folateIdx = headers.findIndex((h) =>
    h.includes('folate') || h.includes('folic') || h.includes('b9') || h.includes('dfe')
  );

  const portionIdx = headers.findIndex((h) =>
    h.includes('portion') || h.includes('serving') || h.includes('weight') || h.includes('measure')
  );

  const result: any[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      skipped++;
      continue;
    }

    const fields = parseCSVRow(line);
    const rawName = fields[nameIdx >= 0 ? nameIdx : 0];
    if (!rawName || rawName.trim().length === 0 || rawName.toLowerCase() === 'null') {
      skipped++;
      continue;
    }

    const food_name = formatFoodTitle(rawName);
    const iron_mg = parseNum(ironIdx >= 0 ? fields[ironIdx] : '');
    const b12_mcg = parseNum(b12Idx >= 0 ? fields[b12Idx] : '');
    const calcium_mg = parseNum(calciumIdx >= 0 ? fields[calciumIdx] : '');
    const vit_d_mcg = parseNum(vitDIdx >= 0 ? fields[vitDIdx] : '');
    const vit_c_mg = parseNum(vitCIdx >= 0 ? fields[vitCIdx] : '');
    const folate_mcg = parseNum(folateIdx >= 0 ? fields[folateIdx] : '');
    const standardPortion = portionIdx >= 0 && fields[portionIdx] ? fields[portionIdx].trim() : '100g standard serving';

    const vit_d_iu = Math.round(vit_d_mcg * 40 * 10) / 10;
    const category = categorize(food_name);

    result.push({
      id: `bq-food-${result.length + 1}`,
      name: food_name,
      standardPortion,
      category,
      ironMg: Math.round(iron_mg * 100) / 100,
      b12Mcg: Math.round(b12_mcg * 100) / 100,
      calciumMg: Math.round(calcium_mg * 100) / 100,
      vitaminDIu: vit_d_iu,
      vitaminCMg: Math.round(vit_c_mg * 100) / 100,
      folateMcg: Math.round(folate_mcg * 100) / 100,
      absorptionBoosters: iron_mg > 2 ? ['Bioavailable mineral density', 'Natural whole-food synergy'] : [],
      absorptionBlockers: calcium_mg > 100 && iron_mg > 2 ? ['High calcium competition (buffer by 1h)'] : [],
      recommendedPairing: iron_mg > 2 ? 'Pair with lemon squeeze or Amla for maximum absorption' : 'Balanced whole meal',
      mealType: 'Lunch',
      isBigQueryFood: true,
    });
  }

  console.log(`✅ Parsed ${result.length} food items (skipped ${skipped} blank/invalid lines)`);
  return result;
}

function parseNum(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let inQuotes = false;
  let buffer = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        buffer += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(buffer.trim().replace(/^["']|["']$/g, ''));
      buffer = '';
    } else {
      buffer += char;
    }
  }
  fields.push(buffer.trim().replace(/^["']|["']$/g, ''));
  return fields;
}

function formatFoodTitle(name: string): string {
  let clean = name.replace(/^["'\s]+|["'\s]+$/g, '').trim();
  clean = clean.replace(/\s+/g, ' ');
  if (clean === clean.toUpperCase() && clean.length > 3) {
    clean = clean
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return clean;
}

function categorize(name: string): 'Grains & Millets' | 'Legumes & Pulses' | 'Leafy Greens & Veggies' | 'Fruits & Nuts' | 'Dairy & Animal' | 'Traditional Preparations' {
  const lower = name.toLowerCase();
  if (lower.includes('rice') || lower.includes('roti') || lower.includes('bread') || lower.includes('cereal') || lower.includes('wheat') || lower.includes('corn') || lower.includes('oat') || lower.includes('flour') || lower.includes('pancake') || lower.includes('waffle') || lower.includes('cracker') || lower.includes('cookie') || lower.includes('pasta') || lower.includes('noodle')) {
    return 'Grains & Millets';
  }
  if (lower.includes('dal') || lower.includes('bean') || lower.includes('gram') || lower.includes('pea') || lower.includes('lentil') || lower.includes('chana') || lower.includes('chickpea') || lower.includes('tofu') || lower.includes('soy')) {
    return 'Legumes & Pulses';
  }
  if (lower.includes('spinach') || lower.includes('palak') || lower.includes('saag') || lower.includes('leaf') || lower.includes('methi') || lower.includes('cabbage') || lower.includes('broccoli') || lower.includes('carrot') || lower.includes('tomato') || lower.includes('potato') || lower.includes('onion') || lower.includes('cauliflower') || lower.includes('gourd') || lower.includes('cucumber') || lower.includes('radish') || lower.includes('turnip') || lower.includes('pepper')) {
    return 'Leafy Greens & Veggies';
  }
  if (lower.includes('apple') || lower.includes('mango') || lower.includes('banana') || lower.includes('orange') || lower.includes('berry') || lower.includes('pear') || lower.includes('grape') || lower.includes('lemon') || lower.includes('peach') || lower.includes('papaya') || lower.includes('guava') || lower.includes('nut') || lower.includes('almond') || lower.includes('cashew') || lower.includes('seed') || lower.includes('fruit')) {
    return 'Fruits & Nuts';
  }
  if (lower.includes('milk') || lower.includes('yogurt') || lower.includes('curd') || lower.includes('paneer') || lower.includes('cheese') || lower.includes('chicken') || lower.includes('mutton') || lower.includes('fish') || lower.includes('egg') || lower.includes('beef') || lower.includes('pork') || lower.includes('lamb') || lower.includes('turkey') || lower.includes('shrimp') || lower.includes('meat')) {
    return 'Dairy & Animal';
  }
  return 'Traditional Preparations';
}

const parsed = parseCSV(csvRaw);
if (parsed.length > 0) {
  const outPath = path.join(process.cwd(), 'src/data/bigQueryFoods.ts');
  const fileContent = `// Auto-generated food dataset (${parsed.length} items)
import { CuratedFood } from './foodDatabase';

export const BIGQUERY_DATASET_FOODS: CuratedFood[] = ${JSON.stringify(parsed, null, 2)};
`;
  fs.writeFileSync(outPath, fileContent, 'utf8');
  console.log(`💾 Saved ${parsed.length} foods to src/data/bigQueryFoods.ts!`);
}
