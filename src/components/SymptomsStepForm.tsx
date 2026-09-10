import React, { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Flame,
  Droplets,
  Zap,
  Sun,
  Leaf,
  Sparkles,
  Info,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Check,
  Stethoscope,
  HeartPulse,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { SevereSymptoms, MenstrualHealth, GutHealth, Demographics, DeficiencyRisk } from '../types';
import { calculateAllDeficiencyRisks } from '../utils/riskEngine';
import { useHealthStore } from '../store/useHealthStore';

export interface DeficiencySymptomItem {
  id: string;
  name: string;
  description: string;
  category: 'iron' | 'b12' | 'folate' | 'vitaminD';
  scientificRationale: string;
}

export const DEFICIENCY_SYMPTOM_GROUPS = [
  {
    id: 'iron',
    title: 'Iron Deficiency Symptoms',
    nutrient: 'Iron / Ferritin (IDA)',
    icon: Droplets,
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    headerBg: 'bg-rose-50/70 border-rose-200',
    accentColor: 'text-[#F43F5E]',
    source: {
      name: 'NIH - National Heart, Lung, and Blood Institute (NHLBI) & ICMR-NIN',
      url: 'https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia',
    },
    symptoms: [
      {
        id: 'iron_fatigue',
        name: 'Fatigue & Low Stamina',
        description: 'Persistent physical tiredness, sluggishness, and low energy levels even after resting.',
        scientificRationale: 'Depleted hemoglobin reduces oxygen delivery to cellular mitochondria for ATP energy production.',
      },
      {
        id: 'iron_dizziness',
        name: 'Dizziness or Lightheadedness',
        description: 'Postural wooziness, feeling faint, or seeing stars when quickly standing up.',
        scientificRationale: 'Cerebral micro-hypoxia caused by diminished blood oxygen-carrying capacity.',
      },
      {
        id: 'iron_cold_hands',
        name: 'Cold Hands and Feet',
        description: 'Chronically chilly fingers, toes, and sensitivity to AC or cold temperatures.',
        scientificRationale: 'Peripheral vasoconstriction shunts limited oxygenated blood to vital core organs.',
      },
      {
        id: 'iron_pale_skin',
        name: 'Pale Skin (Pallor)',
        description: 'Loss of healthy pinkish color in the lower inner eyelids, nail beds, gums, or skin.',
        scientificRationale: 'Reduced red blood cell count and diminished oxyhemoglobin circulating in skin capillaries.',
      },
      {
        id: 'iron_breathlessness',
        name: 'Shortness of Breath on Exertion',
        description: 'Feeling winded after climbing stairs, walking uphill, or routine daily physical effort.',
        scientificRationale: 'Lungs hyperventilate to compensate for reduced hemoglobin carrying capacity.',
      },
    ],
  },
  {
    id: 'b12',
    title: 'Vitamin B12 (Cobalamin) Deficiency Symptoms',
    nutrient: 'Vitamin B12 (Cobalamin)',
    icon: Zap,
    badgeColor: 'bg-violet-100 text-violet-800 border-violet-200',
    headerBg: 'bg-violet-50/70 border-violet-200',
    accentColor: 'text-violet-600',
    source: {
      name: 'NIH - National Heart, Lung, and Blood Institute (NHLBI) & NIH ODS',
      url: 'https://www.nhlbi.nih.gov/health/anemia/vitamin-b12-deficiency-anemia',
    },
    symptoms: [
      {
        id: 'b12_tingling',
        name: 'Tingling Feelings or Pain (Pins & Needles)',
        description: 'Paresthesia, numbness, or tingling sensations in fingers, hands, feet, or legs.',
        scientificRationale: 'B12 is required for myelin sheath maintenance; deficiency causes subacute combined peripheral neuropathy.',
      },
      {
        id: 'b12_trouble_walking',
        name: 'Trouble Walking & Balance Issues',
        description: 'Unsteady gait, stumbling, dizziness, or loss of coordination (peripheral ataxia).',
        scientificRationale: 'Dorsal spinal column demyelination impairs spatial proprioceptive feedback.',
      },
      {
        id: 'b12_muscle_movements',
        name: 'Uncontrollable Muscle Movements',
        description: 'Involuntary muscle twitches, cramps, tremors, or muscle weakness in arms/legs.',
        scientificRationale: 'Disrupted motor neuron transmission secondary to cobalamin coenzyme deficiency.',
      },
      {
        id: 'b12_confusion_memory',
        name: 'Confusion, Slower Thinking & Memory Loss',
        description: 'Cognitive brain fog, forgetfulness, difficulty concentrating, or sluggish mental processing.',
        scientificRationale: 'Impaired one-carbon S-adenosylmethionine (SAM) methylation in cerebral neurotransmitter synthesis.',
      },
      {
        id: 'b12_mood_changes',
        name: 'Mood or Mental Changes',
        description: 'Unexplained depression, low mood, irritability, anxiety, or emotional volatility.',
        scientificRationale: 'Accumulation of homocysteine and disrupted serotonin/dopamine metabolic pathways.',
      },
      {
        id: 'b12_smell_taste',
        name: 'Problems with Smell or Taste',
        description: 'Diminished, altered, or dulled sense of taste and olfactory perception.',
        scientificRationale: 'Cranial nerve sensory receptor atrophy and lingual papillae alteration.',
      },
      {
        id: 'b12_vision',
        name: 'Vision Problems & Blurriness',
        description: 'Blurred vision, sensitivity to light, or optic nerve discomfort.',
        scientificRationale: 'Optic neuropathy triggered by chronic cobalamin depletion.',
      },
      {
        id: 'b12_diarrhea_weight_loss',
        name: 'Diarrhea and Unexplained Weight Loss',
        description: 'Frequent loose stools, gut malabsorption, and unexplained loss of body weight.',
        scientificRationale: 'Gastrointestinal mucosal epithelial cell atrophy leading to intestinal malabsorption.',
      },
      {
        id: 'b12_glossitis',
        name: 'Glossitis (Painful Smooth Red Tongue)',
        description: 'Painful, swollen, beefy-red tongue with loss of normal surface bumps (papillae).',
        scientificRationale: 'Rapidly dividing lingual mucosal cells fail to synthesize DNA, leading to depapillated glossitis.',
      },
    ],
  },
  {
    id: 'folate',
    title: 'Folate (Vitamin B9) Deficiency Symptoms',
    nutrient: 'Folate (Vitamin B9)',
    icon: Leaf,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    headerBg: 'bg-emerald-50/70 border-emerald-200',
    accentColor: 'text-emerald-600',
    source: {
      name: 'NIH - Office of Dietary Supplements (ODS) & WHO Guidelines',
      url: 'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/',
    },
    symptoms: [
      {
        id: 'folate_weakness',
        name: 'Generalized Weakness',
        description: 'Physical lack of strength, muscle fatigue, and poor stamina during regular activities.',
        scientificRationale: 'Impaired megaloblastic erythropoiesis decreases systemic tissue oxygenation.',
      },
      {
        id: 'folate_fatigue',
        name: 'Persistent Fatigue',
        description: 'Sluggishness, constant tiredness, and heavy limbs throughout the day.',
        scientificRationale: 'Reduced RBC production rate and cellular folate coenzyme depletion.',
      },
      {
        id: 'folate_concentrating',
        name: 'Difficulty Concentrating',
        description: 'Mental sluggishness, reduced attention span, and difficulty sustaining focus.',
        scientificRationale: 'Impaired tetrahydrofolate metabolism in central nervous system neurotransmission.',
      },
      {
        id: 'folate_irritability',
        name: 'Irritability & Restlessness',
        description: 'Heightened emotional agitation, mood swings, or frustration without obvious cause.',
        scientificRationale: 'Hyperhomocysteinemia affecting neurochemical equilibrium.',
      },
      {
        id: 'folate_headache',
        name: 'Frequent Headaches',
        description: 'Recurrent dull tension or vascular headaches and temple heaviness.',
        scientificRationale: 'Cerebral arterial vasodilation compensating for mild tissue hypoxia.',
      },
      {
        id: 'folate_palpitations',
        name: 'Heart Palpitations',
        description: 'Pounding, racing, fluttering, or irregularly noticeable heartbeat at rest.',
        scientificRationale: 'Hyperdynamic cardiac output compensating for reduced oxygen-carrying capacity.',
      },
      {
        id: 'folate_breathlessness',
        name: 'Shortness of Breath',
        description: 'Breathing heavily or feeling out of breath during normal daily routines.',
        scientificRationale: 'Decreased red blood cell mass elevates respiratory drive.',
      },
      {
        id: 'folate_oral_sores',
        name: 'Soreness & Mouth Ulcerations',
        description: 'Shallow painful ulcers or soreness on the tongue, gums, or inside cheeks.',
        scientificRationale: 'High cellular turnover rate of oral epithelium makes it acutely sensitive to folate deficiency.',
      },
      {
        id: 'folate_pigmentation',
        name: 'Changes in Skin, Hair or Nail Pigmentation',
        description: 'Hyperpigmentation, darkened skin patches, or premature hair/nail changes.',
        scientificRationale: 'Altered melanin synthesis pathway linked to one-carbon metabolic stress.',
      },
    ],
  },
  {
    id: 'vitaminD',
    title: 'Vitamin D3 (Cholecalciferol) Deficiency Symptoms',
    nutrient: 'Vitamin D3 (Cholecalciferol)',
    icon: Sun,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    headerBg: 'bg-amber-50/70 border-amber-200',
    accentColor: 'text-amber-600',
    symptoms: [
      {
        id: 'vitd_persistent_fatigue',
        name: 'Persistent Fatigue and Tiredness',
        description: 'Deep unrefreshing exhaustion that lingers despite getting 7–8 hours of sleep.',
        scientificRationale: 'Vitamin D nuclear receptors (VDR) modulate mitochondrial oxidative phosphorylation in skeletal muscles.',
      },
      {
        id: 'vitd_bone_back_pain',
        name: 'Bone Pain and Lower Back Pain',
        description: 'Deep aching pain in the lower spine, hips, pelvis, or weight-bearing joints.',
        scientificRationale: 'Impaired intestinal calcium absorption leads to secondary hyperparathyroidism and osteomalacia.',
      },
      {
        id: 'vitd_muscle_weakness_cramps',
        name: 'Muscle Weakness and Cramps',
        description: 'Difficulty getting up from low chairs, climbing stairs, or painful leg/calf cramps.',
        scientificRationale: 'Hypocalcemia and reduced neuromuscular excitability in Type II fast-twitch muscle fibers.',
      },
      {
        id: 'vitd_frequent_illness',
        name: 'Frequent Illness & Recurrent Infections',
        description: 'Catching frequent colds, coughs, viral bugs, or lingering respiratory infections.',
        scientificRationale: 'Calcitriol (active D3) directly regulates antimicrobial peptide production (cathelicidin & defensins).',
      },
      {
        id: 'vitd_hair_loss',
        name: 'Hair Loss (Telogen Effluvium)',
        description: 'Noticeable diffuse hair thinning, shower drain clogging, or shedding.',
        scientificRationale: 'Vitamin D receptors in keratinocytes regulate hair follicle cycling and anagen phase maintenance.',
      },
      {
        id: 'vitd_depression_mood',
        name: 'Depression & Low Mood',
        description: 'Persistent feelings of sadness, low enthusiasm, or seasonal affective mood drops.',
        scientificRationale: 'VDR expression in the hippocampus and hypothalamus modulates serotonin synthesis.',
      },
      {
        id: 'vitd_slow_wound_healing',
        name: 'Slow Wound Healing',
        description: 'Cuts, scrapes, bruises, or skin blemishes taking unusually long to heal.',
        scientificRationale: 'Calcitriol stimulates vascular endothelial growth factor (VEGF) and tissue re-epithelialization.',
      },
    ],
  },
];

export const COMMON_SYMPTOMS_LIST = DEFICIENCY_SYMPTOM_GROUPS.flatMap((g) =>
  g.symptoms.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: g.id,
    nutrientLink: g.nutrient,
    severityTag: 'Key Signal',
  }))
);

