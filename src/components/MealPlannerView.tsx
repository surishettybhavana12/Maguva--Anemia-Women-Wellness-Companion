import React, { useState, useEffect, useMemo } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Sparkles,
  Flame,
  Droplets,
  Zap,
  Leaf,
  Sun,
  Activity,
  ShieldCheck,
  Search,
  CheckCircle2,
  Check,
  AlertTriangle,
  Info,
  Clock,
  RotateCcw,
  BookOpen,
  ExternalLink,
  Upload,
  FileSpreadsheet,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Database,
  FileText,
  Layers,
  Sparkle,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';
import { CURATED_FOOD_LIBRARY, CuratedFood, ICMR_RDA_DEFAULTS } from '../data/foodDatabase';
import { MealItem, AyushRemedy } from '../types';
import { StageProgressionFooter } from './StageProgressionFooter';
import { parseFoodCSV, parseFoodCSVWithStats, ParseResult } from '../utils/foodCsvParser';

const AYUSH_MEAL_NUTRITION_MAP: Record<
  string,
  {
    portion: string;
    ironMg: number;
    b12Mcg: number;
    folateMcg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
    calciumMg: number;
    absorptionBoosters: string[];
    absorptionBlockers: string[];
  }
> = {
  'moringa-leaves-extract': {
    portion: '100g cooked leaves with jaggery (80:20)',
    ironMg: 6.8,
    b12Mcg: 0.0,
    folateMcg: 140.0,
    vitaminCMg: 45.0,
    vitaminDMcg: 0.0,
    calciumMg: 185.0,
    absorptionBoosters: ['Moringa-Jaggery bio-synergy', 'Natural ascorbic acid'],
    absorptionBlockers: ['Do not drink tea/coffee within 2 hours'],
  },
  'nagaphani-fruit-juice': {
    portion: '20 ml pure juice in lukewarm water',
    ironMg: 3.2,
    b12Mcg: 0.0,
    folateMcg: 28.0,
    vitaminCMg: 35.0,
    vitaminDMcg: 0.0,
    calciumMg: 40.0,
    absorptionBoosters: ['Natural betalain bioflavonoids', 'Ascorbic acid cofactor'],
    absorptionBlockers: ['Consume 20 mins before meal on light stomach'],
  },
  'jaggery-and-raisins': {
    portion: '5g jaggery ball + 5g soaked black raisins',
    ironMg: 2.6,
    b12Mcg: 0.0,
    folateMcg: 18.0,
    vitaminCMg: 8.0,
    vitaminDMcg: 0.0,
    calciumMg: 32.0,
    absorptionBoosters: ['Fructose enhances non-heme iron uptake', 'Gentle on gut'],
    absorptionBlockers: [],
  },
  'ginger-iron-supplementary': {
    portion: '1 slice fresh ginger with rock salt or 1 cup decoction',
    ironMg: 0.6,
    b12Mcg: 0.0,
    folateMcg: 12.0,
    vitaminCMg: 10.0,
    vitaminDMcg: 0.0,
    calciumMg: 15.0,
    absorptionBoosters: ['Gingerol stimulates gastric Agni & duodenal iron transport', 'Rock salt mineral electrolytes'],
    absorptionBlockers: [],
  },
  'niger-seeds-chutney': {
    portion: '1 serving (25g roasted chutney)',
    ironMg: 14.2,
    b12Mcg: 0.0,
    folateMcg: 45.0,
    vitaminCMg: 15.0,
    vitaminDMcg: 0.0,
    calciumMg: 210.0,
    absorptionBoosters: ['High botanical non-heme iron (56.7mg/100g seeds)', 'Garlic & lemon juice synergy'],
    absorptionBlockers: [],
  },
  'purslane-seeds': {
    portion: '15g lightly toasted seeds in curd or salad',
    ironMg: 3.8,
    b12Mcg: 0.0,
    folateMcg: 35.0,
    vitaminCMg: 12.0,
    vitaminDMcg: 0.0,
    calciumMg: 95.0,
    absorptionBoosters: ['Alpha-linolenic acid (Omega-3)', 'High GI tolerability in adolescent trials'],
    absorptionBlockers: [],
  },
  'oyster-mushroom-soup': {
    portion: '100g sun-exposed mushrooms in warm soup',
    ironMg: 2.4,
    b12Mcg: 0.4,
    folateMcg: 38.0,
    vitaminCMg: 12.0,
    vitaminDMcg: 420.0,
    calciumMg: 30.0,
    absorptionBoosters: ['UV/Sunlight-triggered Vitamin D2 (ergocalciferol)', 'Black pepper piperine synergy'],
    absorptionBlockers: [],
  },
  'laja-manda-rice-peya': {
    portion: '1 bowl warm gruel (250 ml)',
    ironMg: 1.4,
    b12Mcg: 0.0,
    folateMcg: 22.0,
    vitaminCMg: 0.0,
    vitaminDMcg: 0.0,
    calciumMg: 20.0,
    absorptionBoosters: ['Laghu (light) rapid mucosal absorption', 'Electrolyte balancing with roasted cumin'],
    absorptionBlockers: [],
  },
  'ayurvedic-takra-buttermilk': {
    portion: '1 glass (200 ml) spiced churned buttermilk',
    ironMg: 0.4,
    b12Mcg: 0.9,
    folateMcg: 30.0,
    vitaminCMg: 5.0,
    vitaminDMcg: 15.0,
    calciumMg: 230.0,
    absorptionBoosters: ['Lactobacillus B12 biosynthesis', 'Heals ileal mucosal tight junctions', 'Roasted cumin & hing'],
    absorptionBlockers: [],
  },
  'fresh-wheatgrass-juice': {
    portion: '30 ml fresh undiluted shot',
    ironMg: 4.5,
    b12Mcg: 0.5,
    folateMcg: 40.0,
    vitaminCMg: 25.0,
    vitaminDMcg: 0.0,
    calciumMg: 35.0,
    absorptionBoosters: ['Chlorophyll molecular analog to hemoglobin', 'Superoxide dismutase (SOD) cellular vitality'],
    absorptionBlockers: ['Drink on empty stomach, avoid tea/coffee for 30m'],
  },
  'mahua-flower-laddoo': {
    portion: '1 wholesome laddoo (35g)',
    ironMg: 4.2,
    b12Mcg: 0.0,
    folateMcg: 25.0,
    vitaminCMg: 8.0,
    vitaminDMcg: 0.0,
    calciumMg: 75.0,
    absorptionBoosters: ['Natural unrefined tribal botanic sugars', 'Sesame & dry fruit mineral cofactors'],
    absorptionBlockers: [],
  },
  'mahuwa-flower-laddoo': {
    portion: '1 wholesome laddoo (35g)',
    ironMg: 4.2,
    b12Mcg: 0.0,
    folateMcg: 25.0,
    vitaminCMg: 8.0,
    vitaminDMcg: 0.0,
    calciumMg: 75.0,
    absorptionBoosters: ['Natural unrefined tribal botanic sugars', 'Sesame & dry fruit mineral cofactors'],
    absorptionBlockers: [],
  },
};

