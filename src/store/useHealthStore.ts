import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Demographics,
  MenstrualHealth,
  LifestyleMetabolic,
  GutHealth,
  LabDataPanel,
  SevereSymptoms,
  AyushRemedy,
  RemedyReview,
  DailyHabit,
  MealItem,
  ChatMessage,
  CareStage,
  BmiResult,
  DeficiencyRisk,
  AppTab,
  UserAccount,
  HealthRecordEntry,
} from '../types';
import {
  BLANK_DEMOGRAPHICS,
  BLANK_MENSTRUAL,
  BLANK_LIFESTYLE,
  BLANK_GUT,
  BLANK_LABS,
  BLANK_SEVERE_SYMPTOMS,
  buildRestoredProfile,
  createFreshProfile,
  getBestLocalProfile,
} from '../utils/profilePersistence';
import { INITIAL_AYUSH_REMEDIES } from '../data/ayushRemedies';
import { INITIAL_REMEDY_REVIEWS } from '../data/ayushReviewsData';
import { INITIAL_DEFAULT_MEALS } from '../data/foodDatabase';
import { SAMPLE_PROFILES } from '../data/sampleProfiles';
import { calculateDualEngineBmi } from '../data/whoLmsData';
import { calculateAllDeficiencyRisks } from '../utils/riskEngine';
import {
  saveFoodsToIndexedDB,
  loadFoodsFromIndexedDB,
  clearFoodsFromIndexedDB,
} from '../utils/indexedDbFoodStorage';
import { markFirestoreQuotaExceeded, enableNetwork, db } from '../lib/firebase';
import { saveUserProfileToFirestore } from '../services/authService';

export { type AppTab } from '../types';

const INITIAL_USERS: UserAccount[] = [];

