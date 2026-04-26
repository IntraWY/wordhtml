import JSZip from "jszip";

import { extractImages } from "@/lib/images";
import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";

interface DownloadZipOptions {
  sourceName?: string | null;
  title?: string;
}

/**
 * Download a ZIP containing index.html plus an img/ folder with extracted
 * image files. The HTML's img tags are rewritten to point at img/imageN.ext.
 */
export async function downloadZip(
  html: string,
  options: DownloadZipOptions = {}
): Promise<void> {
  const { sourceName = null, title = "Document" } = options;

  const { html: rewrittenHtml, images } = extractImages(html, "img");
  const zip = new JSZip();
  zip.file("index.html", wrapAsDocument(rewrittenHtml, title));

  if (images.length > 0) {
    const folder = zip.folder("img");
    for (const image of images) {
      folder?.file(image.filename, image.blob);
    }
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerDownload(blob, deriveFileName(sourceName, "zip"));
}
