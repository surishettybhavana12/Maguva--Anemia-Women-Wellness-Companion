import React from 'react';
import {
  User,
  Scale,
  Calendar,
  Sparkles,
  HeartPulse,
  Droplets,
  Zap,
  Activity,
  Sun,
  Edit3,
  X,
  ShieldCheck,
  Award,
  ChevronRight,
  TrendingUp,
  Info,
  LogOut,
  Cloud,
  CloudOff,
  Database,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { syncProfileWithCloud } from '../hooks/useAppSessionManager';
import { cmToFeetInches } from '../utils/heightConverter';
import { useComputedHealth } from '../utils/useComputedHealth';
import { MahuaEmblem } from './MahuaEmblem';
import { logoutUser } from '../services/authService';
import { db, doc, setDoc } from '../lib/firebase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditProfile: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onEditProfile,
}) => {
  const currentUser = useHealthStore((state) => state.currentUser);
  const demographics = useHealthStore((state) => state.demographics);
  const labs = useHealthStore((state) => state.labs);
  const quotaExceeded = useHealthStore((state) => state.quotaExceeded);
  const isSessionHydrated = useHealthStore((state) => state.isSessionHydrated);
  const isSyncingWithCloud = useHealthStore((state) => state.isSyncingWithCloud);
  const lastCloudSyncTimestamp = useHealthStore((state) => state.lastCloudSyncTimestamp);
  const cloudSyncMessage = useHealthStore((state) => state.cloudSyncMessage);
  const signOut = useHealthStore((state) => state.signOut);

  const syncWithCloud = () => syncProfileWithCloud(true);

  const { bmi, icmrProfile, icmrBaseline } = useComputedHealth();

  if (!isOpen) return null;

  // Height and Weight conversions
  const hasHeight = demographics?.heightCm !== undefined && demographics?.heightCm !== null && demographics.heightCm > 0;
  const hasWeight = demographics?.weightKg !== undefined && demographics?.weightKg !== null && demographics.weightKg > 0;
  const hasAge = demographics?.age !== undefined && demographics?.age !== null && demographics.age > 0;

  const heightCm = hasHeight ? demographics.heightCm! : null;
  const weightKg = hasWeight ? demographics.weightKg! : null;
  const ftIn = heightCm ? cmToFeetInches(heightCm) : null;
  const heightFt = ftIn ? ftIn.ft : null;
  const heightIn = ftIn ? ftIn.inches : null;
  const weightLbs = weightKg ? (weightKg * 2.20462).toFixed(1) : null;

  // Healthy weight range (BMI 18.5 - 22.9 Asian Indian)
  const heightM = heightCm ? heightCm / 100 : null;
  const minHealthyWeight = heightM ? (18.5 * heightM * heightM).toFixed(1) : null;
  const maxHealthyWeight = heightM ? (22.9 * heightM * heightM).toFixed(1) : null;

  // Life Stage category
  const age = hasAge ? demographics.age! : null;
  const lifeStage = age
    ? age < 19
      ? 'Adolescent (WHO LMS Growth Standard)'
      : age < 50
      ? 'Adult Reproductive Age (ICMR-NIN 2020)'
      : 'Peri/Post-Menopausal (ICMR-NIN 2020)'
    : 'Pending Data';

  const hasCalculatedBmi = hasHeight && hasWeight && bmi?.bmi && bmi.bmi > 0;

  return (
    <div
      id="user-profile-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="user-profile-modal-card"
        className="bg-white rounded-3xl border border-[#FCE7F3] shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FFF5F7] via-white to-[#FFF1F2] border-b border-[#FCE7F3] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center text-base font-extrabold shadow-sm border-2 border-white">
              {(currentUser?.name || demographics?.name || 'B').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {currentUser?.name || demographics?.name || 'Personal Health Profile'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFF1F2] text-[#F43F5E] px-2 py-0.5 rounded-full border border-[#FCE7F3]">
                  Active Profile
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {currentUser?.email || 'Registered User'} • ID: {currentUser?.id?.slice(0, 10) || 'Local Account'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-profile-edit-vitals"
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFF1F2] hover:bg-rose-100 text-[#F43F5E] text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Vitals</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700">
          {/* Cloud Sync & Storage Status Banner */}
          <div
            id="modal-cloud-sync-status-card"
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              quotaExceeded
                ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  quotaExceeded ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {quotaExceeded ? <CloudOff className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    {quotaExceeded ? 'Offline-First Storage Mode' : 'Cloud Database Synced'}
                  </h4>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      quotaExceeded ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                  {cloudSyncMessage ||
                    (quotaExceeded
                      ? 'Saved securely in your browser cache. Will auto-sync across devices once daily quota resets.'
                      : 'Your health profile, labs, meals, and habits are synced with Firebase Firestore.')}
                </p>
                {lastCloudSyncTimestamp && (
                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                    Last Cloud Sync: {lastCloudSyncTimestamp}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                id="btn-modal-sync-cloud-now"
                onClick={() => syncWithCloud()}
                disabled={isSyncingWithCloud}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-emerald-800 text-xs font-bold border border-emerald-300 shadow-2xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Synchronize profile data with Cloud Firestore across all devices"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingWithCloud ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
                <span>{isSyncingWithCloud ? 'Syncing...' : 'Sync Now'}</span>
              </button>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-full border ${
                  quotaExceeded
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {quotaExceeded ? 'Device Safe' : 'Cross-Device Ready'}
              </span>
            </div>
          </div>

          {/* Section 1: Physical Demographics & Vitals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#F43F5E]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Personal Demographics & Physical Measurements
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{lifeStage}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Age */}
              <div className="bg-[#FFF5F7]/70 p-3.5 rounded-2xl border border-[#FCE7F3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900">{age !== null ? age : '—'}</span>
                  {age !== null && <span className="text-xs font-semibold text-slate-500">years</span>}
                </div>
                <div className="text-[10px] font-semibold text-[#F43F5E] mt-0.5">
                  {age !== null ? (age < 19 ? 'Pediatric Curve' : 'Adult Cohort') : 'Not entered'}
                </div>
              </div>

              {/* Gender */}
              <div className="bg-[#FFF5F7]/70 p-3.5 rounded-2xl border border-[#FCE7F3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900 capitalize">
                    {demographics.sex || '—'}
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-slate-15 mt-0.5">
                  {demographics.isPregnant
                    ? '🤰 Pregnant'
                    : demographics.isLactating
                    ? '🤱 Lactating'
                    : demographics.sex ? 'Non-Pregnant' : 'Not specified'}
                </div>
              </div>

              {/* Height */}
              <div className="bg-[#FFF5F7]/70 p-3.5 rounded-2xl border border-[#FCE7F3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Height</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900">{heightCm !== null ? heightCm : '—'}</span>
                  {heightCm !== null && <span className="text-xs font-semibold text-slate-500">cm</span>}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  {heightFt !== null && heightIn !== null ? `${heightFt}'${heightIn}" feet` : 'Not entered'}
                </div>
              </div>

              {/* Weight */}
              <div className="bg-[#FFF5F7]/70 p-3.5 rounded-2xl border border-[#FCE7F3]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Weight</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-xl font-extrabold text-slate-900">{weightKg !== null ? weightKg : '—'}</span>
                  {weightKg !== null && <span className="text-xs font-semibold text-slate-500">kg</span>}
                </div>
                <div className="text-[10px] font-semibold text-slate-500 mt-0.5">
                  {weightLbs !== null ? `${weightLbs} lbs` : 'Not entered'}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Calculated Body Mass Index (BMI) & Ideal Standards */}
          <div className="bg-gradient-to-br from-[#FFF5F7] to-white p-4.5 rounded-2xl border border-[#FCE7F3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#F43F5E]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Dual-Engine Calculated BMI & Status
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  !hasCalculatedBmi
                    ? 'bg-slate-100 text-slate-15 border border-slate-200'
                    : bmi.category === 'Normal weight'
                    ? 'bg-emerald-100 text-emerald-20 border border-emerald-200'
                    : bmi.category === 'Underweight'
                    ? 'bg-amber-100 text-amber-20 border border-amber-200'
                    : 'bg-rose-100 text-rose-20 border border-rose-200'
                }`}
              >
                {hasCalculatedBmi ? (bmi.asianIndianCategory || bmi.category) : 'Pending Vitals'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Computed BMI Score</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {hasCalculatedBmi ? bmi.bmi : '—'} {hasCalculatedBmi && <span className="text-xs font-normal text-slate-400">kg/m²</span>}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Asian-Indian Cutoff: 18.5 - 22.9 kg/m²
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Healthy Target Weight</div>
                <div className="text-lg font-black text-emerald-700 mt-0.5">
                  {minHealthyWeight && maxHealthyWeight ? `${minHealthyWeight} - ${maxHealthyWeight}` : '—'}{' '}
                  {minHealthyWeight && <span className="text-xs font-normal text-slate-400">kg</span>}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {heightCm ? `Based on height of ${heightCm} cm` : 'Requires height'}
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Anemia Hb Cutoff</div>
                <div className="text-lg font-black text-rose-700 mt-0.5">
                  {demographics.isPregnant ? '11.0' : '12.0'} <span className="text-xs font-normal text-slate-400">g/dL</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Current Lab Hb: {labs.hemoglobin ? `${labs.hemoglobin} g/dL` : 'Not recorded'}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-15 bg-white/70 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
              {hasCalculatedBmi
                ? (bmi.interpretation || 'Your BMI is within normal bounds. Regular iron-rich nutrition supports optimal blood volume and energetic vitality.')
                : 'Enter your height and weight via "Edit Vitals" to calculate your precise BMI and personalized healthy weight target.'}
            </p>
          </div>

          {/* Section 3: Personalized ICMR-NIN 2020 RDA Daily Requirements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#F43F5E]" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Personalized Daily Micronutrient Targets (ICMR-NIN 2020)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                {icmrProfile.cohortName}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* 1. Daily Iron */}
              <div className="bg-white p-3 rounded-xl border border-rose-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700">1. Daily Iron</span>
                  <Droplets className="w-3.5 h-3.5 text-[#F43F5E]" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.ironMg} <span className="text-xs font-normal text-slate-400">mg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">EAR: {icmrBaseline.ironEarMg || 15} mg/d</div>
              </div>

              {/* 2. Vit B12 */}
              <div className="bg-white p-3 rounded-xl border border-violet-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700">2. Vit B12</span>
                  <Zap className="w-3.5 h-3.5 text-violet-15" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.b12Mcg} <span className="text-xs font-normal text-slate-400">µg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">Nerve & blood health</div>
              </div>

              {/* 3. Folate (B9) */}
              <div className="bg-white p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">3. Folate (B9)</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-15" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.folateMcg} <span className="text-xs font-normal text-slate-400">µg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">Cell & RBC synthesis</div>
              </div>

              {/* 4. Vitamin C */}
              <div className="bg-white p-3 rounded-xl border border-amber-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">4. Vitamin C</span>
                  <Activity className="w-3.5 h-3.5 text-amber-15" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.vitaminCMg || 65} <span className="text-xs font-normal text-slate-400">mg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">Iron bio-enhancer</div>
              </div>

              {/* 5. Vitamin D3 */}
              <div className="bg-white p-3 rounded-xl border border-orange-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-700">5. Vitamin D3</span>
                  <Sun className="w-3.5 h-3.5 text-orange-15" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.vitaminDMcg || 15} <span className="text-xs font-normal text-slate-400">µg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">Immunity & bone density</div>
              </div>

              {/* 6. Calcium */}
              <div className="bg-white p-3 rounded-xl border border-sky-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">6. Calcium</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-15" />
                </div>
                <div className="text-lg font-black text-slate-900 mt-1">
                  {icmrBaseline.calciumMg || 1000} <span className="text-xs font-normal text-slate-400">mg/day</span>
                </div>
                <div className="text-[10px] text-slate-500">Take 2h apart from iron</div>
              </div>
            </div>
          </div>

          {/* Section 4: Current Biomarkers Quick Snapshot */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Recorded Blood Biomarkers Snapshot</span>
              <span className="text-[10px] text-slate-500">
                Updated: {labs.hemoglobin || labs.serumFerritin || labs.vitaminD || labs.vitaminB12 || labs.folateB9 ? (labs.dateRecorded || '') : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                Hemoglobin: <strong className="text-rose-700">{labs.hemoglobin ? `${labs.hemoglobin} g/dL` : 'Not recorded'}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                Ferritin: <strong className="text-amber-700">{labs.serumFerritin ? `${labs.serumFerritin} ng/mL` : 'Not recorded'}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                Vit B12: <strong className="text-violet-700">{labs.vitaminB12 ? `${labs.vitaminB12} pg/mL` : 'Not recorded'}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
                Vit D: <strong className="text-amber-700">{labs.vitaminD ? `${labs.vitaminD} ng/mL` : 'Not recorded'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="btn-modal-profile-signout"
            onClick={async () => {
              onClose();
              await logoutUser();
            }}
            className="text-xs font-bold text-slate-500 hover:text-rose-15 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
            title="Sign Out of Maguva"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out Account</span>
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              id="btn-repair-profile-cache"
              onClick={async () => {
                if (window.confirm("Are you sure you want to reset and clear your profile cache? This will restore your account demographics, habits, and blood tests to clean defaults, erasing any legacy cross-account contamination from old sessions.")) {
                  if (!currentUser?.id) return;
                  
                  // Clear local storage profile cache for active user
                  window.localStorage.removeItem(`maguva_profile_${currentUser.id}`);
                  
                  // Reset store state
                  const store = useHealthStore.getState();
                  store.resetAllData();
                  store.resetToBlankProfile();
                  
                  const fallbackName = currentUser.name || '';
                  const fallbackAge = currentUser.age || undefined;
                  
                  store.updateDemographics({
                    name: fallbackName,
                    age: fallbackAge,
                  });
                  store.setSessionHydrated(true);

                  const freshStore = useHealthStore.getState();
                  const freshProfile = {
                    demographics: freshStore.demographics,
                    menstrual: freshStore.menstrual,
                    lifestyle: freshStore.lifestyle,
                    gut: freshStore.gut,
                    labs: freshStore.labs,
                    severeSymptoms: freshStore.severeSymptoms,
                    selectedSymptoms: freshStore.selectedSymptoms,
                    ayushRemedies: freshStore.ayushRemedies,
                    remedyReviews: freshStore.remedyReviews,
                    dailyHabits: freshStore.dailyHabits,
                    meals: freshStore.meals,
                    chatMessages: freshStore.chatMessages,
                    consentAccepted: freshStore.consentAccepted,
                    isProfileCompleted: false,
                    activeStage: 1 as any,
                    healthTimeline: freshStore.healthTimeline,
                  };
                  
                  window.localStorage.setItem(`maguva_profile_${currentUser.id}`, JSON.stringify(freshProfile));
                  
                  try {
                    const isQuotaExceeded =
                      (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
                      useHealthStore.getState().quotaExceeded;
                    if (!isQuotaExceeded) {
                      const userDocRef = doc(db, 'users', currentUser.id);
                      await setDoc(userDocRef, freshProfile, { merge: false });
                    }
                    alert("Account cache successfully repaired and reset to clean defaults.");
                    onClose();
                  } catch (err: any) {
                    const errMsg = String(err?.message || '').toLowerCase();
                    if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || err?.code === 'resource-exhausted') {
                      useHealthStore.getState().setQuotaExceeded(true);
                    }
                    console.error('[Manual Repair Error]', err);
                    alert("Local cache was reset successfully, but could not overwrite cloud document.");
                    onClose();
                  }
                }
              }}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 transition-all cursor-pointer"
              title="Fix legacy cross-account data leaks"
            >
              Repair Contaminated Cache
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              Update Measurements
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
