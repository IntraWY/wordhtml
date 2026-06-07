const THAI_DIGITS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

const THAI_MONTHS_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/** Replace Arabic digits 0-9 with Thai numerals ๐-๙. */
export function toThaiDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)]);
}

export interface ThaiDateOptions {
  /** "thai" (๒๕๖๙, default) or "arabic" (2569). */
  digits?: "thai" | "arabic";
  /** "be" Buddhist era (default, +543) or "ce". */
  era?: "be" | "ce";
  /** "long" (มิถุนายน, default), "short" (มิ.ย.), or "numeric" (dd/mm/yyyy). */
  month?: "long" | "short" | "numeric";
}

/**
 * Format a date the way Thai official documents expect, e.g.
 *   formatThaiDate(new Date(2026, 5, 7)) → "๗ มิถุนายน ๒๕๖๙"
 */
export function formatThaiDate(
  date: Date,
  options: ThaiDateOptions = {}
): string {
  const digits = options.digits ?? "thai";
  const era = options.era ?? "be";
  const monthMode = options.month ?? "long";

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = era === "be" ? date.getFullYear() + 543 : date.getFullYear();

  const apply = (s: string | number) =>
    digits === "thai" ? toThaiDigits(s) : String(s);

  if (monthMode === "numeric") {
    const dd = String(day).padStart(2, "0");
    const mm = String(monthIndex + 1).padStart(2, "0");
    return `${apply(dd)}/${apply(mm)}/${apply(year)}`;
  }

  const monthName =
    monthMode === "short"
      ? THAI_MONTHS_SHORT[monthIndex]
      : THAI_MONTHS_LONG[monthIndex];

  return `${apply(day)} ${monthName} ${apply(year)}`;
}
