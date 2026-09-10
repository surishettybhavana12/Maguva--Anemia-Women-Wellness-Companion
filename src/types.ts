export type FlowIntensity = 'Light' | 'Normal' | 'Heavy' | 'Clotting';
export type CycleRegularity = 'Regular' | 'Irregular' | 'Absent';
export type CrampSeverity = 'None' | 'Moderate' | 'Severe';
export type RiskTier = 'Low' | 'Moderate' | 'High';
export type CareStage = 1 | 2 | 3 | 4;

export type AppTab =
  | 'dashboard'
  | 'vector'
  | 'risks'
  | 'ayush'
  | 'meals'
  | 'tracker'
  | 'sources'
  | 'aiAgent';

export interface Demographics {
  name: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  sex?: 'female' | 'male' | '';
  isPregnant: boolean;
  isLactating: boolean;
  pregnancyTrimester?: 1 | 2 | 3;
}

export interface BmiResult {
  bmi: number;
  category: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity';
  isPediatric: boolean;
  zScore?: number;
  percentile?: number;
  whoCategory?: string;
  asianIndianCategory?: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity';
  asianIndianRange?: string;
  refWeightDifferenceKg?: number;
  refStandardWeightKg?: number;
  refStandardHeightCm?: number;
  growthMilestone?: string;
  interpretation: string;
}

export interface MenstrualHealth {
  flowIntensity?: FlowIntensity | '';
  crampSeverity?: CrampSeverity | '';
  cycleRegularity?: CycleRegularity | '';
  cycleLengthDays?: number;
  bleedingDays?: number;
  hasDysmenorrhea: boolean;
  hasSpotting?: boolean;
  recentChanges?: string;
}

export interface LifestyleMetabolic {
  sleepHours?: number;
  sleepQuality?: 'Poor' | 'Fair' | 'Good' | 'Optimal' | '';
  stressScore?: number; // 1 - 10
  anxietyScore?: number; // 1 - 10
  activityLevel?: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | '';
  dailyWaterLitres?: number;
  dietaryPattern?: 'Vegetarian' | 'Vegan' | 'Eggetarian' | 'Non-Vegetarian';
}

export interface GutHealth {
  hasGas: boolean;
  hasAcidity: boolean;
  hasBloating: boolean;
  hasConstipation: boolean;
  hasDiarrhea: boolean;
  hasIBS: boolean;
  hasIndigestion: boolean;
  frequentAntacidUse: boolean;
  hPyloriHistory: boolean;
  teaCoffeeWithMeals: boolean;
  userToleranceNotes?: string;
}

export interface CustomBloodTest {
  id: string;
  testName: string;
  value: number | string;
  unit: string;
  referenceRange?: string;
  status?: string;
  category?: 'CBC' | 'Iron' | 'Micronutrient' | 'Hormonal' | 'Metabolic' | 'Other';
  dateRecorded?: string;
}

export interface LabDataPanel {
  // CBC
  hemoglobin?: number; // g/dL (normal ~12.0 - 15.5 for women)
  rbc?: number; // M/µL (normal 4.2 - 5.4)
  hematocrit?: number; // % (normal 37 - 48%)
  mcv?: number; // fL (normal 80 - 100)
  mch?: number; // pg (normal 27 - 33)
  mchc?: number; // g/dL (normal 32 - 36)
  rdw?: number; // % (normal 11.5 - 14.5%)
  plateletCount?: number; // x10^3/µL (normal 150 - 450)
  wbcCount?: number; // x10^3/µL (normal 4.0 - 11.0)
  
  // Iron Studies
  serumFerritin?: number; // ng/mL (normal 15 - 150)
  serumIron?: number; // µg/dL (normal 60 - 170)
  tibc?: number; // µg/dL (normal 240 - 450)
  transferrinSaturation?: number; // % (normal 20 - 50%)
  transferrin?: number; // mg/dL (normal 200 - 360)
  
  // Micronutrients
  vitaminB12?: number; // pg/mL (normal 200 - 900)
  vitaminD?: number; // ng/mL (normal 30 - 100)
  folateB9?: number; // ng/mL (normal 4.0 - 20.0)
  vitaminC?: number; // mg/dL (normal 0.4 - 2.0 mg/dL)
  
  customBloodTests?: CustomBloodTest[];

  // Explicit tracking of skipped lab tests (Never dummy numbers)
  skippedTests?: string[];
  labStatus?: 'Verified' | 'User_Skipped' | 'Partial_Skipped' | 'Pending';

  dateRecorded?: string;
  labSource?: string;
  labNotes?: string;
}

export interface SevereSymptoms {
  severeBreathlessness: boolean;
  chestPain: boolean;
  faintingOrSyncope: boolean;
  extremeFatigueImmobile: boolean;
}

export interface SymptomDetail {
  id: string;
  name: string;
  category: 'Iron' | 'B12' | 'Folate' | 'VitaminD' | 'Digestive';
  severity: 'Mild' | 'Moderate' | 'Severe';
  frequency: 'Occasional' | 'Daily' | 'Constant';
  durationWeeks?: number;
  active: boolean;
}

export interface VerifiedSourceRef {
  title: string;
  organization: string;
  url: string;
  topic?: string;
}

export interface SymptomImpactDetail {
  name: string;
  impactPercent: number;
  category?: 'symptom' | 'menstrual' | 'demographic' | 'gut' | 'lifestyle';
}

