import type { VariableType } from "@/types";

/**
 * Format a variable value based on its type and format options.
 * Falls back to the raw value if type is undefined or unrecognized.
 */
export function formatValue(
  value: string,
  type?: VariableType,
  format?: string
): string {
  if (!type || type === "text") return value;

  switch (type) {
    case "number":
      return formatNumber(value, format);
    case "currency":
      return formatCurrency(value, format);
    case "date":
      return formatDate(value, format);
    case "percent":
      return formatPercent(value, format);
    default:
      return value;
  }
}

function formatNumber(value: string, format?: string): string {
  const num = parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(num)) return value;

  if (format === "integer") {
    return Math.round(num).toLocaleString("th-TH");
  }

  // default: decimal(2)
  const decimals = format === "decimal(2)" ? 2 : 2;
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatCurrency(value: string, format?: string): string {
  const num = parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(num)) return value;

  const formatted = num.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (format === "USD") {
    return `$${formatted}`;
  }

  // default: THB
  return `${formatted} บาท`;
}

function formatDate(value: string, format?: string): string {
  const date = parseDate(value);
  if (!date) return value;

  if (format === "iso") {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (format === "short") {
    return date.toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  // default: long
  const thaiMonths = [
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
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function formatPercent(value: string, format?: string): string {
  const num = parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(num)) return value;

  if (format === "0.0-1.0") {
    const decimals = 1;
    const formatted = num.toLocaleString("th-TH", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${formatted}%`;
  }

  // default: 0-100 (multiply by 100)
  const percent = num * 100;
  const formatted = percent.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted}%`;
}

/**
 * Parse a date string into a Date object.
 * Supports ISO (2026-05-20), Thai locale (20/05/2568), and delimited formats.
 */
function parseDate(value: string): Date | null {
  if (!value) return null;

  // ISO: 2026-05-20
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Thai locale / common delimited: 20/05/2026 or 20/05/2568
  const thaiMatch = value.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (thaiMatch) {
    let year = Number(thaiMatch[3]);
    if (year > 2500) year -= 543;
    const d = new Date(year, Number(thaiMatch[2]) - 1, Number(thaiMatch[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }

  // Fallback: let JS parse it
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d;

  return null;
}
