import React from 'react';
import {
  LayoutDashboard,
  Activity,
  ShieldCheck,
  Sparkles,
  UtensilsCrossed,
  Bot,
  BookOpen,
  LogOut,
  X,
  ChevronRight,
  LineChart,
} from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';
import { logoutUser } from '../services/authService';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const activeTab = useHealthStore((state) => state.activeTab);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const currentUser = useHealthStore((state) => state.currentUser);
  const demographics = useHealthStore((state) => state.demographics);
  const signOut = useHealthStore((state) => state.signOut);

  const navItems: { id: AppTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'vector', label: 'Health Vector & Lab Biomarkers', icon: <Activity className="w-4 h-4" /> },
    { id: 'risks', label: 'Deficiency Risks', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'ayush', label: 'AYUSH Wellness', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'meals', label: 'Meal Planner & Foods', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'tracker', label: 'Health & Lab Tracker', icon: <LineChart className="w-4 h-4" />, badge: 'Progress' },
    { id: 'sources', label: 'Medical Guidelines', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'aiAgent', label: 'Ask Maguva AI', icon: <Bot className="w-4 h-4" />, badge: 'AI' },
  ];

  const handleTabClick = (tabId: AppTab) => {
    setActiveTab(tabId);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        id="app-left-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 sm:w-72 bg-white border-r border-[#FCE7F3] shadow-sm flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Section: Brand Logo & Mobile Close */}
        <div className="p-4 border-b border-[#FCE7F3]">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => handleTabClick('dashboard')}
            >
              <div className="transition-transform group-hover:scale-105">
                <MahuaEmblem size={40} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Maguva</h1>
                  <span className="text-[9px] font-bold tracking-wider uppercase text-[#F43F5E] bg-[#FFF1F2] border border-[#FCE7F3] px-1.5 py-0.5 rounded-full">
                    AI
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">
                  Anemia & Women's Wellness Companion
                </p>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Middle Section: Navigation Items In Vertical Line */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Navigation Menu
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-[#F43F5E] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-[#FFF1F2] hover:text-[#F43F5E]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 group-hover:text-[#F43F5E]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </div>

                {item.badge ? (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#FFF1F2] text-[#F43F5E] border border-[#FCE7F3]'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'opacity-100 text-white' : 'text-slate-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Section: User Account & Sign Out */}
        <div className="p-3 border-t border-[#FCE7F3] bg-[#FFFDFE]">
          <div className="p-2.5 rounded-2xl bg-white border border-[#FCE7F3] shadow-2xs space-y-2">
            <div
              onClick={() => useHealthStore.getState().setIsUserProfileModalOpen(true)}
              className="flex items-center justify-between gap-2 cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  {(currentUser?.name || demographics?.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate group-hover:text-[#F43F5E] transition-colors">
                    {currentUser?.name || demographics?.name || 'User Profile'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {currentUser?.email || ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                id="sidebar-signout-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  await logoutUser();
                }}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Vitals Capsule */}
            <div
              onClick={() => useHealthStore.getState().setIsUserProfileModalOpen(true)}
              className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold text-slate-600 cursor-pointer hover:text-rose-700 transition-colors"
            >
              <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded-md border border-rose-100">
                {demographics.age || '--'}y • {demographics.sex === 'male' ? 'Male' : 'Female'}
              </span>
              <span>
                {demographics.heightCm || 162}cm / {demographics.weightKg || 54}kg
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
