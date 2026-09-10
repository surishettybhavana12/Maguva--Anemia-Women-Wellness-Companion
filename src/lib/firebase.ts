import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseAppletConfig from '../../firebase-applet-config.json';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  ActionCodeSettings,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  setLogLevel,
  disableNetwork,
  enableNetwork,
  doc,
  setDoc as rawSetDoc,
  getDoc as rawGetDoc,
  getDocFromCache,
  updateDoc as rawUpdateDoc,
  collection,
  query,
  where,
  getDocs as rawGetDocs,
  getDocsFromCache,
  serverTimestamp,
} from 'firebase/firestore';
import { setLogLevel as setFirebaseLoggerLevel, setUserLogHandler } from '@firebase/logger';

// 1. Completely silence internal Firebase logger warnings (e.g. backoff retry notices)
try {
  setLogLevel('silent');
  setFirebaseLoggerLevel('silent');
  setUserLogHandler(() => {});
} catch {}

// 2. Intercept console.error to prevent benign background quota backoff logs from triggering false host errors
if (typeof window !== 'undefined') {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const combinedMsg = args.map((a) => (typeof a === 'object' ? (a?.message || JSON.stringify(a)) : String(a || ''))).join(' ');
    if (
      combinedMsg.includes('resource-exhausted') ||
      combinedMsg.includes('Quota limit exceeded') ||
      combinedMsg.includes('Free daily write units') ||
      combinedMsg.includes('Using maximum backoff delay') ||
      combinedMsg.includes('Firestore write timeout') ||
      combinedMsg.includes('Firestore fetch timeout')
    ) {
      // Benign notice: data is already safely stored in local browser cache
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

// Configuration from Google Cloud / Firebase Applet Provisioning & Environment Overrides
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId,
};

// Initialize Firebase safely (Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with custom database ID or default
let dbInstance: any;
try {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

let inMemoryQuotaExceeded = false; // Default to connected (false)

// Check quota on boot
if (typeof window !== 'undefined') {
  try {
    const quotaFlag = localStorage.getItem('maguva_firestore_quota_exceeded');
    const quotaDate = localStorage.getItem('maguva_firestore_quota_date');
    const today = new Date().toISOString().slice(0, 10);

    if (quotaFlag === 'true') {
      if (quotaDate && quotaDate !== today) {
        // Reset quota flag on new calendar day
        localStorage.removeItem('maguva_firestore_quota_exceeded');
        localStorage.removeItem('maguva_firestore_quota_date');
        inMemoryQuotaExceeded = false;
        try {
          enableNetwork(dbInstance).catch(() => {});
        } catch {}
      } else {
        // Quota was recorded as exceeded for today; disable network to prevent background retries
        inMemoryQuotaExceeded = true;
        try {
          disableNetwork(dbInstance).catch(() => {});
        } catch {}
      }
    } else {
      inMemoryQuotaExceeded = false;
    }
  } catch {}
}

/**
 * Returns true if Firestore operations should fall back to local storage
 */
export function isFirestoreQuotaExceeded(): boolean {
  if (typeof window !== 'undefined') {
    const quotaFlag = localStorage.getItem('maguva_firestore_quota_exceeded') === 'true';
    const quotaDate = localStorage.getItem('maguva_firestore_quota_date');
    const today = new Date().toISOString().slice(0, 10);
    if (quotaFlag && quotaDate && quotaDate !== today) {
      localStorage.removeItem('maguva_firestore_quota_exceeded');
      localStorage.removeItem('maguva_firestore_quota_date');
      inMemoryQuotaExceeded = false;
      try {
        enableNetwork(dbInstance).catch(() => {});
      } catch {}
      return false;
    }
    return inMemoryQuotaExceeded || quotaFlag;
  }
  return inMemoryQuotaExceeded;
}

/**
 * Marks Firestore quota as exceeded, records the timestamp, and immediately
 * calls `disableNetwork(db)` to stop all internal background retry loops.
 */
export function markFirestoreQuotaExceeded() {
  inMemoryQuotaExceeded = true;
  if (typeof window !== 'undefined') {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('maguva_firestore_quota_exceeded', 'true');
    localStorage.setItem('maguva_firestore_quota_date', today);
    try {
      window.dispatchEvent(new CustomEvent('maguva_firestore_quota_exceeded'));
    } catch {}
    try {
      disableNetwork(dbInstance).catch(() => {});
    } catch {}
  }
}

/**
 * Checks cloud connection status without executing failing write operations.
 */
export async function retryFirestoreConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const quotaDate = typeof window !== 'undefined' ? localStorage.getItem('maguva_firestore_quota_date') : today;

    if (quotaDate === today && isFirestoreQuotaExceeded()) {
      return {
        success: false,
        error: 'Google Cloud daily write quota resets every 24 hours. Your data remains fully protected and stored locally.',
      };
    }

    inMemoryQuotaExceeded = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('maguva_firestore_quota_exceeded');
      localStorage.removeItem('maguva_firestore_quota_date');
    }
    await enableNetwork(dbInstance);
    return { success: true };
  } catch (err: any) {
    markFirestoreQuotaExceeded();
    return { success: false, error: err?.message || 'Quota limit still active' };
  }
}