// Debounced cloud sync helper to protect write quotas
let syncTimeout: any = null;
export function syncToCloudDebounced() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    try {
      const activeUserStr =
        localStorage.getItem('maguva_active_session_user') ||
        localStorage.getItem('maguva_active_user') ||
        localStorage.getItem('maguva_current_user_email');
      let userId: string | null = null;
      if (activeUserStr) {
        try {
          const parsed = JSON.parse(activeUserStr);
          userId = parsed.id || parsed.uid || (typeof parsed === 'string' ? parsed : null);
        } catch {
          userId = activeUserStr;
        }
      }
      if (!userId) {
        const currentUser = useHealthStore.getState().currentUser;
        userId = currentUser?.id || (currentUser as any)?.uid || null;
      }
      if (userId) {
        const state = useHealthStore.getState();
        if (state.isHydrating || !state.isSessionHydrated) return;
        saveUserProfileToFirestore(userId, {
          ...state.profile,
          profile: state.profile,
          consentAccepted: state.consentAccepted,
          symptomLogs: state.symptomLogs || [],
          mealLogs: state.mealLogs || [],
          waterIntakeLogs: state.waterIntakeLogs || [],
          completedRemedies: state.completedRemedies || [],
          bloodPressureLogs: state.bloodPressureLogs || [],
          onboardingCompleted: state.onboardingCompleted ?? true,
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (e) {
      // Guard against parsing errors
    }
  }, 1200);
}

interface HealthState {
  // Auth state
  currentUser: UserAccount | null;
  registeredUsers: UserAccount[];
  isAuthenticated: boolean;
  isSessionHydrated: boolean;
  isHydrating: boolean;
  isAuthLoading: boolean;

  consentAccepted: boolean;
  hasAcceptedDisclaimer: boolean;
  isProfileCompleted: boolean;
  isProfileModalOpen: boolean;
  isUserProfileModalOpen: boolean;
  activeStage: CareStage;
  activeTab: AppTab;
  mealEntryMode: 'wifs' | 'library' | 'custom' | 'ayush';
  
  demographics: Demographics;
  menstrual: MenstrualHealth;
  lifestyle: LifestyleMetabolic;
  gut: GutHealth;
  labs: LabDataPanel;
  severeSymptoms: SevereSymptoms;
  selectedSymptoms: string[];
  
  ayushRemedies: AyushRemedy[];
  remedyReviews: RemedyReview[];
  dailyHabits: DailyHabit[];
  meals: MealItem[];
  customImportedFoods: import('../data/foodDatabase').CuratedFood[];
  healthTimeline: HealthRecordEntry[];
  chatMessages: ChatMessage[];
  isAiThinking: boolean;
  quotaExceeded: boolean;
  isSyncingWithCloud: boolean;
  lastCloudSyncTimestamp: string | null;
  cloudSyncMessage: string | null;

  symptomLogs: any[];
  mealLogs: any[];
  waterIntakeLogs: any[];
  completedRemedies: any[];
  bloodPressureLogs: any[];
  onboardingCompleted: boolean;
  profile: any;

  // Actions
  setSymptomLogs: (logs: any[]) => void;
  addSymptomLog: (log: any) => void;
  setMealLogs: (logs: any[]) => void;
  addMealLog: (log: any) => void;
  setWaterIntakeLogs: (logs: any[]) => void;
  setCompletedRemedies: (remedies: any[]) => void;
  toggleCompletedRemedy: (remedyId: string) => void;
  setBloodPressureLogs: (logs: any[]) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  updateProfile: (profileExtract: any) => void;
  setSessionHydrated: (hydrated: boolean) => void;
  setIsHydrating: (hydrating: boolean) => void;
  setIsAuthLoading: (loading: boolean) => void;
  setIsSyncingWithCloud: (syncing: boolean) => void;
  setLastCloudSyncTimestamp: (timestamp: string | null) => void;
  setCloudSyncMessage: (message: string | null) => void;
  setUserAccount: (user: UserAccount | null) => void;
  registerOrSyncUser: (user: UserAccount) => void;
  checkUserExists: (email: string) => boolean;
  signIn: (email: string, password: string) => { success: boolean; error?: string };
  signUp: (name: string, email: string, password: string, age?: number) => { success: boolean; error?: string };
  signOut: () => void;
  resetPassword: (email: string, newPassword: string) => { success: boolean; error?: string };
  updateUserPassword: (email: string, newPassword: string) => { success: boolean; error?: string };

  acceptConsent: () => void;
  setHasAcceptedDisclaimer: (accepted: boolean) => void;
  setProfileCompleted: (completed: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setIsUserProfileModalOpen: (open: boolean) => void;
  setActiveStage: (stage: CareStage) => void;
  setActiveTab: (tab: AppTab) => void;
  setMealEntryMode: (mode: 'wifs' | 'library' | 'custom' | 'ayush') => void;
  
  updateDemographics: (partial: Partial<Demographics>) => void;
  updateMenstrual: (partial: Partial<MenstrualHealth>) => void;
  updateLifestyle: (partial: Partial<LifestyleMetabolic>) => void;
  updateGut: (partial: Partial<GutHealth>) => void;
  updateLabs: (partial: Partial<LabDataPanel>) => void;
  skipLabTest: (key: keyof LabDataPanel) => void;
  unskipLabTest: (key: keyof LabDataPanel) => void;
  skipAllLabTests: () => void;
  restoreAllLabTests: () => void;
  addCustomBloodTest: (test: Omit<import('../types').CustomBloodTest, 'id'>) => void;
  removeCustomBloodTest: (id: string) => void;
  deleteStandardBloodTest: (key: keyof LabDataPanel) => void;
  updateSevereSymptoms: (partial: Partial<SevereSymptoms>) => void;
  updateSelectedSymptoms: (symptoms: string[]) => void;
  append_user_symptoms: (symptoms: string[]) => void;
  appendUserSymptoms: (symptoms: string[]) => void;
  removeSymptoms: (symptoms: string[]) => void;
  clearLabs: (keys: (keyof LabDataPanel | string)[]) => void;
  toggleSymptom: (id: string) => void;
  
  addHealthRecordEntry: (entry: Omit<HealthRecordEntry, 'id'>) => void;
  removeHealthRecordEntry: (id: string) => void;

  loadSampleProfile: (profileId: string) => void;
  rateAyushRemedy: (id: string, rating: number) => void;
  removeAyushRemedy: (id: string) => void;
  updateAyushNotes: (id: string, notes: string) => void;
  addAyushToHabits: (id: string) => void;
  addRemedyReview: (review: Omit<RemedyReview, 'id' | 'createdAt'>) => void;
  voteReviewHelpful: (reviewId: string) => void;
  deleteRemedyReview: (reviewId: string) => void;
  
  addHabit: (habit: Omit<DailyHabit, 'id' | 'completed'>) => void;
  toggleHabit: (id: string) => void;
  removeHabit: (id: string) => void;
  removeHabits: (titlesOrIds: string[]) => void;
  clearAllHabits: () => void;
  clearCompletedHabits: () => void;
  checkAllHabits: () => void;
  
  addMeal: (meal: Omit<MealItem, 'id' | 'timestamp'>) => void;
  removeMeal: (id: string) => void;
  removeMeals: (namesOrIds: string[]) => void;
  addCustomImportedFoods: (foods: import('../data/foodDatabase').CuratedFood[], overwrite?: boolean) => Promise<void>;
  clearCustomImportedFoods: () => Promise<void>;
  loadImportedFoodsFromStorage: () => Promise<void>;
  
  addChatMessage: (msg: ChatMessage) => void;
  setAiThinking: (thinking: boolean) => void;
  setQuotaExceeded: (exceeded: boolean) => void;
  clearChat: () => void;
  resetAllData: () => void;
  resetToBlankProfile: () => void;

  // Selectors / Helpers
  getBmiResult: () => BmiResult;
  getDeficiencyRisks: () => DeficiencyRisk[];
  isTriageTriggered: () => boolean;
  getDailyTotals: () => {
    ironMg: number;
    b12Mcg: number;
    folateMcg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
    calciumMg: number;
    calories: number;
  };
}

export {
  BLANK_DEMOGRAPHICS,
  BLANK_MENSTRUAL,
  BLANK_LIFESTYLE,
  BLANK_GUT,
  BLANK_LABS,
  BLANK_SEVERE_SYMPTOMS,
};

const INITIAL_HABITS: DailyHabit[] = [
  {
    id: 'habit-1',
    title: 'Warm Lemon Water with Amla Juice',
    category: 'Gut Optimization',
    description: '15ml amla juice in 100ml warm water before breakfast to prime gastric acidity for non-heme iron reduction.',
    timing: 'Morning (Empty Stomach)',
    completed: true,
  },
  {
    id: 'habit-2',
    title: 'Chai / Coffee Separation Buffer',
    category: 'Iron Synergy',
    description: 'Keep minimum 2-hour interval between tea/coffee and main meals to prevent polyphenol tannin chelation.',
    timing: 'Lunch & Dinner Windows',
    completed: false,
  },
  {
    id: 'habit-3',
    title: 'Soaked Garden Cress (Halim) & Dates',
    category: 'AYUSH Rasayana',
    description: '1/2 tsp soaked halim seeds in almond milk with 2 black dry dates.',
    timing: 'Evening Snack (4:30 PM)',
    completed: false,
  },
  {
    id: 'habit-4',
    title: 'Morning Sun Exposure (20 mins)',
    category: 'Lifestyle',
    description: 'Natural UVB synthesis between 8:00 AM - 10:00 AM for Cholecalciferol activation.',
    timing: 'Morning (08:30 AM)',
    completed: true,
  },
];

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-msg',
    sender: 'agent',
    text: `### 🌸 Namaste & Welcome to Maguva AI!\n\nI am your **Clinical Lifestyle & Nutritional Health Companion**. How can I assist you today? Please choose from the core categories below, or type your specific health question:\n\n**[1] Profile & Demographics** (Height, Weight, Age, Gender, Pregnancy Status)\n**[2] Symptoms & Signals** (Fatigue, Hair Fall, Palpitations, Brain Fog, Pica)\n**[3] Blood Reports & Labs** (Hemoglobin, Serum Ferritin, B12, Vitamin D, MCV)\n**[4] Meals & Food Journal** (Log meals, Indian food composition, custom dishes)\n**[5] AYUSH & Other Traditional Remedies** (Ayurvedic Rasayanas, herbal formulations, traditional remedies)\n**[6] Deficiency Risks & Guidance** (Anemia risk, duodenal absorption cofactors)\n**[7] Other** (General questions, custom recipes, health queries)\n**[8] Daily Habits** (View, add, or remove daily habits & routines)\n\n*Click any option above or reply with a number [1–8].*`,
    timestamp: 'Just now',
    citations: [
      {
        category: 'Data From Your Profile',
        content: 'Profile loaded: Hemoglobin 9.2 g/dL, Serum Ferritin 8.0 ng/mL, Heavy menstrual flow pattern.',
      },
      {
        category: 'Government of India Medical Guidelines',
        content: 'ICMR-NIN 2020: Target Iron RDA for adult Indian women is 29 mg/day with Vitamin C synergy.',
      },
    ],
  },
];

