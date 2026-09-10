import React, { useState } from 'react';
import {
  User,
  Scale,
  Calendar,
  Sparkles,
  HeartPulse,
  Droplets,
  Activity,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Check,
  HelpCircle,
  Stethoscope,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  RotateCcw,
  ThermometerSnowflake,
  Brain,
  Eye,
  Scissors,
  Coffee,
  Pill,
  LineChart,
  Edit3,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { cmToFeetInches } from '../utils/heightConverter';
import { useComputedHealth } from '../utils/useComputedHealth';
import { FlowIntensity, CycleRegularity } from '../types';
import { StageProgressionFooter } from './StageProgressionFooter';
import { COMMON_SYMPTOMS_LIST } from './SymptomsStepForm';

export const HealthVectorView: React.FC = () => {
  const demographics = useHealthStore((state) => state.demographics);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);
  const menstrual = useHealthStore((state) => state.menstrual);
  const updateMenstrual = useHealthStore((state) => state.updateMenstrual);
  const lifestyle = useHealthStore((state) => state.lifestyle);
  const updateLifestyle = useHealthStore((state) => state.updateLifestyle);
  const gut = useHealthStore((state) => state.gut);
  const updateGut = useHealthStore((state) => state.updateGut);
  const labs = useHealthStore((state) => state.labs);
  const updateLabs = useHealthStore((state) => state.updateLabs);
  const severeSymptoms = useHealthStore((state) => state.severeSymptoms);
  const updateSevereSymptoms = useHealthStore((state) => state.updateSevereSymptoms);
  const selectedSymptoms = useHealthStore((state) => state.selectedSymptoms);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);

  const hasAnyLoggedLabTest = Boolean(
    labs.hemoglobin !== undefined ||
    labs.serumFerritin !== undefined ||
    labs.serumIron !== undefined ||
    labs.tibc !== undefined ||
    labs.transferrinSaturation !== undefined ||
    labs.transferrin !== undefined ||
    labs.vitaminB12 !== undefined ||
    labs.vitaminD !== undefined ||
    labs.folateB9 !== undefined ||
    labs.vitaminC !== undefined ||
    labs.mcv !== undefined ||
    labs.mch !== undefined ||
    labs.mchc !== undefined ||
    labs.rbc !== undefined ||
    labs.wbcCount !== undefined ||
    labs.plateletCount !== undefined ||
    labs.hematocrit !== undefined ||
    labs.rdw !== undefined ||
    (labs.customBloodTests && labs.customBloodTests.length > 0)
  );

  const [showBloodTestGuide, setShowBloodTestGuide] = useState<boolean>(true);
  const [isEditingLabs, setIsEditingLabs] = useState<boolean>(false);

  const { bmi, icmrProfile, icmrBaseline } = useComputedHealth();

  const heightCm = demographics.heightCm;
  const weightKg = demographics.weightKg;
  const ftIn = heightCm ? cmToFeetInches(heightCm) : null;
  const heightFt = ftIn ? ftIn.ft : null;
  const heightIn = ftIn ? ftIn.inches : null;
  const weightLbs = weightKg ? (weightKg * 2.20462).toFixed(1) : null;

  const heightM = heightCm ? heightCm / 100 : null;
  const currentBmi = weightKg && heightM && heightM > 0
    ? Number((weightKg / (heightM * heightM)).toFixed(1))
    : null;
  const minIdealWeight = heightM && heightM > 0 ? Number((18.5 * heightM * heightM).toFixed(1)) : null;
  const maxIdealWeight = heightM && heightM > 0 ? Number((22.9 * heightM * heightM).toFixed(1)) : null;

  const isUnderweight = currentBmi !== null && currentBmi < 18.5;
  const isNormalWeight = currentBmi !== null && currentBmi >= 18.5 && currentBmi <= 22.9;
  const isOverweight = currentBmi !== null && currentBmi >= 23.0 && currentBmi <= 24.9;
  const isObese = currentBmi !== null && currentBmi >= 25.0;

  const weightCategory = currentBmi === null
    ? 'Pending Vitals'
    : isUnderweight
    ? 'Underweight'
    : isNormalWeight
    ? 'Normal Weight'
    : isOverweight
    ? 'Overweight'
    : 'Obese';

  const weightCategoryBadge = currentBmi === null
    ? 'bg-slate-100 text-slate-700 border-slate-300'
    : isUnderweight
    ? 'bg-amber-100 text-amber-800 border-amber-300'
    : isNormalWeight
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : isOverweight
    ? 'bg-orange-100 text-orange-800 border-orange-300'
    : 'bg-rose-100 text-rose-800 border-rose-300';

  const weightCategoryPill = currentBmi === null
    ? 'bg-slate-400 text-white'
    : isUnderweight
    ? 'bg-amber-500 text-white'
    : isNormalWeight
    ? 'bg-emerald-600 text-white'
    : isOverweight
    ? 'bg-orange-500 text-white'
    : 'bg-rose-600 text-white';

  const meterPercent = currentBmi !== null
    ? Math.min(100, Math.max(0, ((currentBmi - 14) / (34 - 14)) * 100))
    : 50;

  return (
    <div id="health-vector-view" className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-[#FCE7F3] shadow-xs">
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Health Vector & Lab Biomarkers
        </h2>
      </div>

      {/* Grid: Demographics + Real-Time Dual-Engine BMI */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Demographics Card (7 cols) - Shows Saved Parameters with Update Profile Action */}
        <div
          id="demographics-input-card"
          className="lg:col-span-7 rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#F43F5E]" />
              <h3 className="text-base font-bold text-slate-900">Demographics & Physical Vitals</h3>
            </div>
            <button
              type="button"
              id="btn-update-profile"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer"
              title="Click to change saved demographics, height, weight, and life stage parameters"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* 1. Name & Identity */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Name / Identity</span>
              <div className="text-base font-black text-slate-900 mt-0.5 truncate">{demographics?.name || 'User'}</div>
              <span className="text-[11px] font-semibold text-rose-600 capitalize">
                {demographics.sex ? demographics.sex : 'Not Selected'}
              </span>
            </div>

            {/* 2. Age & Framework */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Age</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {demographics.age ? (
                  <>{demographics.age} <span className="text-xs font-normal text-slate-500">years</span></>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">Not Provided</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-600 block truncate">
                {demographics.age ? (demographics.age <= 19 ? 'WHO Adolescent LMS' : 'ICMR Adult (2020)') : 'Pending Demographics'}
              </span>
            </div>

            {/* 3. Height */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Height</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {heightCm ? (
                  <>{heightCm} <span className="text-xs font-normal text-slate-500">cm</span></>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">—</span>
                )}
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                {heightFt !== null ? `≈ ${heightFt}'${heightIn}" ft-in` : 'Add height in profile'}
              </span>
            </div>

            {/* 4. Weight */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Weight</span>
              <div className="text-base font-black text-slate-900 mt-0.5">
                {weightKg ? (
                  <>{weightKg} <span className="text-xs font-normal text-slate-500">kg</span></>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">—</span>
                )}
              </div>
              <span className="text-[10px] font-medium text-slate-500">
                {weightLbs !== null ? `≈ ${weightLbs} lbs` : 'Add weight in profile'}
              </span>
            </div>

            {/* 5. Preg / Lactating */}
            <div id="demographics-preg-lactating-tab" className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Preg / Lactating</span>
              <div className="text-base font-black text-slate-900 mt-0.5 truncate">
                {demographics.isPregnant ? (
                  <span className="text-sm font-black text-rose-700">
                    Pregnant {demographics.pregnancyTrimester ? `(Trimester ${demographics.pregnancyTrimester})` : ''}
                  </span>
                ) : demographics.isLactating ? (
                  <span className="text-sm font-black text-pink-700">
                    Lactating
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-slate-400">Not Applicable</span>
                )}
              </div>
              <span className="text-[10px] font-medium text-slate-500 block truncate">
                {demographics.isPregnant
                  ? `Trimester ${demographics.pregnancyTrimester || 1} (40mg Fe)`
                  : demographics.isLactating
                  ? '0–6m Postpartum (23mg Fe)'
                  : demographics.sex === 'male'
                  ? 'Male cohort (N/A)'
                  : 'Standard cohort'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Dual-Engine BMI & Weight Status Display (5 cols) */}
        <div
          id="dual-engine-bmi-display"
          className="lg:col-span-5 rounded-3xl bg-gradient-to-br from-[#FFF5F7] via-white to-[#FCE7F3]/40 p-6 border border-[#FCE7F3] shadow-xs flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            {/* Header with Framework Pill */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#FFF1F2] rounded-xl border border-[#FCE7F3]">
                  <Scale className="w-4 h-4 text-[#F43F5E]" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    BMI & Weight Health Assessment
                  </h4>
                  <span className="text-[10px] text-slate-500">
                    Calculated from your saved height & weight
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-slate-700 bg-white px-2.5 py-1 rounded-full border border-[#FCE7F3] shadow-2xs">
                {demographics.age && demographics.age <= 19 ? 'WHO LMS Standard' : 'ICMR-NIN Asian-Indian'}
              </span>
            </div>

            {/* Score & Category Highlight Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Your Computed BMI
              </span>
              <div className="flex items-center justify-between">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-baseline gap-1">
                  {currentBmi !== null ? currentBmi : '—'}
                  {currentBmi !== null && <span className="text-xs font-normal text-slate-400">kg/m²</span>}
                </div>
                <div>
                  <span className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${weightCategoryBadge}`}>
                    {weightCategory}
                  </span>
                </div>
              </div>
            </div>

            {/* Plain-English "Is My Weight Normal?" Banner */}
            {currentBmi !== null ? (
              <div
                className={`p-4 rounded-2xl border transition-all ${
                  isNormalWeight
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : isUnderweight
                    ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                    : 'bg-orange-50/90 border-orange-200 text-orange-950'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {isNormalWeight ? (
                    <div className="p-1 bg-emerald-100 rounded-lg text-emerald-700 shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="p-1 bg-amber-100 rounded-lg text-amber-700 shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h5 className="text-xs font-black">
                      {isNormalWeight
                        ? '✅ Yes, your body weight is in the Healthy Normal Range!'
                        : isUnderweight
                        ? '⚠️ Your body weight is below the recommended healthy range.'
                        : '⚠️ Your body weight is above the recommended Asian-Indian range.'}
                    </h5>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      {isNormalWeight
                        ? `Your current weight of ${weightKg} kg sits comfortably within your optimal healthy window (${minIdealWeight} kg to ${maxIdealWeight} kg). A normal BMI preserves steady red blood cell oxygenation, hormonal balance, and efficient gut iron absorption.`
                        : isUnderweight
                        ? `Your weight of ${weightKg} kg is ${minIdealWeight && weightKg ? (minIdealWeight - weightKg).toFixed(1) : '—'} kg below the minimum healthy target (${minIdealWeight} kg). Lower body mass is frequently linked with depleted ferritin iron reserves, low B12, and reduced physical stamina.`
                        : `Your weight of ${weightKg} kg is ${weightKg && maxIdealWeight ? (weightKg - maxIdealWeight).toFixed(1) : '—'} kg above the upper threshold (${maxIdealWeight} kg). Focusing on nutrient-dense whole foods and iron bioavailability helps regulate systemic inflammatory markers.`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200 text-slate-700 text-xs">
                💡 Please click <strong>Update Profile</strong> to enter your height and weight for real-time BMI classification and Asian-Indian health risk modeling.
              </div>
            )}

            {/* Visual Color-Coded BMI Range Meter */}
            <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>Visual BMI Range Meter</span>
                </span>
                <span className="font-black text-[#F43F5E] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                  {currentBmi !== null ? `You are at: ${currentBmi} kg/m²` : 'Pending Vitals'}
                </span>
              </div>

              {/* Progress Track with 4 Clear Color Zones */}
              <div className="relative pt-1.5 pb-1">
                <div className="w-full h-4 rounded-full flex overflow-hidden border border-slate-200 shadow-inner">
                  {/* Underweight: <18.5 */}
                  <div
                    className="w-[22.5%] bg-amber-300 hover:opacity-90 transition-opacity relative group flex items-center justify-center text-[9px] font-extrabold text-amber-900"
                    title="Underweight (< 18.5 kg/m²)"
                  >
                    <span className="hidden sm:inline">&lt;18.5</span>
                  </div>
                  {/* Normal: 18.5 to 22.9 */}
                  <div
                    className="w-[22%] bg-emerald-500 hover:opacity-90 transition-opacity relative group flex items-center justify-center text-[9px] font-black text-white"
                    title="Healthy Normal (18.5 – 22.9 kg/m²)"
                  >
                    <span className="hidden sm:inline">18.5–22.9</span>
                  </div>
                  {/* Overweight: 23.0 to 24.9 */}
                  <div
                    className="w-[10%] bg-orange-400 hover:opacity-90 transition-opacity relative group flex items-center justify-center text-[9px] font-extrabold text-white"
                    title="Overweight (23.0 – 24.9 kg/m²)"
                  >
                    <span className="hidden sm:inline">23+</span>
                  </div>
                  {/* Obese: 25.0+ */}
                  <div
                    className="w-[45.5%] bg-rose-400 hover:opacity-90 transition-opacity relative group flex items-center justify-center text-[9px] font-extrabold text-white"
                    title="Obese (≥ 25.0 kg/m²)"
                  >
                    <span className="hidden sm:inline">≥25</span>
                  </div>
                </div>

                {/* Needle Indicator Marker */}
                <div
                  className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none transition-all duration-500"
                  style={{
                    left: `${Math.min(97, Math.max(3, meterPercent))}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-slate-900 border-2 border-white shadow-lg ring-2 ring-[#F43F5E]/50 animate-pulse" />
                  <div className="w-0.5 h-2 bg-slate-900 mt-0.5" />
                </div>
              </div>

              {/* Clear Range Labels for Everyday Users */}
              <div className="grid grid-cols-4 text-center text-[9px] sm:text-[10px] font-bold text-slate-600 pt-1 gap-1">
                <div className="bg-amber-50/80 p-1 rounded-lg border border-amber-200/60">
                  <span className="text-amber-800 block">&lt; 18.5</span>
                  <span className="text-slate-500 font-medium">Underweight</span>
                </div>
                <div className="bg-emerald-50 p-1 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 font-black block">18.5 – 22.9</span>
                  <span className="text-emerald-700 font-bold">Healthy Ideal</span>
                </div>
                <div className="bg-orange-50/80 p-1 rounded-lg border border-orange-200/60">
                  <span className="text-orange-800 block">23.0 – 24.9</span>
                  <span className="text-slate-500 font-medium">Overweight</span>
                </div>
                <div className="bg-rose-50/80 p-1 rounded-lg border border-rose-200/60">
                  <span className="text-rose-800 block">≥ 25.0</span>
                  <span className="text-slate-500 font-medium">Higher (Obese)</span>
                </div>
              </div>
            </div>

            {/* Reference Standards Explained Simply for Normal Users */}
            <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 border-b border-slate-100 pb-2">
                <Info className="w-4 h-4 text-[#F43F5E]" />
                <span>Why We Use Asian-Indian BMI Standards</span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                While international Western standards count up to <strong>24.9</strong> as normal, Indian medical guidelines (<strong>ICMR-NIN 2020 & WHO South Asia Consensus</strong>) establish <strong>18.5 to 22.9 kg/m²</strong> as the healthy threshold. South Asian bodies carry higher visceral fat percentages at lower weights, making this tailored benchmark more accurate for managing anemia, thyroid health, and metabolic wellness.
              </p>

              <div className="pt-1 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Reference Body</span>
                  <span className="text-xs font-extrabold text-slate-900 block">
                    {demographics.age <= 19 ? 'WHO Growth Curves (5–19y)' : 'ICMR-NIN Indian Reference (2020)'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Weight Status Delta</span>
                  <span className={`text-xs font-extrabold block ${
                    isNormalWeight ? 'text-emerald-600' : isUnderweight ? 'text-amber-600' : 'text-orange-600'
                  }`}>
                    {isNormalWeight
                      ? 'Within Optimal Band'
                      : isUnderweight
                      ? `${(minIdealWeight - weightKg).toFixed(1)} kg to minimum`
                      : `${(weightKg - maxIdealWeight).toFixed(1)} kg over upper limit`}
                  </span>
                </div>
              </div>

              {bmi.isPediatric && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                  <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-slate-500 block">Growth Z-Score</span>
                    <strong className="text-xs font-black text-[#F43F5E]">{bmi.zScore} SD</strong>
                  </div>
                  <div className="bg-rose-50/70 p-2 rounded-xl border border-rose-100">
                    <span className="text-[10px] text-slate-500 block">Growth Percentile</span>
                    <strong className="text-xs font-black text-[#F43F5E]">{bmi.percentile}th %ile</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-2 border-t border-[#FCE7F3] text-[11px] text-slate-500 flex items-center justify-between">
            <span className="text-slate-600">
              Need to modify your measurements?
            </span>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="font-bold text-[#F43F5E] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Vitals</span>
            </button>
          </div>
        </div>
      </section>

      {/* Saved Clinical Symptoms & Deficiency Signs */}
      <section
        id="symptoms-profile-card"
        className="rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-[#F43F5E]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Reported Clinical Symptoms
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    selectedSymptoms.length > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedSymptoms.length > 0 ? `${selectedSymptoms.length} active` : '0 active'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Active symptoms and physiological markers recorded from your health evaluation profile.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-edit-symptoms-profile"
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer self-start sm:self-auto"
            title="Click to change reported symptoms in profile"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>

        {/* Selected Symptoms Detailed Badges / 0 Active Empty State */}
        {selectedSymptoms.length > 0 ? (
          <div className="p-4 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-900 block">
              Active Symptom Profiles &amp; Biological Links
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {selectedSymptoms.map((symptomId) => {
                const item = COMMON_SYMPTOMS_LIST.find((s) => s.id === symptomId);
                const name = item ? item.name : symptomId.replace(/_/g, ' ');
                const nutrient = item ? item.nutrientLink : 'Micronutrient';
                const desc = item ? item.description : 'Reported symptom marker.';

                return (
                  <div
                    key={symptomId}
                    className="p-2.5 bg-white rounded-xl border border-rose-200/80 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-slate-900 leading-tight truncate">{name}</span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 shrink-0">
                        {nutrient}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-tight">
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  0 active symptoms reported
                </div>
                <div className="text-[11px] text-slate-500">
                  No clinical deficiency symptoms selected. All clinical energy, cognitive, and sensory indicators are clear.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="text-xs font-bold text-[#F43F5E] hover:underline shrink-0"
            >
              + Add Symptoms
            </button>
          </div>
        )}
      </section>

      {/* Menstrual Flow & Gut Permeability Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Menstrual Health Vector */}
        <div
          id="menstrual-health-vector"
          className="rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F43F5E]" />
              <h3 className="text-base font-bold text-slate-900">Menstrual Flow &amp; Blood Dynamics</h3>
            </div>
            <button
              type="button"
              id="btn-edit-menstrual-profile"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer"
              title="Click to edit menstrual parameters in profile"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          {demographics.sex === 'male' ? (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
              Menstrual health tracking is not applicable for male biological cohort (basal iron loss ~1.0 mg/day).
            </div>
          ) : (
            <>
              {/* Saved Menstrual Parameters Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Flow Intensity */}
                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Flow Intensity</span>
                  <div className="text-base font-black text-slate-900">
                    {menstrual.flowIntensity ? `${menstrual.flowIntensity} Flow` : 'Not Configured'}
                  </div>
                  <span className={`text-[10px] font-semibold block ${menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                    {menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting'
                      ? '⚠️ ~15–30mg iron loss/cycle'
                      : menstrual.flowIntensity
                      ? '✓ Standard cycle iron loss'
                      : 'Set in profile'}
                  </span>
                </div>

                {/* 2. Cramp Severity */}
                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Cramp Severity</span>
                  <div className="text-base font-black text-slate-900">
                    {menstrual.crampSeverity ? `${menstrual.crampSeverity} Pain` : menstrual.hasDysmenorrhea ? 'Severe Pain' : 'Not Configured'}
                  </div>
                  <span className={`text-[10px] font-semibold block ${menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea ? 'text-rose-600 font-bold' : menstrual.crampSeverity === 'Moderate' ? 'text-amber-600 font-bold' : 'text-slate-600'}`}>
                    {menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea
                      ? '⚠️ Vit D & Prostaglandin Risk'
                      : menstrual.crampSeverity === 'Moderate'
                      ? '⚡ Moderate Uterine Spasms'
                      : menstrual.crampSeverity === 'None'
                      ? '✓ Mild / Minimal Pain'
                      : 'Set in profile'}
                  </span>
                </div>

                {/* 3. Cycle Regularity */}
                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Cycle Regularity</span>
                  <div className="text-base font-black text-slate-900">
                    {menstrual.cycleRegularity || 'Not Configured'}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-600 block">
                    {menstrual.cycleRegularity === 'Regular' ? '24–35 Day Rhythm' : menstrual.cycleRegularity === 'Irregular' ? '⚠️ Fluctuating Rhythm' : menstrual.cycleRegularity ? 'Amenorrhea / Absent' : 'Set in profile'}
                  </span>
                </div>

                {/* 4. Bleeding Days */}
                <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Bleeding Duration</span>
                  <div className="text-base font-black text-slate-900">
                    {menstrual.bleedingDays ? <>{menstrual.bleedingDays} <span className="text-xs font-normal text-slate-500">days</span></> : 'Not Configured'}
                  </div>
                  <span className={`text-[10px] font-semibold block ${menstrual.bleedingDays && menstrual.bleedingDays > 6 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                    {menstrual.bleedingDays && menstrual.bleedingDays > 6 ? '⚠️ Prolonged (>6 days)' : menstrual.bleedingDays ? '✓ Normal span (3–5 days)' : 'Set in profile'}
                  </span>
                </div>
              </div>

              {/* MENSTRUAL DEFICIENCY RISK VECTOR BREAKDOWN */}
              <div className="mt-2 pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#F43F5E]" />
                    <span>Menstrual Deficiency Risk Vector Analysis</span>
                  </span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                    WHO / NIH / Endocrine Society
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* 1. Iron / IDA Risk Vector */}
                  <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-rose-800">Iron (IDA) Vector</span>
                      <span className="text-[11px] font-black text-rose-700">
                        {menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting'
                          ? menstrual.bleedingDays > 6
                            ? '+26% Impact'
                            : '+18% Impact'
                          : menstrual.bleedingDays > 6
                          ? '+8% Impact'
                          : '+0% Physiological'}
                      </span>
                    </div>
                    <p className="text-[10px] text-rose-900/80 leading-tight">
                      {menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting'
                        ? 'Excessive blood shedding (~15-30mg iron loss/cycle).'
                        : 'Standard physiological blood volume replacement.'}
                    </p>
                  </div>

                  {/* 2. Folate (B9) Reticulocyte Vector */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-emerald-800">Folate (B9) Vector</span>
                      <span className="text-[11px] font-black text-emerald-700">
                        {menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting' || menstrual.bleedingDays > 6
                          ? '+12% Impact'
                          : menstrual.cycleRegularity === 'Irregular'
                          ? '+6% Impact'
                          : '+0% Stable'}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-900/80 leading-tight">
                      {menstrual.flowIntensity === 'Heavy' || menstrual.bleedingDays > 6
                        ? 'Rapid reticulocyte RBC replacement depletes Folate.'
                        : 'Normal cellular DNA synthesis cofactors.'}
                    </p>
                  </div>

                  {/* 3. Vitamin D3 Endocrine Vector */}
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-amber-800">Vitamin D3 Vector</span>
                      <span className="text-[11px] font-black text-amber-700">
                        {menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea
                          ? menstrual.cycleRegularity === 'Irregular'
                            ? '+25% Impact'
                            : '+18% Impact'
                          : menstrual.crampSeverity === 'Moderate'
                          ? '+10% Impact'
                          : menstrual.cycleRegularity === 'Irregular'
                          ? '+15% Impact'
                          : '+0% Baseline'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-900/80 leading-tight">
                      {menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea
                        ? 'Dysmenorrhea & COX-2 inflammatory prostaglandin spasms.'
                        : menstrual.crampSeverity === 'Moderate'
                        ? 'Moderate uterine spasms & Vitamin D / Magnesium flux.'
                        : menstrual.cycleRegularity === 'Irregular'
                        ? 'Ovarian VDR receptor & follicle maturation factor.'
                        : 'Normal myometrial pelvic relaxation.'}
                    </p>
                  </div>

                  {/* 4. Vitamin B12 Endocrine Vector */}
                  <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-purple-800">Vitamin B12 Vector</span>
                      <span className="text-[11px] font-black text-purple-700">
                        {menstrual.cycleRegularity === 'Irregular' ? '+8% Impact' : '+0% Stable'}
                      </span>
                    </div>
                    <p className="text-[10px] text-purple-900/80 leading-tight">
                      {menstrual.cycleRegularity === 'Irregular'
                        ? 'Hyperhomocysteinemia & ovarian microvascular stress.'
                        : 'Preserved nerve myelin & microvascular flow.'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Gut Health & Absorption Vector */}
        <div
          id="gut-health-vector"
          className="rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-5 h-5 text-[#F43F5E]" />
              <h3 className="text-base font-bold text-slate-900">Gut Health &amp; Nutrient Absorption</h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  (gut.teaCoffeeWithMeals || gut.frequentAntacidUse)
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {[gut.teaCoffeeWithMeals, gut.frequentAntacidUse].filter(Boolean).length > 0
                  ? `${[gut.teaCoffeeWithMeals, gut.frequentAntacidUse].filter(Boolean).length} inhibitor${[gut.teaCoffeeWithMeals, gut.frequentAntacidUse].filter(Boolean).length > 1 ? 's' : ''} active`
                  : '0 inhibitors recorded'}
              </span>
            </div>
            <button
              type="button"
              id="btn-edit-gut-profile"
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 shadow-2xs transition-all cursor-pointer shrink-0"
              title="Click to edit gut parameters in profile"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>

          <div className="space-y-3">
            {/* Absorption Inhibitors Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Nutrient Absorption Inhibitors &amp; Habits
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    (gut.teaCoffeeWithMeals || gut.frequentAntacidUse)
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {(gut.teaCoffeeWithMeals || gut.frequentAntacidUse)
                    ? `${[gut.teaCoffeeWithMeals, gut.frequentAntacidUse].filter(Boolean).length} active`
                    : '0 inhibitors recorded'}
                </span>
              </div>

              {(gut.teaCoffeeWithMeals || gut.frequentAntacidUse) ? (
                <div className="space-y-2">
                  {/* 1. Chai/Coffee Timing Checkbox */}
                  {gut.teaCoffeeWithMeals && (
                    <div
                      onClick={() => useHealthStore.getState().updateGut({ teaCoffeeWithMeals: false })}
                      className="p-3.5 rounded-2xl border cursor-pointer transition-all bg-amber-50/80 border-amber-300 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md border border-amber-600 bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Chai / Coffee Timing with Meals</span>
                            <span className="text-[11px] font-black text-amber-800">
                              ⚠️ Taken near meals (&lt;1 hr)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Polyphenols &amp; tannins bind non-heme iron in the duodenum, reducing absorption by ~60%.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Antacids / PPI Medication Checkbox */}
                  {gut.frequentAntacidUse && (
                    <div
                      onClick={() => useHealthStore.getState().updateGut({ frequentAntacidUse: false })}
                      className="p-3.5 rounded-2xl border cursor-pointer transition-all bg-amber-50/80 border-amber-300 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-md border border-amber-600 bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">Frequent Antacids / PPI Medication</span>
                            <span className="text-[11px] font-black text-amber-800">
                              ⚠️ Regular PPI / Antacid Use
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            Suppressed gastric acid (hypochlorhydria) prevents Fe3+ to Fe2+ reduction and Vitamin B12 cleavage.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>0 inhibitors recorded — Spaced tea/coffee &amp; normal gastric acid pH</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="text-[11px] font-bold text-[#F43F5E] hover:underline shrink-0"
                  >
                    + Add Inhibitors
                  </button>
                </div>
              )}
            </div>

            {/* 3. Reported Digestive Symptoms */}
            <div className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Reported Gut Symptoms
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    (gut.hasGas || gut.hasAcidity || gut.hasBloating || gut.hasConstipation || gut.hasDiarrhea || gut.hasIBS)
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {[gut.hasGas, gut.hasAcidity, gut.hasBloating, gut.hasConstipation, gut.hasDiarrhea, gut.hasIBS].filter(Boolean).length > 0
                    ? `${[gut.hasGas, gut.hasAcidity, gut.hasBloating, gut.hasConstipation, gut.hasDiarrhea, gut.hasIBS].filter(Boolean).length} active`
                    : '0 symptoms recorded'}
                </span>
              </div>

              {(gut.hasGas || gut.hasAcidity || gut.hasBloating || gut.hasConstipation || gut.hasDiarrhea || gut.hasIBS) ? (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {gut.hasGas && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Gas / Flatulence</span>
                    </span>
                  )}
                  {gut.hasAcidity && (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Gastric Acidity / Reflux</span>
                    </span>
                  )}
                  {gut.hasBloating && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Chronic Bloating</span>
                    </span>
                  )}
                  {gut.hasConstipation && (
                    <span className="px-2.5 py-1 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Constipation</span>
                    </span>
                  )}
                  {gut.hasDiarrhea && (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Diarrhea / Rapid Transit</span>
                    </span>
                  )}
                  {gut.hasIBS && (
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-bold flex items-center gap-1">
                      <span>IBS / Sensitive Gut</span>
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs font-semibold text-emerald-800 bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200/80 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>0 symptoms recorded — No digestive distress or mucosal absorption impairment flagged</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Complete Blood Count (CBC) & Micronutrient Lab Panel */}
      <section
        id="lab-data-panel"
        className="rounded-3xl bg-white p-6 border border-[#FCE7F3] shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-[#F43F5E]" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Complete Blood Count (CBC) &amp; Diagnostic Lab Biomarkers
              </h3>
              <p className="text-xs text-slate-500">
                Saved clinical pathology test values with reference ranges, diagnostic status indicators, and editing controls.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              id="btn-toggle-edit-labs"
              onClick={() => setIsEditingLabs(!isEditingLabs)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border shadow-2xs transition-all cursor-pointer ${
                isEditingLabs
                  ? 'bg-[#F43F5E] text-white border-[#F43F5E] hover:bg-[#E11D48]'
                  : 'bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#F43F5E] border-rose-200'
              }`}
              title={isEditingLabs ? 'Finish and save edits' : 'Edit lab values directly'}
            >
              {isEditingLabs ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done Editing</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Values</span>
                </>
              )}
            </button>
            <button
              type="button"
              id="btn-open-lab-ocr"
              onClick={() => setProfileModalOpen(true)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Upload lab report PDF or Image for OCR auto-extraction"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />
              <span>Upload / OCR</span>
            </button>
            <span className="text-xs font-semibold text-slate-500 bg-[#FFF5F7] px-3 py-1.5 rounded-xl border border-[#FCE7F3]">
              Recorded: {hasAnyLoggedLabTest && labs.dateRecorded ? labs.dateRecorded : ''}
            </span>
          </div>
        </div>

        {/* Informational baseline vs historical tracker guidance */}
        <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 shadow-xs">
          <Info className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Active Daily Baseline Notice:</span> Values updated here are considered your active clinical baseline for daily dietary recommendations. To archive blood test reports as historical timeline records with specific test dates, use the <strong>Upload / OCR</strong> flow or Health &amp; Lab Tracker.
          </div>
        </div>

        {/* 1. Complete Blood Count (CBC) Panel */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Complete Blood Count (CBC) Panel
            </h4>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              9 Erythrocyte &amp; Cell Markers
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Hemoglobin */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Hemoglobin (Hb)</span>
                <span className="text-[10px] text-slate-400 font-normal">g/dL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.1"
                  id="input-lab-hemoglobin"
                  value={labs.hemoglobin ?? ''}
                  onChange={(e) => updateLabs({ hemoglobin: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.hemoglobin !== undefined && labs.hemoglobin !== null ? (
                    <>{labs.hemoglobin} <span className="text-xs font-normal text-slate-500">g/dL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.hemoglobin !== undefined && labs.hemoglobin !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.hemoglobin < 8.0
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : labs.hemoglobin < 11.0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.hemoglobin < 12.0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : labs.hemoglobin <= 15.5
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {labs.hemoglobin < 8.0
                      ? 'Severe Anemia'
                      : labs.hemoglobin < 11.0
                      ? 'Moderate Anemia'
                      : labs.hemoglobin < 12.0
                      ? 'Mild Anemia'
                      : labs.hemoglobin <= 15.5
                      ? 'Normal / Optimal'
                      : 'Elevated'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 12.0–15.5</span>
              </div>
            </div>

            {/* RBC Count */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">RBC Count</span>
                <span className="text-[10px] text-slate-400 font-normal">M/µL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.1"
                  id="input-lab-rbc"
                  value={labs.rbc ?? ''}
                  onChange={(e) => updateLabs({ rbc: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.rbc !== undefined && labs.rbc !== null ? (
                    <>{labs.rbc} <span className="text-xs font-normal text-slate-500">M/µL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.rbc !== undefined && labs.rbc !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.rbc < 4.2
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.rbc <= 5.4
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {labs.rbc < 4.2 ? 'Low Erythrocytes' : labs.rbc <= 5.4 ? 'Optimal Range' : 'Elevated'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 4.2–5.4</span>
              </div>
            </div>

            {/* Hematocrit */}
            {(() => {
              const hct = labs.hematocrit;
              const isLow = hct !== undefined && hct !== null && hct < 37.0;
              const isOpt = hct !== undefined && hct !== null && hct >= 37.0 && hct <= 48.0;
              const isHigh = hct !== undefined && hct !== null && hct > 48.0;
              return (
                <div className={`p-3 rounded-2xl border transition-all ${
                  isLow ? 'bg-rose-50 border-rose-300 shadow-xs' :
                  isHigh ? 'bg-amber-50 border-amber-300' :
                  'bg-slate-50/70 border-slate-200/80'
                }`}>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block truncate flex items-center gap-1">
                      <span>Hematocrit (Hct / PCV)</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOpt ? 'bg-emerald-500' : isLow ? 'bg-rose-500' : 'bg-slate-400'}`} />
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">%</span>
                  </div>
                  {isEditingLabs ? (
                    <input
                      type="number"
                      step="0.5"
                      id="input-lab-hematocrit"
                      value={labs.hematocrit ?? ''}
                      onChange={(e) => updateLabs({ hematocrit: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-black text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-base font-black text-slate-900">
                      {labs.hematocrit !== undefined && labs.hematocrit !== null ? (
                        <>{labs.hematocrit} <span className="text-xs font-normal text-slate-500">%</span></>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Not recorded</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {labs.hematocrit !== undefined && labs.hematocrit !== null ? (
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        labs.hematocrit < 37.0
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : labs.hematocrit <= 48.0
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {labs.hematocrit < 37.0 ? 'Low Packed Vol (Hb×3)' : labs.hematocrit <= 48.0 ? 'Optimal PCV' : 'High Hemoconcentration'}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        Pending Lab Data
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 font-semibold">Ref: 37.0–48.0%</span>
                  </div>
                </div>
              );
            })()}

            {/* MCV */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">MCV (Cell Volume)</span>
                <span className="text-[10px] text-slate-400 font-normal">fL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.5"
                  id="input-lab-mcv"
                  value={labs.mcv ?? ''}
                  onChange={(e) => updateLabs({ mcv: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.mcv !== undefined && labs.mcv !== null ? (
                    <>{labs.mcv} <span className="text-xs font-normal text-slate-500">fL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.mcv !== undefined && labs.mcv !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.mcv < 80
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.mcv <= 96
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-purple-100 text-purple-800 border-purple-200'
                  }`}>
                    {labs.mcv < 80 ? 'Microcytic (<80 fL)' : labs.mcv <= 96 ? 'Normocytic (80–96)' : 'Macrocytic (>96)'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 80.0–96.0</span>
              </div>
            </div>

            {/* MCH */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">MCH (Cell Hb)</span>
                <span className="text-[10px] text-slate-400 font-normal">pg</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.5"
                  id="input-lab-mch"
                  value={labs.mch ?? ''}
                  onChange={(e) => updateLabs({ mch: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.mch !== undefined && labs.mch !== null ? (
                    <>{labs.mch} <span className="text-xs font-normal text-slate-500">pg</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.mch !== undefined && labs.mch !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.mch < 27.0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.mch <= 33.0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {labs.mch < 27.0 ? 'Hypochromic (<27)' : labs.mch <= 33.0 ? 'Normochromic' : 'Hyperchromic'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 27.0–33.0</span>
              </div>
            </div>

            {/* MCHC */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">MCHC (Hb Conc)</span>
                <span className="text-[10px] text-slate-400 font-normal">g/dL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.5"
                  id="input-lab-mchc"
                  value={labs.mchc ?? ''}
                  onChange={(e) => updateLabs({ mchc: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.mchc !== undefined && labs.mchc !== null ? (
                    <>{labs.mchc} <span className="text-xs font-normal text-slate-500">g/dL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.mchc !== undefined && labs.mchc !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.mchc < 32.0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.mchc <= 36.0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {labs.mchc < 32.0 ? 'Low Concentration' : labs.mchc <= 36.0 ? 'Optimal Saturation' : 'Elevated Conc'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 32.0–36.0</span>
              </div>
            </div>

            {/* RDW */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">RDW (Size Variation)</span>
                <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.1"
                  id="input-lab-rdw"
                  value={labs.rdw ?? ''}
                  onChange={(e) => updateLabs({ rdw: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.rdw !== undefined && labs.rdw !== null ? (
                    <>{labs.rdw} <span className="text-xs font-normal text-slate-500">%</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.rdw !== undefined && labs.rdw !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.rdw > 14.5
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  }`}>
                    {labs.rdw > 14.5 ? 'Anisocytosis (IDA Flag)' : 'Normal Homogeneity'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 11.5–14.5%</span>
              </div>
            </div>

            {/* Platelet Count */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Platelet Count</span>
                <span className="text-[10px] text-slate-400 font-normal">x10³/µL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="1"
                  id="input-lab-platelet"
                  value={labs.plateletCount ?? ''}
                  onChange={(e) => updateLabs({ plateletCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.plateletCount !== undefined && labs.plateletCount !== null ? (
                    <>{labs.plateletCount} <span className="text-xs font-normal text-slate-500">x10³/µL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.plateletCount !== undefined && labs.plateletCount !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.plateletCount < 150
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.plateletCount <= 450
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {labs.plateletCount < 150 ? 'Thrombocytopenia' : labs.plateletCount <= 450 ? 'Normal Hemostasis' : 'Thrombocytosis'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 150–450</span>
              </div>
            </div>

            {/* WBC Count */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">WBC Count</span>
                <span className="text-[10px] text-slate-400 font-normal">x10³/µL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.1"
                  id="input-lab-wbc"
                  value={labs.wbcCount ?? ''}
                  onChange={(e) => updateLabs({ wbcCount: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.wbcCount !== undefined && labs.wbcCount !== null ? (
                    <>{labs.wbcCount} <span className="text-xs font-normal text-slate-500">x10³/µL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.wbcCount !== undefined && labs.wbcCount !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.wbcCount < 4.0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : labs.wbcCount <= 11.0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'
                  }`}>
                    {labs.wbcCount < 4.0 ? 'Leukopenia' : labs.wbcCount <= 11.0 ? 'Normal Immunity' : 'Leukocytosis'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 4.0–11.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Serum Iron Studies Panel */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Serum Iron Studies &amp; Reserves
            </h4>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              Iron Deficiency Anemia (IDA) Differentials
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Serum Ferritin */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Serum Ferritin</span>
                <span className="text-[10px] text-slate-400 font-normal">ng/mL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.5"
                  id="input-lab-ferritin"
                  value={labs.serumFerritin ?? ''}
                  onChange={(e) => updateLabs({ serumFerritin: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.serumFerritin !== undefined && labs.serumFerritin !== null ? (
                    <>{labs.serumFerritin} <span className="text-xs font-normal text-slate-500">ng/mL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.serumFerritin !== undefined && labs.serumFerritin !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.serumFerritin < 15.0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.serumFerritin < 30.0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : labs.serumFerritin <= 150.0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {labs.serumFerritin < 15.0
                      ? 'Depleted Iron (<15)'
                      : labs.serumFerritin < 30.0
                      ? 'Borderline Low'
                      : labs.serumFerritin <= 150.0
                      ? 'Adequate Reserves'
                      : 'Elevated'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 15–150</span>
              </div>
            </div>

            {/* Serum Iron */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Serum Iron</span>
                <span className="text-[10px] text-slate-400 font-normal">µg/dL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="1"
                  id="input-lab-serum-iron"
                  value={labs.serumIron ?? ''}
                  onChange={(e) => updateLabs({ serumIron: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.serumIron !== undefined && labs.serumIron !== null ? (
                    <>{labs.serumIron} <span className="text-xs font-normal text-slate-500">µg/dL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.serumIron !== undefined && labs.serumIron !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.serumIron < 60
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.serumIron <= 170
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {labs.serumIron < 60 ? 'Low Circulating Fe' : labs.serumIron <= 170 ? 'Optimal Serum Fe' : 'Elevated Fe'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 60–170</span>
              </div>
            </div>

            {/* TIBC */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">TIBC (Capacity)</span>
                <span className="text-[10px] text-slate-400 font-normal">µg/dL</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="5"
                  id="input-lab-tibc"
                  value={labs.tibc ?? ''}
                  onChange={(e) => updateLabs({ tibc: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.tibc !== undefined && labs.tibc !== null ? (
                    <>{labs.tibc} <span className="text-xs font-normal text-slate-500">µg/dL</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.tibc !== undefined && labs.tibc !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.tibc > 450
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.tibc >= 240
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border-amber-200'
                  }`}>
                    {labs.tibc > 450 ? 'High Capacity (IDA)' : labs.tibc >= 240 ? 'Normal Capacity' : 'Low Binding'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 240–450</span>
              </div>
            </div>

            {/* Transferrin Saturation */}
            <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-1 hover:border-rose-200 transition-colors">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block truncate">Transferrin Sat (TSAT)</span>
                <span className="text-[10px] text-slate-400 font-normal">%</span>
              </div>
              {isEditingLabs ? (
                <input
                  type="number"
                  step="0.5"
                  id="input-lab-tsat"
                  value={labs.transferrinSaturation ?? ''}
                  onChange={(e) => updateLabs({ transferrinSaturation: e.target.value === '' ? undefined : Number(e.target.value) })}
                  className="mt-1 w-full bg-white rounded-xl border border-slate-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                />
              ) : (
                <div className="text-base font-black text-slate-900">
                  {labs.transferrinSaturation !== undefined && labs.transferrinSaturation !== null ? (
                    <>{labs.transferrinSaturation} <span className="text-xs font-normal text-slate-500">%</span></>
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Not recorded</span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {labs.transferrinSaturation !== undefined && labs.transferrinSaturation !== null ? (
                  <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                    labs.transferrinSaturation < 16.0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : labs.transferrinSaturation < 20.0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : labs.transferrinSaturation <= 50.0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}>
                    {labs.transferrinSaturation < 16.0
                      ? 'Severe IDA (<16%)'
                      : labs.transferrinSaturation < 20.0
                      ? 'Borderline Sat'
                      : labs.transferrinSaturation <= 50.0
                      ? 'Optimal Saturation'
                      : 'Overload Risk'}
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                    Pending Lab Data
                  </span>
                )}
                <span className="text-[9px] text-slate-400">Ref: 20–50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Micronutrient Panel */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Micronutrient Panel (B12, D3, Folate, Vitamin C)
            </h4>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
              Neuro-Hemoglobin Co-Factors
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Vitamin B12 */}
            {(() => {
              const b12 = labs.vitaminB12;
              const isDef = b12 !== undefined && b12 !== null && b12 < 200;
              const isBord = b12 !== undefined && b12 !== null && b12 >= 200 && b12 < 350;
              const isOpt = b12 !== undefined && b12 !== null && b12 >= 350;
              return (
                <div className={`p-3 rounded-2xl border transition-all ${
                  isDef ? 'bg-rose-50 border-rose-300 shadow-xs' :
                  isBord ? 'bg-amber-50 border-amber-300' :
                  isOpt ? 'bg-emerald-50/70 border-emerald-300' :
                  'bg-purple-50/50 border-purple-200/80'
                }`}>
                  <div className="flex justify-between items-center text-xs font-semibold text-purple-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block truncate">Vitamin B12</span>
                    <span className="text-[10px] text-purple-400 font-normal">pg/mL</span>
                  </div>
                  {isEditingLabs ? (
                    <input
                      type="number"
                      step="10"
                      id="input-lab-b12"
                      value={labs.vitaminB12 ?? ''}
                      onChange={(e) => updateLabs({ vitaminB12: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="mt-1 w-full bg-white rounded-xl border border-purple-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-purple-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-base font-black text-slate-900">
                      {labs.vitaminB12 !== undefined && labs.vitaminB12 !== null ? (
                        <>{labs.vitaminB12} <span className="text-xs font-normal text-slate-500">pg/mL</span></>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Not recorded</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {labs.vitaminB12 !== undefined && labs.vitaminB12 !== null ? (
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        labs.vitaminB12 < 200
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : labs.vitaminB12 < 350
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {labs.vitaminB12 < 200 ? 'Deficient (<200)' : labs.vitaminB12 < 350 ? 'Borderline Low' : 'Optimal (>350)'}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        Pending Lab Data
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">Ref: &gt;350</span>
                  </div>
                </div>
              );
            })()}

            {/* Vitamin D3 */}
            {(() => {
              const d3 = labs.vitaminD;
              const isDef = d3 !== undefined && d3 !== null && d3 < 20;
              const isBord = d3 !== undefined && d3 !== null && d3 >= 20 && d3 < 30;
              const isOpt = d3 !== undefined && d3 !== null && d3 >= 30;
              return (
                <div className={`p-3 rounded-2xl border transition-all ${
                  isDef ? 'bg-rose-50 border-rose-300 shadow-xs' :
                  isBord ? 'bg-amber-50 border-amber-300' :
                  isOpt ? 'bg-emerald-50/70 border-emerald-300' :
                  'bg-orange-50/50 border-orange-200/80'
                }`}>
                  <div className="flex justify-between items-center text-xs font-semibold text-orange-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block truncate">Vitamin D3 (25-OH)</span>
                    <span className="text-[10px] text-orange-400 font-normal">ng/mL</span>
                  </div>
                  {isEditingLabs ? (
                    <input
                      type="number"
                      step="1"
                      id="input-lab-d3"
                      value={labs.vitaminD ?? ''}
                      onChange={(e) => updateLabs({ vitaminD: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="mt-1 w-full bg-white rounded-xl border border-orange-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-base font-black text-slate-900">
                      {labs.vitaminD !== undefined && labs.vitaminD !== null ? (
                        <>{labs.vitaminD} <span className="text-xs font-normal text-slate-500">ng/mL</span></>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Not recorded</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {labs.vitaminD !== undefined && labs.vitaminD !== null ? (
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        labs.vitaminD < 20
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : labs.vitaminD < 30
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {labs.vitaminD < 20 ? 'Deficient (<20)' : labs.vitaminD < 30 ? 'Insufficient (20–29)' : 'Optimal (30–60)'}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        Pending Lab Data
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">Ref: 30–60</span>
                  </div>
                </div>
              );
            })()}

            {/* Folate (B9) */}
            {(() => {
              const fol = labs.folateB9;
              const isDef = fol !== undefined && fol !== null && fol < 4.0;
              const isBord = fol !== undefined && fol !== null && fol >= 4.0 && fol < 8.0;
              const isOpt = fol !== undefined && fol !== null && fol >= 8.0;
              return (
                <div className={`p-3 rounded-2xl border transition-all ${
                  isDef ? 'bg-rose-50 border-rose-300 shadow-xs' :
                  isBord ? 'bg-amber-50 border-amber-300' :
                  isOpt ? 'bg-emerald-50/70 border-emerald-300' :
                  'bg-emerald-50/50 border-emerald-200/80'
                }`}>
                  <div className="flex justify-between items-center text-xs font-semibold text-emerald-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block truncate">Folate (Vitamin B9)</span>
                    <span className="text-[10px] text-emerald-500 font-normal">ng/mL</span>
                  </div>
                  {isEditingLabs ? (
                    <input
                      type="number"
                      step="0.5"
                      id="input-lab-folate"
                      value={labs.folateB9 ?? ''}
                      onChange={(e) => updateLabs({ folateB9: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="mt-1 w-full bg-white rounded-xl border border-emerald-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-emerald-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-base font-black text-slate-900">
                      {labs.folateB9 !== undefined && labs.folateB9 !== null ? (
                        <>{labs.folateB9} <span className="text-xs font-normal text-slate-500">ng/mL</span></>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Not recorded</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {labs.folateB9 !== undefined && labs.folateB9 !== null ? (
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        labs.folateB9 < 4.0
                          ? 'bg-rose-100 text-rose-800 border-rose-200'
                          : labs.folateB9 < 8.0
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {labs.folateB9 < 4.0 ? 'Deficient (<4.0)' : labs.folateB9 < 8.0 ? 'Borderline (4–8)' : 'Optimal (≥8.0)'}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        Pending Lab Data
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">Ref: &ge;8.0</span>
                  </div>
                </div>
              );
            })()}

            {/* Vitamin C */}
            {(() => {
              const vitc = labs.vitaminC;
              const isDef = vitc !== undefined && vitc !== null && vitc < 0.4;
              const isOpt = vitc !== undefined && vitc !== null && vitc >= 0.4;
              return (
                <div className={`p-3 rounded-2xl border transition-all ${
                  isDef ? 'bg-amber-50 border-amber-300 shadow-xs' :
                  isOpt ? 'bg-emerald-50/70 border-emerald-300' :
                  'bg-amber-50/50 border-amber-200/80'
                }`}>
                  <div className="flex justify-between items-center text-xs font-semibold text-amber-900">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block truncate">Vitamin C (Ascorbic)</span>
                    <span className="text-[10px] text-amber-500 font-normal">mg/dL</span>
                  </div>
                  {isEditingLabs ? (
                    <input
                      type="number"
                      step="0.1"
                      id="input-lab-vitc"
                      value={labs.vitaminC ?? ''}
                      onChange={(e) => updateLabs({ vitaminC: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="mt-1 w-full bg-white rounded-xl border border-amber-300 px-3 py-1.5 text-base font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                  ) : (
                    <div className="text-base font-black text-slate-900">
                      {labs.vitaminC !== undefined && labs.vitaminC !== null ? (
                        <>{labs.vitaminC} <span className="text-xs font-normal text-slate-500">mg/dL</span></>
                      ) : (
                        <span className="text-sm font-medium text-slate-400">Not recorded</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    {labs.vitaminC !== undefined && labs.vitaminC !== null ? (
                      <span className={`inline-block text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                        labs.vitaminC < 0.4
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {labs.vitaminC < 0.4 ? 'Low (<0.4)' : 'Optimal (≥0.4)'}
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-medium text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200">
                        Pending Lab Data
                      </span>
                    )}
                    <span className="text-[9px] text-slate-400">Ref: 0.4–1.5</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-[#FCE7F3] text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />
            <span>Need to update lab numbers or scan a new pathology report?</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditingLabs(!isEditingLabs)}
              className="font-bold text-[#F43F5E] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditingLabs ? 'Close Inline Edit' : 'Quick Edit Values'}</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              className="font-bold text-[#F43F5E] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Full Profile &amp; OCR</span>
            </button>
          </div>
        </div>
      </section>

      {/* Emergency Red-Flag Symptoms Gate Checklist */}
      <section
        id="severe-symptoms-gate"
        className="rounded-3xl bg-rose-50/40 p-6 border border-rose-200 space-y-3"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Emergency Safety Checklist (Red-Flag Triage)
            </h3>
            <p className="text-xs text-slate-600">
              Checking any of these activates the Module 1 emergency triage directive protocol immediately.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-rose-100 cursor-pointer">
            <input
              type="checkbox"
              checked={severeSymptoms.severeBreathlessness}
              onChange={(e) => updateSevereSymptoms({ severeBreathlessness: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="font-semibold">Severe breathlessness at rest or climbing 3 stairs</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-rose-100 cursor-pointer">
            <input
              type="checkbox"
              checked={severeSymptoms.chestPain}
              onChange={(e) => updateSevereSymptoms({ chestPain: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="font-semibold">Chest pain, palpitations, or acute racing heartbeat</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-rose-100 cursor-pointer">
            <input
              type="checkbox"
              checked={severeSymptoms.faintingOrSyncope}
              onChange={(e) => updateSevereSymptoms({ faintingOrSyncope: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="font-semibold">Fainting episodes (syncope) or loss of consciousness</span>
          </label>

          <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border border-rose-100 cursor-pointer">
            <input
              type="checkbox"
              checked={severeSymptoms.extremeFatigueImmobile}
              onChange={(e) => updateSevereSymptoms({ extremeFatigueImmobile: e.target.checked })}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="font-semibold">Extreme prostrating fatigue rendering unable to stand</span>
          </label>
        </div>
      </section>

      {/* Comprehensive Blood Tests & Diagnostic Correlation Reference Guide */}
      <section
        id="blood-tests-reference-guide"
        className="rounded-3xl bg-white p-6 sm:p-8 border border-[#FCE7F3] shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
                Clinical Pathology Reference
              </span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                ICMR, WHO & NHLBI Aligned
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">
              Essential Blood Tests, Normal Limits, Clinical Uses & Correlations
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Complete guide to understanding CBC, Iron Studies, Vitamin B12, Vitamin D3, Folate, and Vitamin C diagnostic thresholds.
            </p>
          </div>

          <button
            onClick={() => setShowBloodTestGuide(!showBloodTestGuide)}
            className="flex items-center gap-2 rounded-2xl bg-[#FFF5F7] text-[#F43F5E] text-xs font-bold px-4 py-2.5 border border-[#FCE7F3] hover:bg-[#FCE7F3] transition-colors cursor-pointer shrink-0"
          >
            <span>{showBloodTestGuide ? 'Collapse Laboratory Guide' : 'Expand Laboratory Guide'}</span>
            {showBloodTestGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showBloodTestGuide && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* 6 Blood Test Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Complete Blood Count (CBC) */}
              <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">1. Complete Blood Count (CBC)</h4>
                  <a
                    href="https://smarthealthreport.in/blog/cbc-test-explained"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#F43F5E] hover:text-[#E11D48]"
                    title="Read CBC Explanation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Parameters: </span>
                    Hb, RBC, Hematocrit (Hct / PCV), MCV, MCH, MCHC, RDW, Platelets, WBC.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Key Limits: </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 mt-1">
                      <li><strong>Hemoglobin (Hb):</strong> 12.0–15.5 g/dL (Adult F), 11.0–14.0 g/dL (Pregnancy)</li>
                      <li><strong>RBC Count:</strong> 4.2–5.4 M/µL (erythrocyte mass)</li>
                      <li><strong>Hematocrit (Hct):</strong> 37.0–48.0% (Rule of Three: Hct ≈ 3 × Hb)</li>
                      <li><strong>MCV (Cell Size):</strong> 80.0–96.0 fL (&lt;80 microcytic; &gt;96 macrocytic)</li>
                      <li><strong>RDW (Size Variation):</strong> 11.5–14.5% (&gt;15% in early IDA)</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-600 pt-1">
                    <strong>Clinical Use &amp; Hct Role:</strong> Primary screen to detect anemia severity and cell morphology. <em>Hematocrit (Hct)</em> calculates red cell volume fraction, derives MCV and MCHC, and flags hydration shifts (hemodilution vs. hemoconcentration).
                  </p>
                </div>
              </div>

              {/* Card 2: Iron Studies & Ferritin Profile */}
              <div className="rounded-2xl bg-[#FFF5F7] p-4 border border-[#FCE7F3] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">2. Iron Profile / Iron Studies</h4>
                  <a
                    href="https://myhematology.com/lab-protocols/interpretation-of-iron-studies-iron-profile/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#F43F5E] hover:text-[#E11D48]"
                    title="Read Iron Studies Interpretation"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Parameters: </span>
                    Serum Ferritin, Serum Iron, TIBC, % TSAT.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Key Limits: </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 mt-1">
                      <li><strong>Serum Ferritin:</strong> &lt;15 ng/mL (Depleted iron stores; &lt;30 in inflammation)</li>
                      <li><strong>Serum Iron:</strong> 60–170 µg/dL</li>
                      <li><strong>TIBC:</strong> 240–450 µg/dL (Elevated &gt;450 in iron starvation)</li>
                      <li><strong>TSAT:</strong> 20–50% (&lt;16–20% confirms IDA)</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    <strong>Clinical Use:</strong> Gold standard for differentiating iron deficiency from anemia of chronic inflammation.
                  </p>
                </div>
              </div>

              {/* Card 3: Vitamin B12 (Cobalamin) Test */}
              <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">3. Vitamin B12 (Cobalamin)</h4>
                  <a
                    href="https://www.apollohospitals.com/diagnostics-investigations/vitamin-b12-test"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#F43F5E] hover:text-[#E11D48]"
                    title="Apollo Hospitals B12 Test Guide"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Normal Range: </span>
                    &gt;300 pg/mL
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Diagnostic Limits: </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 mt-1">
                      <li><strong>Deficient:</strong> &lt;200 pg/mL (Neurological + Megaloblastic risk)</li>
                      <li><strong>Borderline:</strong> 200–300 pg/mL</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    <strong>Clinical Use:</strong> Evaluates macrocytic anemia, peripheral neuropathy (tingling in fingers/toes), glossitis, and memory fog.
                  </p>
                </div>
              </div>

              {/* Card 4: Vitamin D3 [25(OH)D] Test */}
              <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">4. Vitamin D3 (25-OH)</h4>
                  <a
                    href="https://www.apollohospitals.com/diagnostics-investigations/vitamin-d-test"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:text-amber-900"
                    title="Apollo Hospitals Vit D Test Guide"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Optimal Range: </span>
                    30.0–60.0 ng/mL
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Diagnostic Limits: </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 mt-1">
                      <li><strong>Deficient:</strong> &lt;20.0 ng/mL (&lt;10.0 severe deficiency)</li>
                      <li><strong>Insufficient:</strong> 20.0–29.9 ng/mL</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    <strong>Clinical Use:</strong> "The Silent Deficiency" — evaluates unexplained lower back/hip bone aches, calf cramps, hair shedding, and low mood.
                  </p>
                </div>
              </div>

              {/* Card 5: Folate (Vitamin B9 / Folic Acid) */}
              <div className="rounded-2xl bg-slate-50/70 p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">5. Folate (Vitamin B9)</h4>
                  <a
                    href="https://www.apollohospitals.com/diagnostics-investigations/folic-acid-test"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#F43F5E] hover:text-[#E11D48]"
                    title="Apollo Hospitals Folate Test Guide"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Optimal Range: </span>
                    &gt;8.0 ng/mL
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Diagnostic Limits: </span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-700 mt-1">
                      <li><strong>Deficient:</strong> &lt;4.0 ng/mL</li>
                      <li><strong>Borderline:</strong> 4.0–8.0 ng/mL</li>
                    </ul>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    <strong>Clinical Use:</strong> Assesses megaloblastic erythrocyte formation, mouth ulcerations, homocysteine metabolism, and neural tube defect prevention.
                  </p>
                </div>
              </div>

              {/* Card 6: Vitamin C (Ascorbic Acid) */}
              <div className="rounded-2xl bg-emerald-50/60 p-4 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">6. Vitamin C (Ascorbic Acid)</h4>
                  <a
                    href="https://www.apollohospitals.com/diagnostics-investigations/vitamin-c-test"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-700 hover:text-emerald-900"
                    title="Apollo Hospitals Vitamin C Test Guide"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="text-xs space-y-1.5 text-slate-600">
                  <div>
                    <span className="font-semibold text-slate-800">Normal Range: </span>
                    0.4–1.5 mg/dL (&lt;0.2 mg/dL deficient)
                  </div>
                  <div>
                    <span className="font-semibold text-slate-800">Synergistic Mechanism: </span>
                    Acts as an essential electron donor converting insoluble Fe3+ to soluble Fe2+ in the duodenum.
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1">
                    <strong>Clinical Use:</strong> Triples non-heme plant iron uptake and protects gastric mucosa from oxidative stress.
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnostic Multi-Marker Correlation Matrix */}
            <div className="rounded-2xl bg-[#FFF1F2] p-5 border border-[#FCE7F3] space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#F43F5E]" />
                <h4 className="text-sm font-bold text-slate-900">
                  Diagnostic Correlation Engine: Differential Diagnosis of Anemias
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-[#FCE7F3] space-y-1.5">
                  <span className="font-bold text-[#F43F5E] block">Microcytic Hypochromic</span>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>• Low Hb (&lt;12.0)</div>
                    <div>• Low MCV (&lt;80 fL)</div>
                    <div>• Low Ferritin (&lt;15 ng/mL)</div>
                    <div>• Low TSAT (&lt;16%) & High TIBC</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 bg-rose-50 px-2 py-0.5 rounded block">
                    Diagnosis: Iron Deficiency Anemia (IDA)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#FCE7F3] space-y-1.5">
                  <span className="font-bold text-purple-700 block">Macrocytic Megaloblastic</span>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>• Low Hb (&lt;12.0)</div>
                    <div>• High MCV (&gt;96–100 fL)</div>
                    <div>• Low B12 (&lt;200 pg/mL) OR</div>
                    <div>• Low Folate (&lt;4.0 ng/mL)</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 bg-purple-50 px-2 py-0.5 rounded block">
                    Diagnosis: B12 / Folate Megaloblastosis
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#FCE7F3] space-y-1.5">
                  <span className="font-bold text-amber-700 block">Dimorphic / Mixed Anemia</span>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>• Low Hb (&lt;12.0)</div>
                    <div>• Normal MCV (80–96 fL)</div>
                    <div>• High RDW (&gt;15%)</div>
                    <div>• Low Ferritin AND Low B12</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 bg-amber-50 px-2 py-0.5 rounded block">
                    Diagnosis: Combined Iron + B12 Gap
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-[#FCE7F3] space-y-1.5">
                  <span className="font-bold text-slate-700 block">Anemia of Inflammation</span>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div>• Low Hb (&lt;12.0)</div>
                    <div>• Normal/Low MCV</div>
                    <div>• High/Normal Ferritin (&gt;100)</div>
                    <div>• Low Serum Iron & Low TIBC</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded block">
                    Diagnosis: Hepcidin / Chronic Disease
                  </span>
                </div>
              </div>

              {/* Direct Authority Links Footer */}
              <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span className="font-bold text-slate-700">Verified Clinical References:</span>
                <a href="https://labresult.md/conditions/anemia-blood-tests" target="_blank" rel="noreferrer" className="text-[#F43F5E] hover:underline flex items-center gap-0.5">
                  LabResult.md <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a href="https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia" target="_blank" rel="noreferrer" className="text-[#F43F5E] hover:underline flex items-center gap-0.5">
                  US NHLBI NIH <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a href="https://www.drlogy.com/health/anemia-diagnosis" target="_blank" rel="noreferrer" className="text-[#F43F5E] hover:underline flex items-center gap-0.5">
                  DrLogy Anemia Diagnosis <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={1}
        currentStageTitle="Stage 1: Health Vector & Lab Biomarkers"
        prevTab="dashboard"
        prevStageTitle="Dashboard"
        nextTab="risks"
        nextStageTitle="Stage 2: Deficiency Risk Engine"
        nextStageDescription="Compute your Multi-Deficiency Risk Index (Iron, B12, Folate, Inflammation) & AMB severity tiering."
      />
    </div>
  );
};
