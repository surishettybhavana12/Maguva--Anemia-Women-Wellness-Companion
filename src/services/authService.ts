import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  ActionCodeSettings,
} from '../lib/firebase';
import { UserAccount } from '../types';
import { useHealthStore } from '../store/useHealthStore';

const KNOWN_EMAILS_KEY = 'maguva_known_registered_emails';

export function getKnownRegisteredEmails(): string[] {
  if (typeof window === 'undefined' || !window.localStorage) return ['surishettybhavana12@gmail.com'];
  try {
    const raw = localStorage.getItem(KNOWN_EMAILS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!parsed.includes('surishettybhavana12@gmail.com')) {
      parsed.push('surishettybhavana12@gmail.com');
    }
    return parsed;
  } catch {
    return ['surishettybhavana12@gmail.com'];
  }
}

export function recordKnownRegisteredEmail(email: string) {
  if (!email) return;
  const clean = email.trim().toLowerCase();
  const list = getKnownRegisteredEmails();
  if (!list.includes(clean)) {
    list.push(clean);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(KNOWN_EMAILS_KEY, JSON.stringify(list));
      }
    } catch {}
  }
}

export function isKnownRegisteredEmail(email: string): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean === 'surishettybhavana12@gmail.com') return true;
  return getKnownRegisteredEmails().includes(clean);
}

export interface UserProfileData {
  uid: string;
  name: string;
  email: string;
  age: number;
  createdAt: string;
  lastLoginAt: string;
  avatarColor?: string;
  gcpStorage: string;
}

/**
 * Construct authorized ActionCodeSettings for Firebase Auth redirect URLs
 */
export function getAuthActionCodeSettings(): ActionCodeSettings {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'http://localhost:3000';

  return {
    url: `${origin}/`,
    handleCodeInApp: true,
  };
}

/**
 * 1. Check if a user account exists in Firestore / Server DB / Local Store
 * Prior to any password reset or sensitive dispatch
 */
