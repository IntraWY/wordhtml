import type { PageSetup } from "./wrap";
import { deriveFileName } from "./wrap";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { A4, LETTER, mmToPx } from "@/lib/page";

interface ExportPdfOptions {
  /** Original source filename (if any) — used to derive the export filename */
  sourceName?: string | null;
  /** Document title */
  title?: string;
  /** Page setup for PDF page size, orientation and margins */
  pageSetup?: PageSetup;
}

/**
 * Export HTML content to a PDF file using html2pdf.js (client-side).
 *
 * The library is dynamically imported to keep it out of the initial bundle.
 * Renders the HTML in a hidden off-screen container so editor styles are
 * preserved without disturbing the live DOM.
 */
export async function exportPdf(
  html: string,
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    sourceName = null,
    title = "Document",
    pageSetup,
  } = options;

  const fileName = deriveFileName(sourceName, "pdf", title);

  // Build a hidden container with the HTML content + critical styles cloned
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  const base = pageSetup?.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup?.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const widthPx = Math.round(mmToPx(widthMm));
  container.style.width = `${widthPx}px`;
  container.style.background = "#ffffff";
  container.style.color = "#18181b";
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.lineHeight = "1.7";
  container.style.fontSize = "16px";
  const cleanHtml = stripPaginationWrappers(html);
  container.innerHTML = sanitizeHtml(cleanHtml);

  // Static critical CSS for PDF snapshot — avoids scraping live stylesheets
  // which is fragile and can pull in unexpected rules.
  const styleEl = document.createElement("style");
  const cssText = `
    .prose-editor, .paper { outline: none; tab-size: 1.27cm; -moz-tab-size: 1.27cm; }
    .prose-editor p, .paper p, .prose-editor h1, .paper h1, .prose-editor h2, .paper h2, .prose-editor h3, .paper h3, .prose-editor li, .paper li { white-space: pre-wrap; }
    .prose-editor h1, .paper h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; letter-spacing: -0.01em; }
    .prose-editor h2, .paper h2 { font-size: 1.5em; font-weight: 700; margin: 0.75em 0; letter-spacing: -0.01em; }
    .prose-editor h3, .paper h3 { font-size: 1.25em; font-weight: 600; margin: 0.83em 0; letter-spacing: -0.01em; }
    .prose-editor p, .paper p { margin: 0.75em 0; }
    .prose-editor ul, .paper ul { list-style: disc; padding-left: 1.5em; margin: 0.75em 0; }
    .prose-editor ol, .paper ol { list-style: decimal; padding-left: 1.5em; margin: 0.75em 0; }
    .prose-editor li, .paper li { margin: 0.25em 0; }
    .prose-editor blockquote, .paper blockquote { border-left: 3px solid #d4d4d8; padding: 0.25em 0 0.25em 1em; color: #71717a; font-style: italic; margin: 1em 0; }
    .prose-editor a, .paper a { color: #2563eb; text-decoration: underline; }
    .prose-editor strong, .paper strong { font-weight: 700; }
    .prose-editor em, .paper em { font-style: italic; }
    .prose-editor code, .paper code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.92em; }
    .prose-editor pre, .paper pre { background: #f4f4f5; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    .prose-editor pre code, .paper pre code { background: transparent; padding: 0; }
    .prose-editor img, .paper img { max-width: 100%; height: auto; display: block; margin: 0.5em 0; }
    .paper img[data-align="left"] { float: left; margin: 0.5em 1em 0.5em 0; }
    .paper img[data-align="center"] { margin: 0.5em auto; display: block; }
    .paper img[data-align="right"] { float: right; margin: 0.5em 0 0.5em 1em; }
    .prose-editor hr, .paper hr { border: none; border-top: 1px solid #d4d4d8; margin: 1.5em 0; }
    .prose-editor table, .paper table { border-collapse: collapse; width: 100%; margin: 1rem 0; table-layout: fixed; }
    .prose-editor td, .prose-editor th, .paper td, .paper th { border: 1px solid #d4d4d8; padding: 0.4rem 0.6rem; vertical-align: top; text-align: left; }
    .prose-editor th, .paper th { background: #f4f4f5; font-weight: 600; }
    .prose-editor ul[data-type="taskList"], .paper ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    .prose-editor ul[data-type="taskList"] li, .paper ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5em; }
    .prose-editor ul[data-type="taskList"] li > label, .paper ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 0.3em; }
    .prose-editor ul[data-type="taskList"] li > div, .paper ul[data-type="taskList"] li > div { flex: 1; }
    .prose-editor sub, .paper sub { vertical-align: sub; font-size: 0.75em; }
    .prose-editor sup, .paper sup { vertical-align: super; font-size: 0.75em; }
    .variable-badge { background: #e4e4e7; color: #18181b; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.85em; }
    .katex-display { margin: 1em 0; overflow-x: auto; }
    .katex { font-size: 1.1em; line-height: 1.2; }
    span[data-type="math-equation"] { display: inline-block; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; table-layout: fixed; }
    td, th { border: 1px solid #d4d4d8; padding: 0.4rem 0.6rem; vertical-align: top; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }
    blockquote { border-left: 3px solid #d4d4d8; padding: 0.25em 0 0.25em 1em; color: #71717a; font-style: italic; margin: 1em 0; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.92em; }
    pre { background: #f4f4f5; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    pre code { background: transparent; padding: 0; }
    ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5em; }
    ul[data-type="taskList"] li > label { flex-shrink: 0; margin-top: 0.3em; }
    ul[data-type="taskList"] li > div { flex: 1; }
  `;
  styleEl.textContent = cssText;
  container.prepend(styleEl);

  document.body.appendChild(container);

  try {
    // Wait for fonts and images to settle before snapshotting
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await waitForImages(container);

    const html2pdfModule = await import("html2pdf.js");
    const html2pdf = html2pdfModule.default;

    const ps = pageSetup ?? {
      size: "A4" as const,
      orientation: "portrait" as const,
      marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
    };

    const margin: [number, number, number, number] = [
      ps.marginMm.top,
      ps.marginMm.right,
      ps.marginMm.bottom,
      ps.marginMm.left,
    ];

    const format = ps.size === "Letter" ? "letter" : "a4";
    const orientation = ps.orientation;

    await html2pdf()
      .set({
        margin,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        enableLinks: true,
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        jsPDF: {
          unit: "mm",
          format,
          orientation,
        },
      })
      .from(container)
      .save();
  } finally {
    document.body.removeChild(container);
  }
}

function waitForImages(root: HTMLElement, timeoutMs = 15_000): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  const pending = images.map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          resolve();
          return;
        }
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      })
  );
  const allLoaded = Promise.all(pending).then(() => undefined);
  const timeout = new Promise<void>((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
  return Promise.race([allLoaded, timeout]);
}
