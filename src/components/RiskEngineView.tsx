import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Droplets,
  Zap,
  Sun,
  Leaf,
  CheckCircle2,
  FileText,
  UploadCloud,
  Info,
  Scale,
  HeartPulse,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';
import { DeficiencyRisk } from '../types';
import { StageProgressionFooter } from './StageProgressionFooter';

export const RiskEngineView: React.FC = () => {
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const setActiveStage = useHealthStore((state) => state.setActiveStage);
  const labs = useHealthStore((state) => state.labs);
  const demographics = useHealthStore((state) => state.demographics);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);

  const isFemale = String(demographics?.sex || '').toLowerCase() === 'female';

  const { risks } = useComputedHealth();
  const [selectedRiskId, setSelectedRiskId] = useState<string>('iron');

  const selectedRisk = risks.find((r) => r.id === selectedRiskId) || risks[0];

  const activeSymptomImpacts = (selectedRisk?.symptomImpacts || []).filter((item) => {
    if (!isFemale) {
      if (item.category === 'menstrual') return false;
      const lowerName = item.name.toLowerCase();
      if (
        lowerName.includes('menstrual') ||
        lowerName.includes('cramp') ||
        lowerName.includes('period') ||
        lowerName.includes('cycle') ||
        lowerName.includes('dysmenorrhea') ||
        lowerName.includes('bleed') ||
        lowerName.includes('ovarian') ||
        lowerName.includes('pregnancy') ||
        lowerName.includes('lactation') ||
        lowerName.includes('flow')
      ) {
        return false;
      }
    }
    return true;
  });

  const activeSymptomMatches = (selectedRisk?.symptomMatches || []).filter((symptom) => {
    if (!isFemale) {
      const lower = symptom.toLowerCase();
      if (
        lower.includes('menstrual') ||
        lower.includes('cramp') ||
        lower.includes('period') ||
        lower.includes('cycle') ||
        lower.includes('dysmenorrhea') ||
        lower.includes('bleed') ||
        lower.includes('ovarian') ||
        lower.includes('pregnancy') ||
        lower.includes('lactation') ||
        lower.includes('flow')
      ) {
        return false;
      }
    }
    return true;
  });

  const allLabsSkipped =
    labs.labStatus === 'User_Skipped' ||
    risks.every((r) => r.isSymptomOnlyEstimate);

  const anyLabSkipped =
    allLabsSkipped ||
    labs.labStatus === 'Partial_Skipped' ||
    (labs.skippedTests && labs.skippedTests.length > 0) ||
    risks.some((r) => r.isPartialLabVerified || r.isSymptomOnlyEstimate);

  const getVectorIcon = (id: string) => {
    switch (id) {
      case 'iron':
        return <Droplets className="w-5 h-5" />;
      case 'b12':
        return <Zap className="w-5 h-5" />;
      case 'folate':
        return <Leaf className="w-5 h-5" />;
      case 'vitaminD':
        return <Sun className="w-5 h-5" />;
      default:
        return <ShieldCheck className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
            Module 4 Engine
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Multi-Deficiency Probabilistic Risk Scoring
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Rule-based multi-vector algorithmic assessment synthesizing CBC labs, ferritin reserves{isFemale ? ', menstrual blood loss' : ''}, and gut absorption co-factors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setProfileModalOpen(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-[#F43F5E]" />
          <span>Upload / Manage Lab Data</span>
        </button>
      </div>

      {/* Global Lab Status Banner (All Skipped or Partial Skipped) */}
      {allLabsSkipped ? (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-600 text-white shadow-2xs">
                  Symptom-Based Estimate (No Lab Data Verified)
                </span>
                <span className="text-[11px] font-bold text-amber-900">
                  Calculation Weight: 100% Symptoms &amp; Demographics
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                You skipped all blood biomarker inputs. Our clinical engine strictly treats skipped tests as <strong>Missing Data / Unverified</strong> without assigning dummy numbers (e.g. 0, -1, or average). Calculation weight is shifted entirely to your symptomatic questionnaires &amp; demographic profile. For a clinical-grade diagnosis, upload or enter your lab reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="shrink-0 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Lab Reports</span>
          </button>
        </div>
      ) : anyLabSkipped ? (
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-[#F43F5E] shrink-0" />
            <div className="text-xs text-slate-700">
              <span className="font-bold text-slate-900">Partial Lab Data Mode: </span>
              Skipped tests are excluded from lab scoring without dummy numbers. Confidence indicators reflect available data weight.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="text-xs font-bold text-[#F43F5E] hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Update Lab Biomarkers</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs text-emerald-900">
              <span className="font-bold">Full Multi-Marker Lab Verification: </span>
              100% confidence diagnostic profile synthesizing validated blood tests, clinical symptoms, and metabolic factors.
            </div>
          </div>
        </div>
      )}

      {/* Interactive Vector Selector Bar */}
      <div className="bg-slate-900 p-2 sm:p-2.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 py-1">
          Select Engine:
        </span>
        {risks.map((r) => {
          const isActive = selectedRisk.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRiskId(r.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#F43F5E] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {getVectorIcon(r.id)}
              <span>{r.name}</span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : r.riskTier === 'High'
                    ? 'bg-rose-500/30 text-rose-300'
                    : r.riskTier === 'Moderate'
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/30 text-emerald-300'
                }`}
              >
                {r.riskScore}%
              </span>
            </button>
          );
        })}
      </div>

      {/* 4 Vector Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {risks.map((risk) => {
          const isSelected = selectedRisk.id === risk.id;
          const isHigh = risk.riskTier === 'High';
          const isMod = risk.riskTier === 'Moderate';

          return (
            <div
              key={risk.id}
              onClick={() => setSelectedRiskId(risk.id)}
              className={`rounded-3xl p-5 border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-[#F43F5E] shadow-md ring-2 ring-[#F43F5E]/20'
                  : 'bg-white/80 border-[#FCE7F3] hover:border-[#F43F5E]/40 hover:bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`rounded-2xl p-2.5 ${
                      isHigh
                        ? 'bg-[#FFF1F2] text-[#F43F5E]'
                        : isMod
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {getVectorIcon(risk.id)}
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isHigh
                        ? 'bg-[#F43F5E] text-white'
                        : isMod
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {risk.riskTier} Risk
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">{risk.name}</h3>

                <div className="mt-3 flex items-baseline justify-between text-xs">
                  <span className="text-slate-500 font-medium">Deficiency Risk</span>
                  <span className="text-base font-extrabold text-slate-900">
                    {risk.riskScore}
                    <span className="text-xs font-normal text-slate-400">/100</span>
                  </span>
                </div>

                <div className="mt-1.5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh
                        ? 'bg-gradient-to-r from-rose-500 to-[#F43F5E]'
                        : isMod
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                        : 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                    }`}
                    style={{ width: `${risk.riskScore}%` }}
                  />
                </div>
              </div>

              {/* Confidence & Lab Verification Badge */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                {risk.isSymptomOnlyEstimate ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">Symptom-Based Estimate</span>
                  </div>
                ) : risk.isPartialLabVerified ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                    <Info className="w-3 h-3 text-[#F43F5E] shrink-0" />
                    <span className="truncate">{risk.confidencePercent}% Confidence (Partial Labs)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">100% Lab Verified</span>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 font-medium truncate">
                  {risk.biomarkerSummary}
                </div>
              </div>

              {isSelected && (
                <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg bg-[#F43F5E]" />
              )}
            </div>
          );
        })}
      </div>

      {/* Deep-Dive In-Depth Assessment Card */}
      <section
        id="selected-risk-deep-dive"
        className="rounded-3xl bg-white p-6 sm:p-8 border border-[#FCE7F3] shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="rounded-2xl bg-[#FFF1F2] p-3 text-[#F43F5E] shrink-0">
              {getVectorIcon(selectedRisk.id)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-extrabold text-slate-900">{selectedRisk.name}</h3>
                <span
                  className={`text-xs font-bold uppercase px-3 py-0.5 rounded-full ${
                    selectedRisk.riskTier === 'High'
                      ? 'bg-[#F43F5E] text-white'
                      : selectedRisk.riskTier === 'Moderate'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {selectedRisk.riskTier} Risk ({selectedRisk.riskScore}/100)
                </span>

                {selectedRisk.isSymptomOnlyEstimate ? (
                  <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                    Symptom-Based Estimate (No Lab Data Verified)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-0.5 rounded-full">
                    {selectedRisk.confidencePercent}% Confidence
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Urgency Level: <span className="font-semibold text-slate-800">{selectedRisk.urgencyLevel}</span> • {selectedRisk.confidenceNote || 'Confidence calculated via verified biomarkers'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Engine Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          {risks.map((r) => {
            const isTabActive = selectedRisk.id === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRiskId(r.id)}
                className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {getVectorIcon(r.id)}
                <span>{r.name}</span>
              </button>
            );
          })}
        </div>

        {/* 2 Column Details: Clinical Triggers & Symptoms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identified Clinical Lab Triggers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#F43F5E]" />
                <span>Identified Clinical Lab Triggers (% Lab Impact)</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                Lab Diagnostic Weight
              </span>
            </div>

            {selectedRisk.clinicalImpacts && selectedRisk.clinicalImpacts.length > 0 ? (
              <div className="space-y-2.5">
                {selectedRisk.clinicalImpacts.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5 transition-all hover:shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                        Lab Biomarker Trigger
                      </span>
                      <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                        +{item.impactPercent}% Lab Impact
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{item.name}</p>
                  </div>
                ))}
              </div>
            ) : selectedRisk.clinicalMarkers.length > 0 ? (
              <div className="space-y-2.5">
                {selectedRisk.clinicalMarkers.map((marker, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                        Lab Biomarker Trigger
                      </span>
                      <span className="text-[11px] font-black text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                        +25% Lab Impact
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{marker}</p>
                  </div>
                ))}
              </div>
            ) : selectedRisk.isSymptomOnlyEstimate ? (
              <div className="text-xs text-amber-800 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>No Blood Biomarkers Verified (Tests Skipped)</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Lab biomarkers were excluded without dummy values. Enter or upload lab panel values (Hb, Ferritin, B12, Folate, Vit D) to activate verified lab weighting.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                No critical diagnostic lab abnormalities flagged for this vector.
              </p>
            )}
          </div>

          {/* Symptom & Vector Co-Factors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Symptom & Vector Co-Factors (% Impact on Deficiency)</span>
              </h4>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                ICMR / NIH / WHO Weighted Vector Model
              </span>
            </div>

            {activeSymptomImpacts && activeSymptomImpacts.length > 0 ? (
              <div className="space-y-2.5">
                {activeSymptomImpacts.map((item, idx) => {
                  const isIron = selectedRisk.id === 'iron';
                  const isB12 = selectedRisk.id === 'b12';
                  const isFolate = selectedRisk.id === 'folate';

                  const cardStyle = isIron
                    ? 'bg-rose-50/70 border-rose-200/80'
                    : isB12
                    ? 'bg-purple-50/70 border-purple-200/80'
                    : isFolate
                    ? 'bg-emerald-50/70 border-emerald-200/80'
                    : 'bg-amber-50/70 border-amber-200/80';

                  const categoryTagStyle = isIron
                    ? 'text-rose-800 bg-rose-100/80 border-rose-200'
                    : isB12
                    ? 'text-purple-800 bg-purple-100/80 border-purple-200'
                    : isFolate
                    ? 'text-emerald-800 bg-emerald-100/80 border-emerald-200'
                    : 'text-amber-800 bg-amber-100/80 border-amber-200';

                  const impactBadgeStyle = isIron
                    ? 'text-rose-700 bg-rose-100 border-rose-300'
                    : isB12
                    ? 'text-purple-700 bg-purple-100 border-purple-300'
                    : isFolate
                    ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                    : 'text-amber-800 bg-amber-100 border-amber-300';

                  const categoryLabel =
                    item.category === 'symptom'
                      ? 'Clinical Symptom'
                      : item.category === 'menstrual'
                      ? 'Menstrual Parameter'
                      : item.category === 'gut'
                      ? 'Gut Absorption Barrier'
                      : 'Demographic / Lifestyle';

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border ${cardStyle} space-y-1.5 transition-all hover:shadow-2xs`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${categoryTagStyle}`}
                        >
                          {categoryLabel}
                        </span>
                        <span
                          className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${impactBadgeStyle}`}
                        >
                          +{item.impactPercent}% Impact
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {item.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : activeSymptomMatches && activeSymptomMatches.length > 0 ? (
              <div className="space-y-2.5">
                {activeSymptomMatches.map((symptom, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                        Vector Co-Factor
                      </span>
                      <span className="text-[11px] font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                        +10% Impact
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug">{symptom}</p>
                  </div>
                ))}
              </div>
            ) : (
              /* If no active symptoms/co-factors selected for this nutrient, show clean empty state */
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                  No active symptoms or co-factors reported for {selectedRisk.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Risk score is computed strictly from your entered symptoms, demographics, and lab biomarker entries.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={2}
        currentStageTitle="Stage 2: Deficiency Risk Engine"
        prevTab="vector"
        prevStageTitle="Stage 1: Health Vector & Lab Biomarkers"
        nextTab="ayush"
        nextStageTitle="Stage 3: AYUSH & Traditional Remedies"
        nextStageDescription="Explore classical Ayurvedic formulations (Mahuwa Laddoo, Moringa, Amla-Lemon pH priming) & evidence ratings."
      />
    </div>
  );
};

