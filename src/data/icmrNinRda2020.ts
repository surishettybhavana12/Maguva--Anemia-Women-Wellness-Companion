import { Demographics, RdaBaseline } from '../types';

/**
 * ICMR-National Institute of Nutrition (NIN) 2020 Report & Brief Note Reference Standards
 * "Nutrient Requirements for Indians: Recommended Dietary Allowances (RDA) and Estimated Average Requirements (EAR)"
 * Source: https://www.nin.res.in/rdabook/brief_note.pdf
 */

export interface IcmrReferenceProfile {
  cohortName: string;
  refWeightKg: number;
  refHeightCm: number;
  energyEerKcal: number;
  proteinRdaG: number;
  proteinEarG: number;
  calciumRdaMg: number;
  ironRdaMg: number;
  ironEarMg: number;
  zincRdaMg: number;
  zincEarMg: number;
  vitaminARdaMcg: number;
  vitaminCRdaMg: number;
  vitaminDRdaMcg: number;
  folateRdaMcg: number;
  folateEarMcg: number;
  vitaminB12RdaMcg: number;
  vitaminB12EarMcg: number;
  dietaryFiberG: number;
}

export const ICMR_NIN_2020_PROFILES: Record<string, IcmrReferenceProfile> = {
  // Adult Reference Indian Woman (19–39 yrs, 55 kg)
  'woman-sedentary': {
    cohortName: 'Young Adult Woman (19–39 Years, Sedentary)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1660,
    proteinRdaG: 46.0, // 0.83 g/kg
    proteinEarG: 36.0,
    calciumRdaMg: 1000,
    ironRdaMg: 29.0,
    ironEarMg: 15.0,
    zincRdaMg: 13.2,
    zincEarMg: 11.0,
    vitaminARdaMcg: 840,
    vitaminCRdaMg: 65,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 220,
    folateEarMcg: 180,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'woman-40-59': {
    cohortName: 'Adult Woman (40–59 Years, Sedentary)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1520, // Adjusted for 40-59y metabolic rate (ICMR 2020 Table 2.1)
    proteinRdaG: 46.0,
    proteinEarG: 36.0,
    calciumRdaMg: 1000,
    ironRdaMg: 29.0, // Retains 29mg if menstruating/perimenopausal (EAR: 15mg)
    ironEarMg: 15.0,
    zincRdaMg: 13.2,
    zincEarMg: 11.0,
    vitaminARdaMcg: 840,
    vitaminCRdaMg: 65,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 220,
    folateEarMcg: 180,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'woman-moderate': {
    cohortName: 'Adult Woman (Moderate Work, 19–39y)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 2130,
    proteinRdaG: 46.0,
    proteinEarG: 36.0,
    calciumRdaMg: 1000,
    ironRdaMg: 29.0,
    ironEarMg: 15.0,
    zincRdaMg: 13.2,
    zincEarMg: 11.0,
    vitaminARdaMcg: 840,
    vitaminCRdaMg: 65,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 220,
    folateEarMcg: 180,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'woman-pregnant': {
    cohortName: 'Pregnant Woman (Second / Third Trimester)',
    refWeightKg: 55, // +10-12kg gestational weight
    refHeightCm: 162,
    energyEerKcal: 2010, // +350 kcal/d in 2nd/3rd trimester
    proteinRdaG: 46.0 + 9.5, // +9.5g in 2nd trim, +22g in 3rd trim (avg +15g)
    proteinEarG: 45.0,
    calciumRdaMg: 1200, // increased to 1200 mg
    ironRdaMg: 40.0,
    ironEarMg: 27.0,
    zincRdaMg: 14.5,
    zincEarMg: 12.0,
    vitaminARdaMcg: 900,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 570, // 220 + 350 µg
    folateEarMcg: 480,
    vitaminB12RdaMcg: 2.75, // 2.5 + 0.25 µg
    vitaminB12EarMcg: 2.2,
    dietaryFiberG: 30,
  },
  'woman-pregnant-trim1': {
    cohortName: 'Pregnant Woman (1st Trimester)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1660, // +0 additional EER kcal/day
    proteinRdaG: 46.0 + 0.5, // +0.5g additional protein/day in 1st trimester
    proteinEarG: 36.5,
    calciumRdaMg: 1200, // increased to 1200 mg
    ironRdaMg: 40.0, // remains 40.0 mg across all pregnancy
    ironEarMg: 27.0,
    zincRdaMg: 14.5,
    zincEarMg: 12.0,
    vitaminARdaMcg: 900,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 570, // 220 + 350 µg
    folateEarMcg: 480,
    vitaminB12RdaMcg: 2.75,
    vitaminB12EarMcg: 2.2,
    dietaryFiberG: 30,
  },
  'woman-pregnant-trim2': {
    cohortName: 'Pregnant Woman (2nd Trimester)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1660 + 350, // +350 additional EER kcal/day
    proteinRdaG: 46.0 + 9.5, // +9.5g additional protein/day in 2nd trimester
    proteinEarG: 45.0,
    calciumRdaMg: 1200,
    ironRdaMg: 40.0,
    ironEarMg: 27.0,
    zincRdaMg: 14.5,
    zincEarMg: 12.0,
    vitaminARdaMcg: 900,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 570,
    folateEarMcg: 480,
    vitaminB12RdaMcg: 2.75,
    vitaminB12EarMcg: 2.2,
    dietaryFiberG: 30,
  },
  'woman-pregnant-trim3': {
    cohortName: 'Pregnant Woman (3rd Trimester)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1660 + 350, // +350 additional EER kcal/day
    proteinRdaG: 46.0 + 22.0, // +22.0g additional protein/day in 3rd trimester
    proteinEarG: 58.0,
    calciumRdaMg: 1200,
    ironRdaMg: 40.0,
    ironEarMg: 27.0,
    zincRdaMg: 14.5,
    zincEarMg: 12.0,
    vitaminARdaMcg: 900,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 570,
    folateEarMcg: 480,
    vitaminB12RdaMcg: 2.75,
    vitaminB12EarMcg: 2.2,
    dietaryFiberG: 30,
  },
  'woman-lactating': {
    cohortName: 'Lactating Mother (0–6 Months Postpartum)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 2260, // +600 kcal/d
    proteinRdaG: 46.0 + 17.0, // +17g/d
    proteinEarG: 50.0,
    calciumRdaMg: 1200,
    ironRdaMg: 23.0,
    ironEarMg: 14.0,
    zincRdaMg: 14.2,
    zincEarMg: 11.8,
    vitaminARdaMcg: 950,
    vitaminCRdaMg: 115,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 330, // 220 + 110 µg
    folateEarMcg: 270,
    vitaminB12RdaMcg: 3.0, // 2.5 + 0.5 µg
    vitaminB12EarMcg: 2.4,
    dietaryFiberG: 30,
  },
  // Adolescents
  'adolescent-girl-16-17': {
    cohortName: 'Adolescent Girl (16–17 Years)',
    refWeightKg: 52.1,
    refHeightCm: 157,
    energyEerKcal: 2060,
    proteinRdaG: 43.0,
    proteinEarG: 35.0,
    calciumRdaMg: 1000,
    ironRdaMg: 32.0,
    ironEarMg: 17.0,
    zincRdaMg: 14.2,
    zincEarMg: 11.5,
    vitaminARdaMcg: 860,
    vitaminCRdaMg: 68,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 300,
    folateEarMcg: 240,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'adolescent-girl-13-15': {
    cohortName: 'Adolescent Girl (13–15 Years)',
    refWeightKg: 46.6,
    refHeightCm: 154,
    energyEerKcal: 2110,
    proteinRdaG: 43.2,
    proteinEarG: 35.0,
    calciumRdaMg: 1000,
    ironRdaMg: 30.0,
    ironEarMg: 16.0,
    zincRdaMg: 12.8,
    zincEarMg: 10.5,
    vitaminARdaMcg: 890,
    vitaminCRdaMg: 65,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 285,
    folateEarMcg: 230,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'adolescent-girl-10-12': {
    cohortName: 'Adolescent Girl (10–12 Years)',
    refWeightKg: 34.5,
    refHeightCm: 145,
    energyEerKcal: 1900,
    proteinRdaG: 33.0,
    proteinEarG: 27.0,
    calciumRdaMg: 1000,
    ironRdaMg: 28.0,
    ironEarMg: 15.0,
    zincRdaMg: 9.3,
    zincEarMg: 7.6,
    vitaminARdaMcg: 780,
    vitaminCRdaMg: 50,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 225,
    folateEarMcg: 180,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 25,
  },
  // Adult Reference Indian Man (19–39 yrs, 65 kg, 177 cm)
  'man-sedentary': {
    cohortName: 'Young Adult Man (19–39 Years, Sedentary)',
    refWeightKg: 65,
    refHeightCm: 177,
    energyEerKcal: 2110,
    proteinRdaG: 54.0, // 0.83 g/kg
    proteinEarG: 43.0,
    calciumRdaMg: 1000,
    ironRdaMg: 19.0,
    ironEarMg: 11.0,
    zincRdaMg: 17.0,
    zincEarMg: 14.0,
    vitaminARdaMcg: 1000,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 300,
    folateEarMcg: 250,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 38,
  },
  'man-40-59': {
    cohortName: 'Adult Man (40–59 Years, Sedentary)',
    refWeightKg: 65,
    refHeightCm: 177,
    energyEerKcal: 1920, // Adjusted for 40-59y metabolic rate (ICMR 2020 Table 2.1)
    proteinRdaG: 54.0,
    proteinEarG: 43.0,
    calciumRdaMg: 1000,
    ironRdaMg: 19.0,
    ironEarMg: 11.0,
    zincRdaMg: 17.0,
    zincEarMg: 14.0,
    vitaminARdaMcg: 1000,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 300,
    folateEarMcg: 250,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 35,
  },
  'man-elderly': {
    cohortName: 'Elderly Man (60+ Years)',
    refWeightKg: 65,
    refHeightCm: 177,
    energyEerKcal: 1700,
    proteinRdaG: 54.0,
    proteinEarG: 43.0,
    calciumRdaMg: 1000,
    ironRdaMg: 19.0,
    ironEarMg: 11.0,
    zincRdaMg: 17.0,
    zincEarMg: 14.0,
    vitaminARdaMcg: 1000,
    vitaminCRdaMg: 80,
    vitaminDRdaMcg: 20, // 800 IU for elderly
    folateRdaMcg: 300,
    folateEarMcg: 250,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 30,
  },
  'woman-elderly': {
    cohortName: 'Elderly / Post-Menopausal Woman (60+ Years)',
    refWeightKg: 55,
    refHeightCm: 162,
    energyEerKcal: 1480,
    proteinRdaG: 46.0,
    proteinEarG: 36.0,
    calciumRdaMg: 1000,
    ironRdaMg: 19.0, // Reduced from 29mg to 19mg post-menopause
    ironEarMg: 11.0,
    zincRdaMg: 13.2,
    zincEarMg: 11.0,
    vitaminARdaMcg: 840,
    vitaminCRdaMg: 65,
    vitaminDRdaMcg: 20, // 800 IU for elderly
    folateRdaMcg: 220,
    folateEarMcg: 180,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 25,
  },
  // Adolescent Boys
  'adolescent-boy-16-17': {
    cohortName: 'Adolescent Boy (16–17 Years)',
    refWeightKg: 64.4,
    refHeightCm: 170,
    energyEerKcal: 2800,
    proteinRdaG: 55.4,
    proteinEarG: 44.0,
    calciumRdaMg: 1000,
    ironRdaMg: 26.0,
    ironEarMg: 15.0,
    zincRdaMg: 17.6,
    zincEarMg: 14.2,
    vitaminARdaMcg: 930,
    vitaminCRdaMg: 77,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 340,
    folateEarMcg: 270,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 38,
  },
  'adolescent-boy-13-15': {
    cohortName: 'Adolescent Boy (13–15 Years)',
    refWeightKg: 50.5,
    refHeightCm: 160,
    energyEerKcal: 2540,
    proteinRdaG: 45.0,
    proteinEarG: 36.0,
    calciumRdaMg: 1000,
    ironRdaMg: 22.0,
    ironEarMg: 13.0,
    zincRdaMg: 14.3,
    zincEarMg: 11.6,
    vitaminARdaMcg: 930,
    vitaminCRdaMg: 70,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 300,
    folateEarMcg: 240,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 35,
  },
  'adolescent-boy-10-12': {
    cohortName: 'Adolescent Boy (10–12 Years)',
    refWeightKg: 34.9,
    refHeightCm: 145,
    energyEerKcal: 2070,
    proteinRdaG: 32.0,
    proteinEarG: 26.0,
    calciumRdaMg: 1000,
    ironRdaMg: 16.0,
    ironEarMg: 10.0,
    zincRdaMg: 10.2,
    zincEarMg: 8.3,
    vitaminARdaMcg: 770,
    vitaminCRdaMg: 55,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 220,
    folateEarMcg: 175,
    vitaminB12RdaMcg: 2.5,
    vitaminB12EarMcg: 2.0,
    dietaryFiberG: 28,
  },
  'child-7-9': {
    cohortName: 'Child (7–9 Years)',
    refWeightKg: 25.3,
    refHeightCm: 125,
    energyEerKcal: 1700,
    proteinRdaG: 23.0,
    proteinEarG: 18.0,
    calciumRdaMg: 650,
    ironRdaMg: 15.0,
    ironEarMg: 9.0,
    zincRdaMg: 8.0,
    zincEarMg: 6.5,
    vitaminARdaMcg: 630,
    vitaminCRdaMg: 45,
    vitaminDRdaMcg: 15,
    folateRdaMcg: 170,
    folateEarMcg: 135,
    vitaminB12RdaMcg: 2.0,
    vitaminB12EarMcg: 1.6,
    dietaryFiberG: 22,
  },
};

/**
 * Calculates customized ICMR-NIN 2020 RDA & EAR based on user demographics
 */
export function getIcmrNin2020Baseline(demographics: Demographics): {
  profile: IcmrReferenceProfile;
  baseline: RdaBaseline;
} {
  const { age, isPregnant, isLactating, sex } = demographics;
  const userAge = age || 30;
  const userSex = sex || 'female';

  let key = 'woman-sedentary';

  if (userSex === 'male') {
    if (userAge < 10) {
      key = 'child-7-9';
    } else if (userAge <= 12) {
      key = 'adolescent-boy-10-12';
    } else if (userAge <= 15) {
      key = 'adolescent-boy-13-15';
    } else if (userAge <= 17) {
      key = 'adolescent-boy-16-17';
    } else if (userAge >= 60) {
      key = 'man-elderly';
    } else if (userAge >= 40) {
      key = 'man-40-59';
    } else {
      key = 'man-sedentary';
    }
  } else {
    // Female cohorts
    if (isPregnant) {
      const trimester = demographics.pregnancyTrimester || 2;
      if (trimester === 1) {
        key = 'woman-pregnant-trim1';
      } else if (trimester === 2) {
        key = 'woman-pregnant-trim2';
      } else {
        key = 'woman-pregnant-trim3';
      }
    } else if (isLactating) {
      key = 'woman-lactating';
    } else if (userAge < 10) {
      key = 'child-7-9';
    } else if (userAge <= 12) {
      key = 'adolescent-girl-10-12';
    } else if (userAge <= 15) {
      key = 'adolescent-girl-13-15';
    } else if (userAge <= 17) {
      key = 'adolescent-girl-16-17';
    } else if (userAge >= 60) {
      key = 'woman-elderly';
    } else if (userAge >= 40) {
      key = 'woman-40-59';
    } else {
      key = 'woman-sedentary';
    }
  }

  const profile = ICMR_NIN_2020_PROFILES[key] || ICMR_NIN_2020_PROFILES['woman-sedentary'];

  // If user provided exact body weight, personalize protein RDA (0.83 g/kg/d)
  const customizedProtein = demographics.weightKg && demographics.weightKg > 0
    ? Math.round(demographics.weightKg * 0.83 * 10) / 10
    : profile.proteinRdaG;

  const baseline: RdaBaseline = {
    ironMg: profile.ironRdaMg,
    b12Mcg: profile.vitaminB12RdaMcg,
    folateMcg: profile.folateRdaMcg,
    vitaminDMcg: profile.vitaminDRdaMcg,
    vitaminCMg: profile.vitaminCRdaMg,
    ironEarMg: profile.ironEarMg,
    zincMg: profile.zincRdaMg,
    zincEarMg: profile.zincEarMg,
    calciumMg: profile.calciumRdaMg,
    proteinG: customizedProtein,
    dietaryFiberG: profile.dietaryFiberG,
    vitaminAMcg: profile.vitaminARdaMcg,
    folateEarMcg: profile.folateEarMcg,
    b12EarMcg: profile.vitaminB12EarMcg,
  };

  return { profile, baseline };
}
