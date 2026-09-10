import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';

export const EmergencyBanner: React.FC = () => {
  const { isTriageTriggered } = useComputedHealth();
  const labs = useHealthStore((state) => state.labs);
  const severeSymptoms = useHealthStore((state) => state.severeSymptoms);

  if (!isTriageTriggered) return null;

  const triggerReasons: string[] = [];
  if (labs.hemoglobin !== undefined && labs.hemoglobin < 7.0) {
    triggerReasons.push(`Critically Low Hemoglobin (${labs.hemoglobin} g/dL < 7.0 g/dL WHO Severe Anemia Threshold)`);
  }
  if (severeSymptoms.severeBreathlessness) {
    triggerReasons.push('Severe Breathlessness at Rest / Minimal Exertion');
  }
  if (severeSymptoms.faintingOrSyncope) {
    triggerReasons.push('Syncope, Blackouts, or Sudden Fainting Episodes');
  }
  if (severeSymptoms.chestPain) {
    triggerReasons.push('Chest Pain, Tightness, or Acute Cardiac Palpitations');
  }
  if (severeSymptoms.extremeFatigueImmobile) {
    triggerReasons.push('Extreme Prostrating Fatigue Rendering Immobility');
  }

  return (
    <div
      id="emergency-triage-banner"
      className="mb-6 rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-5 sm:p-6 shadow-xl border-2 border-red-300"
    >
      <div className="flex flex-col gap-4">
        {/* Top Header: Side-by-side Tabs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-white text-red-700 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider shadow-xs">
            <AlertOctagon className="w-4 h-4 text-red-600" />
            <span>Emergency Medical Triage Directive</span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-950/40 text-rose-100 border border-white/30 rounded-full px-3.5 py-1 text-xs font-extrabold uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-300" />
            <span>Immediate Action Advised</span>
          </div>
        </div>

        {/* Horizontal Description */}
        <div>
          <p className="text-sm sm:text-base font-bold text-white tracking-tight leading-relaxed">
            Critical red-flag symptoms detected: Your profile exhibits parameters requiring immediate professional clinical evaluation
          </p>
        </div>

        {/* Critical Symptoms Tags */}
        {triggerReasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-rose-200 uppercase tracking-wider">
              Critical Symptoms:
            </span>
            {triggerReasons.map((reason, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-xl bg-black/35 px-3 py-1 text-xs font-semibold text-white border border-white/25 shadow-2xs"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* Numbers at Bottom */}
        <div className="pt-3 border-t border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2 border border-white/20">
            <span className="text-rose-200 font-medium">For emergency services:</span>
            <span className="text-white font-black text-sm sm:text-base tracking-wider">112</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 rounded-xl px-4 py-2 border border-white/20">
            <span className="text-rose-200 font-medium">For ambulance/medical helpline:</span>
            <span className="text-white font-black text-sm sm:text-base tracking-wider">108</span>
          </div>
        </div>
      </div>
    </div>
  );
};

