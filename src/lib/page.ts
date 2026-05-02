export const PX_PER_CM = 794 / 21; // 96 DPI: 21cm = 794px

export const A4 = { wMm: 210, hMm: 297 };
export const LETTER = { wMm: 215.9, hMm: 279.4 };

export function mmToPx(mm: number): number {
  return (mm / 10) * PX_PER_CM;
}
