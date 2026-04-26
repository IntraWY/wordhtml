import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";

interface DownloadDocxOptions {
  sourceName?: string | null;
  title?: string;
}

/**
 * Convert HTML to a .docx file using html-docx-js (browser-friendly via the
 * altchunks technique). Output opens cleanly in Microsoft Word and LibreOffice.
 *
 * The library is dynamically imported to keep it out of the initial bundle.
 */
export async function downloadDocx(
  html: string,
  options: DownloadDocxOptions = {}
): Promise<void> {
  const { sourceName = null, title = "Document" } = options;

  const { asBlob } = await import("html-docx-js/dist/html-docx");
  const document = wrapAsDocument(html, title);
  const blob = asBlob(document);

  triggerDownload(blob, deriveFileName(sourceName, "docx"));
}