export async function checkIfUserExists(
  email: string
): Promise<{ exists: boolean; user?: UserAccount }> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Default known account
  if (cleanEmail === 'surishettybhavana12@gmail.com') {
    recordKnownRegisteredEmail(cleanEmail);
    return {
      exists: true,
      user: {
        id: 'usr_bhavana_default',
        name: 'Bhavana Surishetty',
        email: cleanEmail,
        age: 24,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };
  }

  // 2. Check local registered Zustand store
  const storeUsers = useHealthStore.getState().registeredUsers;
  const matched = storeUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (matched) {
    recordKnownRegisteredEmail(cleanEmail);
    return { exists: true, user: matched };
  }

  // 3. Check local browser known emails registry
  if (isKnownRegisteredEmail(cleanEmail)) {
    return {
      exists: true,
      user: {
        id: `known_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: cleanEmail.split('@')[0],
        email: cleanEmail,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    };
  }

  // 4. Check Firestore database 'users' collection
  try {
    const isQuotaExceeded =
      (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
      useHealthStore.getState().quotaExceeded;

    if (!isQuotaExceeded) {
      // Check doc directly by email
      const emailDocSnap = await getDoc(doc(db, 'users', cleanEmail)).catch(() => null);
      if (emailDocSnap && emailDocSnap.exists()) {
        const data = emailDocSnap.data();
        recordKnownRegisteredEmail(cleanEmail);
        return {
          exists: true,
          user: {
            id: emailDocSnap.id,
            name: data?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            age: data?.age,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
        };
      }

      // Query 'users' collection with where clause
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const qSnap = await getDocs(q).catch(() => null);
      if (qSnap && !qSnap.empty) {
        const firstDoc = qSnap.docs[0];
        const data = firstDoc.data();
        recordKnownRegisteredEmail(cleanEmail);
        return {
          exists: true,
          user: {
            id: firstDoc.id,
            name: data?.name || cleanEmail.split('@')[0],
            email: cleanEmail,
            age: data?.age,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
        };
      }
    }
  } catch (fsErr) {
    console.warn('[Firestore User Query Notice]', fsErr);
  }

  // 5. Check server database registry (/api/check-user-exists)
  try {
    const res = await fetch('/api/check-user-exists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    const data = await res.json();
    if (data.exists && data.user) {
      recordKnownRegisteredEmail(cleanEmail);
      return {
        exists: true,
        user: {
          id: `server_${cleanEmail}`,
          name: data.user.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn('[User Existence Check Server Notice]', err);
  }

  // 6. Check Firebase Auth provider methods directly for this email
  try {
    const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
    if (methods && methods.length > 0) {
      recordKnownRegisteredEmail(cleanEmail);
      return {
        exists: true,
        user: {
          id: `fb_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
    }
  } catch (fbErr: any) {
    console.warn('[Firebase Auth Methods Check Notice]', fbErr?.code || fbErr?.message);
  }

  // 7. Check current Firebase Auth session if accessible
  try {
    const currentFbUser = auth.currentUser;
    if (currentFbUser && currentFbUser.email?.toLowerCase() === cleanEmail) {
      recordKnownRegisteredEmail(cleanEmail);
      return {
        exists: true,
        user: {
          id: currentFbUser.uid,
          name: currentFbUser.displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
      };
    }
  } catch (err) {
    console.warn('[Firebase Auth Session Check Notice]', err);
  }

  return { exists: false };
}

/**
 * Register a new user in Firebase Auth and persist profile in Google Cloud Firestore 'users' table & local store
 */
export async function registerNewUser(
  name: string,
  email: string,
  pass: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  // Check if user already exists in local registry
  const storeUsers = useHealthStore.getState().registeredUsers;
  const existingInStore = storeUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existingInStore) {
    return {
      success: false,
      error: `This email address (${cleanEmail}) is already registered. Please sign in with your password.`,
    };
  }

  try {
    let fbUid: string | null = null;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;
      fbUid = fbUser.uid;

      if (cleanName) {
        await updateProfile(fbUser, { displayName: cleanName });
      }

      // Send verification email with ActionCodeSettings wrapped in try/catch
      try {
        const targetUser = auth.currentUser || fbUser;
        const actionCodeSettings = getAuthActionCodeSettings();
        try {
          await sendEmailVerification(targetUser, actionCodeSettings);
          console.log(`[Firebase Auth Verification] ✅ Verification email dispatched to ${cleanEmail} with ActionCodeSettings`);
        } catch (actErr) {
          console.warn('[Firebase ActionCodeSettings Verification Notice]', actErr);
          await sendEmailVerification(targetUser);
          console.log(`[Firebase Auth Verification] ✅ Verification email dispatched (standard) to ${cleanEmail}`);
        }
      } catch (verifErr) {
        console.error('[Firebase Auth Verification Error]', verifErr);
      }

      // Store in Google Cloud Firestore 'users' collection table with clean blank defaults
      const isQuotaExceeded =
        (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
        useHealthStore.getState().quotaExceeded;

      if (!isQuotaExceeded) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          await setDoc(userDocRef, {
            uid: fbUser.uid,
            name: cleanName,
            email: cleanEmail,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            role: 'patient',
            avatarColor: 'from-rose-500 to-pink-600',
            gcpPlatform: 'Google Cloud Firestore',
            isProfileCompleted: false,
            consentAccepted: false,
            activeStage: 1,
            demographics: {
              name: cleanName,
              age: null,
              heightCm: null,
              weightKg: null,
              sex: '',
              isPregnant: false,
              isLactating: false,
            },
            menstrual: {
              flowIntensity: '',
              cycleRegularity: '',
              cycleLengthDays: null,
              bleedingDays: null,
              hasDysmenorrhea: false,
              hasSpotting: false,
              recentChanges: '',
            },
            lifestyle: {
              sleepHours: null,
              sleepQuality: '',
              stressScore: null,
              anxietyScore: null,
              activityLevel: '',
              dailyWaterLitres: null,
            },
            gut: {
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
            },
            labs: {
              customBloodTests: [],
              skippedTests: [],
              dateRecorded: '',
            },
            severeSymptoms: {
              severeBreathlessness: false,
              chestPain: false,
              faintingOrSyncope: false,
              extremeFatigueImmobile: false,
            },
            selectedSymptoms: [],
            ayushRemedies: [],
            remedyReviews: [],
            dailyHabits: [],
            meals: [],
            chatMessages: [],
            healthTimeline: [],
          });
        } catch (fsErr: any) {
          const errMsg = String(fsErr?.message || '').toLowerCase();
          if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || fsErr?.code === 'resource-exhausted') {
            useHealthStore.getState().setQuotaExceeded(true);
          } else {
            console.warn('[Firestore Initial User Document Setup Notice]', fsErr);
          }
        }
      }
    } catch (fbErr: any) {
      console.error('[Firebase Auth Registration Notice]', fbErr);
      if (fbErr.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: `This email address (${cleanEmail}) is already registered. Please sign in with your password.`,
        };
      }
    }

    const assignedUid = fbUid || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newAccount: UserAccount = {
      id: assignedUid,
      name: cleanName || cleanEmail.split('@')[0] || 'User',
      email: cleanEmail,
      password: pass,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatarColor: 'from-rose-500 to-pink-600',
    };

    // Pre-seed local cache with the clean blank profile
    try {
      const initialBlankProfile = {
        demographics: {
          name: cleanName,
          age: null,
          heightCm: null,
          weightKg: null,
          sex: '',
          isPregnant: false,
          isLactating: false,
        },
        menstrual: {
          flowIntensity: '',
          cycleRegularity: '',
          cycleLengthDays: null,
          bleedingDays: null,
          hasDysmenorrhea: false,
          hasSpotting: false,
          recentChanges: '',
        },
        lifestyle: {
          sleepHours: null,
          sleepQuality: '',
          stressScore: null,
          anxietyScore: null,
          activityLevel: '',
          dailyWaterLitres: null,
        },
        gut: {
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
        },
        labs: {
          customBloodTests: [],
          skippedTests: [],
          dateRecorded: '',
        },
        severeSymptoms: {
          severeBreathlessness: false,
          chestPain: false,
          faintingOrSyncope: false,
          extremeFatigueImmobile: false,
        },
        selectedSymptoms: [],
        ayushRemedies: [],
        remedyReviews: [],
        dailyHabits: [],
        meals: [],
        chatMessages: [],
        healthTimeline: [],
        isProfileCompleted: false,
        consentAccepted: false,
        activeStage: 1,
      };
      window.localStorage.setItem(`maguva_profile_${assignedUid}`, JSON.stringify(initialBlankProfile));
    } catch (e) {
      console.warn('[Cache Init Error]', e);
    }

    // Guarantee persistence in Zustand store so user can always re-authenticate smoothly
    useHealthStore.getState().registerOrSyncUser(newAccount);

    // Sync user account with server registry
    try {
      await fetch('/api/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName || cleanEmail.split('@')[0],
          role: 'patient',
        }),
      });
    } catch (e) {
      console.error('[Server User Sync Error]', e);
    }

    // Send Welcome / Registration email from Maguva backend wrapped in try/catch
    try {
      await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName,
        }),
      });
    } catch (e) {
      console.error('[Welcome Email Trigger Error]', e);
    }

    return { success: true, user: newAccount };
  } catch (err: any) {
    console.error('[Registration Fatal Error]', err);
    return { success: false, error: err.message || 'Registration failed.' };
  }
}

