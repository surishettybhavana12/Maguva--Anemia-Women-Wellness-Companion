import { BmiResult } from '../types';

// WHO Child Growth Standards / Growth Reference Data for Girls (Ages 5 to 19)
// LMS parameters for BMI-for-age (girls) at yearly milestones
interface WhoLmsEntry {
  ageYears: number;
  L: number;
  M: number; // Median BMI
  S: number; // Coefficient of variation
  sdNeg2: number;
  sdNeg1: number;
  sd0: number;
  sd1: number;
  sd2: number;
  sd3: number;
}

// WHO 2007 Reference Table for Girls 5-19 years
export const WHO_GIRLS_LMS: WhoLmsEntry[] = [
  { ageYears: 5, L: -1.4116, M: 15.2505, S: 0.08889, sdNeg2: 12.9, sdNeg1: 13.9, sd0: 15.3, sd1: 16.8, sd2: 18.8, sd3: 21.4 },
  { ageYears: 6, L: -1.5367, M: 15.3268, S: 0.09575, sdNeg2: 12.8, sdNeg1: 13.9, sd0: 15.3, sd1: 17.1, sd2: 19.3, sd3: 22.4 },
  { ageYears: 7, L: -1.6888, M: 15.5186, S: 0.10493, sdNeg2: 12.8, sdNeg1: 14.0, sd0: 15.5, sd1: 17.5, sd2: 20.1, sd3: 23.7 },
  { ageYears: 8, L: -1.8211, M: 15.8239, S: 0.11475, sdNeg2: 12.9, sdNeg1: 14.2, sd0: 15.8, sd1: 18.0, sd2: 21.0, sd3: 25.3 },
  { ageYears: 9, L: -1.9167, M: 16.2415, S: 0.12423, sdNeg2: 13.1, sdNeg1: 14.5, sd0: 16.2, sd1: 18.7, sd2: 22.1, sd3: 27.0 },
  { ageYears: 10, L: -1.9723, M: 16.7579, S: 0.13289, sdNeg2: 13.4, sdNeg1: 14.9, sd0: 16.8, sd1: 19.4, sd2: 23.2, sd3: 28.8 },
  { ageYears: 11, L: -1.9897, M: 17.3512, S: 0.14035, sdNeg2: 13.8, sdNeg1: 15.3, sd0: 17.4, sd1: 20.3, sd2: 24.5, sd3: 30.6 },
  { ageYears: 12, L: -1.9754, M: 17.9893, S: 0.14643, sdNeg2: 14.2, sdNeg1: 15.9, sd0: 18.0, sd1: 21.1, sd2: 25.7, sd3: 32.4 },
  { ageYears: 13, L: -1.9388, M: 18.6366, S: 0.15112, sdNeg2: 14.7, sdNeg1: 16.4, sd0: 18.6, sd1: 22.0, sd2: 26.9, sd3: 34.0 },
  { ageYears: 14, L: -1.8893, M: 19.2605, S: 0.15448, sdNeg2: 15.2, sdNeg1: 17.0, sd0: 19.3, sd1: 22.8, sd2: 27.9, sd3: 35.5 },
  { ageYears: 15, L: -1.8347, M: 19.8284, S: 0.15668, sdNeg2: 15.7, sdNeg1: 17.6, sd0: 19.8, sd1: 23.5, sd2: 28.8, sd3: 36.8 },
  { ageYears: 16, L: -1.7808, M: 20.3168, S: 0.15797, sdNeg2: 16.1, sdNeg1: 18.0, sd0: 20.3, sd1: 24.1, sd2: 29.6, sd3: 37.8 },
  { ageYears: 17, L: -1.7314, M: 20.7107, S: 0.15858, sdNeg2: 16.4, sdNeg1: 18.4, sd0: 20.7, sd1: 24.6, sd2: 30.1, sd3: 38.6 },
  { ageYears: 18, L: -1.6887, M: 21.0069, S: 0.15873, sdNeg2: 16.7, sdNeg1: 18.7, sd0: 21.0, sd1: 25.0, sd2: 30.6, sd3: 39.2 },
  { ageYears: 19, L: -1.6534, M: 21.2152, S: 0.15860, sdNeg2: 16.9, sdNeg1: 18.9, sd0: 21.2, sd1: 25.3, sd2: 31.0, sd3: 39.7 },
];

