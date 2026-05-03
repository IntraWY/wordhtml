import JSZip from "jszip";

import { docxToHtml } from "@/lib/conversion/docxToHtml";
import { wrapAsDocument } from "@/lib/export/wrap";

function deriveSafeFileName(name: string): string {
  const base = name.replace(/\.docx$/i, "");
  const safe = base.replace(/[^\w\-.]+/g, "_");
  return `${safe || "document"}.html`;
}

/**
 * Batch-convert multiple .docx files to HTML and package them into a ZIP.
 *
 * @param files - Array of Files (should be .docx, non-docx files are skipped)
 * @returns A Blob containing the ZIP archive
 */
export async function batchConvert(files: File[]): Promise<Blob> {
  const docxFiles = files.filter((f) => f.name.toLowerCase().endsWith(".docx"));
  const zip = new JSZip();

  for (let i = 0; i < docxFiles.length; i++) {
    const file = docxFiles[i];
    const result = await docxToHtml(file);
    const html = wrapAsDocument(result.html, file.name.replace(/\.docx$/i, ""));
    zip.file(deriveSafeFileName(file.name), html);
  }

  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