const INITIAL_HEALTH_TIMELINE: HealthRecordEntry[] = [
  {
    id: 'rec-init-baseline',
    date: '2026-06-01',
    title: 'Baseline Diagnostic Panel',
    notes: 'Initial clinical evaluation for severe chronic fatigue, pallor, and heavy menstrual cycles.',
    source: 'Apollo Diagnostic Lab',
    heightCm: 162,
    weightKg: 53.5,
    bmi: 20.4,
    hemoglobin: 8.8,
    serumFerritin: 6.5,
    serumIron: 32.0,
    tibc: 480.0,
    transferrinSaturation: 6.7,
    vitaminB12: 210.0,
    vitaminD: 18.0,
    folateB9: 4.2,
    vitaminC: 0.6,
    medicationsOrSupplements: ['Oral Ferrous Ascorbate 100mg (Started)'],
    dietaryPlanAdherence: 'Starting',
    ayushRemediesUsed: ['Warm Amla Water in Morning'],
    energyScore: 4,
  },
  {
    id: 'rec-followup-1',
    date: '2026-07-15',
    title: 'Mid-Course Progress Check (6 Weeks of Diet & Iron)',
    notes: 'Adhering to high-iron meals, tannin spacing buffer, and daily halim seed dates snack. Fatigue noticeably decreased.',
    source: 'Metropolis Healthcare',
    heightCm: 162,
    weightKg: 54.0,
    bmi: 20.6,
    hemoglobin: 9.6,
    serumFerritin: 11.2,
    serumIron: 46.0,
    tibc: 430.0,
    transferrinSaturation: 10.7,
    vitaminB12: 245.0,
    vitaminD: 24.0,
    folateB9: 6.0,
    vitaminC: 0.9,
    medicationsOrSupplements: ['Ferrous Ascorbate 100mg', 'Vitamin C 500mg'],
    dietaryPlanAdherence: 'Strict',
    ayushRemediesUsed: ['Amla Juice', 'Halim Seeds with Dates', 'Draksharishta'],
    energyScore: 7,
  },
  {
    id: 'rec-latest-current',
    date: '2026-08-10',
    title: 'Latest Health Vector Record',
    notes: 'Current active benchmark on Maguva. Sustained energy improvement, no breathlessness on mild exertion.',
    source: 'Maguva Wellness Profile',
    heightCm: 162,
    weightKg: 54.0,
    bmi: 20.6,
    hemoglobin: 10.2,
    serumFerritin: 14.5,
    serumIron: 54.0,
    tibc: 405.0,
    transferrinSaturation: 13.3,
    vitaminB12: 280.0,
    vitaminD: 28.0,
    folateB9: 7.5,
    vitaminC: 1.1,
    medicationsOrSupplements: ['Ferrous Ascorbate 100mg Alternate Days'],
    dietaryPlanAdherence: 'Strict',
    ayushRemediesUsed: ['Moringa Soup', 'Amla Rasayana', 'Halim Laddoo'],
    energyScore: 8,
  },
];

