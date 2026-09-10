/**
 * Query Pre-Processing Utility for Dietary & Clinical Search Term Mapping
 *
 * Maps broad user queries (e.g., 'milk benefits', 'turmeric uses', 'egg nutrition')
 * into standardized, searchable dietary terms and database keys.
 */

export interface PreprocessedQuery {
  originalQuery: string;
  cleanQuery: string;
  mappedSearchTerm: string;
  isBroadQuery: boolean;
  intent: 'benefits' | 'uses' | 'nutrition' | 'meal_logging' | 'clinical' | 'general';
  category?: 'dairy' | 'spice' | 'protein' | 'fruit' | 'botanical' | 'vegetable' | 'grain' | 'general';
}

// Known mapping table for broad dietary terms and their standardized keys & categories
const DIETARY_TERM_MAPPINGS: Record<string, { term: string; category: PreprocessedQuery['category'] }> = {
  // Dairy
  milk: { term: 'milk', category: 'dairy' },
  doodh: { term: 'milk', category: 'dairy' },
  dairy: { term: 'milk', category: 'dairy' },
  dugdha: { term: 'milk', category: 'dairy' },
  ksheera: { term: 'milk', category: 'dairy' },
  curd: { term: 'curd', category: 'dairy' },
  dahi: { term: 'curd', category: 'dairy' },
  yogurt: { term: 'curd', category: 'dairy' },
  yoghurt: { term: 'curd', category: 'dairy' },
  buttermilk: { term: 'curd', category: 'dairy' },
  takra: { term: 'curd', category: 'dairy' },
  paneer: { term: 'paneer', category: 'dairy' },

  // Spices & Botanicals
  turmeric: { term: 'turmeric', category: 'spice' },
  haldi: { term: 'turmeric', category: 'spice' },
  curcumin: { term: 'turmeric', category: 'spice' },
  haridra: { term: 'turmeric', category: 'spice' },
  cinnamon: { term: 'cinnamon', category: 'spice' },
  dalchini: { term: 'cinnamon', category: 'spice' },
  ginger: { term: 'ginger', category: 'spice' },
  adrak: { term: 'ginger', category: 'spice' },
  garlic: { term: 'garlic', category: 'spice' },
  lahsun: { term: 'garlic', category: 'spice' },
  amla: { term: 'amla', category: 'botanical' },
  amalaki: { term: 'amla', category: 'botanical' },
  emblica: { term: 'amla', category: 'botanical' },
  gooseberry: { term: 'amla', category: 'botanical' },
  moringa: { term: 'moringa', category: 'botanical' },
  drumstick: { term: 'moringa', category: 'botanical' },
  sehjan: { term: 'moringa', category: 'botanical' },
  shigru: { term: 'moringa', category: 'botanical' },
  halim: { term: 'halim', category: 'botanical' },
  'garden cress': { term: 'halim', category: 'botanical' },
  aliv: { term: 'halim', category: 'botanical' },
  chandrashoor: { term: 'halim', category: 'botanical' },

  // Proteins & Animal Sources
  egg: { term: 'egg', category: 'protein' },
  eggs: { term: 'egg', category: 'protein' },
  'egg white': { term: 'egg', category: 'protein' },
  'egg whites': { term: 'egg', category: 'protein' },
  anda: { term: 'egg', category: 'protein' },
  fish: { term: 'fish', category: 'protein' },
  salmon: { term: 'fish', category: 'protein' },
  chicken: { term: 'chicken', category: 'protein' },

  // Fruits & Nuts
  banana: { term: 'banana', category: 'fruit' },
  bananas: { term: 'banana', category: 'fruit' },
  kela: { term: 'banana', category: 'fruit' },
  apple: { term: 'apple', category: 'fruit' },
  apples: { term: 'apple', category: 'fruit' },
  pomegranate: { term: 'pomegranate', category: 'fruit' },
  anar: { term: 'pomegranate', category: 'fruit' },
  dates: { term: 'dates', category: 'fruit' },
  date: { term: 'dates', category: 'fruit' },
  khajur: { term: 'dates', category: 'fruit' },
  almond: { term: 'almond', category: 'fruit' },
  almonds: { term: 'almond', category: 'fruit' },
  badam: { term: 'almond', category: 'fruit' },
  walnut: { term: 'nuts', category: 'fruit' },
  walnuts: { term: 'nuts', category: 'fruit' },
  akhrot: { term: 'nuts', category: 'fruit' },
  cashew: { term: 'nuts', category: 'fruit' },
  kaju: { term: 'nuts', category: 'fruit' },
  coconut: { term: 'coconut', category: 'fruit' },
  nariyal: { term: 'coconut', category: 'fruit' },
  lemon: { term: 'lemon', category: 'fruit' },
  lime: { term: 'lemon', category: 'fruit' },
  nimbu: { term: 'lemon', category: 'fruit' },

  // Vegetables & Greens
  spinach: { term: 'spinach', category: 'vegetable' },
  palak: { term: 'spinach', category: 'vegetable' },
  saag: { term: 'spinach', category: 'vegetable' },
  beetroot: { term: 'beetroot', category: 'vegetable' },
  beet: { term: 'beetroot', category: 'vegetable' },
  chukandar: { term: 'beetroot', category: 'vegetable' },

  // Grains & Pulses
  ragi: { term: 'ragi', category: 'grain' },
  'finger millet': { term: 'ragi', category: 'grain' },
  oats: { term: 'oats', category: 'grain' },
  oatmeal: { term: 'oats', category: 'grain' },
  dal: { term: 'dal', category: 'grain' },
  lentils: { term: 'dal', category: 'grain' },
  sprouts: { term: 'sprouts', category: 'grain' },
};

