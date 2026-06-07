import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";
import type { PageSetup } from "@/types";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { watermarkPrintCss } from "@/lib/watermark";
import {
  buildHeaderFooterExportBlocks,
  countPageBreaksInHtml,
} from "./exportHeaderFooter";

interface DownloadHtmlOptions {
  /** Original source filename (if any) — used to derive the export filename */
  sourceName?: string | null;
  /** Document title written into <title> */
  title?: string;
  pageSetup?: PageSetup;
}

/**
 * Build the self-contained export HTML document string (pure — no side effects).
 *
 * Pipeline: strip pagination wrappers (which also re-joins soft-split paragraph
 * pieces back into single paragraphs) → sanitize → wrap in a printable document.
 * Kept separate from {@link downloadHtml} so the round-trip (body content
 * preservation, soft-split re-join, no pagination artifacts) is unit-testable
 * without a DOM download.
 */
export function buildExportHtmlDocument(
  html: string,
  options: DownloadHtmlOptions = {}
): string {
  const { title = "Document", pageSetup } = options;
  const cleanHtml = sanitizeHtml(stripPaginationWrappers(html));
  const totalPages = countPageBreaksInHtml(cleanHtml);
  const hf = buildHeaderFooterExportBlocks(pageSetup, totalPages);
  const body = hf.bodyPrefix ? `${hf.bodyPrefix}\n${cleanHtml}` : cleanHtml;
  const wmCss = watermarkPrintCss(pageSetup?.watermark);
  return wrapAsDocument(body, {
    title,
    pageSetup,
    extraCss: wmCss ? `${hf.css}\n${wmCss}` : hf.css,
  });
}

/**
 * Download a self-contained .html file. Images stay inline as base64 data URIs.
 */
export function downloadHtml(html: string, options: DownloadHtmlOptions = {}): void {
  const { sourceName = null, title = "Document" } = options;
  const document = buildExportHtmlDocument(html, options);
  const blob = new Blob([document], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, deriveFileName(sourceName, "html", title));
}