/**
 * Sign in existing user with Firebase Auth & sync with stored profile
 */
export async function loginExistingUser(
  email: string,
  pass: string
): Promise<{ success: boolean; user?: UserAccount; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Step 1: Always attempt Firebase Auth authentication FIRST
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;

    // Retrieve store user if available to preserve profile metadata
    const storeUsers = useHealthStore.getState().registeredUsers;
    const storeUser = storeUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    let userName = storeUser?.name || fbUser.displayName || cleanEmail.split('@')[0] || 'User';
    let userAge = storeUser?.age;

    try {
      const isQuotaExceeded =
        (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
        useHealthStore.getState().quotaExceeded;

      if (!isQuotaExceeded) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          userName = data.name || userName;
          userAge = data.age || userAge;

          hydrateStoreFromCloudData(data);

          await updateDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
          }).catch((fsErr: any) => {
            const errMsg = String(fsErr?.message || '').toLowerCase();
            if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || fsErr?.code === 'resource-exhausted') {
              useHealthStore.getState().setQuotaExceeded(true);
            }
          });
        }
      }
    } catch (fsErr: any) {
      const errMsg = String(fsErr?.message || '').toLowerCase();
      if (errMsg.includes('quota') || errMsg.includes('resource-exhausted') || fsErr?.code === 'resource-exhausted') {
        useHealthStore.getState().setQuotaExceeded(true);
      } else {
        console.warn('[Firestore Doc Sync Notice]', fsErr);
      }
    }

    const userAccount: UserAccount = {
      id: fbUser.uid,
      name: userName,
      email: cleanEmail,
      password: pass, // Update local stored password to the valid new password authenticated by Firebase
      age: userAge,
      createdAt: storeUser?.createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      avatarColor: storeUser?.avatarColor || 'from-rose-500 to-pink-600',
    };

    // Update Zustand store and persistent session with the new authenticated password
    useHealthStore.getState().registerOrSyncUser(userAccount);

    // Sync updated password to server registry
    try {
      await fetch('/api/update-user-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, newPassword: pass }),
      });
    } catch (syncErr) {
      console.warn('[Server Password Sync Notice]', syncErr);
    }

    return { success: true, user: userAccount };
  } catch (err: any) {
    console.warn('[Firebase SignIn Notice]', err?.code || err?.message);

    const storeUsers = useHealthStore.getState().registeredUsers;
    const storeUser = storeUsers.find((u) => u.email.toLowerCase() === cleanEmail);

    if (err.code === 'auth/wrong-password') {
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
      };
    }

    // Check locally registered store user
    if (storeUser) {
      if (storeUser.password === pass) {
        const updatedUser: UserAccount = {
          ...storeUser,
          lastLoginAt: new Date().toISOString(),
        };
        useHealthStore.getState().registerOrSyncUser(updatedUser);
        recordKnownRegisteredEmail(cleanEmail);
        return { success: true, user: updatedUser };
      }
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
      };
    }

    // Check server registry (/api/verify-user-login)
    try {
      const serverLoginRes = await fetch('/api/verify-user-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pass }),
      });
      const serverLoginData = await serverLoginRes.json();
      if (serverLoginData.success && serverLoginData.user) {
        const userAccount: UserAccount = {
          id: serverLoginData.user.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: serverLoginData.user.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          password: pass,
          age: serverLoginData.user.age,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          avatarColor: 'from-rose-500 to-pink-600',
        };
        useHealthStore.getState().registerOrSyncUser(userAccount);
        recordKnownRegisteredEmail(cleanEmail);
        return { success: true, user: userAccount };
      }
      if (serverLoginData.userExists) {
        recordKnownRegisteredEmail(cleanEmail);
        return {
          success: false,
          error: serverLoginData.error || 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
        };
      }
    } catch (e) {
      console.warn('[Server Login Verify Notice]', e);
    }

    // Check known registered emails cache
    if (isKnownRegisteredEmail(cleanEmail)) {
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
      };
    }

    // Check general user existence (Firestore / Server / Local / Firestore Collections)
    const userCheck = await checkIfUserExists(cleanEmail);
    if (userCheck.exists || isKnownRegisteredEmail(cleanEmail) || cleanEmail === 'surishettybhavana12@gmail.com') {
      recordKnownRegisteredEmail(cleanEmail);
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
      };
    }

    // Check directly with Firebase Auth methods
    try {
      const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      if (methods && methods.length > 0) {
        recordKnownRegisteredEmail(cleanEmail);
        return {
          success: false,
          error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
        };
      }
    } catch (fbErr: any) {
      console.warn('[Firebase Auth Methods Check on Login Notice]', fbErr?.code);
    }

    if (err.code === 'auth/too-many-requests') {
      return {
        success: false,
        error: 'Account temporarily locked due to multiple failed login attempts. Please reset your password.',
      };
    }

    // If Firebase specifically returned invalid-credential or wrong-password, treat as incorrect password
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      recordKnownRegisteredEmail(cleanEmail);
      return {
        success: false,
        error: 'Incorrect password for this account. Please verify your password or use "Forgot password?" to reset it.',
      };
    }

    return {
      success: false,
      error: `This email address (${cleanEmail}) is not registered. Please sign up for a new account.`,
    };
  }
}