const STOP_WORDS = new Set([
  'what', 'is', 'the', 'are', 'a', 'an', 'tell', 'me', 'about', 'can', 'you',
  'please', 'kindly', 'explain', 'show', 'give', 'how', 'details', 'info',
  'information', 'for', 'of', 'in', 'on', 'with', 'to', 'some', 'any', 'my',
  'your', 'could', 'would', 'will', 'does', 'do', 'doing', 'value', 'data',
  'this', 'that', 'these', 'those', 'there', 'here', 'which', 'where', 'when',
  'why', 'who', 'whom', 'whose', 'it', 'its', 'they', 'them', 'their'
]);

/**
 * Pre-processes a user query to strip conversational noise, extract dietary intent,
 * and map broad queries ('milk benefits', 'turmeric uses', 'egg nutrition') into searchable dietary terms.
 */
export function mapBroadQueryToSearchableTerms(query: string): PreprocessedQuery {
  if (!query || !query.trim()) {
    return {
      originalQuery: '',
      cleanQuery: '',
      mappedSearchTerm: '',
      isBroadQuery: false,
      intent: 'general',
      category: 'general',
    };
  }

  const rawLower = query.toLowerCase().trim();

  // Detect query intent
  let intent: PreprocessedQuery['intent'] = 'general';
  if (/\b(benefits?|good for|health benefits?|pros|advantages|why eat|why drink)\b/i.test(rawLower)) {
    intent = 'benefits';
  } else if (/\b(uses?|utility|how to use|how to consume|how to eat|recipes?|ways to use)\b/i.test(rawLower)) {
    intent = 'uses';
  } else if (/\b(nutrition|nutritional|nutrients?|calories|protein|calcium|vitamins?|iron|facts?)\b/i.test(rawLower)) {
    intent = 'nutrition';
  } else if (/\b(log|add|record|ate|had|consumed)\b/i.test(rawLower)) {
    intent = 'meal_logging';
  } else if (/\b(symptoms?|deficiency|anemia|ferritin|hb|hemoglobin|doctor|dosage)\b/i.test(rawLower)) {
    intent = 'clinical';
  }

  // Iteratively strip conversational prefix/suffix fillers until string stabilizes
  let stripped = rawLower;
  let prev = '';
  while (stripped !== prev) {
    prev = stripped;
    stripped = stripped
      .replace(
        /^(what are the|tell me about|can you explain|can you tell me|can you show me|can you give me|can you|could you|would you|please|kindly|show me|give me|what is the|what is|how is|is|what are|health|nutritional|medical|benefits of|uses of|nutrition of|nutrition in|value of|details of|details for|information on|info on|benefits for|uses for|about|the|a|an)\s+/i,
        ''
      )
      .replace(
        /\s+(benefits?|health benefits?|nutritional benefits?|medical benefits?|uses?|utility|advantages?|effects?|side effects?|nutrition|nutritional value|nutrients?|calories|facts?|good for health|for health|for anemia|for iron|for body|for women|what is the|tell me about|details|info)$/i,
        ''
      )
      .trim();
  }

  // Clean remaining punctuation
  stripped = stripped.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ').trim();

  // Check if remaining words consist entirely of stop words or empty
  const words = stripped.split(/\s+/).filter(Boolean);
  const nonStopWords = words.filter((w) => !STOP_WORDS.has(w));

  if (words.length === 0 || nonStopWords.length === 0) {
    return {
      originalQuery: query,
      cleanQuery: '',
      mappedSearchTerm: '',
      isBroadQuery: false,
      intent: 'general',
      category: 'general',
    };
  }

  // Try direct lookup in DIETARY_TERM_MAPPINGS
  const candidateKey = nonStopWords.join(' ');
  let mappedTerm = candidateKey;
  let category: PreprocessedQuery['category'] = 'general';
  let isBroadQuery = intent === 'benefits' || intent === 'uses' || intent === 'nutrition';

  if (DIETARY_TERM_MAPPINGS[candidateKey]) {
    mappedTerm = DIETARY_TERM_MAPPINGS[candidateKey].term;
    category = DIETARY_TERM_MAPPINGS[candidateKey].category;
    isBroadQuery = true;
  } else if (DIETARY_TERM_MAPPINGS[stripped]) {
    mappedTerm = DIETARY_TERM_MAPPINGS[stripped].term;
    category = DIETARY_TERM_MAPPINGS[stripped].category;
    isBroadQuery = true;
  } else {
    // Check if nonStopWords or rawLower contains any known mapping key as a word
    for (const [key, val] of Object.entries(DIETARY_TERM_MAPPINGS)) {
      const regex = new RegExp(`\\b${key}\\b`, 'i');
      if (regex.test(candidateKey) || regex.test(stripped) || regex.test(rawLower)) {
        mappedTerm = val.term;
        category = val.category;
        isBroadQuery = true;
        break;
      }
    }
  }

  return {
    originalQuery: query,
    cleanQuery: candidateKey || stripped,
    mappedSearchTerm: mappedTerm,
    isBroadQuery,
    intent,
    category,
  };
}