// Helper: Standard Normal CDF for Z-Score to Percentile conversion
function normalCdf(z: number): number {
  // Approximation of error function
  const t = 1.0 / (1.0 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.3193815 +
      t *
        (-0.3565638 +
          t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1.0 - prob : prob;
}

export function calculateDualEngineBmi(
  weightKg: number,
  heightCm: number,
  age: number
): BmiResult {
  if (!weightKg || !heightCm || heightCm <= 0 || weightKg <= 0) {
    return {
      bmi: 0,
      category: 'Normal weight',
      isPediatric: age <= 19,
      interpretation: 'Please enter valid height and weight values.',
    };
  }

  const heightM = heightCm / 100;
  const rawBmi = weightKg / (heightM * heightM);
  const roundedBmi = Math.round(rawBmi * 10) / 10;

  // Adult Calculation (> 19 years)
  if (age > 19) {
    let category: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity';
    let asianIndianCategory: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity';
    let interpretation = '';

    // Standard International WHO Thresholds (18.5, 25.0, 30.0)
    if (roundedBmi < 18.5) {
      category = 'Underweight';
    } else if (roundedBmi < 25.0) {
      category = 'Normal weight';
    } else if (roundedBmi < 30.0) {
      category = 'Overweight';
    } else {
      category = 'Obesity';
    }

    // ICMR-NIN 2020 / WHO Asia-Pacific Specific Adult BMI Cut-offs
    // Normal: 18.5 - 22.9 kg/m2, Overweight: 23.0 - 27.4 kg/m2, Obese: >= 27.5 kg/m2
    if (roundedBmi < 18.5) {
      asianIndianCategory = 'Underweight';
      interpretation = `Asian Indian BMI: ${roundedBmi} kg/m² (Underweight, <18.5). Increased vulnerability to nutritional anemia and depleted micronutrient stores.`;
    } else if (roundedBmi <= 22.9) {
      asianIndianCategory = 'Normal weight';
      interpretation = `Asian Indian BMI: ${roundedBmi} kg/m² (Optimal Asian Indian Range: 18.5–22.9 kg/m²). Maintains balanced body fat distribution and metabolic health.`;
    } else if (roundedBmi <= 27.4) {
      asianIndianCategory = 'Overweight';
      interpretation = `Asian Indian BMI: ${roundedBmi} kg/m² (Overweight / Pre-obese threshold: 23.0–27.4 kg/m² as per ICMR-NIN 2020). Higher visceral fat risk; guard against inflammation-induced hepcidin elevation.`;
    } else {
      asianIndianCategory = 'Obesity';
      interpretation = `Asian Indian BMI: ${roundedBmi} kg/m² (Obesity: ≥27.5 kg/m²). Hepcidin elevation can restrict duodenal iron bioavailability.`;
    }

    const refStandardWeightKg = 55; // ICMR-NIN 2020 Reference Indian Woman
    const refStandardHeightCm = 162;
    const refWeightDifferenceKg = Math.round((weightKg - refStandardWeightKg) * 10) / 10;

    return {
      bmi: roundedBmi,
      category,
      asianIndianCategory,
      asianIndianRange: '18.5 – 22.9 kg/m²',
      refStandardWeightKg,
      refStandardHeightCm,
      refWeightDifferenceKg,
      growthMilestone: 'Adult Reference Standard (19–39 yrs: 55 kg / 162 cm)',
      isPediatric: false,
      interpretation,
    };
  }

  // Pediatric / Adolescent Calculation (Age <= 19) using WHO LMS Formula:
  // Z = ((X / M)^L - 1) / (L * S)
  const clampedAge = Math.max(5, Math.min(19, Math.round(age)));
  const lmsEntry =
    WHO_GIRLS_LMS.find((entry) => entry.ageYears === clampedAge) ||
    WHO_GIRLS_LMS[WHO_GIRLS_LMS.length - 1];

  const { L, M, S } = lmsEntry;
  let zScore: number;

  if (Math.abs(L) > 0.0001) {
    zScore = (Math.pow(rawBmi / M, L) - 1) / (L * S);
  } else {
    zScore = Math.log(rawBmi / M) / S;
  }

  const percentile = Math.round(normalCdf(zScore) * 1000) / 10; // e.g. 54.2%
  const roundedZ = Math.round(zScore * 100) / 100;

  let category: 'Underweight' | 'Normal weight' | 'Overweight' | 'Obesity';
  let whoCategory = '';
  let interpretation = '';

  // ICMR-NIN 2020 Reference Weights for Adolescent Girls
  let refWeight = 55;
  let refHeight = 162;
  let milestone = 'Adolescent Growth Phase';

  if (age <= 12) {
    refWeight = 34.5;
    refHeight = 145;
    milestone = 'ICMR-NIN 10–12y Reference (34.5 kg / 145 cm)';
  } else if (age <= 15) {
    refWeight = 46.6;
    refHeight = 154;
    milestone = 'ICMR-NIN 13–15y Reference (46.6 kg / 154 cm)';
  } else if (age <= 17) {
    refWeight = 52.1;
    refHeight = 157;
    milestone = 'ICMR-NIN 16–17y Reference (52.1 kg / 157 cm)';
  } else {
    refWeight = 55.0;
    refHeight = 162;
    milestone = 'ICMR-NIN 18–19y Reference (55.0 kg / 162 cm)';
  }

  const weightDiff = Math.round((weightKg - refWeight) * 10) / 10;

  if (zScore < -2) {
    category = 'Underweight';
    whoCategory = 'Severely Thin / Underweight (<-2 SD)';
    interpretation = `WHO LMS: Z-Score ${roundedZ} (${percentile}th percentile). Severe thinness requires focused whole-food energy & micronutrient support.`;
  } else if (zScore < -1) {
    category = 'Underweight';
    whoCategory = 'Thinness (-2 to -1 SD)';
    interpretation = `WHO LMS: Z-Score ${roundedZ} (${percentile}th percentile). Mild thinness; monitor ferritin and daily dietary micronutrient balance.`;
  } else if (zScore <= 1) {
    category = 'Normal weight';
    whoCategory = 'Normal Growth Median (-1 to +1 SD)';
    interpretation = `WHO LMS: Z-Score ${roundedZ} (${percentile}th percentile). Healthy growth trajectory according to WHO LMS & ICMR-NIN standards.`;
  } else if (zScore <= 2) {
    category = 'Overweight';
    whoCategory = 'Overweight (+1 to +2 SD)';
    interpretation = `WHO LMS: Z-Score ${roundedZ} (${percentile}th percentile). Overweight category (>85th percentile). Ensure micronutrient density with whole foods.`;
  } else {
    category = 'Obesity';
    whoCategory = 'Obesity (> +2 SD)';
    interpretation = `WHO LMS: Z-Score ${roundedZ} (${percentile}th percentile). Obesity category (>97th percentile). Guard against hepcidin-mediated iron blockade.`;
  }

  return {
    bmi: roundedBmi,
    category,
    asianIndianCategory: category,
    asianIndianRange: 'WHO LMS 5th–85th Percentile',
    refStandardWeightKg: refWeight,
    refStandardHeightCm: refHeight,
    refWeightDifferenceKg: weightDiff,
    growthMilestone: milestone,
    isPediatric: true,
    zScore: roundedZ,
    percentile,
    whoCategory,
    interpretation,
  };
}
