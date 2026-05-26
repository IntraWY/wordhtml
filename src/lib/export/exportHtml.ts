import { wrapAsDocument, triggerDownload, deriveFileName, type PageSetup } from "./wrap";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

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
  const document = wrapAsDocument(cleanHtml, { title, pageSetup });
  const blob = new Blob([document], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, deriveFileName(sourceName, "html", title));
}
