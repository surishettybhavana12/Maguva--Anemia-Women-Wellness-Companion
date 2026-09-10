import {
  Demographics,
  MenstrualHealth,
  LifestyleMetabolic,
  GutHealth,
  LabDataPanel,
  SevereSymptoms,
  HealthRecordEntry,
  CareStage,
} from '../types';

export const ACTIVE_SESSION_KEY = 'active_session_user_id';

export const BLANK_DEMOGRAPHICS: Demographics = {
  name: '',
  age: undefined,
  heightCm: undefined,
  weightKg: undefined,
  sex: '' as any,
  isPregnant: false,
  isLactating: false,
  pregnancyTrimester: undefined,
};

export const BLANK_MENSTRUAL: MenstrualHealth = {
  flowIntensity: '' as any,
  crampSeverity: '' as any,
  cycleRegularity: '' as any,
  cycleLengthDays: undefined,
  bleedingDays: undefined,
  hasDysmenorrhea: false,
  hasSpotting: false,
  recentChanges: '',
};

export const BLANK_LIFESTYLE: LifestyleMetabolic = {
  sleepHours: undefined,
  sleepQuality: '' as any,
  stressScore: undefined,
  anxietyScore: undefined,
  activityLevel: '' as any,
  dailyWaterLitres: undefined,
};

export const BLANK_GUT: GutHealth = {
  hasGas: false,
  hasAcidity: false,
  hasBloating: false,
  hasConstipation: false,
  hasDiarrhea: false,
  hasIBS: false,
  hasIndigestion: false,
  frequentAntacidUse: false,
  hPyloriHistory: false,
  teaCoffeeWithMeals: false,
  userToleranceNotes: '',
};

export const BLANK_LABS: LabDataPanel = {
  customBloodTests: [],
  skippedTests: [],
  dateRecorded: '',
};

export const BLANK_SEVERE_SYMPTOMS: SevereSymptoms = {
  severeBreathlessness: false,
  chestPain: false,
  faintingOrSyncope: false,
  extremeFatigueImmobile: false,
};

/**
 * Calculates a mathematical score representing how complete/rich a profile is.
 * Used to intelligently resolve cross-device sync conflicts and prevent blank overwrite wipes.
 */
export const getProfileCompletenessScore = (data: any): number => {
  if (!data) return 0;
  let score = 0;
  if (data.isProfileCompleted) score += 100;
  if (data.consentAccepted) score += 10;

  const demo = data.demographics || {};
  if (demo.heightCm || data.heightCm) score += 20;
  if (demo.weightKg || data.weightKg) score += 20;
  if (demo.age !== undefined && demo.age !== null) score += 15;
  if (demo.name || data.name) score += 5;

  if (Array.isArray(data.selectedSymptoms)) score += data.selectedSymptoms.length * 10;
  if (Array.isArray(data.meals)) score += data.meals.length * 10;
  if (Array.isArray(data.dailyHabits)) score += data.dailyHabits.length * 5;
  if (Array.isArray(data.ayushRemedies)) score += data.ayushRemedies.length * 5;
  if (Array.isArray(data.healthTimeline)) score += data.healthTimeline.length * 5;

  const labs = data.labs || {};
  ['hemoglobin', 'serumFerritin', 'vitaminB12', 'vitaminD', 'serumIron', 'tibc'].forEach((k) => {
    if (labs[k] !== undefined && labs[k] !== null && labs[k] !== '') score += 10;
  });

  return score;
};

/**
 * Deterministic serialization of persistent user profile data.
 * EXCLUDES volatile runtime properties (isAiThinking, isHydrating, isAuthLoading,
 * quotaExceeded, activeTab, UI dialogs, and Date/timestamp values) to ensure true isDirty checking.
 */
