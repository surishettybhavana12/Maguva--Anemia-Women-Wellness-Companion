import { Demographics, MenstrualHealth, LifestyleMetabolic, GutHealth, LabDataPanel, SevereSymptoms } from '../types';

export interface SampleProfile {
  id: string;
  label: string;
  subtitle: string;
  demographics: Demographics;
  menstrual: MenstrualHealth;
  lifestyle: LifestyleMetabolic;
  gut: GutHealth;
  labs: LabDataPanel;
  severeSymptoms: SevereSymptoms;
}

export const SAMPLE_PROFILES: SampleProfile[] = [];
