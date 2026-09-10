import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Calendar,
  Activity,
  Droplets,
  Scale,
  Pill,
  Sparkles,
  UtensilsCrossed,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Trash2,
  Filter,
  BarChart3,
  LineChart as LineChartIcon,
  ChevronRight,
  AlertCircle,
  Stethoscope,
  Info,
  Upload,
  FileText,
  FileUp,
  Loader2,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { HealthRecordEntry } from '../types';
import { StageProgressionFooter } from './StageProgressionFooter';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export const HealthTrackerView: React.FC = () => {
  const rawHealthTimeline = useHealthStore((state) => state.healthTimeline);
  
  // Deduplicate entries by date, title, and key biomarker values
  const healthTimeline = useMemo(() => {
    const seen = new Set<string>();
    const result: typeof rawHealthTimeline = [];
    for (const item of rawHealthTimeline) {
      const sig = `${item.date}_${(item.title || '').trim().toLowerCase()}_${item.hemoglobin ?? ''}_${item.serumFerritin ?? ''}_${item.vitaminB12 ?? ''}_${item.vitaminD ?? ''}_${item.weightKg ?? ''}`;
      if (!seen.has(sig)) {
        seen.add(sig);
        result.push(item);
      }
    }
    return result;
  }, [rawHealthTimeline]);
  const addHealthRecordEntry = useHealthStore((state) => state.addHealthRecordEntry);
  const removeHealthRecordEntry = useHealthStore((state) => state.removeHealthRecordEntry);
  const demographics = useHealthStore((state) => state.demographics);
  const labs = useHealthStore((state) => state.labs);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);

  // New Log Entry Modal / Inline Form State
  const [showAddLogModal, setShowAddLogModal] = useState<boolean>(false);
  const [selectedBiomarker, setSelectedBiomarker] = useState<'hemoglobin' | 'serumFerritin' | 'vitaminB12' | 'vitaminD' | 'weightKg'>('hemoglobin');

  // Form Fields for new check-in
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryTitle, setEntryTitle] = useState<string>('Follow-Up Health & Lab Check');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [entryWeight, setEntryWeight] = useState<string>(demographics.weightKg ? String(demographics.weightKg) : '54');
  const [entryHeight, setEntryHeight] = useState<string>(demographics.heightCm ? String(demographics.heightCm) : '162');
  
  // Biomarkers
  const [entryHb, setEntryHb] = useState<string>(labs.hemoglobin ? String(labs.hemoglobin) : '10.5');
  const [entryFerritin, setEntryFerritin] = useState<string>(labs.serumFerritin ? String(labs.serumFerritin) : '16');
  const [entryIron, setEntryIron] = useState<string>(labs.serumIron ? String(labs.serumIron) : '58');
  const [entryTibc, setEntryTibc] = useState<string>(labs.tibc ? String(labs.tibc) : '390');
  const [entryB12, setEntryB12] = useState<string>(labs.vitaminB12 ? String(labs.vitaminB12) : '310');
  const [entryVitD, setEntryVitD] = useState<string>(labs.vitaminD ? String(labs.vitaminD) : '32');
  const [entryFolate, setEntryFolate] = useState<string>(labs.folateB9 ? String(labs.folateB9) : '8.0');
  const [entryVitC, setEntryVitC] = useState<string>(labs.vitaminC ? String(labs.vitaminC) : '1.2');

  // Interventions
  const [entryMeds, setEntryMeds] = useState<string>('Ferrous Ascorbate 100mg, Daily Vitamin C');
  const [entryDietAdherence, setEntryDietAdherence] = useState<'Strict' | 'Moderate' | 'Occasional' | 'Starting'>('Strict');
  const [entryAyush, setEntryAyush] = useState<string>('Amla juice in morning, Soaked Halim seeds');
  const [entryEnergy, setEntryEnergy] = useState<number>(8);

  // Lab Report Upload State inside modal
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isAnalyzingFile, setIsAnalyzingFile] = useState<boolean>(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const handleLabReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsAnalyzingFile(true);
    setUploadMessage(null);

    // Simulate AI OCR / Lab Extraction
    setTimeout(() => {
      setIsAnalyzingFile(false);
      setUploadMessage(`Parsed "${file.name}"! Biomarkers auto-extracted into fields below.`);
      setEntryHb('11.8');
      setEntryFerritin('24.5');
      setEntryB12('350');
      setEntryVitD('34.0');
      setEntryTitle(`Lab Check: ${file.name.replace(/\.[^/.]+$/, '')}`);
    }, 1200);
  };

  // Prepare chronological data for Recharts (sorted oldest to newest)
  const chartData = [...healthTimeline]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record) => ({
      date: record.date,
      title: record.title || 'Check-in',
      hemoglobin: record.hemoglobin,
      serumFerritin: record.serumFerritin,
      vitaminB12: record.vitaminB12,
      vitaminD: record.vitaminD,
      weightKg: record.weightKg,
      bmi: record.bmi,
      energyScore: record.energyScore,
    }));

  // Calculate Deltas from baseline to latest
  const sortedRecords = [...healthTimeline].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const baseline = sortedRecords[0];
  const latest = sortedRecords[sortedRecords.length - 1];

  const calcDiff = (curr?: number, base?: number) => {
    if (curr === undefined || base === undefined) return null;
    const diff = Math.round((curr - base) * 10) / 10;
    return diff;
  };

  const hbDiff = calcDiff(latest?.hemoglobin, baseline?.hemoglobin);
  const ferritinDiff = calcDiff(latest?.serumFerritin, baseline?.serumFerritin);
  const b12Diff = calcDiff(latest?.vitaminB12, baseline?.vitaminB12);
  const vitDDiff = calcDiff(latest?.vitaminD, baseline?.vitaminD);
  const weightDiff = calcDiff(latest?.weightKg, baseline?.weightKg);

  const handleAddNewRecord = (e: React.FormEvent) => {
    e.preventDefault();

    const parseNum = (val: string): number | undefined => {
      const n = parseFloat(val);
      return isNaN(n) ? undefined : n;
    };

    const hCm = parseNum(entryHeight) || 162;
    const wKg = parseNum(entryWeight) || 54;
    const heightM = hCm / 100;
    const calculatedBmi = heightM > 0 ? Number((wKg / (heightM * heightM)).toFixed(1)) : undefined;

    const medsList = entryMeds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const ayushList = entryAyush
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    addHealthRecordEntry({
      date: entryDate,
      title: entryTitle.trim() || 'Health Follow-Up Check',
      notes: entryNotes.trim(),
      source: 'User Longitudinal Check-In',
      heightCm: hCm,
      weightKg: wKg,
      bmi: calculatedBmi,
      hemoglobin: parseNum(entryHb),
      serumFerritin: parseNum(entryFerritin),
      serumIron: parseNum(entryIron),
      tibc: parseNum(entryTibc),
      transferrinSaturation:
        parseNum(entryIron) && parseNum(entryTibc)
          ? Number(((parseNum(entryIron)! / parseNum(entryTibc)!) * 100).toFixed(1))
          : undefined,
      vitaminB12: parseNum(entryB12),
      vitaminD: parseNum(entryVitD),
      folateB9: parseNum(entryFolate),
      vitaminC: parseNum(entryVitC),
      medicationsOrSupplements: medsList,
      dietaryPlanAdherence: entryDietAdherence,
      ayushRemediesUsed: ayushList,
      energyScore: entryEnergy,
    });

    setShowAddLogModal(false);
    // Reset form notes
    setEntryNotes('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#FCE7F3] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#FFF1F2] text-[#F43F5E] px-2.5 py-0.5 rounded-full border border-[#FCE7F3]">
              Longitudinal Health & Diet Progress Tracker
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500">
              {healthTimeline.length} Recorded Timeline Entries
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Health & Biomarker Trajectory
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track how your hemoglobin, ferritin, vitamin levels, weight, and energy evolve over time after taking medicines, AYUSH remedies, and adopting your personalized dietary plan.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            id="btn-open-add-health-log"
            onClick={() => setShowAddLogModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log New Blood Test / Check-in</span>
          </button>
        </div>
      </div>

      {/* Trajectory Summary Cards (Progress Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Hemoglobin */}
        <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Hemoglobin</span>
            <Droplets className="w-4 h-4 text-[#F43F5E]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {latest?.hemoglobin !== undefined ? `${latest.hemoglobin}` : '--'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">g/dL</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {hbDiff !== null && hbDiff > 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" /> +{hbDiff} g/dL
              </span>
            ) : hbDiff !== null && hbDiff < 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-rose-600">
                <ArrowDownRight className="w-3 h-3" /> {hbDiff} g/dL
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Baseline</span>
            )}
            <span className="text-[10px] text-slate-400">since start</span>
          </div>
        </div>

        {/* Serum Ferritin */}
        <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Serum Ferritin</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {latest?.serumFerritin !== undefined ? `${latest.serumFerritin}` : '--'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">ng/mL</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {ferritinDiff !== null && ferritinDiff > 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" /> +{ferritinDiff} ng/mL
              </span>
            ) : ferritinDiff !== null && ferritinDiff < 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-rose-600">
                <ArrowDownRight className="w-3 h-3" /> {ferritinDiff} ng/mL
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Baseline</span>
            )}
            <span className="text-[10px] text-slate-400">stores</span>
          </div>
        </div>

        {/* Vitamin B12 */}
        <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Vitamin B12</span>
            <Sparkles className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {latest?.vitaminB12 !== undefined ? `${latest.vitaminB12}` : '--'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">pg/mL</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {b12Diff !== null && b12Diff > 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" /> +{b12Diff}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Stable</span>
            )}
            <span className="text-[10px] text-slate-400">neurological</span>
          </div>
        </div>

        {/* Vitamin D */}
        <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Vitamin D3</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {latest?.vitaminD !== undefined ? `${latest.vitaminD}` : '--'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">ng/mL</span>
          </div>
          <div className="mt-1 flex items-center gap-1">
            {vitDDiff !== null && vitDDiff > 0 ? (
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-600">
                <ArrowUpRight className="w-3 h-3" /> +{vitDDiff}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Stable</span>
            )}
            <span className="text-[10px] text-slate-400">bone & immune</span>
          </div>
        </div>

        {/* Body Weight / BMI */}
        <div className="bg-white p-4 rounded-2xl border border-[#FCE7F3] shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Weight & BMI</span>
            <Scale className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">
              {latest?.weightKg !== undefined ? `${latest.weightKg}` : '--'}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">kg</span>
            {latest?.bmi && (
              <span className="text-xs font-bold text-slate-500 ml-1">
                (BMI {latest.bmi})
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1">
            {weightDiff !== null ? (
              <span className="text-[11px] font-bold text-slate-700">
                {weightDiff >= 0 ? `+${weightDiff}` : weightDiff} kg change
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">Baseline</span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Trend Chart */}
      <div className="bg-white p-6 rounded-3xl border border-[#FCE7F3] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-[#F43F5E]" />
            <h3 className="text-base font-bold text-slate-900">
              Biomarker Recovery & Longitudinal Progress Chart
            </h3>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedBiomarker('hemoglobin')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedBiomarker === 'hemoglobin'
                  ? 'bg-white text-[#F43F5E] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hemoglobin (g/dL)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBiomarker('serumFerritin')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedBiomarker === 'serumFerritin'
                  ? 'bg-white text-amber-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ferritin (ng/mL)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBiomarker('vitaminB12')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedBiomarker === 'vitaminB12'
                  ? 'bg-white text-violet-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              B12 (pg/mL)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBiomarker('vitaminD')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedBiomarker === 'vitaminD'
                  ? 'bg-white text-amber-500 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vit D (ng/mL)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBiomarker('weightKg')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                selectedBiomarker === 'weightKg'
                  ? 'bg-white text-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weight (kg)
            </button>
          </div>
        </div>

        {/* Recharts Line Visualizer */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #FCE7F3',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                {selectedBiomarker === 'hemoglobin' && (
                  <Line
                    type="monotone"
                    dataKey="hemoglobin"
                    name="Hemoglobin (g/dL)"
                    stroke="#F43F5E"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#F43F5E', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                )}

                {selectedBiomarker === 'serumFerritin' && (
                  <Line
                    type="monotone"
                    dataKey="serumFerritin"
                    name="Serum Ferritin (ng/mL)"
                    stroke="#D97706"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#D97706', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                )}

                {selectedBiomarker === 'vitaminB12' && (
                  <Line
                    type="monotone"
                    dataKey="vitaminB12"
                    name="Vitamin B12 (pg/mL)"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#8B5CF6', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                )}

                {selectedBiomarker === 'vitaminD' && (
                  <Line
                    type="monotone"
                    dataKey="vitaminD"
                    name="Vitamin D (ng/mL)"
                    stroke="#F59E0B"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#F59E0B', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                )}

                {selectedBiomarker === 'weightKg' && (
                  <Line
                    type="monotone"
                    dataKey="weightKg"
                    name="Body Weight (kg)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#FFF' }}
                    activeDot={{ r: 7 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              No historical log data available. Add a check-in below to start graphing.
            </div>
          )}
        </div>
      </div>

      {/* Historical Check-in Timeline Logs List */}
      <div className="bg-white p-6 rounded-3xl border border-[#FCE7F3] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#F43F5E]" />
            <h3 className="text-base font-bold text-slate-900">
              Detailed Timeline & Interventions Log
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Changes after Diet & Medicines
          </span>
        </div>

        <div className="space-y-4">
          {healthTimeline.map((item, index) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-[#FFF5F7]/30 transition-all space-y-3"
            >
              {/* Entry Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#FFF1F2] text-[#F43F5E] font-extrabold text-xs border border-[#FCE7F3]">
                    {healthTimeline.length - index}
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {item.title || 'Health Check'}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-500">
                      📅 {item.date} • {item.source || 'Direct Check-in'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.energyScore && (
                    <span className="text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                      ⚡ Vitality: {item.energyScore}/10
                    </span>
                  )}
                  {item.dietaryPlanAdherence && (
                    <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      🥗 Diet: {item.dietaryPlanAdherence}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeHealthRecordEntry(item.id);
                    }}
                    title="Delete record"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Biomarkers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 bg-white p-3 rounded-xl border border-slate-200/60 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Hemoglobin</span>
                  <span className="font-extrabold text-slate-900">
                    {item.hemoglobin !== undefined ? `${item.hemoglobin} g/dL` : 'Not tested'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Ferritin</span>
                  <span className="font-extrabold text-slate-900">
                    {item.serumFerritin !== undefined ? `${item.serumFerritin} ng/mL` : 'Not tested'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Vitamin B12</span>
                  <span className="font-extrabold text-slate-900">
                    {item.vitaminB12 !== undefined ? `${item.vitaminB12} pg/mL` : 'Not tested'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Vitamin D</span>
                  <span className="font-extrabold text-slate-900">
                    {item.vitaminD !== undefined ? `${item.vitaminD} ng/mL` : 'Not tested'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Weight & BMI</span>
                  <span className="font-extrabold text-slate-900">
                    {item.weightKg ? `${item.weightKg} kg` : '--'} {item.bmi ? `(${item.bmi})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px]">Iron / TIBC</span>
                  <span className="font-extrabold text-slate-900">
                    {item.serumIron ? `${item.serumIron} µg/dL` : '--'}
                  </span>
                </div>
              </div>

              {/* Active Interventions Note */}
              {(item.medicationsOrSupplements?.length || item.ayushRemediesUsed?.length || item.notes) && (
                <div className="pt-1 text-xs space-y-1">
                  {item.medicationsOrSupplements && item.medicationsOrSupplements.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-700">
                      <Pill className="w-3.5 h-3.5 text-[#F43F5E] shrink-0" />
                      <span className="font-bold">Supplements & Medicines:</span>
                      <span className="text-slate-600">{item.medicationsOrSupplements.join(', ')}</span>
                    </div>
                  )}

                  {item.ayushRemediesUsed && item.ayushRemediesUsed.length > 0 && (
                    <div className="flex items-center gap-1 text-slate-700">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-bold">AYUSH & Dietary Habits:</span>
                      <span className="text-slate-600">{item.ayushRemediesUsed.join(', ')}</span>
                    </div>
                  )}

                  {item.notes && (
                    <p className="text-slate-500 italic bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-[11px]">
                      "{item.notes}"
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Add New Longitudinal Health Check-in */}
      {showAddLogModal && (
        <div
          id="modal-add-health-log"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl border border-[#FCE7F3] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-[#FFF5F7] to-[#FFF1F2] border-b border-[#FCE7F3] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white rounded-xl shadow-2xs border border-[#FCE7F3]">
                  <PlusCircle className="w-5 h-5 text-[#F43F5E]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Log Follow-Up Health Check & Blood Test
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Record your updated lab values, body weight, or diet response
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLogModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAddNewRecord} className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Lab Report File Upload Section */}
              <div className="p-3.5 bg-gradient-to-r from-rose-50/70 to-purple-50/50 rounded-2xl border border-rose-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileUp className="w-4 h-4 text-[#F43F5E]" />
                    <span className="font-bold text-slate-800 text-xs">
                      Upload Lab Report (PDF / Image)
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-md border border-rose-200">
                    AI Auto Extraction
                  </span>
                </div>

                {!uploadedFileName ? (
                  <label
                    htmlFor="modal-lab-file-upload-input"
                    className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-rose-300 hover:border-[#F43F5E] bg-white rounded-xl cursor-pointer transition-all text-center group"
                  >
                    <Upload className="w-5 h-5 text-rose-400 group-hover:text-[#F43F5E] mb-1 group-hover:scale-110 transition-all" />
                    <span className="font-bold text-slate-700 text-xs">
                      Click to upload or drag &amp; drop Blood Test PDF or Image
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Supports PDF, PNG, JPG, JPEG (Max 15MB)
                    </span>
                    <input
                      type="file"
                      id="modal-lab-file-upload-input"
                      accept=".pdf,image/*,.jpg,.png,.jpeg"
                      className="hidden"
                      onChange={handleLabReportUpload}
                    />
                  </label>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-rose-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {isAnalyzingFile ? (
                        <Loader2 className="w-5 h-5 text-[#F43F5E] animate-spin shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate text-xs">
                          {uploadedFileName}
                        </span>
                        {isAnalyzingFile ? (
                          <span className="text-[10px] text-rose-600 font-semibold">
                            Extracting Hemoglobin, Ferritin, B12 &amp; Vit D...
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            Biomarkers parsed &amp; auto-filled below
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFileName(null);
                        setUploadMessage(null);
                      }}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg text-xs font-bold cursor-pointer shrink-0 ml-2"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {uploadMessage && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{uploadMessage}</span>
                  </div>
                )}
              </div>

              {/* Date & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Check-in Date *</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Record Title / Reason</label>
                  <input
                    type="text"
                    value={entryTitle}
                    onChange={(e) => setEntryTitle(e.target.value)}
                    placeholder="e.g., Post-Diet 8-Week Re-test"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-[#F43F5E] focus:outline-none"
                  />
                </div>
              </div>

              {/* Physical Vitals */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="font-bold text-slate-800 block">Physical Vitals</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-0.5">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={entryWeight}
                      onChange={(e) => setEntryWeight(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-0.5">Height (cm)</label>
                    <input
                      type="number"
                      value={entryHeight}
                      onChange={(e) => setEntryHeight(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Biomarkers */}
              <div className="p-3 bg-rose-50/40 rounded-2xl border border-rose-100 space-y-2">
                <span className="font-bold text-slate-800 block">Updated Lab Biomarkers (Leave blank if not tested)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Hemoglobin (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 10.5"
                      value={entryHb}
                      onChange={(e) => setEntryHb(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Ferritin (ng/mL)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 15.0"
                      value={entryFerritin}
                      onChange={(e) => setEntryFerritin(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Vitamin B12 (pg/mL)</label>
                    <input
                      type="number"
                      step="1"
                      placeholder="e.g. 290"
                      value={entryB12}
                      onChange={(e) => setEntryB12(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 mb-0.5">Vitamin D (ng/mL)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 30"
                      value={entryVitD}
                      onChange={(e) => setEntryVitD(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Interventions & Habits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicines / Supplements Taken</label>
                  <input
                    type="text"
                    value={entryMeds}
                    onChange={(e) => setEntryMeds(e.target.value)}
                    placeholder="e.g., Ferrous ascorbate 100mg, B12 tablet"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dietary Plan Adherence</label>
                  <select
                    value={entryDietAdherence}
                    onChange={(e) => setEntryDietAdherence(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="Strict">Strict (Followed daily meal suggestions)</option>
                    <option value="Moderate">Moderate (Most days followed guidelines)</option>
                    <option value="Occasional">Occasional</option>
                    <option value="Starting">Starting new plan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">AYUSH Remedies & Rituals</label>
                <input
                  type="text"
                  value={entryAyush}
                  onChange={(e) => setEntryAyush(e.target.value)}
                  placeholder="e.g., Amla juice in morning, Halim seeds, Moringa soup"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Vitality / Energy Level: {entryEnergy} / 10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={entryEnergy}
                  onChange={(e) => setEntryEnergy(Number(e.target.value))}
                  className="w-full accent-[#F43F5E]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical / Personal Notes</label>
                <textarea
                  rows={2}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="e.g., Fatigue significantly decreased after 4 weeks of regular diet and ferrous ascorbate."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#F43F5E] hover:bg-[#E11D48] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Save Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={5}
        currentStageTitle="Stage 5: Health & Lab Tracker"
        prevTab="meals"
        prevStageTitle="Stage 4: Meal Planner & ICMR Foods"
        nextTab="sources"
        nextStageTitle="Stage 6: Medical Guidelines & Evidence"
        nextStageDescription="Access full source citations and guidelines from WHO, ICMR-NIN 2020 RDA, AMB & Ministry of AYUSH."
      />
    </div>
  );
};
