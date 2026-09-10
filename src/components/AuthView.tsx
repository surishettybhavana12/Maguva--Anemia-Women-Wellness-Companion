import React, { useState, useEffect } from 'react';
import {
  Mail,
  Lock,
  User,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Zap,
  Database,
  Cloud,
  Send,
  Check,
  Clock,
  RotateCcw,
  Copy,
  X,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';
import {
  registerNewUser,
  loginExistingUser,
  sendUserPasswordReset,
  resetUserPasswordDirect,
  checkIfUserExists,
  getActiveSecurityCode,
} from '../services/authService';

export const AuthView: React.FC = () => {
  // Navigation mode: 'signin' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // 5-Minute OTP Expiration Timer State (300 seconds)
  const [otpTimeLeft, setOtpTimeLeft] = useState(300);

  // In-App Security Code Fallback Modal state
  const [isFallbackModalOpen, setIsFallbackModalOpen] = useState(false);
  const [fallbackSecurityCode, setFallbackSecurityCode] = useState<string | null>(null);
  const [isCopiedCode, setIsCopiedCode] = useState(false);

  // UI status states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Store actions
  const setUserAccount = useHealthStore((state) => state.setUserAccount);
  const registeredUsers = useHealthStore((state) => state.registeredUsers);

  // Sync registered users with server on view load
  useEffect(() => {
    if (registeredUsers && registeredUsers.length > 0) {
      fetch('/api/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: registeredUsers }),
      }).catch((e) => console.warn('User sync notice:', e));
    }
  }, [registeredUsers]);

  // 5-Minute Countdown Timer for OTP Validity
  useEffect(() => {
    let timer: any = null;
    if (authMode === 'forgot' && resetStep === 'verify' && otpTimeLeft > 0) {
      timer = setInterval(() => {
        setOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authMode, resetStep, otpTimeLeft]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: 'None', score: 0, color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { label: 'Weak (use uppercase, number, or symbol)', score: 1, color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { label: 'Good (add symbols for strong security)', score: 2, color: 'bg-amber-500' };
    return { label: 'Strong', score: 3, color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(password || newPassword);

  // Email Validation Helper
  const validateEmailAddress = (emailStr: string): { isValid: boolean; error?: string; hasAt: boolean; endsWithDotCom: boolean } => {
    const clean = emailStr.trim();
    const hasAt = clean.includes('@');
    const endsWithDotCom = clean.toLowerCase().endsWith('.com');

    if (!clean) {
      return { isValid: false, error: 'Please enter your email address.', hasAt: false, endsWithDotCom: false };
    }
    if (!hasAt) {
      return { isValid: false, error: "Email must include the '@' symbol (e.g. name@gmail.com).", hasAt: false, endsWithDotCom };
    }
    const parts = clean.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { isValid: false, error: "Please enter a valid email format with username before '@' and domain after '@'.", hasAt: true, endsWithDotCom };
    }
    // Reject invalid domain extensions (missing dot or less than 2 letters TLD)
    const domainPart = parts[1];
    if (!domainPart.includes('.') || domainPart.split('.').pop()!.length < 2) {
      return { isValid: false, error: "Please enter a valid domain extension (e.g. .com, .org, .net, .in).", hasAt: true, endsWithDotCom: false };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
    if (!emailRegex.test(clean)) {
      return { isValid: false, error: "Please enter a valid email format (e.g. user@gmail.com).", hasAt: true, endsWithDotCom };
    }
    return { isValid: true, hasAt: true, endsWithDotCom };
  };

  const emailStatus = validateEmailAddress(email);

  // 1. Handle Existing User Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validate email input format before initiating sign-in
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setErrorMsg("Email must include the '@' symbol (e.g. user@gmail.com).");
      return;
    }

    const emailCheck = validateEmailAddress(cleanEmail);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.error || "Please enter a valid email format with '@' and a valid domain extension (e.g. user@gmail.com).");
      return;
    }

    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginExistingUser(cleanEmail, password);
      setIsLoading(false);
      if (res.success && res.user) {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(`maguva_consent_accepted_${res.user.id}`);
        }
        setUserAccount(res.user);
        useHealthStore.setState({ consentAccepted: false });
        return;
      }
      setErrorMsg(res.error || 'Invalid email or password. Please check your credentials or register.');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to sign in.');
    }
  };

  // 2. Handle New User Registration
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }

    const emailCheck = validateEmailAddress(cleanEmail);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.error || "Email must include '@' and end with '.com'");
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await registerNewUser(cleanName, cleanEmail, password);
      setIsLoading(false);
      if (res.success && res.user) {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem(`maguva_consent_accepted_${res.user.id}`);
        }
        setUserAccount(res.user);
        useHealthStore.setState({ consentAccepted: false });
        return;
      }
      setErrorMsg(res.error || 'Registration failed. Please try again.');
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Registration failed.');
    }
  };

  // 3. Handle Password Reset Request (Verifies user existence)
  const handleForgotPasswordRequest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const emailCheck = validateEmailAddress(cleanEmail);
    if (!emailCheck.isValid) {
      setErrorMsg(emailCheck.error || "Email must include '@' and end with '.com'");
      return;
    }

    setIsLoading(true);

    try {
      const res = await sendUserPasswordReset(cleanEmail);
      setIsLoading(false);
      if (res.success) {
        let count = 3;
        setSuccessMsg(`Password reset link has been sent to your email address. Please check your inbox. (Redirecting in ${count}... 2... 1...)`);
        const countdownTimer = setInterval(() => {
          count -= 1;
          if (count > 0) {
            setSuccessMsg(`Password reset link has been sent to your email address. Please check your inbox. (Redirecting in ${count}... )`);
          } else {
            clearInterval(countdownTimer);
            setAuthMode('signin');
            setResetStep('request');
            setSuccessMsg(null);
          }
        }, 1000);
      } else {
        // UI notification when user does not exist
        setErrorMsg(res.error || 'No account found with this email. Please check or register first.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to verify account or dispatch reset email.');
    }
  };

  // Open In-App Security Code Fallback Modal
  const handleOpenFallbackModal = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (fallbackSecurityCode) {
      setIsFallbackModalOpen(true);
      return;
    }
    setIsLoading(true);
    const codeRes = await getActiveSecurityCode(cleanEmail);
    setIsLoading(false);
    if (codeRes.success && codeRes.securityCode) {
      setFallbackSecurityCode(codeRes.securityCode);
      if (codeRes.remainingSeconds) {
        setOtpTimeLeft(codeRes.remainingSeconds);
      }
      setIsFallbackModalOpen(true);
    } else {
      setErrorMsg(codeRes.error || 'No active security code found. Please click "Resend Code" to generate a fresh code.');
    }
  };

  // Auto-Fill In-App Security Code
  const handleAutoFillSecurityCode = () => {
    if (fallbackSecurityCode) {
      setOtpCode(fallbackSecurityCode);
      setIsFallbackModalOpen(false);
      setSuccessMsg('✅ Security code auto-filled! Please enter your new password below.');
    }
  };

  // 4. Handle Password Reset Verification & Submission
  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otpCode.trim();

    if (otpTimeLeft <= 0) {
      setErrorMsg('⚠️ This verification code has expired (codes are valid for 5 minutes only). Please click "Resend Code" to receive a new code.');
      return;
    }

    if (!cleanOtp || cleanOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit security code received in your email.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await resetUserPasswordDirect(cleanEmail, newPassword, cleanOtp);
      setIsLoading(false);
      if (res.success) {
        setSuccessMsg('✅ Password successfully updated! You can now sign in with your new password.');
        setPassword(newPassword);
        setAuthMode('signin');
        setResetStep('request');
        setOtpCode('');
      } else {
        setErrorMsg(res.error || 'Failed to update password. Please check your verification code.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to update password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-[#FCE7F3] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#FFF1F2] rounded-full blur-3xl opacity-70 pointer-events-none" />

      {/* Main Authentication & Welcome Container */}
      <div className="w-full max-w-xl relative z-10 space-y-3.5">
        
        {/* Sleek Brand Header with Emblem */}
        <div className="text-center pb-1 flex flex-col items-center justify-center">
          <div className="p-3 bg-white rounded-3xl shadow-sm border border-[#FCE7F3] inline-flex items-center justify-center mb-2">
            <MahuaEmblem size={52} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Maguva
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Anemia and Women Wellness Companion
          </p>
        </div>

        {/* Google Cloud Platform Cloud Backend Indicator */}
        <div className="px-4 py-2.5 bg-white/90 backdrop-blur-xs rounded-2xl border border-[#FCE7F3] shadow-2xs flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Cloud className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>Cloud Database:</span>
            <span className="font-bold text-slate-800">Google Firestore (<code>users</code>)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            <span>Cloud Sync Active</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-[#FCE7F3] relative space-y-4">
          
          {/* Header Title per Active Mode */}
          <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {authMode === 'signin' && 'Sign in to Maguva'}
                {authMode === 'signup' && 'Create New User Account'}
                {authMode === 'forgot' && (resetStep === 'request' ? 'Reset Your Password' : 'Enter Security Code & Set Password')}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {authMode === 'signin' && 'Enter your email and password to access your health dashboard.'}
                {authMode === 'signup' && 'Register your profile to receive a welcome email & sync to Cloud Firestore.'}
                {authMode === 'forgot' &&
                  (resetStep === 'request'
                    ? 'Enter your registered email to verify your account and receive a reset code.'
                    : `Enter the 6-digit verification code sent for ${email}`)}
              </p>
            </div>
            <div className="p-2.5 bg-[#FFF1F2] text-[#F43F5E] rounded-2xl border border-[#FCE7F3] shrink-0">
              {authMode === 'signin' && <Lock className="w-4 h-4" />}
              {authMode === 'signup' && <User className="w-4 h-4" />}
              {authMode === 'forgot' && <KeyRound className="w-4 h-4" />}
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div id="auth-error-banner" className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-900 animate-in fade-in shadow-2xs">
              <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="font-medium leading-relaxed">{errorMsg}</div>

                {/* Contextual Action: Not registered */}
                {(errorMsg.toLowerCase().includes('not registered') || errorMsg.toLowerCase().includes('no account found')) && (
                  <div className="pt-0.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setAuthMode('signup');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#F43F5E] hover:bg-[#E11D48] px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register this email now</span>
                    </button>
                  </div>
                )}

                {/* Contextual Action: Incorrect password */}
                {errorMsg.toLowerCase().includes('incorrect password') && (
                  <div className="pt-0.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setAuthMode('forgot');
                        setResetStep('request');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E11D48] bg-rose-100 hover:bg-rose-200 px-3 py-1.5 rounded-xl border border-rose-300/80 transition-all cursor-pointer active:scale-95"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Reset password via mail link</span>
                    </button>
                  </div>
                )}

                {/* Contextual Action: Already registered */}
                {errorMsg.toLowerCase().includes('already registered') && (
                  <div className="pt-0.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setAuthMode('signin');
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Sign In with your password</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div id="auth-success-banner" className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in leading-relaxed">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{successMsg}</span>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. SIGN IN VIEW */}
          {/* ========================================================================= */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} noValidate className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="signin-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maguvaabc.gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E] transition-all"
                  />
                </div>
                {email.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] select-none animate-in fade-in duration-200">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                        emailStatus.hasAt
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emailStatus.hasAt ? '✓ Contains @' : '✕ Missing @'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                        emailStatus.endsWithDotCom
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emailStatus.endsWithDotCom ? '✓ Ends with .com' : '✕ Ends with .com'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signin-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Options Row: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#F43F5E] focus:ring-[#F43F5E] accent-[#F43F5E]"
                  />
                  <span className="text-xs text-slate-600">Remember me</span>
                </label>

                <button
                  type="button"
                  id="btn-forgot-password-link"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setResetStep('request');
                    setAuthMode('forgot');
                  }}
                  className="text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-signin-submit"
                disabled={isLoading}
                className="w-full mt-1 py-3 px-4 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Register if new user link */}
              <div className="text-center pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  New to Maguva?{' '}
                  <button
                    type="button"
                    id="link-register-new-user"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('signup');
                    }}
                    className="font-bold text-[#F43F5E] hover:underline cursor-pointer ml-1"
                  >
                    Register if new user
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 2. SIGN UP VIEW */}
          {/* ========================================================================= */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} noValidate className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="signup-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pooja Sharma"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    id="signup-email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maguvaabc.gmail.com"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  />
                </div>
                {email.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] select-none animate-in fade-in duration-200">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                        emailStatus.hasAt
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emailStatus.hasAt ? '✓ Contains @' : '✕ Missing @'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                        emailStatus.endsWithDotCom
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {emailStatus.endsWithDotCom ? '✓ Ends with .com' : '✕ Ends with .com'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Set Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signup-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">Password Strength</span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                        <div className={`h-full ${pwdStrength.score >= 1 ? pwdStrength.color : 'bg-slate-200'} flex-1`} />
                        <div className={`h-full ${pwdStrength.score >= 2 ? pwdStrength.color : 'bg-slate-200'} flex-1`} />
                        <div className={`h-full ${pwdStrength.score >= 3 ? pwdStrength.color : 'bg-slate-200'} flex-1`} />
                      </div>
                    </div>
                    <p className="text-[10px] leading-tight text-slate-600 font-medium">
                      {pwdStrength.label}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signup-confirm-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                  />
                </div>
              </div>

              {/* Cloud Table Storage & Welcome Mail Note */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
                <Database className="w-3.5 h-3.5 text-[#F43F5E] shrink-0 mt-0.5" />
                <span>
                  Saves your health profile to Google Cloud Firestore (<code>users/{'{uid}'}</code>) and dispatches a personalized welcome email.
                </span>
              </div>

              <button
                type="submit"
                id="btn-signup-submit"
                disabled={isLoading}
                className="w-full mt-1 py-3 px-4 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Link back to Sign in */}
              <div className="text-center pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    id="link-back-to-signin"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setAuthMode('signin');
                    }}
                    className="font-bold text-[#F43F5E] hover:underline cursor-pointer ml-1"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* 3. FORGOT PASSWORD VIEW */}
          {/* ========================================================================= */}
          {authMode === 'forgot' && (
            <div className="space-y-3.5">
              {resetStep === 'request' ? (
                <form onSubmit={handleForgotPasswordRequest} noValidate className="space-y-3.5">
                  <div className="p-3 bg-[#FFF5F7] rounded-2xl border border-[#FCE7F3] text-xs text-slate-700 leading-relaxed">
                    <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#F43F5E]" />
                      Firebase Auth Password Reset Delivery
                    </p>
                    Enter your registered email address. Maguva uses Google Firebase Auth's free mail service (<code>noreply@ai-studio-maguva-567e2340-2f9a-4b28-b5a0-96fa84d0f4ba.firebaseapp.com</code>) to send a direct password reset link to your email inbox.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Registered Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        id="forgot-email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. maguvaabc.gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                      />
                    </div>
                    {email.length > 0 && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] select-none animate-in fade-in duration-200">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                            emailStatus.hasAt
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {emailStatus.hasAt ? '✓ Contains @' : '✕ Missing @'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-all ${
                            emailStatus.endsWithDotCom
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {emailStatus.endsWithDotCom ? '✓ Ends with .com' : '✕ Ends with .com'}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    id="btn-forgot-submit"
                    disabled={isLoading}
                    className="w-full mt-1 py-3 px-4 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePasswordResetSubmit} className="space-y-3.5">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900">
                        Verification Code Dispatched to: <span className="font-mono">{email}</span>
                      </p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Please check your email inbox and enter the 6-digit security code below.
                      </p>
                    </div>
                  </div>

                  {/* 5-Minute OTP Timer Indicator */}
                  <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-colors ${
                    otpTimeLeft > 60
                      ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                      : otpTimeLeft > 0
                      ? 'bg-rose-50 border-rose-200 text-rose-900 animate-pulse'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className={`w-3.5 h-3.5 ${otpTimeLeft > 60 ? 'text-amber-600' : otpTimeLeft > 0 ? 'text-[#F43F5E]' : 'text-slate-500'}`} />
                      <span>Code Expiration:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {otpTimeLeft > 0 ? (
                        <span className={`font-mono font-black text-sm ${otpTimeLeft <= 60 ? 'text-[#E11D48]' : 'text-amber-800'}`}>
                          {formatTime(otpTimeLeft)} remaining
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-700">Code Expired</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleForgotPasswordRequest()}
                        disabled={isLoading}
                        className="text-xs font-bold text-[#F43F5E] hover:underline flex items-center gap-1 cursor-pointer ml-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Resend</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Enter 6-Digit Security Code
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        id="reset-otp-code"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Type 6 digits from email..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base tracking-widest font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                      />
                    </div>
                    {otpTimeLeft <= 0 && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Code has expired. Click "Resend" above to get a fresh 5-minute code.
                      </p>
                    )}
                  </div>

                  {/* In-App Security Code Fallback Trigger */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-800 block">Email delayed or spam-filtered?</span>
                      <span className="text-[11px] text-slate-500">Access your active 6-digit code directly</span>
                    </div>
                    <button
                      type="button"
                      id="btn-open-fallback-security-code"
                      onClick={handleOpenFallbackModal}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#F43F5E]" />
                      <span>View Code</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="reset-new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="reset-confirm-new-password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    id="btn-update-password-submit"
                    disabled={isLoading || otpTimeLeft <= 0 || otpCode.length !== 6}
                    className="w-full mt-1 py-3 px-4 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Update Password & Proceed to Sign In</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setResetStep('request')}
                      className="text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                    >
                      ← Change Email
                    </button>
                    <button
                      type="button"
                      onClick={() => handleForgotPasswordRequest()}
                      className="text-[#F43F5E] font-bold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resend Code</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  id="link-forgot-back-to-signin"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setAuthMode('signin');
                  }}
                  className="text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer"
                >
                  ← Back to Sign In
                </button>
                <button
                  type="button"
                  id="link-forgot-to-signup"
                  onClick={() => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    setAuthMode('signup');
                  }}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer"
                >
                  Register if new user →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security, Privacy & Google Cloud Badges */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-slate-500 text-[11px]">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Cloud Auth</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>GCP Firestore Storage</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <HeartPulse className="w-3.5 h-3.5 text-[#F43F5E]" />
            <span>WHO & ICMR Grounded</span>
          </div>
        </div>
      </div>

      {/* In-App 6-Digit Security Code Fallback Modal */}
      {isFallbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div
            id="modal-security-code-fallback"
            className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-rose-100 relative animate-in fade-in zoom-in duration-200"
          >
            {/* Close button */}
            <button
              type="button"
              id="btn-close-fallback-modal"
              onClick={() => setIsFallbackModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-rose-50 text-[#F43F5E] rounded-2xl">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">In-App Security Code</h3>
                <p className="text-xs text-slate-500">Verified Fallback for Password Reset</p>
              </div>
            </div>

            {/* Modal Body */}
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              If your email service provider is delaying messages or filtering spam, here is your official 6-digit verification code generated for <strong className="text-slate-900">{email}</strong>:
            </p>

            {/* Big 6-Digit Code Display */}
            <div className="p-4 bg-slate-900 rounded-2xl text-center my-3 relative overflow-hidden">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                Active Verification OTP (Valid for 5 Mins)
              </span>
              <div className="text-3xl font-mono font-black text-white tracking-[0.35em] pl-2">
                {fallbackSecurityCode || '------'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-rose-400" />
                <span>{otpTimeLeft > 0 ? `${formatTime(otpTimeLeft)} remaining` : 'Expired'}</span>
              </div>
            </div>

            {/* Actions: Auto-fill or Copy */}
            <div className="space-y-2 mt-4">
              <button
                type="button"
                id="btn-autofill-security-code"
                onClick={handleAutoFillSecurityCode}
                className="w-full py-2.5 px-4 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Auto-Fill Code & Continue</span>
              </button>

              <button
                type="button"
                id="btn-copy-security-code"
                onClick={() => {
                  if (fallbackSecurityCode) {
                    navigator.clipboard.writeText(fallbackSecurityCode);
                    setIsCopiedCode(true);
                    setTimeout(() => setIsCopiedCode(false), 2000);
                  }
                }}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isCopiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy 6-Digit Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
