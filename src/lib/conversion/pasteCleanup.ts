/**
 * Strip Microsoft Office / Google Docs paste noise from HTML.
 *
 * Handles mso-* styles, Word-specific tags (<o:p>, <w:*>), conditional comments,
 * inline <style> blocks, and Office class names ("MsoNormal", etc.).
 *
 * Operates on raw HTML strings — safe to call before handing to Tiptap or to
 * the cleaning pipeline.
 */
export function cleanPastedHtml(input: string): string {
  if (!input) return "";

  // Guard against unbounded processing of extremely large inputs
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (input.length > MAX_SIZE) {
    input = input.slice(0, MAX_SIZE);
  }

  let html = input;

  // 1. Drop conditional comments using bounded string search
  html = removeConditionalComments(html);

  // 2. Drop entire <style> blocks using bounded string search
  html = removeStyleBlocks(html);

  // 3. Drop xmlns / Office namespace attributes on the root element
  html = html.replace(/\sxmlns(:\w+)?=["'][^"']*["']/gi, "");

  // 4. Drop <o:p>, <w:*>, <m:*>, <v:*> tags entirely (open + close + self-closing)
  html = html.replace(/<\/?(o|w|m|v):[^>]*>/gi, "");

  // 5. Strip Office class names
  html = html.replace(/\sclass=["'](?:Mso[\w-]*\s?)+["']/gi, "");

  // 6. Strip mso-* declarations from inline style attributes
  html = html.replace(/\sstyle=["']([^"']*)["']/gi, (_, styles: string) => {
    const cleaned = styles
      .split(";")
      .map((decl) => decl.trim())
      .filter((decl) => decl.length > 0 && !/^mso-/i.test(decl))
      .join("; ");
    return cleaned ? ` style="${cleaned}"` : "";
  });

  // 7. Strip lang="" / xml:lang="" attributes
  html = html.replace(/\s(?:xml:)?lang=["'][^"']*["']/gi, "");

  // 8. Collapse non-breaking spaces emitted as &nbsp; runs to single spaces
  //    (preserve single nbsp — sometimes intentional)
  html = html.replace(/(?:&nbsp;){2,}/g, "&nbsp;");

  return html;
}

function removeConditionalComments(html: string): string {
  let result = html;
  let start = result.indexOf("<!--[if");
  while (start !== -1) {
    const end = result.indexOf("<![endif]-->", start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end + 12);
    start = result.indexOf("<!--[if");
  }
  return result;
}

function removeStyleBlocks(html: string): string {
  let result = html;
  let start = result.toLowerCase().indexOf("<style");
  while (start !== -1) {
    const end = result.toLowerCase().indexOf("</style>", start);
    if (end === -1) break;
    result = result.slice(0, start) + result.slice(end + 8);
    start = result.toLowerCase().indexOf("<style");
  }
  return result;
}