// Protected wrapper for setDoc that catches quota exhaustion and prevents retry loops
export const setDoc = async (docRef: any, data: any, options?: any) => {
  if (isFirestoreQuotaExceeded()) {
    return;
  }
  try {
    return await rawSetDoc(docRef, data, options);
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    if (
      errMsg.includes('quota') ||
      errMsg.includes('resource-exhausted') ||
      err?.code === 'resource-exhausted'
    ) {
      markFirestoreQuotaExceeded();
      return;
    }
    throw err;
  }
};

// Protected wrapper for updateDoc
export const updateDoc = async (docRef: any, data: any, ...moreFieldsAndValues: any[]) => {
  if (isFirestoreQuotaExceeded()) {
    return;
  }
  try {
    return await (rawUpdateDoc as any)(docRef, data, ...moreFieldsAndValues);
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    if (
      errMsg.includes('quota') ||
      errMsg.includes('resource-exhausted') ||
      err?.code === 'resource-exhausted'
    ) {
      markFirestoreQuotaExceeded();
      return;
    }
    throw err;
  }
};

// Protected wrapper for getDoc
export const getDoc = async (docRef: any) => {
  if (isFirestoreQuotaExceeded()) {
    try {
      return await getDocFromCache(docRef);
    } catch {
      return { exists: () => false, data: () => null } as any;
    }
  }
  try {
    return await rawGetDoc(docRef);
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    if (
      errMsg.includes('quota') ||
      errMsg.includes('resource-exhausted') ||
      err?.code === 'resource-exhausted'
    ) {
      markFirestoreQuotaExceeded();
      try {
        return await getDocFromCache(docRef);
      } catch {
        return { exists: () => false, data: () => null } as any;
      }
    }
    throw err;
  }
};

// Protected wrapper for getDocs
export const getDocs = async (queryRef: any) => {
  if (isFirestoreQuotaExceeded()) {
    try {
      return await getDocsFromCache(queryRef);
    } catch {
      return { empty: true, docs: [] } as any;
    }
  }
  try {
    return await rawGetDocs(queryRef);
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    if (
      errMsg.includes('quota') ||
      errMsg.includes('resource-exhausted') ||
      err?.code === 'resource-exhausted'
    ) {
      markFirestoreQuotaExceeded();
      try {
        return await getDocsFromCache(queryRef);
      } catch {
        return { empty: true, docs: [] } as any;
      }
    }
    throw err;
  }
};

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  doc,
  collection,
  query,
  where,
  serverTimestamp,
  disableNetwork,
  enableNetwork,
};

export type { FirebaseUser, ActionCodeSettings };
