import { useEffect, useCallback, useRef } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { clearFoodsFromIndexedDB } from '../utils/indexedDbFoodStorage';
import { logoutUser, saveUserProfileToFirestore, extractProfileFromCloud, hydrateStoreFromCloudData, syncFullUserDataToFirestore } from '../services/authService';
import { db, doc, getDoc, isFirestoreQuotaExceeded, auth } from '../lib/firebase';
import {
  ACTIVE_SESSION_KEY,
  getProfileCompletenessScore,
  getProfileDataSnapshot,
  buildRestoredProfile,
  createFreshProfile,
  getBestLocalProfile,
  saveProfileLocally,
} from '../utils/profilePersistence';

export {
  ACTIVE_SESSION_KEY,
  getProfileCompletenessScore,
  getProfileDataSnapshot,
  buildRestoredProfile,
  createFreshProfile,
};

export type UserOrUserId = string | { id?: string | null } | null | undefined;

/**
 * Helper to ensure async operations (like Firestore calls) don't hang indefinitely.
 */
const withTimeout = <T>(promise: Promise<T>, ms = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms)
    ),
  ]);
};

/**
 * Purges all user-specific local & session cache, and resets all app state
 * (Profile, Meal Logs, Blood Tests / Labs, Chat, Habits, Remedies).
 */
export const purgeAppSessionAndResetState = async (): Promise<void> => {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear();
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(ACTIVE_SESSION_KEY);

      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('maguva') || key.startsWith('health') || key === ACTIVE_SESSION_KEY)) {
          if (!key.startsWith('maguva_profile_')) {
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    }

    try {
      await clearFoodsFromIndexedDB();
    } catch (err) {
      console.warn('[Session Manager] IndexedDB clear notice:', err);
    }

    const store = useHealthStore.getState();
    if (typeof store.resetAllData === 'function') {
      store.resetAllData();
    }
    if (typeof store.clearChat === 'function') {
      store.clearChat();
    }
    if (typeof store.clearAllHabits === 'function') {
      store.clearAllHabits();
    }
  } catch (error) {
    console.error('[Session Manager] Error during state purge and reset:', error);
  }
};

/**
 * Global Logout function that purges session storage and local cache
 * before completing authentication sign-out.
 */
export const handleGlobalLogout = async (): Promise<void> => {
  await purgeAppSessionAndResetState();

  try {
    await logoutUser();
  } catch (authErr) {
    console.error('[Global Logout Error]', authErr);
  }

  useHealthStore.getState().signOut();
};

/**
 * Standalone Bidirectional Cloud Synchronization Engine:
 * Compares Local Storage with Firestore Cloud Document.
 * If Local is more complete (e.g. Laptop filled profile), pushes to Cloud.
 * If Cloud is more complete (e.g. Mobile opening after Laptop upload), adopts Cloud data.
 * Safe with 4-second network timeout so it never hangs.
 */