export interface DeficiencyRisk {
  id: 'iron' | 'b12' | 'folate' | 'vitaminD';
  ruleId: string;
  name: string;
  riskTier: RiskTier;
  riskScore: number; // 0 to 100
  probabilityPercent: number; // 0 to 100%
  confidencePercent: number; // e.g. 50% for symptom-only, 70% for missing test, 100% for verified labs
  confidenceNote: string; // e.g. "Symptom-Based Estimate (No Lab Data Verified)", "Moderate Risk - 70% Confidence due to missing Ferritin test"
  isSymptomOnlyEstimate: boolean;
  isPartialLabVerified: boolean;
  skippedTests: string[];
  clinicalMarkers: string[];
  clinicalImpacts?: SymptomImpactDetail[];
  symptomMatches: string[];
  symptomImpacts?: SymptomImpactDetail[];
  symptomMatchCount: number;
  totalCategorySymptoms: number;
  gutAbsorptionFactor?: string;
  missingInformation: string[];
  biomarkerSummary: string;
  recommendedTests: string[];
  dietaryFocus: string[];
  verifiedSources: VerifiedSourceRef[];
  urgencyLevel: 'Routine' | 'Moderate Attention' | 'High Clinical Concern';
}

export interface RemedyReview {
  id: string;
  remedyId: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
  helpfulCount?: number;
  userTag?: string; // e.g. "Iron Recovery", "Gut Optimization", "Energy Boost", "Clinical Practitioner"
  verifiedBadge?: boolean;
}

export interface AyushRemedy {
  id: string;
  name: string;
  sanskritName: string;
  botanicalName: string;
  category: string;
  remedyType?: 'AYUSH' | 'OTHERS';
  targetDeficiency: ('iron' | 'b12' | 'folate' | 'vitaminD' | 'gut')[];
  primaryBenefits: string[];
  clinicalEvidence?: string;
  howToConsume: string;
  optimalTiming: string;
  contraindications: string;
  localSourcing: string;
  seasonalAvailability: string;
  rating: number; // user rating 1-5
  userNotes: string;
  officialAyushLink: string;
  researchLinks?: { label: string; url: string }[];
  addedToHabits: boolean;
}

export interface DailyHabit {
  id: string;
  title: string;
  category: 'Gut Optimization' | 'AYUSH Rasayana' | 'Iron Synergy' | 'Lifestyle';
  description: string;
  timing: string;
  completed: boolean;
  sourceId?: string;
}

export interface MealItem {
  id: string;
  name: string;
  portion: string;
  ironMg: number;
  b12Mcg: number;
  folateMcg: number;
  vitaminDMcg: number;
  vitaminCMg?: number;
  proteinG?: number;
  calciumMg?: number;
  zincMg?: number;
  calories?: number;
  mealType: 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
  absorptionBoosters: string[];
  absorptionBlockers: string[];
  timestamp: string;
  notes?: string;
}

export interface RdaBaseline {
  ironMg: number;
  b12Mcg: number;
  folateMcg: number;
  vitaminCMg: number;
  vitaminDMcg: number;
  calciumMg: number;
  ironEarMg?: number;
  zincMg?: number;
  zincEarMg?: number;
  proteinG?: number;
  dietaryFiberG?: number;
  vitaminAMcg?: number;
  folateEarMcg?: number;
  b12EarMcg?: number;
}

export interface MedicalSource {
  id: string;
  title: string;
  organization: string;
  topic: 'Anemia & Iron Studies' | 'Pediatric WHO LMS' | 'Micronutrient RDAs' | 'AYUSH Rasayanas' | 'Bioavailability Kinetics' | 'B12 & Folate';
  publicationYear: string;
  evidenceType: string;
  url: string;
  summary: string;
  keySnippets: string[];
}

export interface GroundedCitation {
  category:
    | 'Data From Your Profile'
    | 'Government of India Medical Guidelines'
    | 'WHO & International Health Guidance'
    | 'General Health Reference'
    | '1. Indian Government Portals'
    | '2. World Health Organization (WHO)'
    | '3. US Government / NIH'
    | string;
  content: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  citations?: GroundedCitation[];
  toolExecuted?: {
    toolName: string;
    args: Record<string, any>;
    resultSummary: string;
  };
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  createdAt: string;
  lastLoginAt?: string;
  age?: number;
  avatarColor?: string;
}

export interface HealthRecordEntry {
  id: string;
  date: string; // ISO date format YYYY-MM-DD or full timestamp
  title?: string;
  notes?: string;
  source?: string;
  
  // Physical measurements
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  
  // Blood Test Biomarkers
  hemoglobin?: number; // g/dL
  serumFerritin?: number; // ng/mL
  serumIron?: number; // µg/dL
  tibc?: number; // µg/dL
  transferrinSaturation?: number; // %
  vitaminB12?: number; // pg/mL
  vitaminD?: number; // ng/mL
  folateB9?: number; // ng/mL
  vitaminC?: number; // mg/dL
  rbc?: number; // M/µL
  hematocrit?: number; // %
  mcv?: number; // fL
  mch?: number; // pg
  mchc?: number; // g/dL
  rdw?: number; // %
  plateletCount?: number; // x10^3/µL
  wbcCount?: number; // x10^3/µL

  // Active interventions during this period
  medicationsOrSupplements?: string[]; // e.g. "Ferrous Ascorbate 100mg", "B12 Sublingual"
  dietaryPlanAdherence?: 'Strict' | 'Moderate' | 'Occasional' | 'Starting';
  ayushRemediesUsed?: string[]; // e.g. "Draksharishta", "Amla & Halim"
  
  // Overall symptom score / energy score 1-10
  energyScore?: number; // 1 to 10
}