export const getProfileDataSnapshot = (state: {
  demographics?: any;
  menstrual?: any;
  lifestyle?: any;
  gut?: any;
  labs?: any;
  severeSymptoms?: any;
  selectedSymptoms?: any;
  ayushRemedies?: any;
  remedyReviews?: any;
  dailyHabits?: any;
  meals?: any;
  chatMessages?: any;
  consentAccepted?: any;
  isProfileCompleted?: any;
  activeStage?: any;
  healthTimeline?: any;
}): string => {
  return JSON.stringify({
    demographics: state.demographics || null,
    menstrual: state.menstrual || null,
    lifestyle: state.lifestyle || null,
    gut: state.gut || null,
    labs: state.labs || null,
    severeSymptoms: state.severeSymptoms || null,
    selectedSymptoms: state.selectedSymptoms || [],
    ayushRemedies: state.ayushRemedies || [],
    remedyReviews: state.remedyReviews || [],
    dailyHabits: state.dailyHabits || [],
    meals: state.meals || [],
    chatMessages: state.chatMessages || [],
    consentAccepted: Boolean(state.consentAccepted),
    isProfileCompleted: Boolean(state.isProfileCompleted),
    activeStage: state.activeStage || 1,
    healthTimeline: state.healthTimeline || [],
  });
};

/**
 * Normalizes raw data from either Firestore, localStorage, or memory into the full clinical profile structure.
 * Includes automatic vital recovery from historical health timeline snapshots if demographics fields are blank.
 */
export const buildRestoredProfile = (
  data: any,
  fallbackName?: string,
  fallbackAge?: number,
  userId?: string
) => {
  const timeline: HealthRecordEntry[] = Array.isArray(data?.healthTimeline) ? data.healthTimeline : [];

  const targetId = userId || data?.id || data?.uid;
  const hasSessionConsent =
    Boolean(data?.consentAccepted) ||
    Boolean(data?.profile?.consentAccepted) ||
    (typeof window !== 'undefined' &&
      ((window.sessionStorage && targetId && window.sessionStorage.getItem(`maguva_consent_accepted_${targetId}`) === 'true') ||
       (window.localStorage && targetId && window.localStorage.getItem(`maguva_consent_accepted_${targetId}`) === 'true')));

  // Recover historical vitals from timeline if missing in direct demographics
  const latestVitalsEntry = [...timeline].reverse().find(
    (e: any) => (e?.heightCm && Number(e.heightCm) > 0) || (e?.weightKg && Number(e.weightKg) > 0)
  );

  const rawDemo = data?.demographics || {};
  const heightVal = rawDemo.heightCm ?? data?.heightCm ?? latestVitalsEntry?.heightCm;
  const weightVal = rawDemo.weightKg ?? data?.weightKg ?? latestVitalsEntry?.weightKg;
  const ageVal = rawDemo.age ?? data?.age ?? fallbackAge;
  const sexVal = rawDemo.sex || data?.gender || data?.sex || '';

  const heightCm = heightVal !== undefined && heightVal !== null && Number(heightVal) > 0 ? Number(heightVal) : undefined;
  const weightKg = weightVal !== undefined && weightVal !== null && Number(weightVal) > 0 ? Number(weightVal) : undefined;
  const age = ageVal !== undefined && ageVal !== null && Number(ageVal) > 0 ? Number(ageVal) : undefined;

  // Recover labs from timeline if missing
  const rawLabs = data?.labs || {};
  const latestLabsEntry = [...timeline].reverse().find(
    (e: any) => e?.hemoglobin || e?.serumFerritin || e?.vitaminB12 || e?.vitaminD
  );

  const isCompleted = Boolean(data?.isProfileCompleted || (heightCm && weightKg));

  return {
    demographics: {
      ...BLANK_DEMOGRAPHICS,
      ...rawDemo,
      name: rawDemo.name || data?.name || fallbackName || '',
      age,
      heightCm,
      weightKg,
      sex: sexVal,
      isPregnant: Boolean(rawDemo.isPregnant ?? data?.isPregnant),
      isLactating: Boolean(rawDemo.isLactating ?? data?.isLactating),
      pregnancyTrimester: rawDemo.pregnancyTrimester ?? data?.pregnancyTrimester,
    },
    menstrual: data?.menstrual || { ...BLANK_MENSTRUAL },
    lifestyle: data?.lifestyle || { ...BLANK_LIFESTYLE },
    gut: data?.gut || { ...BLANK_GUT },
    labs: {
      ...BLANK_LABS,
      ...rawLabs,
      hemoglobin: rawLabs.hemoglobin ?? latestLabsEntry?.hemoglobin ?? undefined,
      serumFerritin: rawLabs.serumFerritin ?? latestLabsEntry?.serumFerritin ?? undefined,
      serumIron: rawLabs.serumIron ?? latestLabsEntry?.serumIron ?? undefined,
      tibc: rawLabs.tibc ?? latestLabsEntry?.tibc ?? undefined,
      transferrinSaturation: rawLabs.transferrinSaturation ?? latestLabsEntry?.transferrinSaturation ?? undefined,
      vitaminB12: rawLabs.vitaminB12 ?? latestLabsEntry?.vitaminB12 ?? undefined,
      vitaminD: rawLabs.vitaminD ?? latestLabsEntry?.vitaminD ?? undefined,
      folateB9: rawLabs.folateB9 ?? latestLabsEntry?.folateB9 ?? undefined,
      vitaminC: rawLabs.vitaminC ?? latestLabsEntry?.vitaminC ?? undefined,
    },
    severeSymptoms: data?.severeSymptoms || { ...BLANK_SEVERE_SYMPTOMS },
    selectedSymptoms: Array.isArray(data?.selectedSymptoms) ? data.selectedSymptoms : [],
    ayushRemedies: Array.isArray(data?.ayushRemedies) ? data.ayushRemedies : [],
    remedyReviews: Array.isArray(data?.remedyReviews) ? data.remedyReviews : [],
    dailyHabits: Array.isArray(data?.dailyHabits) ? data.dailyHabits : [],
    meals: Array.isArray(data?.meals) ? data.meals : [],
    chatMessages: Array.isArray(data?.chatMessages) ? data.chatMessages : [],
    consentAccepted: Boolean(hasSessionConsent),
    isProfileCompleted: isCompleted,
    activeStage: ((data?.activeStage as any) ?? 1) as CareStage,
    healthTimeline: timeline,
  };
};

