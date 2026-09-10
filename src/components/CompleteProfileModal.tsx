import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  Scale,
  Calendar,
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Stethoscope,
  Droplets,
  Activity,
  Zap,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  FileSpreadsheet,
  Info,
  ShieldCheck,
  Check,
  Award,
  ChevronRight,
  HeartPulse,
  Flame,
  ShieldAlert,
  TrendingUp,
  Sun,
  RotateCcw,
} from 'lucide-react';
import { useHealthStore } from '../store/useHealthStore';
import { MahuaEmblem } from './MahuaEmblem';
import { cmToFeetInches, feetInchesToCm, formatHeightFtIn } from '../utils/heightConverter';
import { LabDataPanel, Demographics, SevereSymptoms, MenstrualHealth, GutHealth, DeficiencyRisk } from '../types';
import { calculateAllDeficiencyRisks } from '../utils/riskEngine';
import { getIcmrNin2020Baseline } from '../data/icmrNinRda2020';
import { saveUserProfileToFirestore } from '../services/authService';
import { SymptomsStepForm, COMMON_SYMPTOMS_LIST } from './SymptomsStepForm';
import { compressAndPrepareImage } from '../utils/imageCompressor';

interface CompleteProfileModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isInitialOnboarding?: boolean;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen = true,
  onClose,
  isInitialOnboarding = false,
}) => {
  const demographics = useHealthStore((state) => state.demographics);
  const updateDemographics = useHealthStore((state) => state.updateDemographics);
  const labs = useHealthStore((state) => state.labs);
  const updateLabs = useHealthStore((state) => state.updateLabs);
  const severeSymptoms = useHealthStore((state) => state.severeSymptoms);
  const updateSevereSymptoms = useHealthStore((state) => state.updateSevereSymptoms);
  const menstrual = useHealthStore((state) => state.menstrual);
  const updateMenstrual = useHealthStore((state) => state.updateMenstrual);
  const gut = useHealthStore((state) => state.gut);
  const updateGut = useHealthStore((state) => state.updateGut);
  const storeSymptoms = useHealthStore((state) => state.selectedSymptoms);
  const updateSelectedSymptoms = useHealthStore((state) => state.updateSelectedSymptoms);
  const addHealthRecordEntry = useHealthStore((state) => state.addHealthRecordEntry);
  const currentUser = useHealthStore((state) => state.currentUser);
  const setProfileCompleted = useHealthStore((state) => state.setProfileCompleted);
  const setProfileModalOpen = useHealthStore((state) => state.setProfileModalOpen);

  // Wizard active step: 1 (Demographics & Life Stage), 2 (Vitals & Calculations), 3 (Symptoms & Clinical Signs), 4 (Optional Labs/OCR), 5 (Confirmation)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Step 1: Personal Demographics states
  const [name, setName] = useState(demographics?.name || currentUser?.name || '');
  const [age, setAge] = useState<number | ''>(demographics?.age ?? currentUser?.age ?? '');
  const [gender, setGender] = useState<'female' | 'male' | ''>(demographics?.sex || '');
  const [isPregnant, setIsPregnant] = useState<boolean>(demographics?.isPregnant || false);
  const [pregnancyTrimester, setPregnancyTrimester] = useState<number>(demographics?.pregnancyTrimester || 1);
  const [isLactating, setIsLactating] = useState<boolean>(demographics?.isLactating || false);

  // Step 2: Physical Vitals & Units
  const [heightCm, setHeightCm] = useState<number | ''>(demographics?.heightCm ?? '');
  const [weightKg, setWeightKg] = useState<number | ''>(demographics?.weightKg ?? '');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Step 3: Symptoms & Clinical Signs state
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    storeSymptoms && storeSymptoms.length > 0
      ? storeSymptoms
      : []
  );
  const [localSevere, setLocalSevere] = useState<SevereSymptoms>({
    severeBreathlessness: severeSymptoms?.severeBreathlessness || false,
    chestPain: severeSymptoms?.chestPain || false,
    faintingOrSyncope: severeSymptoms?.faintingOrSyncope || false,
    extremeFatigueImmobile: severeSymptoms?.extremeFatigueImmobile || false,
  });
  const [localMenstrual, setLocalMenstrual] = useState<MenstrualHealth>({
    flowIntensity: menstrual?.flowIntensity || '',
    crampSeverity: menstrual?.crampSeverity || (menstrual?.hasDysmenorrhea ? 'Severe' : ''),
    hasDysmenorrhea: menstrual?.hasDysmenorrhea ?? false,
    cycleRegularity: menstrual?.cycleRegularity || '',
    cycleLengthDays: menstrual?.cycleLengthDays || undefined,
    bleedingDays: menstrual?.bleedingDays || undefined,
    hasSpotting: menstrual?.hasSpotting ?? false,
    recentChanges: menstrual?.recentChanges || '',
  });
  const [localGut, setLocalGut] = useState<GutHealth>({
    hasGas: gut?.hasGas ?? false,
    hasAcidity: gut?.hasAcidity ?? false,
    hasBloating: gut?.hasBloating ?? false,
    hasConstipation: gut?.hasConstipation ?? false,
    hasDiarrhea: gut?.hasDiarrhea ?? false,
    hasIBS: gut?.hasIBS ?? false,
    hasIndigestion: gut?.hasIndigestion ?? false,
    frequentAntacidUse: gut?.frequentAntacidUse ?? false,
    hPyloriHistory: gut?.hPyloriHistory ?? false,
    teaCoffeeWithMeals: gut?.teaCoffeeWithMeals ?? false,
    userToleranceNotes: gut?.userToleranceNotes || '',
  });

  // Sync local states when store updates (e.g. from chat AI actions or external edits)
  // Guarded by deterministic primitive keys to prevent object reference re-render loops
  const storeSymptomsKey = JSON.stringify(storeSymptoms || []);
  useEffect(() => {
    setSelectedSymptoms(storeSymptoms || []);
  }, [storeSymptomsKey]);

  const gutKey = JSON.stringify(gut || {});
  useEffect(() => {
    setLocalGut({
      hasGas: gut?.hasGas ?? false,
      hasAcidity: gut?.hasAcidity ?? false,
      hasBloating: gut?.hasBloating ?? false,
      hasConstipation: gut?.hasConstipation ?? false,
      hasDiarrhea: gut?.hasDiarrhea ?? false,
      hasIBS: gut?.hasIBS ?? false,
      hasIndigestion: gut?.hasIndigestion ?? false,
      frequentAntacidUse: gut?.frequentAntacidUse ?? false,
      hPyloriHistory: gut?.hPyloriHistory ?? false,
      teaCoffeeWithMeals: gut?.teaCoffeeWithMeals ?? false,
      userToleranceNotes: gut?.userToleranceNotes || '',
    });
  }, [gutKey]);

  const severeSymptomsKey = JSON.stringify(severeSymptoms || {});
  useEffect(() => {
    setLocalSevere({
      severeBreathlessness: severeSymptoms?.severeBreathlessness || false,
      chestPain: severeSymptoms?.chestPain || false,
      faintingOrSyncope: severeSymptoms?.faintingOrSyncope || false,
      extremeFatigueImmobile: severeSymptoms?.extremeFatigueImmobile || false,
    });
  }, [severeSymptomsKey]);

  const demographicsKey = JSON.stringify(demographics || {});
  const currentUserId = currentUser?.id || '';
  const currentUserName = currentUser?.name || '';
  const currentUserAge = currentUser?.age;
  useEffect(() => {
    if (demographics) {
      setName(demographics.name || currentUserName || '');
      setAge(demographics.age ?? currentUserAge ?? '');
      setGender(demographics.sex || '');
      setIsPregnant(demographics.isPregnant || false);
      setPregnancyTrimester(demographics.pregnancyTrimester || 1);
      setIsLactating(demographics.isLactating || false);
      setHeightCm(demographics.heightCm ?? '');
      setWeightKg(demographics.weightKg ?? '');
    }
  }, [demographicsKey, currentUserId, currentUserName, currentUserAge]);

  const menstrualKey = JSON.stringify(menstrual || {});
  useEffect(() => {
    if (menstrual) {
      setLocalMenstrual({
        flowIntensity: menstrual.flowIntensity || '',
        crampSeverity: menstrual.crampSeverity || (menstrual.hasDysmenorrhea ? 'Severe' : ''),
        hasDysmenorrhea: menstrual.hasDysmenorrhea ?? false,
        cycleRegularity: menstrual.cycleRegularity || '',
        cycleLengthDays: menstrual.cycleLengthDays || undefined,
        bleedingDays: menstrual.bleedingDays || undefined,
        hasSpotting: menstrual.hasSpotting ?? false,
        recentChanges: menstrual.recentChanges || '',
      });
    }
  }, [menstrualKey]);

  const handleToggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Step 3: Form states for Supported Blood Test Panels
  const initialSkipped = labs.skippedTests || (labs.labStatus === 'User_Skipped' ? [
    'hemoglobin', 'rbc', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw',
    'plateletCount', 'wbcCount', 'serumIron', 'serumFerritin', 'tibc',
    'transferrinSaturation', 'vitaminB12', 'vitaminD', 'folateB9', 'vitaminC'
  ] : []);
  const [skippedTests, setSkippedTests] = useState<string[]>(initialSkipped);

  // 1. CBC
  const isHbSkipped = initialSkipped.includes('hemoglobin');
  const [hemoglobin, setHemoglobin] = useState<string>(!isHbSkipped && labs.hemoglobin !== undefined && labs.hemoglobin !== null ? String(labs.hemoglobin) : '');
  const [rbc, setRbc] = useState<string>(!initialSkipped.includes('rbc') && labs.rbc !== undefined && labs.rbc !== null ? String(labs.rbc) : '');
  const [hematocrit, setHematocrit] = useState<string>(!initialSkipped.includes('hematocrit') && labs.hematocrit !== undefined && labs.hematocrit !== null ? String(labs.hematocrit) : '');
  const [mcv, setMcv] = useState<string>(!initialSkipped.includes('mcv') && labs.mcv !== undefined && labs.mcv !== null ? String(labs.mcv) : '');
  const [mch, setMch] = useState<string>(!initialSkipped.includes('mch') && labs.mch !== undefined && labs.mch !== null ? String(labs.mch) : '');
  const [mchc, setMchc] = useState<string>(!initialSkipped.includes('mchc') && labs.mchc !== undefined && labs.mchc !== null ? String(labs.mchc) : '');
  const [rdw, setRdw] = useState<string>(!initialSkipped.includes('rdw') && labs.rdw !== undefined && labs.rdw !== null ? String(labs.rdw) : '');
  const [plateletCount, setPlateletCount] = useState<string>(!initialSkipped.includes('plateletCount') && labs.plateletCount !== undefined && labs.plateletCount !== null ? String(labs.plateletCount) : '');
  const [wbcCount, setWbcCount] = useState<string>(!initialSkipped.includes('wbcCount') && labs.wbcCount !== undefined && labs.wbcCount !== null ? String(labs.wbcCount) : '');

  // 2. Iron Studies
  const [serumIron, setSerumIron] = useState<string>(!initialSkipped.includes('serumIron') && labs.serumIron !== undefined && labs.serumIron !== null ? String(labs.serumIron) : '');
  const [serumFerritin, setSerumFerritin] = useState<string>(!initialSkipped.includes('serumFerritin') && labs.serumFerritin !== undefined && labs.serumFerritin !== null ? String(labs.serumFerritin) : '');
  const [tibc, setTibc] = useState<string>(!initialSkipped.includes('tibc') && labs.tibc !== undefined && labs.tibc !== null ? String(labs.tibc) : '');
  const [transferrinSaturation, setTransferrinSaturation] = useState<string>(
    !initialSkipped.includes('transferrinSaturation') && labs.transferrinSaturation !== undefined && labs.transferrinSaturation !== null ? String(labs.transferrinSaturation) : ''
  );

  // 3. Vitamin B12
  const [vitaminB12, setVitaminB12] = useState<string>(!initialSkipped.includes('vitaminB12') && labs.vitaminB12 !== undefined && labs.vitaminB12 !== null ? String(labs.vitaminB12) : '');

  // 4. Vitamin D
  const [vitaminD, setVitaminD] = useState<string>(!initialSkipped.includes('vitaminD') && labs.vitaminD !== undefined && labs.vitaminD !== null ? String(labs.vitaminD) : '');

  // 5. Folate
  const [folateB9, setFolateB9] = useState<string>(!initialSkipped.includes('folateB9') && labs.folateB9 !== undefined && labs.folateB9 !== null ? String(labs.folateB9) : '');

  // 6. Vitamin C
  const [vitaminC, setVitaminC] = useState<string>(!initialSkipped.includes('vitaminC') && labs.vitaminC !== undefined && labs.vitaminC !== null ? String(labs.vitaminC) : '');

  // Handler to skip an individual test (Never dummy number; set to empty & track in skippedTests)
  const handleSkipSingleTest = (key: string, clearStateFn: (val: string) => void) => {
    clearStateFn('');
    setSkippedTests((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  // Handler to unskip an individual test and restore focus
  const handleUnskipSingleTest = (key: string, defaultVal: string, setStateFn: (val: string) => void) => {
    setStateFn(defaultVal);
    setSkippedTests((prev) => prev.filter((k) => k !== key));
  };

  // Handler to skip all blood tests
  const handleSkipAllBloodTests = () => {
    setHemoglobin('');
    setRbc('');
    setHematocrit('');
    setMcv('');
    setMch('');
    setMchc('');
    setRdw('');
    setPlateletCount('');
    setWbcCount('');
    setSerumIron('');
    setSerumFerritin('');
    setTibc('');
    setTransferrinSaturation('');
    setVitaminB12('');
    setVitaminD('');
    setFolateB9('');
    setVitaminC('');
    setSkippedTests([
      'hemoglobin', 'rbc', 'hematocrit', 'mcv', 'mch', 'mchc', 'rdw',
      'plateletCount', 'wbcCount', 'serumIron', 'serumFerritin', 'tibc',
      'transferrinSaturation', 'vitaminB12', 'vitaminD', 'folateB9', 'vitaminC'
    ]);
  };

  // Handler to restore default baseline blood tests
  const handleRestoreDefaultBloodTests = () => {
    setHemoglobin('10.8');
    setRbc('4.1');
    setHematocrit('33.5');
    setMcv('78.5');
    setMch('25.0');
    setMchc('31.2');
    setRdw('15.8');
    setPlateletCount('265');
    setWbcCount('6.8');
    setSerumIron('52');
    setSerumFerritin('14.2');
    setTibc('390');
    setTransferrinSaturation('13.3');
    setVitaminB12('195');
    setVitaminD('19.5');
    setFolateB9('5.2');
    setVitaminC('0.8');
    setSkippedTests([]);
  };

  // Document Upload and OCR states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [ocrSuccessMsg, setOcrSuccessMsg] = useState<string | null>(null);
  const [ocrErrorMsg, setOcrErrorMsg] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [activeTabSection, setActiveTabSection] = useState<'all' | 'cbc' | 'iron' | 'vitamins'>('all');
  const [justSaved, setJustSaved] = useState<boolean>(false);

  // Helper to parse numbers safely
  const parseNum = (val: string): number | undefined => {
    if (!val || val.trim() === '') return undefined;
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  };

  // --- Real-Time Interactive Calculations ---
  const hasValidVitals = Boolean(heightCm && weightKg && Number(heightCm) > 0 && Number(weightKg) > 0);
  const heightM = heightCm && Number(heightCm) > 0 ? Number(heightCm) / 100 : null;
  const currentBmi = hasValidVitals && heightM ? Number(weightKg) / (heightM * heightM) : null;

  // Asian Indian vs WHO classification
  let bmiCategory: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity' | 'Pending Vitals' = 'Pending Vitals';
  let asianIndianCategory = 'Pending Vitals';
  let bmiColorClass = 'text-slate-15 bg-slate-100 border-slate-200';

  if (currentBmi !== null) {
    if (currentBmi < 18.5) {
      bmiCategory = 'Underweight';
      asianIndianCategory = 'Underweight (<18.5)';
      bmiColorClass = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (currentBmi <= 22.9) {
      bmiCategory = 'Normal weight';
      asianIndianCategory = 'Normal Weight (18.5–22.9)';
      bmiColorClass = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    } else if (currentBmi <= 27.4) {
      bmiCategory = 'Overweight';
      asianIndianCategory = 'Overweight (23.0–27.4)';
      bmiColorClass = 'text-rose-700 bg-rose-50 border-rose-200';
    } else {
      bmiCategory = 'Obesity';
      asianIndianCategory = 'Obesity (≥27.5)';
      bmiColorClass = 'text-red-20 bg-red-50 border-red-200';
    }
  }

  // Ideal weight range for height (BMI 18.5 - 22.9)
  const minIdealWeight = heightM ? (18.5 * heightM * heightM).toFixed(1) : null;
  const maxIdealWeight = heightM ? (22.9 * heightM * heightM).toFixed(1) : null;

  // ICMR-NIN 2020 RDA calculations using getIcmrNin2020Baseline utility
  const { profile: baselineProfile, baseline: activeBaseline } = useMemo(() => {
    return getIcmrNin2020Baseline({
      name: name.trim(),
      age: age ? Number(age) : 30,
      heightCm: heightCm ? Number(heightCm) : 162,
      weightKg: weightKg ? Number(weightKg) : 54,
      sex: gender,
      isPregnant,
      isLactating,
      pregnancyTrimester: isPregnant ? (pregnancyTrimester as 1 | 2 | 3) : undefined,
    });
  }, [name, age, heightCm, weightKg, gender, isPregnant, isLactating, pregnancyTrimester]);

  const hasDemographics = Boolean(gender && age && Number(age) > 0);
  const calculatedIronRda = activeBaseline.ironMg;
  const calculatedIronEar = activeBaseline.ironEarMg;
  const calculatedFolateRda = activeBaseline.folateMcg;
  const calculatedB12Rda = activeBaseline.b12Mcg;
  const calculatedProteinRda = activeBaseline.proteinG;
  const cohortLabel = hasDemographics
    ? baselineProfile.cohortName
    : 'Pending Demographics (Set in Step 1)';

  // WHO Anemia Cutoff
  const anemiaCutoff = isPregnant ? 11.0 : (age && Number(age) < 12) ? 11.5 : 12.0;

  // Store lifestyle state
  const storeLifestyle = useHealthStore((state) => state.lifestyle);

  // Live parsed lab data panel from current wizard inputs
  const currentLabsPanel: LabDataPanel = useMemo(() => {
    const parseNum = (v: string) => {
      if (!v || v.trim() === '') return undefined;
      const parsed = parseFloat(v);
      return isNaN(parsed) ? undefined : parsed;
    };
    const isAllSkipped = skippedTests.length >= 17;
    return {
      hemoglobin: parseNum(hemoglobin),
      rbc: parseNum(rbc),
      hematocrit: parseNum(hematocrit),
      mcv: parseNum(mcv),
      mch: parseNum(mch),
      mchc: parseNum(mchc),
      rdw: parseNum(rdw),
      plateletCount: parseNum(plateletCount),
      wbcCount: parseNum(wbcCount),
      serumIron: parseNum(serumIron),
      serumFerritin: parseNum(serumFerritin),
      tibc: parseNum(tibc),
      transferrinSaturation: parseNum(transferrinSaturation),
      vitaminB12: parseNum(vitaminB12),
      vitaminD: parseNum(vitaminD),
      folateB9: parseNum(folateB9),
      vitaminC: parseNum(vitaminC),
      skippedTests: skippedTests,
      labStatus: isAllSkipped ? 'User_Skipped' : skippedTests.length > 0 ? 'Partial_Skipped' : 'Verified',
    };
  }, [
    hemoglobin, rbc, hematocrit, mcv, mch, mchc, rdw,
    plateletCount, wbcCount, serumIron, serumFerritin,
    tibc, transferrinSaturation, vitaminB12, vitaminD, folateB9, vitaminC,
    skippedTests
  ]);

  // Comprehensive Multi-Pillar Deficiency Risk Calculation across all 4 domains:
  // 1. Gut Issues + 2. Period Dynamics + 3. Clinical Symptoms + 4. Blood Tests
  const finalDeficiencyRisks: DeficiencyRisk[] = useMemo(() => {
    const activeDemo: Demographics = {
      ...demographics,
      name,
      age: age ? Number(age) : undefined,
      sex: gender,
      isPregnant,
      isLactating,
      pregnancyTrimester: isPregnant ? (pregnancyTrimester as 1 | 2 | 3) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
    };
    return calculateAllDeficiencyRisks(
      activeDemo,
      localMenstrual,
      storeLifestyle,
      localGut,
      currentLabsPanel,
      selectedSymptoms
    );
  }, [
    demographics,
    name,
    age,
    gender,
    isPregnant,
    pregnancyTrimester,
    isLactating,
    heightCm,
    weightKg,
    localMenstrual,
    storeLifestyle,
    localGut,
    currentLabsPanel,
    selectedSymptoms
  ]);

  const topPriorityRisk = useMemo(() => {
    return [...finalDeficiencyRisks].sort((a, b) => b.probabilityPercent - a.probabilityPercent)[0];
  }, [finalDeficiencyRisks]);

  const averageCompositeRisk = useMemo(() => {
    if (finalDeficiencyRisks.length === 0) return 0;
    const sum = finalDeficiencyRisks.reduce((acc, r) => acc + r.probabilityPercent, 0);
    return Math.round(sum / finalDeficiencyRisks.length);
  }, [finalDeficiencyRisks]);

  // File change handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      setOcrErrorMsg('Please upload a valid blood test report (PDF, JPG, PNG, or WEBP).');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setOcrErrorMsg('File size exceeds 20MB limit. Please upload a smaller scan.');
      return;
    }

    setSelectedFile(file);
    setOcrErrorMsg(null);
    setOcrSuccessMsg(null);

    // Pre-compress preview for fast rendering
    try {
      const prepared = await compressAndPrepareImage(file, 1600, 1600, 0.80);
      setFilePreview(prepared.base64Data);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleParseReport = async () => {
    // 1. Request Guard to prevent double submit or re-render firing loops
    if (isParsing) return;

    if (!selectedFile && !filePreview) {
      setOcrErrorMsg('Please select or drag-and-drop a lab test PDF or image first.');
      return;
    }

    setIsParsing(true);
    setOcrErrorMsg(null);
    setOcrSuccessMsg(null);
    setExtractedFields([]);

    try {
      // 2. Client-Side Image Compression & Resizing (max 1600x1600, 0.80 quality)
      let base64Data = filePreview || '';
      let mimeType = selectedFile?.type || (selectedFile?.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      if (selectedFile) {
        const compressed = await compressAndPrepareImage(selectedFile, 1600, 1600, 0.80);
        base64Data = compressed.base64Data;
        mimeType = compressed.mimeType;
      }

      const response = await fetch('/api/parse-lab-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: mimeType,
          fileName: selectedFile?.name || 'lab-report',
        }),
      });

      const data = await response.json();

      // 3. Graceful Error Handling & 429 Status
      if (!response.ok || data.quotaExceeded || response.status === 429) {
        const friendlyMsg = data.error || 'AI Lab Report OCR service is currently experiencing API rate limits. Please wait a moment or enter your lab values manually below.';
        setOcrErrorMsg(friendlyMsg);
        return;
      }

      if (data.success && data.labs) {
        const detectedKeys: string[] = [];

        if (data.patient?.name && !name) {
          setName(data.patient.name);
          detectedKeys.push('Patient Name');
        }
        if (data.patient?.age) {
          setAge(Number(data.patient.age));
          detectedKeys.push('Age');
        }
        if (data.patient?.gender) {
          setGender(data.patient.gender === 'male' ? 'male' : 'female');
          detectedKeys.push('Gender');
        }

        if (data.labs.hemoglobin !== null && data.labs.hemoglobin !== undefined) {
          setHemoglobin(String(data.labs.hemoglobin));
          detectedKeys.push('Hemoglobin');
        }
        if (data.labs.rbc !== null && data.labs.rbc !== undefined) {
          setRbc(String(data.labs.rbc));
          detectedKeys.push('RBC');
        }
        if (data.labs.hematocrit !== null && data.labs.hematocrit !== undefined) {
          setHematocrit(String(data.labs.hematocrit));
          detectedKeys.push('Hematocrit');
        }
        if (data.labs.mcv !== null && data.labs.mcv !== undefined) {
          setMcv(String(data.labs.mcv));
          detectedKeys.push('MCV');
        }
        if (data.labs.mch !== null && data.labs.mch !== undefined) {
          setMch(String(data.labs.mch));
          detectedKeys.push('MCH');
        }
        if (data.labs.mchc !== null && data.labs.mchc !== undefined) {
          setMchc(String(data.labs.mchc));
          detectedKeys.push('MCHC');
        }
        if (data.labs.rdw !== null && data.labs.rdw !== undefined) {
          setRdw(String(data.labs.rdw));
          detectedKeys.push('RDW');
        }
        if (data.labs.plateletCount !== null && data.labs.plateletCount !== undefined) {
          setPlateletCount(String(data.labs.plateletCount));
          detectedKeys.push('Platelets');
        }
        if (data.labs.wbcCount !== null && data.labs.wbcCount !== undefined) {
          setWbcCount(String(data.labs.wbcCount));
          detectedKeys.push('WBC Count');
        }

        if (data.labs.serumIron !== null && data.labs.serumIron !== undefined) {
          setSerumIron(String(data.labs.serumIron));
          detectedKeys.push('Serum Iron');
        }
        if (data.labs.serumFerritin !== null && data.labs.serumFerritin !== undefined) {
          setSerumFerritin(String(data.labs.serumFerritin));
          detectedKeys.push('Serum Ferritin');
        }
        if (data.labs.tibc !== null && data.labs.tibc !== undefined) {
          setTibc(String(data.labs.tibc));
          detectedKeys.push('TIBC');
        }
        if (data.labs.transferrinSaturation !== null && data.labs.transferrinSaturation !== undefined) {
          setTransferrinSaturation(String(data.labs.transferrinSaturation));
          detectedKeys.push('Transferrin Saturation');
        }

        if (data.labs.vitaminB12 !== null && data.labs.vitaminB12 !== undefined) {
          setVitaminB12(String(data.labs.vitaminB12));
          detectedKeys.push('Vitamin B12');
        }
        if (data.labs.vitaminD !== null && data.labs.vitaminD !== undefined) {
          setVitaminD(String(data.labs.vitaminD));
          detectedKeys.push('Vitamin D');
        }
        if (data.labs.folateB9 !== null && data.labs.folateB9 !== undefined) {
          setFolateB9(String(data.labs.folateB9));
          detectedKeys.push('Folate');
        }
        if (data.labs.vitaminC !== null && data.labs.vitaminC !== undefined) {
          setVitaminC(String(data.labs.vitaminC));
          detectedKeys.push('Vitamin C');
        }

        setExtractedFields(detectedKeys);
        setOcrSuccessMsg(
          `✨ Successfully extracted ${detectedKeys.length} biomarkers from ${selectedFile?.name || 'report'}!`
        );
      } else {
        setOcrErrorMsg(data.error || 'Could not detect supported hematology fields. Please verify report clarity or enter values manually.');
      }
    } catch (err: any) {
      console.error('OCR Parsing failed:', err);
      setOcrErrorMsg('Failed to process lab report. Please check your network or enter values manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const saveCurrentProgress = (notify: boolean = false) => {
    // 1. Update demographics in store
    const cleanName = name.trim() || currentUser?.name || '';
    const updatedDemo: Partial<Demographics> = {
      name: cleanName,
      age: age ? Number(age) : undefined,
      sex: gender,
      isPregnant,
      isLactating,
      pregnancyTrimester: isPregnant ? (pregnancyTrimester as 1 | 2 | 3) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
    };
    updateDemographics(updatedDemo);

    // 2. Update user account age/name if present
    const state = useHealthStore.getState();
    if (state.currentUser) {
      state.setUserAccount({
        ...state.currentUser,
        name: cleanName || state.currentUser.name,
        age: age ? Number(age) : undefined,
      });
    }

    // 3. Update severe symptoms, menstrual, gut health, and selected symptoms
    updateSevereSymptoms(localSevere);
    updateMenstrual(localMenstrual);
    updateGut(localGut);
    updateSelectedSymptoms(selectedSymptoms);

    // 4. Update lab values & status
    const isAllSkipped = skippedTests.length >= 17;
    const updatedLabs: Partial<LabDataPanel> = {
      hemoglobin: parseNum(hemoglobin),
      rbc: parseNum(rbc),
      hematocrit: parseNum(hematocrit),
      mcv: parseNum(mcv),
      mch: parseNum(mch),
      mchc: parseNum(mchc),
      rdw: parseNum(rdw),
      plateletCount: parseNum(plateletCount),
      wbcCount: parseNum(wbcCount),
      serumIron: parseNum(serumIron),
      serumFerritin: parseNum(serumFerritin),
      tibc: parseNum(tibc),
      transferrinSaturation: parseNum(transferrinSaturation),
      vitaminB12: parseNum(vitaminB12),
      vitaminD: parseNum(vitaminD),
      folateB9: parseNum(folateB9),
      vitaminC: parseNum(vitaminC),
      skippedTests: skippedTests,
      labStatus: isAllSkipped ? 'User_Skipped' : skippedTests.length > 0 ? 'Partial_Skipped' : 'Verified',
      dateRecorded: new Date().toISOString().split('T')[0],
      labSource: isAllSkipped
        ? 'Skipped by User (Symptom-Only Profile)'
        : selectedFile?.name
        ? `Uploaded Report: ${selectedFile.name}`
        : 'Personal Profile Wizard',
    };
    updateLabs(updatedLabs);

    // 5. Note: useAppSessionManager automatically detects these store updates,
    // immediately persists to local storage, and debounces Firestore sync with a 1000ms guard and isDirty checks.

    if (notify) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2200);
    }
  };

  const handleSaveAndContinue = () => {
    saveCurrentProgress(true);
    setActiveStep((s) => Math.min(s + 1, 5));
  };

  const handleStepNavigation = (targetStep: number) => {
    saveCurrentProgress(false);
    setActiveStep(targetStep);
  };

  const handleSaveAndComplete = async () => {
    // Save current progress across all domains first
    saveCurrentProgress(false);

    const cleanName = name.trim() || currentUser?.name || '';
    const updatedDemo: Partial<Demographics> = {
      name: cleanName,
      age: age ? Number(age) : undefined,
      sex: gender,
      isPregnant,
      isLactating,
      pregnancyTrimester: isPregnant ? (pregnancyTrimester as 1 | 2 | 3) : undefined,
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
    };

    const isAllSkipped = skippedTests.length >= 17;
    const updatedLabs: Partial<LabDataPanel> = {
      hemoglobin: parseNum(hemoglobin),
      rbc: parseNum(rbc),
      hematocrit: parseNum(hematocrit),
      mcv: parseNum(mcv),
      mch: parseNum(mch),
      mchc: parseNum(mchc),
      rdw: parseNum(rdw),
      plateletCount: parseNum(plateletCount),
      wbcCount: parseNum(wbcCount),
      serumIron: parseNum(serumIron),
      serumFerritin: parseNum(serumFerritin),
      tibc: parseNum(tibc),
      transferrinSaturation: parseNum(transferrinSaturation),
      vitaminB12: parseNum(vitaminB12),
      vitaminD: parseNum(vitaminD),
      folateB9: parseNum(folateB9),
      vitaminC: parseNum(vitaminC),
      skippedTests: skippedTests,
      labStatus: isAllSkipped ? 'User_Skipped' : skippedTests.length > 0 ? 'Partial_Skipped' : 'Verified',
      dateRecorded: new Date().toISOString().split('T')[0],
      labSource: isAllSkipped
        ? 'Skipped by User (Symptom-Only Profile)'
        : selectedFile?.name
        ? `Uploaded Report: ${selectedFile.name}`
        : 'Personal Profile Wizard',
    };

    setProfileCompleted(true);
    setProfileModalOpen(false);

    // 5. Save historical baseline snapshot entry into Health Tracking Timeline
    const symptomsSummaryStr = selectedSymptoms.length > 0
      ? ` Symptoms flagged: ${selectedSymptoms.join(', ')}.`
      : '';

    addHealthRecordEntry({
      date: new Date().toISOString().split('T')[0],
      title: selectedFile?.name ? `Lab Report: ${selectedFile.name}` : 'Personal Baseline Profile',
      notes: `Vitals recorded: ${age ? `${age}y` : 'Age not recorded'}, ${heightCm ? `${heightCm}cm` : 'Height not recorded'}, ${weightKg ? `${weightKg}kg` : 'Weight not recorded'}${currentBmi !== null ? ` (BMI ${currentBmi.toFixed(1)})` : ''}. Daily iron RDA: ${calculatedIronRda}mg.${symptomsSummaryStr}`,
      source: selectedFile?.name ? `Uploaded File (${selectedFile.name})` : 'Interactive Profile Wizard',
      heightCm: heightCm ? Number(heightCm) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      bmi: currentBmi !== null ? Number(currentBmi.toFixed(1)) : undefined,
      hemoglobin: parseNum(hemoglobin),
      serumFerritin: parseNum(serumFerritin),
      serumIron: parseNum(serumIron),
      tibc: parseNum(tibc),
      transferrinSaturation: parseNum(transferrinSaturation),
      vitaminB12: parseNum(vitaminB12),
      vitaminD: parseNum(vitaminD),
      folateB9: parseNum(folateB9),
      vitaminC: parseNum(vitaminC),
      rbc: parseNum(rbc),
      hematocrit: parseNum(hematocrit),
      mcv: parseNum(mcv),
      mch: parseNum(mch),
      mchc: parseNum(mchc),
      rdw: parseNum(rdw),
      plateletCount: parseNum(plateletCount),
      wbcCount: parseNum(wbcCount),
      dietaryPlanAdherence: 'Strict',
      energyScore: 8,
    });

    // 6. Persistence: Local Storage & Cloud Firestore
    if (currentUser?.id) {
      const currentFullStore = useHealthStore.getState();
      const fullProfile = {
        demographics: currentFullStore.demographics,
        menstrual: currentFullStore.menstrual,
        lifestyle: currentFullStore.lifestyle,
        gut: currentFullStore.gut,
        labs: currentFullStore.labs,
        severeSymptoms: currentFullStore.severeSymptoms,
        selectedSymptoms: currentFullStore.selectedSymptoms,
        ayushRemedies: currentFullStore.ayushRemedies,
        dailyHabits: currentFullStore.dailyHabits,
        meals: currentFullStore.meals,
        chatMessages: currentFullStore.chatMessages,
        consentAccepted: true,
        isProfileCompleted: true,
        activeStage: 1,
        healthTimeline: currentFullStore.healthTimeline,
        updatedAt: new Date().toISOString(),
      };

      try {
        window.localStorage.setItem(`maguva_profile_${currentUser.id}`, JSON.stringify(fullProfile));
      } catch (cacheErr) {
        console.warn('LocalStorage save error:', cacheErr);
      }

      try {
        saveUserProfileToFirestore(
          currentUser.id,
          {
            ...fullProfile,
            isProfileCompleted: true,
            consentAccepted: true,
          },
          { force: true }
        ).catch((err) => console.warn('Firestore profile sync note:', err));
      } catch (err) {
        console.warn('Firestore profile sync note:', err);
      }
    }

    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="interactive-profile-builder-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200 font-sans"
    >
      <div className="bg-white rounded-3xl border border-[#FCE7F3] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FFF5F7] via-white to-[#FFF1F2] border-b border-[#FCE7F3] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-2xl shadow-xs border border-[#FCE7F3]">
              <MahuaEmblem size={36} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  {isInitialOnboarding ? 'Build Your Personal Health Profile' : 'Update Personal Health Profile'}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#FFF1F2] text-[#F43F5E] px-2 py-0.5 rounded-full border border-[#FCE7F3]">
                  Interactive Setup
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Set your age, gender, height, and weight to calculate personalized BMI, ICMR-NIN 2020 RDA targets & anemia risk.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              id="btn-close-profile-builder-modal"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              aria-label="Close Profile Modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => handleStepNavigation(1)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 1
                  ? 'text-[#F43F5E]'
                  : activeStep > 1
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  activeStep === 1
                    ? 'bg-[#F43F5E] text-white'
                    : activeStep > 1
                    ? 'bg-emerald-15 text-white'
                    : 'bg-slate-200 text-slate-15'
                }`}
              >
                {activeStep > 1 ? '✓' : '1'}
              </span>
              <span>Demographics</span>
            </button>

            <ChevronRight className="w-3 h-3 text-slate-300" />

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => handleStepNavigation(2)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 2
                  ? 'text-[#F43F5E]'
                  : activeStep > 2
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  activeStep === 2
                    ? 'bg-[#F43F5E] text-white'
                    : activeStep > 2
                    ? 'bg-emerald-15 text-white'
                    : 'bg-slate-200 text-slate-15'
                }`}
              >
                {activeStep > 2 ? '✓' : '2'}
              </span>
              <span>Height, Weight & BMI</span>
            </button>

            <ChevronRight className="w-3 h-3 text-slate-300" />

            {/* Step 3: Symptoms & Clinical Signals (BEFORE BLOOD TESTS) */}
            <button
              type="button"
              onClick={() => handleStepNavigation(3)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 3
                  ? 'text-[#F43F5E]'
                  : activeStep > 3
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  activeStep === 3
                    ? 'bg-[#F43F5E] text-white'
                    : activeStep > 3
                    ? 'bg-emerald-15 text-white'
                    : 'bg-slate-200 text-slate-15'
                }`}
              >
                {activeStep > 3 ? '✓' : '3'}
              </span>
              <span>Symptoms & Signals</span>
            </button>

            <ChevronRight className="w-3 h-3 text-slate-300" />

            {/* Step 4: Labs & Blood Tests */}
            <button
              type="button"
              onClick={() => handleStepNavigation(4)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 4
                  ? 'text-[#F43F5E]'
                  : activeStep > 4
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  activeStep === 4
                    ? 'bg-[#F43F5E] text-white'
                    : activeStep > 4
                    ? 'bg-emerald-15 text-white'
                    : 'bg-slate-200 text-slate-15'
                }`}
              >
                {activeStep > 4 ? '✓' : '4'}
              </span>
              <span>Labs & Blood Tests</span>
            </button>

            <ChevronRight className="w-3 h-3 text-slate-300" />

            {/* Step 5: Summary & Confirm */}
            <button
              type="button"
              onClick={() => handleStepNavigation(5)}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                activeStep === 5 ? 'text-[#F43F5E]' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  activeStep === 5 ? 'bg-[#F43F5E] text-white' : 'bg-slate-200 text-slate-15'
                }`}
              >
                5
              </span>
              <span>Summary & Confirm</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {justSaved && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full animate-in fade-in">
                <CheckCircle2 className="w-3 h-3 text-emerald-15" />
                <span>Saved</span>
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-500 hidden sm:block">
              Step {activeStep} of 5
            </span>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-20">
          {/* STEP 1: Personal Demographics & Life Stage */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-[#F43F5E]" />
                    <span>Who is this profile for?</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your age and gender determine your medical reference cohort, daily iron requirements, and nutritional standards.
                  </p>
                </div>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">
                  {cohortLabel}
                </span>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name / Preferred Name
                </label>
                <input
                  type="text"
                  id="wizard-input-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Pooja Sharma"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base font-semibold focus:bg-white focus:ring-2 focus:ring-[#F43F5E] focus:outline-none transition-all"
                />
              </div>

              {/* Gender Selector Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setGender('female')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      gender === 'female'
                        ? 'border-[#F43F5E] bg-[#FFF5F7]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        gender === 'female' ? 'bg-[#F43F5E] text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ♀
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Female</div>
                      <div className="text-[11px] text-slate-500">Includes menstrual, pregnancy & lactation models</div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      setGender('male');
                      setIsPregnant(false);
                      setIsLactating(false);
                    }}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                      gender === 'male'
                        ? 'border-[#F43F5E] bg-[#FFF5F7]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        gender === 'male' ? 'bg-[#F43F5E] text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      ♂
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Male</div>
                      <div className="text-[11px] text-slate-500">Standard adult reference male RDA</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Special Maternal Health Toggles if Female */}
              {gender === 'female' && (
                <div className="bg-[#FFF5F7]/70 p-4 rounded-2xl border border-[#FCE7F3] space-y-3">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-[#F43F5E]" />
                    <span>Maternal & Reproductive Status (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#FCE7F3] cursor-pointer hover:border-rose-300 transition-all">
                      <input
                        type="checkbox"
                        checked={isPregnant}
                        onChange={(e) => {
                          setIsPregnant(e.target.checked);
                          if (e.target.checked) setIsLactating(false);
                        }}
                        className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Currently Pregnant</span>
                        <span className="text-[10px] text-slate-500 block">Boosts daily Iron RDA to 40.0 mg &amp; Folate to 570 µg</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-[#FCE7F3] cursor-pointer hover:border-rose-300 transition-all">
                      <input
                        type="checkbox"
                        checked={isLactating}
                        onChange={(e) => {
                          setIsLactating(e.target.checked);
                          if (e.target.checked) setIsPregnant(false);
                        }}
                        className="w-4 h-4 text-[#F43F5E] rounded focus:ring-[#F43F5E]"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Currently Lactating (0-6m)</span>
                        <span className="text-[10px] text-slate-500 block">Adjusts daily Iron RDA to 23.0 mg &amp; Folate RDA to 330 µg</span>
                      </div>
                    </label>
                  </div>

                  {isPregnant && (
                    <div className="p-3 bg-white/70 rounded-xl border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-rose-20 block">Select Gestational Trimester</span>
                        <span className="text-[10px] text-slate-500 block">Calibrates RDA based on maternal and fetal development needs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3].map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setPregnancyTrimester(t)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                              pregnancyTrimester === t
                                ? 'bg-[#F43F5E] border-[#F43F5E] text-white shadow-xs'
                                : 'bg-white border-slate-200 text-slate-15 hover:bg-slate-50'
                            }`}
                          >
                            {t === 1 ? '1st' : t === 2 ? '2nd' : '3rd'} Trim
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Age Selection with Direct Input Box and Quick Badges */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#F43F5E]" />
                    <span>Age</span>
                  </label>
                  <span className="text-xs font-semibold text-slate-500">years old</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      id="input-wizard-age"
                      min="5"
                      max="110"
                      step="1"
                      placeholder="e.g. 25"
                      value={age || ''}
                      onChange={(e) => setAge(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="w-full text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-4 py-2.5 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      yrs
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAge(Math.max(5, (Number(age) || 30) - 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                      title="Decrease 1 year"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => setAge(Math.min(110, (Number(age) || 30) + 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                      title="Increase 1 year"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Select:</span>
                  {[16, 21, 24, 28, 35, 45, 55].map((presetAge) => (
                    <button
                      key={presetAge}
                      type="button"
                      onClick={() => setAge(presetAge)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        age === presetAge
                          ? 'bg-[#F43F5E] text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {presetAge}y
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Physical Vitals (Height, Weight) & Live Calculations */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-[#F43F5E]" />
                    <span>Physical Vitals & Body Composition</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your height and weight generate your computed BMI, healthy target weight range, and customized ICMR-NIN nutritional baselines.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Interactive Height & Weight Controls */}
                <div className="space-y-5">
                  {/* Height Box */}
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Height
                      </label>
                      <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setHeightUnit('cm')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            heightUnit === 'cm' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-15'
                          }`}
                        >
                          cm
                        </button>
                        <button
                          type="button"
                          onClick={() => setHeightUnit('ft')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            heightUnit === 'ft' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-15'
                          }`}
                        >
                          ft / in
                        </button>
                      </div>
                    </div>

                    {heightUnit === 'cm' ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            id="input-wizard-height-cm"
                            min="50"
                            max="250"
                            step="1"
                            placeholder="e.g. 162"
                            value={heightCm || ''}
                            onChange={(e) => setHeightCm(e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-4 py-2.5 focus:outline-none transition-all"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            cm
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setHeightCm(Math.max(50, (Number(heightCm) || 162) - 1))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Decrease 1 cm"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeightCm(Math.min(250, (Number(heightCm) || 162) + 1))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Increase 1 cm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            id="input-wizard-height-ft"
                            min="2"
                            max="8"
                            placeholder="Feet"
                            value={heightCm ? cmToFeetInches(Number(heightCm)).ft : ''}
                            onChange={(e) => {
                              const ft = Number(e.target.value) || 0;
                              const currentIn = heightCm ? cmToFeetInches(Number(heightCm)).inches : 0;
                              setHeightCm(feetInchesToCm(ft, currentIn));
                            }}
                            className="w-full text-base font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-3.5 py-2.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">ft</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            id="input-wizard-height-in"
                            min="0"
                            max="11"
                            placeholder="Inches"
                            value={heightCm ? cmToFeetInches(Number(heightCm)).inches : ''}
                            onChange={(e) => {
                              const inches = Number(e.target.value) || 0;
                              const currentFt = heightCm ? cmToFeetInches(Number(heightCm)).ft : 0;
                              setHeightCm(feetInchesToCm(currentFt, inches));
                            }}
                            className="w-full text-base font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-3.5 py-2.5 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">in</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-0.5">
                      <span className="text-slate-500 font-medium">
                        {heightCm ? `≈ ${formatHeightFtIn(Number(heightCm))}` : '—'}
                      </span>
                      <div className="flex gap-1">
                        {[152, 157, 162, 168, 173].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setHeightCm(h)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              heightCm === h
                                ? 'bg-[#F43F5E] text-white'
                                : 'bg-white text-slate-15 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {h}cm
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Weight Box */}
                  <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Weight
                      </label>
                      <div className="flex bg-slate-200 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setWeightUnit('kg')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            weightUnit === 'kg' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-15'
                          }`}
                        >
                          kg
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeightUnit('lbs')}
                          className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                            weightUnit === 'lbs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-15'
                          }`}
                        >
                          lbs
                        </button>
                      </div>
                    </div>

                    {weightUnit === 'kg' ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            id="input-wizard-weight-kg"
                            min="20"
                            max="250"
                            step="0.5"
                            placeholder="e.g. 54.0"
                            value={weightKg || ''}
                            onChange={(e) => setWeightKg(e.target.value === '' ? 0 : Number(e.target.value))}
                            className="w-full text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-4 py-2.5 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            kg
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setWeightKg(Math.max(20, Number(((Number(weightKg) || 54) - 0.5).toFixed(1))))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Decrease 0.5 kg"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightKg(Math.min(250, Number(((Number(weightKg) || 54) + 0.5).toFixed(1))))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Increase 0.5 kg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            id="input-wizard-weight-lbs"
                            min="40"
                            max="550"
                            step="0.5"
                            placeholder="e.g. 119.0"
                            value={weightKg ? Number((Number(weightKg) * 2.20462).toFixed(1)) : ''}
                            onChange={(e) => {
                              const lbs = Number(e.target.value) || 0;
                              setWeightKg(Number((lbs / 2.20462).toFixed(1)));
                            }}
                            className="w-full text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/20 px-4 py-2.5 focus:outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            lbs
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setWeightKg(Math.max(20, Number(((Number(weightKg) || 54) - 0.5).toFixed(1))))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Decrease 1 lb"
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightKg(Math.min(250, Number(((Number(weightKg) || 54) + 0.5).toFixed(1))))}
                            className="w-9 h-9 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-black text-slate-700 cursor-pointer shadow-2xs active:scale-95 text-base"
                            title="Increase 1 lb"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1 text-xs pt-0.5">
                      <span className="text-slate-500 font-medium">
                        {weightKg ? `≈ ${(Number(weightKg) * 2.20462).toFixed(1)} lbs (${weightKg} kg)` : '—'}
                      </span>
                      <div className="flex gap-1">
                        {[48, 52, 54, 58, 64, 70].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setWeightKg(w)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              weightKg === w
                                ? 'bg-[#F43F5E] text-white'
                                : 'bg-white text-slate-15 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w}kg
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Dynamic Calculations Engine Preview */}
                <div className="bg-gradient-to-br from-[#FFF5F7] via-white to-[#FFF1F2] p-5 rounded-2xl border border-[#FCE7F3] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#FCE7F3] pb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F43F5E]" />
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                        Live Calculated Vitals
                      </span>
                    </div>
                    <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${bmiColorClass}`}>
                      {asianIndianCategory}
                    </span>
                  </div>

                  {/* Computed BMI Score */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-[#FCE7F3] shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Computed BMI</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">
                        {currentBmi !== null ? (
                          <>
                            {currentBmi.toFixed(1)}{' '}
                            <span className="text-xs font-normal text-slate-400">kg/m²</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {currentBmi !== null ? 'Asian-Indian standard' : 'Requires height & weight'}
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-[#FCE7F3] shadow-2xs">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Healthy Weight Band</div>
                      <div className="text-xl font-black text-emerald-700 mt-1">
                        {minIdealWeight && maxIdealWeight ? (
                          <>
                            {minIdealWeight} - {maxIdealWeight}{' '}
                            <span className="text-xs font-normal text-slate-400">kg</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {heightCm ? `For height of ${heightCm} cm` : 'Requires height'}
                      </div>
                    </div>
                  </div>

                  {/* Calculated Daily RDA Baselines */}
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-extrabold text-slate-20 flex items-center justify-between">
                      <span>Calculated Daily RDA Targets (ICMR-NIN 2020)</span>
                      <span className="text-[10px] text-rose-700 font-bold">{cohortLabel}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-rose-100">
                        <div className="text-[9px] font-bold uppercase text-rose-700">Daily Iron</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {hasDemographics ? (
                            <>
                              {calculatedIronRda} <span className="text-[10px] font-normal text-slate-400">mg</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal text-sm">—</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-violet-100">
                        <div className="text-[9px] font-bold uppercase text-violet-700">Vit B12</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {hasDemographics ? (
                            <>
                              {calculatedB12Rda} <span className="text-[10px] font-normal text-slate-400">µg</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal text-sm">—</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-emerald-100">
                        <div className="text-[9px] font-bold uppercase text-emerald-700">Folate</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {hasDemographics ? (
                            <>
                              {calculatedFolateRda} <span className="text-[10px] font-normal text-slate-400">µg</span>
                            </>
                          ) : (
                            <span className="text-slate-400 font-normal text-sm">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anemia Cutoff Notice */}
                  <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-xs text-slate-15 flex items-center justify-between">
                    <span>Clinical Anemia Hb Threshold:</span>
                    <strong className="text-rose-700 font-extrabold">
                      {hasDemographics ? `< ${anemiaCutoff} g/dL` : '— (Set in Step 1)'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Symptoms & Clinical Signals (BEFORE BLOOD TESTS) */}
          {activeStep === 3 && (
            <SymptomsStepForm
              demographics={{
                name,
                age: age ? Number(age) : undefined,
                sex: gender,
                isPregnant,
                isLactating,
                heightCm: heightCm ? Number(heightCm) : undefined,
                weightKg: weightKg ? Number(weightKg) : undefined,
              }}
              severeSymptoms={localSevere}
              onUpdateSevereSymptoms={(partial) =>
                setLocalSevere((prev) => ({ ...prev, ...partial }))
              }
              menstrual={localMenstrual}
              onUpdateMenstrual={(partial) =>
                setLocalMenstrual((prev) => ({ ...prev, ...partial }))
              }
              gut={localGut}
              onUpdateGut={(partial) =>
                setLocalGut((prev) => ({ ...prev, ...partial }))
              }
              selectedSymptoms={selectedSymptoms}
              onToggleSymptom={handleToggleSymptom}
            />
          )}

          {/* STEP 4: Optional Blood Test Report / OCR Digitizer */}
          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-[#F43F5E]" />
                    <span>Lab Blood Biomarkers (Optional)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload your blood test PDF report for automatic AI OCR extraction, enter values manually, or skip any test.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-wizard-skip-all-labs"
                    onClick={handleSkipAllBloodTests}
                    className="text-xs font-bold text-[#F43F5E] hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Skip All Blood Tests</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(5)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer flex items-center gap-1"
                  >
                    <span>Proceed to Step 5 →</span>
                  </button>
                </div>
              </div>

              {/* Status Alert for Skipped Tests */}
              {skippedTests.length > 0 && (
                <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-black text-amber-950 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-15" />
                      <span>
                        {skippedTests.length >= 17
                          ? 'Symptom-Based Estimate Mode Active (All Labs Skipped)'
                          : `${skippedTests.length} Biomarkers Skipped (Missing Data)`}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                      {skippedTests.length >= 17 ? '100% Symptom Weighted' : 'Partial Lab Verified'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    <strong>Rule:</strong> Skipped tests are treated strictly as unverified missing data. <strong>No dummy numbers (e.g. 0, -1, or population averages) are ever assigned.</strong> The Deficiency Risk Engine shifts its calculation weight entirely to Symptom Scoring + Demographic Profile.
                  </p>
                </div>
              )}

              {/* Upload Document Box */}
              <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-[#FCE7F3] hover:border-[#F43F5E]/60 transition-all space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-[#FFF1F2] text-[#F43F5E] rounded-lg">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900">Upload Lab Report (PDF / Image)</h4>
                      <p className="text-xs text-slate-500">Maguva will automatically scan Hb, Ferritin, B12 & CBC panels.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label
                    htmlFor="wizard-lab-file-input"
                    className="flex-1 w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-slate-50 hover:bg-[#FFF5F7] border border-slate-200 hover:border-[#FCE7F3] rounded-xl cursor-pointer transition-all text-xs font-semibold text-slate-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-[#F43F5E]" />
                    <span>{selectedFile ? `Selected: ${selectedFile.name}` : 'Choose PDF or Lab Image'}</span>
                    <input
                      type="file"
                      id="wizard-lab-file-input"
                      accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleParseReport}
                    disabled={isParsing}
                    className="w-full sm:w-auto px-5 py-3 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
                  >
                    {isParsing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Retrieve Labs</span>
                      </>
                    )}
                  </button>
                </div>

                {ocrErrorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
                    <AlertCircle className="w-4 h-4 text-[#F43F5E] shrink-0" />
                    <span>{ocrErrorMsg}</span>
                  </div>
                )}

                {ocrSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">{ocrSuccessMsg}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Informational baseline vs historical tracker guidance */}
              <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-rose-900 shadow-xs">
                <Info className="w-4 h-4 text-[#F43F5E] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Active Daily Baseline Notice:</span> Values updated here are considered your active clinical baseline for daily dietary recommendations. To archive blood test reports as historical timeline records with specific test dates, use the <strong>Upload / OCR</strong> flow or Health &amp; Lab Tracker.
                </div>
              </div>

              {/* Comprehensive Diagnostic Lab Biomarkers */}
              <div className="space-y-5">
                {/* Educational Banner on Lab Parameters & HCT Rationale */}
                <div className="p-4 bg-gradient-to-r from-rose-50/80 via-white to-amber-50/60 rounded-2xl border border-rose-200/80 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                  <div className="flex items-center gap-2 font-black text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#F43F5E]" />
                    <span>Clinical Biomarker Insight: Diagnostic Role of Full CBC &amp; Hematocrit (Hct)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-15">
                    While <strong>Hemoglobin (Hb)</strong> measures oxygen-carrying protein capacity and <strong>RBC Count</strong> quantifies total red cells, <strong>Hematocrit (Hct %)</strong> measures the true packed percentage of blood volume occupied by red blood cells. Using the clinical <em>Rule of Three (Hct ≈ 3 × Hb)</em>, Hct validates red cell hydration, enables calculation of <strong>MCV</strong> (cell size) and <strong>MCHC</strong> (chromicity), and differentiates true iron deficiency from plasma volume shifts.
                  </p>
                </div>

                {/* 1. Complete Blood Count (CBC) Panel */}
                <div className="p-4.5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#F43F5E]" />
                      <span>1. Complete Blood Count (CBC) Panel</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      9 Diagnostic Markers
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                    {/* Hemoglobin */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('hemoglobin') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Hemoglobin (Hb) <span className="text-[10px] text-slate-400 font-normal">g/dL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('hemoglobin') ? handleUnskipSingleTest('hemoglobin', '10.8', setHemoglobin) : handleSkipSingleTest('hemoglobin', setHemoglobin)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('hemoglobin') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('hemoglobin') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-hb"
                        value={hemoglobin}
                        onChange={(e) => {
                          setHemoglobin(e.target.value);
                          if (skippedTests.includes('hemoglobin')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'hemoglobin'));
                          }
                        }}
                        placeholder={skippedTests.includes('hemoglobin') ? 'Skipped (Unverified)' : 'e.g. 10.8'}
                        disabled={skippedTests.includes('hemoglobin')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('hemoglobin') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 12.0–15.5 g/dL</span>
                    </div>

                    {/* RBC Count */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('rbc') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          RBC Count <span className="text-[10px] text-slate-400 font-normal">M/µL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('rbc') ? handleUnskipSingleTest('rbc', '4.1', setRbc) : handleSkipSingleTest('rbc', setRbc)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('rbc') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('rbc') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-rbc"
                        value={rbc}
                        onChange={(e) => {
                          setRbc(e.target.value);
                          if (skippedTests.includes('rbc')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'rbc'));
                          }
                        }}
                        placeholder={skippedTests.includes('rbc') ? 'Skipped (Unverified)' : 'e.g. 4.1'}
                        disabled={skippedTests.includes('rbc')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('rbc') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 4.2–5.4 M/µL</span>
                    </div>

                    {/* Hematocrit (Hct) */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('hematocrit') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Hematocrit (Hct / PCV) <span className="text-[10px] text-slate-400 font-normal">%</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('hematocrit') ? handleUnskipSingleTest('hematocrit', '33.5', setHematocrit) : handleSkipSingleTest('hematocrit', setHematocrit)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('hematocrit') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('hematocrit') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        id="input-wizard-hct"
                        value={hematocrit}
                        onChange={(e) => {
                          setHematocrit(e.target.value);
                          if (skippedTests.includes('hematocrit')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'hematocrit'));
                          }
                        }}
                        placeholder={skippedTests.includes('hematocrit') ? 'Skipped (Unverified)' : 'e.g. 33.5'}
                        disabled={skippedTests.includes('hematocrit')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('hematocrit') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 37.0–48.0% (Hb × 3)</span>
                    </div>

                    {/* MCV */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('mcv') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          MCV (Cell Volume) <span className="text-[10px] text-slate-400 font-normal">fL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('mcv') ? handleUnskipSingleTest('mcv', '78.5', setMcv) : handleSkipSingleTest('mcv', setMcv)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('mcv') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('mcv') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        id="input-wizard-mcv"
                        value={mcv}
                        onChange={(e) => {
                          setMcv(e.target.value);
                          if (skippedTests.includes('mcv')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'mcv'));
                          }
                        }}
                        placeholder={skippedTests.includes('mcv') ? 'Skipped (Unverified)' : 'e.g. 78.5'}
                        disabled={skippedTests.includes('mcv')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('mcv') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 80–96 fL (&lt;80 microcytic)</span>
                    </div>

                    {/* MCH */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('mch') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          MCH (Cell Hb) <span className="text-[10px] text-slate-400 font-normal">pg</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('mch') ? handleUnskipSingleTest('mch', '25.0', setMch) : handleSkipSingleTest('mch', setMch)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('mch') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('mch') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        id="input-wizard-mch"
                        value={mch}
                        onChange={(e) => {
                          setMch(e.target.value);
                          if (skippedTests.includes('mch')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'mch'));
                          }
                        }}
                        placeholder={skippedTests.includes('mch') ? 'Skipped (Unverified)' : 'e.g. 25.0'}
                        disabled={skippedTests.includes('mch')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('mch') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 27.0–33.0 pg</span>
                    </div>

                    {/* MCHC */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('mchc') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          MCHC (Hb Conc) <span className="text-[10px] text-slate-400 font-normal">g/dL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('mchc') ? handleUnskipSingleTest('mchc', '31.2', setMchc) : handleSkipSingleTest('mchc', setMchc)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('mchc') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('mchc') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        id="input-wizard-mchc"
                        value={mchc}
                        onChange={(e) => {
                          setMchc(e.target.value);
                          if (skippedTests.includes('mchc')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'mchc'));
                          }
                        }}
                        placeholder={skippedTests.includes('mchc') ? 'Skipped (Unverified)' : 'e.g. 31.2'}
                        disabled={skippedTests.includes('mchc')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('mchc') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 32.0–36.0 g/dL</span>
                    </div>

                    {/* RDW */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('rdw') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          RDW (Size Variation) <span className="text-[10px] text-slate-400 font-normal">%</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('rdw') ? handleUnskipSingleTest('rdw', '15.8', setRdw) : handleSkipSingleTest('rdw', setRdw)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('rdw') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('rdw') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-rdw"
                        value={rdw}
                        onChange={(e) => {
                          setRdw(e.target.value);
                          if (skippedTests.includes('rdw')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'rdw'));
                          }
                        }}
                        placeholder={skippedTests.includes('rdw') ? 'Skipped (Unverified)' : 'e.g. 15.8'}
                        disabled={skippedTests.includes('rdw')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('rdw') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 11.5–14.5% (&gt;15% in IDA)</span>
                    </div>

                    {/* Platelet Count */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('plateletCount') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Platelet Count <span className="text-[10px] text-slate-400 font-normal">x10³/µL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('plateletCount') ? handleUnskipSingleTest('plateletCount', '265', setPlateletCount) : handleSkipSingleTest('plateletCount', setPlateletCount)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('plateletCount') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('plateletCount') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="1"
                        id="input-wizard-platelets"
                        value={plateletCount}
                        onChange={(e) => {
                          setPlateletCount(e.target.value);
                          if (skippedTests.includes('plateletCount')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'plateletCount'));
                          }
                        }}
                        placeholder={skippedTests.includes('plateletCount') ? 'Skipped (Unverified)' : 'e.g. 265'}
                        disabled={skippedTests.includes('plateletCount')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('plateletCount') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 150–450 x10³/µL</span>
                    </div>

                    {/* WBC Count */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('wbcCount') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          WBC Count <span className="text-[10px] text-slate-400 font-normal">x10³/µL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('wbcCount') ? handleUnskipSingleTest('wbcCount', '6.8', setWbcCount) : handleSkipSingleTest('wbcCount', setWbcCount)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('wbcCount') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('wbcCount') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-wbc"
                        value={wbcCount}
                        onChange={(e) => {
                          setWbcCount(e.target.value);
                          if (skippedTests.includes('wbcCount')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'wbcCount'));
                          }
                        }}
                        placeholder={skippedTests.includes('wbcCount') ? 'Skipped (Unverified)' : 'e.g. 6.8'}
                        disabled={skippedTests.includes('wbcCount')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('wbcCount') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 4.0–11.0 x10³/µL</span>
                    </div>
                  </div>
                </div>

                {/* 2. Serum Iron Studies Panel */}
                <div className="p-4.5 bg-rose-50/40 rounded-2xl border border-rose-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-[#F43F5E]" />
                      <span>2. Serum Iron Studies &amp; Reserves Panel</span>
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                      Iron Deficiency Gold Standard
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Serum Ferritin */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('serumFerritin') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-rose-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Serum Ferritin <span className="text-[10px] text-slate-400 font-normal">ng/mL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('serumFerritin') ? handleUnskipSingleTest('serumFerritin', '14.2', setSerumFerritin) : handleSkipSingleTest('serumFerritin', setSerumFerritin)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('serumFerritin') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('serumFerritin') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-ferritin"
                        value={serumFerritin}
                        onChange={(e) => {
                          setSerumFerritin(e.target.value);
                          if (skippedTests.includes('serumFerritin')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'serumFerritin'));
                          }
                        }}
                        placeholder={skippedTests.includes('serumFerritin') ? 'Skipped (Unverified)' : 'e.g. 14.2'}
                        disabled={skippedTests.includes('serumFerritin')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('serumFerritin') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-rose-300'}`}
                      />
                      <span className="text-[10px] text-rose-700 font-semibold mt-0.5 block">&lt;15 = Depleted Iron</span>
                    </div>

                    {/* Serum Iron */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('serumIron') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Serum Iron <span className="text-[10px] text-slate-400 font-normal">µg/dL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('serumIron') ? handleUnskipSingleTest('serumIron', '52', setSerumIron) : handleSkipSingleTest('serumIron', setSerumIron)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('serumIron') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('serumIron') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="1"
                        id="input-wizard-serum-iron"
                        value={serumIron}
                        onChange={(e) => {
                          setSerumIron(e.target.value);
                          if (skippedTests.includes('serumIron')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'serumIron'));
                          }
                        }}
                        placeholder={skippedTests.includes('serumIron') ? 'Skipped (Unverified)' : 'e.g. 52'}
                        disabled={skippedTests.includes('serumIron')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('serumIron') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 60–170 µg/dL</span>
                    </div>

                    {/* TIBC */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('tibc') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          TIBC <span className="text-[10px] text-slate-400 font-normal">µg/dL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('tibc') ? handleUnskipSingleTest('tibc', '390', setTibc) : handleSkipSingleTest('tibc', setTibc)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('tibc') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('tibc') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="5"
                        id="input-wizard-tibc"
                        value={tibc}
                        onChange={(e) => {
                          setTibc(e.target.value);
                          if (skippedTests.includes('tibc')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'tibc'));
                          }
                        }}
                        placeholder={skippedTests.includes('tibc') ? 'Skipped (Unverified)' : 'e.g. 390'}
                        disabled={skippedTests.includes('tibc')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('tibc') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 240–450 µg/dL</span>
                    </div>

                    {/* Transferrin Saturation */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('transferrinSaturation') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          TSAT (% Saturation) <span className="text-[10px] text-slate-400 font-normal">%</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('transferrinSaturation') ? handleUnskipSingleTest('transferrinSaturation', '13.3', setTransferrinSaturation) : handleSkipSingleTest('transferrinSaturation', setTransferrinSaturation)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('transferrinSaturation') ? 'bg-rose-100 text-rose-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('transferrinSaturation') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        id="input-wizard-tsat"
                        value={transferrinSaturation}
                        onChange={(e) => {
                          setTransferrinSaturation(e.target.value);
                          if (skippedTests.includes('transferrinSaturation')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'transferrinSaturation'));
                          }
                        }}
                        placeholder={skippedTests.includes('transferrinSaturation') ? 'Skipped (Unverified)' : 'e.g. 13.3'}
                        disabled={skippedTests.includes('transferrinSaturation')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-[#F43F5E] focus:outline-none ${skippedTests.includes('transferrinSaturation') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-slate-300'}`}
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">Ref: 20–50% (&lt;16% IDA)</span>
                    </div>
                  </div>
                </div>

                {/* 3. Micronutrients Panel (B12, D3, Folate, Vitamin C) */}
                <div className="p-4.5 bg-purple-50/30 rounded-2xl border border-purple-200/80 space-y-3">
                  <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-15" />
                      <span>3. Micronutrient Panel (B12, D3, Folate &amp; Vitamin C)</span>
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-200">
                      Neuromuscular &amp; Metabolic Synergies
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Vitamin B12 */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('vitaminB12') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-purple-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Vitamin B12 <span className="text-[10px] text-slate-400 font-normal">pg/mL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('vitaminB12') ? handleUnskipSingleTest('vitaminB12', '195', setVitaminB12) : handleSkipSingleTest('vitaminB12', setVitaminB12)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('vitaminB12') ? 'bg-purple-100 text-purple-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('vitaminB12') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="1"
                        id="input-wizard-b12"
                        value={vitaminB12}
                        onChange={(e) => {
                          setVitaminB12(e.target.value);
                          if (skippedTests.includes('vitaminB12')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'vitaminB12'));
                          }
                        }}
                        placeholder={skippedTests.includes('vitaminB12') ? 'Skipped (Unverified)' : 'e.g. 195'}
                        disabled={skippedTests.includes('vitaminB12')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none ${skippedTests.includes('vitaminB12') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-purple-300'}`}
                      />
                      <span className="text-[10px] text-purple-700 font-semibold mt-0.5 block">&lt;200 = Deficient</span>
                    </div>

                    {/* Vitamin D */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('vitaminD') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Vitamin D3 <span className="text-[10px] text-slate-400 font-normal">ng/mL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('vitaminD') ? handleUnskipSingleTest('vitaminD', '19.5', setVitaminD) : handleSkipSingleTest('vitaminD', setVitaminD)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('vitaminD') ? 'bg-amber-100 text-amber-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('vitaminD') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-vitd"
                        value={vitaminD}
                        onChange={(e) => {
                          setVitaminD(e.target.value);
                          if (skippedTests.includes('vitaminD')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'vitaminD'));
                          }
                        }}
                        placeholder={skippedTests.includes('vitaminD') ? 'Skipped (Unverified)' : 'e.g. 19.5'}
                        disabled={skippedTests.includes('vitaminD')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none ${skippedTests.includes('vitaminD') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-amber-300'}`}
                      />
                      <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">&lt;20 = Deficient (30-60 opt)</span>
                    </div>

                    {/* Folate B9 */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('folateB9') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-emerald-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Folate (B9) <span className="text-[10px] text-slate-400 font-normal">ng/mL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('folateB9') ? handleUnskipSingleTest('folateB9', '5.2', setFolateB9) : handleSkipSingleTest('folateB9', setFolateB9)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('folateB9') ? 'bg-emerald-100 text-emerald-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('folateB9') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-folate"
                        value={folateB9}
                        onChange={(e) => {
                          setFolateB9(e.target.value);
                          if (skippedTests.includes('folateB9')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'folateB9'));
                          }
                        }}
                        placeholder={skippedTests.includes('folateB9') ? 'Skipped (Unverified)' : 'e.g. 5.2'}
                        disabled={skippedTests.includes('folateB9')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none ${skippedTests.includes('folateB9') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-emerald-300'}`}
                      />
                      <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">&lt;4.0 = Deficient (&gt;8.0 opt)</span>
                    </div>

                    {/* Vitamin C */}
                    <div className={`p-2.5 rounded-xl border transition-all ${skippedTests.includes('vitaminC') ? 'bg-slate-100/70 border-dashed border-slate-300' : 'bg-white border-teal-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700">
                          Vitamin C <span className="text-[10px] text-slate-400 font-normal">mg/dL</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => skippedTests.includes('vitaminC') ? handleUnskipSingleTest('vitaminC', '0.8', setVitaminC) : handleSkipSingleTest('vitaminC', setVitaminC)}
                          className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${skippedTests.includes('vitaminC') ? 'bg-teal-100 text-teal-20' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                          {skippedTests.includes('vitaminC') ? 'Skipped ↺' : 'Skip'}
                        </button>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        id="input-wizard-vitc"
                        value={vitaminC}
                        onChange={(e) => {
                          setVitaminC(e.target.value);
                          if (skippedTests.includes('vitaminC')) {
                            setSkippedTests((prev) => prev.filter((k) => k !== 'vitaminC'));
                          }
                        }}
                        placeholder={skippedTests.includes('vitaminC') ? 'Skipped (Unverified)' : 'e.g. 0.8'}
                        disabled={skippedTests.includes('vitaminC')}
                        className={`w-full px-3 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none ${skippedTests.includes('vitaminC') ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed italic' : 'bg-white text-slate-900 border-teal-300'}`}
                      />
                      <span className="text-[10px] text-teal-700 font-semibold mt-0.5 block">Ref: 0.4–1.5 (Aids Fe Abs)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Summary & Confirm */}
          {activeStep === 5 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-15" />
                    <span>Your Health Vector & Deficiency Probabilities are Ready!</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Synthesized from your Gut Health, Period Dynamics, Clinical Symptoms, and Blood Test Biomarkers.
                  </p>
                </div>
              </div>



              {/* Personal Card Snapshot */}
              <div className="bg-gradient-to-br from-[#FFF5F7] via-white to-[#FFF1F2] p-5 rounded-2xl border border-[#FCE7F3] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F43F5E] to-rose-400 text-white flex items-center justify-center text-sm font-bold shadow-2xs">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-base">{name || 'User Profile'}</h4>
                      <p className="text-xs text-slate-500">
                        {gender ? gender.toUpperCase() : 'Gender not set'} • {age ? `${age} Years Old` : 'Age not set'} • {cohortLabel}
                      </p>
                    </div>
                  </div>

                </div>

                {/* 6 Core Micronutrient Targets */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                  <div className="bg-white p-2.5 rounded-xl border border-rose-200">
                    <span className="text-[9px] font-bold text-rose-500 uppercase">1. Iron Target</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{calculatedIronRda} <span className="text-[10px] font-normal text-slate-500">mg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-purple-200">
                    <span className="text-[9px] font-bold text-purple-15 uppercase">2. Vit B12</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{calculatedB12Rda} <span className="text-[10px] font-normal text-slate-500">µg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
                    <span className="text-[9px] font-bold text-emerald-15 uppercase">3. Folate (B9)</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{calculatedFolateRda} <span className="text-[10px] font-normal text-slate-500">µg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[9px] font-bold text-amber-15 uppercase">4. Vitamin C</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{activeBaseline.vitaminCMg || (isPregnant ? 80 : 65)} <span className="text-[10px] font-normal text-slate-500">mg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-orange-200">
                    <span className="text-[9px] font-bold text-orange-15 uppercase">5. Vitamin D3</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{activeBaseline.vitaminDMcg || 15} <span className="text-[10px] font-normal text-slate-500">µg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-blue-200">
                    <span className="text-[9px] font-bold text-blue-15 uppercase">6. Calcium</span>
                    <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                      {hasDemographics ? (
                        <>{activeBaseline.calciumMg || (isPregnant ? 1200 : 1000)} <span className="text-[10px] font-normal text-slate-500">mg/d</span></>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* DEFICIENCY PROBABILITIES & REASON EXPLANATIONS BREAKDOWN                  */}
              {/* ========================================================================= */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[#F43F5E]" />
                      <span>Deficiency Probabilities &amp; Reason Breakdown</span>
                    </h4>
                    <p className="text-xs text-slate-15 mt-0.5">
                      Synthesized across your clinical symptoms, menstrual flow, blood tests, and digestive absorption.
                    </p>
                  </div>
                </div>

                {/* 4 Vector Cards with In-Depth Reason Explanations */}
                <div className="space-y-4">
                  {finalDeficiencyRisks.map((risk) => {
                    const isIron = risk.id === 'iron';
                    const isB12 = risk.id === 'b12';
                    const isFolate = risk.id === 'folate';
                    const isVitD = risk.id === 'vitaminD';

                    const theme = isIron
                      ? {
                          border: 'border-rose-200',
                          bg: 'bg-gradient-to-br from-rose-50/70 via-white to-rose-50/40',
                          bar: 'bg-gradient-to-r from-rose-500 to-red-15',
                          iconColor: 'text-[#F43F5E]',
                          titleColor: 'text-rose-950',
                        }
                      : isB12
                      ? {
                          border: 'border-purple-200',
                          bg: 'bg-gradient-to-br from-purple-50/70 via-white to-purple-50/40',
                          bar: 'bg-gradient-to-r from-purple-500 to-indigo-15',
                          iconColor: 'text-purple-15',
                          titleColor: 'text-purple-950',
                        }
                      : isFolate
                      ? {
                          border: 'border-emerald-200',
                          bg: 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40',
                          bar: 'bg-gradient-to-r from-emerald-500 to-teal-15',
                          iconColor: 'text-emerald-15',
                          titleColor: 'text-emerald-950',
                        }
                      : {
                          border: 'border-amber-200',
                          bg: 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40',
                          bar: 'bg-gradient-to-r from-amber-500 to-orange-15',
                          iconColor: 'text-amber-15',
                          titleColor: 'text-amber-950',
                        };

                    return (
                      <div
                        key={risk.id}
                        className={`rounded-2xl border ${theme.border} ${theme.bg} p-4.5 sm:p-5 shadow-xs transition-all space-y-4`}
                      >
                        {/* Header: Title, Tier, Probability Bar */}
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-2 rounded-xl bg-white border ${theme.border} shadow-2xs ${theme.iconColor}`}>
                                {isIron && <Droplets className="w-5 h-5" />}
                                {isB12 && <Zap className="w-5 h-5" />}
                                {isFolate && <HeartPulse className="w-5 h-5" />}
                                {isVitD && <Sun className="w-5 h-5" />}
                              </div>
                              <div>
                                <h5 className={`text-base font-extrabold ${theme.titleColor}`}>
                                  {risk.name}
                                </h5>
                                <span className="text-[11px] text-slate-500 font-medium">
                                  Biological risk synthesis across symptoms, period dynamics &amp; labs
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                                  risk.riskTier === 'High'
                                    ? 'bg-rose-500 text-white border-rose-15'
                                    : risk.riskTier === 'Moderate'
                                    ? 'bg-amber-500 text-white border-amber-15'
                                    : 'bg-emerald-15 text-white border-emerald-700'
                                }`}
                              >
                                {risk.riskTier} Risk ({risk.probabilityPercent}%)
                              </span>
                            </div>
                          </div>

                          {/* Probability Bar */}
                          <div className="mt-3 space-y-1">
                            <div className="flex justify-between text-xs font-extrabold text-slate-700">
                              <span>Calculated Deficiency Probability</span>
                              <span className={theme.iconColor}>{risk.probabilityPercent}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
                              <div
                                className={`h-full ${theme.bar} transition-all duration-500`}
                                style={{ width: `${risk.probabilityPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Reasons for Probability Breakdown */}
                        <div className="pt-2 border-t border-slate-200/70 space-y-2.5">
                          <h6 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-[#F43F5E]" />
                            <span>Why This Probability? (Contributing Factors &amp; Reasons)</span>
                          </h6>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Factor 1: Symptoms */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                                <span>1. Clinical Symptoms Impact</span>
                              </div>
                              <p className="text-slate-15 leading-relaxed text-[11px]">
                                {risk.symptomMatchCount > 0 ? (
                                  <>
                                    <strong className="text-slate-20 font-bold">{risk.symptomMatchCount} matching symptom(s)</strong> detected:{' '}
                                    <span className="text-slate-700 font-medium">
                                      {risk.symptomMatches.slice(0, 3).join(', ')}
                                      {risk.symptomMatches.length > 3 ? '...' : ''}
                                    </span>
                                    .{' '}
                                    {isIron && 'These symptoms reflect diminished oxygen carrying capacity in red blood cells and tissue hypoxia.'}
                                    {isB12 && 'Signals peripheral nerve myelin strain, slower neural transmission, and cellular energy deficit.'}
                                    {isFolate && 'Indicates cellular turnover stress, mucosal inflammation, and DNA replication slowdown.'}
                                    {isVitD && 'Reflects impaired bone calcium turnover, muscle receptor fatigue, and immune cell down-regulation.'}
                                  </>
                                ) : (
                                  <span className="text-slate-500">
                                    No active overt symptoms flagged for this nutrient. Standard baseline physiological probability applies.
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Factor 2: Period & Menstrual Flow Impact */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Droplets className="w-3.5 h-3.5 text-rose-15" />
                                <span>2. Period Flow &amp; Menstrual Dynamics</span>
                              </div>
                              <p className="text-slate-15 leading-relaxed text-[11px]">
                                {gender === 'female' ? (
                                  <>
                                    {isIron && (
                                      <>
                                        <strong>{localMenstrual.flowIntensity} Flow</strong>{' '}
                                        {localMenstrual.flowIntensity === 'Heavy' || localMenstrual.flowIntensity === 'Clotting' ? (
                                          <span className="text-rose-700 font-semibold">
                                            (causes ~15–30mg excess iron loss per cycle, outpacing typical intestinal replacement).
                                          </span>
                                        ) : (
                                          <span>(cyclical baseline iron requirement of ~15–29mg/day during reproductive years).</span>
                                        )}
                                        {localMenstrual.bleedingDays > 6 && ' Prolonged cycle duration (>6 days) compounds blood volume depletion.'}
                                      </>
                                    )}
                                    {isB12 && (
                                      <>
                                        {localMenstrual.cycleRegularity === 'Irregular' ? (
                                          <span className="text-purple-700 font-semibold">
                                            Irregular cycle timing points to hypothalamic-pituitary-ovarian metabolic energy strain where B12 methylation is critical.
                                          </span>
                                        ) : (
                                          <span>Supports monthly rapid endometrial tissue and red blood cell regeneration.</span>
                                        )}
                                      </>
                                    )}
                                    {isFolate && (
                                      <>
                                        {isPregnant ? (
                                          <span className="text-emerald-700 font-semibold">
                                            Pregnancy significantly elevates folate demand (570 µg/d) for neural tube and fetal erythrocyte development.
                                          </span>
                                        ) : (
                                          <span>Essential for rapid DNA replication during post-menstrual endometrial rebuilding.</span>
                                        )}
                                      </>
                                    )}
                                    {isVitD && (
                                      <>
                                        {localMenstrual.crampSeverity === 'Severe' || localMenstrual.hasDysmenorrhea ? (
                                          <span className="text-amber-20 font-semibold">
                                            Severe cramps / dysmenorrhea reported: Vitamin D deficiency heightens inflammatory prostaglandins and uterine smooth muscle hypercontractility.
                                          </span>
                                        ) : localMenstrual.crampSeverity === 'Moderate' ? (
                                          <span className="text-amber-20 font-semibold">
                                            Moderate cramps reported: Elevated uterine prostaglandin contractility &amp; Vitamin D / Magnesium mineral flux.
                                          </span>
                                        ) : (
                                          <span>Regulates ovarian steroidogenesis and calcium homeostasis across cycle phases.</span>
                                        )}
                                      </>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-slate-500">
                                    Not applicable for biological male cohort (daily iron loss rate ~1mg/day).
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Factor 3: Blood Tests / Lab Biomarkers */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-15" />
                                <span>3. Blood Tests &amp; Biomarkers</span>
                              </div>
                              <p className="text-slate-15 leading-relaxed text-[11px]">
                                {risk.clinicalMarkers.length > 0 ? (
                                  <span className="text-slate-20 font-medium">
                                    {risk.clinicalMarkers.join(' • ')}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">
                                    {isIron && hemoglobin ? `Hb: ${hemoglobin} g/dL (Cutoff: ${anemiaCutoff} g/dL)` : ''}
                                    {isIron && !hemoglobin && 'Lab blood test (Hb/Ferritin) pending. Probability estimated from symptoms and cycle loss.'}
                                    {isB12 && vitaminB12 ? `B12: ${vitaminB12} pg/mL (Optimal >350 pg/mL)` : ''}
                                    {isB12 && !vitaminB12 && 'Serum Vitamin B12 test pending. Score calculated from neurological symptoms & gut acidity.'}
                                    {isFolate && folateB9 ? `Folate: ${folateB9} ng/mL (Optimal >4.0 ng/mL)` : ''}
                                    {isFolate && !folateB9 && 'Serum Folate lab test pending. Score based on dietary and lifecycle indicators.'}
                                    {isVitD && vitaminD ? `25-OH Vit D: ${vitaminD} ng/mL (Optimal ≥30 ng/mL)` : ''}
                                    {isVitD && !vitaminD && '25-OH Vitamin D test pending. High baseline prevalence in urban indoor lifestyles.'}
                                  </span>
                                )}
                              </p>
                            </div>

                            {/* Factor 4: Gut & Bioavailability */}
                            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                <Flame className="w-3.5 h-3.5 text-amber-15" />
                                <span>4. Gut Absorption &amp; Bioavailability</span>
                              </div>
                              <p className="text-slate-15 leading-relaxed text-[11px]">
                                {isIron && (
                                  <>
                                    {localGut.teaCoffeeWithMeals ? (
                                      <span className="text-amber-20 font-semibold">
                                        ⚠️ Chai/coffee consumed near meals contains tannins &amp; polyphenols that reduce non-heme iron absorption by 60–70%.
                                      </span>
                                    ) : (
                                      <span>✓ Chai spaced from meals preserves iron bioavailability.</span>
                                    )}
                                    {localGut.hasAcidity && ' Gastric acidity may impair duodenal reduction.'}
                                  </>
                                )}
                                {isB12 && (
                                  <>
                                    {localGut.frequentAntacidUse ? (
                                      <span className="text-amber-20 font-semibold">
                                        ⚠️ Antacid / PPI use reduces gastric acid required to cleave B12 from protein and bind Intrinsic Factor in the ileum.
                                      </span>
                                    ) : (
                                      <span>Normal stomach acid secretion facilitates cobalamin-intrinsic factor absorption.</span>
                                    )}
                                  </>
                                )}
                                {isFolate && (
                                  <span>
                                    Duodenal and jejunal brush border enzyme function required for polyglutamate-to-monoglutamate conversion.
                                  </span>
                                )}
                                {isVitD && (
                                  <span>
                                    Fat-soluble vitamin absorption depends on dietary healthy fats and bile salt emulsification.
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Dietary Recommendations & Action Steps */}
                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Sparkles className="w-3.5 h-3.5 text-[#F43F5E]" />
                            <span className="font-bold">Key Action Plan:</span>
                            <span className="text-slate-15 text-[11px]">
                              {risk.dietaryFocus.slice(0, 2).join(' • ')}
                            </span>
                          </div>
                          {risk.recommendedTests.length > 0 && (
                            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              Recommended Test: {risk.recommendedTests[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => handleStepNavigation(activeStep - 1)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous Step</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-medium">All data stored securely</span>
            )}

            {justSaved && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-15" />
                <span>Progress saved to profile</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeStep < 5 ? (
              <button
                type="button"
                id="btn-save-and-continue"
                onClick={handleSaveAndContinue}
                className="px-6 py-2.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-extrabold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {justSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                    <span>Saved &amp; Continuing...</span>
                  </>
                ) : (
                  <>
                    <span>Save &amp; Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                id="btn-complete-and-launch-profile"
                onClick={handleSaveAndComplete}
                className="px-6 py-2.5 bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Save Profile &amp; Launch Space</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
