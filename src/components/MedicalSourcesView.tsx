import React, { useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileText,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { VERIFIED_MEDICAL_SOURCES } from '../data/medicalSourcesData';
import { MahuaEmblem } from './MahuaEmblem';
import { StageProgressionFooter } from './StageProgressionFooter';

export const MedicalSourcesView: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const topics = [
    'All',
    'Anemia & Iron Studies',
    'Pediatric WHO LMS',
    'Micronutrient RDAs',
    'Bioavailability Kinetics',
  ];

  const filteredSources = VERIFIED_MEDICAL_SOURCES.filter((src) => {
    const matchesTopic = selectedTopic === 'All' || src.topic === selectedTopic;
    const matchesSearch =
      searchQuery.trim() === '' ||
      src.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      src.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTopic && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-white via-[#FFF5F7] to-[#FCE7F3] rounded-3xl p-6 sm:p-8 border border-[#FCE7F3] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-[#FCE7F3]">
              <BookOpen className="w-8 h-8 text-[#F43F5E]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-slate-900">Medical Knowledge & Evidence Repository</h2>
                <span className="bg-[#FFF1F2] text-[#F43F5E] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#FCE7F3]">
                  Verified RAG Grounding
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Maguva strictly roots all recommendations, biochemical mechanisms, and risk assessments in peer-reviewed clinical guidelines, official government policies, and international WHO standards.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Topic Filters */}
        <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-4 border-t border-[#FCE7F3]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search guidelines, organizations (WHO, ICMR-NIN, MoHFW)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F43F5E]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTopic(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedTopic === t
                    ? 'bg-[#F43F5E] text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-[#FFF5F7] border border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className="bg-white rounded-2xl p-6 border border-[#FCE7F3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header Badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#F43F5E] bg-[#FFF1F2] px-2.5 py-1 rounded-lg border border-[#FCE7F3]">
                  {source.topic}
                </span>
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {source.publicationYear}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                {source.title}
              </h3>

              {/* Organization & Evidence Type */}
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-600">
                <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {source.organization}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 italic">{source.evidenceType}</span>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {source.summary}
              </p>

              {/* Key Grounded Snippets */}
              <div className="space-y-1.5 bg-[#FFF5F7] p-3.5 rounded-xl border border-[#FCE7F3] mb-4">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#F43F5E]" />
                  <span>Clinical Directives & Parameters</span>
                </div>
                <ul className="space-y-1 mt-1">
                  {source.keySnippets.map((snippet, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{snippet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Official Source Link */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Verified Grounded Reference</span>
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F43F5E] hover:underline"
              >
                <span>View Official Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Safety & Compliance Box */}
      <div className="bg-amber-50 rounded-2xl p-5 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-amber-900 mb-0.5">Medical Evidence Grounding Notice</div>
          <p className="text-amber-800 leading-relaxed">
            All medical literature snippets and ICMR/WHO formulas integrated in Maguva are designed exclusively to provide transparent, evidence-backed educational context. They do not constitute individualized clinical diagnoses or prescriptions. Users must consult registered physicians and certified healthcare providers for personalized diagnostic testing and medical treatment.
          </p>
        </div>
      </div>

      {/* Next Stage Navigation Footer */}
      <StageProgressionFooter
        currentStageNumber={6}
        currentStageTitle="Stage 6: Medical Guidelines & Evidence"
        prevTab="tracker"
        prevStageTitle="Stage 5: Health & Lab Tracker"
        nextTab="aiAgent"
        nextStageTitle="Stage 7: Ask Maguva AI Companion"
        nextStageDescription="Engage in interactive clinical inquiry, explain test values, or query evidence-backed nutritional guidance."
      />
    </div>
  );
};