/**
 * Creates clean blank defaults with initial demographic identification.
 */
export const createFreshProfile = (
  fallbackName?: string,
  fallbackAge?: number
) => {
  return {
    demographics: {
      ...BLANK_DEMOGRAPHICS,
      name: fallbackName || '',
      age: fallbackAge ?? undefined,
    },
    menstrual: { ...BLANK_MENSTRUAL },
    lifestyle: { ...BLANK_LIFESTYLE },
    gut: { ...BLANK_GUT },
    labs: { ...BLANK_LABS },
    severeSymptoms: { ...BLANK_SEVERE_SYMPTOMS },
    selectedSymptoms: [],
    ayushRemedies: [],
    remedyReviews: [],
    dailyHabits: [],
    meals: [],
    chatMessages: [],
    consentAccepted: false,
    isProfileCompleted: false,
    activeStage: 1 as CareStage,
    healthTimeline: [],
  };
};

/**
 * Retrieves the best local profile cached for a user, checking both primary and backup keys.
 */
export const getBestLocalProfile = (userId: string): { profile: any | null; score: number } => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { profile: null, score: 0 };
  }

  let bestData: any = null;
  let bestScore = 0;

  const primaryKey = `maguva_profile_${userId}`;
  const backupKey = `maguva_profile_backup_${userId}`;

  [primaryKey, backupKey].forEach((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const score = getProfileCompletenessScore(parsed);
        if (score > bestScore) {
          bestScore = score;
          bestData = parsed;
        }
      }
    } catch {}
  });

  return { profile: bestData, score: bestScore };
};

/**
 * Persists profile to localStorage with a dual-key backup mechanism.
 */
export const saveProfileLocally = (userId: string, data: any): void => {
  if (typeof window === 'undefined' || !window.localStorage || !userId) return;

  try {
    const raw = JSON.stringify(data);
    window.localStorage.setItem(`maguva_profile_${userId}`, raw);

    const score = getProfileCompletenessScore(data);
    if (score >= 15) {
      window.localStorage.setItem(`maguva_profile_backup_${userId}`, raw);
    }
  } catch (err) {
    console.warn('[Profile Persistence] LocalStorage write error:', err);
  }
};
