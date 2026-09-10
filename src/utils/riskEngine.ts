import {
  Demographics,
  MenstrualHealth,
  LifestyleMetabolic,
  GutHealth,
  LabDataPanel,
  DeficiencyRisk,
  RiskTier,
  SymptomImpactDetail,
} from '../types';

export function calculateAllDeficiencyRisks(
  demographics: Demographics,
  menstrual: MenstrualHealth,
  lifestyle: LifestyleMetabolic,
  gut: GutHealth,
  labs: LabDataPanel,
  selectedSymptoms: string[] = []
): DeficiencyRisk[] {
  const ironRisk = calculateIronRisk(demographics, menstrual, lifestyle, gut, labs, selectedSymptoms);
  const b12Risk = calculateB12Risk(demographics, menstrual, lifestyle, gut, labs, selectedSymptoms);
  const folateRisk = calculateFolateRisk(demographics, menstrual, lifestyle, gut, labs, selectedSymptoms);
  const vitaminDRisk = calculateVitaminDRisk(demographics, menstrual, lifestyle, labs, selectedSymptoms);

  return [ironRisk, b12Risk, folateRisk, vitaminDRisk];
}

function getTier(probability: number): RiskTier {
  if (probability >= 60) return 'High';
  if (probability >= 30) return 'Moderate';
  return 'Low';
}

