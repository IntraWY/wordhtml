import type { PageSetup } from "./wrap";
import { deriveFileName } from "./wrap";

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
  container.style.width = "794px"; // A4 width in px @ 96 DPI
  container.style.background = "#ffffff";
  container.style.color = "#18181b";
  container.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  container.style.lineHeight = "1.7";
  container.style.fontSize = "16px";
  container.innerHTML = html;

  // Clone key stylesheet rules from the live document so images, tables,
  // alignment, KaTeX, etc. render correctly in the snapshot.
  const styleEl = document.createElement("style");
  const criticalSelectors = [
    ".prose-editor",
    ".paper",
    ".prose-editor h1, .paper h1",
    ".prose-editor h2, .paper h2",
    ".prose-editor h3, .paper h3",
    ".prose-editor p, .paper p",
    ".prose-editor ul, .paper ul",
    ".prose-editor ol, .paper ol",
    ".prose-editor li, .paper li",
    ".prose-editor blockquote, .paper blockquote",
    ".prose-editor a, .paper a",
    ".prose-editor strong, .paper strong",
    ".prose-editor em, .paper em",
    ".prose-editor code, .paper code",
    ".prose-editor pre, .paper pre",
    ".prose-editor img, .paper img",
    ".paper img:not([data-align])",
    ".paper img[data-align=\"left\"]",
    ".paper img[data-align=\"center\"]",
    ".paper img[data-align=\"right\"]",
    ".prose-editor hr, .paper hr",
    ".prose-editor table, .paper table",
    ".prose-editor td, .prose-editor th, .paper td, .paper th",
    ".prose-editor th, .paper th",
    ".prose-editor ul[data-type=\"taskList\"], .paper ul[data-type=\"taskList\"]",
    ".prose-editor ul[data-type=\"taskList\"] li, .paper ul[data-type=\"taskList\"] li",
    ".prose-editor sub, .paper sub",
    ".prose-editor sup, .paper sup",
    ".variable-badge",
    ".katex-display",
    ".katex",
    'span[data-type="math-equation"]',
  ];

  let cssText = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        const text = rule.cssText;
        if (
          criticalSelectors.some((sel) => text.includes(sel)) ||
          text.startsWith("@font-face")
        ) {
          cssText += text + "\n";
        }
      }
    }
  } catch {
    // Cross-origin stylesheets may throw; ignore safely
  }

  // Inject additional critical fallback styles for tables, images, code, etc.
  cssText += `
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; table-layout: fixed; }
    td, th { border: 1px solid #d4d4d8; padding: 0.4rem 0.6rem; vertical-align: top; text-align: left; }
    th { background: #f4f4f5; font-weight: 600; }
    blockquote { border-left: 3px solid #d4d4d8; padding: 0.25em 0 0.25em 1em; color: #71717a; font-style: italic; margin: 1em 0; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.92em; }
    pre { background: #f4f4f5; padding: 1em; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
    pre code { background: transparent; padding: 0; }
    .katex-display { margin: 1em 0; overflow-x: auto; }
    .katex { font-size: 1.1em; line-height: 1.2; }
    span[data-type="math-equation"] { display: inline-block; }
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

    const html2pdf = (await import("html2pdf.js")).default;

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

function waitForImages(root: HTMLElement): Promise<void> {
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
  return Promise.all(pending).then(() => undefined);
}
