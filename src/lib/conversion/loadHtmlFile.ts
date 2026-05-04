import { cleanPastedHtml } from "./pasteCleanup";

/**
 * Read an .html file and extract the body markup. Strips any wrapping
 * <!doctype>, <html>, <head>, or <body> tags so we don't double-wrap inside
 * the editor. Also runs the pasted-HTML cleaner to remove Word/Office noise
 * that survived a previous round-trip.
 */
export async function loadHtmlFile(file: File): Promise<string> {
  const text = await file.text();
  const body = extractBody(text);
  return cleanPastedHtml(body);
}

function extractBody(input: string): string {
  // Use DOMParser for robust extraction without regex backtracking risk.
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, "text/html");
    if (doc.body) {
      return doc.body.innerHTML.trim();
    }
  } catch {
    // Fall through to regex-based fallback
  }

  // Fallback: try to find the contents of <body>…</body>
  const match = input.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (match) return match[1].trim();

  // No <body>? Strip <!doctype> and <html>/<head> if present.
  return input
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<\/?(?:html|head)[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .trim();
}
