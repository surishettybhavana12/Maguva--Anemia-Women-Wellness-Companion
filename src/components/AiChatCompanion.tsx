import React, { useState, useRef, useEffect, useDeferredValue, useCallback } from 'react';
import Markdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Bot,
  User,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Flame,
  Plus,
  UtensilsCrossed,
} from 'lucide-react';
import { useHealthStore, AppTab } from '../store/useHealthStore';
import { useComputedHealth } from '../utils/useComputedHealth';
import { GroundedCitation, ChatMessage, Demographics } from '../types';
import { MahuaEmblem } from './MahuaEmblem';
import { ChatInput } from './ChatInput';
import { CURATED_FOOD_LIBRARY } from '../data/foodDatabase';
import { INITIAL_AYUSH_REMEDIES } from '../data/ayushRemedies';
import {
  FoodCandidate,
  searchFoodCandidates,
  extractCleanFoodQuery,
} from '../utils/foodRelevanceScorer';
import { mapBroadQueryToSearchableTerms } from '../utils/queryPreprocessor';
import { parseCSVRow } from '../utils/foodCsvParser';
import {
  generateMicronutrientCsvResponse,
  detectNutrientFromFileQuery,
} from '../utils/micronutrientCsvLoader';

interface CsvNutrientRow {
  foodName: string;
  iron: number;
  b12: number;
  calcium: number;
  vitD: number;
  vitC: number;
  folate: number;
}

let cachedNutrientRows: CsvNutrientRow[] | null = null;

async function getNutrientCsvRows(): Promise<CsvNutrientRow[]> {
  if (cachedNutrientRows && cachedNutrientRows.length > 0) {
    return cachedNutrientRows;
  }
  try {
    const res = await fetch('/micronutient-data.csv');
    if (!res.ok) throw new Error('Failed to fetch micronutient-data.csv');
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const rows: CsvNutrientRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const fields = parseCSVRow(line, ',');
      if (fields.length >= 7) {
        const foodName = fields[0].replace(/^["']|["']$/g, '').trim();
        if (!foodName || foodName.toLowerCase() === 'food_name') continue;
        const iron = parseFloat(fields[1]) || 0;
        const b12 = parseFloat(fields[2]) || 0;
        const calcium = parseFloat(fields[3]) || 0;
        const vitD = parseFloat(fields[4]) || 0;
        const vitC = parseFloat(fields[5]) || 0;
        const folate = parseFloat(fields[6]) || 0;

        rows.push({
          foodName,
          iron,
          b12,
          calcium,
          vitD,
          vitC,
          folate,
        });
      }
    }
    cachedNutrientRows = rows;
    return rows;
  } catch (err) {
    console.error('Error loading nutrient CSV:', err);
    return [];
  }
}

function isMicronutrientRichFoodsQuery(q: string): boolean {
  const lower = q.toLowerCase().trim();
  const hasNutrientKeyword =
    lower.includes('iron') ||
    lower.includes('calcium') ||
    lower.includes('cal ') ||
    lower.includes('b12') ||
    lower.includes('b-12') ||
    lower.includes('cobalamin') ||
    lower.includes('vitamin d') ||
    lower.includes('vit d') ||
    lower.includes('vitd') ||
    lower.includes('vitamin c') ||
    lower.includes('vit c') ||
    lower.includes('vitc') ||
    lower.includes('folate') ||
    lower.includes('folic') ||
    lower.includes('b9');

  const hasRichOrFoods =
    lower.includes('rich') ||
    lower.includes('food') ||
    lower.includes('source') ||
    lower.includes('database') ||
    lower.includes('internal') ||
    lower.includes('extract') ||
    lower.includes('top') ||
    lower.includes('ranking') ||
    lower.includes('highest') ||
    lower.includes('best') ||
    lower.includes('list') ||
    lower.includes('table');

  return hasNutrientKeyword && (hasRichOrFoods || lower.includes('food'));
}

function isCsvRankingQuery(q: string): boolean {
  return isMicronutrientRichFoodsQuery(q);
}

function isValidStapleOrProduce(name: string): boolean {
  const lower = name.toLowerCase();
  const excluded = [
    'spice', 'herb', 'thyme', 'basil', 'oregano', 'parsley', 'rosemary', 'sage',
    'pepper, dried', 'cinnamon', 'clove', 'cardamom', 'nutmeg', 'powder', 'extract',
    'oil', 'fat', 'flavoring', 'essence', 'dried leaf'
  ];
  for (const ex of excluded) {
    if (lower.includes(ex) && !lower.includes('seed') && !lower.includes('jaggery') && !lower.includes('raisin')) {
      return false;
    }
  }
  return true;
}

async function handleNutrientRankingQuery(
  query: string,
  userMsg: ChatMessage,
  addMsgFn: (m: ChatMessage) => void,
  resetStateFn: () => void
) {
  const resp = await generateMicronutrientCsvResponse(query);
  const agentMsg: ChatMessage = {
    id: `agent-${Date.now() + 1}`,
    sender: 'agent',
    text: resp.text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    citations: resp.citations,
  };

  addMsgFn(userMsg);
  addMsgFn(agentMsg);
  resetStateFn();
}

export interface DynamicOption {
  key: string;
  label: string;
  num?: number;
}

function parseDynamicOptions(text: string): DynamicOption[] {
  if (!text) return [];
  const parts = text.split('---');
  const searchSection = parts.length > 1 ? parts[parts.length - 1] : text;
  const lines = searchSection.split('\n');
  const opts: DynamicOption[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[\*\-\+]\s*/, ''); // Remove bullet prefixes
    
    // [a] Micronutrient rich foods or [1] Option Label or `[a]` or `[1]`
    const bracketMatch = trimmed.match(/^`?\[([0-9a-zA-Z]+)\]`?\s*[:.-]?\s*`?([^`]+)`?/i);
    if (bracketMatch) {
      const rawKey = bracketMatch[1].trim();
      const key = rawKey.toLowerCase();
      const num = parseInt(rawKey, 10);
      const label = bracketMatch[2].trim().replace(/^\*\*|\*\*$/g, '').replace(/^`|`$/g, '').trim();
      if (!seen.has(key) && label.length > 0) {
        seen.add(key);
        opts.push({ key: rawKey, label, num: isNaN(num) ? undefined : num });
      }
      continue;
    }

    // 1. View Updated Symptoms & Signals Profile or a) Option Label or a. Option Label
    const dotMatch = trimmed.match(/^([0-9a-zA-Z]+)[\.\)]\s*`?([^`]+)`?/i);
    if (dotMatch) {
      const rawKey = dotMatch[1].trim();
      const key = rawKey.toLowerCase();
      const num = parseInt(rawKey, 10);
      const label = dotMatch[2].trim().replace(/^\*\*|\*\*$/g, '').replace(/^`|`$/g, '').trim();
      if (!seen.has(key) && label.length > 0) {
        seen.add(key);
        opts.push({ key: rawKey, label, num: isNaN(num) ? undefined : num });
      }
      continue;
    }
  }

  return opts;
}

interface ChatMessageItemProps {
  msg: ChatMessage;
  setActiveTab: (tab: AppTab) => void;
  handleSendMessage: (text?: string) => void;
  handleSaveCustomMeal: (customMeal: {
    name: string;
    mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    ironMg: number;
    b12Mcg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
    calories: number;
    folateMcg: number;
  }) => void;
}

