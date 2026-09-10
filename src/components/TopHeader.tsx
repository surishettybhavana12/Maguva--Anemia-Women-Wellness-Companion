import React from 'react';
import {
  Menu,
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Bot,
  BookOpen,
  AlertOctagon,
  LogOut,
  LineChart,
  Cloud,
  CloudOff,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';
import { syncProfileWithCloud } from '../hooks/useAppSessionManager';
import { MahuaEmblem } from './MahuaEmblem';
import { logoutUser } from '../services/authService';

interface TopHeaderProps {
  onOpenMobileMenu: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ onOpenMobileMenu }) => {
  const activeTab = useHealthStore((state) => state.activeTab);
  const currentUser = useHealthStore((state) => state.currentUser);
  const demographics = useHealthStore((state) => state.demographics);
  const quotaExceeded = useHealthStore((state) => state.quotaExceeded);
  const isSessionHydrated = useHealthStore((state) => state.isSessionHydrated);
  const isSyncingWithCloud = useHealthStore((state) => state.isSyncingWithCloud);
  const lastCloudSyncTimestamp = useHealthStore((state) => state.lastCloudSyncTimestamp);
  const signOut = useHealthStore((state) => state.signOut);

  const syncWithCloud = () => syncProfileWithCloud(true);

  const { isTriageTriggered } = useComputedHealth();

  const tabTitles: Record<AppTab, { title: string; subtitle: string; icon: React.ReactNode }> = {
    dashboard: {
      title: 'Health Vitality Dashboard',
      subtitle: 'Overview of Hb, ferritin, BMI status & risk index',
      icon: <LayoutDashboard className="w-5 h-5 text-[#F43F5E]" />,
    },
    vector: {
      title: 'Health Vector & Lab Biomarkers',
      subtitle: 'WHO/ICMR standardized CBC, ferritin, and demographics',
      icon: <Activity className="w-5 h-5 text-[#F43F5E]" />,
    },
    risks: {
      title: 'Deficiency Risk Assessment',
      subtitle: 'Multi-risk computational scoring & mechanistic triggers',
      icon: <ShieldCheck className="w-5 h-5 text-[#F43F5E]" />,
    },
    ayush: {
      title: 'AYUSH & Traditional Remedies',
      subtitle: 'Evidence-informed Ayurvedic botanicals & safe posology',
      icon: <Sparkles className="w-5 h-5 text-[#F43F5E]" />,
    },
    meals: {
      title: 'Precision Micronutrient Meal Planner',
      subtitle: 'Enhance iron bioavailability & manage dietary inhibitors',
      icon: <UtensilsCrossed className="w-5 h-5 text-[#F43F5E]" />,
    },
    tracker: {
      title: 'Health & Biomarker Trajectory Tracker',
      subtitle: 'Track changes in blood tests, height, weight, and diet progress over time',
      icon: <LineChart className="w-5 h-5 text-[#F43F5E]" />,
    },
    sources: {
      title: 'Medical Guidelines & Evidence Base',
      subtitle: 'WHO LMS, ICMR-NIN 2020 RDA & Ministry of AYUSH publications',
      icon: <BookOpen className="w-5 h-5 text-[#F43F5E]" />,
    },
    aiAgent: {
      title: 'Ask Maguva AI Companion',
      subtitle: 'Instant clinical reasoning, food suggestions & wellness chat',
      icon: <Bot className="w-5 h-5 text-[#F43F5E]" />,
    },
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.dashboard;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#FCE7F3] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Description about Maguva */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            id="mobile-sidebar-toggle"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-[#F43F5E] hover:bg-[#FFF1F2] border border-slate-200 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* Maguva Official Logo */}
            <div className="shrink-0 flex items-center">
              <MahuaEmblem size={38} className="shadow-xs" />
            </div>

            <div className="min-w-0">
              {activeTab === 'dashboard' ? (
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#F43F5E] font-black tracking-wider">Maguva</span>
                  <span className="text-slate-400 font-normal">-</span>
                  <span className="text-slate-800">AI-Powered Anemia & Women's Wellness Companion</span>
                </h1>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[#F43F5E] font-black tracking-wider text-sm sm:text-base">Maguva</span>
                  <span className="text-slate-400 font-normal text-sm sm:text-base">-</span>
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-800 tracking-tight">
                    {currentInfo.title}
                  </h1>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Triage Alert, Scenario, Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">

          {/* Triage Alert if triggered */}
          {isTriageTriggered && (
            <div className="flex items-center gap-1.5 rounded-xl bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 text-xs font-bold animate-pulse">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Triage Alert</span>
            </div>
          )}

          {/* Interactive Sync Status Button */}
          <button
            type="button"
            id="top-sync-status-indicator"
            onClick={() => syncWithCloud()}
            disabled={isSyncingWithCloud}
            title={
              quotaExceeded
                ? 'Device Storage Mode (Firestore daily free quota reached; data is saved safely in browser storage)'
                : isSyncingWithCloud
                ? 'Synchronizing with Cloud Firestore...'
                : lastCloudSyncTimestamp
                ? `Cloud Synced (Last: ${lastCloudSyncTimestamp}). Click to sync/refresh now across devices.`
                : 'Cloud Synced: Active profile is synchronized with Firebase Firestore. Click to refresh.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all active:scale-95 cursor-pointer shadow-2xs ${
              quotaExceeded
                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {quotaExceeded ? (
              <>
                <CloudOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="hidden sm:inline">Offline Mode</span>
              </>
            ) : isSyncingWithCloud ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline font-semibold">Cloud Synced</span>
                <RefreshCw className="w-2.5 h-2.5 text-emerald-500 hover:text-emerald-700 ml-0.5 shrink-0" />
              </>
            )}
          </button>

          {/* User Profile Pill & Signout */}
          <div className="flex items-center gap-1.5 bg-white pl-2 pr-1.5 py-1 rounded-xl border border-[#FCE7F3] shadow-2xs">
            <button
              type="button"
              id="btn-top-open-profile-modal"
              onClick={() => useHealthStore.getState().setIsUserProfileModalOpen(true)}
              title="View Personal Health Profile & Calculations"
              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity cursor-pointer text-left"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center text-[10px] font-bold">
                {(currentUser?.name || demographics?.name || 'B').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-slate-800 max-w-[80px] truncate hidden sm:inline">
                {currentUser?.name?.split(' ')[0] || demographics?.name || 'User'}
              </span>
            </button>
            <button
              type="button"
              id="btn-top-view-profile"
              onClick={() => useHealthStore.getState().setIsUserProfileModalOpen(true)}
              className="hidden md:flex items-center gap-1 px-2 py-0.5 bg-[#FFF1F2] hover:bg-rose-100 text-[#F43F5E] rounded-lg text-[10px] font-extrabold border border-rose-200 transition-colors cursor-pointer"
            >
              <span>Profile</span>
            </button>
            <button
              type="button"
              id="btn-top-upload-labs"
              onClick={() => useHealthStore.getState().setProfileModalOpen(true)}
              className="hidden lg:flex items-center gap-1 px-2 py-0.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-[#F43F5E]" />
              <span>Edit Vitals</span>
            </button>
            <button
              type="button"
              id="btn-top-signout"
              onClick={async () => {
                await logoutUser();
              }}
              title="Sign out"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold text-slate-500 hover:text-rose-600 hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
