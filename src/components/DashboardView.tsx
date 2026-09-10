import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Activity,
  Droplets,
  Zap,
  LogOut,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Info,
  LineChart as LineChartIcon,
  PlusCircle,
  TrendingUp,
  Scale,
  Pill,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  User,
  Edit3,
  Plus,
  Trash2,
  RotateCcw,
  X,
  Check,
  UtensilsCrossed,
  AlertTriangle,
} from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { cmToFeetInches } from '../utils/heightConverter';
import { useComputedHealth } from '../utils/useComputedHealth';
import { ICMR_RDA_DEFAULTS } from '../data/foodDatabase';
import { MahuaEmblem } from './MahuaEmblem';
import { StageProgressionFooter } from './StageProgressionFooter';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const demographics = useHealthStore((state) => state.demographics);
  const currentUser = useHealthStore((state) => state.currentUser);
  const signOut = useHealthStore((state) => state.signOut);
  const labs = useHealthStore((state) => state.labs);
  const gut = useHealthStore((state) => state.gut);
  const activeStage = useHealthStore((state) => state.activeStage);
  const setActiveStage = useHealthStore((state) => state.setActiveStage);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const meals = useHealthStore((state) => state.meals);
  const removeMeal = useHealthStore((state) => state.removeMeal);
  const dailyHabits = useHealthStore((state) => state.dailyHabits);
  const toggleHabit = useHealthStore((state) => state.toggleHabit);
  const addHabit = useHealthStore((state) => state.addHabit);
  const removeHabit = useHealthStore((state) => state.removeHabit);
  const clearAllHabits = useHealthStore((state) => state.clearAllHabits);
  const clearCompletedHabits = useHealthStore((state) => state.clearCompletedHabits);
  const checkAllHabits = useHealthStore((state) => state.checkAllHabits);
  const healthTimeline = useHealthStore((state) => state.healthTimeline);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);
  const setIsUserProfileModalOpen = useHealthStore((state) => state.setIsUserProfileModalOpen);

  const [trackerMetric, setTrackerMetric] = useState<'hemoglobin' | 'serumFerritin' | 'vitaminB12' | 'weightKg'>('hemoglobin');

  // Daily Habits custom state
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [newHabitTiming, setNewHabitTiming] = useState('Morning');
  const [newHabitCategory, setNewHabitCategory] = useState<'Lifestyle' | 'Gut Optimization' | 'AYUSH Rasayana' | 'Iron Synergy'>('Lifestyle');
  const [newHabitDesc, setNewHabitDesc] = useState('');

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitTitle.trim()) return;
    addHabit({
      title: newHabitTitle.trim(),
      category: newHabitCategory,
      timing: newHabitTiming.trim() || 'Morning',
      description: newHabitDesc.trim() || 'Personal daily habit',
    });
    setNewHabitTitle('');
    setNewHabitDesc('');
    setIsAddingHabit(false);
  };

  const handleAddPresetHabit = (title: string, timing: string, category: 'Lifestyle' | 'Gut Optimization' | 'AYUSH Rasayana' | 'Iron Synergy', desc: string) => {
    addHabit({
      title,
      timing,
      category,
      description: desc,
    });
  };

  const { bmi, risks, dailyTotals, icmrBaseline } = useComputedHealth();

  // Trajectory Calculations
  const sortedRecords = [...healthTimeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const baselineRecord = sortedRecords[0];
  const latestRecord = sortedRecords[sortedRecords.length - 1];

  const calcDiff = (curr?: number, base?: number) => {
    if (curr === undefined || base === undefined) return null;
    return Math.round((curr - base) * 10) / 10;
  };

  const hbDiff = calcDiff(latestRecord?.hemoglobin, baselineRecord?.hemoglobin);
  const ferritinDiff = calcDiff(latestRecord?.serumFerritin, baselineRecord?.serumFerritin);
  const b12Diff = calcDiff(latestRecord?.vitaminB12, baselineRecord?.vitaminB12);
  const weightDiff = calcDiff(latestRecord?.weightKg, baselineRecord?.weightKg);

  const homeChartData = sortedRecords.map((r) => ({
    date: r.date,
    title: r.title || 'Check-in',
    hemoglobin: r.hemoglobin,
    serumFerritin: r.serumFerritin,
    vitaminB12: r.vitaminB12,
    vitaminD: r.vitaminD,
    weightKg: r.weightKg,
  }));

  // RDA calculation based on life stage
  const rda = demographics.isPregnant
    ? ICMR_RDA_DEFAULTS.pregnantWoman
    : demographics.isLactating
    ? ICMR_RDA_DEFAULTS.lactatingMother
    : demographics.age <= 19
    ? ICMR_RDA_DEFAULTS.adolescentGirl
    : ICMR_RDA_DEFAULTS.adultWoman;

  const ironPercent = Math.min(100, Math.round((dailyTotals.ironMg / rda.ironMg) * 100));

  // Determine gut status
  const gutOptimal = !gut.hasAcidity && !gut.hasBloating && !gut.teaCoffeeWithMeals && !gut.frequentAntacidUse;
  const gutStatusText = gutOptimal
    ? 'Optimal Gastric Secretion'
    : gut.teaCoffeeWithMeals
    ? 'Tannin Chelation Buffer Active'
    : gut.hasAcidity || gut.frequentAntacidUse
    ? 'Impaired Acid Reduction (Fe3+ to Fe2+)'
    : 'Moderate Gut Dysbiosis';

  const stageDescriptions: Record<number, { title: string; subtitle: string }> = {
    1: {
      title: 'Stage 1: Health Vector & Deficiency Synthesis',
      subtitle: 'Mapping your CBC panel, iron stores, and dual-engine metabolic curve.',
    },
    2: {
      title: 'Stage 2: Gut Health & Absorption Optimization',
      subtitle: 'Re-acidifying the duodenum and eliminating tannin/calcium absorption blocks.',
    },
    3: {
      title: 'Stage 3: Traditional AYUSH Wellness & Rasayanas',
      subtitle: 'Verified herbal synergies (Amla, Moringa, Halim, Til-Gud) with official AYUSH backing.',
    },
    4: {
      title: 'Stage 4: Customized Micronutrient Meal Planning',
      subtitle: 'Real-time daily tracking against ICMR-NIN 2020 RDA targets.',
    },
  };

  return (
    <div id="dashboard-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Welcome & Brand Overview */}
      <section
        id="hero-dashboard-banner"
        className="rounded-3xl bg-gradient-to-br from-[#FFF5F7] via-white to-[#FFF1F2] p-6 sm:p-8 border border-[#FCE7F3] shadow-xs relative overflow-hidden"
      >
        <div className="relative z-10 max-w-4xl space-y-3">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-[#F43F5E]">
              Maguva – Anemia and Women Wellness Companion
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1">
              Hello,
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-15 leading-relaxed">
            Maguva is a holistic AI health companion designed for women that analyzes lab results, symptoms, and dietary intake to predict Iron Deficiency Anemia risks, offer AYUSH-aligned dietary changes, track daily micronutrient goals, and provide interactive AI guidance.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              id="btn-home-quick-ocr"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />
              <span>Upload Lab PDF</span>
            </button>
            <button
              type="button"
              id="btn-home-explore-care"
              onClick={() => setActiveTab('vector')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>Start Health Vector</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Decorative background floral glow */}
        <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-[#FFE4E6] opacity-30 blur-2xl pointer-events-none" />
      </section>

      {/* Personal Health Profile & Anthropometrics Vitality Card */}
      <section
        id="personal-health-profile-banner"
        className="rounded-3xl bg-white p-5 sm:p-6 border border-[#FCE7F3] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
              {(currentUser?.name || demographics?.name || 'B').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  {currentUser?.name || demographics?.name || 'User Profile'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full border border-rose-200">
                  {demographics.sex ? (demographics.sex === 'male' ? 'Male' : 'Female') : 'Profile'}{demographics.age ? ` • ${demographics.age} yrs` : ''}
                </span>
                {demographics.isPregnant && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                    Pregnant
                  </span>
                )}
                {demographics.isLactating && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                    Lactating
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentUser?.email || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              id="btn-dash-view-full-profile"
              onClick={() => setIsUserProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-rose-100 text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Full Health Profile</span>
            </button>
            <button
              type="button"
              id="btn-dash-edit-vitals"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Vitals</span>
            </button>
          </div>
        </div>

        {/* 4 Interactive Anthropometric & Computed Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          {/* Tile 1: Age & Stage */}
          <div className="p-3 rounded-2xl bg-[#FFF9FA] border border-[#FCE7F3] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Age & Gender
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {demographics.age ? `${demographics.age} ` : '— '}
              {demographics.age ? <span className="text-xs font-normal text-slate-500">years</span> : null}
            </div>
            <span className="text-[11px] text-rose-15 font-semibold block capitalize">
              {demographics.sex || 'Not set'} {demographics.isPregnant ? '(Pregnant)' : ''}
            </span>
          </div>

          {/* Tile 2: Height & Stature */}
          <div className="p-3 rounded-2xl bg-[#FFF9FA] border border-[#FCE7F3] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Height / Stature
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {demographics.heightCm ? `${demographics.heightCm} ` : '— '}
              {demographics.heightCm ? <span className="text-xs font-normal text-slate-500">cm</span> : null}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              {demographics.heightCm
                ? `${cmToFeetInches(demographics.heightCm).ft} ft ${cmToFeetInches(demographics.heightCm).inches} in`
                : 'Not entered'}
            </span>
          </div>

          {/* Tile 3: Weight */}
          <div className="p-3 rounded-2xl bg-[#FFF9FA] border border-[#FCE7F3] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Body Weight
            </span>
            <div className="text-base sm:text-lg font-extrabold text-slate-900">
              {demographics.weightKg ? `${demographics.weightKg} ` : '— '}
              {demographics.weightKg ? <span className="text-xs font-normal text-slate-500">kg</span> : null}
            </div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              {demographics.weightKg
                ? `≈ ${Math.round(demographics.weightKg * 2.20462)} lbs`
                : 'Not entered'}
            </span>
          </div>

          {/* Tile 4: Computed Asian Indian BMI */}
          <div className="p-3 rounded-2xl bg-[#FFF9FA] border border-[#FCE7F3] space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Calculated BMI
            </span>
            <div className="text-base sm:text-lg font-extrabold text-[#F43F5E]">
              {demographics.heightCm && demographics.weightKg && bmi.bmi > 0 ? (
                <>
                  {bmi.bmi} <span className="text-xs font-normal text-slate-500">kg/m²</span>
                </>
              ) : (
                '—'
              )}
            </div>
            <span className="text-[11px] font-bold text-emerald-15 block">
              {demographics.heightCm && demographics.weightKg && bmi.bmi > 0
                ? bmi.category
                : 'Pending Vitals'}
            </span>
          </div>
        </div>
      </section>

      {/* Dual Panel: Today's Daily Meal Log Tracker + Daily Habits Tracker */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Today's Daily Food & Micronutrient Log Tracker */}
        <div
          id="daily-meal-log-tracker-card"
          className="lg:col-span-7 rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-sm space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
                  Daily Log Tracker
                </span>
                <span className="text-[10px] font-bold text-[#F43F5E] bg-[#FFF1F2] px-2 py-0.5 rounded-full">
                  {meals.length} Meals Logged
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Today’s Meals & Micronutrients</h3>
            </div>

            <button
              type="button"
              id="btn-dash-open-meal-planner"
              onClick={() => setActiveTab('meals')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F43F5E] hover:bg-[#E11D48] text-white transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Meals</span>
            </button>
          </div>

          {/* Quick ICMR Micronutrient Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-[#FFF9FA] p-3 rounded-2xl border border-[#FCE7F3] text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Iron (Fe)</span>
              <span className="text-sm font-extrabold text-[#F43F5E]">{dailyTotals.ironMg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.ironMg ?? rda.ironMg}mg</span></span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Folate (B9)</span>
              <span className="text-sm font-extrabold text-emerald-700">{dailyTotals.folateMcg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.folateMcg ?? rda.folateMcg}µg</span></span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Vitamin C</span>
              <span className="text-sm font-extrabold text-amber-15">{dailyTotals.vitaminCMg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.vitaminCMg ?? rda.vitaminCMg}mg</span></span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Vitamin B12</span>
              <span className="text-sm font-extrabold text-violet-700">{dailyTotals.b12Mcg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.b12Mcg ?? rda.b12Mcg}µg</span></span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Vitamin D3</span>
              <span className="text-sm font-extrabold text-orange-15">{dailyTotals.vitaminDMcg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.vitaminDMcg ?? 15}µg</span></span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Calcium (Ca)</span>
              <span className="text-sm font-extrabold text-sky-700">{dailyTotals.calciumMg} <span className="text-[10px] font-normal text-slate-500">/ {icmrBaseline?.calciumMg ?? 1000}mg</span></span>
            </div>
          </div>

          {/* Logged Meals List */}
          {meals.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2">
              <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No meals saved to Dashboard today.</p>
              <p className="text-[11px] text-slate-400">Prepare your meal log in the Meal Planner and click &quot;Save to Dashboard&quot;!</p>
              <button
                type="button"
                onClick={() => setActiveTab('meals')}
                className="mt-1 px-3.5 py-1.5 bg-[#F43F5E] text-white font-bold text-xs rounded-xl shadow-2xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Meal Planner & Recipes</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-white hover:border-[#F43F5E]/30 transition-all gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#F43F5E] text-white shrink-0">
                        {meal.mealType}
                      </span>
                      <h5 className="text-xs font-bold text-slate-900 truncate">{meal.name}</h5>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] font-semibold text-slate-15 mt-2">
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
                  </div>

                  <button
                    type="button"
                    onClick={() => removeMeal(meal.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-15 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove meal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer link to Meal Planner */}
          <div className="pt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Syncs automatically with Meal Planner</span>
            <button
              onClick={() => setActiveTab('meals')}
              className="text-[#F43F5E] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Explore AYUSH & ICMR Foods</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 cols: Daily Absorption & AYUSH Habits Tracker */}
        <div
          id="daily-habits-tracker-card"
          className="lg:col-span-5 rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-sm space-y-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
                  Daily Adherence
                </span>
                <span className="text-[10px] font-bold text-[#F43F5E] bg-[#FFF1F2] px-2 py-0.5 rounded-full">
                  {dailyHabits.filter((h) => h.completed).length}/{dailyHabits.length} Done
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Absorption & AYUSH Habits</h3>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                id="btn-add-habit-toggle"
                onClick={() => setIsAddingHabit(!isAddingHabit)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isAddingHabit
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-[#F43F5E] hover:bg-[#E11D48] text-white border-[#F43F5E] shadow-2xs'
                }`}
              >
                {isAddingHabit ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Habit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Preset Chips for common habits if user wants 1-click add */}
          {!isAddingHabit && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
              <span className="text-[10px] font-semibold text-slate-400 shrink-0">Quick add:</span>
              <button
                type="button"
                onClick={() => handleAddPresetHabit('Morning Sun Exposure (20 mins)', 'Morning (8:30 AM)', 'Lifestyle', 'Natural UVB synthesis for Cholecalciferol activation.')}
                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-20 border border-amber-200 rounded-lg shrink-0 font-medium transition-colors"
              >
                + Sun Exposure ☀️
              </button>
              <button
                type="button"
                onClick={() => handleAddPresetHabit('15-min Evening Post-Meal Walk', 'Evening (7:30 PM)', 'Lifestyle', 'Light movement to boost gut motility & gastric absorption.')}
                className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-20 border border-emerald-200 rounded-lg shrink-0 font-medium transition-colors"
              >
                + 15m Walk 🚶‍♀️
              </button>
              <button
                type="button"
                onClick={() => handleAddPresetHabit('Warm Lemon & Amla Water', 'Morning (Empty Stomach)', 'Gut Optimization', 'Primes gastric acidity for non-heme iron reduction.')}
                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-20 border border-rose-200 rounded-lg shrink-0 font-medium transition-colors"
              >
                + Lemon Water 🍋
              </button>
            </div>
          )}

          {/* Inline Add Habit Form */}
          {isAddingHabit && (
            <form onSubmit={handleCreateHabit} className="p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Add New Daily Habit</span>
                <span className="text-[10px] text-slate-500">e.g. Sun exposure, walk, supplements</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Habit Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Sun Exposure (20 mins)"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F43F5E] focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Timing Window</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning (8:00 AM)"
                    value={newHabitTiming}
                    onChange={(e) => setNewHabitTiming(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newHabitCategory}
                    onChange={(e) => setNewHabitCategory(e.target.value as any)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  >
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Gut Optimization">Gut Optimization</option>
                    <option value="AYUSH Rasayana">AYUSH Rasayana</option>
                    <option value="Iron Synergy">Iron Synergy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Description / Benefit (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 20 mins of natural light for Vitamin D synthesis"
                  value={newHabitDesc}
                  onChange={(e) => setNewHabitDesc(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingHabit(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-15 hover:bg-slate-200/60 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#F43F5E] hover:bg-[#E11D48] text-white rounded-xl shadow-2xs transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save Habit</span>
                </button>
              </div>
            </form>
          )}

          {/* Habit Items List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {dailyHabits.length === 0 ? (
              <div className="p-6 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200 text-slate-500 space-y-2">
                <p className="text-xs font-semibold">No habits logged yet for today.</p>
                <p className="text-[11px] text-slate-400">Add custom habits like morning sun exposure, hydration, or evening walks!</p>
                <button
                  type="button"
                  onClick={() => setIsAddingHabit(true)}
                  className="mt-1 px-3 py-1.5 bg-[#F43F5E] text-white font-bold text-xs rounded-xl shadow-2xs inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Habit</span>
                </button>
              </div>
            ) : (
              dailyHabits.map((habit) => (
                <div
                  key={habit.id}
                  className={`group flex items-start gap-3 p-3 rounded-2xl border transition-all ${
                    habit.completed
                      ? 'bg-[#FFF5F7] border-[#FCE7F3] text-slate-500'
                      : 'bg-white border-slate-200 hover:border-[#F43F5E]/40 text-slate-20'
                  }`}
                >
                  {/* Checkbox toggle */}
                  <button
                    type="button"
                    onClick={() => toggleHabit(habit.id)}
                    className={`mt-0.5 rounded-lg p-1 transition-all cursor-pointer ${
                      habit.completed
                        ? 'bg-[#F43F5E] text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-400 hover:text-slate-15 hover:bg-rose-100'
                    }`}
                    title={habit.completed ? 'Mark incomplete' : 'Mark completed'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  {/* Habit Details */}
                  <div className="flex-1 cursor-pointer" onClick={() => toggleHabit(habit.id)}>
                    <div className="flex items-center justify-between gap-1">
                      <h5
                        className={`text-xs font-bold transition-all ${
                          habit.completed ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {habit.title}
                      </h5>
                      <span className="text-[10px] text-[#F43F5E] font-medium bg-[#FFF1F2] px-1.5 py-0.5 rounded shrink-0">
                        {habit.timing}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-snug line-clamp-2 ${
                      habit.completed ? 'text-slate-400 line-through' : 'text-slate-500'
                    }`}>
                      {habit.description}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => removeHabit(habit.id)}
                    className="opacity-60 group-hover:opacity-100 text-slate-400 hover:text-rose-15 p-1 rounded-lg hover:bg-rose-100/60 transition-all shrink-0"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Controls: Uncheck All, Check All & Clear Log */}
          {dailyHabits.length > 0 && (
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
              <button
                type="button"
                id="btn-clear-completed-habits"
                onClick={clearCompletedHabits}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-20 font-semibold px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Uncheck all completed habits"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Uncheck All</span>
              </button>
              <button
                type="button"
                id="btn-check-all-habits"
                onClick={checkAllHabits}
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                title="Mark all habits completed"
              >
                <Check className="w-3 h-3 text-emerald-15" />
                <span>Check All</span>
              </button>
              <button
                type="button"
                id="btn-clear-all-habits"
                onClick={clearAllHabits}
                className="flex items-center gap-1 text-rose-15 hover:text-rose-20 font-semibold px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                title="Remove all habits from log"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear Log</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={0}
        currentStageTitle="Dashboard Health Overview"
        nextTab="vector"
        nextStageTitle="Stage 1: Health Vector & Lab Biomarkers"
        nextStageDescription="Verify your CBC blood panel, Ferritin levels, and baseline symptoms for algorithmic risk scoring."
      />
    </div>
  );
};