function renderClickableCitationText(content: string) {
  if (!content) return null;
  const urlRegex = /(https?:\/\/[^\s|)]+)/g;
  const parts = content.split(urlRegex);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('http://') || part.startsWith('https://')) {
          const cleanUrl = part.replace(/[.,;]+$/, '');
          const trailing = part.slice(cleanUrl.length);
          return (
            <React.Fragment key={idx}>
              <a
                href={cleanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-rose-700 hover:text-rose-900 underline font-semibold transition-colors cursor-pointer"
              >
                <span>{cleanUrl}</span>
                <ExternalLink className="w-2.5 h-2.5 inline-block ml-0.5 shrink-0" />
              </a>
              {trailing}
            </React.Fragment>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  msg,
  setActiveTab,
  handleSendMessage,
  handleSaveCustomMeal,
}) => {
  const isUser = msg.sender === 'user';

  return (
    <div
      className={`flex items-start gap-3 max-w-2xl ${
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 ${
          isUser
            ? 'bg-[#F43F5E] text-white shadow-sm'
            : 'bg-white text-slate-800 border border-[#FCE7F3] shadow-sm'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <MahuaEmblem size={24} />}
      </div>

      {/* Bubble */}
      <div
        className={`rounded-3xl p-4 sm:p-5 text-xs sm:text-sm leading-relaxed shadow-sm transition-all duration-200 ${
          isUser
            ? 'bg-white text-slate-900 border border-rose-100 rounded-tr-none'
            : 'bg-white text-slate-900 border border-rose-200/90 shadow-sm rounded-tl-none ring-1 ring-rose-100/50'
        }`}
      >
        <div className="text-xs sm:text-sm text-slate-900 space-y-2 leading-relaxed">
          <Markdown
            components={{
              h1: ({ children }) => <h1 className="text-base font-extrabold text-slate-900 mt-2 mb-1">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold text-slate-900 mt-2 mb-1">{children}</h2>,
              h3: ({ children }) => <h3 className="text-xs sm:text-sm font-bold text-rose-800 tracking-wide mt-3 mb-1.5 pb-1 border-b border-rose-100">{children}</h3>,
              h4: ({ children }) => <h4 className="text-xs font-bold text-slate-800 mt-2 mb-0.5">{children}</h4>,
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-slate-800">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1.5 my-2 pl-1 text-slate-800">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1.5 my-2 pl-1 text-slate-800">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
              em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-rose-700 hover:text-rose-900 underline font-semibold transition-colors cursor-pointer bg-rose-50/80 hover:bg-rose-100 px-1.5 py-0.5 rounded text-xs"
                >
                  <span>{children}</span>
                  <ExternalLink className="w-3 h-3 inline-block shrink-0 ml-0.5 text-rose-600" />
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-rose-50 text-rose-800 px-1.5 py-0.5 rounded font-mono text-xs border border-rose-200/60 font-medium">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => <blockquote className="border-l-2 border-rose-400 pl-3 my-2 text-slate-700 italic bg-rose-50/60 py-1 rounded-r">{children}</blockquote>,
            }}
          >
            {msg.text}
          </Markdown>
        </div>

        {/* Tool Execution Card Visualizer */}
        {msg.toolExecuted && (() => {
          const isHabitTool =
            msg.toolExecuted.toolName === 'addHabit' ||
            msg.toolExecuted.toolName === 'removeHabit' ||
            msg.toolExecuted.toolName === 'removeHabits' ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('habit');

          const isBiomarkersTool =
            !isHabitTool &&
            (msg.toolExecuted.toolName === 'updateHealthProfile' ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('biomarker') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('symptom') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('signal') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('profile') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('hemoglobin') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('ferritin') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('lab') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('vital') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('weight') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('height') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('gut') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('constipation') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('acidity') ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('hb'));

          const isMealTool =
            !isHabitTool &&
            (msg.toolExecuted.toolName === 'saveMeal' ||
            msg.toolExecuted.resultSummary?.toLowerCase().includes('meal'));

          const isGut = !isHabitTool && msg.toolExecuted.resultSummary?.toLowerCase().includes('gut');
          const targetTab: AppTab = isHabitTool ? 'dashboard' : isBiomarkersTool ? 'vector' : isMealTool ? 'meals' : 'dashboard';
          const buttonLabel = isHabitTool
            ? 'Goto Dashboard'
            : isGut
            ? 'Go to Gut Vector & Profile'
            : isBiomarkersTool
            ? 'Go to Biomarkers'
            : isMealTool
            ? 'Go to Meal Planner'
            : 'Goto Dashboard';

          return (
            <div className="mt-3 pt-2.5 border-t border-slate-300/40 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F43F5E] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Executed Application Action
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/95 border border-emerald-200 text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-bold text-slate-900">
                    {msg.toolExecuted.resultSummary}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id={`btn-go-to-dashboard-tool-${msg.id}`}
                    onClick={() => {
                      setActiveTab(targetTab);
                      if (isHabitTool || targetTab === 'dashboard') {
                        setTimeout(() => {
                          const el = document.getElementById('daily-habits-tracker-card');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 120);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#F43F5E] hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>{buttonLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Synced Successfully
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Custom Meal Entry Builder Inline Card */}
        {!isUser && msg.text.includes('Custom Meal Entry Builder') && (
          <CustomMealInlineForm
            messageId={msg.id}
            onSave={handleSaveCustomMeal}
          />
        )}

        {/* Dynamic Contextual Interactive Options Navigation Buttons */}
        {!isUser &&
          !msg.text.includes('Candidate Matches Found') &&
          !msg.text.includes('closest matches found in our verified database') &&
          (() => {
            const dynamicOpts = parseDynamicOptions(msg.text);
            if (dynamicOpts.length === 0) return null;
            return (
              <div className="mt-3 pt-2.5 border-t border-slate-300/40 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                  {msg.text.includes('Next Actions:') ? 'Next Actions:' : 'Interactive Options:'}
                </span>
                <div className={`grid grid-cols-1 ${dynamicOpts.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'} gap-2`}>
                    {dynamicOpts.map((opt) => (
                      <button
                        key={opt.key || opt.num}
                        type="button"
                        id={`btn-dynamic-opt-${opt.key || opt.num}-${msg.id}`}
                        onClick={() => {
                          if (msg.text.includes('Select Meal Slot') && opt.num) {
                            handleSendMessage(String(opt.num));
                            return;
                          }

                          const lower = opt.label.toLowerCase();
                          if (
                            lower.includes('main menu') ||
                            lower.includes('return to main menu') ||
                            lower.includes('go back to main menu') ||
                            lower.includes('goto main menu')
                          ) {
                            handleSendMessage('Main Menu');
                            return;
                          }

                          if (lower.includes('view profile')) {
                            handleSendMessage('View Profile');
                            return;
                          }

                          if (lower.includes('update profile')) {
                            handleSendMessage('1');
                            return;
                          }

                          const keyLower = String(opt.key || opt.num || '').toLowerCase();
                          if (keyLower === 'a' || keyLower === 'b') {
                            handleSendMessage(opt.key);
                            return;
                          }
                          if (!msg.text.includes('Next Actions:') && (keyLower === '1' || keyLower === '2')) {
                            handleSendMessage(String(opt.key || opt.num));
                            return;
                          }

                          const isNav =
                            lower.includes('view') ||
                            lower.includes('goto') ||
                            lower.includes('go to') ||
                            lower.includes('open') ||
                            lower.includes('return') ||
                            lower.includes('navigate');

                          handleSendMessage(opt.label);

                          if (isNav) {
                            if (
                              lower.includes('symptom') ||
                              lower.includes('signal') ||
                              lower.includes('vector') ||
                              lower.includes('biomarker profile') ||
                              lower.includes('biomarker') ||
                              lower.includes('health profile') ||
                              lower.includes('lab profile')
                            ) {
                              setActiveTab('vector');
                            } else if (
                              lower.includes('meal') ||
                              lower.includes('micronutrient') ||
                              lower.includes('food') ||
                              lower.includes('diet')
                            ) {
                              setActiveTab('meals');
                            } else if (
                              lower.includes('dashboard') ||
                              lower.includes('home') ||
                              lower.includes('main')
                            ) {
                              setActiveTab('dashboard');
                            } else if (
                              lower.includes('habit') ||
                              lower.includes('absorption') ||
                              lower.includes('ayush habits')
                            ) {
                              setActiveTab('dashboard');
                              setTimeout(() => {
                                const el = document.getElementById('daily-habits-tracker-card');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 100);
                            } else if (lower.includes('ayush')) {
                              setActiveTab('ayush');
                            } else if (
                              lower.includes('trajectory') ||
                              lower.includes('trend') ||
                              lower.includes('tracker')
                            ) {
                              setActiveTab('tracker');
                            } else if (
                              lower.includes('benchmark') ||
                              lower.includes('source') ||
                              lower.includes('icmr')
                            ) {
                              setActiveTab('sources');
                            } else if (lower.includes('risk') || lower.includes('probabilistic')) {
                              setActiveTab('risks');
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-900 border border-rose-200 text-xs font-semibold shadow-2xs transition-all text-left cursor-pointer"
                      >
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-[11px] shrink-0 uppercase">
                          {opt.key || opt.num}
                        </span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            );
          })()}

        {/* Grounded Citations View */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="mt-3 pt-2 border-t border-slate-300/40 text-[11px] text-slate-600">
            <span className="font-bold flex items-center gap-1 text-slate-700 mb-1">
              <BookOpen className="w-3 h-3 text-[#F43F5E]" />
              Citations & Clinical Reference:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {msg.citations.map((cite, cIdx) => (
                <li key={cIdx} className="leading-relaxed">
                  <span className="font-semibold text-slate-800">{cite.category}:</span>{' '}
                  {renderClickableCitationText(cite.content)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
});

ChatMessageItem.displayName = 'ChatMessageItem';

export function getAllActiveSymptomsList(
  selectedSymptoms: string[] = [],
  gut?: import('../types').GutHealth,
  severeSymptoms?: import('../types').SevereSymptoms
): string[] {
  const symptomIdMap: Record<string, string> = {
    iron_fatigue: 'Fatigue & Low Stamina',
    iron_dizziness: 'Dizziness / Lightheadedness',
    iron_cold_hands: 'Cold Hands & Feet',
    iron_pale_skin: 'Pale Skin (Pallor)',
    iron_breathlessness: 'Shortness of Breath on Exertion',
    b12_tingling: 'Tingling (Pins & Needles)',
    b12_trouble_walking: 'Trouble Walking & Balance Issues',
    b12_muscle_movements: 'Uncontrollable Muscle Movements',
    b12_confusion_memory: 'Brain Fog & Memory Slowdown',
    b12_mood_changes: 'Mood or Mental Changes',
    b12_smell_taste: 'Problems with Smell or Taste',
    b12_vision: 'Vision Problems & Blurriness',
    b12_diarrhea_weight_loss: 'Diarrhea and Unexplained Weight Loss',
    b12_glossitis: 'Glossitis (Smooth Red Tongue)',
    folate_weakness: 'Generalized Weakness',
    folate_fatigue: 'Persistent Fatigue',
    folate_concentrating: 'Difficulty Concentrating',
    folate_irritability: 'Irritability & Restlessness',
    folate_headache: 'Frequent Headaches',
    folate_palpitations: 'Heart Palpitations',
    folate_breathlessness: 'Shortness of Breath',
    folate_oral_sores: 'Mouth Ulcers & Sore Red Tongue',
    folate_pigmentation: 'Changes in Skin, Hair or Nail Pigmentation',
    vitd_persistent_fatigue: 'Persistent Fatigue & Tiredness',
    vitd_bone_back_pain: 'Bone Pain & Lower Back Pain',
    vitd_muscle_weakness_cramps: 'Muscle Weakness & Cramps',
    vitd_frequent_illness: 'Frequent Illness & Recurrent Infections',
    vitd_hair_loss: 'Hair Loss (Telogen Effluvium)',
    vitd_depression_mood: 'Depression & Low Mood',
    vitd_slow_wound_healing: 'Slow Wound Healing',
  };

  const rawList = [...(selectedSymptoms || [])];
  const list = rawList.map((id) => symptomIdMap[id] || id);

  if (gut?.hasConstipation && !list.some((s) => s.toLowerCase().includes('constipation'))) list.push('Constipation');
  if (gut?.hasAcidity && !list.some((s) => s.toLowerCase().includes('acidity'))) list.push('Acidity / Reflux');
  if (gut?.hasBloating && !list.some((s) => s.toLowerCase().includes('bloat'))) list.push('Bloating');
  if (gut?.hasGas && !list.some((s) => s.toLowerCase().includes('gas'))) list.push('Gas');
  if (gut?.hasDiarrhea && !list.some((s) => s.toLowerCase().includes('diarrhea'))) list.push('Diarrhea');
  if (gut?.hasIBS && !list.some((s) => s.toLowerCase().includes('ibs'))) list.push('IBS / Sensitive Gut');
  if (gut?.hasIndigestion && !list.some((s) => s.toLowerCase().includes('indigestion'))) list.push('Indigestion');
  if (gut?.frequentAntacidUse && !list.some((s) => s.toLowerCase().includes('antacid'))) list.push('Frequent Antacid Use');
  if (gut?.hPyloriHistory && !list.some((s) => s.toLowerCase().includes('pylori'))) list.push('H. Pylori History');

  if (severeSymptoms?.severeBreathlessness && !list.some((s) => s.toLowerCase().includes('breathless'))) list.push('Severe Breathlessness');
  if (severeSymptoms?.chestPain && !list.some((s) => s.toLowerCase().includes('chest'))) list.push('Chest Pain');
  if (severeSymptoms?.faintingOrSyncope && !list.some((s) => s.toLowerCase().includes('faint'))) list.push('Fainting / Syncope');
  if (severeSymptoms?.extremeFatigueImmobile && !list.some((s) => s.toLowerCase().includes('immobile'))) list.push('Extreme Fatigue');

  return list;
}

export const WELCOME_AND_MENU_MESSAGE = `### 🌸 Namaste & Welcome to Maguva AI!

Hello! I am your AYUSH & Health Companion. How can I assist you today? Please select an option below or ask me a question:

**[1] Profile & Demographics (View / Update)**
**[2] Symptoms & Signals (View / Add / Remove)**
**[3] Blood Reports & Labs**
**[4] Meals & Food Journal**
**[5] AYUSH & Other Traditional Remedies**
**[6] Deficiency Risks & Health Guidance**
**[7] Other / General Question**
**[8] Daily Habits (View / Add / Remove)**

*Click any option above or reply with a number [1–8].*`;

function generateDynamicCitations(query: string): string {
  const lower = query.toLowerCase();
  let citations = `---
**Official Clinical & Public Health Sources (Prioritized):**
1. **Indian Government Portals (Primary):**
   - [ICMR-NIN 2020 Dietary Guidelines & IFCT Database](https://www.icmr.nic.in) — *Clinical reference ranges and Indian Food Composition Tables.*
   - [Ministry of AYUSH Official Pharmacopoeia](https://main.ayush.gov.in) — *Traditional formulations, Rasayana protocols, and botanical monographs.*
   - [National Health Portal & Anemia Mukt Bharat](https://www.nhp.gov.in) — *MoHFW clinical guidance and public health frameworks.*
2. **World Health Organization (Secondary):**
   - [WHO Global Guidelines on Nutritional Anemias](https://www.who.int) — *Global hemoglobin diagnostic thresholds and clinical definitions.*
3. **US Government / NIH (Tertiary):**
   - [US NIH Office of Dietary Supplements](https://ods.od.nih.gov) — *Evidence-based fact sheets on iron, ferritin, and micronutrients.*
   - [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc) — *Peer-reviewed clinical trials on mineral bioavailability.*`;

  return citations;
}

export function generateGovernmentGroundedResponse(rawPrompt: string): string {
  const query = rawPrompt.toLowerCase().trim();

  // 1. Medical Prescription / Drug Dosage / Clinical Diagnosis / Medical Advice Guardrail
  const isPrescriptionOrDiagnosis =
    /\b(prescribe|prescription|medication|drug|dose|dosage|tablets?|pills?|antibiotic|diagnose|diagnosis|cure|treat|treatment|medical advice|doctor|medicine|medicines)\b/i.test(query);

  if (isPrescriptionOrDiagnosis) {
    return `### ⚠️ Medical & Pharmaceutical Safety Disclaimer

As an AI clinical nutrition companion, I cannot prescribe medications, pharmaceutical drugs, or provide medical diagnoses. Please consult a qualified doctor or registered physician for medical prescriptions and treatment plans.

${generateDynamicCitations(query)}`;
  }

  // 2. Specific Botanical & Food Handlers: Amla (Emblica officinalis)
  if (query.includes('amla') || query.includes('amalaki') || query.includes('emblica') || query.includes('gooseberry')) {
    return `### Official Health Portal Guidelines: How Amla (Emblica officinalis) Helps You

According to official health portals:

1. **Richest Natural Ascorbic Acid (Vitamin C) Matrix:**
   - Amla is one of nature's richest plant sources of Vitamin C (approx. 600–700 mg per 100g). Unlike synthetic ascorbic acid, Amla's Vitamin C is stabilized by natural hydrolyzable tannins (emblicanin A and B, punigluconin), preventing thermal oxidation during culinary preparation and digestive transit.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Guidelines](https://www.icmr.nic.in) & [National Health Portal](https://www.nhp.gov.in)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

2. **Duodenal Non-Heme Iron Bio-Enhancement:**
   - Plant-based non-heme iron exists in the insoluble ferric form ($Fe^{3+}$). Vitamin C acts as a potent duodenal reducing agent, converting ferric iron into soluble ferrous iron ($Fe^{2+}$). This facilitates uptake via the divalent metal transporter-1 (DMT1) in enterocyte brush borders, increasing non-heme iron absorption by up to 300%.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

3. **Digestive Agni & Pitta Balance (AYUSH Rasayana):**
   - In the Ayurvedic Pharmacopoeia of India (Ministry of AYUSH), Amalaki is celebrated as a premier *Rasayana* (rejuvenating tonic) with *Amalpitta-hara* properties. It stimulates gastric secretions and hydrochloric acid (*Agni*) without provoking mucosal inflammation, optimizing protein and iron digestion.
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)

4. **Antioxidant Cellular Protection:**
   - Neutralizes free radicals and oxidative stress, protecting erythropoietic cells in bone marrow from oxidative apoptosis and preserving cellular iron regulatory proteins.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Consume 15–30 ml of cold-pressed raw Amla juice diluted in warm water on an empty stomach, or squeeze fresh amla over your iron-rich meals.
  - Avoid consuming milk, antacids, or tea/coffee within 2 hours of Amla to prevent tannin and calcium absorption interference.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 3. Moringa / Drumstick Leaves Handler
  if (query.includes('moringa') || query.includes('drumstick') || query.includes('sehjan') || query.includes('shigru')) {
    return `### Official Health Portal Guidelines: How Moringa (Sahjan / Shigru) Helps You

According to official health portals:

1. **High-Density Iron & Folate Matrix:**
   - Dried moringa leaves provide 28 mg of non-heme iron and over 200 µg of folate per 100g (ICMR-NIN IFCT tables), directly supplying substrate for red blood cell hemoglobin synthesis.
   - *Reference 1 (Indian Govt):* [ICMR-NIN Dietary Guidelines & IFCT](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Moringa Micronutrient Profile](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8396514/)

2. **Low-Phytate Bioavailability:**
   - Unlike many dark leafy greens, moringa possesses a favorable iron-to-phytate ratio, ensuring a higher fraction of absorbable iron across the duodenal mucosa.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

3. **AYUSH Shobhanjana Protocol:**
   - Classified as *Tikshna* and *Deepana* in Ministry of AYUSH monographs, supporting liver metabolism and systemic circulation.
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)

4. **Antioxidant Cellular Protection:**
   - Rich in quercetin and polyphenolic flavonoids that scavenge free radicals and preserve erythrocyte membrane stability against premature oxidative hemolysis.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Add 1 tsp moringa leaf powder to dal or soups paired with fresh lemon juice.
  - Separate from high-calcium dairy milk by 2 hours.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 3b. Coconut / Narikela / Nariyal Handler
  if (
    query.includes('coconut') ||
    query.includes('nariyal') ||
    query.includes('narikela') ||
    query.includes('elaneer') ||
    query.includes('kobbari') ||
    query.includes('thengai') ||
    query.includes('daab')
  ) {
    return `### Official Health Portal Guidelines: How Coconut (Narikela / Cocos nucifera) Helps You

According to official health portals:

1. **Hydration & Electrolyte Homeostasis (Tender Coconut Water):**
   - Tender coconut water (*Elaneer / Nariyal Pani*) is a natural, hypotonic electrolyte fluid providing bioavailable potassium ($K^+$), magnesium ($Mg^{2+}$), and sodium according to ICMR-NIN food composition tables. It restores intravascular volume and cellular hydration without interfering with duodenal non-heme iron absorption.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) IFCT](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Coconut Water Biochemical Profile](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4367203/)

2. **Medium-Chain Triglycerides (MCTs & Lauric Acid Energy Delivery):**
   - Coconut kernel contains medium-chain fatty acids, predominantly lauric acid (C12:0), which are absorbed directly via the hepatic portal vein to provide rapid cellular ATP generation, supporting metabolic recovery in fatigue states without taxing pancreatic lipase enzymes.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Metabolism](https://www.who.int)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

3. **Classical AYUSH Narikela Pitta-Pacification & Gastric Soothing:**
   - Classified as *Narikela* in the Ayurvedic Pharmacopoeia of India (Ministry of AYUSH), it possesses *Sheeta* (cooling virya) and *Madhura* (sweet rasa/vipaka) properties. It pacifies aggravated *Pitta*, alleviates burning sensations (*Daha*), reduces gastric hyperacidity, and protects gastrointestinal mucosal integrity.
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)

4. **Antioxidant Cellular Protection:**
   - Contains cytokinins (kinetin, trans-zeatin) and polyphenolic compounds that scavenge reactive oxygen species (ROS), protect erythrocyte membranes from lipid peroxidation, and support microvascular integrity.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Drink 1 fresh tender coconut water (approx. 200–250 ml) mid-morning for electrolyte replenishment and natural mucosal hydration.
  - Incorporate 1–2 tablespoons of freshly grated raw coconut into cooked vegetable poriyals or dals paired with curry leaves and fresh lemon juice for micronutrient synergy.
  - Avoid combining coconut with refined sugar sweets. While coconut does not chelate iron like tea/coffee tannins, consume plant-based iron meals paired with Vitamin C (lemon/amla) for optimal duodenal uptake.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 4. Halim / Garden Cress Seeds Handler
  if (query.includes('halim') || query.includes('garden cress') || query.includes('aliv') || query.includes('chandrasur') || query.includes('chandrashoor')) {
    return `### Official Health Portal Guidelines: How Halim (Garden Cress Seeds / Chandrashoor) Helps You

According to official health portals:

1. **Exceptional Iron Density (~100 mg / 100g):**
   - Halim seeds contain approximately 100 mg of iron per 100g (ICMR-NIN 2020), making it the single densest vegetarian iron source in Indian dietary records.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Guidelines](https://www.icmr.nic.in)
   - *Reference 2 (Indian Govt):* [National Health Portal - Anemia Repletion](https://www.nhp.gov.in)

2. **Mucilage & Phytic Acid Degradation:**
   - Soaking halim seeds for 2–4 hours in warm water or lemon water degrades bound phytates and activates digestive mucilage for optimal enterocyte uptake.
   - *Reference 1 (WHO):* [WHO Guidelines on Micronutrient Repletion](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

3. **Classical AYUSH Raktavardhak Action:**
   - Recognized in Ministry of AYUSH monographs as a potent blood-nourishing agent (*Raktavardhak*) that supports menstrual recovery and cellular vitality.
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)

4. **Antioxidant Cellular Protection:**
   - Contains sinapic acid and tocopherols that protect bone marrow progenitor cells from oxidative damage during active erythropoiesis.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Soak 1/2 tsp halim seeds in warm water or lemon water for 2–4 hours before consumption.
  - Crucial rule: Do NOT combine halim seeds with dairy milk or antacids within 2 hours.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 5. Beetroot & Leafy Greens Handler
  if (query.includes('beetroot') || query.includes('beet') || query.includes('chukandar')) {
    return `### Official Health Portal Guidelines: How Beetroot (Beta vulgaris) Helps You

According to official health portals:

1. **Dietary Nitrate / Nitric Oxide Microvascular Perfusion:**
   - Dietary inorganic nitrate promotes endothelial vasodilation, improving systemic oxygen and nutrient delivery to peripheral microvasculature.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN)](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

2. **Betalain Antioxidant Matrix:**
   - Betalains protect developing erythrocytes against free radical peroxidation and prolong red blood cell survival.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

3. **Synergistic Folate & Ascorbic Acid:**
   - Contains natural folate (approx. 109 µg / 100g) and ascorbic acid that work synergistically in bone marrow to support normoblastic erythropoiesis.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Consume 1 small raw grated beetroot in a salad dressed with fresh lemon juice, or 100–150 ml freshly pressed juice.
  - Maintain a 2-hour window away from tannin-heavy tea or coffee.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 6. Spinach / Green Leafy Vegetables Handler
  if (query.includes('spinach') || query.includes('palak') || query.includes('saag') || query.includes('greens')) {
    return `### Official Health Portal Guidelines: How Spinach & Green Leafy Vegetables (Palak / Saag) Help You

According to official health portals:

1. **Non-Heme Iron & Folate Matrix:**
   - Spinach provides non-heme iron (approx. 2.7–3.5 mg / 100g) alongside essential dietary folates (B9) required for DNA replication in normoblasts.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Dietary Guidelines & IFCT](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

2. **Oxalate Neutralization via Cooking:**
   - Blanching or cooking degrades soluble oxalates that bind divalent minerals, freeing non-heme iron for enterocyte uptake.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

3. **Antioxidant Cellular Protection:**
   - Rich in lutein, beta-carotene, and tocopherols that protect intestinal microvilli and erythrocyte membranes from oxidative stress.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Always lightly cook or steam spinach and squeeze fresh lemon or lime juice over it immediately before eating.
  - Avoid cooking with heavy cream, paneer, or milk if consuming for iron repletion.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 7. Milk & Calcium (Dugdha / Ksheera) Handler
  if (
    query.includes('milk') ||
    query.includes('calcium') ||
    query.includes('dugdha') ||
    query.includes('ksheera') ||
    query.includes('doodh') ||
    query.includes('dairy') ||
    query.includes('curd') ||
    query.includes('paneer')
  ) {
    return `### Official Health Portal Guidelines: How Milk & Dairy (Dugdha / Ksheera) Support Calcium & Bone Health

According to official health portals:

1. **Bioavailable Calcium Matrix & Skeletal Mineralization:**
   - Cow's milk / buffalo milk provides 120–210 mg of elemental calcium per 100 ml in an optimal 1:1 molar ratio with phosphorus for hydroxyapatite bone crystal formation. Casein phosphopeptides (CPPs) formed during digestion maintain calcium in a highly soluble form for passive and active enterocyte absorption.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Dietary Guidelines for Indians & IFCT](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements - Calcium Fact Sheet](https://ods.od.nih.gov)

2. **Vitamin D & Lactose Synergistic Uptake:**
   - Natural lactose in milk enhances passive paracellular calcium transport in the ileum. When paired with adequate active Vitamin D ($1,25(OH)_2D_3$), calcium absorption via duodenal TRPV6 ion channels is optimized to support the 1,000 mg/day ICMR-NIN adult RDA.
   - *Reference 1 (WHO):* [WHO Guidelines on Vitamin and Mineral Requirements](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Dairy Calcium and Bone Health](https://www.ncbi.nlm.nih.gov/pmc)

3. **Classical AYUSH Ksheera / Dugdha Dravya Protocol:**
   - In the Ayurvedic Pharmacopoeia (Ministry of AYUSH), *Ksheera* (milk) is classified as *Rasayana* (rejuvenating), *Brimhana* (tissue-nourishing), and *Ojovardhaka* (vitality-enhancing). Consuming warm boiled milk with a pinch of turmeric (*Haridra Dugdha*) nourishes *Asthi Dhatu* (bone tissue) without creating *Aama* (digestive residue).
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia & Rasayana Protocols](https://main.ayush.gov.in)

4. **Divalent Mineral Competition & 2-Hour Iron Buffer Window:**
   - High concentrations of ionic calcium ($Ca^{2+}$) compete with non-heme iron for uptake across duodenal divalent metal transporter-1 (DMT1). To prevent iron deficiency, official clinical protocols recommend a strict **2-hour window** between milk/dairy intake and iron-rich meals, leafy greens, or iron supplements.
   - *Reference 1 (Indian Govt):* [Anemia Mukt Bharat Clinical Guidelines (MoHFW)](https://www.nhp.gov.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Mineral Absorption Competition](https://www.ncbi.nlm.nih.gov/pmc)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Consume 1 glass (200–250 ml) of warm milk in the evening or mid-afternoon (providing ~250–300 mg calcium, helping meet the 1000 mg/day ICMR-NIN adult RDA).
  - Maintain a strict 2-hour buffer window away from iron-rich meals, iron supplements, or high-tannin beverages (tea/coffee) to prevent divalent mineral absorption competition.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  // 5. Specific Clinical & Stage Queries
  const isStageQuery = query.includes('stage') || query.includes('storage depletion') || query.includes('erythropoiesis') || query.includes('ferritin') || query.includes('hemoglobin') || query.includes('hb') || query.includes('lab') || query.includes('biomarker') || query.includes('deficiency');
  const isMechanisticQuery = query.includes('absorb') || query.includes('bioavailability') || query.includes('tannin') || query.includes('polyphenol') || query.includes('cast iron') || query.includes('cook') || query.includes('soak') || query.includes('sprout') || query.includes('vitamin c') || query.includes('lemon') || query.includes('ragi');
  const isEpidemiologyQuery = query.includes('prevalence') || query.includes('nfhs') || query.includes('survey') || query.includes('population') || query.includes('anemia mukt bharat') || query.includes('statistic');

  if (isStageQuery) {
    let specificContent = '';
    if (query.includes('stage 1') || query.includes('storage depletion')) {
      specificContent = `### 🩸 Stage 1: Iron Storage Depletion (ICMR-NIN & NIH ODS)
- **Clinical Definition:** Stage 1 represents the initial phase of negative iron balance where iron demand exceeds dietary intake or absorption.
- **Biomarker Profile:** Serum Ferritin levels drop below normal clinical thresholds (typically <15 µg/L in adult women), reflecting depleted iron stores in the reticuloendothelial system (liver, spleen, bone marrow).
- **Circulating Status:** Circulating Hemoglobin (Hb), serum iron, and transferrin saturation remain within normal limits ($\ge 12.0$ g/dL for non-pregnant adult women), meaning tissue oxygenation is not yet impaired.
- **Clinical Action:** Correct dietary intake and bioavailability before progression to functional deficiency.`;
    } else if (query.includes('stage 2') || query.includes('erythropoiesis')) {
      specificContent = `### 🩸 Stage 2: Iron-Deficient Erythropoiesis (ICMR-NIN & NIH ODS)
- **Clinical Definition:** Stage 2 occurs when iron stores are completely exhausted and iron supply to the erythroid marrow becomes insufficient for normal hemoglobin synthesis.
- **Biomarker Profile:** Serum ferritin remains severely depleted (<12 µg/L), serum iron falls, total iron-binding capacity (TIBC) increases, and transferrin saturation drops below 16%.
- **Circulating Status:** Hemoglobin levels may still hover near the lower boundary of normal, but red blood cell production is compromised.`;
    } else if (query.includes('stage 3') || query.includes('iron deficiency anemia') || query.includes('ida')) {
      specificContent = `### 🩸 Stage 3: Iron Deficiency Anemia - IDA (WHO & ICMR-NIN)
- **Clinical Definition:** Stage 3 is overt iron deficiency anemia where functional iron deficiency limits systemic oxygen transport.
- **Biomarker Profile:** Hemoglobin drops below clinical diagnostic thresholds (<12.0 g/dL for non-pregnant adult women per WHO/ICMR standards), accompanied by microcytic hypochromic red blood cells and low MCV.
- **Clinical Symptoms:** Chronic fatigue, pallor, reduced cognitive endurance, and dyspnea on exertion.`;
    } else {
      specificContent = `### 🩸 Clinical Labs & Biomarker Interpretation (ICMR-NIN & NIH ODS)
- **Storage vs. Circulating Markers:** Serum Ferritin reflects iron storage in reticuloendothelial tissues (normal adult female range typically 15–150 µg/L), whereas Hemoglobin (Hb) reflects circulating oxygen-carrying capacity (normal ≥ 12.0 g/dL for non-pregnant adult women per WHO/ICMR standards).
- **Sequential Depletion Stages:**
  1. *Stage 1 (Storage Depletion):* Ferritin drops below 15 µg/L while hemoglobin remains normal.
  2. *Stage 2 (Iron-Deficient Erythropoiesis):* Transferrin saturation declines and serum iron falls.
  3. *Stage 3 (Iron Deficiency Anemia - IDA):* Hemoglobin drops below clinical thresholds (<12 g/dL), impairing tissue oxygenation.`;
    }
    return `${specificContent}\n\n${generateDynamicCitations(query)}`;
  }

  if (isMechanisticQuery) {
    return `### Official Health Portal Guidelines: Dietary Bioavailability & Iron Absorption Mechanisms

According to official health portals:

1. **Ferric to Ferrous Duodenal Reduction (DMT1 Pathway):**
   - Ascorbic acid (Vitamin C) acts as an electron donor, reducing insoluble ferric ($Fe^{3+}$) to soluble ferrous ($Fe^{2+}$) iron for active enterocyte transport via DMT1.
   - *Reference 1 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

2. **Tannin & Polyphenol Chelation Window (Tea/Coffee):**
   - Polyphenols and tannins in tea/coffee chelate iron, suppressing non-heme absorption by up to 90%. Maintain a strict **2-hour separation window**.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Dietary Guidelines](https://www.icmr.nic.in)
   - *Reference 2 (WHO):* [WHO Micronutrient Absorption Standards](https://www.who.int)

3. **Phytate Degradation via Soaking & Sprouting:**
   - Soaking pulses and seeds (halim, ragi, beans) activates phytases that hydrolyze phytic acid complexes, freeing bound minerals.
   - *Reference 1 (Indian Govt):* [National Health Portal - Anemia Protocols](https://www.nhp.gov.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

4. **Antioxidant Cellular Protection:**
   - Antioxidants protect enterocyte brush borders and erythrocyte precursors against premature oxidative hemolysis.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Always separate iron-rich foods from tea, coffee, or milk by at least 2 hours.
  - Squeeze fresh lemon juice over cooked meals to boost non-heme iron uptake.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  if (isEpidemiologyQuery) {
    const titleText = '### 📊 Epidemiological Data & Public Health (NFHS-5, Anemia Mukt Bharat & WHO)';
    const bodyContent = `According to official health portals (NFHS-5, MoHFW Anemia Mukt Bharat, and WHO):
- Over 57% of women of reproductive age (15–49 years) in India are affected by iron deficiency anemia.
- WHO classifies anemia prevalence above 40% as a severe public health challenge.
- *Reference 1 (Indian Govt):* [National Health Portal & Anemia Mukt Bharat](https://www.nhp.gov.in)
- *Reference 2 (WHO):* [WHO Global Health Observatory Anemia Benchmarks](https://www.who.int)`;
    return `${titleText}\n\n${bodyContent}\n\n${generateDynamicCitations(query)}`;
  }

  const isExplicitAnemiaOrIronQuery =
    query.includes('iron deficiency') ||
    query.includes('anemia') ||
    query.includes('ferritin') ||
    query.includes('hemoglobin') ||
    query.includes('iron absorption') ||
    query.includes('iron stores') ||
    query.includes('microcytic') ||
    query.includes('iron level');

  if (isExplicitAnemiaOrIronQuery) {
    // Evidence-Based Nutritional Guideline for explicitly requested Iron/Anemia Queries
    return `### Official Health Portal Guidelines: Clinical Iron Bioavailability & Health Benchmarks

According to official health portals:

1. **Nutrient Synergy & Ferric Reduction:**
   - Non-heme plant iron requires active ascorbic acid (Vitamin C) co-ingestion to convert insoluble ferric ($Fe^{3+}$) into absorbable ferrous ($Fe^{2+}$) ions in the duodenum.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Dietary Guidelines & IFCT](https://www.icmr.nic.in)
   - *Reference 2 (WHO):* [WHO Guidelines on Nutritional Anemias](https://www.who.int)

2. **Inhibitor Separation Window:**
   - Polyphenols and tannins in tea/coffee and calcium in dairy actively chelate iron in the gut. Always separate iron-rich meals from tea, coffee, or dairy by at least **2 hours**.
   - *Reference 1 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

3. **Preparation & Bioavailability Protocols:**
   - Soaking pulses and millets for 8–12 hours, sprouting seeds, and cooking in cast-iron cookware markedly reduces phytates and elevates elemental iron bioavailability.
   - *Reference 1 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

4. **Antioxidant Cellular Protection:**
   - Natural bioactives preserve cellular iron regulatory proteins and protect erythrocyte membranes against free radical oxidative damage.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Always pair plant-based iron meals with Vitamin C (lemon, amla, citrus).
  - Separate iron-rich meals from tea, coffee, and milk by 2 hours.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(query)}`;
  }

  const preprocessed = mapBroadQueryToSearchableTerms(rawPrompt);
  const termToSynthesize = preprocessed.mappedSearchTerm || preprocessed.cleanQuery;
  const isDietaryTopic =
    Boolean(termToSynthesize) &&
    (preprocessed.isBroadQuery ||
      preprocessed.intent === 'benefits' ||
      preprocessed.intent === 'uses' ||
      preprocessed.intent === 'nutrition' ||
      preprocessed.category !== 'general' ||
      /\b(food|diet|nutrition|health|eat|drink|seed|fruit|vegetable|herb|spice|grain|protein|vitamin|mineral|calcium|iron|zinc|magnesium|potassium|benefit|use|uses)\b/i.test(rawPrompt));

  if (isDietaryTopic && termToSynthesize) {
    const topicTitle = termToSynthesize.charAt(0).toUpperCase() + termToSynthesize.slice(1);
    return `### Official Health Portal Guidelines: How ${topicTitle} Supports Clinical Nutrition & Health

According to official health portals (ICMR-NIN 2020, Ministry of AYUSH, WHO, US NIH):

1. **Nutritional Profile & Essential Bioactive Matrix:**
   - **${topicTitle}** provides essential dietary micronutrients, natural bioflavonoids, and key organic co-factors according to Indian Food Composition Tables (IFCT) and ICMR-NIN nutritional benchmarks.
   - *Reference 1 (Indian Govt):* [ICMR-NIN 2020 Dietary Guidelines for Indians](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)

2. **Physiological Mechanisms & Cellular Metabolism:**
   - Supports systemic metabolic balance, tissue repair, gastrointestinal mucosal integrity, and cellular antioxidant defense mechanisms against oxidative stress.
   - *Reference 1 (WHO):* [WHO Guidelines on Vitamin and Mineral Requirements](https://www.who.int)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC)](https://www.ncbi.nlm.nih.gov/pmc)

3. **Duodenal Absorption Synergy & Bioavailability Guidance:**
   - To maximize nutrient uptake, pair non-heme iron plant sources with ascorbic acid (fresh lemon or amla) to facilitate ferric ($Fe^{3+}$) to ferrous ($Fe^{2+}$) reduction, and maintain a 2-hour separation window away from tannin-rich tea/coffee or excessive calcium competition.
   - *Reference 1 (Indian Govt):* [National Health Portal - Nutritional Anemia Protocols](https://www.nhp.gov.in)
   - *Reference 2 (Indian Govt):* [Ministry of AYUSH Pharmacopoeia](https://main.ayush.gov.in)

4. **Antioxidant Cellular Protection:**
   - Contains active phytochemicals that scavenge free radicals, preserving red cell membrane stability and cellular iron recycling efficiency.
   - *Reference 1 (Indian Govt):* [ICMR-National Institute of Nutrition (NIN) Bioactive Studies](https://www.nin.res.in)
   - *Reference 2 (US NIH):* [PubMed Central (NIH PMC) - Antioxidant Cytoprotective Mechanisms](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3151375/)

**Official Health Portal Intake Guidelines:**
- According to official health portal guidelines published by the Ministry of AYUSH and National Health Portal (not personal medical advice):
  - Incorporate **${topicTitle}** as part of a balanced, diversified diet alongside seasonal whole foods.
  - Maintain a strict 2-hour buffer window between mineral-rich meals and tannin-heavy beverages (tea, coffee) or competing ions to optimize duodenal uptake.
- *Reference 1 (Indian Govt):* [Ministry of AYUSH Clinical Nutrition Guidelines](https://main.ayush.gov.in)
- *Reference 2 (Indian Govt):* [National Health Portal](https://www.nhp.gov.in)

*Note on Medical Advice:* Maguva is an informational AI platform referencing verified health portals and never provides personal medical advice, prescriptions, or pharmaceutical treatments. Please consult a qualified doctor or physician for clinical care.

${generateDynamicCitations(rawPrompt)}`;
  }

  // Zero Data Available Fallback when prompt is ungrounded / unrecognized in official health portals
  return `### ℹ️ No Data Available from Official Government Health Portals

No data or clinical guidelines are available from official government health portals (ICMR-NIN, Ministry of AYUSH, MoHFW, WHO, US NIH) for "${rawPrompt}".

Official health portals have no recorded clinical evidence, dietary monographs, or recommendations on this specific subject. Please try searching for a recognized clinical, dietary, botanical, or micronutrient topic.

*Reference Portals:*
- [ICMR-National Institute of Nutrition (NIN)](https://www.nin.res.in)
- [Ministry of AYUSH](https://main.ayush.gov.in)
- [World Health Organization (WHO)](https://www.who.int)
- [US NIH Office of Dietary Supplements](https://ods.od.nih.gov)`;
}

export const ADD_SYMPTOMS_FULL_PROMPT = `### 🩺 Add Symptoms & Clinical Signals

Which symptom would you like to log in your health profile? Select from the categories below:

**🌾 Gut & Digestive Signals**
**[1]** Constipation / Straining
**[2]** Acidity / Heartburn / Acid Reflux
**[3]** Bloating & Abdominal Distension
**[4]** Gas & Intestinal Trapped Gas
**[5]** Diarrhea & Loose Stools
**[6]** Indigestion & Frequent Antacid Use

**🩸 Period & Menstrual Signals**
**[7]** Heavy Period Flow (Soaking >1 pad/2 hrs)
**[8]** Severe Menstrual Cramps (Dysmenorrhea)
**[9]** Irregular or Missed Cycles

**⚡ Micronutrient Deficiency Symptoms (Sub-menus)**
**[10]** Iron / Ferritin Deficiency Symptoms 🩸
**[11]** Vitamin B12 Deficiency Symptoms 🧠
**[12]** Folate (B9) Deficiency Symptoms 🍀
**[13]** Vitamin D3 Deficiency Symptoms ☀️

**[14]** View Currently Logged Symptoms Profile
**[15]** Go Back to Main Menu

*Reply with a number [1–15] or type your specific symptom directly (e.g. "Acidity", "Constipation", "Heavy periods").*`;

export const IRON_SYMPTOMS_PROMPT = `### 🩸 Iron / Ferritin Deficiency Symptoms

Please select the specific Iron Deficiency symptom to add to your health profile:

**[1]** Fatigue & Low Stamina
**[2]** Dizziness or Lightheadedness
**[3]** Cold Hands and Feet
**[4]** Pale Skin (Pallor)
**[5]** Shortness of Breath on Exertion

**[6]** 🔙 Go Back to Symptoms Categories
**[7]** 🏠 Go Back to Main Menu

*Reply with a number [1–7] or type your symptom directly.*`;

export const B12_SYMPTOMS_PROMPT = `### 🧠 Vitamin B12 Deficiency Symptoms

Please select the specific Vitamin B12 Deficiency symptom to add to your health profile:

**[1]** Tingling Feelings or Pain (Pins & Needles)
**[2]** Trouble Walking & Balance Issues
**[3]** Uncontrollable Muscle Movements
**[4]** Confusion, Slower Thinking & Memory Loss
**[5]** Mood or Mental Changes
**[6]** Problems with Smell or Taste
**[7]** Vision Problems & Blurriness
**[8]** Diarrhea and Unexplained Weight Loss
**[9]** Glossitis (Painful Smooth Red Tongue)

**[10]** 🔙 Go Back to Symptoms Categories
**[11]** 🏠 Go Back to Main Menu

*Reply with a number [1–11] or type your symptom directly.*`;

export const FOLATE_SYMPTOMS_PROMPT = `### 🍀 Folate (Vitamin B9) Deficiency Symptoms

Please select the specific Folate Deficiency symptom to add to your health profile:

**[1]** Generalized Weakness
**[2]** Persistent Fatigue
**[3]** Difficulty Concentrating
**[4]** Irritability & Restlessness
**[5]** Frequent Headaches
**[6]** Heart Palpitations
**[7]** Shortness of Breath
**[8]** Soreness & Mouth Ulcerations
**[9]** Changes in Skin, Hair or Nail Pigmentation

**[10]** 🔙 Go Back to Symptoms Categories
**[11]** 🏠 Go Back to Main Menu

*Reply with a number [1–11] or type your symptom directly.*`;

export const VITD_SYMPTOMS_PROMPT = `### ☀️ Vitamin D3 (Cholecalciferol) Deficiency Symptoms

Please select the specific Vitamin D3 Deficiency symptom to add to your health profile:

**[1]** Persistent Fatigue and Tiredness
**[2]** Bone Pain and Lower Back Pain
**[3]** Muscle Weakness and Cramps
**[4]** Frequent Illness & Recurrent Infections
**[5]** Hair Loss (Telogen Effluvium)
**[6]** Depression & Low Mood
**[7]** Slow Wound Healing

**[8]** 🔙 Go Back to Symptoms Categories
**[9]** 🏠 Go Back to Main Menu

*Reply with a number [1–9] or type your symptom directly.*`;

export const SYMPTOM_CHOICES_MAP: Record<
  string,
  {
    name: string;
    symptomsToAppend: string[];
    clinicalDetail: string;
    gutUpdate?: Partial<import('../types').GutHealth>;
    menstrualUpdate?: Partial<import('../types').MenstrualHealth>;
  }
> = {
  '1': {
    name: 'Constipation / Straining',
    symptomsToAppend: ['Constipation'],
    gutUpdate: { hasConstipation: true },
    clinicalDetail: '### 🌾 Constipation / Straining Logged\n\n**Clinical Mechanism:**\nInfrequent bowel movements (<3/week) or hard stools reduce gut transit efficiency and can signal poor dietary fiber/water intake or iron-induced sluggish motility.\n\n**Key Actions:**\n- Increase soluble fiber (Psyllium husk/Isabgol, oats) and fluid intake.\n- Ensure adequate hydration when taking oral iron supplements.',
  },
  '2': {
    name: 'Acidity / Heartburn / Acid Reflux',
    symptomsToAppend: ['Acidity / Reflux'],
    gutUpdate: { hasAcidity: true },
    clinicalDetail: '### 🌾 Acidity / Acid Reflux Logged\n\n**Clinical Mechanism:**\nGastric hypochlorhydria or esophageal reflux impairs the acidic duodenal pH required to convert dietary ferric iron (Fe3+) into absorbable ferrous iron (Fe2+).\n\n**Key Actions:**\n- Avoid consuming tea/coffee or antacids within 2 hours of iron-dense meals.\n- Pair meals with natural Vitamin C (lemon water, amla) to enhance mineral solubility.',
  },
  '3': {
    name: 'Bloating & Abdominal Distension',
    symptomsToAppend: ['Bloating'],
    gutUpdate: { hasBloating: true },
    clinicalDetail: '### 🌾 Bloating & Abdominal Distension Logged\n\n**Clinical Mechanism:**\nIntestinal fermentation and delayed gastric emptying create pressure sensation, reducing digestive mucosal absorption capacity.\n\n**Key Actions:**\n- Space meals evenly and incorporate warm digestive spices (Cumin, Ajwain, Ginger tea).\n- Monitor response to high-FODMAP foods.',
  },
  '4': {
    name: 'Gas & Intestinal Trapped Gas',
    symptomsToAppend: ['Gas'],
    gutUpdate: { hasGas: true },
    clinicalDetail: '### 🌾 Gas & Intestinal Trapped Gas Logged\n\n**Clinical Mechanism:**\nMicrobial dysbiosis or incomplete carbohydrate breakdown leads to trapped gas and gut lining irritation.\n\n**Key Actions:**\n- Sip warm Ajwain/Jeera water post meals.\n- Avoid carbonated beverages and rapid meal swallowing.',
  },
  '5': {
    name: 'Diarrhea & Loose Stools',
    symptomsToAppend: ['Diarrhea'],
    gutUpdate: { hasDiarrhea: true },
    clinicalDetail: '### 🌾 Diarrhea & Loose Stools Logged\n\n**Clinical Mechanism:**\nRapid intestinal transit time decreases mucosal contact time, severely impeding Vitamin B12, Folate, and Iron absorption.\n\n**Key Actions:**\n- Maintain oral rehydration and electrolyte balance.\n- Consult a healthcare provider if diarrhea persists beyond 48 hours.',
  },
  '6': {
    name: 'Indigestion & Frequent Antacid Use',
    symptomsToAppend: ['Indigestion', 'Frequent Antacid Use'],
    gutUpdate: { hasIndigestion: true, frequentAntacidUse: true },
    clinicalDetail: '### 🌾 Indigestion & Antacid Use Logged\n\n**Clinical Mechanism:**\nFrequent PPI or antacid use neutralizes gastric acid, halting the cleavage of Vitamin B12 from dietary proteins and inhibiting non-heme iron reduction.\n\n**Key Actions:**\n- Discuss long-term antacid reliance with your doctor.\n- Consider taking iron supplements with Vitamin C rather than calcium/antacids.',
  },
  '7': {
    name: 'Heavy Period Flow',
    symptomsToAppend: ['Heavy Period Flow'],
    menstrualUpdate: { flowIntensity: 'Heavy' },
    clinicalDetail: '### 🩸 Heavy Period Flow Logged\n\n**Clinical Mechanism:**\nMenorrhagia (soaking >1 pad every 2 hours or blood loss >80mL/cycle) is the single leading cause of iron deficiency anemia in women of reproductive age, losing up to 1.4mg iron per day.\n\n**Key Actions:**\n- Increase daily dietary iron density (Moringa, Garden cress seeds, Jaggery, Green leafy vegetables).\n- Monitor Serum Ferritin and Hemoglobin levels regularly.',
  },
  '8': {
    name: 'Severe Menstrual Cramps (Dysmenorrhea)',
    symptomsToAppend: ['Severe Menstrual Cramps'],
    menstrualUpdate: { hasDysmenorrhea: true },
    clinicalDetail: '### 🩸 Severe Menstrual Cramps Logged\n\n**Clinical Mechanism:**\nExcessive uterine prostaglandin production causes painful myometrial contractions and localized inflammation.\n\n**Key Actions:**\n- Ensure optimal Vitamin D3 and Magnesium intake to modulate uterine smooth muscle tone.\n- Use warm heating pads and ginger infusion during dysmenorrhea flare-ups.',
  },
  '9': {
    name: 'Irregular or Missed Cycles',
    symptomsToAppend: ['Irregular Cycles'],
    menstrualUpdate: { cycleRegularity: 'Irregular' },
    clinicalDetail: '### 🩸 Irregular / Missed Cycles Logged\n\n**Clinical Mechanism:**\nAnovulatory or irregular menstrual cycles can stem from hormonal fluctuation, thyroid dysfunction, or energy availability deficits.\n\n**Key Actions:**\n- Track cycle dates carefully.\n- Evaluate thyroid function (TSH) and overall caloric/micronutrient adequacy.',
  },
  '10': {
    name: 'Fatigue & Low Physical Stamina',
    symptomsToAppend: ['Fatigue'],
    clinicalDetail: '### ⚡ Fatigue & Low Stamina Logged\n\n**Clinical Mechanism:**\nDepleted circulating hemoglobin impairs tissue oxygenation, reducing mitochondrial ATP energy production.\n\n**Key Actions:**\n- Pair dietary iron with Vitamin C (Amla, lemon juice).\n- Check Serum Ferritin levels to evaluate storage reserves.',
  },
  '11': {
    name: 'Hair Fall & Brittle Nails',
    symptomsToAppend: ['Hair Fall', 'Brittle Nails'],
    clinicalDetail: '### 💇 Hair Fall & Brittle Nails Logged\n\n**Clinical Mechanism:**\nHair matrix progenitor cells require high intracellular ferritin (>30 ng/mL). Depleted iron stores trigger telogen effluvium and koilonychia.\n\n**Key Actions:**\n- Incorporate Moringa, Curry leaves, and Garden cress seeds daily.\n- Avoid harsh chemical hair treatments during acute shedding.',
  },
  '12': {
    name: 'Dizziness & Shortness of Breath',
    symptomsToAppend: ['Dizziness', 'Shortness of Breath'],
    clinicalDetail: '### 💓 Dizziness & Breathlessness Logged\n\n**Clinical Mechanism:**\nDiminished blood oxygen-carrying capacity triggers compensatory respiratory hyperventilation and postural micro-hypoxia.\n\n**Key Actions:**\n- Avoid sudden postural shifts.\n- Check complete blood count (CBC) and Hemoglobin.',
  },
  '13': {
    name: 'Cold Hands/Feet & Pica Cravings',
    symptomsToAppend: ['Cold Hands and Feet', 'Pica'],
    clinicalDetail: '### ❄️ Cold Hands/Feet & Pica Logged\n\n**Clinical Mechanism:**\nPeripheral vasoconstriction shunts limited oxygenated blood to core organs, while pagophagia (ice chewing craving) is a classic neurobiological sign of advanced iron depletion.\n\n**Key Actions:**\n- Test serum ferritin levels.\n- Keep extremities warm and avoid ice chewing.',
  },
  '14': {
    name: 'Brain Fog & Memory Slowdown',
    symptomsToAppend: ['Brain Fog'],
    clinicalDetail: '### 🧠 Brain Fog & Memory Slowdown Logged\n\n**Clinical Mechanism:**\nIron and Vitamin B12 are crucial cofactors for neurotransmitter synthesis (dopamine, serotonin) and cerebral oxygenation.\n\n**Key Actions:**\n- Ensure bioavailable Vitamin B12 and Folate intake.\n- Maintain consistent sleep schedule.',
  },
  '15': {
    name: 'Tingling / Pins & Needles in Limbs',
    symptomsToAppend: ['Tingling Feelings'],
    clinicalDetail: '### ⚡ Tingling / Pins & Needles Logged\n\n**Clinical Mechanism:**\nVitamin B12 is essential for myelin sheath integrity; deficiency causes peripheral paresthesia and nerve conduction delay.\n\n**Key Actions:**\n- Check serum Vitamin B12 levels.\n- Include dairy, fortified foods, or B12 supplements if vegetarian.',
  },
  '16': {
    name: 'Mouth Ulcers & Sore Red Tongue',
    symptomsToAppend: ['Mouth Ulcers', 'Glossitis'],
    clinicalDetail: '### 👄 Mouth Ulcers & Sore Tongue Logged\n\n**Clinical Mechanism:**\nRapid turnover of oral mucosal epithelial cells makes them highly vulnerable to Folate (B9) and B12 coenzyme depletion, causing glossitis and aphthous stomatitis.\n\n**Key Actions:**\n- Include folate-rich lentils, green leafy vegetables, and sprouts.\n- Avoid excessively spicy or acidic foods until oral lining heals.',
  },
  '17': {
    name: 'Bone, Joint & Lower Back Pain',
    symptomsToAppend: ['Bone Pain and Lower Back Pain'],
    clinicalDetail: '### 🦴 Bone & Lower Back Pain Logged\n\n**Clinical Mechanism:**\nVitamin D3 deficiency impairs intestinal calcium absorption, leading to secondary hyperparathyroidism and bone matrix demineralization.\n\n**Key Actions:**\n- Check 25-OH Vitamin D levels.\n- Get safe morning sunlight exposure and include Vitamin D fortified foods or supplements.',
  },
  '18': {
    name: 'Muscle Cramps & Slow Wound Healing',
    symptomsToAppend: ['Muscle Cramps', 'Slow Wound Healing'],
    clinicalDetail: '### 🦾 Muscle Cramps & Slow Wound Healing Logged\n\n**Clinical Mechanism:**\nAltered calcium-magnesium cellular flux causes fast-twitch muscle cramps, while Vitamin D depletion delays tissue re-epithelialization.\n\n**Key Actions:**\n- Hydrate adequately and maintain mineral balance.\n- Check Vitamin D3 levels.',
  },
};

export function executeToolLocally(
  toolName: string,
  args: any
): { toolName: string; args: any; resultSummary: string } | undefined {
  const store = useHealthStore.getState();
  const a = args || {};
  let resultSummary = '';

  if (toolName === 'addSymptoms' || toolName === 'add_symptoms') {
    const syms: string[] = a.symptoms || a.newSymptoms || (a.symptom ? [a.symptom] : []);
    if (syms.length > 0) {
      store.appendUserSymptoms(syms);
      resultSummary = `Added symptom(s): ${syms.join(', ')}`;
    }
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'addHabit') {
    store.addHabit({
      title: a.title || 'Targeted Wellness Habit',
      category: a.category || 'Iron Synergy',
      description: a.description || 'Recommended by Maguva AI',
      timing: a.timing || 'Daily',
    });
    resultSummary = `Added habit "${a.title || 'Targeted Wellness Habit'}" to Daily Habits`;
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'removeHabit' || toolName === 'removeHabits') {
    const titlesOrIds: string[] = a.titles || a.removeHabits || a.namesOrIds || (a.title ? [a.title] : a.id ? [a.id] : []);
    if (a.clearAll) {
      store.clearAllHabits();
      resultSummary = 'Cleared all daily habits from checklist';
    } else if (titlesOrIds.length > 0) {
      store.removeHabits(titlesOrIds);
      resultSummary = `Removed habit(s): ${titlesOrIds.join(', ')}`;
    }
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'saveMeal') {
    store.addMeal({
      name: a.name || 'AI Recommended Meal',
      portion: a.portion || '1 standard portion',
      ironMg: Number(a.ironMg) || 0,
      b12Mcg: Number(a.b12Mcg) || 0,
      folateMcg: Number(a.folateMcg) || 0,
      vitaminDMcg: Number(a.vitaminDMcg) || 0,
      vitaminCMg: Number(a.vitaminCMg) || 0,
      calciumMg: Number(a.calciumMg) || 0,
      calories: Number(a.calories) || 0,
      mealType: a.mealType || 'Breakfast',
      absorptionBoosters: a.hasVitaminCBooster ? ['Vitamin C Synergy'] : (a.absorptionBoosters || []),
      absorptionBlockers: a.hasTanninBlocker ? ['Tannin Buffer Flagged'] : (a.absorptionBlockers || []),
    });
    resultSummary = `Logged meal "${a.name || 'AI Recommended Meal'}" under ${a.mealType || 'Breakfast'} to Meal Journal`;
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'removeMeal' || toolName === 'removeMeals') {
    const namesOrIds: string[] = a.names || a.removeMeals || a.namesOrIds || (a.name ? [a.name] : a.id ? [a.id] : a.removeMealName ? [a.removeMealName] : a.removeMealId ? [a.removeMealId] : []);
    if (namesOrIds.length > 0) {
      store.removeMeals(namesOrIds);
      resultSummary = `Removed meal(s): ${namesOrIds.join(', ')}`;
    } else if (a.clearAll) {
      // Clear all meals
      namesOrIds.push(...(store.meals || []).map((m) => m.id));
      if (namesOrIds.length > 0) {
        store.removeMeals(namesOrIds);
      }
      resultSummary = 'Cleared all logged meals for today';
    }
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'removeSymptoms') {
    const syms: string[] = a.symptoms || a.removeSymptoms || (a.symptom ? [a.symptom] : []);
    if (syms.length > 0) {
      store.removeSymptoms(syms);
      resultSummary = `Removed symptom(s): ${syms.join(', ')}`;
    }
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'clearLabs') {
    const keys: string[] = a.keys || a.clearLabs || (a.key ? [a.key] : []);
    if (keys.length > 0) {
      store.clearLabs(keys);
      resultSummary = `Cleared lab value(s): ${keys.join(', ')}`;
    }
    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'updateHealthProfile' || toolName === 'append_user_symptoms') {
    // Additions & Updates
    if (
      a.hemoglobin !== undefined ||
      a.serumFerritin !== undefined ||
      a.vitaminB12 !== undefined ||
      a.vitaminD !== undefined ||
      a.folateB9 !== undefined
    ) {
      store.updateLabs({
        ...(a.hemoglobin !== undefined ? { hemoglobin: Number(a.hemoglobin) } : {}),
        ...(a.serumFerritin !== undefined ? { serumFerritin: Number(a.serumFerritin) } : {}),
        ...(a.vitaminB12 !== undefined ? { vitaminB12: Number(a.vitaminB12) } : {}),
        ...(a.vitaminD !== undefined ? { vitaminD: Number(a.vitaminD) } : {}),
        ...(a.folateB9 !== undefined ? { folateB9: Number(a.folateB9) } : {}),
      });
    }
    if (
      a.weightKg !== undefined ||
      a.heightCm !== undefined ||
      a.pregnancyStatus !== undefined ||
      a.name !== undefined ||
      a.age !== undefined ||
      a.sex !== undefined ||
      a.isPregnant !== undefined ||
      a.isLactating !== undefined ||
      a.pregnancyTrimester !== undefined
    ) {
      store.updateDemographics({
        ...(a.name !== undefined ? { name: String(a.name) } : {}),
        ...(a.age !== undefined ? { age: Number(a.age) } : {}),
        ...(a.sex !== undefined ? { sex: a.sex === 'female' || a.sex === 'male' ? a.sex : 'female' } : {}),
        ...(a.weightKg !== undefined ? { weightKg: Number(a.weightKg) } : {}),
        ...(a.heightCm !== undefined ? { heightCm: Number(a.heightCm) } : {}),
        ...(a.isPregnant !== undefined ? { isPregnant: Boolean(a.isPregnant) } : {}),
        ...(a.isLactating !== undefined ? { isLactating: Boolean(a.isLactating) } : {}),
        ...(a.pregnancyTrimester !== undefined ? { pregnancyTrimester: Number(a.pregnancyTrimester) as 1 | 2 | 3 } : {}),
        ...(a.pregnancyStatus !== undefined
          ? {
              isPregnant:
                typeof a.pregnancyStatus === 'string'
                  ? a.pregnancyStatus.toLowerCase().includes('pregnant') &&
                    !a.pregnancyStatus.toLowerCase().includes('non')
                  : Boolean(a.pregnancyStatus),
              isLactating:
                typeof a.pregnancyStatus === 'string'
                  ? a.pregnancyStatus.toLowerCase().includes('lactating')
                  : false,
            }
          : {}),
      });
    }
    if (a.periodFlow !== undefined) {
      store.updateMenstrual({
        flowIntensity: a.periodFlow,
      });
    }
    if (a.symptoms && Array.isArray(a.symptoms)) {
      const current = store.selectedSymptoms || [];
      const merged = Array.from(new Set([...current, ...a.symptoms]));
      store.updateSelectedSymptoms(merged);
    }
    if (a.newSymptoms && Array.isArray(a.newSymptoms)) {
      const current = store.selectedSymptoms || [];
      const merged = Array.from(new Set([...current, ...a.newSymptoms]));
      store.updateSelectedSymptoms(merged);
    }
    if (a.gutUpdates && typeof a.gutUpdates === 'object') {
      store.updateGut(a.gutUpdates);
    }

    // Removals in updateHealthProfile
    if (a.removeSymptoms && Array.isArray(a.removeSymptoms)) {
      store.removeSymptoms(a.removeSymptoms);
    }
    if (a.clearLabs && Array.isArray(a.clearLabs)) {
      store.clearLabs(a.clearLabs);
    }
    if (a.removeHabits && Array.isArray(a.removeHabits)) {
      store.removeHabits(a.removeHabits);
    }
    if (a.removeMeals && Array.isArray(a.removeMeals)) {
      store.removeMeals(a.removeMeals);
    }
    if (a.removeMealId || a.removeMealName) {
      store.removeMeals([a.removeMealId || a.removeMealName]);
    }

    resultSummary =
      a.removeSymptoms && a.removeSymptoms.length > 0
        ? `Removed symptoms: ${a.removeSymptoms.join(', ')}`
        : a.clearLabs && a.clearLabs.length > 0
        ? `Cleared lab values: ${a.clearLabs.join(', ')}`
        : a.newSymptomNames && a.newSymptomNames.length > 0
        ? `Appended ${a.newSymptomNames.join(', ')} to Symptoms & Signals`
        : a.gutUpdates && Object.keys(a.gutUpdates).length > 0
        ? `Logged ${a.symptomNames?.join(', ') || 'symptoms'} to Gut Vector & Health Profile`
        : a.symptoms
        ? `Logged ${a.symptomNames?.join(', ') || 'symptoms'} to Health Profile`
        : `Updated Health Profile metrics`;

    return { toolName, args: a, resultSummary };
  }

  if (toolName === 'submitRemedyReview' || toolName === 'rateAyushRemedy') {
    const remedyId = a.remedyId;
    const rating = Number(a.rating) || 5;
    const reviewText = a.reviewText || a.text || 'Beneficial traditional remedy.';
    if (remedyId) {
      if (store.rateAyushRemedy) {
        store.rateAyushRemedy(remedyId, rating);
      }
      if (store.addRemedyReview) {
        store.addRemedyReview({
          remedyId,
          userName: store.demographics?.name || 'Verified User',
          userTag: 'Iron & Health Vector',
          rating,
          comment: reviewText,
        });
      }
      resultSummary = `Submitted rating (${rating}/5) and review for remedy ${remedyId}`;
    }
    return { toolName, args: a, resultSummary };
  }

  return undefined;
}

const FOOD_KEYWORD_PRESETS: Record<
  string,
  {
    name: string;
    portion: string;
    ironMg: number;
    b12Mcg: number;
    folateMcg: number;
    vitaminDMcg: number;
    mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    hasVitaminCBooster?: boolean;
    hasTanninBlocker?: boolean;
  }
> = {
  paneer: {
    name: 'Palak Paneer with Spices',
    portion: '1 medium bowl (150g)',
    ironMg: 3.2,
    b12Mcg: 0.8,
    folateMcg: 65,
    vitaminDMcg: 10,
    mealType: 'Dinner',
    hasVitaminCBooster: true,
  },
  ragi: {
    name: 'Ragi Dosa / Finger Millet Roti',
    portion: '2 rotis / dosas (120g)',
    ironMg: 3.9,
    b12Mcg: 0,
    folateMcg: 18,
    vitaminDMcg: 0,
    mealType: 'Breakfast',
  },
  dosa: {
    name: 'Ragi Dosa with Coconut Mint Chutney',
    portion: '2 dosas',
    ironMg: 2.8,
    b12Mcg: 0,
    folateMcg: 22,
    vitaminDMcg: 0,
    mealType: 'Breakfast',
  },
  poha: {
    name: 'Iron-Fortified Poha with Roasted Peanuts & Lemon',
    portion: '1 bowl (150g)',
    ironMg: 4.5,
    b12Mcg: 0,
    folateMcg: 28,
    vitaminDMcg: 0,
    mealType: 'Breakfast',
    hasVitaminCBooster: true,
  },
  dal: {
    name: 'Spinach Dal (Palak Pappu)',
    portion: '1 katori (150ml)',
    ironMg: 3.5,
    b12Mcg: 0,
    folateMcg: 78,
    vitaminDMcg: 0,
    mealType: 'Lunch',
    hasVitaminCBooster: true,
  },
  palak: {
    name: 'Palak Keerai Poriyal',
    portion: '1 cup cooked (120g)',
    ironMg: 4.0,
    b12Mcg: 0,
    folateMcg: 95,
    vitaminDMcg: 0,
    mealType: 'Lunch',
    hasVitaminCBooster: true,
  },
  roti: {
    name: 'Whole Wheat / Bajra Roti',
    portion: '2 rotis',
    ironMg: 3.0,
    b12Mcg: 0,
    folateMcg: 20,
    vitaminDMcg: 0,
    mealType: 'Lunch',
  },
  rice: {
    name: 'Steamed Brown Rice with Dal',
    portion: '1 cup (150g)',
    ironMg: 1.5,
    b12Mcg: 0,
    folateMcg: 15,
    vitaminDMcg: 0,
    mealType: 'Lunch',
  },
  amla: {
    name: 'Fresh Amla Ginger Shot',
    portion: '1 shot (30ml)',
    ironMg: 1.2,
    b12Mcg: 0,
    folateMcg: 10,
    vitaminDMcg: 0,
    mealType: 'Breakfast',
    hasVitaminCBooster: true,
  },
  curd: {
    name: 'Probiotic Homemade Curd (Dahi)',
    portion: '1 small katori (100g)',
    ironMg: 0.2,
    b12Mcg: 0.5,
    folateMcg: 12,
    vitaminDMcg: 15,
    mealType: 'Lunch',
  },
  sambar: {
    name: 'Drumstick Moringa Leaves Sambar',
    portion: '1 bowl (180ml)',
    ironMg: 3.8,
    b12Mcg: 0,
    folateMcg: 80,
    vitaminDMcg: 0,
    mealType: 'Lunch',
    hasVitaminCBooster: true,
  },
  chole: {
    name: 'Chole (Chickpea Curry) with Lemon',
    portion: '1 medium bowl (150g)',
    ironMg: 4.8,
    b12Mcg: 0,
    folateMcg: 110,
    vitaminDMcg: 0,
    mealType: 'Lunch',
    hasVitaminCBooster: true,
  },
  sprouts: {
    name: 'Sprouted Moong Salad with Lemon & Pomegranate',
    portion: '1 bowl (100g)',
    ironMg: 3.6,
    b12Mcg: 0,
    folateMcg: 90,
    vitaminDMcg: 0,
    mealType: 'Snacks',
    hasVitaminCBooster: true,
  },
};

export type { FoodCandidate };

export function searchSimilarFoodItems(query: string): { searchedTerm: string; candidates: FoodCandidate[] } | null {
  const qLower = query.toLowerCase().trim();
  const candidates: FoodCandidate[] = [];

  if (cachedNutrientRows && cachedNutrientRows.length > 0) {
    const allMatches = cachedNutrientRows.filter((r) => r.foodName.toLowerCase().includes(qLower));
    const exactMatches = allMatches.filter((r) => r.foodName.toLowerCase() === qLower);
    const similarMatches = allMatches
      .filter((r) => r.foodName.toLowerCase() !== qLower)
      .sort((a, b) => a.foodName.length - b.foodName.length);
    
    for (const r of [...exactMatches, ...similarMatches].slice(0, 3)) {
      candidates.push({
        name: r.foodName,
        portion: '100g',
        ironMg: r.iron,
        b12Mcg: r.b12,
        folateMcg: r.folate,
        vitaminCMg: r.vitC,
        vitaminDMcg: r.vitD,
        calciumMg: r.calcium,
        calories: 0,
      });
    }
  }

  if (candidates.length < 3) {
    const result = searchFoodCandidates(query);
    if (result && result.candidates) {
      for (const cand of result.candidates) {
        if (candidates.length >= 3) break;
        if (!candidates.find((c) => c.name === cand.name)) {
          candidates.push(cand);
        }
      }
    }
  }

  if (candidates.length === 0) return null;

  return {
    searchedTerm: qLower,
    candidates,
  };
}

export function parseCustomMealInput(input: string) {
  const text = input || '';
  const lower = text.toLowerCase();

  let mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' = 'Lunch';
  if (lower.includes('breakfast')) mealType = 'Breakfast';
  else if (lower.includes('dinner')) mealType = 'Dinner';
  else if (lower.includes('snack')) mealType = 'Snacks';
  else if (lower.includes('lunch')) mealType = 'Lunch';

  let ironMg = 0;
  const ironMatch =
    text.match(/(?:iron|fe)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:mg)?\s*(?:iron|fe)/i);
  if (ironMatch) ironMg = parseFloat(ironMatch[1]) || 0;

  let b12Mcg = 0;
  const b12Match =
    text.match(/(?:b12|vitamin\s*b12)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:mcg|µg)?\s*(?:b12|vitamin\s*b12)/i);
  if (b12Match) b12Mcg = parseFloat(b12Match[1]) || 0;

  let vitaminCMg = 0;
  const cMatch =
    text.match(/(?:vitamin\s*c|vit\s*c|[\b,]c[\s:=])[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:mg)?\s*(?:vitamin\s*c|vit\s*c)/i) ||
    text.match(/\bc[\s:=]+([\d.]+)/i);
  if (cMatch) vitaminCMg = parseFloat(cMatch[1]) || 0;

  let vitaminDMcg = 0;
  const dMatch =
    text.match(/(?:vitamin\s*d|vit\s*d|[\b,]d[\s:=])[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:iu)?\s*(?:vitamin\s*d|vit\s*d)/i) ||
    text.match(/\bd[\s:=]+([\d.]+)/i);
  if (dMatch) vitaminDMcg = parseFloat(dMatch[1]) || 0;

  let calories = 0;
  const calMatch =
    text.match(/(?:calories|cal|kcal)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:calories|cal|kcal)/i);
  if (calMatch) calories = parseFloat(calMatch[1]) || 0;

  let folateMcg = 0;
  const folateMatch =
    text.match(/(?:folate|b9|vitamin\s*b9)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:mcg|µg)?\s*(?:folate|b9)/i);
  if (folateMatch) folateMcg = parseFloat(folateMatch[1]) || 0;

  let name = '';
  const explicitNameMatch = text.match(/(?:name|item|dish|meal)[\s:=]+([^,;\n]+)/i);
  if (explicitNameMatch) {
    name = explicitNameMatch[1].trim();
  } else {
    const cleaned = text
      .split(/[,;\n]/)[0]
      .replace(/\b(breakfast|lunch|dinner|snacks?|meal|log|add|custom)\b/gi, '')
      .replace(/\b(iron|b12|folate|vit\s*c|vit\s*d|cal|calories)\b.*/gi, '')
      .trim();
    name = cleaned.length >= 2 ? cleaned : 'Custom Homemade Meal';
  }

  return {
    name: name || 'Custom Meal Entry',
    portion: '1 custom serving',
    mealType,
    ironMg,
    b12Mcg,
    vitaminCMg,
    vitaminDMcg,
    calories,
    folateMcg,
  };
}

interface CustomMealInlineFormProps {
  messageId: string;
  onSave: (customMeal: {
    name: string;
    mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    ironMg: number;
    b12Mcg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
    calories: number;
    folateMcg: number;
    calciumMg?: number;
  }) => void;
}

const CustomMealInlineForm: React.FC<CustomMealInlineFormProps> = ({ messageId, onSave }) => {
  const [name, setName] = useState('Homemade Paneer Dish');
  const [mealType, setMealType] = useState<'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner'>('Dinner');
  const [ironMg, setIronMg] = useState('3.2');
  const [b12Mcg, setB12Mcg] = useState('0.8');
  const [vitaminCMg, setVitaminCMg] = useState('15');
  const [vitaminDMcg, setVitaminDIu] = useState('10');
  const [calories, setCalories] = useState('240');
  const [folateMcg, setFolateMcg] = useState('45');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    onSave({
      name: name.trim() || 'Custom Meal Entry',
      mealType,
      ironMg: parseFloat(ironMg) || 0,
      b12Mcg: parseFloat(b12Mcg) || 0,
      vitaminCMg: parseFloat(vitaminCMg) || 0,
      vitaminDMcg: parseFloat(vitaminDMcg) || 0,
      calories: parseFloat(calories) || 0,
      folateMcg: parseFloat(folateMcg) || 0,
    });
  };

  if (isSaved) {
    return (
      <div className="mt-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-semibold">Custom food item saved & daily intakes calculated!</span>
      </div>
    );
  }

  return (
    <form
      id={`custom-meal-form-${messageId}`}
      onSubmit={handleSubmit}
      className="mt-3 p-3.5 rounded-2xl bg-white border border-[#FCE7F3] shadow-xs space-y-3 text-xs"
    >
      <div className="flex items-center justify-between border-b border-rose-100 pb-2">
        <span className="font-bold text-rose-800 flex items-center gap-1.5">
          <UtensilsCrossed className="w-3.5 h-3.5 text-[#F43F5E]" />
          Custom Nutrient Entry Builder
        </span>
        <span className="text-[10px] text-slate-500 font-medium">Used for Intake Calculations</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Food Item Name *
          </label>
          <input
            type="text"
            id={`custom-food-name-${messageId}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Paneer Tikka Masala"
            className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
            Meal Slot *
          </label>
          <select
            id={`custom-meal-slot-${messageId}`}
            value={mealType}
            onChange={(e) => setMealType(e.target.value as any)}
            className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          >
            <option value="Breakfast">Breakfast 🌅</option>
            <option value="Lunch">Lunch ☀️</option>
            <option value="Snacks">Snacks 🍵</option>
            <option value="Dinner">Dinner 🌙</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Iron (mg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            id={`custom-iron-${messageId}`}
            value={ironMg}
            onChange={(e) => setIronMg(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Vitamin B12 (µg)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            id={`custom-b12-${messageId}`}
            value={b12Mcg}
            onChange={(e) => setB12Mcg(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Vitamin C (mg)
          </label>
          <input
            type="number"
            step="0.5"
            min="0"
            id={`custom-vitc-${messageId}`}
            value={vitaminCMg}
            onChange={(e) => setVitaminCMg(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Vitamin D (µg)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            id={`custom-vitd-${messageId}`}
            value={vitaminDMcg}
            onChange={(e) => setVitaminDIu(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Calories (kcal)
          </label>
          <input
            type="number"
            step="5"
            min="0"
            id={`custom-calories-${messageId}`}
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
            Folate (µg)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            id={`custom-folate-${messageId}`}
            value={folateMcg}
            onChange={(e) => setFolateMcg(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-2 py-1 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:border-[#F43F5E] focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        id={`btn-save-custom-meal-${messageId}`}
        className="w-full py-2 px-3 rounded-xl bg-[#F43F5E] hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Save Custom Food Item & Recalculate Intakes</span>
      </button>
    </form>
  );
};

function parseDemographicInput(input: string): {
  updates: Partial<Demographics>;
  isPregnantDeclared: boolean;
  hasValidField: boolean;
} {
  const updates: Partial<Demographics> = {};
  let isPregnantDeclared = false;
  let hasValidField = false;

  const text = input.trim();
  const lower = text.toLowerCase();

  // 1. Weight: e.g. "Weight: 58kg", "58 kg", "weight 58.5", "wt: 60"
  const weightMatch =
    text.match(/(?:weight|wt|body\s*weight)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:kg|kgs|kilos|kilograms)\b/i);
  if (weightMatch) {
    const val = parseFloat(weightMatch[1]);
    if (!isNaN(val) && val >= 20 && val <= 300) {
      updates.weightKg = Math.round(val * 10) / 10;
      hasValidField = true;
    }
  }

  // 2. Height: e.g. "Height: 162cm", "162 cm", "height 165", "ht: 155"
  const heightMatch =
    text.match(/(?:height|ht)[\s:=]*([\d.]+)/i) ||
    text.match(/([\d.]+)\s*(?:cm|cms|centimeters)\b/i);
  if (heightMatch) {
    const val = parseFloat(heightMatch[1]);
    if (!isNaN(val) && val >= 50 && val <= 250) {
      updates.heightCm = Math.round(val * 10) / 10;
      hasValidField = true;
    }
  }

  // 3. Age: e.g. "Age: 26", "26 years old", "age 28"
  const ageMatch =
    text.match(/(?:age|years\s*old)[\s:=]*(\d+)/i) ||
    text.match(/(\d+)\s*(?:years?\s*old|yo|yrs)\b/i) ||
    text.match(/\bage\s+(\d+)\b/i);
  if (ageMatch) {
    const val = parseInt(ageMatch[1], 10);
    if (!isNaN(val) && val >= 1 && val <= 120) {
      updates.age = val;
      hasValidField = true;
    }
  }

  // 4. Gender / Sex: e.g. "Gender: Female", "Sex: Male", "Female", "Male"
  if (/\b(female|woman|girl)\b/i.test(lower)) {
    updates.sex = 'female';
    hasValidField = true;
  } else if (/\b(male|man|boy)\b/i.test(lower)) {
    updates.sex = 'male';
    hasValidField = true;
  }

  // 5. Name: e.g. "Name: Priya Sharma", "Name Priya", "my name is Priya"
  const nameMatch = text.match(/(?:name|my\s*name\s*is)[\s:=]+([a-zA-Z\s]{2,30})/i);
  if (nameMatch) {
    const cleanName = nameMatch[1].trim();
    if (
      cleanName &&
      !['pregnant', 'female', 'male', 'weight', 'height', 'age', 'profile', 'update', 'trimester'].includes(
        cleanName.toLowerCase()
      )
    ) {
      updates.name = cleanName;
      hasValidField = true;
    }
  }

  // 6. Pregnancy / Lactation:
  if (/\b(not pregnant|non-pregnant|no pregnancy|not lactating|non lactating)\b/i.test(lower)) {
    updates.isPregnant = false;
    updates.isLactating = false;
    delete updates.pregnancyTrimester;
    hasValidField = true;
  } else if (/\b(lactat(ing|ion)|breastfeeding|nursing)\b/i.test(lower)) {
    updates.isLactating = true;
    updates.isPregnant = false;
    hasValidField = true;
  } else if (/\b(pregnant|pregnancy)\b/i.test(lower)) {
    updates.isPregnant = true;
    updates.isLactating = false;
    isPregnantDeclared = true;
    hasValidField = true;

    // Check if trimester is already specified in the same message
    if (/\b(1st|first|1)\s*(?:trimester)?\b/i.test(lower) && !/\b(2nd|3rd|2|3)\b/i.test(lower)) {
      updates.pregnancyTrimester = 1;
    } else if (/\b(2nd|second|2)\s*(?:trimester)?\b/i.test(lower)) {
      updates.pregnancyTrimester = 2;
    } else if (/\b(3rd|third|3)\s*(?:trimester)?\b/i.test(lower)) {
      updates.pregnancyTrimester = 3;
    }
  }

  // Standalone numbers if only a number is passed
  if (!hasValidField && /^\d+(\.\d+)?$/.test(text)) {
    const num = parseFloat(text);
    if (num >= 30 && num <= 200 && num < 120 && text.includes('.')) {
      // Decimal between 30 and 120 -> weight
      updates.weightKg = num;
      hasValidField = true;
    } else if (num >= 120 && num <= 230) {
      // Height
      updates.heightCm = num;
      hasValidField = true;
    } else if (num >= 30 && num <= 150) {
      // Weight
      updates.weightKg = num;
      hasValidField = true;
    } else if (num >= 12 && num < 100) {
      // Age
      updates.age = parseInt(text, 10);
      hasValidField = true;
    }
  }

  return { updates, isPregnantDeclared, hasValidField };
}

export const AiChatCompanion: React.FC = () => {
  const chatMessages = useHealthStore((state) => state.chatMessages);
  const addChatMessage = useHealthStore((state) => state.addChatMessage);
  const isAiThinking = useHealthStore((state) => state.isAiThinking);
  const setAiThinking = useHealthStore((state) => state.setAiThinking);
  const demographics = useHealthStore((state) => state.demographics);
  const labs = useHealthStore((state) => state.labs);
  const gut = useHealthStore((state) => state.gut);
  const severeSymptoms = useHealthStore((state) => state.severeSymptoms);
  const menstrual = useHealthStore((state) => state.menstrual);
  const selectedSymptoms = useHealthStore((state) => state.selectedSymptoms);
  const updateSelectedSymptoms = useHealthStore((state) => state.updateSelectedSymptoms);
  const updateGut = useHealthStore((state) => state.updateGut);
  const dailyHabits = useHealthStore((state) => state.dailyHabits);
  const meals = useHealthStore((state) => state.meals);
  const lifestyle = useHealthStore((state) => state.lifestyle);
  const addHabit = useHealthStore((state) => state.addHabit);
  const addMeal = useHealthStore((state) => state.addMeal);
  const updateDemographics = useHealthStore((state) => state.updateDemographics);
  const updateLabs = useHealthStore((state) => state.updateLabs);
  const updateMenstrual = useHealthStore((state) => state.updateMenstrual);
  const setActiveTab = useHealthStore((state) => state.setActiveTab);
  const setMealEntryMode = useHealthStore((state) => state.setMealEntryMode);
  const ayushRemedies = useHealthStore((state) => state.ayushRemedies);
  const remedyReviews = useHealthStore((state) => state.remedyReviews);
  const rateAyushRemedy = useHealthStore((state) => state.rateAyushRemedy);
  const addRemedyReview = useHealthStore((state) => state.addRemedyReview);

  const { bmi, risks, isTriageTriggered } = useComputedHealth();

  useEffect(() => {
    getNutrientCsvRows().catch(console.error);
  }, []);

  const deferredMessages = useDeferredValue(chatMessages);
  const [conversationState, setConversationState] = useState<
    | 'IDLE'
    | 'AWAITING_HEALTH_DATA'
    | 'AWAITING_CANDIDATE_CHOICE'
    | 'AWAITING_MEAL_SLOT'
    | 'AWAITING_CUSTOM_MEAL_ENTRY'
    | 'AWAITING_SYMPTOM_SELECTION'
    | 'AWAITING_IRON_SYMPTOM_SELECTION'
    | 'AWAITING_B12_SYMPTOM_SELECTION'
    | 'AWAITING_FOLATE_SYMPTOM_SELECTION'
    | 'AWAITING_VITD_SYMPTOM_SELECTION'
    | 'AWAITING_SYMPTOM_POST_ADD_ACTION'
    | 'AWAITING_MEAL_ACTION'
    | 'AWAITING_PROFILE_UPDATE'
    | 'AWAITING_PROFILE_PARAMETER_VALUE'
    | 'AWAITING_PREGNANCY_TRIMESTER'
    | 'AWAITING_UPDATE_ACTION_SYMPTOMS'
    | 'AWAITING_UPDATE_ACTION_LABS'
    | 'AWAITING_UPDATE_ACTION_HABITS'
    | 'AWAITING_ADD_HABIT_INPUT'
    | 'AWAITING_HABIT_POST_ACTION'
    | 'AWAITING_UPDATE_ACTION_MEALS'
    | 'AWAITING_REMOVE_SYMPTOM'
    | 'AWAITING_REMOVE_LAB'
    | 'AWAITING_REMOVE_HABIT'
    | 'AWAITING_REMOVE_MEAL'
    | 'AWAITING_REMEDY_TYPE_SELECTION'
    | 'AWAITING_REMEDY_VECTOR_SELECTION'
    | 'AWAITING_REMEDY_HEADING_SELECTION'
    | 'AWAITING_EXPANDED_REMEDY_ACTION'
    | 'AWAITING_REMEDY_RATING_INPUT'
    | 'AWAITING_REMEDY_MEAL_SLOT'
    | 'AWAITING_OPTION_7_CHOICE'
    | 'AWAITING_MICRONUTRIENT_INPUT'
    | 'AWAITING_GENERAL_QUERY'
    | 'AWAITING_OTHER_INPUT'
    | 'AWAITING_FOLLOW_UP_OR_MENU'
  >('IDLE');
  const [remedyTypeSelection, setRemedyTypeSelection] = useState<'AYUSH' | 'OTHERS'>('AYUSH');
  const [remedyVectorSelection, setRemedyVectorSelection] = useState<'iron' | 'gut' | 'folate' | 'b12' | 'vitaminD' | 'all'>('iron');
  const [activeRemedyList, setActiveRemedyList] = useState<import('../types').AyushRemedy[]>([]);
  const [expandedRemedy, setExpandedRemedy] = useState<import('../types').AyushRemedy | null>(null);
  const [pendingProfileUpdates, setPendingProfileUpdates] = useState<Partial<Demographics> | null>(null);
  const [pendingProfileParameter, setPendingProfileParameter] = useState<'name' | 'age' | 'sex' | 'height' | 'weight' | 'pregnancy' | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<FoodCandidate | null>(null);
  const [currentCandidates, setCurrentCandidates] = useState<FoodCandidate[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isAiThinking]);

  const handleSaveCustomMeal = (customMeal: {
    name: string;
    mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
    ironMg: number;
    b12Mcg: number;
    vitaminCMg: number;
    vitaminDMcg: number;
    calories: number;
    folateMcg: number;
    calciumMg?: number;
  }) => {
    const toolExecData = executeToolLocally('saveMeal', {
      name: customMeal.name,
      portion: '1 custom serving',
      ironMg: customMeal.ironMg,
      b12Mcg: customMeal.b12Mcg,
      vitaminCMg: customMeal.vitaminCMg,
      vitaminDMcg: customMeal.vitaminDMcg,
      calories: customMeal.calories,
      folateMcg: customMeal.folateMcg,
      mealType: customMeal.mealType,
      hasVitaminCBooster: customMeal.vitaminCMg > 15,
    });

    const replyMsg: ChatMessage = {
      id: `agent-${Date.now()}`,
      sender: 'agent',
      text: `### Custom Food Item Logged! ✨\n\nI have saved **${customMeal.name}** under **${customMeal.mealType}** directly into your **Daily Meal Journal**!\n\n**User-Defined Nutrient Values Used for Daily Calculations:**\n- **Iron:** ${customMeal.ironMg} mg\n- **Vitamin B12:** ${customMeal.b12Mcg} µg\n- **Calcium:** ${customMeal.calciumMg} mg\n- **Vitamin C:** ${customMeal.vitaminCMg} mg\n- **Vitamin D:** ${customMeal.vitaminDMcg} µg\n- **Folate (B9):** ${customMeal.folateMcg} µg\n\nYour daily intake totals and RDA progress rings on your Dashboard and Meal Planner have been updated using your exact user-defined values. 🥗`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      citations: [
        {
          category: 'Data From Your Profile',
          content: 'User-specified nutrient metrics are directly aggregated into daily intake sums and RDA tracker rings.',
        },
      ],
      toolExecuted: toolExecData,
    };

    addChatMessage(replyMsg);
    setConversationState('IDLE');
    setPendingCandidate(null);
  };

  const suggestedPrompts = [
    'Add Warm Lemon Water with Amla to my daily habits.',
    'Explain my WHO LMS BMI Z-Score and growth percentile.',
  ];

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const query = (textToSend || '').trim();
      if (!query || isAiThinking) return;

      const cleanedQuery = query.toLowerCase().replace(/[^\w\s]/gi, '').trim();

    // ==========================================
    // 0. UNIVERSAL GREETING & MAIN MENU RESET TRIGGER
    // ==========================================
    const isGreetingOrPrimaryMenuQuery =
      /^(hi|hello|hey|heyy|hii|hiii|namaste|vanakkam|pranam|good\s*(morning|afternoon|evening|day)|greetings|howdy|sup|hi\s*there|hello\s*there|start|restart|menu|options|show\s*options|help|what\s*can\s*you\s*do|home|main\s*menu|categories|guide)$/i.test(
        cleanedQuery
      ) ||
      cleanedQuery === 'hi' ||
      cleanedQuery === 'hello' ||
      cleanedQuery === 'hey' ||
      cleanedQuery === 'namaste' ||
      cleanedQuery === 'menu' ||
      cleanedQuery === 'options' ||
      cleanedQuery === 'help' ||
      cleanedQuery === 'm' ||
      cleanedQuery === 'main menu';

    if (isGreetingOrPrimaryMenuQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat & ICMR-NIN 2020 integrated clinical lifestyle and nutritional framework.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      setPendingProfileUpdates(null);
      setPendingCandidate(null);
      setCurrentCandidates([]);
      setExpandedRemedy(null);
      setActiveRemedyList([]);
      return;
    }

    // ==========================================
    // 0. UNIVERSAL GOTO DASHBOARD TRIGGER
    // ==========================================
    const isGotoDashboardQuery =
      cleanedQuery === 'goto dashboard' ||
      cleanedQuery === 'go to dashboard' ||
      cleanedQuery === 'dashboard' ||
      cleanedQuery === 'dashboard tab' ||
      cleanedQuery === 'open dashboard' ||
      cleanedQuery === 'view dashboard';

    if (isGotoDashboardQuery) {
      setActiveTab('dashboard');
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const dashNavMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 📊 Navigated to Dashboard!\n\nI have switched your view to the **Dashboard** overview.\n\n---\n**Next Navigation:**\n**[1] Main Menu**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(dashNavMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. UNIVERSAL GOTO HABITS TRIGGER
    // ==========================================
    const isGotoHabitsQuery =
      cleanedQuery === 'goto habits' ||
      cleanedQuery === 'go to habits' ||
      cleanedQuery === 'habits tab' ||
      cleanedQuery === 'open habits' ||
      cleanedQuery === 'view habits';

    if (isGotoHabitsQuery) {
      setActiveTab('dashboard');
      setTimeout(() => {
        const el = document.getElementById('daily-habits-tracker-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const habitNavMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🌿 Navigated to Daily Habits!\n\nI have switched your view to the **Dashboard** tab where you can view and track all your logged daily habits.\n\n**Next Navigation:**\n**[1] Main Menu**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(habitNavMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. UNIVERSAL GOTO BIOMARKERS TRIGGER
    // ==========================================
    const isGotoBiomarkersQuery =
      cleanedQuery === 'goto biomarkers' ||
      cleanedQuery === 'go to biomarkers' ||
      cleanedQuery === 'biomarkers' ||
      cleanedQuery === 'biomarkers tab' ||
      cleanedQuery === 'open biomarkers' ||
      cleanedQuery === 'view biomarkers';

    if (isGotoBiomarkersQuery) {
      setActiveTab('vector');
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const bioNavMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🔬 Navigated to Biomarkers & Health Vector!\n\nI have switched your view to the **Health Vector** tab where you can inspect your updated demographic parameters, metabolic benchmarks, and clinical biomarker levels.\n\n**Next Navigation:**\n**[1] Main Menu**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(bioNavMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. UNIVERSAL OPTION 7 TRIGGER
    // ==========================================
    const isDirectOption7 =
      cleanedQuery === '7' ||
      cleanedQuery === 'option 7' ||
      cleanedQuery === 'other' ||
      cleanedQuery === 'others' ||
      cleanedQuery === 'other general question' ||
      cleanedQuery === 'general question' ||
      (cleanedQuery.startsWith('option 7') && cleanedQuery.length < 15);

    if (isDirectOption7 && conversationState === 'IDLE') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const option7PromptMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 💡 Option 7: Select Guidance Mode

Please select an option below:

[a] Micronutrient rich foods (e.g., iron rich foods)
[b] Other general question

*Click an option above or reply with [a] or [b].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: '1. Indian Government Portals',
            content: 'ICMR-NIN 2020 Guidelines (https://www.icmr.nic.in) & Ministry of AYUSH (https://main.ayush.gov.in)',
          },
        ],
      };
      addChatMessage(userMsg);
      addChatMessage(option7PromptMsg);
      setConversationState('AWAITING_OPTION_7_CHOICE');
      return;
    }

    // ==========================================
    // 0. DIRECT MICRONUTRIENT RICH FOODS EXTRACTION
    // ==========================================
    if (isMicronutrientRichFoodsQuery(query) && conversationState !== 'AWAITING_OPTION_7_CHOICE') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      setAiThinking(true);
      try {
        const resp = await generateMicronutrientCsvResponse(query);
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: resp.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: resp.citations,
        };
        addChatMessage(agentMsg);
        setConversationState('IDLE');
      } finally {
        setAiThinking(false);
      }
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: AWAITING OPTION 7 CHOICE
    // ==========================================
    if (conversationState === 'AWAITING_OPTION_7_CHOICE') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const lower = query.toLowerCase().trim();
      const isOptionA =
        lower === 'a' ||
        lower === '[a]' ||
        lower === '1' ||
        lower === '[1]' ||
        lower.startsWith('a)') ||
        lower.startsWith('a.') ||
        lower.includes('micronutrient') ||
        lower.includes('rich foods');

      const isOptionB =
        lower === 'b' ||
        lower === '[b]' ||
        lower === '2' ||
        lower === '[2]' ||
        lower.startsWith('b)') ||
        lower.startsWith('b.') ||
        lower.includes('other general') ||
        lower.includes('general question') ||
        lower.includes('general queries');

      if (isOptionA) {
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🥗 Micronutrient Rich Foods Inquiry\n\nPlease mention the food or deficiency you are inquiring about (for example: *top iron foods*, *how to reduce calcium deficiency*, *vit b12 foods*, *vit c rich foods*, *vit d rich foods*):`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Indian Food Composition Tables (https://www.icmr.nic.in) & Anemia Mukt Bharat',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        setConversationState('AWAITING_MICRONUTRIENT_INPUT');
        return;
      }

      if (isOptionB) {
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 💬 Other General Health Queries\n\nPlease enter your health or wellness question:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        setConversationState('AWAITING_GENERAL_QUERY');
        return;
      }

      // If user typed a direct micronutrient or deficiency inquiry
      if (
        lower.includes('iron') ||
        lower.includes('calcium') ||
        lower.includes('b12') ||
        lower.includes('vit c') ||
        lower.includes('vit d') ||
        lower.includes('folate') ||
        lower.includes('deficiency') ||
        lower.includes('rich foods')
      ) {
        addChatMessage(userMsg);
        setAiThinking(true);
        try {
          const resp = await generateMicronutrientCsvResponse(query);
          const agentMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: resp.text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: resp.citations,
          };
          addChatMessage(agentMsg);
          setConversationState('IDLE');
        } finally {
          setAiThinking(false);
        }
        return;
      }

      // If user typed a direct query instead of selecting 'a' or 'b', immediately process it through the government-grounded pipeline
      const followUpPromptSuffix = `\n\n---\n[1] Ask a Follow-up Question\n[2] Go to Main Menu`;
      addChatMessage(userMsg);
      setAiThinking(true);
      try {
        const userProfilePayload = {
          demographics,
          labs,
          gut,
          menstrual,
          selectedSymptoms,
          bmi,
          risks,
          isTriageTriggered,
        };
        const historyPayload = chatMessages.slice(-8).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            userProfile: userProfilePayload,
            history: historyPayload,
            conversationState: 'AWAITING_GENERAL_QUERY',
            flow: 'general_query',
          }),
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        let agentReplyText = (data.text || data.reply || generateGovernmentGroundedResponse(query));
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations || [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines (https://www.icmr.nic.in) & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Nutritional Anemias Guidance (https://www.who.int)',
            },
            {
              category: '3. US Government / NIH',
              content: 'NIH Office of Dietary Supplements (https://ods.od.nih.gov)',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } catch {
        let agentReplyText = generateGovernmentGroundedResponse(query);
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020: https://www.icmr.nic.in | Ministry of AYUSH: https://main.ayush.gov.in',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Guidelines: https://www.who.int',
            },
            {
              category: '3. US Government / NIH',
              content: 'US NIH Office of Dietary Supplements: https://ods.od.nih.gov',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } finally {
        setAiThinking(false);
      }
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: AWAITING MICRONUTRIENT INPUT
    // ==========================================
    if (conversationState === 'AWAITING_MICRONUTRIENT_INPUT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      setAiThinking(true);
      try {
        const resp = await generateMicronutrientCsvResponse(query);
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: resp.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: resp.citations,
        };
        addChatMessage(agentMsg);
        // Requirement: set conversation to idle
        setConversationState('IDLE');
      } finally {
        setAiThinking(false);
      }
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: FLOW 2 - GENERAL QUERY (AWAITING_GENERAL_QUERY / AWAITING_OTHER_INPUT)
    // ==========================================
    if (conversationState === 'AWAITING_GENERAL_QUERY' || conversationState === 'AWAITING_OTHER_INPUT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const followUpPromptSuffix = `\n\n---\n[1] Ask a Follow-up Question\n[2] Go to Main Menu`;

      addChatMessage(userMsg);
      setAiThinking(true);
      try {
        const userProfilePayload = {
          demographics,
          labs,
          gut,
          menstrual,
          selectedSymptoms,
          bmi,
          risks,
          isTriageTriggered,
        };
        const historyPayload = chatMessages.slice(-8).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            userProfile: userProfilePayload,
            history: historyPayload,
            conversationState: 'AWAITING_GENERAL_QUERY',
            flow: 'general_query',
          }),
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        let agentReplyText = (data.text || data.reply || generateGovernmentGroundedResponse(query));
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations || [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines (https://www.icmr.nic.in) & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Nutritional Anemias Guidance (https://www.who.int)',
            },
            {
              category: '3. US Government / NIH',
              content: 'NIH Office of Dietary Supplements (https://ods.od.nih.gov)',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } catch {
        let agentReplyText = generateGovernmentGroundedResponse(query);
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020: https://www.icmr.nic.in | Ministry of AYUSH: https://main.ayush.gov.in',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Nutritional Anemias Guidance: https://www.who.int',
            },
            {
              category: '3. US Government / NIH',
              content: 'US NIH Office of Dietary Supplements: https://ods.od.nih.gov',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } finally {
        setAiThinking(false);
      }
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: AWAITING FOLLOW UP OR MENU (FLOW 2 LOOP)
    // ==========================================
    if (conversationState === 'AWAITING_FOLLOW_UP_OR_MENU') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const lower = query.toLowerCase().trim();
      const isOption1 =
        lower === '1' ||
        lower === '[1]' ||
        lower.includes('follow-up') ||
        lower.includes('follow up') ||
        lower.includes('ask') ||
        lower === 'question';
      const isOption2 =
        lower === '2' ||
        lower === '[2]' ||
        lower.includes('main menu') ||
        lower.includes('go to main menu') ||
        lower.includes('goto main menu') ||
        lower === 'menu';

      if (isOption2) {
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(agentMsg);
        // Requirement: set conversation to idle
        setConversationState('IDLE');
        return;
      }

      if (isOption1) {
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 💬 Follow-up Question\n\nPlease enter your follow-up query:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(agentMsg);
        setConversationState('AWAITING_GENERAL_QUERY');
        return;
      }

      // If user typed a follow-up query directly:
      // Answer the inquiry grounded in government portals, provide follow-up & menu options, and keep state in AWAITING_FOLLOW_UP_OR_MENU until user chooses Main Menu.
      const followUpPromptSuffix = `\n\n---\n[1] Ask a Follow-up Question\n[2] Go to Main Menu`;
      addChatMessage(userMsg);
      setAiThinking(true);
      try {
        const userProfilePayload = {
          demographics,
          labs,
          gut,
          menstrual,
          selectedSymptoms,
          bmi,
          risks,
          isTriageTriggered,
        };
        const historyPayload = chatMessages.slice(-8).map((m) => ({
          role: m.sender === 'user' ? 'user' : 'model',
          content: m.text,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            userProfile: userProfilePayload,
            history: historyPayload,
            conversationState: 'AWAITING_GENERAL_QUERY',
            flow: 'general_query',
          }),
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        let agentReplyText = (data.text || data.reply || generateGovernmentGroundedResponse(query));
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: data.citations || [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines (https://www.icmr.nic.in) & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Nutritional Anemias Guidance (https://www.who.int)',
            },
            {
              category: '3. US Government / NIH',
              content: 'NIH Office of Dietary Supplements (https://ods.od.nih.gov)',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } catch {
        let agentReplyText = generateGovernmentGroundedResponse(query);
        if (!agentReplyText.includes('[1] Ask a Follow-up Question') && !agentReplyText.includes('[2] Go to Main Menu')) {
          agentReplyText += followUpPromptSuffix;
        }
        const agentMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: agentReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020: https://www.icmr.nic.in | Ministry of AYUSH: https://main.ayush.gov.in',
            },
            {
              category: '2. World Health Organization (WHO)',
              content: 'WHO Nutritional Anemias Guidance: https://www.who.int',
            },
            {
              category: '3. US Government / NIH',
              content: 'US NIH Office of Dietary Supplements: https://ods.od.nih.gov',
            },
          ],
        };
        addChatMessage(agentMsg);
        setConversationState('AWAITING_FOLLOW_UP_OR_MENU');
      } finally {
        setAiThinking(false);
      }
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: PREGNANCY TRIMESTER SELECTION
    // ==========================================
    if (conversationState === 'AWAITING_PREGNANCY_TRIMESTER') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Check if this is a trimester selection
      let trimester: 1 | 2 | 3 | null = null;
      if (
        cleanedQuery === '1' ||
        cleanedQuery === '[1]' ||
        cleanedQuery.includes('1st') ||
        cleanedQuery.includes('first') ||
        cleanedQuery.includes('1st trimester')
      ) {
        trimester = 1;
      } else if (
        cleanedQuery === '2' ||
        cleanedQuery === '[2]' ||
        cleanedQuery.includes('2nd') ||
        cleanedQuery.includes('second') ||
        cleanedQuery.includes('2nd trimester')
      ) {
        trimester = 2;
      } else if (
        cleanedQuery === '3' ||
        cleanedQuery === '[3]' ||
        cleanedQuery.includes('3rd') ||
        cleanedQuery.includes('third') ||
        cleanedQuery.includes('3rd trimester')
      ) {
        trimester = 3;
      }

      if (trimester !== null) {
        const finalUpdates: Partial<Demographics> = {
          ...(pendingProfileUpdates || {}),
          isPregnant: true,
          isLactating: false,
          pregnancyTrimester: trimester,
        };

        const toolExecData = executeToolLocally('updateHealthProfile', finalUpdates);

        const updatedLines: string[] = [];
        if (finalUpdates.name !== undefined) updatedLines.push(`- **Name:** ${finalUpdates.name}`);
        if (finalUpdates.age !== undefined) updatedLines.push(`- **Age:** ${finalUpdates.age} years`);
        if (finalUpdates.sex !== undefined)
          updatedLines.push(`- **Gender / Sex:** ${finalUpdates.sex === 'female' ? 'Female' : 'Male'}`);
        if (finalUpdates.heightCm !== undefined) updatedLines.push(`- **Height:** ${finalUpdates.heightCm} cm`);
        if (finalUpdates.weightKg !== undefined) updatedLines.push(`- **Weight:** ${finalUpdates.weightKg} kg`);
        updatedLines.push(
          `- **Pregnancy Status:** Pregnant (${trimester === 1 ? '1st' : trimester === 2 ? '2nd' : '3rd'} Trimester)`
        );

        const confirmMsgText = `### ✅ Health Profile Updated Successfully!\n\nI have updated your demographic parameters in your active health profile:\n\n${updatedLines.join(
          '\n'
        )}\n\nYour BMI, basal metabolic rates, and personalized ICMR-NIN RDA micronutrient targets have been recalibrated.\n\n**Next Actions:**\n[1] View Profile\n[2] Main Menu\n\n*Click an option above or reply with [1] or [2].*`;

        const confirmMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: confirmMsgText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content:
                'Pregnancy trimester adjustments dynamically update ICMR-NIN 2020 RDA iron targets (up to 27-35 mg/day) and folate cofactors.',
            },
            {
              category: 'Government of India Medical Guidelines',
              content: 'Anemia Mukt Bharat & ICMR-NIN 2020 Guidelines for Maternal Micronutrient Support.',
            },
          ],
          toolExecuted: toolExecData,
        };

        addChatMessage(userMsg);
        addChatMessage(confirmMsg);
        setConversationState('IDLE');
        setPendingProfileUpdates(null);
        return;
      } else {
        // State Reset Safety Guard: Unrelated query during trimester step
        setConversationState('IDLE');
        setPendingProfileUpdates(null);
        // Fall through to process query naturally
      }
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: SYMPTOMS UPDATE & REMOVAL FLOWS
    // ==========================================
    if (conversationState === 'AWAITING_UPDATE_ACTION_SYMPTOMS') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '1' || cleanedQuery.includes('add') || cleanedQuery.includes('modify')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Anemia Mukt Bharat Somatic Deficiency Manifestation Guidelines.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery.includes('remove') || cleanedQuery.includes('clear') || cleanedQuery.includes('delete')) {
        const activeSyms = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
        if (activeSyms.length === 0) {
          const noSymsMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### ℹ️ No Active Symptoms Found\n\nYou currently have no logged symptoms in your health profile.\n\n---\n**Next Actions:**\n**[1] Add New Symptom**\n**[2] Main Menu**\n\n*Reply with [1] to add a symptom or [2] / "Main Menu".*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(noSymsMsg);
          setConversationState('AWAITING_UPDATE_ACTION_SYMPTOMS');
          return;
        }

        const symLines = activeSyms.map((s, idx) => `**[${idx + 1}]** ${s}`).join('\n');
        const removePromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🗑️ Remove Symptoms\n\nSelect the symptom you wish to remove, or reply with the number or symptom name:\n\n${symLines}\n**[${activeSyms.length + 1}] Clear All Symptoms**\n\n*Reply with a number [1–${activeSyms.length + 1}] or type the symptom name to remove.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Active user symptom records stored in your personal Maguva health vector.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(removePromptMsg);
        setConversationState('AWAITING_REMOVE_SYMPTOM');
        return;
      }

      if (cleanedQuery === '3' || cleanedQuery.includes('view') || cleanedQuery.includes('profile')) {
        const activeSyms = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
        const symListStr = activeSyms.length > 0 ? activeSyms.join(', ') : 'No active symptoms logged.';
        const viewMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🩺 Current Symptoms Profile\n\n**Active Symptoms:** ${symListStr}\n\n---\n**Next Actions:**\n**[1] Add / Modify Symptoms**\n**[2] Remove / Clear Symptoms**\n**[3] Main Menu**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(viewMsg);
        setConversationState('AWAITING_UPDATE_ACTION_SYMPTOMS');
        return;
      }

      if (cleanedQuery === '4' || cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Unrecognized prompt in symptoms sub-menu -> reset to IDLE and display main menu
      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_REMOVE_SYMPTOM') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      const activeSyms = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
      const numChoice = parseInt(cleanedQuery, 10);
      let targetToRemove: string[] = [];

      if (cleanedQuery === 'all' || cleanedQuery === 'clear all' || (numChoice === activeSyms.length + 1)) {
        targetToRemove = [...activeSyms];
      } else if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= activeSyms.length) {
        targetToRemove = [activeSyms[numChoice - 1]];
      } else {
        const matched = activeSyms.filter((s) => s.toLowerCase().includes(cleanedQuery) || cleanedQuery.includes(s.toLowerCase()));
        if (matched.length > 0) {
          targetToRemove = matched;
        } else {
          targetToRemove = [query];
        }
      }

      const toolExecData = executeToolLocally('removeSymptoms', { symptoms: targetToRemove });
      const st = useHealthStore.getState();
      const remainingSyms = getAllActiveSymptomsList(st.selectedSymptoms, st.gut, st.severeSymptoms).join(', ') || 'No active symptoms logged';

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom(s) Removed Successfully!\n\nI have removed **${targetToRemove.join(', ')}** from your active profile.\n\n**Remaining Logged Symptoms:** ${remainingSyms}\n\n---\n**Next Actions:**\n**[1] Add / Modify Symptoms**\n**[2] View Current Symptoms**\n**[3] Main Menu**\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Updated somatic symptom registers in your personal Maguva health vector.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_HEALTH_DATA') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      let parsedHb: number | undefined;
      let parsedFerritin: number | undefined;
      let parsedB12: number | undefined;
      let parsedVitD: number | undefined;
      let parsedFolate: number | undefined;
      let parsedMcv: number | undefined;

      const hbMatch = query.match(/(?:hb|hemoglobin|haemoglobin)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (hbMatch) parsedHb = parseFloat(hbMatch[1]);

      const ferritinMatch = query.match(/(?:ferritin)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (ferritinMatch) parsedFerritin = parseFloat(ferritinMatch[1]);

      const b12Match = query.match(/(?:b12|vitamin\s*b12|vit\s*b12)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (b12Match) parsedB12 = parseFloat(b12Match[1]);

      const vitDMatch = query.match(/(?:vitamin\s*d|vit\s*d|vitd)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (vitDMatch) parsedVitD = parseFloat(vitDMatch[1]);

      const folateMatch = query.match(/(?:folate|folateb9|b9)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (folateMatch) parsedFolate = parseFloat(folateMatch[1]);

      const mcvMatch = query.match(/(?:mcv)\s*(?:is|:|=)?\s*(\d+(?:\.\d+)?)/i);
      if (mcvMatch) parsedMcv = parseFloat(mcvMatch[1]);

      const hasPureNumber = /^\d+(\.\d+)?$/.test(cleanedQuery);
      if (hasPureNumber && parsedHb === undefined && parsedFerritin === undefined && parsedB12 === undefined && parsedVitD === undefined && parsedFolate === undefined && parsedMcv === undefined) {
        const num = parseFloat(cleanedQuery);
        if (num >= 4.0 && num <= 20.0) {
          parsedHb = num;
        } else if (num > 20.0 && num <= 150.0) {
          parsedFerritin = num;
        } else if (num > 150.0 && num <= 1500.0) {
          parsedB12 = num;
        }
      }

      const updateArgs: Record<string, any> = {};
      const updatedLabels: string[] = [];

      if (parsedHb !== undefined) {
        updateArgs.hemoglobin = parsedHb;
        updatedLabels.push(`Hemoglobin: **${parsedHb} g/dL**`);
      }
      if (parsedFerritin !== undefined) {
        updateArgs.serumFerritin = parsedFerritin;
        updatedLabels.push(`Serum Ferritin: **${parsedFerritin} ng/mL**`);
      }
      if (parsedB12 !== undefined) {
        updateArgs.vitaminB12 = parsedB12;
        updatedLabels.push(`Vitamin B12: **${parsedB12} pg/mL**`);
      }
      if (parsedVitD !== undefined) {
        updateArgs.vitaminD = parsedVitD;
        updatedLabels.push(`Vitamin D: **${parsedVitD} ng/mL**`);
      }
      if (parsedFolate !== undefined) {
        updateArgs.folateB9 = parsedFolate;
        updatedLabels.push(`Folate (B9): **${parsedFolate} ng/mL**`);
      }
      if (parsedMcv !== undefined) {
        updateArgs.mcv = parsedMcv;
        updatedLabels.push(`MCV: **${parsedMcv} fL**`);
      }

      if (Object.keys(updateArgs).length > 0) {
        const toolExecData = executeToolLocally('updateHealthProfile', updateArgs);

        const successMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### ✅ Lab Biomarkers Updated Successfully!\n\nI have saved your updated parameters:\n${updatedLabels.map(l => `- ${l}`).join('\n')}\n\nAll risk factors, RDA limits, and nutritional plans have been recalibrated accordingly.\n\n${WELCOME_AND_MENU_MESSAGE}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Laboratory biomarkers directly update your deficiency risk engine and personalized clinical recommendations.',
            },
          ],
          toolExecuted: toolExecData,
        };

        addChatMessage(userMsg);
        addChatMessage(successMsg);
        setConversationState('IDLE');
        return;
      } else {
        const unrecognizedMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### ℹ️ Lab Biomarker Input Not Recognized\n\nI couldn't parse any lab biomarker values from your response. Please make sure to provide values like 'Hemoglobin: 11' or 'B12: 240'.\n\n${WELCOME_AND_MENU_MESSAGE}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(unrecognizedMsg);
        setConversationState('IDLE');
        return;
      }
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: LABS / BLOOD REPORTS UPDATE & REMOVAL FLOWS
    // ==========================================================
    if (conversationState === 'AWAITING_UPDATE_ACTION_LABS') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '1' || cleanedQuery.includes('add') || cleanedQuery.includes('modify') || cleanedQuery.includes('update')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🔬 Add or Update Lab Biomarkers\n\nPlease enter the lab biomarker and its value (e.g., 'Hemoglobin: 10.5', 'Ferritin: 14', 'B12: 240', 'Vitamin D: 18').\n\nYou can also edit any biomarker directly on the Health Vector tab.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Nutrient & Biomarker Diagnostic Standards.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_HEALTH_DATA');
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery.includes('remove') || cleanedQuery.includes('clear') || cleanedQuery.includes('delete') || cleanedQuery.includes('reset')) {
        const recordedLabs: { key: string; label: string; val: string }[] = [];
        if (labs?.hemoglobin) recordedLabs.push({ key: 'hemoglobin', label: 'Hemoglobin', val: `${labs.hemoglobin} g/dL` });
        if (labs?.serumFerritin) recordedLabs.push({ key: 'serumFerritin', label: 'Serum Ferritin', val: `${labs.serumFerritin} ng/mL` });
        if (labs?.vitaminB12) recordedLabs.push({ key: 'vitaminB12', label: 'Vitamin B12', val: `${labs.vitaminB12} pg/mL` });
        if (labs?.vitaminD) recordedLabs.push({ key: 'vitaminD', label: 'Vitamin D', val: `${labs.vitaminD} ng/mL` });
        if (labs?.folateB9) recordedLabs.push({ key: 'folateB9', label: 'Folate (B9)', val: `${labs.folateB9} ng/mL` });
        if (labs?.mcv) recordedLabs.push({ key: 'mcv', label: 'MCV', val: `${labs.mcv} fL` });

        if (recordedLabs.length === 0) {
          const noLabsMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### ℹ️ No Recorded Lab Values\n\nYou currently have no laboratory biomarker values recorded in your health vector.\n\n---\n**Next Actions:**\n**[1] Enter New Lab Value**\n**[2] Main Menu**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(noLabsMsg);
          setConversationState('AWAITING_UPDATE_ACTION_LABS');
          return;
        }

        const labLines = recordedLabs.map((l, idx) => `**[${idx + 1}]** ${l.label}: ${l.val}`).join('\n');
        const removePromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🗑️ Clear / Reset Recorded Lab Values\n\nSelect the lab test you wish to clear/reset:\n\n${labLines}\n**[${recordedLabs.length + 1}] Clear All Lab Values**\n\n*Reply with a number [1–${recordedLabs.length + 1}] or type the biomarker name to clear.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Laboratory biomarkers stored in your personal Maguva health vector.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(removePromptMsg);
        setConversationState('AWAITING_REMOVE_LAB');
        return;
      }

      if (cleanedQuery === '3' || cleanedQuery.includes('view')) {
        const hbStr = labs?.hemoglobin ? `${labs.hemoglobin} g/dL` : 'Not recorded';
        const ferritinStr = labs?.serumFerritin ? `${labs.serumFerritin} ng/mL` : 'Not recorded';
        const b12Str = labs?.vitaminB12 ? `${labs.vitaminB12} pg/mL` : 'Not recorded';
        const vitDStr = labs?.vitaminD ? `${labs.vitaminD} ng/mL` : 'Not recorded';
        const folateStr = labs?.folateB9 ? `${labs.folateB9} ng/mL` : 'Not recorded';
        const mcvStr = labs?.mcv ? `${labs.mcv} fL` : 'Not recorded';

        const labsMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🔬 Blood Reports & Clinical Lab Summary\n\n- **Hemoglobin (Hb):** ${hbStr}\n- **Serum Ferritin:** ${ferritinStr}\n- **Vitamin B12:** ${b12Str}\n- **Vitamin D:** ${vitDStr}\n- **Folate (B9):** ${folateStr}\n- **MCV:** ${mcvStr}\n\n---\n**Next Actions:**\n**[1] Add / Update Lab Biomarkers**\n**[2] Clear / Reset Lab Values**\n**[3] Main Menu**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(labsMsg);
        setConversationState('AWAITING_UPDATE_ACTION_LABS');
        return;
      }

      if (cleanedQuery === '4' || cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Unrecognized prompt in labs sub-menu -> reset to IDLE and display main menu
      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_REMOVE_LAB') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      const recordedLabs: { key: string; label: string }[] = [];
      if (labs?.hemoglobin) recordedLabs.push({ key: 'hemoglobin', label: 'Hemoglobin' });
      if (labs?.serumFerritin) recordedLabs.push({ key: 'serumFerritin', label: 'Serum Ferritin' });
      if (labs?.vitaminB12) recordedLabs.push({ key: 'vitaminB12', label: 'Vitamin B12' });
      if (labs?.vitaminD) recordedLabs.push({ key: 'vitaminD', label: 'Vitamin D' });
      if (labs?.folateB9) recordedLabs.push({ key: 'folateB9', label: 'Folate (B9)' });
      if (labs?.mcv) recordedLabs.push({ key: 'mcv', label: 'MCV' });

      const numChoice = parseInt(cleanedQuery, 10);
      let keysToClear: string[] = [];
      let labelCleared = '';

      if (cleanedQuery === 'all' || cleanedQuery === 'clear all' || (numChoice === recordedLabs.length + 1)) {
        keysToClear = ['hemoglobin', 'serumFerritin', 'vitaminB12', 'vitaminD', 'folateB9', 'mcv', 'tibc', 'serumIron'];
        labelCleared = 'All Lab Biomarkers';
      } else if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= recordedLabs.length) {
        keysToClear = [recordedLabs[numChoice - 1].key];
        labelCleared = recordedLabs[numChoice - 1].label;
      } else {
        if (cleanedQuery.includes('ferritin')) {
          keysToClear = ['serumFerritin'];
          labelCleared = 'Serum Ferritin';
        } else if (cleanedQuery.includes('hb') || cleanedQuery.includes('hemoglobin') || cleanedQuery.includes('haemoglobin')) {
          keysToClear = ['hemoglobin'];
          labelCleared = 'Hemoglobin';
        } else if (cleanedQuery.includes('b12') || cleanedQuery.includes('cobalamin')) {
          keysToClear = ['vitaminB12'];
          labelCleared = 'Vitamin B12';
        } else if (cleanedQuery.includes('vit d') || cleanedQuery.includes('vitamin d')) {
          keysToClear = ['vitaminD'];
          labelCleared = 'Vitamin D';
        } else if (cleanedQuery.includes('folate') || cleanedQuery.includes('b9')) {
          keysToClear = ['folateB9'];
          labelCleared = 'Folate (B9)';
        } else if (cleanedQuery.includes('mcv')) {
          keysToClear = ['mcv'];
          labelCleared = 'MCV';
        } else {
          keysToClear = [cleanedQuery];
          labelCleared = query;
        }
      }

      const toolExecData = executeToolLocally('clearLabs', { keys: keysToClear });

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Lab Biomarker Cleared Successfully!\n\nI have cleared recorded value(s) for **${labelCleared}** from your active profile. Your deficiency risk indicators have been recalibrated.\n\n${WELCOME_AND_MENU_MESSAGE}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Laboratory biomarkers stored in your personal Maguva health vector.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: HABITS UPDATE & REMOVAL FLOWS
    // ==========================================
    if (conversationState === 'AWAITING_UPDATE_ACTION_HABITS') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // a) ADD HABITS
      if (
        cleanedQuery === 'a' ||
        cleanedQuery === '1' ||
        cleanedQuery === 'add' ||
        cleanedQuery.includes('add') ||
        cleanedQuery.includes('create') ||
        cleanedQuery.includes('new')
      ) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌿 Add Daily Habit\n\nPlease mention the habit you would like to log (e.g., 'Warm Lemon Water with Amla', '2-Hour Chai Buffer', 'Curd with Roasted Jeera', '30 Minutes Morning Walk'):`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Ministry of AYUSH & Anemia Mukt Bharat dietary synergy protocols.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_ADD_HABIT_INPUT');
        return;
      }

      // b) REMOVE HABITS
      if (
        cleanedQuery === 'b' ||
        cleanedQuery === '2' ||
        cleanedQuery === 'remove' ||
        cleanedQuery.includes('remove') ||
        cleanedQuery.includes('clear') ||
        cleanedQuery.includes('delete') ||
        cleanedQuery.includes('stop')
      ) {
        const activeHabits = dailyHabits || [];
        if (activeHabits.length === 0) {
          const noHabitsMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### ℹ️ No Active Daily Habits\n\nYou currently have no active daily habits logged in your checklist.\n\n---\n**Next Actions:**\n**[1] Goto Dashboard**\n**[2] Main Menu**\n\n*Reply with [1] or "Goto Dashboard" to open your habits checklist, or [2] / "Main Menu".*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(noHabitsMsg);
          setConversationState('AWAITING_HABIT_POST_ACTION');
          return;
        }

        const habitLines = activeHabits.map((h, idx) => `**[${idx + 1}]** ${h.title} (${h.timing || 'Daily'})`).join('\n');
        const removePromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🗑️ Remove Daily Habit\n\nPlease mention the habit title or select the number you wish to remove from your log:\n\n${habitLines}\n**[${activeHabits.length + 1}] Clear All Habits**\n\n*Reply with a number [1–${activeHabits.length + 1}] or type the habit title to remove.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Daily habits and lifestyle adherence items in your personal Maguva health vector.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(removePromptMsg);
        setConversationState('AWAITING_REMOVE_HABIT');
        return;
      }

      // c) MAIN MENU
      if (cleanedQuery === 'c' || cleanedQuery === '3' || cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery.includes('menu') || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Unrecognized prompt -> reset to IDLE and display main menu
      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_ADD_HABIT_INPUT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'hi' || cleanedQuery === 'menu') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      const habitTitle = query.trim();
      const toolExecData = executeToolLocally('addHabit', {
        title: habitTitle,
        category: 'Lifestyle',
        description: habitTitle,
        timing: 'Daily',
      });
      const activeCount = (useHealthStore.getState().dailyHabits || []).length;

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Daily Habit Logged Successfully!\n\nI have added **"${habitTitle}"** to your daily habits log.\n\n**Total Logged Habits:** ${activeCount} active habit(s)\n\n---\n**Next Actions:**\n**[1] Goto Dashboard**\n**[2] Main Menu**\n\n*Reply with [1] or "Goto Dashboard" to open your habits checklist on the Dashboard, or [2] / "Main Menu".*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Daily habits checklist in your active personal profile.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_HABIT_POST_ACTION');
      return;
    }

    if (conversationState === 'AWAITING_REMOVE_HABIT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'hi' || cleanedQuery === 'menu') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      const activeHabits = dailyHabits || [];
      const numChoice = parseInt(cleanedQuery, 10);
      let targetTitles: string[] = [];
      let isClearAll = false;

      if (cleanedQuery === 'all' || cleanedQuery === 'clear all' || (numChoice === activeHabits.length + 1)) {
        isClearAll = true;
      } else if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= activeHabits.length) {
        targetTitles = [activeHabits[numChoice - 1].title || activeHabits[numChoice - 1].id];
      } else {
        const matched = activeHabits.filter((h) => h.title.toLowerCase().includes(cleanedQuery) || cleanedQuery.includes(h.title.toLowerCase()));
        if (matched.length > 0) {
          targetTitles = matched.map((h) => h.title);
        } else {
          targetTitles = [query];
        }
      }

      const toolExecData = executeToolLocally('removeHabit', isClearAll ? { clearAll: true } : { titles: targetTitles });
      const remainingCount = useHealthStore.getState().dailyHabits?.length || 0;

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Daily Habit Removed!\n\nI have ${isClearAll ? 'cleared all habits' : `removed **"${targetTitles.join(', ')}"**`} from your daily checklist.\n\n**Remaining Active Habits:** ${remainingCount} active habit(s)\n\n---\n**Next Actions:**\n**[1] Goto Dashboard**\n**[2] Main Menu**\n\n*Reply with [1] or "Goto Dashboard" to open your habits checklist on the Dashboard, or [2] / "Main Menu".*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Daily habits checklist in your active personal profile.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_HABIT_POST_ACTION');
      return;
    }

    if (conversationState === 'AWAITING_HABIT_POST_ACTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (
        cleanedQuery === '1' ||
        cleanedQuery === 'a' ||
        cleanedQuery === 'goto dashboard' ||
        cleanedQuery === 'go to dashboard' ||
        cleanedQuery === 'dashboard' ||
        cleanedQuery === 'goto habits' ||
        cleanedQuery === 'go to habits' ||
        cleanedQuery.includes('goto dashboard') ||
        cleanedQuery.includes('go to dashboard') ||
        cleanedQuery.includes('dashboard') ||
        cleanedQuery.includes('goto habits') ||
        cleanedQuery.includes('go to habits') ||
        cleanedQuery.includes('habits')
      ) {
        setActiveTab('dashboard');
        setTimeout(() => {
          const el = document.getElementById('daily-habits-tracker-card');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
        const habitNavMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌿 Daily Habits Dashboard\n\nI have switched your view to the **Dashboard** tab where you can view and track all your logged daily habits!\n\n---\n**Next Navigation:**\n**[1] Main Menu**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(habitNavMsg);
        setConversationState('IDLE');
        return;
      }

      if (
        cleanedQuery === '2' ||
        cleanedQuery === 'b' ||
        cleanedQuery === 'm' ||
        cleanedQuery.includes('main menu') ||
        cleanedQuery.includes('menu') ||
        cleanedQuery === 'hi'
      ) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Unrecognized prompt -> reset to IDLE and display main menu
      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: MEALS UPDATE & REMOVAL FLOWS
    // ==========================================
    if (conversationState === 'AWAITING_UPDATE_ACTION_MEALS') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '1' || cleanedQuery.includes('search') || cleanedQuery.includes('indian')) {
        const promptDishMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🍛 Search & Log an Indian Dish\n\nPlease enter the name of the food item you would like to log:\n\n*Examples: "Palak Paneer", "Ragi Dosa", "Poha", "Moong Dal Tadka", "Sprouted Sundal", "Moringa Sambar"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT).',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptDishMsg);
        setConversationState('AWAITING_CANDIDATE_CHOICE');
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery.includes('remove') || cleanedQuery.includes('delete') || cleanedQuery.includes('clear')) {
        const activeMeals = meals || [];
        if (activeMeals.length === 0) {
          const noMealsMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### ℹ️ No Logged Meals Today\n\nYou currently have no logged meals in your journal for today.\n\n---\n**Next Actions:**\n**[1] Log an Indian Dish**\n**[2] Main Menu**`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(noMealsMsg);
          setConversationState('AWAITING_UPDATE_ACTION_MEALS');
          return;
        }

        const mealLines = activeMeals.map((m, idx) => `**[${idx + 1}]** ${m.name} (${m.mealType}) - ${m.ironMg}mg iron, ${m.calories} kcal`).join('\n');
        const removePromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🗑️ Remove / Delete Logged Meal\n\nSelect the meal you wish to remove from today's journal:\n\n${mealLines}\n**[${activeMeals.length + 1}] Clear All Meals for Today**\n\n*Reply with a number [1–${activeMeals.length + 1}] or type the meal name to delete.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Logged dietary intake records in your active food journal.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(removePromptMsg);
        setConversationState('AWAITING_REMOVE_MEAL');
        return;
      }

      if (cleanedQuery === '3' || cleanedQuery.includes('custom')) {
        const customMealMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Custom Meal Entry Builder ✏️\n\nPlease provide your values (e.g.: "Paneer Tikka, Dinner, 2.5mg iron, 0.8mcg b12, 15mg vit c, 10µg vit d, 220 cal, 40mcg folate").`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(customMealMsg);
        setConversationState('AWAITING_CUSTOM_MEAL_ENTRY');
        return;
      }

      if (cleanedQuery === '4' || cleanedQuery.includes('view')) {
        const mealCount = meals.length;
        const totalIron = meals.reduce((acc, m) => acc + (m.ironMg || 0), 0);
        const totalB12 = meals.reduce((acc, m) => acc + (m.b12Mcg || 0), 0);
        const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
        const mealListText = mealCount > 0 ? meals.map((m) => `- **${m.name}** (${m.mealType}): ${m.ironMg}mg iron, ${m.calories} kcal`).join('\n') : 'No meals logged yet today.';

        const viewMealsMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🍽️ Today's Logged Meals\n\n${mealListText}\n\n**Daily Totals:** ${totalIron.toFixed(1)}mg iron, ${totalB12.toFixed(1)}µg B12, ${Math.round(totalCalories)} kcal\n\n---\n**Next Actions:**\n**[1] Search & Log an Indian Dish**\n**[2] Remove / Delete a Logged Meal**\n**[3] Custom Meal Entry**\n**[4] Main Menu**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(viewMealsMsg);
        setConversationState('AWAITING_UPDATE_ACTION_MEALS');
        return;
      }

      if (cleanedQuery === '5' || cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Unrecognized prompt in meals sub-menu -> reset to IDLE and display main menu
      const menuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: WELCOME_AND_MENU_MESSAGE,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      addChatMessage(userMsg);
      addChatMessage(menuMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_REMOVE_MEAL') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu') || cleanedQuery === 'menu' || cleanedQuery === 'hi') {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      const activeMeals = meals || [];
      const numChoice = parseInt(cleanedQuery, 10);
      let targetNames: string[] = [];
      let isClearAll = false;

      if (cleanedQuery === 'all' || cleanedQuery === 'clear all' || (numChoice === activeMeals.length + 1)) {
        isClearAll = true;
      } else if (!isNaN(numChoice) && numChoice >= 1 && numChoice <= activeMeals.length) {
        targetNames = [activeMeals[numChoice - 1].id || activeMeals[numChoice - 1].name];
      } else {
        const matched = activeMeals.filter((m) => m.name.toLowerCase().includes(cleanedQuery) || m.mealType.toLowerCase() === cleanedQuery || cleanedQuery.includes(m.name.toLowerCase()));
        if (matched.length > 0) {
          targetNames = matched.map((m) => m.id);
        } else {
          targetNames = [query];
        }
      }

      const toolExecData = executeToolLocally('removeMeal', isClearAll ? { clearAll: true } : { namesOrIds: targetNames });
      const updatedMeals = useHealthStore.getState().meals || [];
      const totalIron = updatedMeals.reduce((acc, m) => acc + (m.ironMg || 0), 0);
      const totalCalories = updatedMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Meal Removed from Journal!\n\nI have ${isClearAll ? 'cleared all meals for today' : `deleted **${targetNames.join(', ')}**`} from your meal log.\n\n**Updated Daily Totals:**\n- **Total Iron:** ${totalIron.toFixed(1)} mg\n- **Total Calories:** ${Math.round(totalCalories)} kcal\n\n---\n**Next Actions:**\n**[1] View Meal Journal**\n**[2] Log a Meal**\n**[3] Main Menu**\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Daily food journal records and aggregated nutrient totals.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_UPDATE_ACTION_MEALS');
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: AYUSH & REMEDIES WORKFLOW
    // ==========================================
    if (conversationState === 'AWAITING_REMEDY_TYPE_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      let selectedType: 'AYUSH' | 'OTHERS' = 'AYUSH';
      if (cleanedQuery === '2' || cleanedQuery === '[2]' || cleanedQuery.includes('other') || cleanedQuery.includes('lifestyle') || cleanedQuery.includes('modern')) {
        selectedType = 'OTHERS';
      } else {
        selectedType = 'AYUSH';
      }

      setRemedyTypeSelection(selectedType);
      setConversationState('AWAITING_REMEDY_VECTOR_SELECTION');

      const vectorMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🎯 Target Health Focus / Micronutrient Vector\n\nWhich micronutrient or health vector would you like **${selectedType === 'AYUSH' ? 'AYUSH & Ayurvedic Wellness' : 'Others'}** remedies for?\n\n**[1] Iron & Hb**\n**[2] Vitamin D**\n**[3] Gut & Digestion**\n**[4] B12 & Nerves**\n**[5] Folate**\n**[6] All Vectors**\n\n*Reply with a number [1–6].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Ministry of AYUSH & ICMR-NIN micronutrient vector targeting protocols.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(vectorMenuMsg);
      return;
    }

    if (conversationState === 'AWAITING_REMEDY_VECTOR_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      let selectedVector: 'iron' | 'gut' | 'folate' | 'b12' | 'vitaminD' | 'all' = 'iron';
      let vectorLabel = 'Iron & Hb';

      if (cleanedQuery === '1' || cleanedQuery === '[1]' || cleanedQuery.includes('iron') || cleanedQuery.includes('anemia') || cleanedQuery.includes('hb')) {
        selectedVector = 'iron';
        vectorLabel = 'Iron & Hb';
      } else if (cleanedQuery === '2' || cleanedQuery === '[2]' || cleanedQuery.includes('vit d') || cleanedQuery.includes('vitamin d') || cleanedQuery.includes('sunlight')) {
        selectedVector = 'vitaminD';
        vectorLabel = 'Vitamin D';
      } else if (cleanedQuery === '3' || cleanedQuery === '[3]' || cleanedQuery.includes('gut') || cleanedQuery.includes('digestion') || cleanedQuery.includes('acidity')) {
        selectedVector = 'gut';
        vectorLabel = 'Gut & Digestion';
      } else if (cleanedQuery === '4' || cleanedQuery === '[4]' || cleanedQuery.includes('b12') || cleanedQuery.includes('cobalamin') || cleanedQuery.includes('nerves')) {
        selectedVector = 'b12';
        vectorLabel = 'B12 & Nerves';
      } else if (cleanedQuery === '5' || cleanedQuery === '[5]' || cleanedQuery.includes('folate') || cleanedQuery.includes('b9')) {
        selectedVector = 'folate';
        vectorLabel = 'Folate';
      } else if (cleanedQuery === '6' || cleanedQuery === '[6]' || cleanedQuery.includes('all')) {
        selectedVector = 'all';
        vectorLabel = 'All Vectors';
      }

      setRemedyVectorSelection(selectedVector);

      const isOtherItem = (r: { id: string; remedyType?: string; category?: string }) =>
        r.remedyType === 'OTHERS' ||
        r.category === 'Lifestyle' ||
        r.category === 'Modern Dietary' ||
        r.id === 'mahua-flower-laddoo' ||
        r.id === 'mahuwa-flower-laddoo' ||
        r.id === 'fresh-wheatgrass-juice' ||
        r.id === 'ayurvedic-takra-buttermilk' ||
        r.id === 'cast-iron-cookware' ||
        r.id === 'nutritional-yeast-b12' ||
        r.id === 'sunlight-sesame-vit-d' ||
        r.id === 'halim-seeds-dates';

      const storeRemedies = useHealthStore.getState().ayushRemedies || [];
      const allRemediesList = INITIAL_AYUSH_REMEDIES.map((masterItem) => {
        const storeItem = storeRemedies.find((r) => r.id === masterItem.id);
        return {
          ...masterItem,
          rating: storeItem?.rating ?? masterItem.rating,
          userNotes: storeItem?.userNotes ?? masterItem.userNotes,
          addedToHabits: storeItem?.addedToHabits ?? masterItem.addedToHabits,
        };
      });

      const filtered = allRemediesList.filter((r) => {
        const isOther = isOtherItem(r);
        if (remedyTypeSelection === 'AYUSH') {
          if (isOther) return false;
          if (selectedVector === 'b12' || selectedVector === 'folate') return false;
          if (selectedVector === 'vitaminD') return r.id === 'oyster-mushroom-soup';
          if (selectedVector === 'gut') return r.id === 'laja-manda-rice-peya';
          if (selectedVector === 'iron') return r.targetDeficiency.includes('iron');
          if (selectedVector === 'all') return true;
          return r.targetDeficiency.includes(selectedVector as any);
        } else {
          if (selectedVector === 'vitaminD' || selectedVector === 'folate') return false;
          if (selectedVector === 'iron') return r.id === 'fresh-wheatgrass-juice' || r.id === 'mahua-flower-laddoo';
          if (selectedVector === 'b12') return r.id === 'mahua-flower-laddoo';
          if (selectedVector === 'gut') return r.id === 'ayurvedic-takra-buttermilk';
          if (selectedVector === 'all') return r.id === 'fresh-wheatgrass-juice' || r.id === 'mahua-flower-laddoo' || r.id === 'ayurvedic-takra-buttermilk';
          return false;
        }
      });

      if (filtered.length === 0) {
        const noResultsMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### ℹ️ No Suggestions Found\n\nNo suggestions found for this parameter combination in **${remedyTypeSelection === 'AYUSH' ? 'AYUSH & Ayurvedic Wellness' : 'Others'}** remedies.\n\n**Next Navigation:**\n**[1] Open AYUSH Wellness Tab**\n**[2] Return to Main Menu**\n\n*Click an option above or reply with [1] or [2].*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(noResultsMsg);
        setConversationState('IDLE');
        return;
      }

      setActiveRemedyList(filtered);
      setConversationState('AWAITING_REMEDY_HEADING_SELECTION');

      const headingsText = filtered.map((r, i) => `${i + 1}. **${r.name}**${r.sanskritName ? ` (*${r.sanskritName}*)` : ''}\n   *Category:* ${r.category} | *Target Vector:* ${r.targetDeficiency.join(', ').toUpperCase()}`).join('\n\n');

      const headingMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🌿 ${remedyTypeSelection === 'AYUSH' ? 'AYUSH & Ayurvedic Wellness' : 'Other'} Remedies (${vectorLabel})\n\nHere are the top matching remedies for your selected health focus:\n\n${headingsText}\n\n---\n**Reply with a number [1–${filtered.length}] to expand full clinical details, community rating, and reviews.**\nOr select:\n**[B] Change Vector**\n**[M] Return to Main Menu**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Ministry of AYUSH Pharmacopoeia & ICMR-NIN therapeutic nutrition benchmarks.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(headingMenuMsg);
      return;
    }

    if (conversationState === 'AWAITING_REMEDY_HEADING_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === 'b' || cleanedQuery.includes('change vector') || cleanedQuery.includes('back')) {
        setConversationState('AWAITING_REMEDY_VECTOR_SELECTION');
        const backVectorMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🎯 Target Health Focus / Micronutrient Vector\n\nWhich micronutrient or health vector would you like **${remedyTypeSelection === 'AYUSH' ? 'AYUSH & Ayurvedic Wellness' : 'Others'}** remedies for?\n\n**[1] Iron & Hb**\n**[2] Vitamin D**\n**[3] Gut & Digestion**\n**[4] B12 & Nerves**\n**[5] Folate**\n**[6] All Vectors**\n\n*Reply with a number [1–6].*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(backVectorMsg);
        return;
      }

      if (cleanedQuery === 'm' || cleanedQuery.includes('main menu')) {
        setConversationState('IDLE');
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌸 Main Menu\n\nHow can I assist you today?\n\n**[1] Profile & Demographics**\n**[2] Symptoms & Signals**\n**[3] Blood Reports & Labs**\n**[4] Meals & Food Journal**\n**[5] AYUSH & Other Traditional Remedies**\n**[6] Deficiency Risks & Guidance**\n**[7] Other**\n**[8] Daily Habits**\n\n*Click an option above or reply with a number [1–8].*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        return;
      }

      const numIndex = parseInt(cleanedQuery.replace(/\D/g, ''), 10);
      let selectedRemedy: import('../types').AyushRemedy | undefined;

      if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= activeRemedyList.length) {
        selectedRemedy = activeRemedyList[numIndex - 1];
      } else {
        selectedRemedy = activeRemedyList.find((r) => r.name.toLowerCase().includes(cleanedQuery) || cleanedQuery.includes(r.name.toLowerCase()));
      }

      if (!selectedRemedy) {
        const errorMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### ℹ️ Remedy Not Recognized\n\nPlease reply with a valid number between **[1]** and **[${activeRemedyList.length}]** from the remedy list above.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(errorMsg);
        return;
      }

      setExpandedRemedy(selectedRemedy);
      setConversationState('AWAITING_EXPANDED_REMEDY_ACTION');

      const reviews = remedyReviews.filter((rev) => rev.remedyId === selectedRemedy.id);
      const avgRating = selectedRemedy.rating || 5;
      const reviewCount = reviews.length;
      const reviewTextList = reviews.length > 0
        ? reviews.slice(0, 3).map((rev) => `- ⭐ **${rev.rating}/5** (${rev.userName || 'Verified User'}): "${rev.comment}"`).join('\n')
        : '- *No community reviews yet. Be the first to rate and review this protocol!*';

      const detailMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🌿 ${selectedRemedy.name}\n\n${selectedRemedy.sanskritName ? `**Ayurvedic / Sanskrit Name:** ${selectedRemedy.sanskritName}\n` : ''}${selectedRemedy.botanicalName ? `**Botanical Name:** *${selectedRemedy.botanicalName}*\n` : ''}**Category:** ${selectedRemedy.category} | **Target Vector:** ${selectedRemedy.targetDeficiency.join(', ').toUpperCase()}\n\n#### 📋 Clinical Trial Evidence & Outcomes / Primary Benefits:\n${selectedRemedy.primaryBenefits.map((b) => `- ${b}`).join('\n')}\n\n#### 🔬 Nutritional Synergy & Mechanism / Research:\n${selectedRemedy.clinicalEvidence || 'Documented in classical pharmacopoeia and clinical research trials.'}\n${selectedRemedy.officialAyushLink ? `\n#### 🔗 Verification Link:\n[Official AYUSH Reference](${selectedRemedy.officialAyushLink})\n` : ''}\n#### 🍵 How to Consume & Optimal Timing:\n- **Preparation & Intake:** ${selectedRemedy.howToConsume}\n- **Optimal Schedule:** ${selectedRemedy.optimalTiming}\n${selectedRemedy.contraindications ? `- **Contraindications / Cautions:** ${selectedRemedy.contraindications}\n` : ''}\n#### 📍 Sourcing & Local Procurement:\n- **Local Availability:** ${selectedRemedy.localSourcing}\n- **Clinical Notes:** ${selectedRemedy.userNotes || 'Highly recommended traditional protocol.'}\n\n---\n#### ⭐ Community Rating & User Reviews:\n- **Rating:** **${avgRating.toFixed(1)} / 5.0** (${reviewCount} review${reviewCount === 1 ? '' : 's'})\n${reviewTextList}\n\n---\n**Next Actions:**\n**[1] Rate & Write a Review for this Remedy**\n**[2] Log this Remedy into Meal Planner**\n**[3] Back to Remedies List**\n\n*Click an option above or reply with [1], [2], or [3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Ministry of AYUSH & Anemia Mukt Bharat traditional health verification standard.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(detailMsg);
      return;
    }

    if (conversationState === 'AWAITING_EXPANDED_REMEDY_ACTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (!expandedRemedy) {
        setConversationState('IDLE');
        return;
      }

      if (cleanedQuery === '1' || cleanedQuery === '[1]' || cleanedQuery.includes('rate') || cleanedQuery.includes('review')) {
        setConversationState('AWAITING_REMEDY_RATING_INPUT');
        const ratePromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### ⭐ Rate & Write a Review for "${expandedRemedy.name}"\n\nPlease enter your rating (1 to 5 stars) and a short review comment in your reply!\n\n*Format Examples:*\n- **5 - Reduced my morning acidity significantly!**\n- **4 - Tastes great when taken warm with lemon.**\n- **5**\n\n*Type your rating and review below:*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(ratePromptMsg);
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery === '[2]' || cleanedQuery.includes('log') || cleanedQuery.includes('meal')) {
        setConversationState('AWAITING_REMEDY_MEAL_SLOT');
        const slotPromptMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🍽️ Log "${expandedRemedy.name}" into Meal Planner\n\nWhich meal slot would you like to log this remedy under?\n\n**[1] Breakfast**\n**[2] Lunch**\n**[3] Snacks**\n**[4] Dinner**\n\n*Reply with a number [1–4].*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(slotPromptMsg);
        return;
      }

      if (cleanedQuery === '3' || cleanedQuery === '[3]' || cleanedQuery.includes('back') || cleanedQuery.includes('list')) {
        setConversationState('AWAITING_REMEDY_HEADING_SELECTION');
        const headingsText = activeRemedyList.map((r, i) => `${i + 1}. **${r.name}**${r.sanskritName ? ` (*${r.sanskritName}*)` : ''}\n   *Category:* ${r.category} | *Target Vector:* ${r.targetDeficiency.join(', ').toUpperCase()}`).join('\n\n');
        const listMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌿 Remedies List\n\n${headingsText}\n\n---\n**Reply with a number [1–${activeRemedyList.length}] to view complete details.**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(listMsg);
        return;
      }

      setConversationState('IDLE');
    }

    if (conversationState === 'AWAITING_REMEDY_RATING_INPUT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (!expandedRemedy) {
        setConversationState('IDLE');
        return;
      }

      const ratingMatch = query.match(/\b([1-5])(?:\/5|\s*stars?)?\b/i) || cleanedQuery.match(/\b([1-5])(?:\/5|\s*stars?)?\b/i);
      const rating = ratingMatch ? parseInt(ratingMatch[1], 10) : 5;

      let reviewText = query
        .replace(/\b[1-5](?:\/5|\s*stars?)?\b/gi, '')
        .replace(/\b(ratings?|reviews?|stars?)\b/gi, '')
        .replace(/[\/\-\:_]+/g, ' ')
        .replace(/^[\s\,\.\;]+|[\s\,\.\;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!reviewText || reviewText.length < 2) {
        reviewText = 'Highly effective traditional health remedy.';
      }

      const toolExecData = executeToolLocally('submitRemedyReview', {
        remedyId: expandedRemedy.id,
        rating,
        reviewText,
        text: reviewText,
      });

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Rating & Review Saved to AYUSH Wellness Page!\n\nThank you! Your rating (**${rating} / 5.0**) and review have been recorded and synced to the **AYUSH Wellness Page**.\n\n**Logged Review:** "${reviewText}"\n\n---\n**Next Navigation:**\n**[1] Open AYUSH Wellness Tab**\n**[2] Return to Main Menu**\n\n*Click an option above or reply with [1] or [2].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Community rating and personal review stored in local AYUSH remedies repository.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    if (conversationState === 'AWAITING_REMEDY_MEAL_SLOT') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (!expandedRemedy) {
        setConversationState('IDLE');
        return;
      }

      let selectedSlot: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' = 'Snacks';
      if (cleanedQuery === '1' || cleanedQuery.includes('break')) selectedSlot = 'Breakfast';
      else if (cleanedQuery === '2' || cleanedQuery.includes('lunch')) selectedSlot = 'Lunch';
      else if (cleanedQuery === '3' || cleanedQuery.includes('snack')) selectedSlot = 'Snacks';
      else if (cleanedQuery === '4' || cleanedQuery.includes('dinn')) selectedSlot = 'Dinner';

      const ironVal = expandedRemedy.targetDeficiency.includes('iron') ? 1.8 : 0.5;
      const b12Val = expandedRemedy.targetDeficiency.includes('b12') ? 1.0 : 0;
      const folateVal = expandedRemedy.targetDeficiency.includes('folate') ? 40 : 0;
      const vitDVal = expandedRemedy.targetDeficiency.includes('vitaminD') ? 100 : 0;

      const toolExecData = executeToolLocally('saveMeal', {
        name: expandedRemedy.name,
        portion: expandedRemedy.howToConsume || '1 standard serving',
        ironMg: ironVal,
        b12Mcg: b12Val,
        folateMcg: folateVal,
        vitaminDMcg: vitDVal,
        calories: 80,
        mealType: selectedSlot,
      });

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Remedy Logged to Meal Planner!\n\nI have logged **${expandedRemedy.name}** directly into your **Meal Planner** under **${selectedSlot}**.\n\n- **Portion:** ${expandedRemedy.howToConsume || '1 standard serving'}\n- **Nutrients Added:** ${ironVal}mg iron${b12Val > 0 ? `, ${b12Val}µg B12` : ''}${folateVal > 0 ? `, ${folateVal}µg Folate` : ''}\n\n---\n**Next Navigation:**\n**[1] Open AYUSH Wellness Tab**\n**[2] Return to Main Menu**\n\n*Click an option above or reply with [1] or [2].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Logged dietary intake record saved to active daily meal planner.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 0. GUIDED STATE MACHINE: PROFILE UPDATE DEMOGRAPHICS
    // ==========================================
    if (conversationState === 'AWAITING_PROFILE_UPDATE') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const selectCode = cleanedQuery;
      
      if (selectCode === '1' || selectCode.includes('[1]') || selectCode === 'name') {
        setPendingProfileParameter('name');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Name\n\nPlease enter your updated **Name**:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '2' || selectCode.includes('[2]') || selectCode === 'age') {
        setPendingProfileParameter('age');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Age\n\nPlease enter your updated **Age** in years (e.g., 25):`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '3' || selectCode.includes('[3]') || selectCode === 'sex' || selectCode === 'gender') {
        setPendingProfileParameter('sex');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Gender / Sex\n\nPlease choose your **Gender / Sex**:\n**[1] Female**\n**[2] Male**\n\n*Reply with [1] or [2] or type your gender directly.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '4' || selectCode.includes('[4]') || selectCode === 'height') {
        setPendingProfileParameter('height');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Height\n\nPlease enter your updated **Height** in cm (e.g., 157):`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '5' || selectCode.includes('[5]') || selectCode === 'weight') {
        setPendingProfileParameter('weight');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Weight\n\nPlease enter your updated **Weight** in kg (e.g., 50):`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '6' || selectCode.includes('[6]') || selectCode === 'pregnancy' || selectCode === 'lactation') {
        setPendingProfileParameter('pregnancy');
        setConversationState('AWAITING_PROFILE_PARAMETER_VALUE');
        const askMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Update Profile: Pregnancy / Lactation Status\n\nPlease choose your current status:\n**[1] Pregnant**\n**[2] Lactating**\n**[3] Non-pregnant / Non-lactating**\n\n*Reply with [1], [2], or [3] or select your status above.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(askMsg);
        return;
      } else if (selectCode === '7' || selectCode.includes('[7]') || selectCode.toLowerCase().includes('back') || selectCode.toLowerCase().includes('menu')) {
        setConversationState('IDLE');
        setPendingProfileParameter(null);
        setPendingProfileUpdates(null);
        const welcomeBackMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(welcomeBackMsg);
        return;
      } else {
        // Fallback: Check if we can parse the input directly (e.g. if user type "weight 50" directly without choosing a parameter first)
        const parsed = parseDemographicInput(query);
        if (parsed.hasValidField) {
          if (parsed.isPregnantDeclared && parsed.updates.pregnancyTrimester === undefined) {
            setPendingProfileUpdates(parsed.updates);
            setConversationState('AWAITING_PREGNANCY_TRIMESTER');
            const trimesterPromptMsg: ChatMessage = {
              id: `agent-${Date.now() + 1}`,
              sender: 'agent',
              text: `### 🤰 Pregnancy Trimester Information\n\nWhich trimester are you currently in?\n\n**[1] 1st Trimester** (Weeks 1 – 12)\n**[2] 2nd Trimester** (Weeks 13 – 27)\n**[3] 3rd Trimester** (Weeks 28 – 40+)\n\n*Please reply with [1], [2], or [3].*`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            addChatMessage(userMsg);
            addChatMessage(trimesterPromptMsg);
            return;
          } else {
            const toolExecData = executeToolLocally('updateHealthProfile', parsed.updates);
            const updatedLines: string[] = [];
            if (parsed.updates.name !== undefined) updatedLines.push(`- **Name:** ${parsed.updates.name}`);
            if (parsed.updates.age !== undefined) updatedLines.push(`- **Age:** ${parsed.updates.age} years`);
            if (parsed.updates.sex !== undefined) updatedLines.push(`- **Gender / Sex:** ${parsed.updates.sex === 'female' ? 'Female' : 'Male'}`);
            if (parsed.updates.heightCm !== undefined) updatedLines.push(`- **Height:** ${parsed.updates.heightCm} cm`);
            if (parsed.updates.weightKg !== undefined) updatedLines.push(`- **Weight:** ${parsed.updates.weightKg} kg`);
            if (parsed.updates.isPregnant !== undefined) {
              if (parsed.updates.isPregnant) {
                updatedLines.push(`- **Pregnancy Status:** Pregnant (${parsed.updates.pregnancyTrimester ? `${parsed.updates.pregnancyTrimester} Trimester` : 'Trimester not specified'})`);
              } else if (parsed.updates.isLactating) {
                updatedLines.push(`- **Lactation Status:** Lactating`);
              } else {
                updatedLines.push(`- **Pregnancy Status:** Non-pregnant / Non-lactating`);
              }
            }

            const confirmMsgText = `### ✅ Health Profile Updated Successfully!\n\nI have updated your demographic parameters in your active health profile:\n\n${updatedLines.join('\n')}\n\nYour BMI, metabolic benchmarks, and ICMR-NIN RDA targets have been recalibrated.\n\n**Next Actions:**\n[1] View Profile\n[2] Main Menu\n\n*Click an option above or reply with [1] or [2].*`;
            const confirmMsg: ChatMessage = {
              id: `agent-${Date.now() + 1}`,
              sender: 'agent',
              text: confirmMsgText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              toolExecuted: toolExecData,
            };
            addChatMessage(userMsg);
            addChatMessage(confirmMsg);
            setConversationState('IDLE');
            setPendingProfileParameter(null);
            setPendingProfileUpdates(null);
            return;
          }
        } else {
          // Tell the user to select 1-7
          const errMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### 👤 Invalid Selection\n\nI didn't recognize that entry. Please select a number **[1–6]** to update a parameter, or reply with **[7]** to Go Back to Main Menu.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(errMsg);
          return;
        }
      }
    }

    if (conversationState === 'AWAITING_PROFILE_PARAMETER_VALUE') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const parameter = pendingProfileParameter;
      let updates: Partial<Demographics> = {};
      let isPregnantDeclared = false;
      let parsedValueDisplay = '';

      if (parameter === 'name') {
        const cleanName = query.trim();
        if (cleanName.length >= 1) {
          updates.name = cleanName;
          parsedValueDisplay = `Name: **${cleanName}**`;
        }
      } else if (parameter === 'age') {
        const num = parseFloat(query.replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 0 && num < 120) {
          updates.age = num;
          parsedValueDisplay = `Age: **${num} years**`;
        }
      } else if (parameter === 'height') {
        const num = parseFloat(query.replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 30 && num < 250) {
          updates.heightCm = num;
          parsedValueDisplay = `Height: **${num} cm**`;
        }
      } else if (parameter === 'weight') {
        const num = parseFloat(query.replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 10 && num < 300) {
          updates.weightKg = num;
          parsedValueDisplay = `Weight: **${num} kg**`;
        }
      } else if (parameter === 'sex') {
        const cleaned = cleanedQuery.toLowerCase();
        if (cleaned === '1' || cleaned.includes('female') || cleaned.includes('woman')) {
          updates.sex = 'female';
          parsedValueDisplay = `Gender / Sex: **Female**`;
        } else if (cleaned === '2' || cleaned.includes('male') || cleaned.includes('man')) {
          updates.sex = 'male';
          parsedValueDisplay = `Gender / Sex: **Male**`;
        }
      } else if (parameter === 'pregnancy') {
        const cleaned = cleanedQuery.toLowerCase();
        if (cleaned === '1' || cleaned.includes('pregnant') || cleaned.includes('pregnancy')) {
          updates.isPregnant = true;
          updates.isLactating = false;
          isPregnantDeclared = true;
          parsedValueDisplay = `Pregnancy Status: **Pregnant**`;
        } else if (cleaned === '2' || cleaned.includes('lactating') || cleaned.includes('breastfeeding') || cleaned.includes('nursing')) {
          updates.isPregnant = false;
          updates.isLactating = true;
          parsedValueDisplay = `Pregnancy Status: **Lactating**`;
        } else if (cleaned === '3' || cleaned.includes('non') || cleaned.includes('no') || cleaned.includes('not')) {
          updates.isPregnant = false;
          updates.isLactating = false;
          parsedValueDisplay = `Pregnancy Status: **Non-pregnant / Non-lactating**`;
        }
      }

      if (Object.keys(updates).length > 0) {
        if (isPregnantDeclared) {
          setPendingProfileUpdates(updates);
          setConversationState('AWAITING_PREGNANCY_TRIMESTER');
          const trimesterPromptMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### 🤰 Pregnancy Trimester Information\n\nWhich trimester are you currently in?\n\n**[1] 1st Trimester** (Weeks 1 – 12)\n**[2] 2nd Trimester** (Weeks 13 – 27)\n**[3] 3rd Trimester** (Weeks 28 – 40+)\n\n*Please reply with [1], [2], or [3].*`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          addChatMessage(userMsg);
          addChatMessage(trimesterPromptMsg);
          return;
        } else {
          const toolExecData = executeToolLocally('updateHealthProfile', updates);
          const confirmMsgText = `### ✅ Health Profile Updated Successfully!\n\nI have updated your active health profile:\n- ${parsedValueDisplay}\n\nYour BMI, metabolic benchmarks, and personalized ICMR-NIN RDA targets have been recalibrated.\n\n**Next Actions:**\n[1] View Profile\n[2] Main Menu\n\n*Click an option above or reply with [1] or [2].*`;
          const confirmMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: confirmMsgText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            toolExecuted: toolExecData,
          };
          addChatMessage(userMsg);
          addChatMessage(confirmMsg);
          setConversationState('IDLE');
          setPendingProfileParameter(null);
          setPendingProfileUpdates(null);
          return;
        }
      } else {
        const errMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Invalid Entry\n\nI couldn't understand that value. Please enter a valid entry for your chosen parameter (e.g., if you selected weight, reply with a number like \`50\`).`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(errMsg);
        return;
      }
    }

    // ==========================================
    // 1. AUTOMATIC TOPIC SWITCHING & STATE RESET
    // ==========================================
    // If the query is NOT a simple numeric option choice ('1' - '7'), reset state to 'IDLE'.
    // This guarantees topic switches never get passed to food generator or create fake meal logs.
    const isStateRequiringText = [
      'AWAITING_PROFILE_UPDATE',
      'AWAITING_PROFILE_PARAMETER_VALUE',
      'AWAITING_UPDATE_ACTION_SYMPTOMS',
      'AWAITING_SYMPTOM_SELECTION',
      'AWAITING_IRON_SYMPTOM_SELECTION',
      'AWAITING_B12_SYMPTOM_SELECTION',
      'AWAITING_FOLATE_SYMPTOM_SELECTION',
      'AWAITING_VITD_SYMPTOM_SELECTION',
      'AWAITING_SYMPTOM_POST_ADD_ACTION',
      'AWAITING_REMOVE_SYMPTOM',
      'AWAITING_UPDATE_ACTION_LABS',
      'AWAITING_HEALTH_DATA',
      'AWAITING_REMOVE_LAB',
      'AWAITING_UPDATE_ACTION_HABITS',
      'AWAITING_ADD_HABIT_INPUT',
      'AWAITING_REMOVE_HABIT',
      'AWAITING_HABIT_POST_ACTION',
      'AWAITING_UPDATE_ACTION_MEALS',
      'AWAITING_MEAL_ACTION',
      'AWAITING_CANDIDATE_CHOICE',
      'AWAITING_REMOVE_MEAL',
      'AWAITING_CUSTOM_MEAL_ENTRY',
      'AWAITING_OPTION_7_CHOICE',
      'AWAITING_MICRONUTRIENT_INPUT',
      'AWAITING_GENERAL_QUERY',
      'AWAITING_OTHER_INPUT',
      'AWAITING_FOLLOW_UP_OR_MENU',
      'AWAITING_REMEDY_TYPE_SELECTION',
      'AWAITING_REMEDY_VECTOR_SELECTION',
      'AWAITING_REMEDY_HEADING_SELECTION',
      'AWAITING_EXPANDED_REMEDY_ACTION',
      'AWAITING_REMEDY_RATING_INPUT',
      'AWAITING_REMEDY_MEAL_SLOT',
    ].includes(conversationState);

    const isNumericOptionChoice = ['1', '2', '3', '4', '5', '6', '7', '8'].includes(cleanedQuery);
    let activeConvState = conversationState;
    if (!isNumericOptionChoice && !isStateRequiringText) {
      setConversationState('IDLE');
      setPendingCandidate(null);
      activeConvState = 'IDLE';
    }

    // ==========================================
    // 2. MEDICAL SAFETY GUARDRAILS (STRICT REFUSAL)
    // ==========================================
    const isPrescriptionOrDosingQuery =
      /\b(prescribe|prescription|dosage|dose|how much medicine|which medicine|which drug|medication to take|tablets to take|antibiotic|cure disease)\b/i.test(
        cleanedQuery
      );

    if (isPrescriptionOrDosingQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const safetyRefusalMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ⚠️ Clinical Medical Safety Notice\n\nI am an AI Lifestyle & Nutritional Health Companion. **I cannot diagnose medical conditions, determine drug dosages, or prescribe pharmaceutical medications.**\n\n**Recommendation:**\nPlease consult a qualified physician, gynecologist, or registered healthcare practitioner for clinical diagnosis, diagnostic testing, and personalized medical prescriptions.\n\n*If you are experiencing severe dizziness, chest pain, acute shortness of breath, or sudden collapse, please seek immediate emergency medical care.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content:
              'Clinical decision-making, prescription medications, and disease diagnosis must be performed by certified medical professionals (MoHFW Guidelines).',
          },
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Management Protocols (MoHFW, GoI).',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(safetyRefusalMsg);
      return;
    }

    // ==========================================
    // 3.5 DIRECT PROFILE UPDATE TRIGGER OR VIEW PROFILE
    // ==========================================
    const isProfileUpdateTrigger =
      cleanedQuery === 'update my profile' ||
      cleanedQuery === 'update profile' ||
      cleanedQuery === 'edit profile' ||
      cleanedQuery === 'edit my profile' ||
      cleanedQuery === 'change profile' ||
      cleanedQuery === 'change my profile' ||
      cleanedQuery === 'update demographics' ||
      cleanedQuery.startsWith('update profile') ||
      cleanedQuery.startsWith('update my profile') ||
      cleanedQuery.startsWith('edit profile');

    const isViewProfileQuery =
      cleanedQuery === 'view profile' ||
      cleanedQuery === 'my profile' ||
      cleanedQuery === 'profile summary' ||
      cleanedQuery === 'show profile' ||
      cleanedQuery === 'view my profile';

    if (isViewProfileQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const nameStr = demographics.name || 'Friend';
      const ageStr = demographics.age ? `${demographics.age} years` : 'Not recorded';
      const genderStr = demographics.sex === 'female' ? 'Female' : 'Male';
      const heightStr = demographics.heightCm ? `${demographics.heightCm} cm` : 'Not recorded';
      const weightStr = demographics.weightKg ? `${demographics.weightKg} kg` : 'Not recorded';
      const bmiStr = bmi.bmi > 0 ? `${bmi.bmi} kg/m² (${bmi.category})` : 'Not calculated';
      const pregStr = demographics.isPregnant
        ? `Pregnant (Trimester ${demographics.pregnancyTrimester || 1})`
        : demographics.isLactating
        ? 'Lactating'
        : 'Non-pregnant / Non-lactating';

      const viewProfileMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 👤 Personal Profile & Demographics\n\n**Current Demographic Profile:**\n- **Name:** ${nameStr}\n- **Age:** ${ageStr}\n- **Gender / Sex:** ${genderStr}\n- **Height:** ${heightStr}\n- **Weight:** ${weightStr}\n- **BMI Status:** ${bmiStr} *(WHO Growth / Adult standard)*\n- **Pregnancy / Lactation Status:** ${pregStr}\n\n**Next Actions:**\n[1] Update Profile\n[2] Main Menu\n\n*Click an option above or reply with [1] or [2].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Active profile values calibrated with ICMR-NIN 2020 RDA tables.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(viewProfileMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 3.6 DIRECT NATURAL LANGUAGE REMOVAL INTERCEPTORS
    // ==========================================

    // A. Symptoms Natural Language Removal Interceptor
    const activeSymsList = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
    const isSymptomRemovalQuery =
      /\b(remove|delete|clear|stop|drop|dont have|don't have|no longer have)\b/i.test(cleanedQuery) &&
      (/\b(symptom|symptoms|constipation|bloating|gas|acidity|reflux|diarrhea|ibs|indigestion|fatigue|hair fall|hair loss|palpitation|palpitations|brain fog|pica|cold hands|cold feet|dizziness|breathlessness|shortness of breath|brittle nails|restless legs|nausea)\b/i.test(cleanedQuery) ||
        activeSymsList.some((s) => cleanedQuery.toLowerCase().includes(s.toLowerCase())));

    if (isSymptomRemovalQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const isClearAll = /\b(all|everything|all symptoms)\b/i.test(cleanedQuery);
      let targetToRemove: string[] = [];

      if (isClearAll) {
        targetToRemove = [...activeSymsList];
      } else {
        const found = activeSymsList.filter((s) => cleanedQuery.toLowerCase().includes(s.toLowerCase()));
        if (found.length > 0) {
          targetToRemove = found;
        } else {
          // Extract symptom phrase
          const cleanedSymptom = cleanedQuery
            .replace(/\b(remove|delete|clear|stop|drop|dont have|don't have|symptom|symptoms|from my profile|my)\b/gi, '')
            .trim();
          targetToRemove = [cleanedSymptom || query];
        }
      }

      const toolExecData = executeToolLocally('removeSymptoms', { symptoms: targetToRemove });
      const st = useHealthStore.getState();
      const remainingSyms = getAllActiveSymptomsList(st.selectedSymptoms, st.gut, st.severeSymptoms).join(', ') || 'No active symptoms logged';

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom(s) Removed Successfully!\n\nI have removed **${targetToRemove.join(', ')}** from your active profile.\n\n**Remaining Logged Symptoms:** ${remainingSyms}\n\n**Next Actions:**\n[1] View Symptoms & Signals Profile\n[2] Add New Symptom\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Updated somatic symptom registers in your personal Maguva health vector.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    // B. Labs / Blood Reports Natural Language Removal Interceptor
    const isLabRemovalQuery =
      /\b(remove|delete|clear|reset)\b/i.test(cleanedQuery) &&
      /\b(lab|labs|blood report|blood reports|ferritin|hemoglobin|haemoglobin|hb|vitamin b12|b12|vitamin d|vit d|folate|b9|mcv|tibc|serum iron)\b/i.test(cleanedQuery);

    if (isLabRemovalQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const isClearAll = /\b(all|everything|all labs|all blood reports|labs|blood reports)\b/i.test(cleanedQuery) && !/\b(ferritin|hb|hemoglobin|b12|vitamin d|folate|mcv)\b/i.test(cleanedQuery);
      let keysToClear: string[] = [];
      let labelCleared = '';

      if (isClearAll) {
        keysToClear = ['hemoglobin', 'serumFerritin', 'vitaminB12', 'vitaminD', 'folateB9', 'mcv', 'tibc', 'serumIron'];
        labelCleared = 'All Lab Biomarkers';
      } else {
        if (cleanedQuery.includes('ferritin')) {
          keysToClear.push('serumFerritin');
          labelCleared = 'Serum Ferritin';
        }
        if (cleanedQuery.includes('hb') || cleanedQuery.includes('hemoglobin') || cleanedQuery.includes('haemoglobin')) {
          keysToClear.push('hemoglobin');
          labelCleared = labelCleared ? `${labelCleared}, Hemoglobin` : 'Hemoglobin';
        }
        if (cleanedQuery.includes('b12') || cleanedQuery.includes('cobalamin')) {
          keysToClear.push('vitaminB12');
          labelCleared = labelCleared ? `${labelCleared}, Vitamin B12` : 'Vitamin B12';
        }
        if (cleanedQuery.includes('vit d') || cleanedQuery.includes('vitamin d')) {
          keysToClear.push('vitaminD');
          labelCleared = labelCleared ? `${labelCleared}, Vitamin D` : 'Vitamin D';
        }
        if (cleanedQuery.includes('folate') || cleanedQuery.includes('b9')) {
          keysToClear.push('folateB9');
          labelCleared = labelCleared ? `${labelCleared}, Folate (B9)` : 'Folate (B9)';
        }
        if (cleanedQuery.includes('mcv')) {
          keysToClear.push('mcv');
          labelCleared = labelCleared ? `${labelCleared}, MCV` : 'MCV';
        }
        if (keysToClear.length === 0) {
          keysToClear = [cleanedQuery];
          labelCleared = query;
        }
      }

      const toolExecData = executeToolLocally('clearLabs', { keys: keysToClear });

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Lab Biomarker Cleared Successfully!\n\nI have cleared recorded value(s) for **${labelCleared}** from your active profile. Your deficiency risk indicators have been recalibrated.\n\n**Next Actions:**\n[1] View Blood Reports / Labs\n[2] Enter New Lab Value\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Laboratory biomarkers stored in your personal Maguva health vector.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    // C. Daily Habits Natural Language Removal Interceptor
    const isHabitRemovalQuery =
      /\b(remove|delete|stop|cancel|clear)\b/i.test(cleanedQuery) &&
      (/\b(habit|habits|amla|lemon water|warm lemon|chai buffer|tea buffer|cast iron|jeera|curd|seed cycling)\b/i.test(cleanedQuery) ||
        (dailyHabits || []).some((h) => cleanedQuery.toLowerCase().includes(h.title.toLowerCase())));

    if (isHabitRemovalQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const isClearAll = /\b(all habits|all|everything)\b/i.test(cleanedQuery);
      let targetTitles: string[] = [];

      if (isClearAll) {
        // clear all
      } else {
        const found = (dailyHabits || []).filter((h) => cleanedQuery.toLowerCase().includes(h.title.toLowerCase()));
        if (found.length > 0) {
          targetTitles = found.map((h) => h.title);
        } else {
          const cleanedTitle = cleanedQuery
            .replace(/\b(remove|delete|stop|cancel|clear|habit|habits|from my habits|my)\b/gi, '')
            .trim();
          targetTitles = [cleanedTitle || query];
        }
      }

      const toolExecData = executeToolLocally('removeHabit', isClearAll ? { clearAll: true } : { titles: targetTitles });
      const remainingCount = useHealthStore.getState().dailyHabits?.length || 0;

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Habit(s) Removed Successfully!\n\nI have ${isClearAll ? 'cleared all habits' : `removed **${targetTitles.join(', ')}**`} from your daily checklist.\n\n**Remaining Active Habits:** ${remainingCount} active habits\n\n**Next Actions:**\n[1] Goto Dashboard\n[2] Add Daily Habit\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3] or "Goto Dashboard".*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Daily habits checklist in your active personal profile.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_HABIT_POST_ACTION');
      return;
    }

    // D. Meals Natural Language Removal Interceptor
    const isMealRemovalQuery =
      /\b(remove|delete|clear)\b/i.test(cleanedQuery) &&
      (/\b(meal|meals|food|breakfast|lunch|dinner|snack|snacks|dish)\b/i.test(cleanedQuery) ||
        (meals || []).some((m) => cleanedQuery.toLowerCase().includes(m.name.toLowerCase())));

    if (isMealRemovalQuery) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const isClearAll = /\b(all meals|all food|everything)\b/i.test(cleanedQuery);
      let targetNamesOrIds: string[] = [];

      if (isClearAll) {
        // clear all
      } else {
        const found = (meals || []).filter(
          (m) =>
            cleanedQuery.toLowerCase().includes(m.name.toLowerCase()) ||
            cleanedQuery.toLowerCase().includes(m.mealType.toLowerCase())
        );
        if (found.length > 0) {
          targetNamesOrIds = found.map((m) => m.id);
        } else {
          const cleanedName = cleanedQuery
            .replace(/\b(remove|delete|clear|meal|meals|from food log|from lunch|from breakfast|from dinner|from snacks|my)\b/gi, '')
            .trim();
          targetNamesOrIds = [cleanedName || query];
        }
      }

      const toolExecData = executeToolLocally('removeMeal', isClearAll ? { clearAll: true } : { namesOrIds: targetNamesOrIds });
      const updatedMeals = useHealthStore.getState().meals || [];
      const totalIron = updatedMeals.reduce((acc, m) => acc + (m.ironMg || 0), 0);
      const totalCalories = updatedMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Meal Removed from Journal!\n\nI have ${isClearAll ? 'cleared all meals for today' : `deleted the matching meal(s)`} from your food journal.\n\n**Updated Daily Totals:**\n- **Total Iron:** ${totalIron.toFixed(1)} mg\n- **Total Calories:** ${Math.round(totalCalories)} kcal\n\n**Next Actions:**\n[1] View Meal Journal\n[2] Log a Meal\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Daily food journal records and aggregated nutrient totals.',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 3.7 INTERACTIVE UPDATE SUB-MENU TRIGGERS
    // ==========================================
    const isAddSymptomsTrigger =
      cleanedQuery === 'add symptoms' ||
      cleanedQuery === 'add symptom' ||
      cleanedQuery === 'log symptoms' ||
      cleanedQuery === 'log symptom' ||
      cleanedQuery === 'add new symptom' ||
      cleanedQuery === 'log new symptom' ||
      cleanedQuery === 'i want to add symptoms' ||
      cleanedQuery === 'i want to add a symptom' ||
      cleanedQuery === 'add gut symptoms' ||
      cleanedQuery === 'add period symptoms' ||
      cleanedQuery === 'add deficiency symptoms' ||
      cleanedQuery.startsWith('add symptom') ||
      cleanedQuery.startsWith('log symptom') ||
      cleanedQuery.startsWith('add new symptom') ||
      cleanedQuery.startsWith('i want to add symptom');

    if (isAddSymptomsTrigger) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const promptAddMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: ADD_SYMPTOMS_FULL_PROMPT,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Somatic Deficiency Manifestation Guidelines.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(promptAddMsg);
      setConversationState('AWAITING_SYMPTOM_SELECTION');
      return;
    }

    const isSymptomsUpdateTrigger =
      cleanedQuery === 'update symptoms' ||
      cleanedQuery === 'manage symptoms' ||
      cleanedQuery === 'edit symptoms' ||
      cleanedQuery === 'change symptoms' ||
      cleanedQuery === 'update my symptoms' ||
      cleanedQuery === 'edit my symptoms' ||
      cleanedQuery === 'add/remove symptom' ||
      cleanedQuery === 'add / remove symptom' ||
      cleanedQuery === 'add remove symptom' ||
      cleanedQuery === 'add/remove symptoms' ||
      cleanedQuery === 'add / remove symptoms' ||
      cleanedQuery.startsWith('update symptom') ||
      cleanedQuery.startsWith('edit symptom') ||
      cleanedQuery.startsWith('manage symptom');

    if (isSymptomsUpdateTrigger) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const promptAddMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: ADD_SYMPTOMS_FULL_PROMPT,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Somatic Deficiency Manifestation Guidelines.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(promptAddMsg);
      setConversationState('AWAITING_SYMPTOM_SELECTION');
      return;
    }

    const isLabsUpdateTrigger =
      cleanedQuery === 'update labs' ||
      cleanedQuery === 'update blood reports' ||
      cleanedQuery === 'manage labs' ||
      cleanedQuery === 'edit labs' ||
      cleanedQuery === 'edit blood reports' ||
      cleanedQuery === 'change labs' ||
      cleanedQuery === 'update my blood reports' ||
      cleanedQuery === 'update my blood report' ||
      cleanedQuery === 'update my labs' ||
      cleanedQuery === 'manage blood reports' ||
      cleanedQuery.startsWith('update lab') ||
      cleanedQuery.startsWith('edit lab') ||
      cleanedQuery.startsWith('update blood report');

    if (isLabsUpdateTrigger) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const labsMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🔬 Manage & Update Blood Reports / Labs\n\nHow would you like to update your laboratory biomarkers?\n\n**[1] Add / Modify Lab Biomarkers** (Hemoglobin, Serum Ferritin, B12, Vitamin D, MCV)\n**[2] Remove / Clear Recorded Lab Values**\n**[3] View Current Lab Summary**\n\n*Reply with a number [1–3] or choose an option above.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Indian Nutrient & Biomarker Reference Ranges.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(labsMenuMsg);
      setConversationState('AWAITING_UPDATE_ACTION_LABS');
      return;
    }

    const isHabitsUpdateTrigger =
      cleanedQuery === '8' ||
      cleanedQuery === '[8]' ||
      cleanedQuery === 'option 8' ||
      cleanedQuery === 'daily habits' ||
      cleanedQuery === 'daily habits (view / add / remove)' ||
      cleanedQuery === 'update habits' ||
      cleanedQuery === 'update daily habits' ||
      cleanedQuery === 'manage habits' ||
      cleanedQuery === 'edit habits' ||
      cleanedQuery === 'manage daily habits' ||
      cleanedQuery === 'edit daily habits' ||
      cleanedQuery === 'change habits' ||
      cleanedQuery === 'update my habits' ||
      cleanedQuery.startsWith('update habit') ||
      cleanedQuery.startsWith('edit habit') ||
      cleanedQuery.startsWith('manage habit');

    if (isHabitsUpdateTrigger) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const habitMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🌿 Manage & Update Daily Habits & AYUSH Protocols\n\nHow would you like to manage your daily wellness checklist?\n\n**[1] Add Daily Habit / AYUSH Remedy** (Warm Lemon Amla water, 2-hour chai buffer, cast iron cookware)\n**[2] Remove / Clear Daily Habit**\n**[3] View Active Habits Checklist**\n\n*Reply with a number [1–3] or choose an option above.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Ministry of AYUSH & Anemia Mukt Bharat dietary synergy protocols.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(habitMenuMsg);
      setConversationState('AWAITING_UPDATE_ACTION_HABITS');
      return;
    }

    const isMealsUpdateTrigger =
      cleanedQuery === 'update meals' ||
      cleanedQuery === 'manage meals' ||
      cleanedQuery === 'edit meals' ||
      cleanedQuery === 'update food journal' ||
      cleanedQuery === 'edit food log' ||
      cleanedQuery === 'manage food journal' ||
      cleanedQuery === 'change meals' ||
      cleanedQuery === 'update my meals' ||
      cleanedQuery.startsWith('update meal') ||
      cleanedQuery.startsWith('edit meal') ||
      cleanedQuery.startsWith('manage meal');

    if (isMealsUpdateTrigger) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const mealMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🥗 Manage & Update Meals & Food Journal\n\nHow would you like to update your food log?\n\n**[1] Search & Log an Indian Dish** (IFCT verified database)\n**[2] Remove / Delete a Logged Meal**\n**[3] Enter Custom Meal Nutrients**\n**[4] View Today's Logged Meals & Daily Totals**\n\n*Reply with a number [1–4] or choose an option above.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT) verified nutrient database.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(mealMenuMsg);
      setConversationState('AWAITING_UPDATE_ACTION_MEALS');
      return;
    }

    // ==========================================
    // 4. PRIMARY MENU & DIRECT ACTIONS (When in IDLE state)
    // ==========================================
    const isChoice1 =
      cleanedQuery === '1' ||
      cleanedQuery === '[1]' ||
      cleanedQuery === 'profile' ||
      cleanedQuery === 'demographics' ||
      cleanedQuery.startsWith('profile') ||
      cleanedQuery.startsWith('demographic');
    const isChoice2 =
      cleanedQuery === '2' ||
      cleanedQuery === '[2]' ||
      cleanedQuery === 'symptoms' ||
      cleanedQuery === 'signals' ||
      cleanedQuery.startsWith('symptom');
    const isChoice3 =
      cleanedQuery === '3' ||
      cleanedQuery === '[3]' ||
      cleanedQuery === 'labs' ||
      cleanedQuery === 'blood reports' ||
      cleanedQuery.startsWith('blood report') ||
      cleanedQuery.startsWith('lab report');
    const isChoice4 =
      cleanedQuery === '4' ||
      cleanedQuery === '[4]' ||
      cleanedQuery === 'meals' ||
      cleanedQuery === 'food journal' ||
      cleanedQuery.startsWith('meal') ||
      cleanedQuery.startsWith('food journal');
    const isChoice5 =
      cleanedQuery === '5' ||
      cleanedQuery === '[5]' ||
      cleanedQuery === 'ayush' ||
      cleanedQuery === 'remedies' ||
      cleanedQuery.startsWith('ayush') ||
      cleanedQuery.startsWith('remedy') ||
      cleanedQuery.startsWith('traditional');
    const isChoice6 =
      cleanedQuery === '6' ||
      cleanedQuery === '[6]' ||
      cleanedQuery === 'risks' ||
      cleanedQuery === 'deficiency risks' ||
      cleanedQuery.startsWith('deficiency risk') ||
      cleanedQuery.startsWith('risk');
    const isChoice7 =
      cleanedQuery === '7' ||
      cleanedQuery === '[7]' ||
      cleanedQuery === 'other' ||
      cleanedQuery === 'others' ||
      cleanedQuery.startsWith('other');
    const isChoice8 =
      cleanedQuery === '8' ||
      cleanedQuery === '[8]' ||
      cleanedQuery === 'habits' ||
      cleanedQuery === 'daily habits' ||
      cleanedQuery.startsWith('daily habit') ||
      cleanedQuery.startsWith('habit');

    if (
      activeConvState === 'IDLE' &&
      (isNumericOptionChoice ||
        isChoice1 ||
        isProfileUpdateTrigger ||
        isChoice2 ||
        isChoice3 ||
        isChoice4 ||
        isChoice5 ||
        isChoice6 ||
        isChoice7 ||
        isChoice8)
    ) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (isChoice1 || isProfileUpdateTrigger) {
        // [1] Profile & Demographics -> Set state to AWAITING_PROFILE_UPDATE
        const nameStr = demographics.name || 'Friend';
        const ageStr = demographics.age ? `${demographics.age} years` : 'Not recorded';
        const genderStr = demographics.sex === 'female' ? 'Female' : 'Male';
        const heightStr = demographics.heightCm ? `${demographics.heightCm} cm` : 'Not recorded';
        const weightStr = demographics.weightKg ? `${demographics.weightKg} kg` : 'Not recorded';
        const bmiStr = bmi.bmi > 0 ? `${bmi.bmi} kg/m² (${bmi.category})` : 'Not calculated';
        const pregStr = demographics.isPregnant
          ? `Pregnant (Trimester ${demographics.pregnancyTrimester || 1})`
          : demographics.isLactating
          ? 'Lactating'
          : 'Non-pregnant / Non-lactating';

        const profileMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 👤 Personal Profile & Demographics\n\n**Current Demographic Profile:**\n**[1] Name:** ${nameStr}\n**[2] Age:** ${ageStr}\n**[3] Gender / Sex:** ${genderStr}\n**[4] Height:** ${heightStr}\n**[5] Weight:** ${weightStr}\n**[6] Pregnancy / Lactation Status:** ${pregStr}\n\n**BMI Status:** ${bmiStr} *(WHO Growth / Adult standard)*\n\n**How to Update:**\nPlease reply with a number **[1–6]** to update that parameter, or select:\n**[7] Go Back to Main Menu**`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Synchronized demographic indicators used for basal metabolic and RDA calculations.',
            },
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Recommended Dietary Allowances (RDA) reference standards.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(profileMsg);
        setConversationState('AWAITING_PROFILE_UPDATE');
        return;
      }

      if (isChoice2) {
        // [2] Symptoms & Signals Sub-Menu
        const symMenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🩺 Manage & Update Symptoms\n\nHow would you like to update your symptoms profile?\n\n**[1] Add / Log a Symptom** (Fatigue, Hair Fall, Palpitations, Brain Fog, Pica, Acidity)\n**[2] Remove / Clear Logged Symptoms**\n**[3] View Current Symptoms Profile**\n\n*Reply with a number [1–3] or choose an option above.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Anemia Mukt Bharat Somatic Deficiency Manifestation Guidelines.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(symMenuMsg);
        setConversationState('AWAITING_UPDATE_ACTION_SYMPTOMS');
        return;
      }

      if (isChoice3) {
        // [3] Labs summary
        const hbStr = labs?.hemoglobin ? `${labs.hemoglobin} g/dL` : 'Not recorded';
        const ferritinStr = labs?.serumFerritin ? `${labs.serumFerritin} ng/mL` : 'Not recorded';
        const b12Str = labs?.vitaminB12 ? `${labs.vitaminB12} pg/mL` : 'Not recorded';
        const vitDStr = labs?.vitaminD ? `${labs.vitaminD} ng/mL` : 'Not recorded';
        const folateStr = labs?.folateB9 ? `${labs.folateB9} ng/mL` : 'Not recorded';
        const mcvStr = labs?.mcv ? `${labs.mcv} fL` : 'Not recorded';

        const labsMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🔬 Blood Reports & Clinical Lab Summary\n\nHere are your current laboratory biomarkers recorded in Maguva:\n\n- **Hemoglobin (Hb):** ${hbStr} *(Optimal: 12.0 – 15.5 g/dL)*\n- **Serum Ferritin:** ${ferritinStr} *(Optimal: 15 – 150 ng/mL)*\n- **Vitamin B12:** ${b12Str} *(Optimal: 200 – 900 pg/mL)*\n- **Vitamin D (25-OH):** ${vitDStr} *(Optimal: 30 – 100 ng/mL)*\n- **Folate (B9):** ${folateStr} *(Optimal: 4.0 – 20.0 ng/mL)*\n- **MCV:** ${mcvStr} *(Optimal: 80 – 100 fL)*\n\n*To update your lab values, say **"update my blood reports"** or switch to the **Health Vector** tab.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Clinical laboratory biomarkers stored in your personal Maguva health vector.',
            },
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Nutrient & Biomarker Reference Ranges.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(labsMsg);
        return;
      }

      if (isChoice4) {
        // [4] Meals & Food Journal Sub-Menu
        const mealMenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🥗 Meals & Food Journal\n\nHow would you like to interact with your food journal?\n\n**[1] Search & Log an Indian Dish** (Search verified IFCT database: e.g., Ragi Dosa, Palak Paneer, Poha, Dal)\n**[2] Enter Custom Meal Nutrients** (Specify custom Iron, B12, Vitamin C, and Calorie values)\n**[3] View Today's Logged Meals & Daily Totals**\n\n*Reply with a number [1–3] or type any food name directly (e.g. "log 1 bowl dal").*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT) verified nutrient database.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(mealMenuMsg);
        setConversationState('AWAITING_MEAL_ACTION');
        return;
      }

      if (isChoice5) {
        // [5] AYUSH Remedies & Traditional Health Level 1 Sub-Menu
        const remedyTypeMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌿 AYUSH & Traditional Health Remedies\n\nPlease choose the type of remedies you would like to explore:\n\n**[1] AYUSH & Traditional Remedies** (Ayurveda, Siddha, Unani verified protocols)\n**[2] Others** (Lifestyle, functional nutrition & modern dietary remedies)\n\n*Reply with [1] or [2], or choose an option above.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Ministry of AYUSH & Anemia Mukt Bharat traditional health and clinical synergy framework.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(remedyTypeMsg);
        setConversationState('AWAITING_REMEDY_TYPE_SELECTION');
        return;
      }

      if (isChoice6) {
        // [6] Deficiency Risks & Health Guidance
        const topRisks = risks.filter((r) => r.riskTier === 'High' || r.riskTier === 'Moderate');
        const riskSummary =
          topRisks.length > 0
            ? topRisks.map((r) => `- **${r.name}:** ${r.riskTier} Risk (${r.biomarkerSummary || r.confidenceNote})`).join('\n')
            : '- **Status:** All core micronutrient risk scores are within Low/Optimal boundaries!';

        const risksMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🛡️ Micronutrient Deficiency Risk & Clinical Guidance\n\n**Current Evaluated Risks:**\n${riskSummary}\n\n**Primary Clinical Mechanisms for Iron & B12 Depletion:**\n- **Tannin Chelation:** Polyphenols in tea/coffee bind dietary ferric iron into insoluble complexes.\n- **Low Gastric Acidity:** Impaired duodenal pH prevents reduction of Fe³⁺ into absorbable ferrous Fe²⁺.\n- **Storage Depletion:** Latent deficiency can occur with depleted Serum Ferritin (<15 ng/mL) before Hemoglobin drops.\n\n*To view comprehensive risk dials and mitigation vectors, visit the **Health Vector** tab.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Anemia Mukt Bharat Clinical Scoring & ICMR-NIN 2020 RDA tables.',
            },
            {
              category: 'WHO & International Health Guidance',
              content: 'WHO Global Anemia Vector & Micronutrient Deficiency Assessment Tools.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(risksMsg);
        return;
      }

      if (isChoice7) {
        // [7] Option 7 flow: Give two options:
        // a) micronutrient rich foods (eg., iron rich foods)
        // b) other general question
        const option7Msg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 💡 Option 7: Select Guidance Mode

Please select an option below:

[a] Micronutrient rich foods (e.g., iron rich foods)
[b] Other general question

*Click an option above or reply with [a] or [b].*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: '1. Indian Government Portals',
              content: 'ICMR-NIN 2020 Guidelines (https://www.icmr.nic.in) & Ministry of AYUSH (https://main.ayush.gov.in)',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(option7Msg);
        setConversationState('AWAITING_OPTION_7_CHOICE');
        return;
      }

      if (isChoice8) {
        // [8] Daily Habits Entry
        const activeHabits = dailyHabits || [];
        const habitListText =
          activeHabits.length > 0
            ? activeHabits.map((h, i) => `${i + 1}. **${h.title}** (${h.timing || 'Daily'})`).join('\n')
            : '*You currently have no active daily habits logged in your checklist.*';

        const habitMenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🌿 Daily Habits & Lifestyle Routines\n\n**Currently Logged Habits:**\n${habitListText}\n\n---\n**How would you like to manage your habits?**\n\n**[a] Add habits**\n**[b] Remove habits**\n**[m] Main Menu**\n\n*Reply with [a] to add a habit, [b] to remove a habit, or [m] for Main Menu.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Ministry of AYUSH & Anemia Mukt Bharat daily wellness protocols.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(habitMenuMsg);
        setConversationState('AWAITING_UPDATE_ACTION_HABITS');
        return;
      }
    }

    // ==========================================
    // 5. SUB-MENU ROUTING: SYMPTOMS (AWAITING_SYMPTOM_SELECTION)
    // ==========================================
    if (activeConvState === 'AWAITING_SYMPTOM_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // 1. Direct sub-menu numeric routing
      if (cleanedQuery === '10' || cleanedQuery.includes('iron') || cleanedQuery.includes('ferritin')) {
        const submenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: IRON_SYMPTOMS_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(submenuMsg);
        setConversationState('AWAITING_IRON_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '11' || cleanedQuery.includes('b12') || cleanedQuery.includes('cobalamin')) {
        const submenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: B12_SYMPTOMS_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(submenuMsg);
        setConversationState('AWAITING_B12_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '12' || cleanedQuery.includes('folate') || cleanedQuery.includes('b9')) {
        const submenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: FOLATE_SYMPTOMS_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(submenuMsg);
        setConversationState('AWAITING_FOLATE_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '13' || cleanedQuery.includes('vitd') || cleanedQuery.includes('d3') || cleanedQuery.includes('vitamin d')) {
        const submenuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: VITD_SYMPTOMS_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(submenuMsg);
        setConversationState('AWAITING_VITD_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '14' || (cleanedQuery.includes('view') && cleanedQuery.includes('logged'))) {
        const activeSymsList = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
        const activeSyms = activeSymsList.length > 0 ? activeSymsList.join(', ') : 'None currently logged.';
        const viewReplyMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 📋 Your Currently Logged Symptoms Profile\n\n**Active Symptoms in Profile:**\n${activeSyms}\n\n**Next Actions:**\n[1] Add Symptoms\n[2] Remove / Clear Symptoms\n[3] Main Menu`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        addChatMessage(userMsg);
        addChatMessage(viewReplyMsg);
        setConversationState('AWAITING_UPDATE_ACTION_SYMPTOMS');
        return;
      }

      if (cleanedQuery === '15' || cleanedQuery.includes('back') || cleanedQuery.includes('menu')) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      // Check numeric options 1-9
      let matchedChoice = null;
      const numVal = parseInt(cleanedQuery);
      if (numVal >= 1 && numVal <= 9) {
        matchedChoice = SYMPTOM_CHOICES_MAP[cleanedQuery];
      }

      // If no matchedChoice and user entered text, check text matching across 1-9 first, then general text
      if (!matchedChoice) {
        const lowerQ = cleanedQuery.toLowerCase();
        // check only keys '1' to '9' for exact text mapping in main menu to avoid conflicting with submenus
        const foundKey = Object.keys(SYMPTOM_CHOICES_MAP).find((k) => {
          const keyInt = parseInt(k);
          if (isNaN(keyInt) || keyInt < 1 || keyInt > 9) return false;
          const item = SYMPTOM_CHOICES_MAP[k];
          return (
            item.name.toLowerCase().includes(lowerQ) ||
            item.symptomsToAppend.some((s) => lowerQ.includes(s.toLowerCase()) || s.toLowerCase().includes(lowerQ))
          );
        });

        if (foundKey) {
          matchedChoice = SYMPTOM_CHOICES_MAP[foundKey];
        }
      }

      if (!matchedChoice) {
        const lowerQ = cleanedQuery.toLowerCase();
        // check for iron fatigue
        if (lowerQ.includes('fatigue') || lowerQ.includes('tired')) {
          matchedChoice = {
            name: 'Fatigue & Low Stamina',
            symptomsToAppend: ['iron_fatigue'],
            clinicalDetail: '### ⚡ Fatigue & Low Stamina Logged\n\n**Clinical Mechanism:**\nDepleted circulating hemoglobin impairs tissue oxygenation, reducing mitochondrial ATP energy production.\n\n**Key Actions:**\n- Pair dietary iron with Vitamin C (Amla, lemon juice).\n- Check Serum Ferritin levels to evaluate storage reserves.'
          };
        } else if (lowerQ.includes('dizziness') || lowerQ.includes('lightheaded')) {
          matchedChoice = {
            name: 'Dizziness or Lightheadedness',
            symptomsToAppend: ['iron_dizziness'],
            clinicalDetail: '### 💓 Dizziness & Breathlessness Logged\n\n**Clinical Mechanism:**\nDiminished blood oxygen-carrying capacity triggers compensatory respiratory hyperventilation and postural micro-hypoxia.\n\n**Key Actions:**\n- Avoid sudden postural shifts.\n- Check complete blood count (CBC) and Hemoglobin.'
          };
        } else if (lowerQ.includes('cold hands') || lowerQ.includes('cold feet') || lowerQ.includes('cold extremities')) {
          matchedChoice = {
            name: 'Cold Hands & Feet',
            symptomsToAppend: ['iron_cold_hands'],
            clinicalDetail: '### ❄️ Cold Hands/Feet & Pica Logged\n\n**Clinical Mechanism:**\nPeripheral vasoconstriction shunts limited oxygenated blood to core organs, while pagophagia (ice chewing craving) is a classic neurobiological sign of advanced iron depletion.\n\n**Key Actions:**\n- Test serum ferritin levels.\n- Keep extremities warm and avoid ice chewing.'
          };
        } else if (lowerQ.includes('pale skin') || lowerQ.includes('pallor') || lowerQ.includes('pale face')) {
          matchedChoice = {
            name: 'Pale Skin (Pallor)',
            symptomsToAppend: ['iron_pale_skin'],
            clinicalDetail: '### 💇 Pale Skin (Pallor) Logged\n\n**Clinical Mechanism:**\nReduced red blood cell count and diminished circulating oxyhemoglobin in skin capillaries results in a loss of healthy color.\n\n**Key Actions:**\n- Increase intake of non-heme iron (Moringa, Halim seeds).\n- Pair with Vitamin C for enhancement.'
          };
        } else if (lowerQ.includes('tingling') || lowerQ.includes('pins and needles') || lowerQ.includes('pins & needles') || lowerQ.includes('numbness')) {
          matchedChoice = {
            name: 'Tingling (Pins & Needles)',
            symptomsToAppend: ['b12_tingling'],
            clinicalDetail: '### ⚡ Tingling / Pins & Needles Logged\n\n**Clinical Mechanism:**\nVitamin B12 is essential for myelin sheath integrity; deficiency causes peripheral paresthesia and nerve conduction delay.\n\n**Key Actions:**\n- Check serum Vitamin B12 levels.\n- Include dairy, fortified foods, or B12 supplements if vegetarian.'
          };
        } else if (lowerQ.includes('brain fog') || lowerQ.includes('memory') || lowerQ.includes('forget') || lowerQ.includes('mental fatigue')) {
          matchedChoice = {
            name: 'Brain Fog & Memory Slowdown',
            symptomsToAppend: ['b12_confusion_memory'],
            clinicalDetail: '### 🧠 Brain Fog & Memory Slowdown Logged\n\n**Clinical Mechanism:**\nIron and Vitamin B12 are crucial cofactors for neurotransmitter synthesis (dopamine, serotonin) and cerebral oxygenation.\n\n**Key Actions:**\n- Ensure bioavailable Vitamin B12 and Folate intake.\n- Maintain consistent sleep schedule.'
          };
        } else if (lowerQ.includes('mouth ulcer') || lowerQ.includes('mouth sores') || lowerQ.includes('sore tongue') || lowerQ.includes('tongue pain')) {
          matchedChoice = {
            name: 'Mouth Ulcers & Sore Red Tongue',
            symptomsToAppend: ['folate_oral_sores'],
            clinicalDetail: '### 👄 Mouth Ulcers & Sore Tongue Logged\n\n**Clinical Mechanism:**\nRapid turnover of oral mucosal epithelial cells makes them highly vulnerable to Folate (B9) and B12 coenzyme depletion, causing glossitis and aphthous stomatitis.\n\n**Key Actions:**\n- Include folate-rich lentils, green leafy vegetables, and sprouts.\n- Avoid excessively spicy or acidic foods until oral lining heals.'
          };
        } else if (lowerQ.includes('bone pain') || lowerQ.includes('back pain') || lowerQ.includes('lower back') || lowerQ.includes('joint pain')) {
          matchedChoice = {
            name: 'Bone Pain & Lower Back Pain',
            symptomsToAppend: ['vitd_bone_back_pain'],
            clinicalDetail: '### 🦴 Bone & Lower Back Pain Logged\n\n**Clinical Mechanism:**\nVitamin D3 deficiency impairs intestinal calcium absorption, leading to secondary hyperparathyroidism and bone matrix demineralization.\n\n**Key Actions:**\n- Check 25-OH Vitamin D levels.\n- Get safe morning sunlight exposure and include Vitamin D fortified foods or supplements.'
          };
        } else if (lowerQ.includes('cramps') || lowerQ.includes('muscle weakness') || lowerQ.includes('muscle spasm')) {
          matchedChoice = {
            name: 'Muscle Weakness & Cramps',
            symptomsToAppend: ['vitd_muscle_weakness_cramps'],
            clinicalDetail: '### 🦾 Muscle Cramps & Slow Wound Healing Logged\n\n**Clinical Mechanism:**\nAltered calcium-magnesium cellular flux causes fast-twitch muscle cramps, while Vitamin D depletion delays tissue re-epithelialization.\n\n**Key Actions:**\n- Hydrate adequately and maintain mineral balance.\n- Check Vitamin D3 levels.'
          };
        } else if (lowerQ.includes('hair fall') || lowerQ.includes('hair loss') || lowerQ.includes('brittle nails') || lowerQ.includes('nails breaking')) {
          matchedChoice = {
            name: 'Hair Fall & Brittle Nails',
            symptomsToAppend: ['vitd_hair_loss'],
            clinicalDetail: '### 💇 Hair Loss (Telogen Effluvium) Logged\n\n**Clinical Mechanism:**\nVitamin D receptors in keratinocytes regulate normal hair follicle cycling and support active anagen phase maintenance.\n\n**Key Actions:**\n- Focus on balanced micronutrient status (Iron + Vitamin D).\n- Avoid stressful physical pulling of hair during active shedding.'
          };
        }
      }

      let symptomsToAppend: string[] = [];
      let clinicalDetail = '';
      let gutUpdate: Partial<import('../types').GutHealth> | undefined;
      let menstrualUpdate: Partial<import('../types').MenstrualHealth> | undefined;

      if (matchedChoice) {
        symptomsToAppend = matchedChoice.symptomsToAppend;
        clinicalDetail = matchedChoice.clinicalDetail;
        gutUpdate = matchedChoice.gutUpdate;
        menstrualUpdate = matchedChoice.menstrualUpdate;
      } else {
        // Custom symptom typed by user
        const cleanedName = query
          .replace(/\b(add|log|i have|symptom|symptoms|please|my)\b/gi, '')
          .trim() || query.trim();
        symptomsToAppend = [cleanedName];
        clinicalDetail = `### 🩺 ${cleanedName} Logged\n\n**Clinical Profile Update:**\nRecorded "${cleanedName}" in your health profile vector. Maguva will factor this signal into your personalized micronutrient RDA targets and deficiency risk assessments.`;
      }

      // Execute store updates
      const storeState = useHealthStore.getState();
      storeState.appendUserSymptoms(symptomsToAppend);
      if (gutUpdate) storeState.updateGut(gutUpdate);
      if (menstrualUpdate) storeState.updateMenstrual(menstrualUpdate);

      // Retrieve updated active list
      const updatedState = useHealthStore.getState();
      const activeList = getAllActiveSymptomsList(
        updatedState.selectedSymptoms,
        updatedState.gut,
        updatedState.severeSymptoms
      );
      const symListStr = activeList.length > 0 ? activeList.join(', ') : 'None currently logged';

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom Logged Successfully!\n\n**Added to Profile:** ${symptomsToAppend.join(', ')}\n\n${clinicalDetail}\n\n---\n📋 **Current Active Logged Symptoms (${activeList.length}):** ${symListStr}\n\n**Next Actions:**\n[1] Add Another Symptom\n[2] View Current Symptoms Profile\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Guidelines on Anemia Symptomatology and Assessment.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_SYMPTOM_POST_ADD_ACTION');
      return;
    }

    // ==========================================
    // 5a. SUB-MENU: IRON SYMPTOMS SELECTION
    // ==========================================
    if (activeConvState === 'AWAITING_IRON_SYMPTOM_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '6' || cleanedQuery.includes('back') || cleanedQuery.includes('category') || cleanedQuery.includes('categories')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '7' || cleanedQuery.includes('menu') || cleanedQuery.includes('home')) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      let symptomsToAppend: string[] = [];
      let clinicalDetail = '';

      if (cleanedQuery === '1' || cleanedQuery.includes('fatigue') || cleanedQuery.includes('stamina') || cleanedQuery.includes('tired')) {
        symptomsToAppend = ['iron_fatigue'];
        clinicalDetail = '### ⚡ Fatigue & Low Stamina Logged\n\n**Clinical Mechanism:**\nDepleted circulating hemoglobin impairs tissue oxygenation, reducing mitochondrial ATP energy production.\n\n**Key Actions:**\n- Pair dietary iron with Vitamin C (Amla, lemon juice).\n- Check Serum Ferritin levels to evaluate storage reserves.';
      } else if (cleanedQuery === '2' || cleanedQuery.includes('dizziness') || cleanedQuery.includes('lightheaded')) {
        symptomsToAppend = ['iron_dizziness'];
        clinicalDetail = '### 💓 Dizziness & Breathlessness Logged\n\n**Clinical Mechanism:**\nDiminished blood oxygen-carrying capacity triggers compensatory respiratory hyperventilation and postural micro-hypoxia.\n\n**Key Actions:**\n- Avoid sudden postural shifts.\n- Check complete blood count (CBC) and Hemoglobin.';
      } else if (cleanedQuery === '3' || cleanedQuery.includes('cold') || cleanedQuery.includes('pica')) {
        symptomsToAppend = ['iron_cold_hands'];
        clinicalDetail = '### ❄️ Cold Hands/Feet & Pica Logged\n\n**Clinical Mechanism:**\nPeripheral vasoconstriction shunts limited oxygenated blood to core organs, while pagophagia (ice chewing craving) is a classic neurobiological sign of advanced iron depletion.\n\n**Key Actions:**\n- Test serum ferritin levels.\n- Keep extremities warm and avoid ice chewing.';
      } else if (cleanedQuery === '4' || cleanedQuery.includes('pale') || cleanedQuery.includes('pallor')) {
        symptomsToAppend = ['iron_pale_skin'];
        clinicalDetail = '### 💇 Pale Skin (Pallor) Logged\n\n**Clinical Mechanism:**\nReduced red blood cell count and diminished circulating oxyhemoglobin in skin capillaries results in a loss of healthy color.\n\n**Key Actions:**\n- Increase intake of non-heme iron (Moringa, Halim seeds).\n- Pair with Vitamin C for enhancement.';
      } else if (cleanedQuery === '5' || cleanedQuery.includes('breathless') || cleanedQuery.includes('exertion') || cleanedQuery.includes('shortness of breath')) {
        symptomsToAppend = ['iron_breathlessness'];
        clinicalDetail = '### 🩺 Shortness of Breath on Exertion Logged\n\n**Clinical Mechanism:**\nLungs hyperventilate to compensate for reduced hemoglobin oxygen-carrying capacity under physical workload.\n\n**Key Actions:**\n- Avoid over-exertion during acute episodes.\n- Monitor active Hemoglobin levels.';
      } else {
        symptomsToAppend = [query.trim()];
        clinicalDetail = `### 🩺 Custom Iron-Related Symptom Logged\n\n**Symptom:** "${query.trim()}" has been recorded under your Iron & Demographics vector.`;
      }

      const storeState = useHealthStore.getState();
      storeState.appendUserSymptoms(symptomsToAppend);

      const activeList = getAllActiveSymptomsList(
        storeState.selectedSymptoms,
        storeState.gut,
        storeState.severeSymptoms
      );
      const symListStr = activeList.length > 0 ? activeList.join(', ') : 'None currently logged';

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom Logged Successfully!\n\n**Added to Profile:** ${symptomsToAppend.map(s => s === 'iron_fatigue' ? 'Fatigue & Low Stamina' : s === 'iron_dizziness' ? 'Dizziness / Lightheadedness' : s === 'iron_cold_hands' ? 'Cold Hands & Feet' : s === 'iron_pale_skin' ? 'Pale Skin (Pallor)' : s === 'iron_breathlessness' ? 'Shortness of Breath on Exertion' : s).join(', ')}\n\n${clinicalDetail}\n\n---\n📋 **Current Active Logged Symptoms (${activeList.length}):** ${symListStr}\n\n**Next Actions:**\n[1] Add Another Symptom\n[2] View Current Symptoms Profile\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Guidelines on Anemia Symptomatology and Assessment.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_SYMPTOM_POST_ADD_ACTION');
      return;
    }

    // ==========================================
    // 5b. SUB-MENU: B12 SYMPTOMS SELECTION
    // ==========================================
    if (activeConvState === 'AWAITING_B12_SYMPTOM_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '10' || cleanedQuery.includes('back') || cleanedQuery.includes('category') || cleanedQuery.includes('categories')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '11' || cleanedQuery.includes('menu') || cleanedQuery.includes('home')) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      let symptomsToAppend: string[] = [];
      let clinicalDetail = '';

      if (cleanedQuery === '1' || cleanedQuery.includes('tingling') || cleanedQuery.includes('pins') || cleanedQuery.includes('needles') || cleanedQuery.includes('paresthesia')) {
        symptomsToAppend = ['b12_tingling'];
        clinicalDetail = '### ⚡ Tingling / Pins & Needles Logged\n\n**Clinical Mechanism:**\nVitamin B12 is essential for myelin sheath integrity; deficiency causes peripheral paresthesia and nerve conduction delay.\n\n**Key Actions:**\n- Check serum Vitamin B12 levels.\n- Include dairy, fortified foods, or B12 supplements if vegetarian.';
      } else if (cleanedQuery === '2' || cleanedQuery.includes('walking') || cleanedQuery.includes('balance') || cleanedQuery.includes('gait')) {
        symptomsToAppend = ['b12_trouble_walking'];
        clinicalDetail = '### 🧠 Trouble Walking & Balance Issues Logged\n\n**Clinical Mechanism:**\nDemyelination of the dorsal and lateral columns of the spinal cord impairs spatial proprioception and coordination.\n\n**Key Actions:**\n- Seek clinical testing of Vitamin B12 and neurological assessment.\n- Ensure dietary or supplemental intake of cobalamin.';
      } else if (cleanedQuery === '3' || cleanedQuery.includes('uncontrollable') || cleanedQuery.includes('muscle movement') || cleanedQuery.includes('spasm')) {
        symptomsToAppend = ['b12_muscle_movements'];
        clinicalDetail = '### 🦾 Uncontrollable Muscle Movements Logged\n\n**Clinical Mechanism:**\nDisrupted motor nerve pathways and abnormal spinal reflex arc transmission secondary to cobalamin coenzyme depletion.\n\n**Key Actions:**\n- Discuss symptoms with your health provider.\n- Optimize Vitamin B12 intake.';
      } else if (cleanedQuery === '4' || cleanedQuery.includes('confusion') || cleanedQuery.includes('memory') || cleanedQuery.includes('slow thinking') || cleanedQuery.includes('brain fog')) {
        symptomsToAppend = ['b12_confusion_memory'];
        clinicalDetail = '### 🧠 Brain Fog & Memory Slowdown Logged\n\n**Clinical Mechanism:**\nIron and Vitamin B12 are crucial cofactors for neurotransmitter synthesis (dopamine, serotonin) and cerebral oxygenation.\n\n**Key Actions:**\n- Ensure bioavailable Vitamin B12 and Folate intake.\n- Maintain consistent sleep schedule.';
      } else if (cleanedQuery === '5' || cleanedQuery.includes('mood') || cleanedQuery.includes('mental') || cleanedQuery.includes('depression') || cleanedQuery.includes('anxiety')) {
        symptomsToAppend = ['b12_mood_changes'];
        clinicalDetail = '### 🧠 Mood & Mental Changes Logged\n\n**Clinical Mechanism:**\nDisruption in one-carbon metabolism impacts S-adenosylmethionine (SAM) pathways, affecting dopamine, norepinephrine, and serotonin synthesis.\n\n**Key Actions:**\n- Support mood with adequate sleep and micronutrient density.\n- Evaluate B12/Folate blood levels.';
      } else if (cleanedQuery === '6' || cleanedQuery.includes('smell') || cleanedQuery.includes('taste')) {
        symptomsToAppend = ['b12_smell_taste'];
        clinicalDetail = '### 👅 Problems with Smell or Taste Logged\n\n**Clinical Mechanism:**\nOlfactory or lingual receptor nerve degeneration and atrophy of taste-bud-bearing papillae due to B12 depletion.\n\n**Key Actions:**\n- Focus on highly nutritious, easily digestible meals.\n- Investigate B12 status.';
      } else if (cleanedQuery === '7' || cleanedQuery.includes('vision') || cleanedQuery.includes('blur')) {
        symptomsToAppend = ['b12_vision'];
        clinicalDetail = '### 👁️ Vision Problems & Blurriness Logged\n\n**Clinical Mechanism:**\nOptic neuropathy resulting from progressive demyelination of the optic nerve in prolonged Vitamin B12 deficiency.\n\n**Key Actions:**\n- Seek professional eye care and immediately evaluate Vitamin B12 levels.';
      } else if (cleanedQuery === '8' || cleanedQuery.includes('diarrhea') || cleanedQuery.includes('weight loss')) {
        symptomsToAppend = ['b12_diarrhea_weight_loss'];
        clinicalDetail = '### 🌾 Diarrhea & Weight Loss Logged\n\n**Clinical Mechanism:**\nAtrophy of the rapidly dividing gastrointestinal mucosal epithelial lining leading to malabsorption and weight loss.\n\n**Key Actions:**\n- Ensure hydration with electrolytes.\n- Consult a healthcare provider if persistent.';
      } else if (cleanedQuery === '9' || cleanedQuery.includes('glossitis') || cleanedQuery.includes('tongue')) {
        symptomsToAppend = ['b12_glossitis'];
        clinicalDetail = '### 👄 Glossitis (Smooth Red Tongue) Logged\n\n**Clinical Mechanism:**\nImpaired DNA synthesis in rapidly replicating lingual epithelial cells, causing depapillation and a sore, smooth, beefy-red appearance.\n\n**Key Actions:**\n- Avoid highly spicy, hot, or acidic foods.\n- Optimize B12 and Folate intake.';
      } else {
        symptomsToAppend = [query.trim()];
        clinicalDetail = `### 🩺 Custom B12-Related Symptom Logged\n\n**Symptom:** "${query.trim()}" has been recorded in your B12 health vector.`;
      }

      const storeState = useHealthStore.getState();
      storeState.appendUserSymptoms(symptomsToAppend);

      const activeList = getAllActiveSymptomsList(
        storeState.selectedSymptoms,
        storeState.gut,
        storeState.severeSymptoms
      );
      const symListStr = activeList.length > 0 ? activeList.join(', ') : 'None currently logged';

      const friendlyNameMap: Record<string, string> = {
        b12_tingling: 'Tingling (Pins & Needles)',
        b12_trouble_walking: 'Trouble Walking & Balance Issues',
        b12_muscle_movements: 'Uncontrollable Muscle Movements',
        b12_confusion_memory: 'Brain Fog & Memory Slowdown',
        b12_mood_changes: 'Mood or Mental Changes',
        b12_smell_taste: 'Problems with Smell or Taste',
        b12_vision: 'Vision Problems & Blurriness',
        b12_diarrhea_weight_loss: 'Diarrhea and Unexplained Weight Loss',
        b12_glossitis: 'Glossitis (Smooth Red Tongue)'
      };

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom Logged Successfully!\n\n**Added to Profile:** ${symptomsToAppend.map(s => friendlyNameMap[s] || s).join(', ')}\n\n${clinicalDetail}\n\n---\n📋 **Current Active Logged Symptoms (${activeList.length}):** ${symListStr}\n\n**Next Actions:**\n[1] Add Another Symptom\n[2] View Current Symptoms Profile\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Guidelines on Anemia Symptomatology and Assessment.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_SYMPTOM_POST_ADD_ACTION');
      return;
    }

    // ==========================================
    // 5c. SUB-MENU: FOLATE SYMPTOMS SELECTION
    // ==========================================
    if (activeConvState === 'AWAITING_FOLATE_SYMPTOM_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '10' || cleanedQuery.includes('back') || cleanedQuery.includes('category') || cleanedQuery.includes('categories')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '11' || cleanedQuery.includes('menu') || cleanedQuery.includes('home')) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      let symptomsToAppend: string[] = [];
      let clinicalDetail = '';

      if (cleanedQuery === '1' || cleanedQuery.includes('generalized weakness') || cleanedQuery.includes('weakness')) {
        symptomsToAppend = ['folate_weakness'];
        clinicalDetail = '### 🍀 Generalized Weakness Logged\n\n**Clinical Mechanism:**\nImpaired DNA synthesis during megaloblastic erythropoiesis decreases functional circulating red blood cells, causing tissue oxygenation deficits.\n\n**Key Actions:**\n- Boost folate intake with leafy greens (Spinach/Palak), lentils, and citrus.\n- Avoid over-cooking vegetables to prevent folate heat damage.';
      } else if (cleanedQuery === '2' || cleanedQuery.includes('persistent fatigue') || cleanedQuery.includes('fatigue')) {
        symptomsToAppend = ['folate_fatigue'];
        clinicalDetail = '### 🍀 Persistent Fatigue Logged\n\n**Clinical Mechanism:**\nDiminished oxygen-carrying capacity of megaloblastic red blood cells impairs systemic metabolic energy efficiency.\n\n**Key Actions:**\n- Pair folate sources with vitamin C rich foods.\n- Limit high heat when cooking folate-dense ingredients.';
      } else if (cleanedQuery === '3' || cleanedQuery.includes('difficulty concentrating') || cleanedQuery.includes('concentrating') || cleanedQuery.includes('concentration')) {
        symptomsToAppend = ['folate_concentrating'];
        clinicalDetail = '### 🧠 Difficulty Concentrating Logged\n\n**Clinical Mechanism:**\nDisruption in tetrahydrofolate-dependent methylation pathways essential for central nervous system neurotransmitter synthesis.\n\n**Key Actions:**\n- Support brain health with nutrient-dense foods (e.g., green vegetables, beets).\n- Maintain hydration.';
      } else if (cleanedQuery === '4' || cleanedQuery.includes('irritability') || cleanedQuery.includes('restlessness')) {
        symptomsToAppend = ['folate_irritability'];
        clinicalDetail = '### 🍀 Irritability & Restlessness Logged\n\n**Clinical Mechanism:**\nElevated serum homocysteine levels and altered brain monoamine metabolism impact emotional regulation.\n\n**Key Actions:**\n- Incorporate calming herbal infusions (e.g., chamomile, ginger water).\n- Focus on stabilizing B-complex vitamins.';
      } else if (cleanedQuery === '5' || cleanedQuery.includes('headache') || cleanedQuery.includes('headaches')) {
        symptomsToAppend = ['folate_headache'];
        clinicalDetail = '### 🍀 Frequent Headaches Logged\n\n**Clinical Mechanism:**\nVascular compensatory mechanisms including cerebral arterial vasodilation attempting to maintain oxygen delivery to brain tissues.\n\n**Key Actions:**\n- Rest in a cool, quiet room.\n- Ensure regular meals to avoid blood sugar fluctuations alongside anemia.';
      } else if (cleanedQuery === '6' || cleanedQuery.includes('palpitations') || cleanedQuery.includes('heart beat')) {
        symptomsToAppend = ['folate_palpitations'];
        clinicalDetail = '### 💓 Heart Palpitations Logged\n\n**Clinical Mechanism:**\nHyperdynamic cardiac state; the heart pumps faster to maintain tissue oxygen perfusion despite lower red blood cell volume.\n\n**Key Actions:**\n- Avoid stimulants like caffeine.\n- Have your complete blood count and Folate levels evaluated.';
      } else if (cleanedQuery === '7' || cleanedQuery.includes('shortness of breath') || cleanedQuery.includes('breathlessness')) {
        symptomsToAppend = ['folate_breathlessness'];
        clinicalDetail = '### 🍀 Shortness of Breath Logged\n\n**Clinical Mechanism:**\nElevated respiratory effort to compensate for reduced oxygen transport capacity of megaloblastic blood cells.\n\n**Key Actions:**\n- Break up physical tasks and rest frequently.\n- Prioritize folate-rich foods daily.';
      } else if (cleanedQuery === '8' || cleanedQuery.includes('mouth ulcer') || cleanedQuery.includes('ulcers') || cleanedQuery.includes('sores') || cleanedQuery.includes('sore tongue')) {
        symptomsToAppend = ['folate_oral_sores'];
        clinicalDetail = '### 👄 Mouth Ulcers & Sore Tongue Logged\n\n**Clinical Mechanism:**\nRapid turnover of oral mucosal epithelial cells makes them highly vulnerable to Folate (B9) and B12 coenzyme depletion, causing glossitis and aphthous stomatitis.\n\n**Key Actions:**\n- Include folate-rich lentils, green leafy vegetables, and sprouts.\n- Avoid excessively spicy or acidic foods until oral lining heals.';
      } else if (cleanedQuery === '9' || cleanedQuery.includes('pigmentation') || cleanedQuery.includes('skin color') || cleanedQuery.includes('nail pigmentation')) {
        symptomsToAppend = ['folate_pigmentation'];
        clinicalDetail = '### 💅 Pigmentation Changes Logged\n\n**Clinical Mechanism:**\nDisturbed melanin synthesis pathway in cutaneous tissues linked to altered one-carbon methylation pathways.\n\n**Key Actions:**\n- Support skin health with safe hydration and antioxidant-dense diets.\n- Evaluate folate and B12 status.';
      } else {
        symptomsToAppend = [query.trim()];
        clinicalDetail = `### 🩺 Custom Folate-Related Symptom Logged\n\n**Symptom:** "${query.trim()}" has been recorded in your Folate health vector.`;
      }

      const storeState = useHealthStore.getState();
      storeState.appendUserSymptoms(symptomsToAppend);

      const activeList = getAllActiveSymptomsList(
        storeState.selectedSymptoms,
        storeState.gut,
        storeState.severeSymptoms
      );
      const symListStr = activeList.length > 0 ? activeList.join(', ') : 'None currently logged';

      const friendlyFolateMap: Record<string, string> = {
        folate_weakness: 'Generalized Weakness',
        folate_fatigue: 'Persistent Fatigue',
        folate_concentrating: 'Difficulty Concentrating',
        folate_irritability: 'Irritability & Restlessness',
        folate_headache: 'Frequent Headaches',
        folate_palpitations: 'Heart Palpitations',
        folate_breathlessness: 'Shortness of Breath',
        folate_oral_sores: 'Mouth Ulcers & Sore Red Tongue',
        folate_pigmentation: 'Changes in Skin, Hair or Nail Pigmentation'
      };

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom Logged Successfully!\n\n**Added to Profile:** ${symptomsToAppend.map(s => friendlyFolateMap[s] || s).join(', ')}\n\n${clinicalDetail}\n\n---\n📋 **Current Active Logged Symptoms (${activeList.length}):** ${symListStr}\n\n**Next Actions:**\n[1] Add Another Symptom\n[2] View Current Symptoms Profile\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Guidelines on Anemia Symptomatology and Assessment.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_SYMPTOM_POST_ADD_ACTION');
      return;
    }

    // ==========================================
    // 5d. SUB-MENU: VITAMIN D3 SYMPTOMS SELECTION
    // ==========================================
    if (activeConvState === 'AWAITING_VITD_SYMPTOM_SELECTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '8' || cleanedQuery.includes('back') || cleanedQuery.includes('category') || cleanedQuery.includes('categories')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '9' || cleanedQuery.includes('menu') || cleanedQuery.includes('home')) {
        const menuMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: WELCOME_AND_MENU_MESSAGE,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(menuMsg);
        setConversationState('IDLE');
        return;
      }

      let symptomsToAppend: string[] = [];
      let clinicalDetail = '';

      if (cleanedQuery === '1' || cleanedQuery.includes('persistent fatigue') || cleanedQuery.includes('fatigue') || cleanedQuery.includes('tiredness')) {
        symptomsToAppend = ['vitd_persistent_fatigue'];
        clinicalDetail = '### ☀️ Persistent Fatigue and Tiredness Logged\n\n**Clinical Mechanism:**\nVitamin D nuclear receptors (VDR) modulate mitochondrial oxidative phosphorylation and respiratory chain function in skeletal muscle fibers.\n\n**Key Actions:**\n- Optimize exposure to safe morning sunlight (15–20 minutes).\n- Check your 25-OH Vitamin D blood levels.';
      } else if (cleanedQuery === '2' || cleanedQuery.includes('bone pain') || cleanedQuery.includes('back pain') || cleanedQuery.includes('lower back')) {
        symptomsToAppend = ['vitd_bone_back_pain'];
        clinicalDetail = '### 🦴 Bone & Lower Back Pain Logged\n\n**Clinical Mechanism:**\nVitamin D3 deficiency impairs intestinal calcium absorption, leading to secondary hyperparathyroidism and bone matrix demineralization.\n\n**Key Actions:**\n- Check 25-OH Vitamin D levels.\n- Get safe morning sunlight exposure and include Vitamin D fortified foods or supplements.';
      } else if (cleanedQuery === '3' || cleanedQuery.includes('muscle weakness') || cleanedQuery.includes('muscle cramps') || cleanedQuery.includes('cramps') || cleanedQuery.includes('weakness')) {
        symptomsToAppend = ['vitd_muscle_weakness_cramps'];
        clinicalDetail = '### 🦾 Muscle Cramps & Slow Wound Healing Logged\n\n**Clinical Mechanism:**\nAltered calcium-magnesium cellular flux causes fast-twitch muscle cramps, while Vitamin D depletion delays tissue re-epithelialization.\n\n**Key Actions:**\n- Hydrate adequately and maintain mineral balance.\n- Check Vitamin D3 levels.';
      } else if (cleanedQuery === '4' || cleanedQuery.includes('frequent illness') || cleanedQuery.includes('illness') || cleanedQuery.includes('infection') || cleanedQuery.includes('infections')) {
        symptomsToAppend = ['vitd_frequent_illness'];
        clinicalDetail = '### ☀️ Frequent Illness & Recurrent Infections Logged\n\n**Clinical Mechanism:**\nCalcitriol (active Vitamin D3) is a direct immunomodulator, regulating the transcription of antimicrobial peptides (cathelicidin and defensins) in immune cells.\n\n**Key Actions:**\n- Support immunity with mineral-dense foods and ginger/amla.\n- Discuss Vitamin D3 therapeutic supplementation with your physician.';
      } else if (cleanedQuery === '5' || cleanedQuery.includes('hair loss') || cleanedQuery.includes('shedding')) {
        symptomsToAppend = ['vitd_hair_loss'];
        clinicalDetail = '### 💇 Hair Loss (Telogen Effluvium) Logged\n\n**Clinical Mechanism:**\nVitamin D receptors in keratinocytes regulate normal hair follicle cycling and support active anagen phase maintenance.\n\n**Key Actions:**\n- Focus on balanced micronutrient status (Iron + Vitamin D).\n- Avoid stressful physical pulling of hair during active shedding.';
      } else if (cleanedQuery === '6' || cleanedQuery.includes('depression') || cleanedQuery.includes('mood') || cleanedQuery.includes('low mood')) {
        symptomsToAppend = ['vitd_depression_mood'];
        clinicalDetail = '### ☀️ Depression & Low Mood Logged\n\n**Clinical Mechanism:**\nVitamin D receptors in the hippocampus and hypothalamus regulate neurotrophins and modulate neurotransmitter (e.g. serotonin) synthesis.\n\n**Key Actions:**\n- Incorporate outdoor morning walks.\n- Ensure consistent biological sleep rhythm.';
      } else if (cleanedQuery === '7' || cleanedQuery.includes('slow wound') || cleanedQuery.includes('wound healing') || cleanedQuery.includes('healing')) {
        symptomsToAppend = ['vitd_slow_wound_healing'];
        clinicalDetail = '### 🦾 Muscle Cramps & Slow Wound Healing Logged\n\n**Clinical Mechanism:**\nAltered calcium-magnesium cellular flux causes fast-twitch muscle cramps, while Vitamin D depletion delays tissue re-epithelialization.\n\n**Key Actions:**\n- Hydrate adequately and maintain mineral balance.\n- Check Vitamin D3 levels.';
      } else {
        symptomsToAppend = [query.trim()];
        clinicalDetail = `### 🩺 Custom Vitamin D3-Related Symptom Logged\n\n**Symptom:** "${query.trim()}" has been recorded in your Vitamin D3 health vector.`;
      }

      const storeState = useHealthStore.getState();
      storeState.appendUserSymptoms(symptomsToAppend);

      const activeList = getAllActiveSymptomsList(
        storeState.selectedSymptoms,
        storeState.gut,
        storeState.severeSymptoms
      );
      const symListStr = activeList.length > 0 ? activeList.join(', ') : 'None currently logged';

      const friendlyD3Map: Record<string, string> = {
        vitd_persistent_fatigue: 'Persistent Fatigue & Tiredness',
        vitd_bone_back_pain: 'Bone Pain & Lower Back Pain',
        vitd_muscle_weakness_cramps: 'Muscle Weakness & Cramps',
        vitd_frequent_illness: 'Frequent Illness & Recurrent Infections',
        vitd_hair_loss: 'Hair Loss (Telogen Effluvium)',
        vitd_depression_mood: 'Depression & Low Mood',
        vitd_slow_wound_healing: 'Slow Wound Healing'
      };

      const confirmMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### ✅ Symptom Logged Successfully!\n\n**Added to Profile:** ${symptomsToAppend.map(s => friendlyD3Map[s] || s).join(', ')}\n\n${clinicalDetail}\n\n---\n📋 **Current Active Logged Symptoms (${activeList.length}):** ${symListStr}\n\n**Next Actions:**\n[1] Add Another Symptom\n[2] View Current Symptoms Profile\n[3] Main Menu\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Clinical Guidelines on Anemia Symptomatology and Assessment.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(confirmMsg);
      setConversationState('AWAITING_SYMPTOM_POST_ADD_ACTION');
      return;
    }

    if (activeConvState === 'AWAITING_SYMPTOM_POST_ADD_ACTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '1' || cleanedQuery.includes('add') || cleanedQuery.includes('another')) {
        const promptAddMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: ADD_SYMPTOMS_FULL_PROMPT,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Anemia Mukt Bharat Somatic Deficiency Manifestation Guidelines.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptAddMsg);
        setConversationState('AWAITING_SYMPTOM_SELECTION');
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery.includes('view')) {
        const activeSymsList = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
        const activeSyms = activeSymsList.length > 0 ? activeSymsList.join(', ') : 'None currently logged.';
        const viewMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 📋 Your Currently Logged Symptoms Profile\n\n**Active Symptoms:**\n${activeSyms}\n\n**Next Actions:**\n[1] Add Symptoms\n[2] Remove / Clear Symptoms\n[3] Main Menu`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(viewMsg);
        setConversationState('AWAITING_UPDATE_ACTION_SYMPTOMS');
        return;
      }

      if (cleanedQuery === '3' || cleanedQuery.includes('main') || cleanedQuery.includes('menu')) {
        setConversationState('IDLE');
      } else {
        setConversationState('AWAITING_SYMPTOM_SELECTION');
      }
    }

    // ==========================================
    // 6. SUB-MENU ROUTING: MEALS ACTION (AWAITING_MEAL_ACTION)
    // ==========================================
    if (activeConvState === 'AWAITING_MEAL_ACTION') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (cleanedQuery === '3' || cleanedQuery.includes('planner') || cleanedQuery.includes('explore')) {
        // [3] Go to Meal Planner
        const plannerMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🥗 Meal Planner & Recommendations\n\nI have opened the **Meal Planner** for you. Here you can explore curated iron-rich recipes and track your daily intake targets!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Feature Access',
              content: 'Navigating to Meal Planner tab.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(plannerMsg);
        setActiveTab('meals');
        setConversationState('IDLE');
        return;
      }

      if (cleanedQuery === '2' || cleanedQuery.includes('custom') || cleanedQuery.includes('nutrient') || cleanedQuery.includes('entry')) {
        // [2] Enter Custom Meal Nutrients -> Show custom meal builder
        const customMealMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Custom Meal Entry Builder ✏️\n\nYou can log any custom food item with your specific nutrient values!\n\nPlease provide your values in the form below, or reply directly in chat with:\n- **Food Item Name**\n- **Meal Slot** (Breakfast / Lunch / Snacks / Dinner)\n- **Iron (mg)**\n- **Vitamin B12 (µg)**\n- **Vitamin C (mg)**\n- **Vitamin D (µg)**\n- **Calories (kcal)**\n- **Folate (µg)**\n\n*(For example: "Paneer Tikka, Dinner, 2.5mg iron, 0.8mcg b12, 15mg vit c, 10µg vit d, 220 cal, 40mcg folate")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'User-specified nutrient metrics are directly aggregated into daily intake sums and RDA tracker rings.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(customMealMsg);
        setConversationState('AWAITING_CUSTOM_MEAL_ENTRY');
        return;
      }

      if (cleanedQuery === '1' || cleanedQuery.includes('search') || cleanedQuery.includes('dish') || cleanedQuery.includes('indian')) {
        // [1] Search & Log an Indian Dish
        const promptDishMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🍛 Search & Log an Indian Dish\n\nPlease enter the name of the food item you would like to log:\n\n*Examples: "Palak Paneer", "Ragi Dosa", "Poha", "Moong Dal Tadka", "Sprouted Sundal", "Moringa Sambar"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT).',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(promptDishMsg);
        setConversationState('AWAITING_CANDIDATE_CHOICE');
        return;
      }

      // If they type view meals
      if (cleanedQuery.includes('view') || cleanedQuery.includes('today') || cleanedQuery.includes('logged')) {
        const mealCount = meals.length;
        const totalIron = meals.reduce((acc, m) => acc + (m.ironMg || 0), 0);
        const totalB12 = meals.reduce((acc, m) => acc + (m.b12Mcg || 0), 0);
        const totalCalories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);

        const mealListText =
          mealCount > 0
            ? meals.map((m) => `- **${m.name}** (${m.mealType}): ${m.ironMg}mg iron, ${m.calories} kcal`).join('\n')
            : 'No meals logged yet today.';

        const viewMealsMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🍽️ Today's Logged Meals & Intakes\n\n**Logged Meals (${mealCount}):**\n${mealListText}\n\n**Daily Totals So Far:**\n- **Total Iron:** ${totalIron.toFixed(1)} mg\n- **Total Vitamin B12:** ${totalB12.toFixed(1)} µg\n- **Total Calories:** ${Math.round(totalCalories)} kcal\n\n*Visit the **Diet & Meals** tab to view your complete macronutrient breakdown and RDA progress rings.*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Aggregated daily food logs stored in your active session journal.',
            },
          ],
        };
        addChatMessage(userMsg);
        addChatMessage(viewMealsMsg);
        setConversationState('IDLE');
        return;
      }
    }

    const hasVitalsPattern =
      /(?:hb|hemoglobin|haemoglobin)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /(?:ferritin)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /(?:b12|vitamin\s*b12)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /(?:vitamin\s*d|vit\s*d)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /(?:folate|folateb9|b9)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /(?:mcv)\s*(?:is|:|=)?\s*\d+/i.test(query) ||
      /\d{2,3}(?:\.\d+)?\s*(?:kg|kilos|kilograms)\b/i.test(query) ||
      /\d{2,3}(?:\.\d+)?\s*(?:cm|centimeters)\b/i.test(query);

    // ==========================================
    // 7. PROFILE & DEMOGRAPHICS DIRECT INTERCEPTOR
    // ==========================================
    const isProfileInquiry =
      cleanedQuery === 'my profile' ||
      cleanedQuery === 'profile' ||
      cleanedQuery === 'demographics' ||
      cleanedQuery.includes('my height') ||
      cleanedQuery.includes('my weight') ||
      cleanedQuery.includes('my age') ||
      cleanedQuery.includes('my bmi') ||
      cleanedQuery.includes('what is my weight') ||
      cleanedQuery.includes('what is my height') ||
      cleanedQuery.includes('what is my age');

    if (isProfileInquiry && !hasVitalsPattern && (conversationState as string) !== 'AWAITING_HEALTH_DATA') {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const nameStr = demographics.name || 'Friend';
      const ageStr = demographics.age ? `${demographics.age} years` : 'Not recorded';
      const genderStr = demographics.sex === 'female' ? 'Female' : 'Male';
      const heightStr = demographics.heightCm ? `${demographics.heightCm} cm` : 'Not recorded';
      const weightStr = demographics.weightKg ? `${demographics.weightKg} kg` : 'Not recorded';
      const bmiStr = bmi.bmi > 0 ? `${bmi.bmi} kg/m² (${bmi.category})` : 'Not calculated';

      const profReply: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 👤 Your Profile & Demographics\n\n- **Name:** ${nameStr}\n- **Age:** ${ageStr}\n- **Gender:** ${genderStr}\n- **Height:** ${heightStr}\n- **Weight:** ${weightStr}\n- **Calculated BMI:** ${bmiStr}\n- **WHO Growth LMS Z-Score:** ${bmi.zScore !== undefined ? `${bmi.zScore} SD (${bmi.percentile}th Percentile)` : 'N/A'}\n\n*To edit your physical parameters or lab panels, click **"Update Profile & Labs"** in the top navigation.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Synchronized physical metrics from your personal Maguva health profile.',
          },
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Growth & Nutritional Classification Guidelines.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(profReply);
      return;
    }

    // ==========================================
    // 8. SYMPTOMS DIRECT INTERCEPTOR
    // ==========================================
    const isSymptomInquiry =
      cleanedQuery.includes('symptom') ||
      cleanedQuery.includes('fatigue') ||
      cleanedQuery.includes('tired') ||
      cleanedQuery.includes('hair fall') ||
      cleanedQuery.includes('hairfall') ||
      cleanedQuery.includes('dizziness') ||
      cleanedQuery.includes('palpitation') ||
      cleanedQuery.includes('brain fog') ||
      cleanedQuery.includes('pica') ||
      cleanedQuery.includes('cold hands');

    if (isSymptomInquiry && !cleanedQuery.includes('recipe') && !cleanedQuery.includes('food')) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const activeSymsList = getAllActiveSymptomsList(selectedSymptoms, gut, severeSymptoms);
      const activeSyms = activeSymsList.length > 0 ? activeSymsList.join(', ') : 'None currently logged';

      const symptomReply: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🩺 Symptoms & Micronutrient Signals\n\n**Your Current Logged Symptoms:** ${activeSyms}\n\n**Clinical Insights on Anemia & Deficiency Signs:**\n- **Fatigue & Weakness:** Reduced hemoglobin reduces tissue oxygenation and mitochondrial ATP synthesis.\n- **Hair Fall & Brittle Nails:** Hair matrix cells are highly dependent on intracellular ferritin stores (>30 ng/mL).\n- **Exertional Palpitations:** Compensatory cardiac hyperdynamic state due to lower oxygen-carrying capacity.\n- **Brain Fog:** Impaired dopamine and neurotransmitter synthesis from low iron/B12 cofactors.\n\n*You can select or update your active symptoms in the **Symptoms & Signals** tab.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Symptom profile synchronized with your clinical deficiency risk assessment.',
          },
          {
            category: 'Government of India Medical Guidelines',
            content: 'Anemia Mukt Bharat Operational Framework (2020).',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(symptomReply);
      return;
    }

    // ==========================================
    // 9. LAB / BIOMARKER DIRECT INTERCEPTOR
    // ==========================================
    const hasLabKeyword =
      /\bhb\b/i.test(cleanedQuery) ||
      /\bha?emoglobin\b/i.test(cleanedQuery) ||
      cleanedQuery.includes('ferritin') ||
      cleanedQuery.includes('blood report') ||
      cleanedQuery.includes('blood test') ||
      /\blabs?\b/i.test(cleanedQuery);

    if (
      hasLabKeyword &&
      !hasVitalsPattern &&
      (conversationState as string) !== 'AWAITING_HEALTH_DATA' &&
      (conversationState as string) !== 'AWAITING_UPDATE_ACTION_LABS' &&
      (conversationState as string) !== 'AWAITING_REMOVE_LAB'
    ) {
      // Check if user wants to update labs
      const isUpdateQuery =
        cleanedQuery.includes('update') ||
        cleanedQuery.includes('edit') ||
        cleanedQuery.includes('change') ||
        cleanedQuery.includes('upload') ||
        cleanedQuery.includes('enter') ||
        cleanedQuery.includes('modify') ||
        cleanedQuery.includes('input');

      if (isUpdateQuery) {
        setActiveTab('vector');

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const agentReply: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Clinical Lab Reports & Biomarkers 📋\n\nI have navigated you to the **Health Vector & Clinical Biomarkers** tab!\n\n**How to update your values:**\n1. **Direct Entry:** Under the **Clinical Biomarkers** section, click **"Edit Lab Biomarkers"** (or pencil icon) to enter or update your latest **Hemoglobin (Hb)**, **Serum Ferritin**, **Vitamin B12**, **Vitamin D**, and **Folate**.\n2. **Diagnostic Upload & Profile:** You can also click **"Update Profile & Labs"** in the top navigation to upload or review your complete lab panels.\n3. **Real-Time Recalculation:** As soon as you save your lab values, your **Anemia & Micronutrient Deficiency Risk Scores**, RDA targets, and clinical recommendations will immediately recalculate!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'Laboratory biomarkers directly update your deficiency risk engine and personalized clinical recommendations.',
            },
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 & Anemia Mukt Bharat clinical diagnostic reference guidelines.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(agentReply);
        return;
      }

      // Check if Hb inquiry
      const isHbInquiry = /\bhb\b/i.test(cleanedQuery) || /\bha?emoglobin\b/i.test(cleanedQuery);
      if (isHbInquiry) {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const currentHb = labs?.hemoglobin;
        let hbReplyText = '';

        if (currentHb !== undefined && currentHb !== null && currentHb > 0) {
          let statusText = '';
          let clinicalAdvice = '';

          if (currentHb < 7.0) {
            statusText = '⚠️ **Severe Anemia (< 7.0 g/dL)** — Urgent Medical Attention Required';
            clinicalAdvice = 'Your Hemoglobin is in the critical severe range. Please consult a qualified physician or gynecologist immediately for urgent clinical evaluation and parenteral iron management.';
          } else if (currentHb < 10.0) {
            statusText = '🟠 **Moderate Anemia (7.0 – 9.9 g/dL)**';
            clinicalAdvice = 'Your Hemoglobin is moderately low. In accordance with ICMR-NIN and Anemia Mukt Bharat guidelines, medical consultation for therapeutic iron supplementation alongside daily dietary iron-dense synergy is recommended.';
          } else if (currentHb < 12.0) {
            statusText = '🟡 **Mild Anemia (10.0 – 11.9 g/dL)**';
            clinicalAdvice = 'Your Hemoglobin is mildly below the optimal reference threshold for adult women (12.0 g/dL). Enhancing daily non-heme iron intake with Vitamin C boosters (amla, lemon) and avoiding post-meal tea/coffee will accelerate recovery.';
          } else {
            statusText = '🟢 **Normal / Optimal Range (≥ 12.0 g/dL)**';
            clinicalAdvice = 'Your Hemoglobin is within the healthy reference range for adult women. Continue maintaining balanced iron intake and supporting cofactors (B12 and Folate) to preserve your iron reserves.';
          }

          const ferritinNote = labs?.serumFerritin
            ? `\n- **Serum Ferritin:** ${labs.serumFerritin} ng/mL (Normal: 15 – 150 ng/mL)`
            : '\n- **Serum Ferritin:** *Not recorded yet* (measures cellular storage reserves).';

          hbReplyText = `### Your Hemoglobin (Hb) Status 🩸\n\nYour current recorded Hemoglobin level is **${currentHb} g/dL**.\n\n**Clinical Assessment:**\n- **Status:** ${statusText}\n- **Standard Reference Range:** **12.0 – 15.5 g/dL** (ICMR-NIN 2020 / WHO for non-pregnant adult women)${ferritinNote}\n\n**Clinical Guidance:**\n${clinicalAdvice}\n\n*To update your lab values anytime, say "update my blood reports" or visit the **Health Vector** tab.*`;
        } else {
          hbReplyText = `### Hemoglobin (Hb) Status 🩸\n\nYour Hemoglobin (Hb) level is currently **not recorded** in your profile.\n\n**Standard Clinical Reference Range for Women:**\n- **Optimal / Normal:** **12.0 – 15.5 g/dL** (ICMR-NIN 2020 & WHO)\n- **Mild Anemia:** 10.0 – 11.9 g/dL\n- **Moderate Anemia:** 7.0 – 9.9 g/dL\n- **Severe Anemia:** < 7.0 g/dL\n\n**How to log your Hb:**\nSay **"update my blood reports"** or go to the **Health Vector** tab to enter your latest blood test results so Maguva can calculate your personalized deficiency risks and recovery plan!`;
        }

        const agentReply: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: hbReplyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: currentHb ? `Current Hemoglobin recorded as ${currentHb} g/dL in health profile.` : 'Hemoglobin test not yet recorded in health profile.',
            },
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Dietary Guidelines & Anemia Mukt Bharat Clinical Protocols.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(agentReply);
        return;
      }

      // Check if Ferritin inquiry
      if (cleanedQuery.includes('ferritin')) {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const currentFerritin = labs?.serumFerritin;
        let ferritinDetails = '';
        if (currentFerritin !== undefined && currentFerritin !== null && currentFerritin > 0) {
          const isLow = currentFerritin < 15;
          const isSuboptimal = currentFerritin >= 15 && currentFerritin < 30;
          ferritinDetails = `Your current recorded Serum Ferritin is **${currentFerritin} ng/mL**.\n\n**Clinical Reference Range:**\n- **Normal Range:** **15 – 150 ng/mL** (WHO / ICMR-NIN)\n- **Status:** ${
            isLow
              ? '⚠️ **Depleted Iron Stores (< 15 ng/mL)** — Indicates latent or manifest iron deficiency'
              : isSuboptimal
              ? '🟡 **Borderline / Low Stores (15 – 30 ng/mL)** — Iron reserve depletion'
              : '🟢 **Adequate Iron Reserve (≥ 30 ng/mL)**'
          }\n\n*Serum Ferritin measures your body\'s cellular iron storage reserves (in the liver and bone marrow), whereas Hemoglobin measures circulating oxygen-carrying protein.*`;
        } else {
          ferritinDetails = `Your Serum Ferritin value is currently **not recorded** in your profile.\n\n**Standard Reference Range:**\n- **Normal:** **15 – 150 ng/mL** (WHO & ICMR-NIN)\n- Ferritin < 15 ng/mL indicates depleted iron stores (latent iron deficiency), even if Hemoglobin is normal.\n\nYou can log your Ferritin test result by saying **"update my blood reports"** or visiting the **Health Vector** tab.`;
        }

        const agentReply: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Serum Ferritin Profile 🧪\n\n${ferritinDetails}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: currentFerritin ? `Serum Ferritin is recorded as ${currentFerritin} ng/mL.` : 'Serum Ferritin is not yet logged.',
            },
            {
              category: 'WHO & International Health Guidance',
              content: 'WHO Serum Ferritin Concentration Guidelines for the Assessment of Iron Status in Populations.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(agentReply);
        return;
      }

      // General blood report / labs summary
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const hbStr = labs?.hemoglobin ? `${labs.hemoglobin} g/dL` : 'Not recorded';
      const ferritinStr = labs?.serumFerritin ? `${labs.serumFerritin} ng/mL` : 'Not recorded';
      const b12Str = labs?.vitaminB12 ? `${labs.vitaminB12} pg/mL` : 'Not recorded';
      const vitDStr = labs?.vitaminD ? `${labs.vitaminD} ng/mL` : 'Not recorded';
      const folateStr = labs?.folateB9 ? `${labs.folateB9} ng/mL` : 'Not recorded';
      const mcvStr = labs?.mcv ? `${labs.mcv} fL` : 'Not recorded';

      const agentReply: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### Your Clinical Lab & Biomarker Summary 🔬\n\nHere are your current laboratory values recorded in Maguva:\n\n- **Hemoglobin (Hb):** ${hbStr} *(Normal: 12.0 – 15.5 g/dL)*\n- **Serum Ferritin:** ${ferritinStr} *(Normal: 15 – 150 ng/mL)*\n- **Vitamin B12:** ${b12Str} *(Normal: 200 – 900 pg/mL)*\n- **Vitamin D (25-OH):** ${vitDStr} *(Normal: 30 – 100 ng/mL)*\n- **Folate (B9):** ${folateStr} *(Normal: 4.0 – 20.0 ng/mL)*\n- **MCV:** ${mcvStr} *(Normal: 80 – 100 fL)*\n\n*To edit or add newly received test results from your lab, say **"update my blood reports"** or switch to the **Health Vector** tab.*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Data From Your Profile',
            content: 'Clinical laboratory biomarkers stored in your personal Maguva health vector.',
          },
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Indian Nutrient & Biomarker Reference Ranges.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(agentReply);
      return;
    }

    // ==========================================
    // 10. GENERIC LOG MEAL PROMPT
    // ==========================================
    const genericLoggingTriggers = ['log meals', 'log meal', 'add meal', 'track food', 'meals'];
    if (genericLoggingTriggers.includes(cleanedQuery)) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const mealMenuMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### 🥗 Meals & Food Logging\n\nHow would you like to log or plan your nutrition today?\n\n**[1] Search & Log an Indian Dish** (e.g. Ragi Dosa, Palak Paneer, Poha, Dal)\n**[2] Custom Nutrient Entry** (Build and log a custom dish with specific Iron, B12, and Vitamin C values)\n**[3] Go to Meal Planner** (Explore iron-rich recipes, daily targets, and curated meal plans)\n\n*Click an option above or reply with a number [1–3].*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT) verified nutrient database.',
          },
        ],
      };

      addChatMessage(userMsg);
      addChatMessage(mealMenuMsg);
      setConversationState('AWAITING_MEAL_ACTION');
      return;
    }

    // ==========================================
    // 11. CUSTOM MEAL PARSING & LOGGING
    // ==========================================
    const hasNutrientKeywords = /\b(iron|b12|folate|vitamin\s*c|vit\s*c|cal|calories)\b/i.test(query) && /\d+/i.test(query);
    if (activeConvState === 'AWAITING_CUSTOM_MEAL_ENTRY' || hasNutrientKeywords) {
      const parsed = parseCustomMealInput(query);
      if (parsed.ironMg > 0 || parsed.calories > 0 || parsed.folateMcg > 0 || parsed.b12Mcg > 0 || activeConvState === 'AWAITING_CUSTOM_MEAL_ENTRY') {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const toolExecData = executeToolLocally('saveMeal', {
          name: parsed.name,
          portion: parsed.portion || '1 custom serving',
          ironMg: parsed.ironMg,
          b12Mcg: parsed.b12Mcg,
          vitaminCMg: parsed.vitaminCMg,
          vitaminDMcg: parsed.vitaminDMcg,
          calories: parsed.calories,
          folateMcg: parsed.folateMcg,
          mealType: parsed.mealType,
          hasVitaminCBooster: parsed.vitaminCMg > 15,
        });

        const replyMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Custom Food Item Logged! ✨\n\nI have saved **${parsed.name}** under **${parsed.mealType}** directly into your **Daily Meal Journal**!\n\n**User-Defined Nutrient Values Used for Daily Calculations:**\n- **Iron:** ${parsed.ironMg} mg\n- **Vitamin B12:** ${parsed.b12Mcg} µg\n- **Vitamin C:** ${parsed.vitaminCMg} mg\n- **Vitamin D:** ${parsed.vitaminDMcg} µg\n- **Folate (B9):** ${parsed.folateMcg} µg\n\nYour daily micronutrient intake sums and RDA target rings on the Dashboard and Meal Planner have been updated using your exact user-defined values. 🥗`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'User-specified nutrient metrics are directly aggregated into daily intake sums and RDA tracker rings.',
            },
          ],
          toolExecuted: toolExecData,
        };

        addChatMessage(userMsg);
        addChatMessage(replyMsg);
        setConversationState('IDLE');
        setPendingCandidate(null);
        return;
      }
    }

    // ==========================================
    // 12. MEAL SLOT CHOICE (AWAITING_MEAL_SLOT)
    // ==========================================
    const isSlotChoice =
      cleanedQuery.includes('breakfast') ||
      cleanedQuery.includes('lunch') ||
      cleanedQuery.includes('dinner') ||
      cleanedQuery.includes('snack') ||
      ['1', '2', '3', '4'].includes(cleanedQuery);

    if (activeConvState === 'AWAITING_MEAL_SLOT' && isSlotChoice) {
      let chosenSlot: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner' = 'Lunch';
      if (cleanedQuery.includes('breakfast') || cleanedQuery === '1') chosenSlot = 'Breakfast';
      else if (cleanedQuery.includes('lunch') || cleanedQuery === '2') chosenSlot = 'Lunch';
      else if (cleanedQuery.includes('snack') || cleanedQuery === '3') chosenSlot = 'Snacks';
      else if (cleanedQuery.includes('dinner') || cleanedQuery === '4') chosenSlot = 'Dinner';

      if (!pendingCandidate) {
        // Should not happen in normal flow
        setConversationState('IDLE');
        return;
      }
      const candidate = pendingCandidate;

      const toolExecData = executeToolLocally('saveMeal', {
        name: candidate.name,
        portion: candidate.portion || '1 standard serving',
        ironMg: candidate.ironMg,
        b12Mcg: candidate.b12Mcg,
        folateMcg: candidate.folateMcg,
        vitaminDMcg: candidate.vitaminDMcg,
        vitaminCMg: candidate.vitaminCMg,
        calciumMg: candidate.calciumMg,
        calories: candidate.calories,
        mealType: chosenSlot,
        hasVitaminCBooster: (candidate.vitaminCMg || 0) > 15,
      });

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const replyMsg: ChatMessage = {
        id: `agent-${Date.now() + 1}`,
        sender: 'agent',
        text: `### Food Item Logged to ${chosenSlot}! 🥗\n\nI have added **${candidate.name}** to your **${chosenSlot}** meal log!\n\n- **Estimated Iron:** ${candidate.ironMg} mg\n- **Vitamin B12:** ${candidate.b12Mcg} µg\n- **Calcium:** ${candidate.calciumMg || 0} mg\n- **Folate (B9):** ${candidate.folateMcg} µg\n- **Vitamin C:** ${candidate.vitaminCMg || 0} mg\n- **Vitamin D:** ${candidate.vitaminDMcg || 0} µg\n- **Meal Slot:** ${chosenSlot}\n\nYour daily intake totals and RDA progress rings on the Dashboard and Meal Planner have been updated.\n\n---\n**How can I help you next?**\n[1] Check my Daily Dashboard\n[2] Update my Blood Reports\n[3] Log Symptoms or Daily Habits\n[4] Search & Log an Indian Dish\n[5] Personal Profile`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            category: 'Government of India Medical Guidelines',
            content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT)',
          },
        ],
        toolExecuted: toolExecData,
      };

      addChatMessage(userMsg);
      addChatMessage(replyMsg);
      setPendingCandidate(null);
      setConversationState('IDLE');
      return;
    }

    // ==========================================
    // 13. CANDIDATE SELECTION (AWAITING_CANDIDATE_CHOICE)
    // ==========================================
    const isSingleCandidateDigit = ['1', '2', '3'].includes(cleanedQuery);
    const isCustomChoice =
      (currentCandidates.length > 0 && cleanedQuery === String(currentCandidates.length + 1)) ||
      (currentCandidates.length === 0 && (cleanedQuery === '4' || cleanedQuery === '[4]')) ||
      cleanedQuery.includes('customize') ||
      cleanedQuery.includes('custom') ||
      cleanedQuery.includes('other') ||
      cleanedQuery.includes('not satisfied');
    const isMealPlannerCandidateChoice =
      (currentCandidates.length > 0 && cleanedQuery === String(currentCandidates.length + 2)) ||
      (currentCandidates.length === 0 && (cleanedQuery === '5' || cleanedQuery === '[5]')) ||
      cleanedQuery.includes('meal plan') ||
      cleanedQuery.includes('meal planner') ||
      cleanedQuery.includes('planner');

    if (
      (activeConvState === 'AWAITING_CANDIDATE_CHOICE' ||
        (currentCandidates.length > 0 && (isSingleCandidateDigit || isCustomChoice || isMealPlannerCandidateChoice))) &&
      !pendingCandidate
    ) {
      if (isMealPlannerCandidateChoice) {
        setActiveTab('meals');
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        const navMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### 🥗 Meal Planner Opened\n\nI have switched your view to the **Meal Planner & Food Journal** tab. Here you can plan full meals, view iron/B12 density ratings, explore recipes, and check today's micronutrient intake totals.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        addChatMessage(userMsg);
        addChatMessage(navMsg);
        setConversationState('IDLE');
        return;
      }

      if (isCustomChoice) {
        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const builderMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Custom Meal Entry Builder ✏️\n\nYou can log any custom food item with your specific nutrient values!\n\nPlease provide your values in the form below, or reply directly in chat with:\n- **Food Item Name**\n- **Meal Slot** (Breakfast / Lunch / Snacks / Dinner)\n- **Iron (mg)**\n- **Vitamin B12 (µg)**\n- **Vitamin C (mg)**\n- **Vitamin D (µg)**\n- **Calories (kcal)**\n- **Folate (µg)**\n\n*(For example: "Paneer Tikka, Dinner, 2.5mg iron, 0.8mcg b12, 15mg vit c, 10µg vit d, 220 cal, 40mcg folate")*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Data From Your Profile',
              content: 'User-specified nutrient metrics will be directly aggregated into daily totals and RDA tracker rings.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(builderMsg);
        setConversationState('AWAITING_CUSTOM_MEAL_ENTRY');
        return;
      }

      if (activeConvState === 'AWAITING_CANDIDATE_CHOICE' && currentCandidates.length === 0 && !isSingleCandidateDigit) {
        const foodSearchResult = searchSimilarFoodItems(query);
        if (foodSearchResult && foodSearchResult.candidates.length > 0) {
          setCurrentCandidates(foodSearchResult.candidates);
          const cands = foodSearchResult.candidates;
          const candidateListText = cands
            .map((c, idx) => `[${idx + 1}] ${c.name} (${c.portion})`)
            .join('\n\n');
          const customOptionNum = cands.length + 1;

          const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            sender: 'user',
            text: query,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          const agentCandidateMsg: ChatMessage = {
            id: `agent-${Date.now() + 1}`,
            sender: 'agent',
            text: `### Candidate Matches Found\n\nHere are the closest matches found in our verified database for **${foodSearchResult.searchedTerm}**:\n\n${candidateListText}\n\n[${customOptionNum}] Customize / Other\n\nPlease select a candidate match [1–${cands.length}] or choose **[${customOptionNum}] Customize / Other**.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citations: [
              {
                category: 'Government of India Medical Guidelines',
                content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT) verified nutrient profiles.',
              },
            ],
          };

          addChatMessage(userMsg);
          addChatMessage(agentCandidateMsg);
          return;
        }
      }

      // Candidate chosen
      let selectedCandidate: FoodCandidate | null = null;
      const numMatch = cleanedQuery.match(/^(\d+)/);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (idx >= 0 && idx < currentCandidates.length) {
          selectedCandidate = currentCandidates[idx] || null;
        }
      }
      if (!selectedCandidate) {
        selectedCandidate =
          currentCandidates.find(
            (c) =>
              c?.name &&
              (query.toLowerCase().includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(query.toLowerCase()))
          ) || null;
      }

      if (selectedCandidate) {
        setPendingCandidate(selectedCandidate);
        setConversationState('AWAITING_MEAL_SLOT');

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const slotAskMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Select Meal Slot\n\nYou selected: **${selectedCandidate.name}** (${selectedCandidate.portion})\n\nWhich meal slot should this food item be logged in as?\n\n[1] Breakfast\n[2] Lunch\n[3] Snacks\n[4] Dinner\n\nPlease select or reply with **Breakfast**, **Lunch**, **Snacks**, or **Dinner**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'Nutrient absorption timings vary across meal slots (e.g. avoiding tannins during iron-dense meals).',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(slotAskMsg);
        return;
      }
    }

    // ==========================================
    // 14. EDUCATIONAL / GENERAL HEALTH QUERY INTERCEPTOR & FALLBACK GUARDRAIL
    // ==========================================
    const isEducationalQuery =
      cleanedQuery.startsWith('why ') ||
      cleanedQuery.startsWith('why') ||
      cleanedQuery.startsWith('how ') ||
      cleanedQuery.startsWith('how') ||
      cleanedQuery.startsWith('what ') ||
      cleanedQuery.startsWith('what') ||
      cleanedQuery.startsWith('explain ') ||
      cleanedQuery.startsWith('tell me') ||
      cleanedQuery.startsWith('can i') ||
      cleanedQuery.startsWith('is ') ||
      cleanedQuery.startsWith('does ') ||
      cleanedQuery.includes('difference between') ||
      cleanedQuery.includes('how to increase') ||
      cleanedQuery.includes('how to improve') ||
      cleanedQuery.includes('how to absorb') ||
      cleanedQuery.includes('diet chart') ||
      cleanedQuery.includes('meal plan') ||
      cleanedQuery.endsWith('?');

    // Check if query is a recognized health/educational query or explicit food command
    const isRecognizedHealthQuery =
      isEducationalQuery ||
      cleanedQuery.startsWith('log ') ||
      cleanedQuery.startsWith('search ');

    // If query matches food search, check candidate matches
    if (!isEducationalQuery && (cleanedQuery.startsWith('log ') || cleanedQuery.startsWith('search '))) {
      const foodSearchResult = searchSimilarFoodItems(query);
      if (foodSearchResult && foodSearchResult.candidates.length > 0) {
        setCurrentCandidates(foodSearchResult.candidates);
        setConversationState('AWAITING_CANDIDATE_CHOICE');

        const cands = foodSearchResult.candidates;
        const candidateListText = cands
          .map((c, idx) => `[${idx + 1}] ${c.name} (${c.portion})`)
          .join('\n\n');
        const customOptionNum = cands.length + 1;

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: query,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const agentCandidateMsg: ChatMessage = {
          id: `agent-${Date.now() + 1}`,
          sender: 'agent',
          text: `### Candidate Matches Found\n\nHere are the closest matches found in our verified database for **${foodSearchResult.searchedTerm}**:\n\n${candidateListText}\n\n[${customOptionNum}] Customize / Other\n\nPlease select a candidate match [1–${cands.length}] or choose **[${customOptionNum}] Customize / Other**.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citations: [
            {
              category: 'Government of India Medical Guidelines',
              content: 'ICMR-NIN 2020 Indian Food Composition Tables (IFCT) verified nutrient profiles.',
            },
          ],
        };

        addChatMessage(userMsg);
        addChatMessage(agentCandidateMsg);
        return;
      }
    }



    // ==========================================
    // 15. BACKEND AI / GEMINI ROUTING
    // ==========================================
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    addChatMessage(userMsg);
    setAiThinking(true);

    try {
      const userProfilePayload = {
        demographics,
        labs,
        gut,
        menstrual,
        selectedSymptoms,
        bmi,
        risks,
        isTriageTriggered,
      };

      const historyPayload = chatMessages.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          userProfile: userProfilePayload,
          history: historyPayload,
          conversationState: activeConvState,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      if (data.conversationState) {
        setConversationState(data.conversationState);
      } else if (data.text?.includes('Please provide your latest blood test values') || data.text?.includes('Awaiting Lab Data')) {
        setConversationState('AWAITING_HEALTH_DATA');
      } else if (data.text?.includes('Candidate Matches Found')) {
        setConversationState('AWAITING_CANDIDATE_CHOICE');
      } else {
        setConversationState('IDLE');
      }

      let toolExecData: any = data.toolExecuted || undefined;

      // Check if tool calls were triggered
      if (data.toolCalls && data.toolCalls.length > 0) {
        for (const tool of data.toolCalls) {
          const executed = executeToolLocally(tool.toolName, tool.args);
          if (!toolExecData && executed) {
            toolExecData = executed;
          }
        }
      } else if (data.toolExecuted) {
        const executed = executeToolLocally(data.toolExecuted.toolName, data.toolExecuted.args);
        if (!toolExecData && executed) {
          toolExecData = executed;
        }
      }

      const citationsFormatted: GroundedCitation[] = (data.citations || [
        'Government of India Anemia Mukt Bharat Guidelines (2020)',
        'ICMR-NIN 2020 RDA Tables',
      ]).map((c: any) =>
        typeof c === 'string'
          ? {
              category: 'Government of India Medical Guidelines',
              content: c,
            }
          : c
      );

      if (data.targetTab) {
        setActiveTab(data.targetTab);
        if (data.targetTab === 'dashboard' && data.scrollToHabits) {
          setTimeout(() => {
            const el = document.getElementById('daily-habits-tracker-card');
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
      }

      addChatMessage({
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: data.text || data.reply || 'I have analyzed your profile and prepared your response.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: citationsFormatted,
        toolExecuted: toolExecData,
      });
    } catch (err: any) {
      console.warn('Backend chat API failed, utilizing structured clinical fallback:', err);
      
      const lower = query.toLowerCase();
      let fallbackReply = '';
      let fallbackCitations: GroundedCitation[] = [
        {
          category: 'Government of India Medical Guidelines',
          content: 'Government of India Anemia Mukt Bharat Operational Framework (2020)',
        },
        {
          category: 'WHO & International Health Guidance',
          content: 'WHO Nutritional Anemias: Tools for Effective Prevention and Control',
        },
      ];
      let toolExecData: any = undefined;

      if (lower.includes('habit') || lower.includes('add')) {
        toolExecData = executeToolLocally('addHabit', {
          title: 'Warm Lemon Water with Amla Juice',
          category: 'Gut Optimization',
          description: '15ml cold-pressed Amla juice in warm water before breakfast to prime gastric acidity for non-heme iron reduction.',
          timing: 'Morning (07:30 AM)',
        });
        fallbackReply = `I have successfully logged **Warm Lemon Water with Amla Juice** into your **Daily Habits Tracker**! 🌸\n\n**Mechanism:** Ascorbic acid (Vitamin C) from raw Amla donates an electron to reduce ferric iron (Fe³⁺) into the soluble, highly absorbable ferrous state (Fe²⁺) in your duodenum.\n\n*Remember to maintain a 2-hour window away from tea or coffee.*`;
      } else if (lower.includes('ferritin') || lower.includes('iron')) {
        fallbackReply = `### Why Ferritin Can Remain Low\n\n1. **Tannin & Polyphenol Chelation:** Drinking tea or coffee with meals binds up to 60-70% of non-heme iron.\n2. **Low Duodenal Acidity:** Frequent antacids or low stomach acid prevent conversion of Fe³⁺ to Fe²⁺.\n3. **Menstrual Blood Losses:** Heavy bleeding (>30 ml per cycle) can deplete storage ferritin faster than oral intake can replete.\n\n**Next Steps:** Review Stage 2 Gut Optimization and pair meals with raw Amla or lemon juice.`;
      } else if (lower.includes('south indian') || lower.includes('lunch') || lower.includes('plan')) {
        fallbackReply = `### 🥗 High-Iron South Indian Vegetarian Lunch Plan (~8.5 mg Iron)\n\n- **Main:** 2 Ragi Rotis (Finger Millet) with Drumstick Leaves (Moringa) Sambar.\n- **Sides:** Fresh Palak Keerai Poriyal & Sprouted Moong Sundal with grated coconut.\n- **Absorption Booster:** A squeeze of fresh lemon juice over the keerai (Vitamin C).\n- **Gut Support:** 1 small bowl of freshly set homemade Curd (Dahi) with roasted jeera.\n\n*Important: Avoid drinking buttermilk or filter coffee during this meal.*`;
      } else if (lower.includes('lms') || lower.includes('z-score') || lower.includes('bmi')) {
        fallbackReply = `### 📊 WHO Growth LMS Explanation\n\nFor children and adolescents aged 5–19 years, BMI is assessed using the **WHO Growth Reference Standard (LMS Method)**:\n\n- **Your BMI:** ${bmi.bmi} kg/m²\n- **Z-Score:** ${bmi.zScore} SD (${bmi.percentile}th Percentile)\n- **Category:** ${bmi.category}\n\nUnlike fixed adult thresholds, LMS normalizes for rapid pediatric skeletal and endocrine growth dynamics.`;
      } else {
        fallbackReply = generateGovernmentGroundedResponse(query);
        fallbackCitations = [
          {
            category: '1. Indian Government Portals',
            content: 'ICMR-NIN 2020: https://www.icmr.nic.in | Ministry of AYUSH: https://main.ayush.gov.in',
          },
          {
            category: '2. World Health Organization (WHO)',
            content: 'WHO Nutritional Anemias Guidance: https://www.who.int',
          },
          {
            category: '3. US Government / NIH',
            content: 'US NIH Office of Dietary Supplements: https://ods.od.nih.gov',
          },
        ];
        setConversationState('IDLE');
        setPendingProfileUpdates(null);
        setPendingCandidate(null);
        setCurrentCandidates([]);
        setExpandedRemedy(null);
        setActiveRemedyList([]);
      }

      addChatMessage({
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: fallbackCitations,
        toolExecuted: toolExecData,
      });
    } finally {
      setAiThinking(false);
    }
  }, [
    isAiThinking,
    conversationState,
    currentCandidates,
    pendingCandidate,
    pendingProfileUpdates,
    remedyTypeSelection,
    remedyVectorSelection,
    expandedRemedy,
    labs,
    demographics,
    selectedSymptoms,
    dailyHabits,
    meals,
    lifestyle,
    addChatMessage,
    updateLabs,
    updateSelectedSymptoms,
    addMeal,
    addHabit,
    updateDemographics,
    setActiveTab,
    setMealEntryMode,
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#F43F5E]">
          AI Care Companion
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Grounded Clinical & Lifestyle AI Agent
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Powered by Gemini with real-time tool execution, strict safety guardrails, and citation hierarchy.
        </p>
      </div>

      {/* Main Chat Window Card */}
      <div
        id="chat-interface-container"
        className="rounded-3xl bg-[#FFF5F7] border border-[#FCE7F3] shadow-sm flex flex-col h-[650px] overflow-hidden"
      >
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {deferredMessages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              msg={msg}
              setActiveTab={setActiveTab}
              handleSendMessage={handleSendMessage}
              handleSaveCustomMeal={handleSaveCustomMeal}
            />
          ))}

          {isAiThinking && (
            <div className="flex items-center gap-3 max-w-md mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-2xl bg-white flex items-center justify-center border border-[#FCE7F3]">
                <MahuaEmblem size={24} />
              </div>
              <div className="rounded-2xl bg-[#FCE7F3] p-4 text-xs font-semibold text-slate-700 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#F43F5E]" />
                <span>Synthesizing clinical guidelines and your biomarkers...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Pills Bar */}
        <div className="p-3 bg-white/70 border-t border-[#FCE7F3] overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 ml-1">
            Try asking:
          </span>
          {suggestedPrompts.map((prompt, pIdx) => (
            <button
              key={pIdx}
              id={`btn-suggested-prompt-${pIdx}`}
              onClick={() => handleSendMessage(prompt)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#FFF5F7] text-slate-700 text-xs font-medium border border-[#FCE7F3] whitespace-nowrap transition-colors cursor-pointer shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <ChatInput onSend={handleSendMessage} disabled={isAiThinking} />
      </div>
    </div>
  );
};

export default AiChatCompanion;

