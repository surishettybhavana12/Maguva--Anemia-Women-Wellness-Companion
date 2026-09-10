import React from 'react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';

export const MobileBottomNav: React.FC = () => {
  const activeTab = useHealthStore((state) => state.activeTab);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);

  const isActive = activeTab === 'aiAgent';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#FCE7F3] shadow-lg px-4 py-2 flex items-center justify-center">
      <button
        id="mobile-nav-aiAgent"
        onClick={() => setActiveTab('aiAgent')}
        className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#F43F5E] to-rose-600 text-white font-bold text-xs shadow-md active:scale-95 transition-transform cursor-pointer"
      >
        <MahuaEmblem size={22} />
        <span>Ask Maguva AI</span>
      </button>
    </div>
  );
};
