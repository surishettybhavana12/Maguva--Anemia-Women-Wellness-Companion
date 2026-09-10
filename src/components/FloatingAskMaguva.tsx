import React from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';

export const FloatingAskMaguva: React.FC = () => {
  const activeTab = useHealthStore((state) => state.activeTab);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);

  // If already on the aiAgent tab, hide floating trigger to prevent clutter
  if (activeTab === 'aiAgent') {
    return null;
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-6 z-40">
      <button
        id="floating-ask-maguva-btn"
        onClick={() => setActiveTab('aiAgent')}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-[#F43F5E] to-rose-600 text-white shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-white/80"
        title="Ask Maguva AI Companion"
        aria-label="Ask Maguva AI Companion"
      >
        <div className="relative flex items-center justify-center">
          <MahuaEmblem size={28} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full" />
        </div>
      </button>
    </div>
  );
};
