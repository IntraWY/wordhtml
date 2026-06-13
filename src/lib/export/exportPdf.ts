import type { PageSetup } from "@/types";
import { deriveFileName } from "./wrap";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { A4, LETTER, mmToPx } from "@/lib/page";
import { resolvePageChromeHtml } from "./exportHeaderFooter";

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
    .prose-editor blockquote, .paper blockquote { border-left: 3px solid #d4d4d8; padding: 0.25em 0 0.25em 1em; color: #52525b; font-style: italic; margin: 1em 0; }
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
    blockquote { border-left: 3px solid #d4d4d8; padding: 0.25em 0 0.25em 1em; color: #52525b; font-style: italic; margin: 1em 0; }
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

    // Keep a handle on the worker: html2pdf's `.then()` resolves to a plain
    // Promise (not the chainable worker), so the header/footer stamp must
    // happen between `get("pdf")` and `save()` on the worker itself rather
    // than chained off `.then()`.
    const worker = html2pdf()
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
      .toPdf();

    const pdf = (await worker.get("pdf")) as JsPdfLike;
    await stampHeaderFooterOnPdf(pdf, ps, sourceName, container.style.fontFamily);
    await worker.save();
  } finally {
    document.body.removeChild(container);
  }
}

/** Minimal jsPDF surface used for header/footer stamping. */
interface JsPdfLike {
  internal: {
    getNumberOfPages(): number;
    pageSize: { getWidth(): number; getHeight(): number };
  };
  setPage(n: number): void;
  addImage(
    data: string,
    type: string,
    x: number,
    y: number,
    w: number,
    h: number
  ): void;
}

/**
 * Header strip Y position (mm): bottom of the strip sits 3mm above the
 * content area, clamped so it never leaves the page (min 2mm from top).
 * Pure — unit-tested.
 */
export function headerStripYmm(marginTopMm: number, stripHeightMm: number): number {
  return Math.max(2, marginTopMm - 3 - stripHeightMm);
}

/**
 * Footer strip Y position (mm): top of the strip sits 3mm below the content
 * area, clamped so the strip never overflows the page (min 2mm from bottom).
 * Pure — unit-tested.
 */
export function footerStripYmm(
  pageHeightMm: number,
  marginBottomMm: number,
  stripHeightMm: number
): number {
  return Math.min(
    pageHeightMm - 2 - stripHeightMm,
    pageHeightMm - marginBottomMm + 3
  );
}

/**
 * Stamp resolved header/footer chrome onto every PDF page.
 *
 * Uses the same `resolvePageChromeHtml` as the live canvas and the HTML
 * export, so first-page / odd-even variants and page tokens behave
 * identically. Each unique resolved HTML string is rasterized once
 * (html2canvas) and cached, then drawn into the page margins via jsPDF.
 */
async function stampHeaderFooterOnPdf(
  pdf: JsPdfLike,
  pageSetup: PageSetup,
  fileName: string | null,
  fontFamily: string
): Promise<void> {
  const hf = pageSetup.headerFooter;
  if (!hf?.enabled) return;

  const totalPages = pdf.internal.getNumberOfPages();
  const pageWmm = pdf.internal.pageSize.getWidth();
  const pageHmm = pdf.internal.pageSize.getHeight();
  const m = pageSetup.marginMm;
  const contentWmm = Math.max(10, pageWmm - m.left - m.right);
  const stripWidthPx = Math.max(50, Math.round(mmToPx(contentWmm)));

  const html2canvas = (await import("html2canvas")).default;
  const cache = new Map<string, { data: string; heightMm: number } | null>();

  const renderStrip = async (
    html: string
  ): Promise<{ data: string; heightMm: number } | null> => {
    if (!html.trim()) return null;
    const cached = cache.get(html);
    if (cached !== undefined) return cached;

    const strip = document.createElement("div");
    strip.style.cssText =
      "position:fixed;top:-9999px;left:-9999px;" +
      `width:${stripWidthPx}px;background:#ffffff;color:#52525b;` +
      "font-size:13px;line-height:1.5;text-align:center;";
    strip.style.fontFamily = fontFamily;
    // Already sanitized by resolvePageChromeHtml.
    strip.innerHTML = html;
    document.body.appendChild(strip);
    let result: { data: string; heightMm: number } | null = null;
    try {
      const canvas = await html2canvas(strip, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      if (canvas.width > 0 && canvas.height > 0) {
        result = {
          data: canvas.toDataURL("image/png"),
          heightMm: (canvas.height / canvas.width) * contentWmm,
        };
      }
    } catch {
      // Header/footer stamping must never break the PDF export itself.
      result = null;
    } finally {
      document.body.removeChild(strip);
    }
    cache.set(html, result);
    return result;
  };

  for (let p = 1; p <= totalPages; p++) {
    const { headerHtml, footerHtml } = resolvePageChromeHtml(
      hf,
      p,
      totalPages,
      fileName
    );
    const header = await renderStrip(headerHtml);
    const footer = await renderStrip(footerHtml);
    if (!header && !footer) continue;

    pdf.setPage(p);
    if (header) {
      pdf.addImage(
        header.data,
        "PNG",
        m.left,
        headerStripYmm(m.top, header.heightMm),
        contentWmm,
        header.heightMm
      );
    }
    if (footer) {
      pdf.addImage(
        footer.data,
        "PNG",
        m.left,
        footerStripYmm(pageHmm, m.bottom, footer.heightMm),
        contentWmm,
        footer.heightMm
      );
    }
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
