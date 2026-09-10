export function cmToFeetInches(cm: number | null | undefined): { ft: number; inches: number } {
  if (!cm || cm <= 0) return { ft: 0, inches: 0 };
  const totalInches = Math.round(cm / 2.54);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return { ft, inches };
}

export function feetInchesToCm(ft: number, inches: number): number {
  const safeFt = Math.max(0, Number(ft) || 0);
  const safeIn = Math.max(0, Number(inches) || 0);
  const totalInches = safeFt * 12 + safeIn;
  return Math.round(totalInches * 2.54);
}

export function formatHeightFtIn(cm: number | null | undefined): string {
  if (!cm || cm <= 0) return '—';
  const { ft, inches } = cmToFeetInches(cm);
  return `${ft}' ${inches}" (${cm} cm)`;
}
