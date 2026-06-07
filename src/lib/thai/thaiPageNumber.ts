import { toThaiDigits } from "./thaiFormat";

export interface ThaiPageNumberOptions {
  /** "arabic" (1/5, default) or "thai" (๑/๕). */
  digits?: "thai" | "arabic";
  /** When true (default), prefix with "หน้า ". */
  label?: boolean;
}

/** Coerce a value to a non-negative integer; non-finite or negative → 0. */
function toSafeInteger(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value);
}

/**
 * Format a page indicator the way Thai documents expect, e.g.
 *   formatThaiPageNumber(1, 5)                      → "หน้า 1/5"
 *   formatThaiPageNumber(1, 5, { digits: "thai" }) → "หน้า ๑/๕"
 *   formatThaiPageNumber(2, 3, { label: false })   → "2/3"
 */
export function formatThaiPageNumber(
  current: number,
  total: number,
  options: ThaiPageNumberOptions = {}
): string {
  const digits: "thai" | "arabic" = options.digits ?? "arabic";
  const label: boolean = options.label ?? true;

  const safeCurrent = toSafeInteger(current);
  const safeTotal = toSafeInteger(total);

  const apply = (n: number): string =>
    digits === "thai" ? toThaiDigits(n) : String(n);

  const body = `${apply(safeCurrent)}/${apply(safeTotal)}`;

  return label ? `หน้า ${body}` : body;
}