export const useHealthStore = create<HealthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      registeredUsers: INITIAL_USERS,
      isAuthenticated: false,
      isSessionHydrated: true,

      consentAccepted: typeof window !== 'undefined' ? localStorage.getItem('maguva_disclaimer_accepted') === 'true' : false,
      hasAcceptedDisclaimer: typeof window !== 'undefined' ? localStorage.getItem('maguva_disclaimer_accepted') === 'true' : false,
      isProfileCompleted: false,
      isProfileModalOpen: false,
      isUserProfileModalOpen: false,
      activeStage: 1,
      activeTab: 'dashboard',
      mealEntryMode: 'library',

      demographics: { ...BLANK_DEMOGRAPHICS },
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
      customImportedFoods: [],
      healthTimeline: [],
      chatMessages: [],
      isAiThinking: false,
      quotaExceeded: typeof window !== 'undefined' ? localStorage.getItem('maguva_firestore_quota_exceeded') === 'true' : false,
      isHydrating: false,
      isAuthLoading: true,
      isSyncingWithCloud: false,
      lastCloudSyncTimestamp: null,
      cloudSyncMessage: null,

      symptomLogs: [],
      mealLogs: [],
      waterIntakeLogs: [],
      completedRemedies: [],
      bloodPressureLogs: [],
      onboardingCompleted: false,
      get profile() {
        const state = get();
        return {
          demographics: state.demographics,
          menstrual: state.menstrual,
          lifestyle: state.lifestyle,
          gut: state.gut,
          labs: state.labs,
          severeSymptoms: state.severeSymptoms,
          selectedSymptoms: state.selectedSymptoms,
          ayushRemedies: state.ayushRemedies,
          remedyReviews: state.remedyReviews,
          dailyHabits: state.dailyHabits,
          meals: state.meals,
          chatMessages: state.chatMessages,
          healthTimeline: state.healthTimeline,
          isProfileCompleted: state.isProfileCompleted,
          activeStage: state.activeStage,
        };
      },

      setSymptomLogs: (logs) => {
        set({ symptomLogs: logs });
        syncToCloudDebounced();
      },
      addSymptomLog: (log) => {
        set((state) => ({ symptomLogs: [log, ...(state.symptomLogs || [])] }));
        syncToCloudDebounced();
      },
      setMealLogs: (logs) => {
        set({ mealLogs: logs, meals: logs });
        syncToCloudDebounced();
      },
      addMealLog: (log) => {
        set((state) => ({ mealLogs: [log, ...(state.mealLogs || [])] }));
        syncToCloudDebounced();
      },
      setWaterIntakeLogs: (logs) => {
        set({ waterIntakeLogs: logs });
        syncToCloudDebounced();
      },
      setCompletedRemedies: (remedies) => {
        set({ completedRemedies: remedies });
        syncToCloudDebounced();
      },
      toggleCompletedRemedy: (remedyId) => {
        set((state) => {
          const current = state.completedRemedies || [];
          const updated = current.includes(remedyId)
            ? current.filter((r) => r !== remedyId)
            : [...current, remedyId];
          return { completedRemedies: updated };
        });
        syncToCloudDebounced();
      },
      setBloodPressureLogs: (logs) => {
        set({ bloodPressureLogs: logs });
        syncToCloudDebounced();
      },
      setOnboardingCompleted: (completed) => {
        set({ onboardingCompleted: completed });
        syncToCloudDebounced();
      },

      updateProfile: (profileExtract) => {
        set((state) => ({
          demographics: profileExtract.demographics
            ? { ...state.demographics, ...profileExtract.demographics }
            : state.demographics,
          menstrual: profileExtract.menstrual
            ? { ...state.menstrual, ...profileExtract.menstrual }
            : state.menstrual,
          lifestyle: profileExtract.lifestyle
            ? { ...state.lifestyle, ...profileExtract.lifestyle }
            : state.lifestyle,
          gut: profileExtract.gut
            ? { ...state.gut, ...profileExtract.gut }
            : state.gut,
          labs: profileExtract.labs
            ? { ...state.labs, ...profileExtract.labs }
            : state.labs,
          severeSymptoms: profileExtract.severeSymptoms
            ? { ...state.severeSymptoms, ...profileExtract.severeSymptoms }
            : state.severeSymptoms,
          selectedSymptoms: profileExtract.selectedSymptoms ?? state.selectedSymptoms,
          ayushRemedies: profileExtract.ayushRemedies ?? state.ayushRemedies,
          remedyReviews: profileExtract.remedyReviews ?? state.remedyReviews,
          dailyHabits: profileExtract.dailyHabits ?? state.dailyHabits,
          meals: profileExtract.meals ?? state.meals,
          chatMessages: profileExtract.chatMessages ?? state.chatMessages,
          healthTimeline: profileExtract.healthTimeline ?? state.healthTimeline,
          isProfileCompleted: profileExtract.isProfileCompleted ?? state.isProfileCompleted,
          activeStage: profileExtract.activeStage ?? state.activeStage,
        }));
        syncToCloudDebounced();
      },
      
      setSessionHydrated: (hydrated: boolean) => set({ isSessionHydrated: hydrated }),
      setIsHydrating: (hydrating: boolean) => set({ isHydrating: hydrating }),
      setIsAuthLoading: (loading: boolean) => set({ isAuthLoading: loading }),
      setIsSyncingWithCloud: (syncing: boolean) => set({ isSyncingWithCloud: syncing }),
      setLastCloudSyncTimestamp: (timestamp: string | null) => set({ lastCloudSyncTimestamp: timestamp }),
      setCloudSyncMessage: (message: string | null) => set({ cloudSyncMessage: message }),

      setUserAccount: (user: UserAccount | null) => {
        if (user) {
          set((state) => {
            const isSameUser = state.currentUser?.id === user.id;
            const hasSessionConsent =
              (isSameUser && state.consentAccepted) ||
              (typeof window !== 'undefined' &&
                ((window.sessionStorage && window.sessionStorage.getItem(`maguva_consent_accepted_${user.id}`) === 'true') ||
                 (window.localStorage && window.localStorage.getItem(`maguva_consent_accepted_${user.id}`) === 'true')));

            const existingIndex = state.registeredUsers.findIndex(
              (u) => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id
            );
            let updatedUsers = [...state.registeredUsers];
            if (existingIndex >= 0) {
              updatedUsers[existingIndex] = {
                ...updatedUsers[existingIndex],
                ...user,
                // Preserve stored values
                password: user.password || updatedUsers[existingIndex].password,
                name: user.name || updatedUsers[existingIndex].name,
                age: user.age || updatedUsers[existingIndex].age,
                lastLoginAt: new Date().toISOString(),
              };
            } else {
              updatedUsers = [user, ...updatedUsers];
            }

            // Check if there is an actual user switch (different authenticated user than previously loaded)
            const isActualUserSwitch = Boolean(
              state.currentUser && state.currentUser.id && state.currentUser.id !== user.id
            );

            // Check if current in-memory store already has rich clinical data for this user
            const hasExistingClinicalData = Boolean(
              !isActualUserSwitch && (
                state.isProfileCompleted ||
                (state.demographics?.heightCm && state.demographics.heightCm > 0) ||
                (state.demographics?.weightKg && state.demographics.weightKg > 0) ||
                (state.selectedSymptoms && state.selectedSymptoms.length > 0) ||
                (state.meals && state.meals.length > 0)
              )
            );

            // If we already have rich clinical data in memory for this user, DO NOT RESET IT!
            if (hasExistingClinicalData) {
              return {
                registeredUsers: updatedUsers,
                currentUser: user,
                isAuthenticated: true,
                consentAccepted: hasSessionConsent,
                demographics: {
                  ...state.demographics,
                  name: user.name || state.demographics?.name || '',
                  age: user.age || state.demographics?.age || undefined,
                },
              };
            }

            // If user switched or in-memory store is blank, check local storage cache & backup immediately!
            const bestCached = getBestLocalProfile(user.id);
            if (bestCached.profile && bestCached.score > 0) {
              const restoredProfile = buildRestoredProfile(bestCached.profile, user.name, user.age, user.id);
              return {
                registeredUsers: updatedUsers,
                currentUser: user,
                isAuthenticated: true,
                ...restoredProfile,
                consentAccepted: hasSessionConsent,
              };
            }

            // Clean new profile only if no local cache and no existing in-memory profile
            const fresh = createFreshProfile(user.name, user.age);
            return {
              registeredUsers: updatedUsers,
              currentUser: user,
              isAuthenticated: true,
              ...fresh,
              consentAccepted: hasSessionConsent,
            };
          });
        } else {
          set({
            currentUser: null,
            isAuthenticated: false,
            consentAccepted: false,
          });
        }
      },

      registerOrSyncUser: (user: UserAccount) => {
        set((state) => {
          const hasSessionConsent =
            typeof window !== 'undefined' &&
            window.sessionStorage &&
            window.sessionStorage.getItem(`maguva_consent_accepted_${user.id}`) === 'true';

          const cleanEmail = user.email.toLowerCase();
          const existingIndex = state.registeredUsers.findIndex(
            (u) => u.email.toLowerCase() === cleanEmail || u.id === user.id
          );
          let updatedList = [...state.registeredUsers];
          if (existingIndex >= 0) {
            updatedList[existingIndex] = {
              ...updatedList[existingIndex],
              ...user,
              password: user.password || updatedList[existingIndex].password,
            };
          } else {
            updatedList = [user, ...updatedList];
          }

          const isUserSwitch = state.currentUser?.id !== user.id;

          if (isUserSwitch) {
            // SYNCHRONOUS FORCE RESET: Wipes out clinical details of previous user immediately during registerOrSyncUser
            // to prevent intermediate state leakage and race-condition auto-saves.
            return {
              registeredUsers: updatedList,
              currentUser: user,
              isAuthenticated: true,
              consentAccepted: hasSessionConsent,
              isProfileCompleted: false,
              isProfileModalOpen: false,
              isUserProfileModalOpen: false,
              activeStage: 1,
              activeTab: 'dashboard',
              mealEntryMode: 'library',
              demographics: {
                ...BLANK_DEMOGRAPHICS,
                name: user.name || '',
                age: user.age || undefined,
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
              healthTimeline: [],
            };
          }

          return {
            registeredUsers: updatedList,
            currentUser: user,
            isAuthenticated: true,
            consentAccepted: hasSessionConsent,
          };
        });
      },

      checkUserExists: (email: string) => {
        const cleanEmail = email.trim().toLowerCase();
        return get().registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail);
      },

      updateUserPassword: (email: string, newPassword: string) => {
        const cleanEmail = email.trim().toLowerCase();
        if (newPassword.length < 6) {
          return { success: false, error: 'New password must be at least 6 characters.' };
        }

        const users = get().registeredUsers;
        const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);

        if (exists) {
          set((state) => ({
            registeredUsers: state.registeredUsers.map((u) =>
              u.email.toLowerCase() === cleanEmail ? { ...u, password: newPassword } : u
            ),
            currentUser:
              state.currentUser?.email.toLowerCase() === cleanEmail
                ? { ...state.currentUser, password: newPassword }
                : state.currentUser,
          }));
        } else {
          const newUser: UserAccount = {
            id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: cleanEmail.split('@')[0],
            email: cleanEmail,
            password: newPassword,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            avatarColor: 'from-rose-500 to-pink-600',
          };
          set((state) => ({
            registeredUsers: [...state.registeredUsers, newUser],
            currentUser:
              state.currentUser?.email.toLowerCase() === cleanEmail
                ? { ...state.currentUser, password: newPassword }
                : state.currentUser,
          }));
        }
        return { success: true };
      },

      signIn: (email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail.includes('@') || !cleanEmail.endsWith('.com')) {
          return {
            success: false,
            error: "Email must include '@' and end with '.com' (e.g. name@gmail.com).",
          };
        }
        const users = get().registeredUsers;
        const user = users.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.password === password
        );
        if (!user) {
          return {
            success: false,
            error: 'Invalid email or password. Please check your credentials.',
          };
        }

        set((state) => ({
          currentUser: { ...user, lastLoginAt: new Date().toISOString() },
          isAuthenticated: true,
          consentAccepted: false,
          demographics: {
            ...state.demographics,
            name: user?.name || state.demographics?.name || '',
            age: user?.age ?? state.demographics?.age ?? undefined,
          },
        }));
        return { success: true };
      },

      signUp: (name, email, password) => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        if (!cleanEmail || !cleanName || !password) {
          return { success: false, error: 'All fields are required.' };
        }
        if (!cleanEmail.includes('@') || !cleanEmail.endsWith('.com')) {
          return { success: false, error: "Email must include '@' and end with '.com' (e.g. name@gmail.com)." };
        }
        if (password.length < 6) {
          return { success: false, error: 'Password must be at least 6 characters.' };
        }

        const users = get().registeredUsers;
        if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { success: false, error: 'An account with this email already exists.' };
        }

        const newUser: UserAccount = {
          id: `user-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          password: password,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          avatarColor: 'from-rose-500 to-pink-600',
        };

        set((state) => ({
          registeredUsers: [newUser, ...state.registeredUsers],
          currentUser: newUser,
          isAuthenticated: true,
          consentAccepted: false,
          isProfileCompleted: false,
          demographics: {
            ...BLANK_DEMOGRAPHICS,
            name: cleanName,
            age: undefined,
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
          healthTimeline: [],
        }));
        return { success: true };
      },

      signOut: () => {
        set((state) => {
          if (state.currentUser?.id && typeof window !== 'undefined') {
            if (window.sessionStorage) {
              window.sessionStorage.removeItem(`maguva_consent_accepted_${state.currentUser.id}`);
            }
            if (window.localStorage) {
              window.localStorage.removeItem(`maguva_consent_accepted_${state.currentUser.id}`);
            }
          }
          return {
            currentUser: null,
            isAuthenticated: false,
            isSessionHydrated: true,
            consentAccepted: false,
          };
        });
      },

      resetPassword: (email, newPassword) => {
        const cleanEmail = email.trim().toLowerCase();
        const users = get().registeredUsers;
        const exists = users.some((u) => u.email.toLowerCase() === cleanEmail);
        if (!exists) {
          return { success: false, error: 'No account registered with this email address.' };
        }
        if (newPassword.length < 6) {
          return { success: false, error: 'New password must be at least 6 characters.' };
        }

        set((state) => ({
          registeredUsers: state.registeredUsers.map((u) =>
            u.email.toLowerCase() === cleanEmail ? { ...u, password: newPassword } : u
          ),
        }));
        return { success: true };
      },

      setHasAcceptedDisclaimer: (accepted: boolean) => {
        set({ hasAcceptedDisclaimer: accepted, consentAccepted: accepted });
        if (typeof window !== 'undefined') {
          if (accepted) {
            localStorage.setItem('maguva_disclaimer_accepted', 'true');
          }
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            if (accepted) {
              sessionStorage.setItem(`maguva_consent_accepted_${currentUser.id}`, 'true');
              localStorage.setItem(`maguva_consent_accepted_${currentUser.id}`, 'true');
            }
          }
        }
        syncToCloudDebounced();
      },

      acceptConsent: () => {
        set((state) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('maguva_disclaimer_accepted', 'true');
            if (state.currentUser?.id) {
              window.sessionStorage?.setItem(`maguva_consent_accepted_${state.currentUser.id}`, 'true');
              window.localStorage?.setItem(`maguva_consent_accepted_${state.currentUser.id}`, 'true');
            }
          }
          return { consentAccepted: true, hasAcceptedDisclaimer: true };
        });
        syncToCloudDebounced();
      },
      setProfileCompleted: (completed) => set({ isProfileCompleted: completed }),
      setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
      setIsUserProfileModalOpen: (open) => set({ isUserProfileModalOpen: open }),
      setActiveStage: (stage) => set({ activeStage: stage }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setMealEntryMode: (mode) => set({ mealEntryMode: mode }),

      updateDemographics: (partial) => {
        set((state) => ({ demographics: { ...state.demographics, ...partial } }));
        syncToCloudDebounced();
      },

      updateMenstrual: (partial) => {
        set((state) => ({ menstrual: { ...state.menstrual, ...partial } }));
        syncToCloudDebounced();
      },

      updateLifestyle: (partial) => {
        set((state) => ({ lifestyle: { ...state.lifestyle, ...partial } }));
        syncToCloudDebounced();
      },

      updateGut: (partial) => {
        set((state) => ({ gut: { ...state.gut, ...partial } }));
        syncToCloudDebounced();
      },

      updateLabs: (partial) => {
        set((state) => {
          const updated = { ...state.labs };
          for (const [k, v] of Object.entries(partial)) {
            if (v === undefined || v === null || v === '') {
              delete (updated as any)[k];
            } else {
              (updated as any)[k] = v;
            }
          }
          // If a value was entered for a previously skipped test, remove it from skippedTests
          const newSkipped = (state.labs.skippedTests || []).filter(
            (k) => partial[k as keyof LabDataPanel] === undefined
          );
          const newLabs = {
            ...updated,
            skippedTests: newSkipped,
            labStatus: (newSkipped.length > 0 ? 'Partial_Skipped' : 'Verified') as 'Partial_Skipped' | 'Verified',
          };

          // Also sync or upsert today's entry into healthTimeline so the trajectory tracker stays in sync
          const today = new Date().toISOString().split('T')[0];
          const timelineIndex = state.healthTimeline.findIndex((item) => item.date === today);
          let updatedTimeline = [...state.healthTimeline];
          
          if (timelineIndex !== -1) {
            updatedTimeline[timelineIndex] = {
              ...updatedTimeline[timelineIndex],
              ...newLabs,
            };
          } else {
            updatedTimeline = [
              {
                id: `rec-${Date.now()}`,
                date: today,
                title: 'Clinical Lab Biomarker Update',
                source: newLabs.labSource || 'Active Baseline Update',
                ...newLabs,
              },
              ...state.healthTimeline,
            ];
          }

          return {
            labs: newLabs,
            healthTimeline: updatedTimeline,
          };
        });
        syncToCloudDebounced();
      },

      skipLabTest: (key) =>
        set((state) => {
          const newLabs = { ...state.labs };
          // Set to undefined (Never dummy numbers 0, -1, or average)
          delete newLabs[key];
          const currentSkipped = state.labs.skippedTests || [];
          const updatedSkipped = currentSkipped.includes(key as string)
            ? currentSkipped
            : [...currentSkipped, key as string];

          return {
            labs: {
              ...newLabs,
              skippedTests: updatedSkipped,
              labStatus: 'Partial_Skipped',
            },
          };
        }),

      unskipLabTest: (key) =>
        set((state) => {
          const currentSkipped = state.labs.skippedTests || [];
          const updatedSkipped = currentSkipped.filter((k) => k !== (key as string));
          return {
            labs: {
              ...state.labs,
              skippedTests: updatedSkipped,
              labStatus: updatedSkipped.length === 0 ? 'Verified' : 'Partial_Skipped',
            },
          };
        }),

      skipAllLabTests: () =>
        set((state) => {
          return {
            labs: {
              dateRecorded: state.labs.dateRecorded,
              labSource: 'Skipped by User (Symptom-Only Profile)',
              labNotes: 'All blood biomarkers excluded; 100% calculation weight shifted to symptoms & demographics.',
              skippedTests: [
                'hemoglobin',
                'rbc',
                'hematocrit',
                'mcv',
                'mch',
                'mchc',
                'rdw',
                'plateletCount',
                'wbcCount',
                'serumFerritin',
                'serumIron',
                'tibc',
                'transferrinSaturation',
                'vitaminB12',
                'vitaminD',
                'folateB9',
                'vitaminC',
              ],
              labStatus: 'User_Skipped',
            },
          };
        }),

      restoreAllLabTests: () =>
        set(() => ({
          labs: {
            ...BLANK_LABS,
            skippedTests: [],
            labStatus: 'Verified',
          },
        })),

      addCustomBloodTest: (test) =>
        set((state) => ({
          labs: {
            ...state.labs,
            customBloodTests: [
              ...(state.labs.customBloodTests || []),
              { ...test, id: `cbt-${Date.now()}` },
            ],
          },
        })),

      removeCustomBloodTest: (id) =>
        set((state) => ({
          labs: {
            ...state.labs,
            customBloodTests: (state.labs.customBloodTests || []).filter(
              (t) => t.id !== id
            ),
          },
        })),

      deleteStandardBloodTest: (key) =>
        set((state) => {
          const newLabs = { ...state.labs };
          delete newLabs[key];
          return { labs: newLabs };
        }),

      clearLabs: (keys) =>
        set((state) => {
          const newLabs = { ...state.labs };
          const normalizedKeys = keys.map((k) =>
            k.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
          );

          const labKeyMap: Record<string, keyof LabDataPanel> = {
            hemoglobin: 'hemoglobin',
            hb: 'hemoglobin',
            ferritin: 'serumFerritin',
            serumferritin: 'serumFerritin',
            vitaminb12: 'vitaminB12',
            b12: 'vitaminB12',
            vitamind: 'vitaminD',
            vitd: 'vitaminD',
            folate: 'folateB9',
            folateb9: 'folateB9',
            b9: 'folateB9',
            mcv: 'mcv',
            mch: 'mch',
            mchc: 'mchc',
            rdw: 'rdw',
            tibc: 'tibc',
            serumiron: 'serumIron',
            iron: 'serumIron',
            transferrinsaturation: 'transferrinSaturation',
            plateletcount: 'plateletCount',
            wbccount: 'wbcCount',
            rbc: 'rbc',
            hematocrit: 'hematocrit',
          };

          normalizedKeys.forEach((norm) => {
            const matchedKey = labKeyMap[norm];
            if (matchedKey && newLabs[matchedKey] !== undefined) {
              delete newLabs[matchedKey];
            }
          });

          // Also clear from custom blood tests
          const remainingCustom = (state.labs.customBloodTests || []).filter((test) => {
            const testNorm = test.testName.toLowerCase().replace(/[^a-z0-9]/g, '');
            return !normalizedKeys.some((k) => testNorm.includes(k) || test.id === k);
          });
          newLabs.customBloodTests = remainingCustom;

          return { labs: newLabs };
        }),

      updateSevereSymptoms: (partial) =>
        set((state) => ({ severeSymptoms: { ...state.severeSymptoms, ...partial } })),

      updateSelectedSymptoms: (symptoms) =>
        set({ selectedSymptoms: symptoms }),

      append_user_symptoms: (symptoms) =>
        set((state) => {
          const current = state.selectedSymptoms || [];
          const merged = Array.from(new Set([...current, ...symptoms]));
          const newGut = { ...state.gut };
          const newSevere = { ...state.severeSymptoms };

          symptoms.forEach((s) => {
            const norm = s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (norm.includes('constipation')) newGut.hasConstipation = true;
            if (norm.includes('acidity') || norm.includes('acidreflux') || norm.includes('heartburn') || norm.includes('gerd')) newGut.hasAcidity = true;
            if (norm.includes('bloat') || norm.includes('bloating')) newGut.hasBloating = true;
            if (norm.includes('gas') || norm.includes('flatulence')) newGut.hasGas = true;
            if (norm.includes('diarrhea')) newGut.hasDiarrhea = true;
            if (norm.includes('ibs')) newGut.hasIBS = true;
            if (norm.includes('indigestion')) newGut.hasIndigestion = true;
            if (norm.includes('antacid')) newGut.frequentAntacidUse = true;
            if (norm.includes('hpylori') || norm.includes('pylori')) newGut.hPyloriHistory = true;
            if (norm.includes('teawithmeal') || norm.includes('coffeewithmeal')) newGut.teaCoffeeWithMeals = true;

            if (norm.includes('breathless') || norm.includes('dyspnea')) newSevere.severeBreathlessness = true;
            if (norm.includes('chestpain')) newSevere.chestPain = true;
            if (norm.includes('faint') || norm.includes('syncope')) newSevere.faintingOrSyncope = true;
            if (norm.includes('immobile') || norm.includes('extremefatigue')) newSevere.extremeFatigueImmobile = true;
          });

          return {
            selectedSymptoms: merged,
            gut: newGut,
            severeSymptoms: newSevere,
          };
        }),

      appendUserSymptoms: (symptoms) =>
        set((state) => {
          const current = state.selectedSymptoms || [];
          const merged = Array.from(new Set([...current, ...symptoms]));
          const newGut = { ...state.gut };
          const newSevere = { ...state.severeSymptoms };

          symptoms.forEach((s) => {
            const norm = s.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            if (norm.includes('constipation')) newGut.hasConstipation = true;
            if (norm.includes('acidity') || norm.includes('acidreflux') || norm.includes('heartburn') || norm.includes('gerd')) newGut.hasAcidity = true;
            if (norm.includes('bloat') || norm.includes('bloating')) newGut.hasBloating = true;
            if (norm.includes('gas') || norm.includes('flatulence')) newGut.hasGas = true;
            if (norm.includes('diarrhea')) newGut.hasDiarrhea = true;
            if (norm.includes('ibs')) newGut.hasIBS = true;
            if (norm.includes('indigestion')) newGut.hasIndigestion = true;
            if (norm.includes('antacid')) newGut.frequentAntacidUse = true;
            if (norm.includes('hpylori') || norm.includes('pylori')) newGut.hPyloriHistory = true;
            if (norm.includes('teawithmeal') || norm.includes('coffeewithmeal')) newGut.teaCoffeeWithMeals = true;

            if (norm.includes('breathless') || norm.includes('dyspnea')) newSevere.severeBreathlessness = true;
            if (norm.includes('chestpain')) newSevere.chestPain = true;
            if (norm.includes('faint') || norm.includes('syncope')) newSevere.faintingOrSyncope = true;
            if (norm.includes('immobile') || norm.includes('extremefatigue')) newSevere.extremeFatigueImmobile = true;
          });

          return {
            selectedSymptoms: merged,
            gut: newGut,
            severeSymptoms: newSevere,
          };
        }),

      removeSymptoms: (symptomsToRemove) =>
        set((state) => {
          const toRemoveNorm = symptomsToRemove.map((s) =>
            s.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
          );
          const filtered = (state.selectedSymptoms || []).filter((sym) => {
            const symNorm = sym.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            return !toRemoveNorm.some(
              (r) => symNorm === r || symNorm.includes(r) || r.includes(symNorm)
            );
          });

          const newGut = { ...state.gut };
          const newSevere = { ...state.severeSymptoms };

          toRemoveNorm.forEach((r) => {
            if (r.includes('constipation')) newGut.hasConstipation = false;
            if (r.includes('acidity') || r.includes('acidreflux') || r.includes('heartburn') || r.includes('gerd')) newGut.hasAcidity = false;
            if (r.includes('bloat') || r.includes('bloating') || r.includes('distension')) newGut.hasBloating = false;
            if (r.includes('gas') || r.includes('flatulence')) newGut.hasGas = false;
            if (r.includes('diarrhea') || r.includes('loosemotions')) newGut.hasDiarrhea = false;
            if (r.includes('ibs') || r.includes('irritablebowel')) newGut.hasIBS = false;
            if (r.includes('indigestion') || r.includes('dyspepsia')) newGut.hasIndigestion = false;
            if (r.includes('antacid')) newGut.frequentAntacidUse = false;
            if (r.includes('hpylori') || r.includes('pylori')) newGut.hPyloriHistory = false;
            if (r.includes('teawithmeal') || r.includes('coffeewithmeal') || r.includes('chaiwithmeal')) newGut.teaCoffeeWithMeals = false;

            if (r.includes('breathless') || r.includes('shortnessofbreath') || r.includes('dyspnea')) newSevere.severeBreathlessness = false;
            if (r.includes('chestpain') || r.includes('angina')) newSevere.chestPain = false;
            if (r.includes('faint') || r.includes('syncope') || r.includes('blackout')) newSevere.faintingOrSyncope = false;
            if (r.includes('immobile') || r.includes('extremefatigue')) newSevere.extremeFatigueImmobile = false;
          });

          return {
            selectedSymptoms: filtered,
            gut: newGut,
            severeSymptoms: newSevere,
          };
        }),

      toggleSymptom: (id) =>
        set((state) => ({
          selectedSymptoms: state.selectedSymptoms.includes(id)
            ? state.selectedSymptoms.filter((s) => s !== id)
            : [...state.selectedSymptoms, id],
        })),

      addHealthRecordEntry: (entry) =>
        set((state) => {
          const entryDate = entry.date || new Date().toISOString().split('T')[0];
          const entryTitle = entry.title || 'Health Check';

          // Check if an entry with the exact same date and title, or identical date and key biomarkers already exists
          const existingIndex = state.healthTimeline.findIndex(
            (item) =>
              item.date === entryDate &&
              (item.title === entryTitle ||
                (item.hemoglobin === entry.hemoglobin &&
                  item.serumFerritin === entry.serumFerritin &&
                  item.vitaminB12 === entry.vitaminB12 &&
                  item.vitaminD === entry.vitaminD))
          );

          if (existingIndex !== -1) {
            // Update existing entry in place instead of creating a duplicate
            const updatedTimeline = [...state.healthTimeline];
            updatedTimeline[existingIndex] = {
              ...updatedTimeline[existingIndex],
              ...entry,
              date: entryDate,
              title: entryTitle,
            };
            return { healthTimeline: updatedTimeline };
          }

          const newEntry: HealthRecordEntry = {
            ...entry,
            date: entryDate,
            title: entryTitle,
            id: `rec-${Date.now()}`,
          };
          // Insert at beginning of timeline
          return {
            healthTimeline: [newEntry, ...state.healthTimeline],
          };
        }),

      removeHealthRecordEntry: (id) =>
        set((state) => ({
          healthTimeline: state.healthTimeline.filter((item) => item.id !== id),
        })),

      loadSampleProfile: (profileId) => {
        const found = SAMPLE_PROFILES.find((p) => p.id === profileId);
        if (found) {
          set({
            demographics: found.demographics,
            menstrual: found.menstrual,
            lifestyle: found.lifestyle,
            gut: found.gut,
            labs: found.labs,
            severeSymptoms: found.severeSymptoms,
          });
        }
      },

      rateAyushRemedy: (id, rating) =>
        set((state) => ({
          ayushRemedies: state.ayushRemedies.map((r) =>
            r.id === id ? { ...r, rating } : r
          ),
        })),

      removeAyushRemedy: (id) =>
        set((state) => ({
          ayushRemedies: state.ayushRemedies.filter((r) => r.id !== id),
        })),

      addRemedyReview: (reviewData) => {
        const newReview: RemedyReview = {
          ...reviewData,
          id: `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: new Date().toISOString().split('T')[0],
          helpfulCount: 0,
          verifiedBadge: true,
        };

        set((state) => {
          const updatedReviews = [newReview, ...state.remedyReviews];
          // Also recalculate and update remedy rating
          const matchingReviews = updatedReviews.filter(
            (rev) => rev.remedyId === reviewData.remedyId
          );
          const avg = matchingReviews.length
            ? Math.round(
                (matchingReviews.reduce((acc, r) => acc + r.rating, 0) /
                  matchingReviews.length) *
                  10
              ) / 10
            : reviewData.rating;

          return {
            remedyReviews: updatedReviews,
            ayushRemedies: state.ayushRemedies.map((r) =>
              r.id === reviewData.remedyId ? { ...r, rating: Math.round(avg) } : r
            ),
          };
        });
      },

      voteReviewHelpful: (reviewId) =>
        set((state) => ({
          remedyReviews: state.remedyReviews.map((rev) =>
            rev.id === reviewId
              ? { ...rev, helpfulCount: (rev.helpfulCount || 0) + 1 }
              : rev
          ),
        })),

      deleteRemedyReview: (reviewId) =>
        set((state) => ({
          remedyReviews: state.remedyReviews.filter((rev) => rev.id !== reviewId),
        })),

      updateAyushNotes: (id, userNotes) =>
        set((state) => ({
          ayushRemedies: state.ayushRemedies.map((r) =>
            r.id === id ? { ...r, userNotes } : r
          ),
        })),

      addAyushToHabits: (id) => {
        const remedy = get().ayushRemedies.find((r) => r.id === id);
        if (!remedy) return;

        const newHabit: DailyHabit = {
          id: `ayush-habit-${Date.now()}`,
          title: remedy.name,
          category: 'AYUSH Rasayana',
          description: remedy.howToConsume,
          timing: remedy.optimalTiming,
          completed: false,
          sourceId: id,
        };

        set((state) => ({
          ayushRemedies: state.ayushRemedies.map((r) =>
            r.id === id ? { ...r, addedToHabits: true } : r
          ),
          dailyHabits: [newHabit, ...state.dailyHabits],
        }));
      },

      addHabit: (habitData) =>
        set((state) => ({
          dailyHabits: [
            {
              ...habitData,
              id: `habit-${Date.now()}`,
              completed: false,
            },
            ...state.dailyHabits,
          ],
        })),

      toggleHabit: (id) =>
        set((state) => ({
          dailyHabits: state.dailyHabits.map((h) =>
            h.id === id ? { ...h, completed: !h.completed } : h
          ),
        })),

      removeHabit: (id) =>
        set((state) => ({
          dailyHabits: state.dailyHabits.filter((h) => h.id !== id),
        })),

      removeHabits: (titlesOrIds) =>
        set((state) => {
          const searchNorms = titlesOrIds.map((t) => t.toLowerCase().trim());
          const filtered = (state.dailyHabits || []).filter((h) => {
            const titleNorm = h.title.toLowerCase().trim();
            return !searchNorms.some(
              (s) => h.id === s || titleNorm.includes(s) || s.includes(titleNorm)
            );
          });
          return { dailyHabits: filtered };
        }),

      clearAllHabits: () =>
        set({
          dailyHabits: [],
        }),

      clearCompletedHabits: () =>
        set((state) => ({
          dailyHabits: state.dailyHabits.map((h) => ({ ...h, completed: false })),
        })),

      checkAllHabits: () =>
        set((state) => ({
          dailyHabits: state.dailyHabits.map((h) => ({ ...h, completed: true })),
        })),

      addMeal: (mealData) => {
        const newMeal: MealItem = {
          ...mealData,
          id: `meal-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        set((state) => ({
          meals: [newMeal, ...state.meals],
        }));
      },

      removeMeal: (id) =>
        set((state) => ({
          meals: state.meals.filter((m) => m.id !== id),
        })),

      removeMeals: (namesOrIds) =>
        set((state) => {
          const searchNorms = namesOrIds.map((n) => n.toLowerCase().trim());
          const filtered = (state.meals || []).filter((m) => {
            const nameNorm = m.name.toLowerCase().trim();
            return !searchNorms.some(
              (s) => m.id === s || nameNorm.includes(s) || s.includes(nameNorm)
            );
          });
          return { meals: filtered };
        }),

      addCustomImportedFoods: async (foods, overwrite = false) => {
        try {
          await saveFoodsToIndexedDB(foods, overwrite);
        } catch (e) {
          console.warn('Failed to save to IndexedDB', e);
        }
        set((state) => ({
          customImportedFoods: overwrite
            ? foods
            : [...foods, ...(state.customImportedFoods || [])],
        }));
      },

      clearCustomImportedFoods: async () => {
        try {
          await clearFoodsFromIndexedDB();
        } catch (e) {
          console.warn('Failed to clear IndexedDB', e);
        }
        set({ customImportedFoods: [] });
      },

      loadImportedFoodsFromStorage: async () => {
        try {
          let stored = await loadFoodsFromIndexedDB();
          if (!stored || stored.length === 0) {
            try {
              const res = await fetch('/data/micronutrient_foods.json');
              if (res.ok) {
                const defaultFoods = await res.json();
                if (Array.isArray(defaultFoods) && defaultFoods.length > 0) {
                  stored = defaultFoods;
                  await saveFoodsToIndexedDB(defaultFoods, true);
                }
              }
            } catch (fetchErr) {
              console.warn('Could not auto-fetch default micronutrient dataset:', fetchErr);
            }
          }

          if (stored && stored.length > 0) {
            // Migration: handle legacy IU field and ensure consistent schema
            const migrated = stored.map((f: any) => {
              if (f.vitaminDMcg !== undefined) return f;
              const vitDIu = f.vitaminDIu || 0;
              return {
                ...f,
                vitaminDMcg: Math.round((vitDIu / 40) * 10) / 10
              };
            });

            set((state) => {
              const existingIds = new Set((state.customImportedFoods || []).map((f) => f.id));
              const newItems = migrated.filter((f) => !existingIds.has(f.id));
              return {
                customImportedFoods: [...(state.customImportedFoods || []), ...newItems],
              };
            });
          }
        } catch (e) {
          console.warn('Failed to load foods from IndexedDB', e);
        }
      },

      addChatMessage: (msg) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, msg],
        })),

      setAiThinking: (thinking) => set({ isAiThinking: thinking }),

      setQuotaExceeded: (exceeded) => {
        if (typeof window !== 'undefined') {
          if (exceeded) {
            markFirestoreQuotaExceeded();
          } else {
            localStorage.removeItem('maguva_firestore_quota_exceeded');
            localStorage.removeItem('maguva_firestore_quota_date');
            try {
              enableNetwork(db).catch(() => {});
            } catch {}
          }
        }
        set({ quotaExceeded: exceeded });
      },

      clearChat: () =>
        set({
          chatMessages: INITIAL_CHAT_MESSAGES,
        }),

      resetAllData: () => {
        set((state) => {
          const nextState: any = {};
          // Preserve actions
          for (const [key, value] of Object.entries(state)) {
            if (typeof value === 'function') {
              nextState[key] = value;
            }
          }
          return {
            ...nextState,
            currentUser: state.currentUser,
            isAuthenticated: state.isAuthenticated,
            isSessionHydrated: true,
            consentAccepted: state.consentAccepted,
            isProfileCompleted: false,
            isProfileModalOpen: false,
            isUserProfileModalOpen: false,
            activeStage: 1,
            activeTab: 'dashboard',
            mealEntryMode: 'library',
            demographics: {
              ...BLANK_DEMOGRAPHICS,
              name: state.currentUser?.name || '',
              age: state.currentUser?.age || undefined,
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
            customImportedFoods: [],
            healthTimeline: [],
            chatMessages: [],
            isAiThinking: false,
            registeredUsers: state.registeredUsers, // Preserve local user auth list
          };
        }, true);
      },

      resetToBlankProfile: () =>
        set((state) => ({
          demographics: {
            ...BLANK_DEMOGRAPHICS,
            name: state.currentUser?.name || state.demographics?.name || '',
            age: state.currentUser?.age || state.demographics?.age || undefined,
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
          customImportedFoods: [],
          healthTimeline: [],
          chatMessages: [],
          isAiThinking: false,
        })),

      getBmiResult: () => {
        const { demographics } = get();
        return calculateDualEngineBmi(
          demographics.weightKg,
          demographics.heightCm,
          demographics.age
        );
      },

      getDeficiencyRisks: () => {
        const { demographics, menstrual, lifestyle, gut, labs } = get();
        return calculateAllDeficiencyRisks(
          demographics,
          menstrual,
          lifestyle,
          gut,
          labs
        );
      },

      isTriageTriggered: () => {
        const { labs, severeSymptoms } = get();
        const hbSevere = labs.hemoglobin !== undefined && labs.hemoglobin < 7.0;
        const symptomsSevere =
          severeSymptoms.severeBreathlessness ||
          severeSymptoms.chestPain ||
          severeSymptoms.faintingOrSyncope ||
          severeSymptoms.extremeFatigueImmobile;
        return hbSevere || symptomsSevere;
      },

      getDailyTotals: () => {
        const { meals } = get();
        return meals.reduce(
          (acc, m) => ({
            ironMg: Math.round((acc.ironMg + (m.ironMg || 0)) * 10) / 10,
            b12Mcg: Math.round((acc.b12Mcg + (m.b12Mcg || 0)) * 10) / 10,
            folateMcg: Math.round((acc.folateMcg + (m.folateMcg || 0)) * 10) / 10,
            vitaminCMg: Math.round((acc.vitaminCMg + (m.vitaminCMg || 0)) * 10) / 10,
            vitaminDMcg: Math.round((acc.vitaminDMcg + (m.vitaminDMcg || 0)) * 10) / 10,
            calciumMg: Math.round((acc.calciumMg + (m.calciumMg || 0)) * 10) / 10,
            calories: Math.round((acc.calories || 0) + (m.calories || 0)),
          }),
          { ironMg: 0, b12Mcg: 0, folateMcg: 0, vitaminCMg: 0, vitaminDMcg: 0, calciumMg: 0, calories: 0 }
        );
      },
    }),
    {
      name: 'maguva-health-storage-v6',
      partialize: (state) => {
        // Strict Security & Privacy Boundary:
        // Do NOT persist any clinical, medical, or demographic data in the global, cross-session Zustand key.
        // The global storage ONLY persists authenticated session metadata and registered local credentials.
        // All health parameters are exclusively cached and loaded per-user in useAppSessionManager.
        return {
          currentUser: state.currentUser,
          isAuthenticated: state.isAuthenticated,
          registeredUsers: state.registeredUsers,
        };
      },
    }
  )
);