export const syncProfileWithCloud = async (isManualTrigger = false): Promise<void> => {
  if (typeof window === 'undefined') return;

  const store = useHealthStore.getState();
  const activeUser = store.currentUser;
  const userId = activeUser?.id;
  if (!userId) return;

  const fallbackName = activeUser?.name || '';
  const fallbackAge = activeUser?.age || undefined;

  if (isManualTrigger) {
    store.setIsSyncingWithCloud(true);
    store.setCloudSyncMessage('Checking Cloud Database...');
  }

  try {
    const bestLocal = getBestLocalProfile(userId);
    const localCachedProfile = bestLocal.profile;
    const localScore = bestLocal.score;

    let cloudData: any = null;
    let cloudDocExists = false;

    const currentFbUser = auth.currentUser;
    if (currentFbUser && currentFbUser.uid === userId && !isFirestoreQuotaExceeded()) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap: any = await Promise.race([
          getDoc(userDocRef),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore fetch timeout')), 8000)),
        ]);
        if (docSnap && docSnap.exists && docSnap.exists()) {
          cloudData = docSnap.data();
          cloudDocExists = true;
        }
      } catch (fsErr: any) {
        const errMsg = String(fsErr?.message || '').toLowerCase();
        if (errMsg.includes('quota') || errMsg.includes('resource-exhausted')) {
          useHealthStore.getState().setQuotaExceeded(true);
        } else {
          console.warn('[Session Manager] Firestore fetch notice:', fsErr?.message || fsErr);
        }
      }
    }

    if (cloudDocExists && cloudData) {
      console.log('[Session Manager] Cloud document verified for user:', userId);

      // 1. Hydrate all collection arrays into Zustand state
      hydrateStoreFromCloudData(cloudData);

      const cloudProfile = extractProfileFromCloud(cloudData);
      const cloudCompleteness = getProfileCompletenessScore(cloudProfile || cloudData || {});
      const localCompleteness = localScore;

      // 2. Hydrate profile if cloud completeness >= local or local state is uninitialized
      if (cloudProfile && (cloudCompleteness >= localCompleteness || localCompleteness === 0)) {
        console.log('[Session Manager] Hydrating profile from Cloud document');
        if (typeof store.updateProfile === 'function') {
          store.updateProfile(cloudProfile);
        }
        const isConsentAccepted = Boolean(
          useHealthStore.getState().consentAccepted ||
          (typeof window !== 'undefined' &&
            ((window.sessionStorage && window.sessionStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true') ||
             (window.localStorage && window.localStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true')))
        );
        const restoredProfile = buildRestoredProfile(cloudData, fallbackName, fallbackAge, userId);
        if (isConsentAccepted) {
          restoredProfile.consentAccepted = true;
        }
        useHealthStore.setState(restoredProfile);
        saveProfileLocally(userId, restoredProfile);
      }
    }

    const cloudScore = cloudData ? getProfileCompletenessScore(cloudData) : 0;
    const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // CASE 1: Cloud is MORE complete than Local (e.g. Mobile opening after Laptop upload)
    if (cloudScore > localScore) {
      console.log(`[Session Manager] Cloud profile is more complete (${cloudScore} > ${localScore}). Adopting Cloud data...`);
      hydrateStoreFromCloudData(cloudData);
      const isConsentAccepted = Boolean(
        useHealthStore.getState().consentAccepted ||
        (typeof window !== 'undefined' &&
          ((window.sessionStorage && window.sessionStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true') ||
           (window.localStorage && window.localStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true')))
      );
      const restoredProfile = buildRestoredProfile(cloudData, fallbackName, fallbackAge, userId);
      if (isConsentAccepted) {
        restoredProfile.consentAccepted = true;
      }
      useHealthStore.setState(restoredProfile);
      saveProfileLocally(userId, restoredProfile);

      store.setLastCloudSyncTimestamp(nowFormatted);
      store.setCloudSyncMessage(`Synchronized with Cloud profile (${restoredProfile.selectedSymptoms.length} symptoms, ${restoredProfile.meals.length} meals)`);
    }
    // CASE 2: Local is MORE complete than Cloud (e.g. Laptop filled profile)
    else if (localScore > cloudScore) {
      console.log(`[Session Manager] Local data is more complete (${localScore} > ${cloudScore}). Uploading profile to Cloud Firestore...`);
      const currentStore = useHealthStore.getState();
      const dataToUpload = localCachedProfile || {
        name: currentStore.demographics?.name || activeUser?.name,
        demographics: currentStore.demographics,
        menstrual: currentStore.menstrual,
        lifestyle: currentStore.lifestyle,
        gut: currentStore.gut,
        labs: currentStore.labs,
        severeSymptoms: currentStore.severeSymptoms,
        selectedSymptoms: currentStore.selectedSymptoms,
        ayushRemedies: currentStore.ayushRemedies,
        remedyReviews: currentStore.remedyReviews,
        dailyHabits: currentStore.dailyHabits,
        meals: currentStore.meals,
        chatMessages: currentStore.chatMessages,
        consentAccepted: currentStore.consentAccepted,
        isProfileCompleted: currentStore.isProfileCompleted,
        activeStage: currentStore.activeStage,
        healthTimeline: currentStore.healthTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveProfileLocally(userId, dataToUpload);
      await syncFullUserDataToFirestore(userId);
      store.setLastCloudSyncTimestamp(nowFormatted);
      store.setCloudSyncMessage(`Uploaded latest profile to Cloud Firestore`);
    }
    // CASE 3: Equal non-zero scores
    else if (localScore > 0 && localScore === cloudScore) {
      const cloudTime = cloudData?.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;
      const localTime = localCachedProfile?.updatedAt ? new Date(localCachedProfile.updatedAt).getTime() : 0;

      if (cloudTime > localTime) {
        hydrateStoreFromCloudData(cloudData);
        const isConsentAccepted = Boolean(
          useHealthStore.getState().consentAccepted ||
          (typeof window !== 'undefined' &&
            ((window.sessionStorage && window.sessionStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true') ||
             (window.localStorage && window.localStorage.getItem(`maguva_consent_accepted_${userId}`) === 'true')))
        );
        const restoredProfile = buildRestoredProfile(cloudData, fallbackName, fallbackAge, userId);
        if (isConsentAccepted) {
          restoredProfile.consentAccepted = true;
        }
        useHealthStore.setState(restoredProfile);
        saveProfileLocally(userId, restoredProfile);
      } else if (localTime > cloudTime) {
        await syncFullUserDataToFirestore(userId);
      }

      store.setLastCloudSyncTimestamp(nowFormatted);
      store.setCloudSyncMessage('Profile is fully synchronized with Cloud');
    }
    // CASE 4: Fresh or in-memory profile
    else if (!cloudDocExists && localScore === 0) {
      const currentStore = useHealthStore.getState();
      const inMemoryScore = getProfileCompletenessScore(currentStore);
      if (inMemoryScore > 0) {
        // We have active clinical data in memory - do NOT overwrite!
        const snapshot = {
          name: currentStore.demographics?.name || activeUser?.name,
          demographics: currentStore.demographics,
          menstrual: currentStore.menstrual,
          lifestyle: currentStore.lifestyle,
          gut: currentStore.gut,
          labs: currentStore.labs,
          severeSymptoms: currentStore.severeSymptoms,
          selectedSymptoms: currentStore.selectedSymptoms,
          ayushRemedies: currentStore.ayushRemedies,
          remedyReviews: currentStore.remedyReviews,
          dailyHabits: currentStore.dailyHabits,
          meals: currentStore.meals,
          chatMessages: currentStore.chatMessages,
          consentAccepted: currentStore.consentAccepted,
          isProfileCompleted: currentStore.isProfileCompleted,
          activeStage: currentStore.activeStage,
          healthTimeline: currentStore.healthTimeline,
          updatedAt: new Date().toISOString(),
        };
        saveProfileLocally(userId, snapshot);
        await saveUserProfileToFirestore(userId, snapshot, { force: true });
        store.setCloudSyncMessage('Profile saved and synced');
      } else {
        const freshProfile = createFreshProfile(fallbackName, fallbackAge);
        useHealthStore.setState(freshProfile);
        saveProfileLocally(userId, freshProfile);
        store.setCloudSyncMessage('Initialized clean profile');
      }
    }
  } catch (syncErr) {
    console.error('[Session Manager Sync Error]', syncErr);
    if (isManualTrigger) {
      store.setCloudSyncMessage('Could not connect to Cloud. Data remains safe on this device.');
    }
  } finally {
    store.setIsSyncingWithCloud(false);
  }
};

/**
 * Custom hook: useAppSessionManager
 *
 * Provides bidirectional, cross-device synchronization between Laptop, Mobile,
 * Local Browser Storage, and Google Cloud Firestore.
 */
export function useAppSessionManager(userOrUserId?: UserOrUserId) {
  const storeCurrentUser = useHealthStore((state) => state.currentUser);
  const isAuthLoading = useHealthStore((state) => state.isAuthLoading);
  const setSessionHydrated = useHealthStore((state) => state.setSessionHydrated);

  const currentUserId =
    typeof userOrUserId === 'object' && userOrUserId !== null
      ? userOrUserId.id ?? null
      : typeof userOrUserId === 'string'
      ? userOrUserId
      : storeCurrentUser?.id ?? null;

  const previousUserIdRef = useRef<string | null>(null);
  const lastPersistedSnapshotRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSessionAndSync = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (isAuthLoading) {
      return;
    }

    if (currentUserId) {
      window.localStorage.setItem(ACTIVE_SESSION_KEY, currentUserId);

      // 1. INSTANT SYNCHRONOUS HYDRATION FROM BEST LOCAL CACHE / BACKUP
      try {
        const activeUser = useHealthStore.getState().currentUser;
        const currentStore = useHealthStore.getState();
        const currentStoreScore = getProfileCompletenessScore(currentStore);
        const bestLocal = getBestLocalProfile(currentUserId);

        if (bestLocal.profile && bestLocal.score > 0) {
          // If local backup has equal or better data, or if store is empty, adopt cached profile
          if (bestLocal.score >= currentStoreScore || currentStoreScore === 0) {
            const instantProfile = buildRestoredProfile(bestLocal.profile, activeUser?.name, activeUser?.age, currentUserId);
            useHealthStore.setState(instantProfile);
            lastPersistedSnapshotRef.current = getProfileDataSnapshot(instantProfile);
          } else {
            lastPersistedSnapshotRef.current = getProfileDataSnapshot(currentStore);
          }
        } else if (currentStoreScore > 0) {
          // Already have rich clinical data in memory
          lastPersistedSnapshotRef.current = getProfileDataSnapshot(currentStore);
        } else {
          const freshProfile = createFreshProfile(activeUser?.name, activeUser?.age);
          useHealthStore.setState(freshProfile);
          lastPersistedSnapshotRef.current = getProfileDataSnapshot(freshProfile);
        }
      } catch (err) {
        console.warn('[Session Manager] Fast hydration warning:', err);
      } finally {
        // UNBLOCK THE UI IMMEDIATELY
        setSessionHydrated(true);
        useHealthStore.getState().setIsHydrating(false);
      }

      // 2. BACKGROUND BIDIRECTIONAL CLOUD SYNC
      syncProfileWithCloud(false).catch((err) => {
        console.warn('[Session Manager] Background sync notice:', err);
      });
    } else {
      // Inactive or unauthenticated: never delete user's data passively!
      setSessionHydrated(true);
      useHealthStore.getState().setIsHydrating(false);
      lastPersistedSnapshotRef.current = '';

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    }

    previousUserIdRef.current = currentUserId;
  }, [currentUserId, isAuthLoading, setSessionHydrated]);

  const syncWithCloud = useCallback(async () => {
    await syncProfileWithCloud(true);
  }, []);

  useEffect(() => {
    checkSessionAndSync();
  }, [checkSessionAndSync]);

  // Auto-Save Subscriber: Listens to state changes and saves active user's profile
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = useHealthStore.subscribe((state) => {
      if (state.isHydrating || !state.isSessionHydrated) {
        return;
      }

      const activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY) || currentUserId;
      if (state.currentUser?.id !== currentUserId && activeSessionId !== currentUserId) {
        return;
      }

      const currentSnapshot = getProfileDataSnapshot(state);
      if (currentSnapshot === lastPersistedSnapshotRef.current) {
        return;
      }

      const stateScore = getProfileCompletenessScore(state);
      const bestLocal = getBestLocalProfile(currentUserId);

      // GUARD: If stored profile has rich clinical vitals/symptoms (score >= 15) and
      // current state has lower score (<= 5), DO NOT OVERWRITE! It's a temporary empty state.
      if (bestLocal.score >= 15 && stateScore <= 5) {
        console.warn(`[Auto-Save Guard] Protected existing ${bestLocal.score} pt profile from ${stateScore} pt wipe.`);
        return;
      }

      const userData = {
        name: state.demographics?.name || state.currentUser?.name,
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
        consentAccepted: state.consentAccepted,
        isProfileCompleted: state.isProfileCompleted,
        activeStage: state.activeStage,
        healthTimeline: state.healthTimeline,
        updatedAt: new Date().toISOString(),
      };

      saveProfileLocally(currentUserId, userData);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        const latestState = useHealthStore.getState();

        if (latestState.isHydrating || !latestState.isSessionHydrated) {
          return;
        }

        const latestScore = getProfileCompletenessScore(latestState);
        // Do not push empty blanks to Firestore
        if (latestScore <= 5) {
          return;
        }

        const latestSnapshot = getProfileDataSnapshot(latestState);
        if (latestSnapshot === lastPersistedSnapshotRef.current) {
          return;
        }

        const isQuotaExceeded =
          (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
          latestState.quotaExceeded;

        if (!isQuotaExceeded) {
          lastPersistedSnapshotRef.current = latestSnapshot;

          try {
            await saveUserProfileToFirestore(currentUserId, userData);
            const nowFormatted = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            useHealthStore.getState().setLastCloudSyncTimestamp(nowFormatted);
          } catch (err) {
            console.warn('[Session Manager Firestore Sync Notice]', err);
          }
        }
      }, 1000);
    });

    const handleBeforeUnload = () => {
      const currentState = useHealthStore.getState();
      if (currentState.isHydrating || !currentState.isSessionHydrated) return;

      const stateScore = getProfileCompletenessScore(currentState);
      if (stateScore <= 5) return;

      const currentSnapshot = getProfileDataSnapshot(currentState);
      if (currentSnapshot !== lastPersistedSnapshotRef.current) {
        try {
          const userData = {
            name: currentState.demographics?.name || currentState.currentUser?.name,
            demographics: currentState.demographics,
            menstrual: currentState.menstrual,
            lifestyle: currentState.lifestyle,
            gut: currentState.gut,
            labs: currentState.labs,
            severeSymptoms: currentState.severeSymptoms,
            selectedSymptoms: currentState.selectedSymptoms,
            ayushRemedies: currentState.ayushRemedies,
            remedyReviews: currentState.remedyReviews,
            dailyHabits: currentState.dailyHabits,
            meals: currentState.meals,
            chatMessages: currentState.chatMessages,
            consentAccepted: currentState.consentAccepted,
            isProfileCompleted: currentState.isProfileCompleted,
            activeStage: currentState.activeStage,
            healthTimeline: currentState.healthTimeline,
            updatedAt: new Date().toISOString(),
          };
          saveProfileLocally(currentUserId, userData);
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unsubscribe();
    };
  }, [currentUserId]);

  return {
    handleGlobalLogout,
    syncWithCloud,
    activeSessionUserId: currentUserId,
    isSessionValid: Boolean(currentUserId),
    isHydrating: useHealthStore((state) => state.isHydrating),
    isSessionHydrated: useHealthStore((state) => state.isSessionHydrated),
    isAuthLoading,
    isSyncingWithCloud: useHealthStore((state) => state.isSyncingWithCloud),
    lastCloudSyncTimestamp: useHealthStore((state) => state.lastCloudSyncTimestamp),
    cloudSyncMessage: useHealthStore((state) => state.cloudSyncMessage),
  };
}

export default useAppSessionManager;