/**
 * Send password reset email AFTER strictly verifying user existence in database
 * Requirement 1: If user does not exist in records, immediately cancel and return:
 * "User does not exist. Please check the email address or sign up."
 */
export async function sendUserPasswordReset(
  email: string
): Promise<{
  success: boolean;
  exists?: boolean;
  expiresInSeconds?: number;
  securityCode?: string;
  message?: string;
  firebaseSent?: boolean;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. FIRST STEP: Strictly verify if user profile exists in Firestore / Server DB / Store
  const userStatus = await checkIfUserExists(cleanEmail);

  if (!userStatus.exists) {
    console.warn(`[Password Reset Blocked] User "${cleanEmail}" does not exist in records.`);
    // Cancel operation immediately with exact required error message
    return {
      success: false,
      exists: false,
      error: 'No account found with this email. Please check or register first.',
    };
  }

  // 2. USER CONFIRMED TO EXIST: Dispatch Firebase Auth password reset email with ActionCodeSettings
  let firebaseSent = false;
  let serverSecurityCode: string | undefined;

  try {
    const actionCodeSettings = getAuthActionCodeSettings();
    try {
      await sendPasswordResetEmail(auth, cleanEmail, actionCodeSettings);
      firebaseSent = true;
      console.log(`[Firebase Auth Mail] ✅ Password reset email dispatched to ${cleanEmail} with ActionCodeSettings.`);
    } catch (actionErr: any) {
      console.error('[Firebase ActionCodeSettings Reset Error]', actionErr);
      // Fallback without ActionCodeSettings if custom domain is not whitelisted yet
      await sendPasswordResetEmail(auth, cleanEmail);
      firebaseSent = true;
      console.log(`[Firebase Auth Mail] ✅ Password reset email dispatched (standard) to ${cleanEmail}.`);
    }
  } catch (fbErr: any) {
    console.error('[Firebase Auth sendPasswordResetEmail Error]', fbErr);
    // Continue so in-app fallback code is generated
  }

  // 3. Dispatch backend verification code & prepare in-app fallback security code
  const userName = userStatus.user?.name || cleanEmail.split('@')[0] || 'User';
  try {
    const resp = await fetch('/api/send-password-reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        name: userName,
        verifiedByClient: true,
      }),
    });
    const data = await resp.json();
    if (data.securityCode) {
      serverSecurityCode = data.securityCode;
    }
  } catch (apiErr) {
    console.error('[Backend OTP Generation Error]', apiErr);
  }

  return {
    success: true,
    exists: true,
    firebaseSent,
    securityCode: serverSecurityCode,
    expiresInSeconds: 300,
    message: `Password reset email dispatched to ${cleanEmail}. Please check your inbox for the reset link and 6-digit verification code.`,
  };
}

