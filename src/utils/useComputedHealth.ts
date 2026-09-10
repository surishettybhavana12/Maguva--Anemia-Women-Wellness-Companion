import { useMemo } from 'react';
import { useHealthStore } from '../store/useHealthStore';
import { calculateDualEngineBmi } from '../data/whoLmsData';
import { getIcmrNin2020Baseline } from '../data/icmrNinRda2020';
import { calculateAllDeficiencyRisks } from './riskEngine';
import { BmiResult, DeficiencyRisk, RdaBaseline } from '../types';

export function useComputedHealth() {
  const demographics = useHealthStore((state) => state.demographics);
  const menstrual = useHealthStore((state) => state.menstrual);
  const lifestyle = useHealthStore((state) => state.lifestyle);
  const gut = useHealthStore((state) => state.gut);
  const labs = useHealthStore((state) => state.labs);
  const severeSymptoms = useHealthStore((state) => state.severeSymptoms);
  const selectedSymptoms = useHealthStore((state) => state.selectedSymptoms);
  const meals = useHealthStore((state) => state.meals);

  const bmi: BmiResult = useMemo(() => {
    return calculateDualEngineBmi(
      demographics.weightKg,
      demographics.heightCm,
      demographics.age
    );
  }, [demographics.weightKg, demographics.heightCm, demographics.age]);

  const { profile: icmrProfile, baseline: icmrBaseline } = useMemo(() => {
    return getIcmrNin2020Baseline(demographics);
  }, [demographics]);

  const risks: DeficiencyRisk[] = useMemo(() => {
    return calculateAllDeficiencyRisks(
      demographics,
      menstrual,
      lifestyle,
      gut,
      labs,
      selectedSymptoms
    );
  }, [demographics, menstrual, lifestyle, gut, labs, selectedSymptoms]);

  const isTriageTriggered: boolean = useMemo(() => {
    const hbSevere = labs.hemoglobin !== undefined && labs.hemoglobin < 7.0;
    const symptomsSevere =
      severeSymptoms.severeBreathlessness ||
      severeSymptoms.chestPain ||
      severeSymptoms.faintingOrSyncope ||
      severeSymptoms.extremeFatigueImmobile;
    return Boolean(hbSevere || symptomsSevere);
  }, [labs.hemoglobin, severeSymptoms]);

  const dailyTotals = useMemo(() => {
    return meals.reduce(
      (acc, m) => ({
        ironMg: Math.round((acc.ironMg + (m.ironMg || 0)) * 10) / 10,
        b12Mcg: Math.round((acc.b12Mcg + (m.b12Mcg || 0)) * 10) / 10,
        folateMcg: Math.round((acc.folateMcg + (m.folateMcg || 0)) * 10) / 10,
        vitaminDMcg: Math.round((acc.vitaminDMcg + (m.vitaminDMcg || 0)) * 10) / 10,
        vitaminCMg: Math.round((acc.vitaminCMg + (m.vitaminCMg || 0)) * 10) / 10,
        proteinG: Math.round((acc.proteinG + (m.proteinG || 0)) * 10) / 10,
        calciumMg: Math.round((acc.calciumMg + (m.calciumMg || 0)) * 10) / 10,
        zincMg: Math.round((acc.zincMg + (m.zincMg || 0)) * 10) / 10,
        calories: Math.round((acc.calories || 0) + (m.calories || 0)),
      }),
      { ironMg: 0, b12Mcg: 0, folateMcg: 0, vitaminDMcg: 0, vitaminCMg: 0, proteinG: 0, calciumMg: 0, zincMg: 0, calories: 0 }
    );
  }, [meals]);

  return {
    bmi,
    risks,
    isTriageTriggered,
    dailyTotals,
    icmrProfile,
    icmrBaseline,
  };
}

