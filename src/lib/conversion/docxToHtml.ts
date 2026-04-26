// mammoth ships a `browser` field in package.json that swaps Node-only modules
// for browser-compatible builds, so the standard import works in webpack/turbopack.
import mammoth, { type ConvertMessage } from "mammoth";

export type MammothMessage = ConvertMessage;

export interface ConvertResult {
  html: string;
  warnings: MammothMessage[];
}

/**
 * Convert a .docx file to HTML in the browser using mammoth.js.
 *
 * Images are inlined as base64 data URIs so the editor can display them
 * without any server-side asset handling. The export pipeline can later
 * extract them to separate files for ZIP downloads.
 *
 * Returns the full mammoth message objects (type + message) for warnings
 * and errors so the UI can surface them with the correct severity.
 */
export async function docxToHtml(file: File): Promise<ConvertResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      // Default mammoth image converter inlines as base64 — explicit for clarity.
      convertImage: mammoth.images.imgElement(async (image) => {
        const buffer = await image.read("base64");
        return { src: `data:${image.contentType};base64,${buffer}` };
      }),
    }
  );

  return {
    html: result.value,
    warnings: result.messages.filter(
      (m) => m.type === "warning" || m.type === "error"
    ),
  };
}