function calculateIronRisk(
  demographics: Demographics,
  menstrual: MenstrualHealth,
  _lifestyle: LifestyleMetabolic,
  gut: GutHealth,
  labs: LabDataPanel,
  selectedSymptoms: string[]
): DeficiencyRisk {
  const clinicalMarkers: string[] = [];
  let symptomMatches: string[] = [];
  const missingInformation: string[] = [];
  const skippedTests: string[] = [];

  // Check which iron lab tests are missing or explicitly skipped
  const isHbAvailable = labs.hemoglobin !== undefined && labs.hemoglobin !== null && !isNaN(labs.hemoglobin);
  const isFerritinAvailable = labs.serumFerritin !== undefined && labs.serumFerritin !== null && !isNaN(labs.serumFerritin);
  const isTsatAvailable = labs.transferrinSaturation !== undefined && labs.transferrinSaturation !== null && !isNaN(labs.transferrinSaturation);
  const isMcvAvailable = labs.mcv !== undefined && labs.mcv !== null && !isNaN(labs.mcv);

  if (!isHbAvailable) {
    missingInformation.push('Recent Hemoglobin (Hb) blood count not entered / skipped');
    skippedTests.push('Hemoglobin (Hb)');
  }
  if (!isFerritinAvailable) {
    missingInformation.push('Serum Ferritin (iron storage protein) lab test missing / skipped');
    skippedTests.push('Serum Ferritin');
  }

  // 1. Specific Iron Symptoms (NIH NHLBI & ICMR-NIN Guidelines)
  const ironSymptomDefinitions = [
    { id: 'iron_fatigue', label: 'Fatigue & Chronic Exhaustion' },
    { id: 'iron_dizziness', label: 'Dizziness or Lightheadedness' },
    { id: 'iron_cold_hands', label: 'Cold Hands and Feet' },
    { id: 'iron_pale_skin', label: 'Pale Skin (Palmar / Conjunctival Pallor)' },
    { id: 'iron_breathlessness', label: 'Shortness of Breath on Exertion' },
  ];

  let symptomImpacts: SymptomImpactDetail[] = [];

  let matchedSymptomCount = 0;
  let symptomScore = 0;
  ironSymptomDefinitions.forEach((s) => {
    if (selectedSymptoms.includes(s.id)) {
      matchedSymptomCount++;
      symptomMatches.push(s.label);
      symptomImpacts.push({ name: s.label, impactPercent: 12, category: 'symptom' });
      symptomScore += 12; // Base symptom weight
    }
  });

  // 2. Demographic & Physiological Factors
  let demographicScore = 0;
  const isFemale = String(demographics?.sex || '').toLowerCase() === 'female';
  if (isFemale) {
    if (menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting') {
      demographicScore += 20;
      const msg = `Heavy menstrual flow with clotting (~15-30mg additional iron loss per cycle)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 20, category: 'menstrual' });
    }
    if (menstrual.bleedingDays && menstrual.bleedingDays > 6) {
      demographicScore += 10;
      const msg = `Prolonged menstrual bleeding (>6 days active RBC shedding)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 10, category: 'menstrual' });
    }
    if (menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea) {
      demographicScore += 8;
      const msg = `Severe period cramps / dysmenorrhea (Myometrial ischemic spasms & high blood flow burden)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 8, category: 'menstrual' });
    }
    if (menstrual.cycleRegularity === 'Irregular') {
      demographicScore += 8;
      const msg = `Irregular / delayed cycles (hypoxia & metabolic down-regulation)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 8, category: 'menstrual' });
    }
  }

  // 3. Gut & Digestive Absorption Impairment
  const gutFactors: string[] = [];
  let gutScore = 0;
  if (gut.teaCoffeeWithMeals) {
    gutScore += 12;
    const msg = 'Tea or coffee taken with meals (Tannins reduce non-heme iron absorption)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 12, category: 'gut' });
  }
  if (gut.hasAcidity || gut.frequentAntacidUse) {
    gutScore += 10;
    const msg = 'Frequent acidity or antacids (Reduces stomach acid needed to absorb iron)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 10, category: 'gut' });
  }
  if (gut.hasGas || gut.hasBloating || gut.hasIBS || gut.hasDiarrhea) {
    gutScore += 8;
    const msg = 'Digestive gas, bloating, or IBS (Affects gut lining and iron uptake)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 8, category: 'gut' });
  }
  if (gutFactors.length > 0) {
    symptomMatches.push(...gutFactors);
  }

  if (demographics.isPregnant) {
    demographicScore += 18;
    const msg = `Increased physiological blood volume & fetal-placental iron requirements (ICMR RDA 40mg/day)`;
    symptomMatches.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 18, category: 'demographic' });
  }
  if (demographics.age && demographics.age <= 19) {
    demographicScore += 10;
    const msg = `Adolescent growth spurt with rapid tissue expansion and blood volume doubling`;
    symptomMatches.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 10, category: 'demographic' });
  }

  const nonLabRawScore = symptomScore + demographicScore + gutScore;

  // 4. Lab Biomarker Scoring (Never assign dummy numbers!)
  const clinicalImpacts: SymptomImpactDetail[] = [];
  let labScore = 0;
  if (isHbAvailable) {
    const hb = labs.hemoglobin!;
    if (hb < 8.0) {
      labScore += 45;
      const msg = `Severe Anemia: Hemoglobin ${hb} g/dL (<8.0 g/dL critical cutoff)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 45, category: 'symptom' });
    } else if (hb < 11.0) {
      labScore += 35;
      const msg = `Moderate Anemia: Hemoglobin ${hb} g/dL (WHO non-pregnant threshold 12.0)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 35, category: 'symptom' });
    } else if (hb < 12.0) {
      labScore += 20;
      const msg = `Mild Anemia: Hemoglobin ${hb} g/dL (borderline <12.0 g/dL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 20, category: 'symptom' });
    }
  }

  if (isFerritinAvailable) {
    const ferritin = labs.serumFerritin!;
    if (ferritin < 15) {
      labScore += 35;
      const msg = `Depleted Iron Stores: Ferritin ${ferritin} ng/mL (<15 ng/mL absolute deficiency)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 35, category: 'symptom' });
    } else if (ferritin < 30) {
      labScore += 20;
      const msg = `Sub-optimal Iron Stores: Ferritin ${ferritin} ng/mL (<30 ng/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 20, category: 'symptom' });
    }
  }

  if (isTsatAvailable && labs.transferrinSaturation! < 16) {
    labScore += 15;
    const msg = `Low Transferrin Saturation: ${labs.transferrinSaturation}% (<16% indicates iron-deficient erythropoiesis)`;
    clinicalMarkers.push(msg);
    clinicalImpacts.push({ name: msg, impactPercent: 15, category: 'symptom' });
  }

  if (isMcvAvailable && labs.mcv! < 80) {
    labScore += 10;
    const msg = `Microcytic RBCs: MCV ${labs.mcv} fL (<80 fL characteristic of IDA)`;
    clinicalMarkers.push(msg);
    clinicalImpacts.push({ name: msg, impactPercent: 10, category: 'symptom' });
  }

  // Weight shifting & Confidence Calculation
  let finalScore = 0;
  let confidencePercent = 100;
  let confidenceNote = '';
  let isSymptomOnlyEstimate = false;
  let isPartialLabVerified = false;

  const noLabsEntered = !isHbAvailable && !isFerritinAvailable && !isTsatAvailable && !isMcvAvailable;

  if (noLabsEntered) {
    // SCENARIO: ALL TESTS SKIPPED / MISSING
    // 100% calculation based on symptomatic data + demographic profile
    isSymptomOnlyEstimate = true;
    confidencePercent = nonLabRawScore > 0 ? 50 : 100;
    // Scale non-lab score to 100-point range (max potential non-lab raw score is ~95)
    finalScore = nonLabRawScore > 0 ? Math.min(100, Math.round((nonLabRawScore / 85) * 100)) : 0;
    confidenceNote = nonLabRawScore > 0 ? 'Symptom-Based Estimate (No Lab Data Verified)' : 'No Clinical Risk Factors or Symptoms Reported';
  } else if (!isHbAvailable || !isFerritinAvailable) {
    // SCENARIO: SINGLE / PARTIAL TEST SKIPPED (e.g. CBC entered, Ferritin skipped)
    isPartialLabVerified = true;
    confidencePercent = 70; // 70% confidence due to missing test
    const missingName = !isFerritinAvailable ? 'Ferritin' : 'Hemoglobin';
    
    // Scale up symptom + demographic factors to compensate for missing lab marker weight
    const nonLabWeightShifted = nonLabRawScore * 1.35;
    finalScore = Math.min(100, Math.round(labScore + nonLabWeightShifted));
    const tier = getTier(finalScore);
    confidenceNote = `${tier} Risk - ${confidencePercent}% Confidence due to missing ${missingName} test`;
  } else {
    // SCENARIO: FULLY VERIFIED LABS
    confidencePercent = 100;
    finalScore = Math.min(100, Math.round(labScore + nonLabRawScore * 0.7));
    confidenceNote = '100% Confidence — Full Multi-Marker Lab Verified';
  }

  finalScore = Math.min(100, Math.max(0, finalScore));
  const probabilityPercent = finalScore;
  const riskTier = getTier(probabilityPercent);

  // Filter out any period/menstrual impacts for non-female biological cohort
  if (!isFemale) {
    symptomMatches = symptomMatches.filter(
      (m) =>
        !m.toLowerCase().includes('menstrual') &&
        !m.toLowerCase().includes('cramp') &&
        !m.toLowerCase().includes('cycle') &&
        !m.toLowerCase().includes('dysmenorrhea') &&
        !m.toLowerCase().includes('period') &&
        !m.toLowerCase().includes('bleed') &&
        !m.toLowerCase().includes('flow') &&
        !m.toLowerCase().includes('ovarian') &&
        !m.toLowerCase().includes('pregnancy') &&
        !m.toLowerCase().includes('lactation')
    );
    symptomImpacts = symptomImpacts.filter(
      (i) =>
        i.category !== 'menstrual' &&
        !i.name.toLowerCase().includes('menstrual') &&
        !i.name.toLowerCase().includes('cramp') &&
        !i.name.toLowerCase().includes('cycle') &&
        !i.name.toLowerCase().includes('dysmenorrhea') &&
        !i.name.toLowerCase().includes('period') &&
        !i.name.toLowerCase().includes('bleed') &&
        !i.name.toLowerCase().includes('flow') &&
        !i.name.toLowerCase().includes('ovarian') &&
        !i.name.toLowerCase().includes('pregnancy') &&
        !i.name.toLowerCase().includes('lactation')
    );
  }

  // If partial, format confidenceNote cleanly
  if (isPartialLabVerified) {
    const missingName = !isFerritinAvailable ? 'Ferritin' : 'Hemoglobin';
    confidenceNote = `${riskTier} Risk - ${confidencePercent}% Confidence due to missing ${missingName} test`;
  }

  return {
    id: 'iron',
    ruleId: 'IRON_RISK_001',
    name: 'Iron Deficiency / Anemia (IDA)',
    riskTier,
    riskScore: finalScore,
    probabilityPercent,
    confidencePercent,
    confidenceNote,
    isSymptomOnlyEstimate,
    isPartialLabVerified,
    skippedTests,
    clinicalMarkers,
    clinicalImpacts,
    symptomMatches,
    symptomImpacts,
    symptomMatchCount: matchedSymptomCount,
    totalCategorySymptoms: ironSymptomDefinitions.length,
    gutAbsorptionFactor:
      gutFactors.length > 0
        ? `Absorption Impaired: ${gutFactors.length} digestive barriers detected`
        : 'Normal gastric absorption environment',
    missingInformation,
    biomarkerSummary:
      isHbAvailable && isFerritinAvailable
        ? `Hb: ${labs.hemoglobin} g/dL | Ferritin: ${labs.serumFerritin} ng/mL | MCV: ${labs.mcv || '--'} fL`
        : isHbAvailable
        ? `Hb: ${labs.hemoglobin} g/dL | Ferritin Skipped (70% Confidence)`
        : `Symptom-Based Estimate (${matchedSymptomCount}/${ironSymptomDefinitions.length} Symptoms Reported)`,
    recommendedTests: [
      'Complete Blood Count (CBC) with Peripheral Smear',
      'Full Iron Profile (Serum Ferritin, Serum Iron, TIBC, % Transferrin Saturation)',
      'High-Sensitivity C-Reactive Protein (hs-CRP) to rule out inflammation-masked ferritin',
    ],
    dietaryFocus: [
      'Vitamin C pairing with meals (fresh Amla juice, lemon squeeze, guava) to 3x iron uptake',
      'Garden Cress seeds (Halim / Aliv) soaked in water or dates (100mg Fe/100g)',
      'Black Sesame & Jaggery (Til-Gud) laddoos (14.5mg Fe/100g)',
      'Strictly separate chai/coffee by minimum 2 hours before and after iron-rich meals',
    ],
    verifiedSources: [
      {
        title: 'Iron Deficiency Anemia Health Guide & Clinical Diagnosis',
        organization: 'NIH - National Heart, Lung, and Blood Institute (NHLBI)',
        url: 'https://www.nhlbi.nih.gov/health/anemia/iron-deficiency-anemia',
        topic: 'Iron Deficiency',
      },
      {
        title: 'Anemia Mukt Bharat Operational Guidelines',
        organization: 'Ministry of Health & Family Welfare (MoHFW), Govt. of India',
        url: 'https://anemiamuktbharat.info/',
        topic: 'National Anemia Policy',
      },
    ],
    urgencyLevel: probabilityPercent >= 70 ? 'High Clinical Concern' : probabilityPercent >= 35 ? 'Moderate Attention' : 'Routine',
  };
}

function calculateB12Risk(
  demographics: Demographics,
  menstrual: MenstrualHealth,
  lifestyle: LifestyleMetabolic,
  gut: GutHealth,
  labs: LabDataPanel,
  selectedSymptoms: string[]
): DeficiencyRisk {
  const clinicalMarkers: string[] = [];
  let symptomMatches: string[] = [];
  const missingInformation: string[] = [];
  const skippedTests: string[] = [];

  const isB12Available = labs.vitaminB12 !== undefined && labs.vitaminB12 !== null && !isNaN(labs.vitaminB12);
  const isMcvAvailable = labs.mcv !== undefined && labs.mcv !== null && !isNaN(labs.mcv);

  if (!isB12Available) {
    missingInformation.push('Serum Vitamin B12 immunoassay lab test missing / skipped');
    skippedTests.push('Vitamin B12');
  }

  // 1. Specific B12 Symptoms (NIH NHLBI & NIH ODS Guidelines)
  const b12SymptomDefinitions = [
    { id: 'b12_tingling', label: 'Tingling feelings or pain (Paresthesia / Pins & Needles)' },
    { id: 'b12_trouble_walking', label: 'Trouble walking (Balance / Gait ataxia)' },
    { id: 'b12_muscle_movements', label: 'Uncontrollable muscle movements / Twitching' },
    { id: 'b12_confusion_memory', label: 'Confusion, slower thinking, forgetfulness & memory loss' },
    { id: 'b12_mood_changes', label: 'Mood or mental changes (Depression / Irritability)' },
    { id: 'b12_smell_taste', label: 'Problems with smell or taste' },
    { id: 'b12_vision', label: 'Vision problems / Optic nerve sensitivity' },
    { id: 'b12_diarrhea_weight_loss', label: 'Diarrhea and unexplained weight loss' },
    { id: 'b12_glossitis', label: 'Glossitis (Painful, smooth, beefy-red tongue)' },
  ];

  // Common cross-vector clinical symptoms relevant to B12
  const commonB12SymptomMappings = [
    {
      ids: ['fatigue_exhaustion'],
      label: '[Selected Symptom: Fatigue] Persistent Fatigue & Exhaustion (Impaired succinyl-CoA synthesis)',
      impact: 12,
    },
    {
      ids: ['dizziness_lightheadedness'],
      label: '[Selected Symptom: Dizziness] Dizziness & Lightheadedness (Postural orthostatic strain)',
      impact: 10,
    },
    {
      ids: ['pale_cold_skin'],
      label: '[Selected Symptom: Pale Skin] Pale Cutaneous Skin (Megaloblastic ineffective erythropoiesis)',
      impact: 12,
    },
    {
      ids: ['brain_fog_poor_concentration'],
      label: '[Selected Symptom: Brain Fog] Brain Fog & Poor Concentration (Defective SAMe myelin methylation)',
      impact: 12,
    },
    {
      ids: ['shortness_breath_exertion'],
      label: '[Selected Symptom: Shortness of Breath] Exertional breathlessness (Reduced RBC oxygen transport)',
      impact: 10,
    },
    {
      ids: ['heart_palpitations_racing'],
      label: '[Selected Symptom: Heart Palpitations] Racing Pulse (Compensatory hyperdynamic cardiac output)',
      impact: 10,
    },
    {
      ids: ['frequent_headaches'],
      label: '[Selected Symptom: Headaches] Frequent Headaches (Microvascular cerebral perfusion strain)',
      impact: 10,
    },
    {
      ids: ['muscle_weakness_twitches'],
      label: '[Selected Symptom: Muscle Weakness] Muscle Weakness & Twitches (Motor axon demyelination)',
      impact: 12,
    },
    {
      ids: ['cold_hands_feet'],
      label: '[Selected Symptom: Cold Extremities] Cold Hands & Feet (Peripheral autonomic microvascular tone flux)',
      impact: 8,
    },
  ];

  let symptomImpacts: SymptomImpactDetail[] = [];

  let matchedSymptomCount = 0;
  let symptomScore = 0;
  b12SymptomDefinitions.forEach((s) => {
    if (selectedSymptoms.includes(s.id)) {
      matchedSymptomCount++;
      symptomMatches.push(s.label);
      symptomImpacts.push({ name: s.label, impactPercent: 10, category: 'symptom' });
      symptomScore += 10;
    }
  });

  commonB12SymptomMappings.forEach((m) => {
    if (m.ids.some((id) => selectedSymptoms.includes(id))) {
      matchedSymptomCount++;
      symptomMatches.push(m.label);
      symptomImpacts.push({ name: m.label, impactPercent: m.impact, category: 'symptom' });
      symptomScore += m.impact;
    }
  });

  // 2. Demographic & Gut Factors
  let demographicScore = 0;
  const isFemale = String(demographics?.sex || '').toLowerCase() === 'female';
  if (isFemale && menstrual.cycleRegularity === 'Irregular') {
    demographicScore += 8;
    const msg = `Irregular cycles linked to hyperhomocysteinemia & impaired ovarian perfusion`;
    symptomMatches.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 8, category: 'menstrual' });
  }

  const gutFactors: string[] = [];
  let gutScore = 0;
  if (gut.frequentAntacidUse || gut.hasAcidity) {
    gutScore += 18;
    const msg = 'Frequent acidity or antacids (Reduces stomach acid needed to release Vitamin B12 from food)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 18, category: 'gut' });
  }
  if (gut.hPyloriHistory || gut.hasIBS || gut.hasDiarrhea) {
    gutScore += 18;
    const msg = 'Frequent diarrhea, IBS, or H. pylori history (Reduces Intrinsic Factor & B12 absorption in the intestine)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 18, category: 'gut' });
  }
  if (gut.hasGas || gut.hasBloating || gut.hasConstipation) {
    gutScore += 8;
    const msg = 'Gas, bloating, or constipation (Imbalanced gut bacteria can reduce B12 absorption)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 8, category: 'gut' });
  }
  if (gutFactors.length > 0) {
    symptomMatches.push(...gutFactors);
  }

  const nonLabRawScore = symptomScore + demographicScore + gutScore;

  // 3. Lab Biomarkers (Never assign dummy numbers!)
  const clinicalImpacts: SymptomImpactDetail[] = [];
  let labScore = 0;
  if (isB12Available) {
    const b12 = labs.vitaminB12!;
    if (b12 < 150) {
      labScore += 60;
      const msg = `Severe Vitamin B12 Deficiency: ${b12} pg/mL (<150 pg/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 60, category: 'symptom' });
    } else if (b12 < 250) {
      labScore += 40;
      const msg = `Borderline Low Vitamin B12: ${b12} pg/mL (optimal >350 pg/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 40, category: 'symptom' });
    } else if (b12 < 350) {
      labScore += 20;
      const msg = `Sub-optimal Vitamin B12: ${b12} pg/mL`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 20, category: 'symptom' });
    }
  }

  if (isMcvAvailable && labs.mcv! > 96) {
    labScore += 20;
    const msg = `Macrocytosis / High MCV: ${labs.mcv} fL (>96 fL hints at megaloblastic DNA synthesis impairment)`;
    clinicalMarkers.push(msg);
    clinicalImpacts.push({ name: msg, impactPercent: 20, category: 'symptom' });
  }

  let finalScore = 0;
  let confidencePercent = 100;
  let confidenceNote = '';
  let isSymptomOnlyEstimate = false;
  let isPartialLabVerified = false;

  if (!isB12Available && !isMcvAvailable) {
    // 100% calculation based on symptomatic data
    isSymptomOnlyEstimate = true;
    confidencePercent = nonLabRawScore > 0 ? 50 : 100;
    finalScore = nonLabRawScore > 0 ? Math.min(100, Math.round((nonLabRawScore / 80) * 100)) : 0;
    confidenceNote = nonLabRawScore > 0 ? 'Symptom-Based Estimate (No Lab Data Verified)' : 'No Clinical Risk Factors or Symptoms Reported';
  } else if (!isB12Available && isMcvAvailable) {
    isPartialLabVerified = true;
    confidencePercent = 70;
    finalScore = Math.min(100, Math.round(labScore + nonLabRawScore * 1.3));
    const tier = getTier(finalScore);
    confidenceNote = `${tier} Risk - ${confidencePercent}% Confidence due to missing Serum B12 test`;
  } else {
    confidencePercent = 100;
    finalScore = Math.min(100, Math.round(labScore + nonLabRawScore * 0.6));
    confidenceNote = '100% Confidence — Lab Verified';
  }

  finalScore = Math.min(100, Math.max(0, finalScore));
  const probabilityPercent = finalScore;
  const riskTier = getTier(probabilityPercent);

  // Filter out any period/menstrual impacts for non-female biological cohort
  if (!isFemale) {
    symptomMatches = symptomMatches.filter(
      (m) =>
        !m.toLowerCase().includes('menstrual') &&
        !m.toLowerCase().includes('cramp') &&
        !m.toLowerCase().includes('cycle') &&
        !m.toLowerCase().includes('dysmenorrhea') &&
        !m.toLowerCase().includes('period') &&
        !m.toLowerCase().includes('bleed') &&
        !m.toLowerCase().includes('flow') &&
        !m.toLowerCase().includes('ovarian') &&
        !m.toLowerCase().includes('pregnancy') &&
        !m.toLowerCase().includes('lactation')
    );
    symptomImpacts = symptomImpacts.filter(
      (i) =>
        i.category !== 'menstrual' &&
        !i.name.toLowerCase().includes('menstrual') &&
        !i.name.toLowerCase().includes('cramp') &&
        !i.name.toLowerCase().includes('cycle') &&
        !i.name.toLowerCase().includes('dysmenorrhea') &&
        !i.name.toLowerCase().includes('period') &&
        !i.name.toLowerCase().includes('bleed') &&
        !i.name.toLowerCase().includes('flow') &&
        !i.name.toLowerCase().includes('ovarian') &&
        !i.name.toLowerCase().includes('pregnancy') &&
        !i.name.toLowerCase().includes('lactation')
    );
  }

  if (isPartialLabVerified) {
    confidenceNote = `${riskTier} Risk - ${confidencePercent}% Confidence due to missing Vitamin B12 test`;
  }

  return {
    id: 'b12',
    ruleId: 'B12_RISK_002',
    name: 'Vitamin B12 (Cobalamin) Deficiency',
    riskTier,
    riskScore: finalScore,
    probabilityPercent,
    confidencePercent,
    confidenceNote,
    isSymptomOnlyEstimate,
    isPartialLabVerified,
    skippedTests,
    clinicalMarkers,
    clinicalImpacts,
    symptomMatches,
    symptomImpacts,
    symptomMatchCount: matchedSymptomCount,
    totalCategorySymptoms: b12SymptomDefinitions.length,
    gutAbsorptionFactor:
      gutFactors.length > 0
        ? `Intrinsic Factor Risk: ${gutFactors.length} gastric barriers present`
        : 'Intact gastric acid & mucosal absorption profile',
    missingInformation,
    biomarkerSummary:
      isB12Available
        ? `Serum B12: ${labs.vitaminB12} pg/mL ${labs.mcv ? `| MCV: ${labs.mcv} fL` : ''}`
        : `Symptom-Based Estimate (${matchedSymptomCount}/${b12SymptomDefinitions.length} Symptoms + Gut Cleavage Profile)`,
    recommendedTests: [
      'Serum Vitamin B12 (Cobalamin) Immunoassay',
      'Serum Methylmalonic Acid (MMA) — gold-standard tissue functional marker',
      'Serum Homocysteine (cardiovascular & neuro-vascular co-marker)',
    ],
    dietaryFocus: [
      'Fortified nutritional yeast (2 tbsp provides >100% daily B12 RDA)',
      'Desi A2 curd / fermented buttermilk (Chaas) with roasted jeera',
      'Fortified plant milks / fortified cereals',
      'Sublingual methylcobalamin lozenge (bypasses gastrointestinal intrinsic factor malabsorption)',
    ],
    verifiedSources: [
      {
        title: 'Vitamin B12-Deficiency Anemia Health Guide',
        organization: 'NIH - National Heart, Lung, and Blood Institute (NHLBI)',
        url: 'https://www.nhlbi.nih.gov/health/anemia/vitamin-b12-deficiency-anemia',
        topic: 'Vitamin B12 Deficiency',
      },
      {
        title: 'Vitamin B12 Fact Sheet for Health Professionals',
        organization: 'NIH - Office of Dietary Supplements (ODS)',
        url: 'https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/',
        topic: 'Cobalamin Metabolism',
      },
    ],
    urgencyLevel: probabilityPercent >= 65 ? 'High Clinical Concern' : probabilityPercent >= 30 ? 'Moderate Attention' : 'Routine',
  };
}

function calculateFolateRisk(
  demographics: Demographics,
  menstrual: MenstrualHealth,
  lifestyle: LifestyleMetabolic,
  gut: GutHealth,
  labs: LabDataPanel,
  selectedSymptoms: string[]
): DeficiencyRisk {
  const clinicalMarkers: string[] = [];
  let symptomMatches: string[] = [];
  const missingInformation: string[] = [];
  const skippedTests: string[] = [];

  const isFolateAvailable = labs.folateB9 !== undefined && labs.folateB9 !== null && !isNaN(labs.folateB9);

  if (!isFolateAvailable) {
    missingInformation.push('Serum Folate (B9) / RBC Folate lab panel missing / skipped');
    skippedTests.push('Folate (B9)');
  }

  // 1. Specific Folate Symptoms (NIH ODS & WHO Guidelines)
  const folateSymptomDefinitions = [
    { id: 'folate_weakness', label: 'Weakness (Muscular & physical lack of strength)' },
    { id: 'folate_fatigue', label: 'Fatigue (Sluggish daytime exhaustion)' },
    { id: 'folate_concentrating', label: 'Difficulty concentrating (Brain fog / loss of focus)' },
    { id: 'folate_irritability', label: 'Irritability (Restlessness / agitation)' },
    { id: 'folate_headache', label: 'Headache (Frequent tension or vascular headaches)' },
    { id: 'folate_palpitations', label: 'Heart palpitations (Pounding or fluttering heartbeat)' },
    { id: 'folate_breathlessness', label: 'Shortness of breath on routine exertion' },
    { id: 'folate_oral_sores', label: 'Soreness & mouth ulcerations on tongue/mucosa' },
    { id: 'folate_pigmentation', label: 'Changes in skin, hair, or fingernail pigmentation' },
  ];

  // Common cross-vector clinical symptoms relevant to Folate (B9)
  const commonFolateSymptomMappings = [
    {
      ids: ['fatigue_exhaustion'],
      label: '[Selected Symptom: Fatigue] Persistent Fatigue (Megaloblastic defective DNA synthesis)',
      impact: 12,
    },
    {
      ids: ['dizziness_lightheadedness'],
      label: '[Selected Symptom: Dizziness] Dizziness & Lightheadedness (Megaloblastic CNS hypoxia)',
      impact: 12,
    },
    {
      ids: ['pale_cold_skin'],
      label: '[Selected Symptom: Pale Skin] Pale Skin Pallor (Hemolysis of fragile macrocytes)',
      impact: 12,
    },
    {
      ids: ['brain_fog_poor_concentration'],
      label: '[Selected Symptom: Brain Fog] Brain Fog & Concentration Loss (Impaired tetrahydrofolate synthesis)',
      impact: 12,
    },
    {
      ids: ['shortness_breath_exertion'],
      label: '[Selected Symptom: Shortness of Breath] Exertional breathlessness (Macrocytic oxygen deficit)',
      impact: 12,
    },
    {
      ids: ['heart_palpitations_racing'],
      label: '[Selected Symptom: Heart Palpitations] Racing Pulse (Compensatory hyperdynamic cardiac output)',
      impact: 10,
    },
    {
      ids: ['frequent_headaches'],
      label: '[Selected Symptom: Headaches] Frequent Headaches (Elevated plasma homocysteine)',
      impact: 10,
    },
    {
      ids: ['brittle_nails_hair_loss'],
      label: '[Selected Symptom: Hair Loss / Brittle Nails] Hair Shedding (Impaired rapid epithelial DNA turnover)',
      impact: 10,
    },
    {
      ids: ['cold_hands_feet'],
      label: '[Selected Symptom: Cold Extremities] Cold Extremities (Reduced peripheral microvascular O2 delivery)',
      impact: 8,
    },
  ];

  let symptomImpacts: SymptomImpactDetail[] = [];

  let matchedSymptomCount = 0;
  let symptomScore = 0;
  folateSymptomDefinitions.forEach((s) => {
    if (selectedSymptoms.includes(s.id)) {
      matchedSymptomCount++;
      symptomMatches.push(s.label);
      symptomImpacts.push({ name: s.label, impactPercent: 10, category: 'symptom' });
      symptomScore += 10;
    }
  });

  commonFolateSymptomMappings.forEach((m) => {
    if (m.ids.some((id) => selectedSymptoms.includes(id))) {
      matchedSymptomCount++;
      symptomMatches.push(m.label);
      symptomImpacts.push({ name: m.label, impactPercent: m.impact, category: 'symptom' });
      symptomScore += m.impact;
    }
  });

  // 2. Demographic & Cycle Factors
  let demographicScore = 0;
  const isFemale = String(demographics?.sex || '').toLowerCase() === 'female';
  if (isFemale) {
    if (menstrual.flowIntensity === 'Heavy' || menstrual.flowIntensity === 'Clotting' || (menstrual.bleedingDays && menstrual.bleedingDays > 6)) {
      demographicScore += 15;
      const msg = `Heavy / prolonged menstrual blood loss accelerates bone marrow reticulocyte turnover, depleting one-carbon Folate cofactors`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 15, category: 'menstrual' });
    }
    if (menstrual.cycleRegularity === 'Irregular') {
      demographicScore += 8;
      const msg = `Irregular cycles linked to ovulatory cellular DNA turnover`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 8, category: 'menstrual' });
    }
  }

  if (isFemale && (demographics.isPregnant || demographics.isLactating)) {
    demographicScore += 30;
    const msg = `Pregnancy / Lactation creates critical demand for embryonic neural tube closure and rapid cell division (RDA 500µg)`;
    symptomMatches.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 30, category: 'demographic' });
  }

  const gutFactors: string[] = [];
  let gutScore = 0;
  if (gut.hasBloating || gut.hasIndigestion || gut.hasGas) {
    gutScore += 12;
    const msg = 'Bloating, gas, or indigestion (Reduced digestive enzymes limit the breakdown and absorption of natural folate)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 12, category: 'gut' });
  }
  if (gut.hasDiarrhea || gut.hasIBS) {
    gutScore += 12;
    const msg = 'Frequent diarrhea or IBS (Rapid digestive transit lowers folate absorption)';
    gutFactors.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 12, category: 'gut' });
  }
  if (gutFactors.length > 0) {
    symptomMatches.push(...gutFactors);
  }

  const nonLabRawScore = symptomScore + demographicScore + gutScore;

  // 3. Lab Biomarkers
  const clinicalImpacts: SymptomImpactDetail[] = [];
  let labScore = 0;
  if (isFolateAvailable) {
    const folate = labs.folateB9!;
    if (folate < 3.0) {
      labScore += 55;
      const msg = `Serum Folate Deficiency: ${folate} ng/mL (<3.0 ng/mL critical cutoff)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 55, category: 'symptom' });
    } else if (folate < 5.0) {
      labScore += 30;
      const msg = `Borderline Serum Folate: ${folate} ng/mL (optimal >7.0 ng/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 30, category: 'symptom' });
    }
  }

  let finalScore = 0;
  let confidencePercent = 100;
  let confidenceNote = '';
  let isSymptomOnlyEstimate = false;
  let isPartialLabVerified = false;

  if (!isFolateAvailable) {
    // 100% symptomatic calculation
    isSymptomOnlyEstimate = true;
    confidencePercent = nonLabRawScore > 0 ? 50 : 100;
    finalScore = nonLabRawScore > 0 ? Math.min(100, Math.round((nonLabRawScore / 85) * 100)) : 0;
    confidenceNote = nonLabRawScore > 0 ? 'Symptom-Based Estimate (No Lab Data Verified)' : 'No Clinical Risk Factors or Symptoms Reported';
  } else {
    confidencePercent = 100;
    finalScore = Math.min(100, Math.round(labScore + nonLabRawScore * 0.6));
    confidenceNote = '100% Confidence — Lab Verified';
  }

  finalScore = Math.min(100, Math.max(0, finalScore));
  const probabilityPercent = finalScore;
  const riskTier = getTier(probabilityPercent);

  // Filter out any period/menstrual impacts for non-female biological cohort
  if (!isFemale) {
    symptomMatches = symptomMatches.filter(
      (m) =>
        !m.toLowerCase().includes('menstrual') &&
        !m.toLowerCase().includes('cramp') &&
        !m.toLowerCase().includes('cycle') &&
        !m.toLowerCase().includes('dysmenorrhea') &&
        !m.toLowerCase().includes('period') &&
        !m.toLowerCase().includes('bleed') &&
        !m.toLowerCase().includes('flow') &&
        !m.toLowerCase().includes('ovarian') &&
        !m.toLowerCase().includes('pregnancy') &&
        !m.toLowerCase().includes('lactation')
    );
    symptomImpacts = symptomImpacts.filter(
      (i) =>
        i.category !== 'menstrual' &&
        !i.name.toLowerCase().includes('menstrual') &&
        !i.name.toLowerCase().includes('cramp') &&
        !i.name.toLowerCase().includes('cycle') &&
        !i.name.toLowerCase().includes('dysmenorrhea') &&
        !i.name.toLowerCase().includes('period') &&
        !i.name.toLowerCase().includes('bleed') &&
        !i.name.toLowerCase().includes('flow') &&
        !i.name.toLowerCase().includes('ovarian') &&
        !i.name.toLowerCase().includes('pregnancy') &&
        !i.name.toLowerCase().includes('lactation')
    );
  }

  return {
    id: 'folate',
    ruleId: 'FOLATE_RISK_003',
    name: 'Folate (Vitamin B9) Deficiency',
    riskTier,
    riskScore: finalScore,
    probabilityPercent,
    confidencePercent,
    confidenceNote,
    isSymptomOnlyEstimate,
    isPartialLabVerified,
    skippedTests,
    clinicalMarkers,
    clinicalImpacts,
    symptomMatches,
    symptomImpacts,
    symptomMatchCount: matchedSymptomCount,
    totalCategorySymptoms: folateSymptomDefinitions.length,
    gutAbsorptionFactor:
      gutFactors.length > 0
        ? `Jejunal Uptake Risk: ${gutFactors.length} digestive barriers detected`
        : 'Optimal jejunal brush-border deconjugation',
    missingInformation,
    biomarkerSummary:
      isFolateAvailable
        ? `Serum Folate: ${labs.folateB9} ng/mL`
        : `Symptom-Based Estimate (${matchedSymptomCount}/${folateSymptomDefinitions.length} Symptoms + Maternal Demands)`,
    recommendedTests: [
      'Serum Folate & Red Blood Cell (RBC) Folate (reflects tissue stores over 120 days)',
      'Total Serum Homocysteine',
    ],
    dietaryFocus: [
      'Drumstick leaves (Moringa) and methi leaves lightly steamed with cold-pressed mustard oil',
      'Sprouted green gram (Moong) sundal (rich in naturally active L-methylfolate)',
      'Fresh avocado, oranges, and raw beetroot salad with lemon dressing',
    ],
    verifiedSources: [
      {
        title: 'Folate Fact Sheet for Health Professionals',
        organization: 'NIH - Office of Dietary Supplements (ODS)',
        url: 'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/',
        topic: 'Folate & Neural Development',
      },
      {
        title: 'Guideline: Daily Iron and Folic Acid Supplementation in Pregnant Women',
        organization: 'World Health Organization (WHO)',
        url: 'https://www.who.int/publications/i/item/9789241501996',
        topic: 'Folate & Maternal Health',
      },
    ],
    urgencyLevel: probabilityPercent >= 60 ? 'High Clinical Concern' : probabilityPercent >= 30 ? 'Moderate Attention' : 'Routine',
  };
}

function calculateVitaminDRisk(
  demographics: Demographics,
  menstrual: MenstrualHealth,
  lifestyle: LifestyleMetabolic,
  labs: LabDataPanel,
  selectedSymptoms: string[]
): DeficiencyRisk {
  const clinicalMarkers: string[] = [];
  let symptomMatches: string[] = [];
  const missingInformation: string[] = [];
  const skippedTests: string[] = [];

  const isVitDAvailable = labs.vitaminD !== undefined && labs.vitaminD !== null && !isNaN(labs.vitaminD);

  if (!isVitDAvailable) {
    missingInformation.push('25-Hydroxy Vitamin D [25(OH)D] blood test missing / skipped');
    skippedTests.push('Vitamin D3 (25-OH)');
  }

  // 1. Specific Vitamin D Symptoms (NIH ODS & Smart Health Report India)
  const vitDSymptomDefinitions = [
    { id: 'vitd_persistent_fatigue', label: 'Persistent Fatigue and Tiredness (Despite 7-8h sleep)' },
    { id: 'vitd_bone_back_pain', label: 'Bone Pain and Lower Back Pain (Deep aching in pelvis & spine)' },
    { id: 'vitd_muscle_weakness_cramps', label: 'Muscle Weakness and Cramps (Difficulty climbing stairs/calf cramps)' },
    { id: 'vitd_frequent_illness', label: 'Frequent Illness and Infections (Recurrent colds/weak immunity)' },
    { id: 'vitd_hair_loss', label: 'Hair Loss (Telogen effluvium / diffuse shedding)' },
    { id: 'vitd_depression_mood', label: 'Depression and Low Mood (Reduced serotonin synthesis)' },
    { id: 'vitd_slow_wound_healing', label: 'Slow Wound Healing (Delayed cut and bruise recovery)' },
  ];

  // Common cross-vector clinical symptoms relevant to Vitamin D
  const commonVitDSymptomMappings = [
    {
      ids: ['fatigue_exhaustion'],
      label: '[Selected Symptom: Fatigue] Persistent Fatigue (Skeletal muscle mitochondrial phosphorylation deficit)',
      impact: 12,
    },
    {
      ids: ['dizziness_lightheadedness'],
      label: '[Selected Symptom: Dizziness] Dizziness & Lightheadedness (Vascular calcium flux & BP regulation)',
      impact: 10,
    },
    {
      ids: ['pale_cold_skin'],
      label: '[Selected Symptom: Pale Skin] Pale Skin (Cutaneous pre-vitamin D3 synthesis attenuation)',
      impact: 8,
    },
    {
      ids: ['brain_fog_poor_concentration'],
      label: '[Selected Symptom: Brain Fog] Brain Fog & Mood Changes (Hippocampal VDR receptor loss)',
      impact: 10,
    },
    {
      ids: ['brittle_nails_hair_loss'],
      label: '[Selected Symptom: Hair Loss / Brittle Nails] Diffuse Hair Shedding (Hair follicle VDR atrophy)',
      impact: 12,
    },
    {
      ids: ['frequent_headaches'],
      label: '[Selected Symptom: Headaches] Frequent Headaches (Altered vascular tone & pericranial muscle stiffness)',
      impact: 10,
    },
    {
      ids: ['muscle_weakness_twitches'],
      label: '[Selected Symptom: Muscle Weakness] Muscle Weakness & Twitching (Sarcoplasmic calcium release dysfunction)',
      impact: 12,
    },
    {
      ids: ['cold_hands_feet'],
      label: '[Selected Symptom: Cold Extremities] Cold Extremities (Perivascular smooth muscle tone flux)',
      impact: 8,
    },
  ];

  let symptomImpacts: SymptomImpactDetail[] = [];

  let matchedSymptomCount = 0;
  let symptomScore = 0;
  vitDSymptomDefinitions.forEach((s) => {
    if (selectedSymptoms.includes(s.id)) {
      matchedSymptomCount++;
      symptomMatches.push(s.label);
      symptomImpacts.push({ name: s.label, impactPercent: 12, category: 'symptom' });
      symptomScore += 12;
    }
  });

  commonVitDSymptomMappings.forEach((m) => {
    if (m.ids.some((id) => selectedSymptoms.includes(id))) {
      matchedSymptomCount++;
      symptomMatches.push(m.label);
      symptomImpacts.push({ name: m.label, impactPercent: m.impact, category: 'symptom' });
      symptomScore += m.impact;
    }
  });

  // 2. Demographic & Lifestyle Factors
  let demographicScore = 0;
  const isFemale = String(demographics?.sex || '').toLowerCase() === 'female';
  if (isFemale) {
    if (menstrual.crampSeverity === 'Severe' || menstrual.hasDysmenorrhea) {
      demographicScore += 18;
      const msg = `Severe menstrual cramps / Dysmenorrhea (Low Vitamin D elevates inflammatory uterine prostaglandins & COX-2 spasms)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 18, category: 'menstrual' });
    } else if (menstrual.crampSeverity === 'Moderate') {
      demographicScore += 10;
      const msg = `Moderate menstrual cramps (Elevated uterine prostaglandin contractility & Vitamin D / Magnesium flux)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 10, category: 'menstrual' });
    }
    if (menstrual.cycleRegularity === 'Irregular') {
      demographicScore += 18;
      const msg = `Irregular / missed cycles (Ovarian granulosa VDR receptor dysfunction & insulin resistance impairing follicle egg maturation)`;
      symptomMatches.push(msg);
      symptomImpacts.push({ name: msg, impactPercent: 18, category: 'menstrual' });
    }
  }

  if (demographics.age && demographics.age > 40) {
    demographicScore += 12;
    const msg = `Age over 40 (Natural reduction in skin Vitamin D synthesis)`;
    symptomMatches.push(msg);
    symptomImpacts.push({ name: msg, impactPercent: 12, category: 'demographic' });
  }

  const nonLabRawScore = symptomScore + demographicScore;

  // 3. Lab Biomarkers
  const clinicalImpacts: SymptomImpactDetail[] = [];
  let labScore = 0;
  if (isVitDAvailable) {
    const vitD = labs.vitaminD!;
    if (vitD < 12) {
      labScore += 65;
      const msg = `Severe Vitamin D Deficiency: ${vitD} ng/mL (<12 ng/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 65, category: 'symptom' });
    } else if (vitD < 20) {
      labScore += 45;
      const msg = `Vitamin D Deficiency: ${vitD} ng/mL (<20 ng/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 45, category: 'symptom' });
    } else if (vitD < 30) {
      labScore += 25;
      const msg = `Insufficient Vitamin D: ${vitD} ng/mL (optimal 30-60 ng/mL)`;
      clinicalMarkers.push(msg);
      clinicalImpacts.push({ name: msg, impactPercent: 25, category: 'symptom' });
    }
  }

  let finalScore = 0;
  let confidencePercent = 100;
  let confidenceNote = '';
  let isSymptomOnlyEstimate = false;
  let isPartialLabVerified = false;

  if (!isVitDAvailable) {
    // 100% calculation based on symptomatic data
    isSymptomOnlyEstimate = true;
    confidencePercent = nonLabRawScore > 0 ? 50 : 100;
    finalScore = nonLabRawScore > 0 ? Math.min(100, Math.round((nonLabRawScore / 85) * 100)) : 0;
    confidenceNote = nonLabRawScore > 0 ? 'Symptom-Based Estimate (No Lab Data Verified)' : 'No Clinical Risk Factors or Symptoms Reported';
  } else {
    confidencePercent = 100;
    finalScore = Math.min(100, Math.round(labScore + nonLabRawScore * 0.6));
    confidenceNote = '100% Confidence — Lab Verified';
  }

  finalScore = Math.min(100, Math.max(0, finalScore));
  const probabilityPercent = finalScore;
  const riskTier = getTier(probabilityPercent);

  // Filter out any period/menstrual impacts for non-female biological cohort
  if (!isFemale) {
    symptomMatches = symptomMatches.filter(
      (m) =>
        !m.toLowerCase().includes('menstrual') &&
        !m.toLowerCase().includes('cramp') &&
        !m.toLowerCase().includes('cycle') &&
        !m.toLowerCase().includes('dysmenorrhea') &&
        !m.toLowerCase().includes('period') &&
        !m.toLowerCase().includes('bleed') &&
        !m.toLowerCase().includes('flow') &&
        !m.toLowerCase().includes('ovarian') &&
        !m.toLowerCase().includes('pregnancy') &&
        !m.toLowerCase().includes('lactation')
    );
    symptomImpacts = symptomImpacts.filter(
      (i) =>
        i.category !== 'menstrual' &&
        !i.name.toLowerCase().includes('menstrual') &&
        !i.name.toLowerCase().includes('cramp') &&
        !i.name.toLowerCase().includes('cycle') &&
        !i.name.toLowerCase().includes('dysmenorrhea') &&
        !i.name.toLowerCase().includes('period') &&
        !i.name.toLowerCase().includes('bleed') &&
        !i.name.toLowerCase().includes('flow') &&
        !i.name.toLowerCase().includes('ovarian') &&
        !i.name.toLowerCase().includes('pregnancy') &&
        !i.name.toLowerCase().includes('lactation')
    );
  }

  return {
    id: 'vitaminD',
    ruleId: 'VITD_RISK_004',
    name: 'Vitamin D3 (Cholecalciferol) Deficiency',
    riskTier,
    riskScore: finalScore,
    probabilityPercent,
    confidencePercent,
    confidenceNote,
    isSymptomOnlyEstimate,
    isPartialLabVerified,
    skippedTests,
    clinicalMarkers,
    clinicalImpacts,
    symptomMatches,
    symptomImpacts,
    symptomMatchCount: matchedSymptomCount,
    totalCategorySymptoms: vitDSymptomDefinitions.length,
    missingInformation,
    biomarkerSummary:
      isVitDAvailable
        ? `25(OH)D: ${labs.vitaminD} ng/mL`
        : `Symptom-Based Estimate (${matchedSymptomCount}/${vitDSymptomDefinitions.length} Symptoms + Cycle & Sunlight Index)`,
    recommendedTests: [
      '25-Hydroxy Vitamin D [25(OH)D] Total Immunoassay',
      'Serum Calcium, Phosphorus, and Intact Parathyroid Hormone (iPTH)',
    ],
    dietaryFocus: [
      '20 mins morning sun exposure between 08:00 AM - 10:00 AM (arms and face exposed)',
      'UV-exposed sun-dried button mushrooms (ergocalciferol / D2)',
      'Fortified cow milk / fortified plant milks',
      'High-dose weekly cholecalciferol (60,000 IU) under physician supervision if <20 ng/mL',
    ],
    verifiedSources: [
      {
        title: 'Vitamin D Fact Sheet for Health Professionals',
        organization: 'NIH - Office of Dietary Supplements (ODS)',
        url: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
        topic: 'Vitamin D & Musculoskeletal Health',
      },
      {
        title: 'Prevalence and Clinical Signs of Vitamin D Deficiency in India',
        organization: 'Smart Health Report India / Endocrine Society Guidelines',
        url: 'https://smarthealthreport.in/blog/vitamin-d-deficiency-india',
        topic: 'Indian Population Vitamin D Epidemic',
      },
    ],
    urgencyLevel: probabilityPercent >= 65 ? 'High Clinical Concern' : probabilityPercent >= 35 ? 'Moderate Attention' : 'Routine',
  };
}