interface SymptomsStepFormProps {
  demographics: Demographics;
  severeSymptoms: SevereSymptoms;
  onUpdateSevereSymptoms: (partial: Partial<SevereSymptoms>) => void;
  menstrual: MenstrualHealth;
  onUpdateMenstrual: (partial: Partial<MenstrualHealth>) => void;
  gut: GutHealth;
  onUpdateGut: (partial: Partial<GutHealth>) => void;
  selectedSymptoms: string[];
  onToggleSymptom: (id: string) => void;
}

export const SymptomsStepForm: React.FC<SymptomsStepFormProps> = ({
  demographics,
  severeSymptoms,
  onUpdateSevereSymptoms,
  menstrual,
  onUpdateMenstrual,
  gut,
  onUpdateGut,
  selectedSymptoms,
  onToggleSymptom,
}) => {
  const isFemale = !demographics.sex || String(demographics.sex).toLowerCase() !== 'male';
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<'all' | 'menstrual' | 'gut' | 'iron' | 'b12' | 'folate' | 'vitaminD'>('all');

  const hasAnySevere =
    severeSymptoms.severeBreathlessness ||
    severeSymptoms.chestPain ||
    severeSymptoms.faintingOrSyncope ||
    severeSymptoms.extremeFatigueImmobile;

  // Live store state for lifestyle & baseline labs
  const storeLifestyle = useHealthStore((state) => state.lifestyle);
  const storeLabs = useHealthStore((state) => state.labs);

  // Full multi-vector deficiency risks computed live from all current inputs
  const deficiencyRisks: DeficiencyRisk[] = useMemo(() => {
    return calculateAllDeficiencyRisks(
      demographics,
      menstrual,
      storeLifestyle,
      gut,
      storeLabs,
      selectedSymptoms
    );
  }, [demographics, menstrual, storeLifestyle, gut, storeLabs, selectedSymptoms]);

  // Overall Peak Risk and Synthesis
  const maxProbability = useMemo(() => {
    return Math.max(...deficiencyRisks.map((r) => r.probabilityPercent), 0);
  }, [deficiencyRisks]);

  const primaryRisk = useMemo(() => {
    return [...deficiencyRisks].sort((a, b) => b.probabilityPercent - a.probabilityPercent)[0];
  }, [deficiencyRisks]);

  const compositeRiskScore = useMemo(() => {
    if (deficiencyRisks.length === 0) return 0;
    const total = deficiencyRisks.reduce((sum, r) => sum + r.probabilityPercent, 0);
    return Math.round(total / deficiencyRisks.length);
  }, [deficiencyRisks]);

  // Real-time calculation of matched symptoms per vector
  const symptomStats = useMemo(() => {
    return DEFICIENCY_SYMPTOM_GROUPS.map((group) => {
      const total = group.symptoms.length;
      const matched = group.symptoms.filter((s) => selectedSymptoms.includes(s.id)).length;
      const percent = Math.round((matched / total) * 100);
      return {
        id: group.id,
        title: group.title,
        nutrient: group.nutrient,
        matched,
        total,
        percent,
      };
    });
  }, [selectedSymptoms]);

  // Gut health score summary
  const gutBarrierCount = [
    gut.hasGas,
    gut.hasAcidity,
    gut.hasBloating,
    gut.hasConstipation,
    gut.hasDiarrhea,
    gut.frequentAntacidUse,
    gut.teaCoffeeWithMeals,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#F43F5E]">
            Step 3 Clinical Assessment
          </span>
          <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-[#F43F5E]" />
            <span>Symptoms & Absorption Screening</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            We evaluate your digestive absorption profile first, followed by government-verified clinical symptom indicators to calculate deficiency probabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-3.5 py-1.5 rounded-full border border-rose-100 shrink-0">
            <Sparkles className="w-4 h-4 text-[#F43F5E]" />
            <span>{selectedSymptoms.length} Symptoms Selected</span>
          </div>
        </div>
      </div>



      {/* Category Tabs / Quick Section Switcher */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveCategoryTab('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Sections
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('menstrual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'menstrual'
              ? 'bg-[#F43F5E] text-white shadow-xs font-black'
              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>🌸 Menstrual & Cycle (Flow, Pain, Days)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('gut')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'gut'
              ? 'bg-amber-600 text-white shadow-xs font-black'
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>🔥 Gut Health & Absorption</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('iron')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'iron'
              ? 'bg-rose-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🩸 Iron (IDA)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('b12')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'b12'
              ? 'bg-violet-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>⚡ B12</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('folate')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'folate'
              ? 'bg-emerald-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🌿 Folate (B9)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategoryTab('vitaminD')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategoryTab === 'vitaminD'
              ? 'bg-amber-700 text-white shadow-xs font-black'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>☀️ Vit D3</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. GUT HEALTH & ABSORPTION SCREENING (ASKED FIRST AS REQUESTED)           */}
      {/* ========================================================================= */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'gut') && (
      <div className="bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 rounded-3xl p-5 sm:p-6 border-2 border-amber-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-black text-slate-900">
                  Gut Health & Digestive Absorption Profile
                </h4>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                The digestive lining is the biological gateway for iron, B12, and folate uptake. If gut absorption is impaired, food & supplements cannot reach circulation.
              </p>
            </div>
          </div>

          <a
            href="https://www.nin.res.in/rdabook/brief_note.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-amber-200"
          >
            <span>ICMR-NIN Absorption Guide</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* 5 Core Gut Symptoms Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Do you frequently experience any of the following gut symptoms?
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Gas */}
            <div
              onClick={() => onUpdateGut({ hasGas: !gut.hasGas })}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                gut.hasGas
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Gas</span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    gut.hasGas ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {gut.hasGas && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Excessive flatulence, intestinal trapped gas, or belching.</p>
            </div>

            {/* 2. Acidity */}
            <div
              onClick={() => onUpdateGut({ hasAcidity: !gut.hasAcidity })}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                gut.hasAcidity
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Acidity</span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    gut.hasAcidity ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {gut.hasAcidity && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Heartburn, gastric burning, or acid reflux in chest.</p>
            </div>

            {/* 3. Bloating */}
            <div
              onClick={() => onUpdateGut({ hasBloating: !gut.hasBloating })}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                gut.hasBloating
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Bloating</span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    gut.hasBloating ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {gut.hasBloating && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Abdominal fullness, distension, or heaviness after meals.</p>
            </div>

            {/* 4. Constipation */}
            <div
              id="wizard-gut-constipation"
              onClick={() => onUpdateGut({ hasConstipation: !gut.hasConstipation })}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                gut.hasConstipation
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Constipation</span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    gut.hasConstipation ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {gut.hasConstipation && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Hard, dry stools, straining, or &lt;3 bowel movements/week.</p>
            </div>

            {/* 5. Diarrhea */}
            <div
              onClick={() => onUpdateGut({ hasDiarrhea: !gut.hasDiarrhea })}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                gut.hasDiarrhea
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Diarrhea</span>
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                    gut.hasDiarrhea ? 'bg-amber-500 border-amber-500 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {gut.hasDiarrhea && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Loose watery stools or rapid intestinal transit.</p>
            </div>
          </div>
        </div>

        {/* Absorption Blocking Habit Questions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs">
            <input
              type="checkbox"
              checked={gut.teaCoffeeWithMeals}
              onChange={(e) => onUpdateGut({ teaCoffeeWithMeals: e.target.checked })}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 mt-0.5"
            />
            <div>
              <span className="font-bold text-slate-900 block">Chai / Coffee Taken with or Right After Meals</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                Tannins & polyphenols bind to non-heme iron, reducing intestinal uptake by up to 60-70% (NIH NHLBI).
              </span>
            </div>
          </label>

          <label className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs">
            <input
              type="checkbox"
              checked={gut.frequentAntacidUse}
              onChange={(e) => onUpdateGut({ frequentAntacidUse: e.target.checked })}
              className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 mt-0.5"
            />
            <div>
              <span className="font-bold text-slate-900 block">Frequent Antacid / PPI Medication Use</span>
              <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                Suppresses stomach acid required to cleave protein-bound B12 and convert iron to absorbable Fe²⁺.
              </span>
            </div>
          </label>
        </div>

        {/* Gut Health Status Feedback */}
        <div className="p-3 bg-white/90 rounded-2xl border border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-amber-600" />
            <span className="text-slate-700">
              Digestive Absorption Impact:{' '}
              <strong className="text-slate-900">
                {gutBarrierCount === 0
                  ? 'Optimal (No absorption barriers detected)'
                  : gutBarrierCount <= 2
                  ? `Mild Absorption Resistance (${gutBarrierCount} factor${gutBarrierCount > 1 ? 's' : ''})`
                  : `High Absorption Impairment (${gutBarrierCount} digestive barriers detected)`}
              </strong>
            </span>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
              gutBarrierCount === 0
                ? 'bg-emerald-100 text-emerald-800'
                : gutBarrierCount <= 2
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {gutBarrierCount === 0 ? 'Clear Gut' : 'Absorption Barrier'}
          </span>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MENSTRUAL BLOOD LOSS CO-FACTOR (IF FEMALE)                            */}
      {/* ========================================================================= */}
      {(activeCategoryTab === 'all' || activeCategoryTab === 'menstrual') && isFemale && (
        <div className="bg-gradient-to-br from-[#FFF5F7] to-white p-5 rounded-3xl border border-[#FCE7F3] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FCE7F3] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#F43F5E] text-white rounded-xl shadow-xs">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-slate-900">
                    Menstrual Blood Loss & Cycle Pattern
                  </h4>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    Biological Loss Factor
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Monthly menstrual blood volume loss directly dictates iron, ferritin, and micronutrient drain.
                </p>
              </div>
            </div>

            <a
              href="https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-rose-200"
            >
              <span>NIH NHLBI Clinical Guide</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Flow Intensity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Period Flow Intensity
              </label>
              <select
                value={menstrual.flowIntensity || ''}
                onChange={(e) =>
                  onUpdateMenstrual({
                    flowIntensity: (e.target.value || undefined) as 'Light' | 'Normal' | 'Heavy' | 'Clotting' | undefined,
                  })
                }
                className="w-full text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-200 p-2.5 focus:border-[#F43F5E] focus:outline-none"
              >
                <option value="">Select flow intensity...</option>
                <option value="Light">Light (1-2 pads/day)</option>
                <option value="Normal">Normal (3-4 pads/day)</option>
                <option value="Heavy">Heavy (Soaking &gt;1 pad every 2 hours)</option>
                <option value="Clotting">Heavy with large blood clots</option>
              </select>
            </div>

            {/* Cramps Severity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Period Cramps &amp; Pain
              </label>
              <select
                value={menstrual.crampSeverity || (menstrual.hasDysmenorrhea ? 'Severe' : '')}
                onChange={(e) => {
                  const val = e.target.value as 'None' | 'Moderate' | 'Severe' | '';
                  onUpdateMenstrual({
                    crampSeverity: val,
                    hasDysmenorrhea: val === 'Severe',
                  });
                }}
                className="w-full text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-200 p-2.5 focus:border-[#F43F5E] focus:outline-none"
              >
                <option value="">Select cramp pain...</option>
                <option value="None">No Pain / Mild Discomfort (0% Vit D Risk)</option>
                <option value="Moderate">Moderate Pain (+10% Vit D &amp; Magnesium Flux Risk)</option>
                <option value="Severe">Severe Pain (+18% Vit D &amp; Inflammatory Prostaglandin Risk)</option>
              </select>
              {(menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea) && (
                <p className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 leading-snug font-medium">
                  <strong>Severe Pain Meaning:</strong> Elevated inflammatory uterine prostaglandins (PGF2α) &amp; COX-2 spasms. Linked to <strong>Vitamin D3 &amp; Magnesium deficiency</strong>.
                </p>
              )}
              {menstrual.crampSeverity === 'Moderate' && (
                <p className="text-[10px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1.5 leading-snug font-medium">
                  <strong>Moderate Pain Meaning:</strong> Uterine prostaglandin hypercontractility &amp; calcium-magnesium flux. Linked to <strong>Vitamin D3 deficiency</strong>.
                </p>
              )}
            </div>

            {/* Cycle Regularity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Cycle Regularity
              </label>
              <select
                value={menstrual.cycleRegularity || ''}
                onChange={(e) =>
                  onUpdateMenstrual({
                    cycleRegularity: (e.target.value || undefined) as 'Regular' | 'Irregular' | undefined,
                  })
                }
                className="w-full text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-200 p-2.5 focus:border-[#F43F5E] focus:outline-none"
              >
                <option value="">Select cycle regularity...</option>
                <option value="Regular">Regular (Every 24–35 Days)</option>
                <option value="Irregular">Irregular / Missed (+18% Vit D &amp; B12 Disruption Risk)</option>
              </select>
              {menstrual.cycleRegularity === 'Irregular' && (
                <p className="text-[10px] text-purple-900 bg-purple-50 p-2 rounded-lg border border-purple-200 mt-1.5 leading-snug font-medium">
                  <strong>Irregular Cycle Meaning:</strong> Ovarian granulosa VDR receptor dysfunction &amp; hyperhomocysteinemia. Linked to <strong>Vitamin D3 &amp; Vitamin B12 deficiency</strong>.
                </p>
              )}
            </div>

            {/* Bleeding Duration (Days) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bleeding Duration (Days)
              </label>
              <select
                value={menstrual.bleedingDays || ''}
                onChange={(e) =>
                  onUpdateMenstrual({
                    bleedingDays: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full text-xs font-bold text-slate-900 bg-white rounded-xl border border-slate-200 p-2.5 focus:border-[#F43F5E] focus:outline-none"
              >
                <option value="">Select bleeding days...</option>
                <option value="3">3 Days (Normal)</option>
                <option value="4">4 Days (Normal)</option>
                <option value="5">5 Days (Normal)</option>
                <option value="6">6 Days (Moderate)</option>
                <option value="7">7 Days (+15% Folate &amp; Iron Depletion Risk)</option>
                <option value="8">8+ Days (+25% Folate &amp; Iron Depletion Risk)</option>
              </select>
              {menstrual.bleedingDays && menstrual.bleedingDays > 6 && (
                <p className="text-[10px] text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-1.5 leading-snug font-medium">
                  <strong>Prolonged Bleeding Meaning:</strong> Rapid reticulocyte red blood cell replacement accelerates coenzyme turnover. Linked to <strong>Folate (B9) &amp; Iron (IDA) depletion</strong>.
                </p>
              )}
            </div>
          </div>

          {/* Concise Government-Backed Deficiency Indicators Panel */}
          <div className="bg-white/90 rounded-2xl p-3.5 border border-rose-200/80 space-y-2 text-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#F43F5E]" />
              <span>What Period Parameters Indicate (Official Clinical Guidelines):</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-0.5">
              <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-100">
                <strong className="block text-slate-900 font-bold text-[11px]">
                  1. Heavy Flow / Clots &rarr; <span className="text-rose-700">Iron Deficiency (IDA)</span>
                </strong>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Every 1 mL blood loss expels ~0.5 mg iron. Heavy flow (&gt;80 mL) drains bone marrow ferritin reserves.
                </p>
                <span className="text-[9px] font-semibold text-rose-600 block mt-1">
                  Source: NIH NHLBI &amp; ICMR-NIN
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100">
                <strong className="block text-slate-900 font-bold text-[11px]">
                  2. Severe Cramps &rarr; <span className="text-amber-800">Vit D &amp; Magnesium Risk</span>
                </strong>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Low Vitamin D3 elevates uterine inflammatory prostaglandins (PGF2α) &amp; COX-2 spasms, triggering painful uterine muscle contractions.
                </p>
                <span className="text-[9px] font-semibold text-amber-700 block mt-1">
                  Source: NIH PubMed &amp; Endocrine Society
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <strong className="block text-slate-900 font-bold text-[11px]">
                  3. Prolonged Bleeding &rarr; <span className="text-emerald-700">Folate Depletion</span>
                </strong>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Rapidly generating replacement red blood cells accelerates one-carbon Folate (B9) coenzyme turnover.
                </p>
                <span className="text-[9px] font-semibold text-emerald-600 block mt-1">
                  Source: World Health Organization (WHO)
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-violet-50/60 border border-violet-100">
                <strong className="block text-slate-900 font-bold text-[11px]">
                  4. Irregular / Missed &rarr; <span className="text-violet-700">Vit D &amp; B12 Disruption</span>
                </strong>
                <p className="text-[10px] text-slate-600 mt-1 leading-snug">
                  Ovarian Vitamin D receptors (VDR) regulate egg maturation &amp; insulin sensitivity (PCOS); B12 deficiency raises homocysteine.
                </p>
                <span className="text-[9px] font-semibold text-violet-600 block mt-1">
                  Source: NIH NICHD &amp; Endocrine Society
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. DEFICIENCY SYMPTOM QUESTIONNAIRE (GOVERNMENT VERIFIED SOURCES)         */}
      {/* ========================================================================= */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#F43F5E]" />
              <span>Deficiency Symptom Questionnaires (Govt. Verified Sources)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Select symptoms you experience to calculate exact deficiency risk probabilities.
            </p>
          </div>
        </div>

        {/* 4 Vector Category Cards */}
        {DEFICIENCY_SYMPTOM_GROUPS.filter(
          (group) => activeCategoryTab === 'all' || activeCategoryTab === group.id
        ).map((group) => {
          const GroupIcon = group.icon;
          const stats = symptomStats.find((s) => s.id === group.id);

          return (
            <div
              key={group.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
            >
              {/* Category Header */}
              <div className={`p-4.5 sm:p-5 border-b border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${group.headerBg}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl bg-white shadow-xs ${group.accentColor}`}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {group.title}
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${group.badgeColor}`}>
                        {stats?.matched || 0} / {stats?.total} Selected ({stats?.percent || 0}%)
                      </span>
                    </div>
                    {group.source && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] font-medium text-slate-600">
                          Government Source:
                        </span>
                        <a
                          href={group.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-slate-800 hover:underline flex items-center gap-1"
                        >
                          <span>{group.source.name}</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar for probability matching */}
                <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-700">Symptom Probability:</span>
                  <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        (stats?.percent || 0) >= 60
                          ? 'bg-rose-500'
                          : (stats?.percent || 0) >= 30
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${stats?.percent || 0}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-slate-900">{stats?.percent || 0}%</span>
                </div>
              </div>

              {/* Symptom Checkbox Items */}
              <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.symptoms.map((symptom) => {
                  const isSelected = selectedSymptoms.includes(symptom.id);

                  return (
                    <div
                      key={symptom.id}
                      onClick={() => onToggleSymptom(symptom.id)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                        isSelected
                          ? 'bg-rose-50/70 border-[#F43F5E] ring-2 ring-[#F43F5E]/20 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                                isSelected
                                  ? 'bg-[#F43F5E] border-[#F43F5E] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <h5 className="text-xs font-extrabold text-slate-900 leading-snug">
                              {symptom.name}
                            </h5>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600 mt-1.5 pl-6 leading-relaxed">
                          {symptom.description}
                        </p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 pl-6">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Biomarker Rationale
                        </span>
                        <p className="text-[10px] text-slate-500 italic mt-0.5 line-clamp-2">
                          {symptom.scientificRationale}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. RED-FLAG EMERGENCY TRIAGE SAFETY CHECK                                */}
      {/* ========================================================================= */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 sm:p-6 space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
              Clinical Safety Triaging & Red-Flag Signs (Emergency Check)
            </h4>
            <p className="text-xs text-amber-900/90 mt-0.5 leading-relaxed">
              Please check if you have experienced any of these acute medical warning signs recently:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <label className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs text-slate-800 font-semibold">
            <input
              type="checkbox"
              checked={severeSymptoms.severeBreathlessness}
              onChange={(e) =>
                onUpdateSevereSymptoms({ severeBreathlessness: e.target.checked })
              }
              className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
            />
            <span>Severe shortness of breath at rest</span>
          </label>

          <label className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs text-slate-800 font-semibold">
            <input
              type="checkbox"
              checked={severeSymptoms.chestPain}
              onChange={(e) =>
                onUpdateSevereSymptoms({ chestPain: e.target.checked })
              }
              className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
            />
            <span>Chest pain, tightness or irregular racing pulse</span>
          </label>

          <label className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs text-slate-800 font-semibold">
            <input
              type="checkbox"
              checked={severeSymptoms.faintingOrSyncope}
              onChange={(e) =>
                onUpdateSevereSymptoms({ faintingOrSyncope: e.target.checked })
              }
              className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
            />
            <span>Fainting, collapse, or blackout (Syncope)</span>
          </label>

          <label className="flex items-center gap-2.5 bg-white p-3.5 rounded-2xl border border-amber-200/80 cursor-pointer hover:border-amber-400 transition-all text-xs text-slate-800 font-semibold">
            <input
              type="checkbox"
              checked={severeSymptoms.extremeFatigueImmobile}
              onChange={(e) =>
                onUpdateSevereSymptoms({ extremeFatigueImmobile: e.target.checked })
              }
              className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
            />
            <span>Extreme exhaustion making it impossible to get out of bed</span>
          </label>
        </div>

        {hasAnySevere && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Important Clinical Safety Advice</strong>
              <span>
                You have marked one or more severe red-flag symptoms. We strongly recommend booking an immediate consultation with a licensed physician or visiting an urgent care clinic for direct evaluation.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Informational Footer */}
      <div className="p-4 bg-[#FFF5F7] border border-[#FCE7F3] rounded-2xl flex items-center gap-3 text-xs text-rose-900">
        <Info className="w-5 h-5 text-[#F43F5E] shrink-0" />
        <span>
          Symptoms provide essential qualitative context. In the next step, you can enter or upload your <strong>blood test reports</strong> (like Hemoglobin and Ferritin) to pinpoint exact biological reserves.
        </span>
      </div>
    </div>
  );
};
