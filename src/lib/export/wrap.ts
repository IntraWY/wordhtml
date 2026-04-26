/**
 * Wrap a body fragment into a complete HTML document for export.
 * Keeps the markup self-contained when downloaded or opened directly.
 */
export function wrapAsDocument(body: string, title = "Document"): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
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
