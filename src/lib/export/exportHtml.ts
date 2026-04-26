import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";

interface DownloadHtmlOptions {
  /** Original source filename (if any) — used to derive the export filename */
  sourceName?: string | null;
  /** Document title written into <title> */
  title?: string;
}

/**
 * Download a self-contained .html file. Images stay inline as base64 data URIs.
 */
export function downloadHtml(html: string, options: DownloadHtmlOptions = {}): void {
  const { sourceName = null, title = "Document" } = options;
  const document = wrapAsDocument(html, title);
  const blob = new Blob([document], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, deriveFileName(sourceName, "html"));
}
