import React from 'react';
import { ArrowRight, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';

export interface StageProgressionFooterProps {
  currentStageNumber?: number; // 0 for Dashboard, 1 to 7 for stages
  currentStageTitle?: string;
  nextTab: AppTab;
  nextStageTitle: string;
  nextStageDescription?: string;
  prevTab?: AppTab;
  prevStageTitle?: string;
}

// Ordered clinical stages pipeline with full descriptive names
const STAGE_ORDER: { stageNum: number; tab: AppTab; title: string; fullButtonTitle: string }[] = [
  { stageNum: 0, tab: 'dashboard', title: 'Dashboard', fullButtonTitle: 'Dashboard' },
  { stageNum: 1, tab: 'vector', title: 'Stage 1: Health Vector', fullButtonTitle: 'Stage 1 Health Vector & Lab Biomarkers' },
  { stageNum: 2, tab: 'risks', title: 'Stage 2: Deficiency Risk Engine', fullButtonTitle: 'Stage 2 Deficiency Risk Engine' },
  { stageNum: 3, tab: 'ayush', title: 'Stage 3: AYUSH & Traditional Remedies', fullButtonTitle: 'Stage 3 AYUSH & Traditional Remedies' },
  { stageNum: 4, tab: 'meals', title: 'Stage 4: Meal Planner', fullButtonTitle: 'Stage 4 Meal Planner & ICMR Foods' },
  { stageNum: 5, tab: 'tracker', title: 'Stage 5: Health Tracker', fullButtonTitle: 'Stage 5 Health & Lab Tracker' },
  { stageNum: 6, tab: 'sources', title: 'Stage 6: Medical Evidence', fullButtonTitle: 'Stage 6 Medical Guidelines & Evidence' },
  { stageNum: 7, tab: 'aiAgent', title: 'Stage 7: Ask Maguva AI', fullButtonTitle: 'Stage 7 Ask Maguva AI Companion' },
];

// Helper to generate full descriptive stage label for progression buttons
const getFormattedStageLabel = (title: string | undefined, tab: AppTab) => {
  const matched = STAGE_ORDER.find((s) => s.tab === tab);
  if (matched?.fullButtonTitle) {
    return matched.fullButtonTitle;
  }
  if (title) {
    return title.replace(/^Stage\s*(\d+)\s*:\s*/i, 'Stage $1 ').trim();
  }
  return tab;
};

export const StageProgressionFooter: React.FC<StageProgressionFooterProps> = ({
  currentStageNumber,
  nextTab,
  nextStageTitle,
  nextStageDescription,
  prevTab,
  prevStageTitle,
}) => {
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const activeTab = useHealthStore((state) => state.activeTab);

  const handleNavigate = (tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isDashboard = activeTab === 'dashboard' || currentStageNumber === 0;

  // Determine previous tab and title accurately based on pipeline order
  let effectivePrevTab: AppTab | null = null;
  let effectivePrevTitle: string = 'Back';

  if (!isDashboard) {
    if (prevTab) {
      effectivePrevTab = prevTab;
      effectivePrevTitle = prevStageTitle || `Previous Stage`;
    } else {
      // Find current index in stage order and select previous
      const currentIdx = STAGE_ORDER.findIndex(
        (s) => s.tab === activeTab || (currentStageNumber !== undefined && s.stageNum === currentStageNumber)
      );
      if (currentIdx > 0) {
        effectivePrevTab = STAGE_ORDER[currentIdx - 1].tab;
        effectivePrevTitle = STAGE_ORDER[currentIdx - 1].title;
      } else {
        effectivePrevTab = 'dashboard';
        effectivePrevTitle = 'Dashboard';
      }
    }
  }

  const stageLabel = getFormattedStageLabel(nextStageTitle, nextTab);

  return (
    <div
      id="stage-progression-footer"
      className="mt-3 rounded-xl bg-white p-1.5 sm:p-2 border border-[#FCE7F3] shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Left Option: Back to previous stage */}
        {!isDashboard && effectivePrevTab && (
          <button
            type="button"
            id="btn-footer-back-to-dashboard"
            onClick={() => handleNavigate(effectivePrevTab!)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 transition-all cursor-pointer shadow-2xs active:scale-98"
            title={`Go back to ${effectivePrevTitle}`}
          >
            {effectivePrevTab === 'dashboard' ? (
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span>Back to {effectivePrevTitle}</span>
          </button>
        )}

        {/* Right Option: Save & Continue Stage */}
        <button
          type="button"
          id="btn-footer-continue-protocol"
          onClick={() => handleNavigate(nextTab)}
          className={`flex items-center justify-between sm:justify-center gap-2.5 px-4 py-2 bg-gradient-to-r from-[#F43F5E] to-rose-600 hover:from-rose-600 hover:to-[#E11D48] text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer group active:scale-98 ${
            isDashboard ? 'w-full sm:w-auto ml-auto' : 'flex-1 sm:flex-initial sm:min-w-[220px]'
          }`}
        >
          <div className="text-left">
            <div className="text-[9px] text-rose-100 font-semibold tracking-wider uppercase leading-none">
              {isDashboard ? 'Begin Care Journey' : 'Next Protocol Stage'}
            </div>
            <div className="font-bold flex items-center gap-1 text-xs mt-0.5">
              <span>Save &amp; Continue: {stageLabel}</span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform shrink-0">
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>

      {/* Optional brief subtitle */}
      {nextStageDescription && (
        <p className="text-[10px] text-slate-500 text-center sm:text-right pt-1 px-1">
          {nextStageDescription}
        </p>
      )}
    </div>
  );
};


