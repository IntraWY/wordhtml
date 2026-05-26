import { extractImages } from "@/lib/images";
import { wrapAsDocument, triggerDownload, deriveFileName, type PageSetup } from "./wrap";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface DownloadZipOptions {
  sourceName?: string | null;
  title?: string;
  pageSetup?: PageSetup;
}

/**
 * Download a ZIP containing index.html plus an img/ folder with extracted
 * image files. The HTML's img tags are rewritten to point at img/imageN.ext.
 */
export async function downloadZip(
  html: string,
  options: DownloadZipOptions = {}
): Promise<void> {
  const { sourceName = null, title = "Document", pageSetup } = options;

  const JSZip = (await import("jszip")).default;
  const cleanHtml = sanitizeHtml(stripPaginationWrappers(html));
  const { html: rewrittenHtml, images } = extractImages(cleanHtml, "img");
  const zip = new JSZip();
  zip.file("index.html", wrapAsDocument(rewrittenHtml, { title, pageSetup }));

  if (images.length > 0) {
    const folder = zip.folder("img");
    for (const image of images) {
      folder?.file(image.filename, image.blob);
    }
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  if (blob.size === 0) {
    throw new Error("ZIP export failed: empty archive");
  }
  triggerDownload(blob, deriveFileName(sourceName, "zip", title));
}
