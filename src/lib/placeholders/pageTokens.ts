import { escapeHtml } from "./escapeHtml";
import { PAGE_TOKEN_REGEX, ANY_BRACE_TOKEN_REGEX } from "./constants";
import { formatThaiDate, toThaiDigits } from "@/lib/thai";

export interface PageTokenContext {
  pageNumber: number;
  totalPages: number;
  locale?: string;
  /** Injectable "now" for deterministic rendering/tests. Defaults to new Date(). */
  now?: Date;
}

/** Format a Date as 24h HH:mm. */
function formatTime(now: Date): string {
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Replace header/footer/body tokens:
 *   {page} {total} {date}
 *   {page_th} {total_th}  page/total in Thai numerals (๑, ๕)
 *   {date_th}        full Buddhist-era date, Thai numerals  (๗ มิถุนายน ๒๕๖๙)
 *   {date_th_short}  short Buddhist-era date, Thai numerals (๗ มิ.ย. ๒๕๖๙)
 *   {date_en}        Gregorian date, Arabic numerals        (7 มิถุนายน 2026)
 *   {time} {time_th}  current time HH:mm (Arabic / Thai numerals)
 *
 * Unknown tokens (e.g. {xyz}) are kept literally in the output.
 */
export function replacePageTokens(html: string, ctx: PageTokenContext): string {
  if (!html) return "";
  const locale = ctx.locale ?? "th-TH";
  const now = ctx.now ?? new Date();
  const localeDate = now.toLocaleDateString(locale);
  const time = formatTime(now);

  const values: Record<string, string> = {
    page: String(ctx.pageNumber),
    total: String(ctx.totalPages),
    page_th: toThaiDigits(ctx.pageNumber),
    total_th: toThaiDigits(ctx.totalPages),
    date: localeDate,
    date_th: formatThaiDate(now),
    date_th_short: formatThaiDate(now, { month: "short" }),
    date_en: formatThaiDate(now, { digits: "arabic", era: "ce" }),
    time,
    time_th: toThaiDigits(time),
  };

  const regex = new RegExp(ANY_BRACE_TOKEN_REGEX.source, "g");
  return html.replace(regex, (match, token: string) =>
    token in values ? escapeHtml(values[token]) : match
  );
}

/** All supported page tokens with a one-line Thai description (for help UI). */
export const PAGE_TOKEN_HELP: ReadonlyArray<{
  token: string;
  description: string;
}> = [
  { token: "{page}", description: "เลขหน้าปัจจุบัน (1, 2, 3)" },
  { token: "{total}", description: "จำนวนหน้าทั้งหมด" },
  { token: "{page_th}", description: "เลขหน้าเป็นเลขไทย (๑, ๒, ๓)" },
  { token: "{total_th}", description: "จำนวนหน้าทั้งหมดเป็นเลขไทย" },
  { token: "{date}", description: "วันที่ปัจจุบันตาม locale (เช่น 7/6/2569)" },
  { token: "{date_th}", description: "วันที่ไทยเต็ม พ.ศ. (๗ มิถุนายน ๒๕๖๙)" },
  { token: "{date_th_short}", description: "วันที่ไทยแบบย่อ (๗ มิ.ย. ๒๕๖๙)" },
  { token: "{date_en}", description: "วันที่เลขอารบิก ค.ศ. (7 มิถุนายน 2026)" },
  { token: "{time}", description: "เวลาปัจจุบัน HH:mm (14:05)" },
  { token: "{time_th}", description: "เวลาปัจจุบันเป็นเลขไทย (๑๔:๐๕)" },
];

export function listPageTokensIn(html: string): string[] {
  const found = new Set<string>();
  const regex = new RegExp(PAGE_TOKEN_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}
