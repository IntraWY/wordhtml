import { escapeHtml } from "./escapeHtml";
import { PAGE_TOKEN_REGEX } from "./constants";
import { formatThaiDate } from "@/lib/thai";

export interface PageTokenContext {
  pageNumber: number;
  totalPages: number;
  locale?: string;
  /** Injectable "now" for deterministic rendering/tests. Defaults to new Date(). */
  now?: Date;
}

/**
 * Replace header/footer/body tokens:
 *   {page} {total} {date}
 *   {date_th}        full Buddhist-era date, Thai numerals  (๗ มิถุนายน ๒๕๖๙)
 *   {date_th_short}  short Buddhist-era date, Thai numerals (๗ มิ.ย. ๒๕๖๙)
 *   {date_en}        Gregorian date, Arabic numerals        (7 มิถุนายน 2026)
 */
export function replacePageTokens(html: string, ctx: PageTokenContext): string {
  if (!html) return "";
  const locale = ctx.locale ?? "th-TH";
  const now = ctx.now ?? new Date();
  const localeDate = now.toLocaleDateString(locale);

  const values: Record<string, string> = {
    page: String(ctx.pageNumber),
    total: String(ctx.totalPages),
    date: localeDate,
    date_th: formatThaiDate(now),
    date_th_short: formatThaiDate(now, { month: "short" }),
    date_en: formatThaiDate(now, { digits: "arabic", era: "ce" }),
  };

  const regex = new RegExp(PAGE_TOKEN_REGEX.source, "g");
  return html.replace(regex, (_m, token: string) =>
    escapeHtml(values[token] ?? "")
  );
}

export function listPageTokensIn(html: string): string[] {
  const found = new Set<string>();
  const regex = new RegExp(PAGE_TOKEN_REGEX.source, "g");
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    found.add(match[1]);
  }
  return [...found];
}
