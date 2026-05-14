/**
 * Page setup options for printable HTML exports.
 */
export interface PageSetup {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
}

export interface WrapOptions {
  title?: string;
  pageSetup?: PageSetup;
}

const DEFAULT_PAGE_SETUP: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

/**
 * Wrap a body fragment into a complete HTML document for export.
 * Keeps the markup self-contained when downloaded or opened directly.
 *
 * Backward-compatible: the second argument can be a `title` string or a
 * `WrapOptions` object that customizes title and page setup.
 */
export function wrapAsDocument(
  body: string,
  titleOrOptions: string | WrapOptions = "Document"
): string {
  const opts: WrapOptions =
    typeof titleOrOptions === "string"
      ? { title: titleOrOptions }
      : titleOrOptions;

  const title = opts.title ?? "Document";
  const ps = opts.pageSetup ?? DEFAULT_PAGE_SETUP;
  const m = ps.marginMm;
  const sizeDecl =
    ps.orientation === "landscape" ? `${ps.size} landscape` : ps.size;
  const pageRule = `@page { size: ${sizeDecl}; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm; }`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    ${pageRule}
    @media print {
      body { margin: 0; padding: 0; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 720px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #18181b;
      line-height: 1.7;
    }
    img { max-width: 100%; height: auto; }
    blockquote {
      border-left: 3px solid #d4d4d8;
      padding: 0.25em 0 0.25em 1em;
      color: #71717a;
      font-style: italic;
      margin: 1em 0;
    }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; }
    pre { background: #f4f4f5; padding: 1em; border-radius: 6px; overflow-x: auto; }
    h1, h2, h3 { letter-spacing: -0.01em; }
    /* KaTeX math equation styles */
    .katex-display { margin: 1em 0; overflow-x: auto; }
    .katex { font-size: 1.1em; line-height: 1.2; }
    span[data-type="math-equation"] { display: inline-block; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after the click — give the browser a tick to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function deriveFileName(
  source: string | null,
  extension: string,
  fallback = "document"
): string {
  const base = (source ?? fallback).replace(/\.[^.]+$/, "");
  const safe = base.replace(/[^\w\-.]+/g, "_");
  return `${safe || fallback}.${extension}`;
}
