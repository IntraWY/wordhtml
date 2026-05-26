import { escapeHtml } from "./escapeHtml";
import { PAGE_TOKEN_REGEX } from "./constants";

export interface PageTokenContext {
  pageNumber: number;
  totalPages: number;
  locale?: string;
}

/**
 * Replace header/footer tokens: {page}, {total}, {date}
 */
export function replacePageTokens(
  html: string,
  ctx: PageTokenContext
): string {
  if (!html) return "";
  const locale = ctx.locale ?? "th-TH";
  const date = new Date().toLocaleDateString(locale);
  return html
    .replace(/\{page\}/g, escapeHtml(String(ctx.pageNumber)))
    .replace(/\{total\}/g, escapeHtml(String(ctx.totalPages)))
    .replace(/\{date\}/g, escapeHtml(date));
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
