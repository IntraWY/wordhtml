/**
 * Extract base64-encoded images from HTML and rewrite their src attributes
 * to point at separate files (e.g. img/image1.png).
 *
 * Used by the ZIP exporter to ship images alongside the HTML instead of
 * inlined as data URIs.
 */
export interface ExtractedImage {
  filename: string;
  mimeType: string;
  blob: Blob;
}

export interface ImageExtractionResult {
  html: string;
  images: ExtractedImage[];
}

const MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
};

export function extractImages(
  html: string,
  basePath = "img"
): ImageExtractionResult {
  if (!html) return { html: "", images: [] };

  const doc = new DOMParser().parseFromString(
    `<!doctype html><html><body>${html}</body></html>`,
    "text/html"
  );

  const images: ExtractedImage[] = [];
  let counter = 1;

  doc.body.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src || !src.startsWith("data:")) return;

    const match = src.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return;

    const mimeType = match[1];
    const base64 = match[2];
    const ext = MIME_TO_EXT[mimeType] ?? "bin";
    const filename = `image${counter}.${ext}`;
    counter += 1;

    const blob = base64ToBlob(base64, mimeType);
    images.push({ filename, mimeType, blob });
    img.setAttribute("src", `${basePath}/${filename}`);
  });

  return { html: doc.body.innerHTML, images };
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}
