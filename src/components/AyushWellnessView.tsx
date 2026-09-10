import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Star,
  ExternalLink,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  ShieldCheck,
  Award,
  Navigation,
  Check,
  Copy,
  UtensilsCrossed,
  ArrowRight,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { INITIAL_AYUSH_REMEDIES } from '../data/ayushRemedies';
import { StageProgressionFooter } from './StageProgressionFooter';
import { AyushRemedyReviewModal } from './AyushRemedyReviewModal';
import { AyushRemedy } from '../types';

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

export const AyushWellnessView: React.FC = () => {
  const ayushRemedies = useHealthStore((state) => state.ayushRemedies);
  const removeAyushRemedy = useHealthStore((state) => state.removeAyushRemedy);
  const rateAyushRemedy = useHealthStore((state) => state.rateAyushRemedy);
  const updateAyushNotes = useHealthStore((state) => state.updateAyushNotes);
  const remedyReviews = useHealthStore((state) => state.remedyReviews);
  const meals = useHealthStore((state) => state.meals);
  const addMeal = useHealthStore((state) => state.addMeal);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);

  const [activeMainTab, setActiveMainTab] = useState<'ayush-verified' | 'others'>('ayush-verified');
  const [filterDeficiency, setFilterDeficiency] = useState<string>('All');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [selectedRemedyForReviews, setSelectedRemedyForReviews] = useState<AyushRemedy | null>(null);
  const [addedFeedback, setAddedFeedback] = useState<{ remedyId: string; mealType: string } | null>(null);

  // Helper to calculate aggregated total rating & review stats for any remedy
  const getRemedyStats = (remedyId: string, fallbackRating: number = 5) => {
    const matching = remedyReviews.filter(
      (r) =>
        r.remedyId === remedyId ||
        (remedyId === 'mahua-flower-laddoo' && r.remedyId === 'mahuwa-flower-laddoo') ||
        (remedyId === 'mahuwa-flower-laddoo' && r.remedyId === 'mahua-flower-laddoo')
    );
    if (matching.length === 0) {
      return { avg: fallbackRating, count: 0, text: `${fallbackRating}.0`, reviews: [] };
    }
    const sum = matching.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / matching.length) * 10) / 10;
    return { avg, count: matching.length, text: avg.toFixed(1), reviews: matching };
  };

  const handleAddRemedyToMeal = (
    remedy: AyushRemedy,
    mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'
  ) => {
    const profile = AYUSH_MEAL_NUTRITION_MAP[remedy.id] || {
      portion: remedy.howToConsume.split('.')[0] || '1 therapeutic serving',
      ironMg: remedy.targetDeficiency.includes('iron') ? 4.0 : 0.5,
      b12Mcg: remedy.targetDeficiency.includes('b12') ? 0.6 : 0.0,
      folateMcg: remedy.targetDeficiency.includes('folate') ? 40.0 : 10.0,
      vitaminCMg: 10.0,
      vitaminDMcg: remedy.targetDeficiency.includes('vitaminD') ? 10.0 : 0.0,
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
      mealType: mealType,
      absorptionBoosters: profile.absorptionBoosters,
      absorptionBlockers: profile.absorptionBlockers,
      notes: `Added from AYUSH Stage 3 (Ref: ${remedy.id})`,
    });

    setAddedFeedback({ remedyId: remedy.id, mealType });
    setTimeout(() => {
      setAddedFeedback((prev) =>
        prev?.remedyId === remedy.id && prev?.mealType === mealType ? null : prev
      );
    }, 2500);
  };

  const deficiencyFilters = [
    { id: 'All', label: 'All Vectors' },
    { id: 'iron', label: '🩸 Iron & Hb' },
    { id: 'vitaminD', label: '☀️ Vitamin D' },
    { id: 'b12', label: '🧠 B12 & Nerves' },
    { id: 'folate', label: '🌿 Folate' },
    { id: 'gut', label: '🫚 Gut & Digestion' },
  ];

  // Merge store ratings/notes with master definitions to ensure exact targetDeficiency and citations
  const allRemedies = useMemo(() => {
    return INITIAL_AYUSH_REMEDIES.map((masterItem) => {
      const storeItem = ayushRemedies.find((r) => r.id === masterItem.id);
      return {
        ...masterItem,
        rating: storeItem?.rating ?? masterItem.rating,
        userNotes: storeItem?.userNotes ?? masterItem.userNotes,
        addedToHabits: storeItem?.addedToHabits ?? masterItem.addedToHabits,
      };
    });
  }, [ayushRemedies]);

  // Separate items into AYUSH-verified (with direct research links) vs Others (Lifestyle, Functional & Modern Dietary Remedies)
  const isOtherItem = (r: { id: string; remedyType?: string; category?: string }) =>
    r.remedyType === 'OTHERS' ||
    r.category === 'Lifestyle' ||
    r.category === 'Modern Dietary' ||
    r.id === 'mahua-flower-laddoo' ||
    r.id === 'mahuwa-flower-laddoo' ||
    r.id === 'fresh-wheatgrass-juice' ||
    r.id === 'ayurvedic-takra-buttermilk' ||
    r.id === 'cast-iron-cookware' ||
    r.id === 'nutritional-yeast-b12' ||
    r.id === 'sunlight-sesame-vit-d' ||
    r.id === 'halim-seeds-dates';

  // Filter AYUSH verified remedies based on target vector
  const ayushVerifiedRemedies = useMemo(() => {
    return allRemedies.filter((r) => {
      if (isOtherItem(r)) return false;
      if (filterDeficiency === 'b12' || filterDeficiency === 'folate') return false;
      if (filterDeficiency === 'vitaminD') return r.id === 'oyster-mushroom-soup';
      if (filterDeficiency === 'gut') return r.id === 'laja-manda-rice-peya';
      if (filterDeficiency === 'iron') return r.targetDeficiency.includes('iron');
      if (filterDeficiency === 'All') return true;
      return r.targetDeficiency.includes(filterDeficiency as any);
    });
  }, [allRemedies, filterDeficiency]);

  const otherRemedies = useMemo(() => {
    return allRemedies.filter((r) => {
      if (filterDeficiency === 'vitaminD' || filterDeficiency === 'folate') return false;
      if (filterDeficiency === 'iron') return r.id === 'fresh-wheatgrass-juice' || r.id === 'mahua-flower-laddoo';
      if (filterDeficiency === 'b12') return r.id === 'fresh-wheatgrass-juice';
      if (filterDeficiency === 'gut') return r.id === 'ayurvedic-takra-buttermilk';
      if (filterDeficiency === 'All') return r.id === 'fresh-wheatgrass-juice' || r.id === 'mahua-flower-laddoo' || r.id === 'ayurvedic-takra-buttermilk';
      return false;
    });
  }, [allRemedies, filterDeficiency]);

  const handleStartEditNote = (id: string, currentNote: string) => {
    setEditingNoteId(id);
    setTempNote(currentNote);
  };


  const handleSaveNote = (id: string) => {
    updateAyushNotes(id, tempNote);
    setEditingNoteId(null);
  };

  const copyShilparamamAddress = () => {
    const address =
      'Shilparamam Crafts Village, HITECH City Main Road, Opposite Cyber Towers, Madhapur, Hyderabad, Telangana 500081 (TRIFED & Girijan Forest Produce Stalls)';
    navigator.clipboard.writeText(address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & AYUSH Portal Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
              Stage 3 Catalog
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              100% Dietary & Food Suggestions Only
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            AYUSH &amp; Traditional Remedies
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Ancient Ayurvedic nutritional wisdom validated with clinical trials, hematology studies, and official Ministry of AYUSH research citations.
          </p>
        </div>

        <a
          href="https://ayush.gov.in/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-2xl bg-white hover:bg-[#FFF5F7] text-slate-800 font-bold px-4 py-2.5 text-xs border border-[#FCE7F3] shadow-xs transition-all shrink-0"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Ministry of AYUSH Portal</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Shilparamam Hyderabad Detailed Address Spotlight Card */}
      <div
        id="shilparamam-sourcing-spotlight"
        className="rounded-3xl bg-gradient-to-br from-[#FFF1F2] via-white to-amber-50 p-6 sm:p-7 border border-[#FCE7F3] shadow-sm space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#FCE7F3]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#F43F5E] to-rose-600 text-white flex items-center justify-center font-bold text-2xl shadow-xs shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 bg-[#F43F5E] text-white rounded-full tracking-wider">
                  Heritage Sourcing Destination
                </span>
                <span className="text-xs font-bold text-slate-500">Hyderabad, India</span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                Shilparamam Crafts Village (Hyderabad)
              </h3>
            </div>
          </div>

          {/* Action Buttons: Copy Address & View on Map */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyShilparamamAddress}
              className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl border border-[#FCE7F3] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              {copiedAddress ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Address Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Address</span>
                </>
              )}
            </button>

            <a
              href="https://maps.google.com/?q=Shilparamam+Madhapur+Hyderabad"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Open Maps</span>
            </a>
          </div>
        </div>

        {/* Address & Stall Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <MapPin className="w-4 h-4 text-[#F43F5E]" />
              <span>Physical Address</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              <strong>Shilparamam Crafts Village</strong>, HITECH City Main Road, Opposite Cyber Towers, Madhapur, Hyderabad, Telangana <strong>500081</strong>.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Dedicated Sourcing Stalls</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              • <strong>TRIFED Tribal Craft & Forest Stalls</strong> (Tribal Co-operative Marketing Federation)<br />
              • <strong>Girijan Cooperative Corporation (GCC)</strong> Outlets for pure forest produce & laddoos.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Timings & Available Produce</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium">
              • <strong>Open:</strong> 10:30 AM – 08:30 PM (All 7 Days)<br />
              • <strong>Fresh Foods:</strong> Mahuwa Flower Laddoos, Moringa biscuits, fresh wheatgrass products & wild tribal honey.
            </p>
          </div>
        </div>
      </div>

      {/* Two Main Tabs: AYUSH-Verified vs Others */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
        <button
          type="button"
          id="tab-ayush-verified"
          onClick={() => setActiveMainTab('ayush-verified')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'ayush-verified'
              ? 'bg-[#F43F5E] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeMainTab === 'ayush-verified' ? 'text-white' : 'text-emerald-600'}`} />
          <span>AYUSH-Verified</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeMainTab === 'ayush-verified' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {ayushVerifiedRemedies.length} Linked
          </span>
        </button>

        <button
          type="button"
          id="tab-others"
          onClick={() => setActiveMainTab('others')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'others'
              ? 'bg-[#F43F5E] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Others  </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
              activeMainTab === 'others' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {otherRemedies.length}
          </span>
        </button>
      </div>

      {/* TAB 1: AYUSH-VERIFIED CONTENT */}
      {activeMainTab === 'ayush-verified' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Target Focus Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter by Vector:
            </span>
            {deficiencyFilters.map((def) => (
              <button
                key={def.id}
                onClick={() => setFilterDeficiency(def.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterDeficiency === def.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-[#FFF5F7] border border-[#FCE7F3]'
                }`}
              >
                {def.label}
              </button>
            ))}
          </div>

          {/* AYUSH Verified Food Cards Grid */}
          {ayushVerifiedRemedies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {ayushVerifiedRemedies.map((remedy) => {
                const loggedInMeals = meals.filter(
                  (m) =>
                    m.name.toLowerCase().includes(remedy.name.toLowerCase().split('(')[0].trim().toLowerCase()) ||
                    m.notes?.includes(remedy.id)
                );
                const loggedSlots = Array.from(new Set(loggedInMeals.map((m) => m.mealType)));

              return (
                <div
                  key={remedy.id}
                  id={`ayush-card-${remedy.id}`}
                  className="rounded-3xl bg-[#FFF5F7] p-6 border border-[#FCE7F3] shadow-xs flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3.5">
                    {/* Header: Badge & Sanskrit Subtitle */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <a
                            href={remedy.officialAyushLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-0.5 border border-emerald-200 hover:bg-emerald-200 transition-colors"
                            title="Direct link to official AYUSH reference portal"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-700" />
                            <span>AYUSH Verified Food Link</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                          <span className="text-[10px] font-bold text-[#F43F5E] bg-white px-2 py-0.5 rounded-full border border-[#FCE7F3]">
                            {remedy.category}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{remedy.name}</h3>
                        <p className="text-xs text-slate-600 font-medium">
                          <span className="font-semibold italic">{remedy.sanskritName}</span> ·{' '}
                          <span className="italic text-slate-500 font-normal">{remedy.botanicalName}</span>
                        </p>
                      </div>

                      {/* Calculated Total Rating & Review Modal Trigger */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(() => {
                          const stats = getRemedyStats(remedy.id, remedy.rating);
                          return (
                            <button
                              type="button"
                              id={`btn-rating-badge-${remedy.id}`}
                              onClick={() => setSelectedRemedyForReviews(remedy)}
                              className="flex items-center gap-1.5 bg-white hover:bg-rose-50/80 px-2.5 py-1.5 rounded-xl border border-[#FCE7F3] shadow-2xs transition-all hover:scale-102 cursor-pointer group text-left"
                              title="Click to view all reviews or rate this food"
                            >
                              <div className="flex items-center gap-0.5">
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-xs font-black text-slate-900 ml-0.5">
                                  {stats.text}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-[#F43F5E] group-hover:underline flex items-center gap-0.5">
                                <span>({stats.count} {stats.count === 1 ? 'review' : 'reviews'})</span>
                              </span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Primary Benefits List */}
                    <div className="space-y-1.5 bg-white/80 p-3.5 rounded-2xl border border-[#FCE7F3]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#F43F5E]" />
                        <span>Nutritional Synergy & Mechanism</span>
                      </span>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {remedy.primaryBenefits.map((benefit, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] shrink-0 mt-1.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Clinical Trial Evidence Box */}
                    {remedy.clinicalEvidence && (
                      <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-amber-900 tracking-wider">
                          <Award className="w-3.5 h-3.5 text-amber-700" />
                          <span>Clinical Trial Evidence & Outcomes</span>
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed font-medium">
                          {remedy.clinicalEvidence}
                        </p>
                      </div>
                    )}

                    {/* Direct AYUSH Research Links */}
                    {remedy.researchLinks && remedy.researchLinks.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Official AYUSH & Scientific Research Citations:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {remedy.researchLinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:text-[#F43F5E] hover:border-[#F43F5E]/40 border border-[#FCE7F3] transition-colors"
                            >
                              <span className="line-clamp-1 text-[11px]">{link.label}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consumption & Timing */}
                    <div className="text-xs text-slate-700 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-900">How to Consume: </span>
                          <span>{remedy.howToConsume}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-6">
                        <span className="font-semibold text-slate-700">Optimal Timing: </span>
                        {remedy.optimalTiming}
                      </div>
                    </div>

                    {/* Local Indian Sourcing & Seasonal Availability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5 border border-[#FCE7F3] text-[11px] text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block">Local Sourcing:</span>
                          <span>{remedy.localSourcing}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5 border border-[#FCE7F3] text-[11px] text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block">Seasonality:</span>
                          <span>{remedy.seasonalAvailability}</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom User Reflection */}
                    <div className="pt-1">
                      {editingNoteId === remedy.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="Add your personal notes or tolerability experience..."
                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#F43F5E]"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNote(remedy.id)}
                              className="px-3 py-1 text-xs font-bold bg-[#F43F5E] text-white rounded-lg"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditNote(remedy.id, remedy.userNotes)}
                          className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white/60 border border-[#FCE7F3] hover:border-[#F43F5E]/40 transition-colors cursor-pointer text-xs"
                        >
                          <div className="flex items-start gap-2 text-slate-600">
                            <MessageSquare className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                            <span className="italic">
                              {remedy.userNotes ? `“${remedy.userNotes}”` : 'Click to add personal notes or tolerance...'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#F43F5E] opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Community Reviews & Ratings Snippet */}
                    {(() => {
                      const stats = getRemedyStats(remedy.id, remedy.rating);
                      return (
                        <div className="bg-white/90 p-3 rounded-2xl border border-[#FCE7F3] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-700 tracking-wider">
                              <MessageSquare className="w-3.5 h-3.5 text-[#F43F5E]" />
                              <span>Community Reviews ({stats.count})</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ★ {stats.text} / 5
                            </span>
                          </div>

                          {stats.reviews.length > 0 ? (
                            <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 italic flex items-start gap-2">
                              <span className="font-semibold text-slate-800 not-italic shrink-0">
                                {stats.reviews[0].userName}:
                              </span>
                              <span className="line-clamp-2">
                                “{stats.reviews[0].comment}”
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No community reviews yet. Be the first to rate & review!</p>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedRemedyForReviews(remedy)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-[#F43F5E] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FCE7F3] transition-colors cursor-pointer"
                          >
                            <span>Read All Reviews & Rate This Food</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action: Add to Meal Plan */}
                  <div className="pt-3 border-t border-[#FCE7F3] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#F43F5E]" />
                        <span>Add to Meal Plan</span>
                      </span>
                      {loggedSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('meals')}
                          className="text-[11px] font-bold text-[#F43F5E] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Meal Planner ({loggedSlots.length})</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map((slot) => {
                        const isSlotAdded = loggedSlots.includes(slot);
                        const isJustAdded =
                          addedFeedback?.remedyId === remedy.id && addedFeedback?.mealType === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            id={`btn-add-meal-${remedy.id}-${slot.toLowerCase()}`}
                            onClick={() => handleAddRemedyToMeal(remedy, slot)}
                            className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              isJustAdded || isSlotAdded
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs'
                                : 'bg-white hover:bg-[#FFF1F2] text-slate-700 hover:text-[#F43F5E] border-slate-200 hover:border-[#FCE7F3]'
                            }`}
                          >
                            {isJustAdded || isSlotAdded ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{slot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-[#FCE7F3] text-center space-y-2">
              <span className="text-3xl">🌿</span>
              <h4 className="text-base font-bold text-slate-800">No suggestions found for this vector in AYUSH-Verified</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No clinical trial-backed food sources currently registered under this specific vector in the AYUSH research catalog. Check the <strong>Others</strong> tab or select <strong>All Vectors</strong> to view all suggestions.
              </p>
              <button
                type="button"
                onClick={() => setFilterDeficiency('All')}
                className="mt-2 text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer"
              >
                Reset filter to All Vectors
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OTHERS (MAHUWA FLOWER LADDOO & WHEATGRASS WITH SHILPARAMAM ADDRESS) */}
      {activeMainTab === 'others' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Target Focus Pills in Others Tab */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
              Filter by Vector:
            </span>
            {deficiencyFilters.map((def) => (
              <button
                key={`others-filter-${def.id}`}
                onClick={() => setFilterDeficiency(def.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterDeficiency === def.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-[#FFF5F7] border border-[#FCE7F3]'
                }`}
              >
                {def.label}
              </button>
            ))}
          </div>

          {/* Cards for Mahua Flower Laddoo, Wheatgrass & Takra */}
          {otherRemedies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherRemedies.map((remedy) => {
                const loggedInMeals = meals.filter(
                  (m) =>
                    m.name.toLowerCase().includes(remedy.name.toLowerCase().split('(')[0].trim().toLowerCase()) ||
                    m.notes?.includes(remedy.id)
                );
                const loggedSlots = Array.from(new Set(loggedInMeals.map((m) => m.mealType)));

              const isMahua = remedy.id === 'mahua-flower-laddoo' || remedy.id === 'mahuwa-flower-laddoo';
              const isWheatgrass = remedy.id === 'fresh-wheatgrass-juice';

              const badgeLabel = isMahua
                ? '🌺 Signature Maguva Botanical'
                : isWheatgrass
                ? '🌱 Green Blood Hematinic'
                : '🥛 Probiotic & B12 Gut Tonic';

              const sourcingLabel = isMahua
                ? 'Shilparamam Crafts Village (TRIFED & Girijan Stalls), Madhapur, Hyderabad'
                : isWheatgrass
                ? 'Shilparamam Crafts Village (Organic Herbal & Microgreen Stalls), Madhapur, Hyderabad'
                : 'Fresh Homemade Curd & Kitchen Spices (Universal Availability)';

              return (
                <div
                  key={remedy.id}
                  id={`other-card-${remedy.id}`}
                  className="rounded-3xl bg-[#FFF5F7] p-6 border border-[#FCE7F3] shadow-xs flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3.5">
                    {/* Header: Badge & Title */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF1F2] text-[#F43F5E] text-[10px] font-extrabold uppercase px-2.5 py-0.5 border border-[#FCE7F3]">
                            {badgeLabel}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-[#FCE7F3]">
                            {remedy.category}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">{remedy.name}</h3>
                        <p className="text-xs text-slate-600 font-medium">
                          <span className="font-semibold italic">{remedy.sanskritName}</span> ·{' '}
                          <span className="italic text-slate-500 font-normal">{remedy.botanicalName}</span>
                        </p>
                      </div>

                      {/* Calculated Total Rating & Review Modal Trigger */}
                      {(() => {
                        const stats = getRemedyStats(remedy.id, remedy.rating);
                        return (
                          <button
                            type="button"
                            id={`btn-rating-badge-${remedy.id}`}
                            onClick={() => setSelectedRemedyForReviews(remedy)}
                            className="flex items-center gap-1.5 bg-white hover:bg-rose-50/80 px-2.5 py-1.5 rounded-xl border border-[#FCE7F3] shadow-2xs transition-all hover:scale-102 cursor-pointer shrink-0 group text-left"
                            title="Click to view all reviews or rate this food"
                          >
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-black text-slate-900 ml-0.5">
                                {stats.text}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-[#F43F5E] group-hover:underline flex items-center gap-0.5">
                              <span>({stats.count} {stats.count === 1 ? 'review' : 'reviews'})</span>
                            </span>
                          </button>
                        );
                      })()}
                    </div>

                    {/* Shilparamam Sourcing Badge */}
                    <div className="bg-gradient-to-r from-rose-50 to-amber-50 p-3 rounded-2xl border border-[#FCE7F3] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-800">
                        <span className="text-base">📍</span>
                        <span className="font-semibold">
                          Found at: <strong>{sourcingLabel}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Primary Benefits List */}
                    <div className="space-y-1.5 bg-white/80 p-3.5 rounded-2xl border border-[#FCE7F3]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-[#F43F5E]" />
                        <span>Nutritional Synergy & Mechanism</span>
                      </span>
                      <ul className="space-y-1 text-xs text-slate-700">
                        {remedy.primaryBenefits.map((benefit, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] shrink-0 mt-1.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Scientific / Phytochemical Evidence Box */}
                    {remedy.clinicalEvidence && (
                      <div className="bg-amber-50/90 p-3.5 rounded-2xl border border-amber-200/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-amber-900 tracking-wider">
                          <Award className="w-3.5 h-3.5 text-amber-700" />
                          <span>Phytochemical & Nutritional Evaluation</span>
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed font-medium">
                          {remedy.clinicalEvidence}
                        </p>
                      </div>
                    )}

                    {/* Direct Research / Journal Citations */}
                    {remedy.researchLinks && remedy.researchLinks.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Published Journal & Research Citations:
                        </span>
                        <div className="flex flex-col gap-1.5">
                          {remedy.researchLinks.map((link, lIdx) => (
                            <a
                              key={lIdx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white text-xs font-semibold text-slate-700 hover:text-[#F43F5E] hover:border-[#F43F5E]/40 border border-[#FCE7F3] transition-colors"
                            >
                              <span className="line-clamp-1 text-[11px]">{link.label}</span>
                              <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Consumption & Timing */}
                    <div className="text-xs text-slate-700 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-900">How to Consume: </span>
                          <span>{remedy.howToConsume}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 pl-6">
                        <span className="font-semibold text-slate-700">Optimal Timing: </span>
                        {remedy.optimalTiming}
                      </div>
                    </div>

                    {/* Local Indian Sourcing & Seasonal Availability */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5 border border-[#FCE7F3] text-[11px] text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block">Sourcing Location:</span>
                          <span>{remedy.localSourcing}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 rounded-xl bg-white/70 p-2.5 border border-[#FCE7F3] text-[11px] text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-800 block">Seasonality:</span>
                          <span>{remedy.seasonalAvailability}</span>
                        </div>
                      </div>
                    </div>

                    {/* Custom User Reflection */}
                    <div className="pt-1">
                      {editingNoteId === remedy.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            placeholder="Add your personal notes or experience..."
                            className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white focus:outline-none focus:border-[#F43F5E]"
                            rows={2}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingNoteId(null)}
                              className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNote(remedy.id)}
                              className="px-3 py-1 text-xs font-bold bg-[#F43F5E] text-white rounded-lg"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEditNote(remedy.id, remedy.userNotes)}
                          className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-white/60 border border-[#FCE7F3] hover:border-[#F43F5E]/40 transition-colors cursor-pointer text-xs"
                        >
                          <div className="flex items-start gap-2 text-slate-600">
                            <MessageSquare className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                            <span className="italic">
                              {remedy.userNotes ? `“${remedy.userNotes}”` : 'Click to add personal notes or experience...'}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-[#F43F5E] opacity-0 group-hover:opacity-100 transition-opacity">
                            Edit
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Community Reviews & Ratings Snippet */}
                    {(() => {
                      const stats = getRemedyStats(remedy.id, remedy.rating);
                      return (
                        <div className="bg-white/90 p-3 rounded-2xl border border-[#FCE7F3] space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-slate-700 tracking-wider">
                              <MessageSquare className="w-3.5 h-3.5 text-[#F43F5E]" />
                              <span>Community Reviews ({stats.count})</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              ★ {stats.text} / 5
                            </span>
                          </div>

                          {stats.reviews.length > 0 ? (
                            <div className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 italic flex items-start gap-2">
                              <span className="font-semibold text-slate-800 not-italic shrink-0">
                                {stats.reviews[0].userName}:
                              </span>
                              <span className="line-clamp-2">
                                “{stats.reviews[0].comment}”
                              </span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">No community reviews yet. Be the first to rate & review!</p>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedRemedyForReviews(remedy)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-bold text-[#F43F5E] bg-[#FFF1F2] hover:bg-[#FFE4E6] border border-[#FCE7F3] transition-colors cursor-pointer"
                          >
                            <span>Read All Reviews & Rate This Food</span>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action: Add to Meal Plan */}
                  <div className="pt-3 border-t border-[#FCE7F3] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#F43F5E]" />
                        <span>Add to Meal Plan</span>
                      </span>
                      {loggedSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('meals')}
                          className="text-[11px] font-bold text-[#F43F5E] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>View Meal Planner ({loggedSlots.length})</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {(['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const).map((slot) => {
                        const isSlotAdded = loggedSlots.includes(slot);
                        const isJustAdded =
                          addedFeedback?.remedyId === remedy.id && addedFeedback?.mealType === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            id={`btn-add-meal-${remedy.id}-${slot.toLowerCase()}`}
                            onClick={() => handleAddRemedyToMeal(remedy, slot)}
                            className={`px-2 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                              isJustAdded || isSlotAdded
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold shadow-2xs'
                                : 'bg-white hover:bg-[#FFF1F2] text-slate-700 hover:text-[#F43F5E] border-slate-200 hover:border-[#FCE7F3]'
                            }`}
                          >
                            {isJustAdded || isSlotAdded ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{slot}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : (
            <div className="bg-white p-8 rounded-3xl border border-[#FCE7F3] text-center space-y-2">
              <span className="text-3xl">🌿</span>
              <h4 className="text-base font-bold text-slate-800">No suggestions found for this vector in Others</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Check the <strong>AYUSH-Verified</strong> tab for clinical trial-backed food remedies targeting this nutritional vector, or select <strong>All Vectors</strong> to view all suggestions.
              </p>
              <button
                type="button"
                onClick={() => setFilterDeficiency('All')}
                className="mt-2 text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer"
              >
                Reset filter to All Vectors
              </button>
            </div>
          )}
        </div>
      )}

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={3}
        currentStageTitle="Stage 3: AYUSH & Traditional Remedies"
        prevTab="risks"
        prevStageTitle="Stage 2: Deficiency Risk Engine"
        nextTab="meals"
        nextStageTitle="Stage 4: Meal Planner & ICMR Foods"
        nextStageDescription="Build daily Indian meal plans aligned with ICMR-NIN 2020 RDA targets and high-iron absorption bio-synergy."
      />

      {/* Review & Rating Modal */}
      {selectedRemedyForReviews && (
        <AyushRemedyReviewModal
          remedy={selectedRemedyForReviews}
          isOpen={!!selectedRemedyForReviews}
          onClose={() => setSelectedRemedyForReviews(null)}
        />
      )}
    </div>
  );
};