export const MealPlannerView: React.FC = () => {
  const meals = useHealthStore((state) => state.meals);
  const addMeal = useHealthStore((state) => state.addMeal);
  const removeMeal = useHealthStore((state) => state.removeMeal);
  const customImportedFoods = useHealthStore((state) => state.customImportedFoods || []);
  const addCustomImportedFoods = useHealthStore((state) => state.addCustomImportedFoods);
  const clearCustomImportedFoods = useHealthStore((state) => state.clearCustomImportedFoods);
  const loadImportedFoodsFromStorage = useHealthStore((state) => state.loadImportedFoodsFromStorage);
  const demographics = useHealthStore((state) => state.demographics);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);
  const ayushRemedies = useHealthStore((state) => state.ayushRemedies);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const mealEntryMode = useHealthStore((state) => state.mealEntryMode || 'library');
  const setMealEntryMode = useHealthStore((state) => state.setMealEntryMode);

  const [savedToDashboardToast, setSavedToDashboardToast] = useState(false);

  // Auto-load any stored high-capacity foods from IndexedDB on initial view mount
  useEffect(() => {
    loadImportedFoodsFromStorage();
  }, [loadImportedFoodsFromStorage]);

  const { dailyTotals, icmrBaseline, icmrProfile } = useComputedHealth();

  const [activeEntryMode, setActiveEntryMode] = useState<'wifs' | 'library' | 'custom' | 'ayush'>(mealEntryMode);

  // Synchronize when store mealEntryMode changes (e.g., via AI Chat option 4)
  useEffect(() => {
    if (mealEntryMode) {
      setActiveEntryMode(mealEntryMode);
    }
  }, [mealEntryMode]);
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Breakfast');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Combine static library + BigQuery foods + any custom imported foods
  const allAvailableFoods = useMemo(() => {
    return [...customImportedFoods, ...CURATED_FOOD_LIBRARY];
  }, [customImportedFoods]);

  const [selectedFood, setSelectedFood] = useState<CuratedFood>(allAvailableFoods[0] || CURATED_FOOD_LIBRARY[0]);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'wifs' | 'greens' | 'pulses' | 'animal' | 'fruits' | 'imported'>('all');
  const [servings, setServings] = useState(1);
  const [hasVitaminCBooster, setHasVitaminCBooster] = useState(false);
  const [hasTanninBlocker, setHasTanninBlocker] = useState(false);

  // Autocomplete dropdown state for Custom & Quick search
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);

  // CSV / BigQuery Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvUploadSuccess, setCsvUploadSuccess] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [pasteCsvText, setPasteCsvText] = useState('');
  const [isPastingCsv, setIsPastingCsv] = useState(false);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('replace');
  const [importStats, setImportStats] = useState<{
    totalRows: number;
    parsedCount: number;
    skippedCount: number;
    detectedHeaders: string[];
    fileName?: string;
  } | null>(null);

  // Pagination for high performance on 13,000+ records
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Custom Food Entry State (6 Key Micronutrient Parameters)
  const [customName, setCustomName] = useState('');
  const [customPortion, setCustomPortion] = useState('');
  const [customIron, setCustomIron] = useState<number | ''>('');
  const [customB12, setCustomB12] = useState<number | ''>('');
  const [customFolate, setCustomFolate] = useState<number | ''>('');
  const [customVitC, setCustomVitC] = useState<number | ''>('');
  const [customVitD, setCustomVitD] = useState<number | ''>('');
  const [customCalcium, setCustomCalcium] = useState<number | ''>('');

  // Life stage RDA from ICMR-NIN 2020 dynamic engine
  const rda = icmrBaseline;

  const filteredFoods = useMemo(() => {
    return allAvailableFoods.filter((f) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.regionalName && f.regionalName.toLowerCase().includes(q)) ||
        f.category.toLowerCase().includes(q) ||
        (f.handbookNotes && f.handbookNotes.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (libraryFilter === 'wifs') return f.isWifsHandbook === true;
      if (libraryFilter === 'greens') return f.category === 'Leafy Greens & Veggies';
      if (libraryFilter === 'pulses') return f.category === 'Legumes & Pulses';
      if (libraryFilter === 'animal') return f.category === 'Dairy & Animal';
      if (libraryFilter === 'fruits') return f.category === 'Fruits & Nuts';
      if (libraryFilter === 'imported') return f.id.startsWith('imported-') || f.id.startsWith('bq-') || f.id.startsWith('usda-') || (f as unknown as { isBigQueryFood?: boolean }).isBigQueryFood === true;
      return true;
    });
  }, [allAvailableFoods, searchQuery, libraryFilter]);

  // Reset pagination when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, libraryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredFoods.length / pageSize));
  const paginatedFoods = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFoods.slice(start, start + pageSize);
  }, [filteredFoods, currentPage, pageSize]);

  // Autocomplete list when typing in customName
  const customAutocompleteMatches = useMemo(() => {
    if (!customName.trim() || customName.trim().length < 2) return [];
    const query = customName.toLowerCase().trim();
    return allAvailableFoods
      .filter((f) => f.name.toLowerCase().includes(query) || (f.regionalName && f.regionalName.toLowerCase().includes(query)))
      .slice(0, 8);
  }, [allAvailableFoods, customName]);

  const selectFromCustomAutocomplete = (food: CuratedFood) => {
    setCustomName(food.name);
    setCustomPortion(food.standardPortion || '100g standard serving');
    setCustomIron(food.ironMg);
    setCustomB12(food.b12Mcg);
    setCustomFolate(food.folateMcg);
    setCustomVitC(food.vitaminCMg || 0);
    setCustomVitD(food.vitaminDMcg || 0);
    setCustomCalcium(food.calciumMg || 0);
    setIsAutocompleteOpen(false);
  };

  const handleProcessCsvString = async (csvContent: string, fileName?: string) => {
    setIsProcessingCsv(true);
    setCsvError(null);
    setCsvUploadSuccess(null);
    try {
      if (!csvContent || !csvContent.trim()) {
        throw new Error('CSV content is empty. Please provide valid CSV data.');
      }
      const stats = parseFoodCSVWithStats(csvContent);
      if (stats.foods.length === 0) {
        throw new Error(`No valid food records found in ${stats.totalRows} row(s). Please verify column headers match food names and nutrients.`);
      }
      setImportStats({
        totalRows: stats.totalRows,
        parsedCount: stats.parsedCount,
        skippedCount: stats.skippedCount,
        detectedHeaders: stats.detectedHeaders,
        fileName,
      });

      await addCustomImportedFoods(stats.foods, importMode === 'replace');
      setCsvUploadSuccess(`Successfully loaded ${stats.parsedCount.toLocaleString()} foods${fileName ? ` from "${fileName}"` : ''} into your high-capacity IndexedDB library!`);
      setPasteCsvText('');
    } catch (err: any) {
      setCsvError(err.message || 'Failed to parse CSV file.');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      await handleProcessCsvString(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleExportLibraryToCsv = () => {
    const headers = [
      'Food Name',
      'Category',
      'Standard Portion',
      'Iron (mg)',
      'Vit B12 (µg)',
      'Folate (µg)',
      'Vit C (mg)',
      'Vit D (µg)',
      'Calcium (mg)',
      'Absorption Boosters',
      'Absorption Blockers',
    ];
    const rows = allAvailableFoods.map((f) => [
      `"${f.name.replace(/"/g, '""')}"`,
      `"${f.category}"`,
      `"${f.standardPortion}"`,
      f.ironMg,
      f.b12Mcg,
      f.folateMcg,
      f.vitaminCMg || 0,
      f.vitaminDMcg || 0,
      f.calciumMg || 0,
      `"${(f.absorptionBoosters || []).join('; ').replace(/"/g, '""')}"`,
      `"${(f.absorptionBlockers || []).join('; ').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `maguva_food_library_${allAvailableFoods.length}_items.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `Food Name,Iron (mg),Vit B12 (µg),Folate (µg),Vit C (mg),Vit D (µg),Calcium (mg),Category,Portion
Spinach (Palak cooked),3.57,0,194,28.1,0,99,Leafy Greens & Veggies,1 standard katori (100g)
Moringa Drumstick Leaves,4.0,0,40,220,0,185,Leafy Greens & Veggies,1 cup fresh leaves (50g)
Roasted Bengal Gram (Chana),9.5,0,168,3.0,0,58,Legumes & Pulses,1/2 cup (50g)
Sprouted Moong Dal,1.4,0,65,16.5,0,27,Legumes & Pulses,1 bowl cooked (100g)
Chicken Liver (Braised),9.0,16.5,588,18.0,40,11,Dairy & Animal,1 small serving (75g)
Amla (Indian Gooseberry),1.2,0,0,600,0,50,Fruits & Nuts,1 medium fruit (50g)
Ragi Flour (Finger Millet),3.9,0,18,0,0,344,Grains & Millets,1 roti / 30g flour
Sesame Seeds (Til),14.6,0,97,0,0,975,Fruits & Nuts,2 tablespoons (20g)`;
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample_food_nutrition_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const wifsHandbookFoods = React.useMemo(() => {
    return allAvailableFoods.filter((f) => f.isWifsHandbook);
  }, [allAvailableFoods]);

  const handleAddMealFromLibrary = () => {
    const boosters = hasVitaminCBooster
      ? [...selectedFood.absorptionBoosters, 'Fresh lemon juice / Vitamin C synergy (+200% Fe uptake)']
      : [...selectedFood.absorptionBoosters];

    const blockers = hasTanninBlocker
      ? [...selectedFood.absorptionBlockers, 'Tannin chelation buffer (tea/coffee within 1 hr)']
      : [...selectedFood.absorptionBlockers];

    addMeal({
      name: `${selectedFood.name} (${servings}x)`,
      portion: `${servings}x portion (${selectedFood.standardPortion})`,
      ironMg: Math.round(selectedFood.ironMg * servings * 10) / 10,
      b12Mcg: Math.round(selectedFood.b12Mcg * servings * 10) / 10,
      folateMcg: Math.round(selectedFood.folateMcg * servings * 10) / 10,
      vitaminCMg: Math.round(((selectedFood.vitaminCMg || (hasVitaminCBooster ? 25 : 5)) * servings) * 10) / 10,
      vitaminDMcg: Math.round(selectedFood.vitaminDMcg * servings * 10) / 10,
      calciumMg: Math.round(((selectedFood.calciumMg || 30) * servings) * 10) / 10,
      mealType,
      absorptionBoosters: boosters,
      absorptionBlockers: blockers,
    });
  };

  const handleAddDirectWifsFood = (food: CuratedFood, targetMeal: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner') => {
    addMeal({
      name: food.name,
      portion: food.standardPortion,
      ironMg: food.ironMg,
      b12Mcg: food.b12Mcg,
      folateMcg: food.folateMcg,
      vitaminCMg: food.vitaminCMg || 20,
      vitaminDMcg: food.vitaminDMcg,
      calciumMg: food.calciumMg || 40,
      mealType: targetMeal,
      absorptionBoosters: [...food.absorptionBoosters, 'WIFS Protocol Bioavailability Synergy'],
      absorptionBlockers: [],
    });
  };

  const handleAddCustomMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    addMeal({
      name: customName,
      portion: customPortion,
      ironMg: Number(customIron) || 0,
      b12Mcg: Number(customB12) || 0,
      folateMcg: Number(customFolate) || 0,
      vitaminCMg: Number(customVitC) || 0,
      vitaminDMcg: Number(customVitD) || 0,
      calciumMg: Number(customCalcium) || 0,
      mealType,
      absorptionBoosters: hasVitaminCBooster ? ['Added fresh Vitamin C booster (+200%)'] : [],
      absorptionBlockers: hasTanninBlocker ? ['Tea/coffee within 1 hour (-60%)'] : [],
    });

    setCustomName('');
  };

  const handleAddAyushRemedyToMeal = (
    remedy: AyushRemedy,
    targetMealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'
  ) => {
    const profile = AYUSH_MEAL_NUTRITION_MAP[remedy.id] || {
      portion: remedy.howToConsume.split('.')[0] || '1 therapeutic serving',
      ironMg: remedy.targetDeficiency.includes('iron') ? 4.0 : 0.5,
      b12Mcg: remedy.targetDeficiency.includes('b12') ? 0.6 : 0.0,
      folateMcg: remedy.targetDeficiency.includes('folate') ? 40.0 : 10.0,
      vitaminCMg: 10.0,
      vitaminDMcg: remedy.targetDeficiency.includes('vitaminD') ? 400.0 : 0.0,
      calciumMg: 50.0,
      absorptionBoosters: remedy.primaryBenefits.slice(0, 2),
      absorptionBlockers: remedy.contraindications ? [remedy.contraindications.split('.')[0]] : [],
    };

    addMeal({
      name: `${remedy.name} (AYUSH Food)`,
      portion: profile.portion,
      ironMg: profile.ironMg,
      b12Mcg: profile.b12Mcg,
      folateMcg: profile.folateMcg,
      vitaminCMg: profile.vitaminCMg,
      vitaminDMcg: profile.vitaminDMcg,
      calciumMg: profile.calciumMg,
      mealType: targetMealType,
      absorptionBoosters: profile.absorptionBoosters,
      absorptionBlockers: profile.absorptionBlockers,
      notes: `Added from AYUSH formulation (Ref: ${remedy.id})`,
    });
  };

  const handleAddAyushTonic = (
    title: string,
    iron: number,
    b12: number,
    folate: number,
    vitD: number,
    timing: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner',
    vitC: number = 30,
    calcium: number = 20
  ) => {
    addMeal({
      name: title,
      portion: '1 AYUSH therapeutic serving',
      ironMg: iron,
      b12Mcg: b12,
      folateMcg: folate,
      vitaminCMg: vitC,
      vitaminDMcg: vitD,
      calciumMg: calcium,
      mealType: timing,
      absorptionBoosters: ['AYUSH Bio-Enhancer synergy', 'Deep cellular bioavailability'],
      absorptionBlockers: [],
    });
  };

  const getProgressWidth = (current: number, target: number) => {
    return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Quick Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FCE7F3] shadow-xs">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Real-Time Micronutrient Meal Tracker
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            log custom dishes or select from curated dishes suggested
          </p>
        </div>

        {/* Header Actions: Clear Log */}
        <div className="flex items-center gap-2 shrink-0">

          {meals.length > 0 && (
            <button
              type="button"
              id="btn-clear-all-meals"
              onClick={() => {
                meals.forEach((m) => removeMeal(m.id));
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FFF1F2] hover:bg-rose-100 text-[#F43F5E] hover:text-rose-700 text-xs font-bold rounded-xl border border-[#FCE7F3] transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* ICMR-NIN 2020 Recommended Dietary Allowances (RDA) & EAR Target Matrix */}
      <section
        id="icmr-nin-rda-matrix"
        className="rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <BookOpen className="w-5 h-5 text-[#F43F5E] mt-0.5 shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  ICMR-NIN 2020 Dietary Benchmark &amp; Nutrient Requirements
                </h3>
                {demographics.age && demographics.sex ? (
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <span>{demographics.age} y/o • {demographics.sex === 'male' ? 'Male' : 'Female'}</span>
                    {demographics.isPregnant ? ' (Pregnant)' : demographics.isLactating ? ' (Lactating)' : ''}
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <span>Profile Incomplete • National Benchmark</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {demographics.age && demographics.sex ? (
                  <>
                    Dynamic EAR &amp; RDA automatically populated for <span className="font-bold text-slate-800">{icmrProfile.cohortName}</span> from your Step 1 profile (Ref: {icmrProfile.refWeightKg}kg, {icmrProfile.energyEerKcal} kcal/d, {icmrProfile.proteinRdaG}g protein).
                  </>
                ) : (
                  <>
                    Showing standard benchmark for <span className="font-bold text-slate-800">{icmrProfile.cohortName}</span>. Set your age and gender in Step 1 to dynamically tailor requirements to your cohort.
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="text-[11px] font-bold text-slate-700 hover:text-[#F43F5E] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{demographics.age && demographics.sex ? 'Edit Age / Gender' : '+ Set Age & Gender (Step 1)'}</span>
            </button>
            <a
              href="https://www.nin.res.in/rdabook/brief_note.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-[#F43F5E] hover:underline flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200"
            >
              <span>ICMR-NIN PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 6 Core Micronutrient Target Benchmark Grid (Iron, Vit B12, Folate, Vit C, Vit D3, Calcium) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Iron */}
          <div className="p-3.5 rounded-2xl bg-[#FFF5F7] border border-[#FCE7F3] space-y-1">
            <span className="text-[10px] font-bold uppercase text-[#F43F5E]">1. Elemental Iron</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.ironMg} <span className="text-xs font-normal text-slate-500">mg/d</span></div>
            <div className="text-[10px] text-slate-600">EAR: <strong className="text-slate-800">{icmrBaseline.ironEarMg} mg/d</strong></div>
            <span className="inline-block text-[9px] bg-white text-[#F43F5E] font-semibold px-1.5 py-0.5 rounded border border-rose-200">
              RDA: 97.5% Pop
            </span>
          </div>

          {/* 2. Vitamin B12 */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/70 space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-700">2. Vitamin B12</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.b12Mcg} <span className="text-xs font-normal text-slate-500">µg/d</span></div>
            <div className="text-[10px] text-slate-600">EAR: <strong className="text-slate-800">{icmrBaseline.b12EarMcg} µg/d</strong></div>
            <span className="inline-block text-[9px] bg-white text-purple-700 font-semibold px-1.5 py-0.5 rounded border border-purple-200">
              Nerve &amp; Blood
            </span>
          </div>

          {/* 3. Folate (B9) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-700">3. Folate (B9)</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.folateMcg} <span className="text-xs font-normal text-slate-500">µg/d</span></div>
            <div className="text-[10px] text-slate-600">EAR: <strong className="text-slate-800">{icmrBaseline.folateEarMcg} µg/d</strong></div>
            <span className="inline-block text-[9px] bg-white text-emerald-700 font-semibold px-1.5 py-0.5 rounded border border-emerald-200">
              RBC &amp; Cell Synthesis
            </span>
          </div>

          {/* 4. Vitamin C */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
            <span className="text-[10px] font-bold uppercase text-amber-700">4. Vitamin C</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.vitaminCMg || 65} <span className="text-xs font-normal text-slate-500">mg/d</span></div>
            <div className="text-[10px] text-slate-600">Catalyst: <strong className="text-slate-800">+200% Fe Uptake</strong></div>
            <span className="inline-block text-[9px] bg-white text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-200">
              Absorption Enhancer
            </span>
          </div>

          {/* 5. Vitamin D3 */}
          <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-1">
            <span className="text-[10px] font-bold uppercase text-orange-700">5. Vitamin D3</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.vitaminDMcg || 600} <span className="text-xs font-normal text-slate-500">µg/d</span></div>
            <div className="text-[10px] text-slate-600">Immunity &amp; Calcium Uptake</div>
            <span className="inline-block text-[9px] bg-white text-orange-700 font-semibold px-1.5 py-0.5 rounded border border-orange-200">
              {demographics.age && demographics.age >= 60 ? '800 µg Elderly RDA' : '600 µg Adult Target'}
            </span>
          </div>

          {/* 6. Calcium */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-700">6. Calcium</span>
            <div className="text-lg font-black text-slate-900">{icmrBaseline.calciumMg || 1000} <span className="text-xs font-normal text-slate-500">mg/d</span></div>
            <div className="text-[10px] text-slate-600">Bone Matrix &amp; Osteo-Guard</div>
            <span className="inline-block text-[9px] bg-white text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-200">
              1,000 mg RDA
            </span>
          </div>
        </div>

        {/* Dynamic Cohort Life-Stage Macro & Micronutrient Parameters Strip */}
        <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-bold text-slate-900">{icmrProfile.cohortName} Parameters:</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600 text-[11px]">
            <span>⚡ Energy (EER): <strong className="text-slate-900 font-bold">{icmrProfile.energyEerKcal} kcal/d</strong></span>
            <span>🥩 Protein Target: <strong className="text-slate-900 font-bold">{icmrBaseline.proteinG} g/d</strong> {demographics.weightKg ? `(${demographics.weightKg}kg × 0.83)` : '(0.83 g/kg)'}</span>
            <span>🥗 Fiber: <strong className="text-slate-900 font-bold">{icmrBaseline.dietaryFiberG || 30} g/d</strong></span>
            <span>🛡️ Zinc (RDA/EAR): <strong className="text-slate-900 font-bold">{icmrBaseline.zincMg} / {icmrBaseline.zincEarMg} mg/d</strong></span>
          </div>
        </div>

        {/* Informational callout on EAR vs RDA distinction + Age Cohort Guidance */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="leading-relaxed">
              <strong className="text-slate-900">ICMR-NIN 2020 Standard: </strong>
              <span className="font-semibold text-slate-800">EAR (Estimated Average Requirement)</span> meets the median requirement of 50% of the population, whereas <span className="font-semibold text-slate-800">RDA (Recommended Dietary Allowance)</span> is set at 2 standard deviations above the EAR to ensure complete nutritional adequacy for 97.5% of individuals.
            </p>
            {demographics.age && demographics.age >= 40 && demographics.age < 60 && (
              <p className="text-[11px] text-rose-700 font-medium">
                ✨ <strong>Age 40–59 Cohort Adaptation:</strong> Caloric EER is calibrated to 1,520 kcal/day (accounting for standard metabolic slowdown per ICMR Table 2.1) while maintaining 29 mg/day elemental iron and 1,000 mg/day calcium for bone mineral density preservation during perimenopause.
              </p>
            )}
            {demographics.age && demographics.age >= 60 && (
              <p className="text-[11px] text-purple-700 font-medium">
                ✨ <strong>Senior (60+ Years) Adaptation:</strong> Vitamin D RDA increases to 800 µg/day, with elemental iron adjusted to 19 mg/day post-menopause.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Real-Time Daily Totals vs ICMR RDA Progress Cards (All 6 Parameters) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Iron Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-[#F43F5E]" />
              1. Iron
            </span>
            <span className="text-[10px] font-bold text-[#F43F5E] bg-[#FFF1F2] px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.ironMg, rda.ironMg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.ironMg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.ironMg} mg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#F43F5E] transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.ironMg, rda.ironMg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate" title={`Target: ${rda.ironMg} mg (EAR: ${rda.ironEarMg || 15}mg)`}>
            Target: {rda.ironMg}mg (EAR: {rda.ironEarMg || 15}mg)
          </span>
        </div>

        {/* 2. Vitamin B12 Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              2. Vit B12
            </span>
            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.b12Mcg, rda.b12Mcg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.b12Mcg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.b12Mcg} µg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-300 to-violet-600 transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.b12Mcg, rda.b12Mcg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate">
            Target: {rda.b12Mcg} µg / day
          </span>
        </div>

        {/* 3. Folate B9 Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Leaf className="w-3.5 h-3.5 text-emerald-500" />
              3. Folate
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.folateMcg, rda.folateMcg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.folateMcg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.folateMcg} µg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-600 transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.folateMcg, rda.folateMcg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate">
            Target: {rda.folateMcg} µg / day
          </span>
        </div>

        {/* 4. Vitamin C Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-amber-500" />
              4. Vit C
            </span>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.vitaminCMg, rda.vitaminCMg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.vitaminCMg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.vitaminCMg} mg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.vitaminCMg, rda.vitaminCMg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate">
            Target: {rda.vitaminCMg} mg (Enhancer)
          </span>
        </div>

        {/* 5. Vitamin D3 Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-orange-500" />
              5. Vit D3
            </span>
            <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.vitaminDMcg, rda.vitaminDMcg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.vitaminDMcg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.vitaminDMcg} µg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-300 to-orange-500 transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.vitaminDMcg, rda.vitaminDMcg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate">
            Target: {rda.vitaminDMcg} µg / day
          </span>
        </div>

        {/* 6. Calcium Card */}
        <div className="rounded-2xl bg-white p-4 border border-[#FCE7F3] shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
              6. Calcium
            </span>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-full">
              {getProgressWidth(dailyTotals.calciumMg, rda.calciumMg)}%
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{dailyTotals.calciumMg}</span>
            <span className="text-[11px] font-medium text-slate-500">/ {rda.calciumMg} mg</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-300 to-sky-600 transition-all duration-300"
              style={{ width: `${getProgressWidth(dailyTotals.calciumMg, rda.calciumMg)}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 block font-medium truncate">
            Target: {rda.calciumMg} mg (Buffer 2h)
          </span>
        </div>
      </div>

      {/* Main Logging Studio & Journal Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Meal Logging Studio (7 cols) */}
        <section
          id="meal-logging-studio"
          className="lg:col-span-7 rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-5"
        >
          {/* Header & Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-[#F43F5E]" />
              <h3 className="text-base font-bold text-slate-900">
                Log Meal / Nutrient Intake
              </h3>
            </div>

            {/* Entry Mode Switcher */}
            <div className="flex flex-wrap items-center p-1 bg-slate-100 rounded-xl gap-1">
              <button
                type="button"
                id="tab-mode-wifs"
                onClick={() => {
                  setActiveEntryMode('wifs');
                  setMealEntryMode('wifs');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeEntryMode === 'wifs'
                    ? 'bg-white text-[#F43F5E] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>WIFS Handbook Recipes</span>
              </button>
              <button
                type="button"
                id="tab-mode-library"
                onClick={() => {
                  setActiveEntryMode('library');
                  setMealEntryMode('library');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeEntryMode === 'library'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Food Library
              </button>
              <button
                type="button"
                id="tab-mode-custom"
                onClick={() => {
                  setActiveEntryMode('custom');
                  setMealEntryMode('custom');
                }}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeEntryMode === 'custom'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Custom Entry
              </button>

            </div>
          </div>

          {/* Meal Type Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  mealType === type
                    ? 'bg-[#F43F5E] text-white border-[#F43F5E] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-[#FFF5F7]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* TAB 0: WIFS TECHNICAL HANDBOOK ON ANAEMIA IN ADOLESCENTS RECIPES */}
          {activeEntryMode === 'wifs' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Handbook Banner & Key Directives */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FFF1F2] to-[#FFF5F7] border border-[#FCE7F3] space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-[#F43F5E] text-white rounded-lg">
                      <BookOpen className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Technical Handbook on Anaemia in Adolescents
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        WIFS Program (Govt. of India & UNICEF) Clinical Dietary Formulations
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-[#F43F5E]/10 text-[#F43F5E] px-2 py-0.5 rounded-full shrink-0">
                    Official Protocol
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="p-2 bg-white rounded-xl border border-rose-100 text-[11px] space-y-0.5">
                    <span className="font-bold text-[#F43F5E] block">1. High-Iron Plant Greens</span>
                    <p className="text-slate-600 text-[10px] leading-tight">
                      Chana Saag (9.8mg Fe), Kantewali Chaulai (8.5mg Fe), Arvi Saag (7.6mg Fe).
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-rose-100 text-[11px] space-y-0.5">
                    <span className="font-bold text-emerald-700 block">2. Vitamin C Synergy</span>
                    <p className="text-slate-600 text-[10px] leading-tight">
                      Amla, Lemon & Drumstick leaves multiply non-heme absorption by 200–300%.
                    </p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-rose-100 text-[11px] space-y-0.5">
                    <span className="font-bold text-amber-700 block">3. 2-Hour Tea Separation</span>
                    <p className="text-slate-600 text-[10px] leading-tight">
                      Strictly avoid tea, coffee & milk drinks within 2 hrs of iron-dense meals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Handbook Quick Recipes Cards List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Official Handbook Recipes ({wifsHandbookFoods.length} Formulations)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Target Meal: <strong className="text-[#F43F5E]">{mealType}</strong>
                  </span>
                </div>

                <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
                  {wifsHandbookFoods.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-[#FFF5F7] rounded-2xl border border-slate-200/80 hover:border-rose-300 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{item.name}</span>
                            {item.regionalName && (
                              <span className="text-[10px] text-slate-500 italic">
                                • {item.regionalName}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.handbookNotes}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddDirectWifsFood(item, mealType)}
                          className="px-3 py-1.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                        >
                          + Log to {mealType}
                        </button>
                      </div>

                      {/* Nutrient Pills & Synergy Notes */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 text-[11px]">
                        <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-[#F43F5E] font-bold rounded-lg">
                          {item.ironMg}mg Iron
                        </span>
                        {item.folateMcg > 0 && (
                          <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-lg">
                            {item.folateMcg}µg Folate
                          </span>
                        )}
                        {item.b12Mcg > 0 && (
                          <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-lg">
                            {item.b12Mcg}µg B12
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">Portion: {item.standardPortion}</span>
                      </div>

                      {item.absorptionBoosters.length > 0 && (
                        <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50/60 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{item.absorptionBoosters[0]}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: CURATED INDIAN & BIGQUERY FOOD LIBRARY */}
          {activeEntryMode === 'library' && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="block text-xs font-bold text-slate-800">
                      Food Library &amp; BigQuery Database
                    </label>
                    <span className="text-[10px] font-extrabold bg-[#FFF1F2] text-[#F43F5E] px-2 py-0.5 rounded-full border border-rose-200">
                      {filteredFoods.length.toLocaleString()} of {allAvailableFoods.length.toLocaleString()} items
                    </span>
                    {customImportedFoods.length > 0 && (
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <HardDrive className="w-3 h-3" />
                        {customImportedFoods.length.toLocaleString()} in IndexedDB
                      </span>
                    )}
                  </div>

                  {/* Actions & Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsCsvModalOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Import CSV (13k+)</span>
                    </button>
                    <button
                      type="button"
                      id="btn-export-csv"
                      onClick={handleExportLibraryToCsv}
                      className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      title="Export entire food library to CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap items-center gap-1 text-[10px] mb-2">
                  <button
                    type="button"
                    onClick={() => setLibraryFilter('all')}
                    className="px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer bg-[#F43F5E] text-white shadow-2xs"
                  >
                    All Foods
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    id="input-search-foods"
                    placeholder="Search across all 13,000+ foods (e.g. Spinach, Moringa, Chana, Palak, Salmon, Bajra, Til, Egg, Liver, Rice)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-16 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#F43F5E] focus:bg-white transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Food list - Paginated for buttery smooth performance */}
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                  {filteredFoods.length === 0 ? (
                    <div className="py-8 px-4 text-center space-y-2">
                      <p className="text-xs font-semibold text-slate-600">
                        No foods matched &quot;{searchQuery}&quot;.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Try another keyword, or click &quot;Import CSV (13k+)&quot; to upload your full 13,000+ row dataset.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsCsvModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer mt-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload 13k CSV Dataset</span>
                      </button>
                    </div>
                  ) : (
                    paginatedFoods.map((food) => {
                      const isSelected = selectedFood?.id === food.id;
                      return (
                        <div
                          key={food.id}
                          onClick={() => setSelectedFood(food)}
                          className={`p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#FFF5F7] border-[#F43F5E] shadow-2xs ring-1 ring-[#F43F5E]'
                              : 'bg-white hover:bg-rose-50/40 border-slate-200/80 text-slate-800'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 truncate">{food.name}</span>
                                {food.isWifsHandbook && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-[#F43F5E] px-1.5 py-0.2 rounded-md shrink-0">
                                    WIFS
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span>{food.category}</span>
                                <span className="mx-1">·</span>
                                <span className="text-slate-400">{food.standardPortion}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFood(food);
                              }}
                              className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                                isSelected
                                  ? 'bg-[#F43F5E] text-white'
                                  : 'bg-slate-100 text-slate-700 hover:bg-[#F43F5E] hover:text-white'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </div>

                          {/* Micronutrient Breakdown Pills */}
                          <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-slate-100 text-[10px] font-semibold">
                            <span className="text-[#F43F5E] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                              Fe: <strong>{food.ironMg}mg</strong>
                            </span>
                            <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                              B12: <strong>{food.b12Mcg}µg</strong>
                            </span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              Folate: <strong>{food.folateMcg}µg</strong>
                            </span>
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              Vit C: <strong>{food.vitaminCMg ?? 0}mg</strong>
                            </span>
                            <span className="text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                              Vit D: <strong>{food.vitaminDMcg ?? 0}µg</strong>
                            </span>
                            <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                              Ca: <strong>{food.calciumMg ?? 0}mg</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Pagination Controls Toolbar */}
                {filteredFoods.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span>
                        Showing{' '}
                        <strong className="text-slate-800">
                          {(currentPage - 1) * pageSize + 1}
                        </strong>{' '}
                        to{' '}
                        <strong className="text-slate-800">
                          {Math.min(currentPage * pageSize, filteredFoods.length).toLocaleString()}
                        </strong>{' '}
                        of{' '}
                        <strong className="text-slate-800">
                          {filteredFoods.length.toLocaleString()}
                        </strong>
                      </span>
                      <span className="text-slate-300">|</span>
                      <span>Page {currentPage} of {totalPages}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label="Items per page"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-[#F43F5E]"
                      >
                        <option value={25}>25 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                        <option value={200}>200 / page</option>
                      </select>

                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="First Page"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Previous Page"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 rounded-lg">
                          {currentPage}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Next Page"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage >= totalPages}
                          className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Last Page"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Food Preview & Servings */}
              <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#FCE7F3] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">{selectedFood?.name || 'Selected Food'}</span>
                    <span className="text-[11px] text-slate-500">{selectedFood?.category || 'General'} · {selectedFood?.standardPortion || '1 serving'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">Servings:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={servings}
                      onChange={(e) => setServings(Number(e.target.value) || 1)}
                      className="w-16 rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-[#F43F5E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">Iron</span>
                    <span className="font-bold text-[#F43F5E]">
                      {Math.round((selectedFood?.ironMg || 0) * servings * 10) / 10} mg
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">B12</span>
                    <span className="font-bold text-violet-600">
                      {Math.round((selectedFood?.b12Mcg || 0) * servings * 10) / 10} µg
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">Folate</span>
                    <span className="font-bold text-emerald-600">
                      {Math.round((selectedFood?.folateMcg || 0) * servings * 10) / 10} µg
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">Vit C</span>
                    <span className="font-bold text-amber-600">
                      {Math.round(((selectedFood?.vitaminCMg || (hasVitaminCBooster ? 25 : 5)) * servings) * 10) / 10} mg
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">Vit D</span>
                    <span className="font-bold text-orange-600">
                      {Math.round((selectedFood?.vitaminDMcg || 0) * servings * 10) / 10} µg
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-[#FCE7F3]">
                    <span className="text-[10px] text-slate-400 block font-medium">Calcium</span>
                    <span className="font-bold text-sky-600">
                      {Math.round(((selectedFood?.calciumMg || 30) * servings) * 10) / 10} mg
                    </span>
                  </div>
                </div>
              </div>

              {/* Bioavailability Modifiers */}
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVitaminCBooster}
                    onChange={(e) => setHasVitaminCBooster(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-emerald-900">
                    Paired with Vitamin C Booster (Lemon squeeze / Amla / Raw Tomato) (+200% Iron Uptake)
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50/50 border border-rose-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTanninBlocker}
                    onChange={(e) => setHasTanninBlocker(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-rose-900">
                    Drank Chai / Coffee / Milk along with meal (-60% Absorption Chelation)
                  </span>
                </label>
              </div>

              <button
                id="btn-log-meal-library"
                onClick={handleAddMealFromLibrary}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold py-3.5 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Log {selectedFood?.name || 'Food Item'} to {mealType}</span>
              </button>
            </div>
          )}

          {/* TAB 2: CUSTOM FOOD ITEM ENTRY FORM WITH AUTOCOMPLETE SUGGESTIONS */}
          {activeEntryMode === 'custom' && (
            <form onSubmit={handleAddCustomMeal} className="space-y-4">
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <Sparkle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Smart Food Autocomplete &amp; Like Search</span>
                  <span className="text-[11px] text-amber-800">
                    Type any food name below. As you type, matching items from the BigQuery table will appear in a dropdown. Clicking any suggestion will automatically auto-fill all 6 micronutrients!
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Food / Meal Name (Type to search &amp; auto-fill)
                  </label>
                  <input
                    type="text"
                    required
                    id="custom-food-name"
                    value={customName}
                    onFocus={() => setIsAutocompleteOpen(true)}
                    onChange={(e) => {
                      setCustomName(e.target.value);
                      setIsAutocompleteOpen(true);
                    }}
                    placeholder="e.g. Spinach, Egg, Chana, Salmon, Bajra, Oats..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                  />

                  {/* Autocomplete dropdown */}
                  {isAutocompleteOpen && customAutocompleteMatches.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-2xl border border-rose-200 shadow-xl max-h-52 overflow-y-auto p-1 space-y-1">
                      <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                        <span>Matching BigQuery &amp; Library Foods</span>
                        <button
                          type="button"
                          onClick={() => setIsAutocompleteOpen(false)}
                          className="text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      {customAutocompleteMatches.map((food) => (
                        <div
                          key={food.id}
                          onClick={() => selectFromCustomAutocomplete(food)}
                          className="p-2 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors text-xs border border-transparent hover:border-rose-200"
                        >
                          <div className="font-bold text-slate-800 flex items-center justify-between">
                            <span>{food.name}</span>
                            <span className="text-[10px] text-[#F43F5E] font-bold">
                              {food.ironMg}mg Fe · {food.calciumMg || 0}mg Ca
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex gap-2">
                            <span>B12: {food.b12Mcg}µg</span>
                            <span>Folate: {food.folateMcg}µg</span>
                            <span>Vit C: {food.vitaminCMg || 0}mg</span>
                            <span>Vit D: {food.vitaminDMcg || 0}µg</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Portion Description
                  </label>
                  <input
                    type="text"
                    value={customPortion}
                    onChange={(e) => setCustomPortion(e.target.value)}
                    placeholder="e.g. 1 medium bowl (200g)"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-[#F43F5E] mb-1">
                    1. Iron (mg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customIron}
                    onChange={(e) => setCustomIron(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-violet-600 mb-1">
                    2. B12 (µg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customB12}
                    onChange={(e) => setCustomB12(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-emerald-600 mb-1">
                    3. Folate (µg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customFolate}
                    onChange={(e) => setCustomFolate(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-amber-600 mb-1">
                    4. Vit C (mg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customVitC}
                    onChange={(e) => setCustomVitC(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-orange-600 mb-1">
                    5. Vit D (µg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={customVitD}
                    onChange={(e) => setCustomVitD(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-[10px] font-bold text-sky-600 mb-1">
                    6. Calcium (mg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={customCalcium}
                    onChange={(e) => setCustomCalcium(e.target.value === '' ? '' : Number(e.target.value) || 0)}
                    className="w-full bg-white rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 text-center"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-log-custom-meal"
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold py-3.5 shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add {customName || 'Custom Food'} to {mealType}</span>
              </button>
            </form>
          )}

          {/* TAB 3: AYUSH VERIFIED & OTHERS */}
          {activeEntryMode === 'ayush' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Single Unified List of ALL AYUSH Verified & Others */}
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {ayushRemedies.map((remedy) => {
                  const isOther =
                    remedy.id === 'mahua-flower-laddoo' ||
                    remedy.id === 'mahuwa-flower-laddoo' ||
                    remedy.id === 'fresh-wheatgrass-juice' ||
                    remedy.id === 'ayurvedic-takra-buttermilk';

                  const profile = AYUSH_MEAL_NUTRITION_MAP[remedy.id] || {
                    portion: remedy.howToConsume.split('.')[0] || '1 therapeutic serving',
                    ironMg: remedy.targetDeficiency.includes('iron') ? 4.0 : 0.5,
                    b12Mcg: remedy.targetDeficiency.includes('b12') ? 0.6 : 0.0,
                    folateMcg: remedy.targetDeficiency.includes('folate') ? 40.0 : 10.0,
                    vitaminCMg: 10.0,
                    vitaminDMcg: remedy.targetDeficiency.includes('vitaminD') ? 400.0 : 0.0,
                    calciumMg: 50.0,
                    absorptionBoosters: remedy.primaryBenefits.slice(0, 2),
                    absorptionBlockers: [],
                  };

                  const loggedMeals = meals.filter(
                    (m) =>
                      m.name.toLowerCase().includes(remedy.name.toLowerCase().split('(')[0].trim().toLowerCase()) ||
                      m.notes?.includes(remedy.id)
                  );
                  const loggedSlots = Array.from(new Set(loggedMeals.map((m) => m.mealType)));
                  const isLoggedCurrentMeal = loggedSlots.includes(mealType);

                  return (
                    <div
                      key={remedy.id}
                      className="p-3.5 bg-slate-50/80 hover:bg-[#FFF5F7] rounded-2xl border border-slate-200 hover:border-rose-300 transition-all space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {remedy.name}
                              {remedy.sanskritName ? ` (${remedy.sanskritName})` : ''}
                            </span>
                            {!isOther ? (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md">
                                AYUSH Verified
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-md">
                                Botanical / Other
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {remedy.primaryBenefits.slice(0, 2).join(' • ')}
                          </p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">{remedy.howToConsume}</p>
                        </div>

                        {/* Log to Meal Action Button (similar to WIFS Handbook interface) */}
                        <button
                          type="button"
                          id={`btn-log-ayush-${remedy.id}-${mealType.toLowerCase()}`}
                          onClick={() => handleAddAyushRemedyToMeal(remedy, mealType)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            isLoggedCurrentMeal
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-[#F43F5E] hover:bg-[#E11D48] text-white'
                          }`}
                        >
                          {isLoggedCurrentMeal ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Logged to {mealType}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Log to {mealType}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Nutrient Pills */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {profile.ironMg > 0 && (
                            <span className="px-2 py-0.5 bg-rose-50 border border-rose-200 text-[#F43F5E] font-bold rounded-lg">
                              {profile.ironMg}mg Iron
                            </span>
                          )}
                          {profile.folateMcg > 0 && (
                            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold rounded-lg">
                              {profile.folateMcg}µg Folate
                            </span>
                          )}
                          {profile.b12Mcg > 0 && (
                            <span className="px-2 py-0.5 bg-violet-50 border border-violet-200 text-violet-700 font-semibold rounded-lg">
                              {profile.b12Mcg}µg B12
                            </span>
                          )}
                          {profile.vitaminCMg > 0 && (
                            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 font-semibold rounded-lg">
                              {profile.vitaminCMg}mg Vit C
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Portion: {profile.portion}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Today's Logged Meals History (5 cols) */}
        <section
          id="daily-logged-meals-history"
          className="lg:col-span-5 rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Today’s Meal Journal</h3>
              <span className="text-[11px] text-slate-400 block">{meals.length} Meals Prepared & Logged</span>
            </div>
            {meals.length > 0 && (
              <button
                type="button"
                id="btn-save-log-to-dashboard"
                onClick={() => {
                  setSavedToDashboardToast(true);
                  setTimeout(() => setSavedToDashboardToast(false), 3500);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save to Dashboard</span>
              </button>
            )}
          </div>

          {/* Toast Notification */}
          {savedToDashboardToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Meal log successfully saved & reflected on your Dashboard!</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="text-[11px] font-bold text-emerald-700 underline hover:text-emerald-900 cursor-pointer shrink-0"
              >
                View Dashboard →
              </button>
            </div>
          )}

          {meals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-medium">No meals logged yet today. Click &quot;1-Click Sample Meal Plan&quot; or log your custom dish!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="rounded-2xl p-3.5 bg-slate-50/70 border border-slate-200 hover:border-slate-300 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F43F5E] text-white">
                          {meal.mealType}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{meal.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{meal.timestamp} · {meal.portion}</span>
                    </div>

                    <button
                      onClick={() => removeMeal(meal.id)}
                      className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove meal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] font-semibold text-slate-600 pt-1">
                    <span className="text-[#F43F5E] bg-[#FFF1F2] px-1.5 py-1 rounded-lg border border-rose-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.ironMg ?? 0}mg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">Iron</span>
                    </span>
                    <span className="text-violet-700 bg-violet-50 px-1.5 py-1 rounded-lg border border-violet-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.b12Mcg ?? 0}µg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">B12</span>
                    </span>
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-1 rounded-lg border border-emerald-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.folateMcg ?? 0}µg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">Folate</span>
                    </span>
                    <span className="text-amber-700 bg-amber-50 px-1.5 py-1 rounded-lg border border-amber-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.vitaminCMg ?? 0}mg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">Vit C</span>
                    </span>
                    <span className="text-orange-700 bg-orange-50 px-1.5 py-1 rounded-lg border border-orange-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.vitaminDMcg ?? 0}µg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">Vit D</span>
                    </span>
                    <span className="text-sky-700 bg-sky-50 px-1.5 py-1 rounded-lg border border-sky-200 text-center">
                      <strong className="block text-[11px] font-black">{meal.calciumMg ?? 0}mg</strong>
                      <span className="text-[9px] text-slate-500 font-medium">Calcium</span>
                    </span>
                  </div>

                  {meal.absorptionBoosters && meal.absorptionBoosters.length > 0 && (
                    <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>{meal.absorptionBoosters.join(', ')}</span>
                    </div>
                  )}

                  {meal.absorptionBlockers && meal.absorptionBlockers.length > 0 && (
                    <div className="text-[10px] text-rose-700 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>{meal.absorptionBlockers.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* CSV / BigQuery Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    High-Capacity Food Library Importer (13,000+ Rows)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Import full BigQuery, USDA, or custom nutrition datasets directly into IndexedDB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setCsvError(null);
                  setCsvUploadSuccess(null);
                  setImportStats(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Storage Architecture Callout */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs space-y-1 text-emerald-900">
              <div className="flex items-center gap-1.5 font-bold">
                <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>IndexedDB High-Capacity Storage Active</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                All 13,000+ food entries are stored in your browser&apos;s <strong>IndexedDB database</strong> (not limited by the 5MB localStorage limit), ensuring all rows are preserved across reloads without lag.
              </p>
            </div>

            {/* Import Mode: Replace vs Append */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Import Behavior:</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="text-[#F43F5E] focus:ring-[#F43F5E]"
                  />
                  <span>Replace Library</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium ml-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="text-[#F43F5E] focus:ring-[#F43F5E]"
                  />
                  <span>Append to Existing</span>
                </label>
              </div>
            </div>

            {/* Method Tabs: File Upload vs Direct Paste */}
            <div className="flex border-b border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsPastingCsv(false)}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  !isPastingCsv
                    ? 'border-[#F43F5E] text-[#F43F5E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Upload CSV / TSV File
              </button>
              <button
                type="button"
                onClick={() => setIsPastingCsv(true)}
                className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
                  isPastingCsv
                    ? 'border-[#F43F5E] text-[#F43F5E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Paste CSV Text Directly
              </button>
            </div>

            {!isPastingCsv ? (
              /* File Upload Area */
              <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-emerald-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values"
                  onChange={handleFileUpload}
                  disabled={isProcessingCsv}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {isProcessingCsv ? (
                  <div className="space-y-2">
                    <RefreshCw className="w-8 h-8 text-emerald-600 mx-auto animate-spin" />
                    <p className="text-xs font-bold text-slate-800">
                      Processing and indexing 13k+ nutritional items...
                    </p>
                    <p className="text-[11px] text-slate-400">Saving to IndexedDB</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-800">
                      Click to browse or drag and drop your 13k CSV file here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports comma (.csv) or tab-delimited (.tsv) up to 50,000 rows
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* Direct Paste Area */
              <div className="space-y-2">
                <textarea
                  value={pasteCsvText}
                  onChange={(e) => setPasteCsvText(e.target.value)}
                  placeholder="Paste your CSV data here (header row followed by data rows)...&#10;Food Name, Iron (mg), Vit B12 (ug), Calcium (mg), Vit D (µg), Vit C (mg), Folate (ug)&#10;Spinach, 3.5, 0, 99, 0, 28, 194&#10;Moringa, 4.0, 0, 185, 0, 220, 40"
                  rows={6}
                  className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-[#F43F5E] focus:bg-white resize-none"
                />
                <button
                  type="button"
                  onClick={() => handleProcessCsvString(pasteCsvText, 'Pasted CSV Data')}
                  disabled={!pasteCsvText.trim() || isProcessingCsv}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isProcessingCsv ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Parsing and saving to IndexedDB...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Import &amp; Process Pasted CSV</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Expected format helper */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Expected Column Headers:</span>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="text-[11px] font-bold text-[#F43F5E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Sample Template</span>
                </button>
              </div>
              <div className="flex flex-wrap gap-1 font-mono text-[10px] text-slate-700">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Food Name</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Iron (mg)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Vit B12 (µg)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Calcium (mg)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Vit D (µg)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Vit C (mg)</span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">Folate (µg)</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-0.5">
                Auto-matches aliases like &quot;shrt_desc&quot;, &quot;iron_mg&quot;, &quot;fe_mg&quot;, &quot;b12_mcg&quot;, &quot;calcium_mg&quot;, &quot;vit_d&quot;, etc.
              </p>
            </div>

            {/* Status alerts */}
            {csvUploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{csvUploadSuccess}</span>
              </div>
            )}

            {importStats && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Dataset Parsing Summary:</div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-semibold">
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Total Rows</span>
                    <span className="text-slate-900">{importStats.totalRows.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-emerald-200 text-emerald-700">
                    <span className="text-slate-400 block text-[10px]">Imported</span>
                    <span>{importStats.parsedCount.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Skipped</span>
                    <span className="text-slate-500">{importStats.skippedCount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {csvError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{csvError}</span>
              </div>
            )}

            {/* Active imported count */}
            {customImportedFoods.length > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>{customImportedFoods.length.toLocaleString()} custom food(s) currently loaded in IndexedDB</span>
                <button
                  type="button"
                  onClick={async () => {
                    await clearCustomImportedFoods();
                    setCsvUploadSuccess('Cleared custom food dataset.');
                    setTimeout(() => setCsvUploadSuccess(null), 2000);
                  }}
                  className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                >
                  Clear Custom Uploads
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={4}
        currentStageTitle="Stage 4: Meal Planner & ICMR Foods"
        prevTab="ayush"
        prevStageTitle="Stage 3: AYUSH & Traditional Remedies"
        nextTab="tracker"
        nextStageTitle="Stage 5: Health & Lab Tracker"
        nextStageDescription="Log recurring blood test values, monitor Hb trajectories over 30/60/90 days, and track anthropometrics."
      />
    </div>
  );
};
