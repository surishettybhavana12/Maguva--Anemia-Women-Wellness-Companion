import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Stethoscope,
  UtensilsCrossed,
  Pill,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';
import { logoutUser } from '../services/authService';

export const DisclaimerView: React.FC = () => {
  const setHasAcceptedDisclaimer = useHealthStore((state) => state.setHasAcceptedDisclaimer);
  const acceptConsent = useHealthStore((state) => state.acceptConsent);
  const signOut = useHealthStore((state) => state.signOut);
  const currentUser = useHealthStore((state) => state.currentUser);
  const [isChecked, setIsChecked] = useState(false);

  const handleAgreeAndContinue = () => {
    if (isChecked) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('maguva_disclaimer_accepted', 'true');
        if (currentUser?.id) {
          window.sessionStorage?.setItem(`maguva_consent_accepted_${currentUser.id}`, 'true');
          window.localStorage?.setItem(`maguva_consent_accepted_${currentUser.id}`, 'true');
        }
      }
      setHasAcceptedDisclaimer(true);
      acceptConsent();
      if (currentUser?.id) {
        try {
          const raw = localStorage.getItem(`maguva_profile_${currentUser.id}`);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.consentAccepted = true;
            parsed.hasAcceptedDisclaimer = true;
            localStorage.setItem(`maguva_profile_${currentUser.id}`, JSON.stringify(parsed));
          }
        } catch {}
      }
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    signOut();
  };

  return (
    <div
      id="disclaimer-view-page"
      className="min-h-screen bg-[#FFF5F7] flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans"
    >
      {/* Background Decorative Glows */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-[#FCE7F3] rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#FFF1F2] rounded-full blur-3xl opacity-70 pointer-events-none" />

      <div className="w-full max-w-2xl relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-3xl shadow-sm border border-[#FCE7F3] mb-2.5">
            <MahuaEmblem size={48} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Maguva
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
            AI-Powered Anemia & Women’s Wellness Companion
          </p>
        </div>

        {/* Main Disclaimer Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-[#FCE7F3] relative space-y-5">
          
          {/* Welcome User Banner */}
          {currentUser && (
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
              <span className="text-slate-600">
                Logged in as <strong className="text-slate-900">{currentUser?.name || 'User'}</strong> ({currentUser?.email || ''})
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                <Sparkles className="w-3 h-3 text-[#F43F5E]" /> Safety Protocol
              </span>
            </div>
          )}

          {/* Primary Alert Header */}
          <div className="rounded-2xl bg-[#FFF1F2] p-4 sm:p-5 border border-[#FECDD3] flex items-start gap-3.5">
            <div className="p-2 bg-white rounded-xl shadow-xs text-[#F43F5E] shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6 text-[#F43F5E]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Mandatory Medical Disclaimer & Agreement
              </h2>
              <p className="text-xs sm:text-sm text-slate-800 font-medium mt-1 leading-relaxed">
                You must <strong className="text-rose-900 underline decoration-[#F43F5E] decoration-2">consult a doctor or healthcare professional</strong> before making any changes to your <strong>diet</strong>, <strong>daily habits</strong>, <strong>supplements</strong>, or <strong>medicines</strong>.
              </p>
            </div>
          </div>

          {/* 4 Core Pillars of the Medical Disclaimer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <Stethoscope className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Doctor Consultation</span>
                <span className="text-slate-600 leading-normal">
                  Always discuss nutrition plans, iron absorption boosters, and AYUSH remedies with your doctor before trying them.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <UtensilsCrossed className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Diet & Lifestyle Changes</span>
                <span className="text-slate-600 leading-normal">
                  All recipe calculations, absorption scores, and habit targets are educational guidelines, not clinical prescriptions.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <Pill className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Medicines & Supplements</span>
                <span className="text-slate-600 leading-normal">
                  Never alter, discontinue, or replace prescribed medications or clinical iron supplements without medical supervision.
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">Emergency Triage</span>
                <span className="text-slate-600 leading-normal">
                  In case of severe fatigue, dizziness, fainting, or breathlessness, seek immediate in-person medical attention.
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Tick Box */}
          <div className="pt-2">
            <label
              htmlFor="disclaimer-checkbox"
              className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                isChecked
                  ? 'bg-rose-50/80 border-[#F43F5E] shadow-xs'
                  : 'bg-slate-50 border-slate-200 hover:bg-[#FFF5F7] hover:border-[#FCE7F3]'
              }`}
            >
              <input
                type="checkbox"
                id="disclaimer-checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded-md text-[#F43F5E] focus:ring-[#F43F5E] accent-[#F43F5E] cursor-pointer shrink-0"
              />
              <div className="text-xs leading-relaxed text-slate-800">
                <span className="font-bold text-slate-900 block">
                  I acknowledge and agree to this Medical Disclaimer
                </span>
                <span className="text-slate-600 text-[11px] block mt-0.5">
                  I understand that I must consult a doctor before making any changes to my diet, habits, or medicines. I confirm that Maguva provides educational guidance and does not substitute for qualified clinical care.
                </span>
              </div>
            </label>
          </div>

          {/* Action Button Section */}
          <div className="space-y-3 pt-1">
            {isChecked ? (
              <button
                type="button"
                id="btn-agree-and-continue"
                onClick={handleAgreeAndContinue}
                className="w-full py-3.5 px-6 bg-[#F43F5E] hover:bg-[#E11D48] text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] animate-in fade-in zoom-in-95 duration-200"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm sm:text-base">Agree and Continue</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Please check the tick box above to unlock <strong>Agree and Continue</strong></span>
              </div>
            )}

            {/* Log out / Return option */}
            <div className="text-center pt-2">
              <button
                type="button"
                id="btn-disclaimer-logout"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out & Return to Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-[11px] text-slate-400 mt-4">
          Maguva Clinical Safety Standard • Grounded in WHO & ICMR-NIN 2020 RDA Guidelines
        </p>
      </div>
    </div>
  );
};
