import JSZip from "jszip";

import { docxToHtml } from "@/lib/conversion/docxToHtml";
import { loadHtmlFile } from "@/lib/conversion/loadHtmlFile";
import { wrapAsDocument } from "@/lib/export/wrap";

export interface BatchConvertProgress {
  current: number;
  total: number;
  fileName: string;
}

export interface BatchConvertOptions {
  onProgress?: (p: BatchConvertProgress) => void;
  signal?: AbortSignal;
}

function deriveSafeFileName(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/i, "");
  const safe = base.replace(/[^\w\-.]+/g, "_");
  return `${safe || "document"}.${ext}`;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("ยกเลิกการแปลงแล้ว", "AbortError");
  }
}

/**
 * Batch-convert .docx / .html files to HTML and package into a ZIP.
 */
export async function batchConvert(
  files: File[],
  options: BatchConvertOptions = {}
): Promise<Blob> {
  const { onProgress, signal } = options;
  const supported = files.filter((f) => {
    const lower = f.name.toLowerCase();
    return (
      lower.endsWith(".docx") ||
      lower.endsWith(".html") ||
      lower.endsWith(".htm")
    );
  });

  const zip = new JSZip();
  const total = supported.length;

  for (let i = 0; i < supported.length; i++) {
    assertNotAborted(signal);
    const file = supported[i];
    onProgress?.({ current: i + 1, total, fileName: file.name });

    const lower = file.name.toLowerCase();
    try {
      let html: string;
      if (lower.endsWith(".docx")) {
        const result = await docxToHtml(file);
        html = result.html;
      } else {
        html = await loadHtmlFile(file);
      }
      assertNotAborted(signal);
      const wrapped = wrapAsDocument(html, file.name.replace(/\.[^.]+$/i, ""));
      zip.file(deriveSafeFileName(file.name, "html"), wrapped);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      const message =
        error instanceof Error ? error.message : "ไม่สามารถแปลงไฟล์ได้";
      zip.file(
        `${deriveSafeFileName(file.name, "html")}.error.txt`,
        `เกิดข้อผิดพลาดขณะแปลง ${file.name}:\n${message}`
      );
    }
  }

  assertNotAborted(signal);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}
