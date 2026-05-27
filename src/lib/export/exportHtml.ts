import { wrapAsDocument, triggerDownload, deriveFileName, type PageSetup } from "./wrap";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
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
 * Download a self-contained .html file. Images stay inline as base64 data URIs.
 */
export function downloadHtml(html: string, options: DownloadHtmlOptions = {}): void {
  const { sourceName = null, title = "Document", pageSetup } = options;
  const cleanHtml = sanitizeHtml(stripPaginationWrappers(html));
  const totalPages = countPageBreaksInHtml(cleanHtml);
  const hf = buildHeaderFooterExportBlocks(pageSetup, totalPages);
  const body = hf.bodyPrefix ? `${hf.bodyPrefix}\n${cleanHtml}` : cleanHtml;
  const document = wrapAsDocument(body, {
    title,
    pageSetup,
    extraCss: hf.css,
  });
  const blob = new Blob([document], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, deriveFileName(sourceName, "html", title));
}
