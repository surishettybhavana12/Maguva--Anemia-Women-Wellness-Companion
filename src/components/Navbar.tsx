import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  GitFork,
  Sparkles,
  UtensilsCrossed,
  Bot,
  AlertOctagon,
  BookOpen,
  LogOut,
  User,
} from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';
import { MahuaEmblem } from './MahuaEmblem';

export const Navbar: React.FC = () => {
  const activeTab = useHealthStore((state) => state.activeTab);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const activeStage = useHealthStore((state) => state.activeStage);
  const setActiveStage = useHealthStore((state) => state.setActiveStage);
  const currentUser = useHealthStore((state) => state.currentUser);
  const demographics = useHealthStore((state) => state.demographics);
  const signOut = useHealthStore((state) => state.signOut);
  
  const { isTriageTriggered } = useComputedHealth();

  const stageLabels: Record<number, string> = {
    1: 'Stage 1: Synthesis',
    2: 'Stage 2: Gut Opt',
    3: 'Stage 3: AYUSH',
    4: 'Stage 4: Meals',
  };

  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vector', label: 'Health Vector & Labs', icon: <Activity className="w-4 h-4" /> },
    { id: 'risks', label: 'Deficiency Risks', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'ayush', label: 'AYUSH Wellness', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'meals', label: 'Meal Planner', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'sources', label: 'Medical Sources', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'aiAgent', label: 'Ask Maguva', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#FCE7F3] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between w-full lg:w-auto gap-3">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setActiveTab('dashboard')}
            >
              <MahuaEmblem size={44} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">Maguva</h1>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#F43F5E] bg-[#FFF1F2] border border-[#FCE7F3] px-2 py-0.5 rounded-full">
                    AI Wellness
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium hidden sm:block">
                  Anemia & Women’s Micronutrient Vitality
                </p>
              </div>
            </div>

            {/* Care Stage Pill Indicator */}
            <div className="flex items-center gap-2">
              {isTriageTriggered ? (
                <div className="flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 border border-red-200 px-3 py-1 text-xs font-bold animate-pulse">
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Triage Alert</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-[#FFF5F7] p-1 rounded-full border border-[#FCE7F3]">
                  {[1, 2, 3, 4].map((stg) => {
                    const stageTabs: AppTab[] = ['vector', 'risks', 'ayush', 'meals'];
                    return (
                      <button
                        key={stg}
                        onClick={() => {
                          setActiveStage(stg as any);
                          setActiveTab(stageTabs[stg - 1]);
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                          activeStage === stg
                            ? 'bg-[#F43F5E] text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-[#FCE7F3]'
                        }`}
                        title={stageLabels[stg]}
                      >
                        S{stg}
                      </button>
                    );
                  })}
                  <span className="text-[11px] font-medium text-slate-600 px-2 hidden md:inline">
                    {stageLabels[activeStage]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Header Controls: User Profile / Logout */}
          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {/* User Profile Pill & Sign Out */}
            <div className="flex items-center gap-2 bg-white pl-2 pr-1.5 py-1 rounded-xl border border-[#FCE7F3] shadow-xs">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center text-[10px] font-bold">
                {(currentUser?.name || demographics?.name || 'B').charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                {currentUser?.name?.split(' ')[0] || demographics?.name || 'User'}
              </span>
              <button
                type="button"
                id="btn-navbar-signout"
                onClick={() => {
                  if (window.confirm('Are you sure you want to sign out?')) {
                    signOut();
                  }
                }}
                title="Sign out of Maguva"
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <nav
          id="main-navigation-tabs"
          className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-t border-slate-100 pt-2"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#F43F5E] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#FFF5F7]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