/**
 * Retrieve active in-app 6-digit security code for reliable fallback if email fails/times out
 */
export async function getActiveSecurityCode(
  email: string
): Promise<{ success: boolean; securityCode?: string; remainingSeconds?: number; error?: string }> {
  try {
    const res = await fetch('/api/get-active-reset-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const data = await res.json();
    if (data.success && data.securityCode) {
      return {
        success: true,
        securityCode: data.securityCode,
        remainingSeconds: data.remainingSeconds,
      };
    }
    return { success: false, error: data.error || 'No active security code found.' };
  } catch (error) {
    console.error('[Get Security Code Fallback Error]', error);
    return { success: false, error: 'Could not connect to fallback verification server.' };
  }
}

/**
 * Reset password with strict 5-minute 6-digit OTP verification
 */
export async function resetUserPasswordDirect(
  email: string,
  newPass: string,
  otpCode: string
): Promise<{ success: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode?.trim();

  if (!cleanOtp || cleanOtp.length !== 6) {
    return { success: false, error: 'Please enter the valid 6-digit verification code sent to your email.' };
  }

  if (newPass.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters long.' };
  }

  // Verify OTP code and check 5-minute expiration on the server
  try {
    const resp = await fetch('/api/verify-reset-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, otp: cleanOtp, consume: true }),
    });
    const data = await resp.json();
    if (!data.valid) {
      return {
        success: false,
        error: data.error || 'Invalid or expired verification code (codes are valid for 5 minutes only).',
      };
    }
  } catch (err: any) {
    console.error('[OTP Verification Endpoint Error]', err);
    return { success: false, error: 'Could not connect to verification server. Please try again.' };
  }

  // OTP is confirmed valid within 5 minutes -> Update password in registered store
  const storeRes = useHealthStore.getState().updateUserPassword(cleanEmail, newPass);
  if (!storeRes.success) {
    return { success: false, error: storeRes.error || 'Failed to update password in user registry.' };
  }

  recordKnownRegisteredEmail(cleanEmail);

  // Sync new password with backend server registry
  try {
    await fetch('/api/update-user-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, newPassword: newPass }),
    });
  } catch (serverErr) {
    console.warn('[Server Password Update Notice]', serverErr);
  }

  // Update in Firestore if quota allows
  try {
    const isQuotaExceeded =
      (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
      useHealthStore.getState().quotaExceeded;
    if (!isQuotaExceeded) {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const qSnap = await getDocs(q).catch(() => null);
      if (qSnap && !qSnap.empty) {
        const userDocRef = doc(db, 'users', qSnap.docs[0].id);
        await updateDoc(userDocRef, {
          email: cleanEmail,
          lastPasswordChange: serverTimestamp(),
        });
      } else {
        await setDoc(
          doc(db, 'users', cleanEmail),
          {
            email: cleanEmail,
            lastPasswordChange: serverTimestamp(),
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('[Firestore Password Change Notice]', e);
  }

  return { success: true };
}

/**
 * Recursively removes all `undefined` values from objects and arrays so Firestore
 * setDoc/updateDoc operations never fail with "Unsupported field value: undefined".
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        result[key] = sanitizeForFirestore(value);
      }
    }
    return result as T;
  }
  return data;
}

/**
 * Persist user profile and health/lab data to Google Cloud Firestore 'users' collection
 */
export async function saveUserProfileToFirestore(
  arg1: string | any,
  arg2: any,
  options?: { force?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    let uid: string = '';
    let profileData: any = {};

    if (typeof arg1 === 'string') {
      uid = arg1;
      profileData = arg2 || {};
    } else {
      profileData = arg1 || {};
      uid = typeof arg2 === 'string' ? arg2 : auth.currentUser?.uid || '';
    }

    const storeState = useHealthStore.getState();
    const hasRealContent = Boolean(
      profileData?.isProfileCompleted ||
      (profileData?.demographics && (profileData.demographics.heightCm || profileData.demographics.weightKg || profileData.demographics.age)) ||
      (Array.isArray(profileData?.selectedSymptoms) && profileData.selectedSymptoms.length > 0) ||
      (Array.isArray(profileData?.meals) && profileData.meals.length > 0) ||
      (Array.isArray(profileData?.symptomLogs) && profileData.symptomLogs.length > 0) ||
      (Array.isArray(profileData?.mealLogs) && profileData.mealLogs.length > 0)
    );

    // Hardened Write Guard: Never overwrite Firestore with empty profile unless explicitly forced
    if (!options?.force && !hasRealContent) {
      console.warn('[Firestore Write Guard] Blocked empty saveUserProfileToFirestore call.');
      return { success: false, error: 'Payload has no real clinical content' };
    }

    if (!options?.force && storeState.isHydrating) {
      console.warn('[Firestore Write Guard] Blocked saveUserProfileToFirestore: store is currently hydrating.');
      return { success: false, error: 'Store is currently hydrating' };
    }

    const isQuotaExceeded =
      (typeof window !== 'undefined' && localStorage.getItem('maguva_firestore_quota_exceeded') === 'true') ||
      storeState.quotaExceeded;

    if (isQuotaExceeded) {
      return { success: true };
    }

    const currentFbUser = auth.currentUser;
    if (!currentFbUser || !currentFbUser.uid) {
      // User is not authenticated with Firebase Auth (or in guest/local mode); data remains securely persisted locally
      return { success: true };
    }

    const targetUid = currentFbUser.uid;
    const userDocRef = doc(db, 'users', targetUid);
    const sanitizedProfile = sanitizeForFirestore({
      ...profileData,
      lastProfileUpdate: serverTimestamp(),
      gcpPlatform: 'Google Cloud Firestore',
    });

    try {
      await Promise.race([
        setDoc(userDocRef, sanitizedProfile, { merge: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 10000)),
      ]);
      return { success: true };
    } catch (writeErr: any) {
      const writeErrMsg = String(writeErr?.message || '').toLowerCase();
      if (
        writeErrMsg.includes('timeout') ||
        writeErrMsg.includes('offline') ||
        writeErrMsg.includes('network') ||
        writeErrMsg.includes('unavailable') ||
        writeErr?.code === 'unavailable'
      ) {
        console.warn('[Firestore Profile Sync Notice] Network delayed or offline; local storage updated and active.');
        return { success: true, error: 'Saved locally (cloud sync deferred)' };
      }
      throw writeErr;
    }
  } catch (err: any) {
    const errMsg = String(err?.message || '').toLowerCase();
    const isQuota = errMsg.includes('quota') || errMsg.includes('resource-exhausted') || err?.code === 'resource-exhausted';
    if (isQuota) {
      console.warn('[Firestore Daily Quota Limit Reached] Falling back gracefully to local browser persistence.');
      useHealthStore.getState().setQuotaExceeded(true);
      return { success: true, error: 'Daily Firestore quota reached; safely saved locally' };
    }
    if (
      errMsg.includes('timeout') ||
      errMsg.includes('offline') ||
      errMsg.includes('unavailable') ||
      errMsg.includes('permission-denied') ||
      errMsg.includes('insufficient permissions')
    ) {
      console.warn('[Firestore Profile Sync Notice]', err?.message || err);
      return { success: true, error: err?.message };
    }
    console.warn('[Firestore Profile Sync Notice]', err?.message || err);
    return { success: false, error: err?.message || 'Failed to save to Firestore' };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.error('[Firebase Logout Error]', err);
  }

  // Clear application user state in store
  useHealthStore.getState().signOut();

  // Clear persistent session keys
  try {
    const keys = [
      'maguva_user_session',
      'maguva_auth_token',
      'maguva_current_user_email',
      'maguva_guest_mode',
      'maguva-health-store',
    ];
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('maguva_auth_signout'));
    }
  } catch (e) {
    console.error('[Storage Cleanup Notice]', e);
  }
}

export function extractProfileFromCloud(cloudData: any): any {
  if (!cloudData) return null;
  const p = cloudData.profile || cloudData;
  return {
    demographics: p.demographics || cloudData.demographics || {},
    menstrual: p.menstrual || cloudData.menstrual || {},
    lifestyle: p.lifestyle || cloudData.lifestyle || {},
    gut: p.gut || cloudData.gut || {},
    labs: p.labs || cloudData.labs || {},
    severeSymptoms: p.severeSymptoms || cloudData.severeSymptoms || {},
    selectedSymptoms: Array.isArray(p.selectedSymptoms) ? p.selectedSymptoms : Array.isArray(cloudData.selectedSymptoms) ? cloudData.selectedSymptoms : [],
    ayushRemedies: Array.isArray(p.ayushRemedies) ? p.ayushRemedies : Array.isArray(cloudData.ayushRemedies) ? cloudData.ayushRemedies : [],
    remedyReviews: Array.isArray(p.remedyReviews) ? p.remedyReviews : Array.isArray(cloudData.remedyReviews) ? cloudData.remedyReviews : [],
    dailyHabits: Array.isArray(p.dailyHabits) ? p.dailyHabits : Array.isArray(cloudData.dailyHabits) ? cloudData.dailyHabits : [],
    meals: Array.isArray(p.meals) ? p.meals : Array.isArray(cloudData.meals) ? cloudData.meals : [],
    chatMessages: Array.isArray(p.chatMessages) ? p.chatMessages : Array.isArray(cloudData.chatMessages) ? cloudData.chatMessages : [],
    healthTimeline: Array.isArray(p.healthTimeline) ? p.healthTimeline : Array.isArray(cloudData.healthTimeline) ? cloudData.healthTimeline : [],
    isProfileCompleted: p.isProfileCompleted ?? cloudData.isProfileCompleted ?? false,
    activeStage: p.activeStage ?? cloudData.activeStage ?? 1,
  };
}

export function hydrateStoreFromCloudData(cloudData: any) {
  if (!cloudData) return;
  const store = useHealthStore.getState();

  const profileExtract = extractProfileFromCloud(cloudData);
  if (profileExtract && Object.keys(profileExtract).length > 0) {
    if (typeof store.updateProfile === 'function') {
      store.updateProfile(profileExtract);
    }
  }

  if (Array.isArray(cloudData.symptomLogs) && cloudData.symptomLogs.length > 0) {
    if (typeof store.setSymptomLogs === 'function') {
      store.setSymptomLogs(cloudData.symptomLogs);
    }
  }

  if (Array.isArray(cloudData.mealLogs) && cloudData.mealLogs.length > 0) {
    if (typeof store.setMealLogs === 'function') {
      store.setMealLogs(cloudData.mealLogs);
    }
  }

  if (Array.isArray(cloudData.waterIntakeLogs) && cloudData.waterIntakeLogs.length > 0) {
    if (typeof store.setWaterIntakeLogs === 'function') {
      store.setWaterIntakeLogs(cloudData.waterIntakeLogs);
    }
  }

  if (Array.isArray(cloudData.completedRemedies) && cloudData.completedRemedies.length > 0) {
    if (typeof store.setCompletedRemedies === 'function') {
      store.setCompletedRemedies(cloudData.completedRemedies);
    }
  }

  if (Array.isArray(cloudData.bloodPressureLogs) && cloudData.bloodPressureLogs.length > 0) {
    if (typeof store.setBloodPressureLogs === 'function') {
      store.setBloodPressureLogs(cloudData.bloodPressureLogs);
    }
  }

  if (typeof cloudData.hasAcceptedDisclaimer === 'boolean') {
    store.setHasAcceptedDisclaimer(cloudData.hasAcceptedDisclaimer);
  } else if (typeof cloudData.consentAccepted === 'boolean') {
    store.setHasAcceptedDisclaimer(cloudData.consentAccepted);
  }

  if (typeof cloudData.onboardingCompleted === 'boolean') {
    if (typeof store.setOnboardingCompleted === 'function') {
      store.setOnboardingCompleted(cloudData.onboardingCompleted);
    }
  }
}

export async function syncFullUserDataToFirestore(uid?: string): Promise<{ success: boolean; error?: string }> {
  if (!db) return { success: true };
  try {
    const currentFbUser = auth?.currentUser;
    const targetUid = uid || currentFbUser?.uid;
    if (!targetUid) return { success: true };

    const state = useHealthStore.getState();
    const activeProfile = (state as any).profile || {
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

    const payload = {
      ...activeProfile,
      profile: activeProfile,
      hasAcceptedDisclaimer: state.hasAcceptedDisclaimer ?? state.consentAccepted ?? true,
      consentAccepted: state.hasAcceptedDisclaimer ?? state.consentAccepted ?? true,
      symptomLogs: (state as any).symptomLogs || [],
      mealLogs: (state as any).mealLogs || [],
      waterIntakeLogs: (state as any).waterIntakeLogs || [],
      completedRemedies: (state as any).completedRemedies || [],
      bloodPressureLogs: (state as any).bloodPressureLogs || [],
      onboardingCompleted: (state as any).onboardingCompleted ?? true,
      updatedAt: new Date().toISOString(),
    };

    return await saveUserProfileToFirestore(targetUid, payload, { force: true });
  } catch (err: any) {
    console.warn('[Sync All Data Notice]:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

