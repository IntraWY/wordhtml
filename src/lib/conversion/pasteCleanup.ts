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

  let html = input;

  // 1. Drop conditional comments: <!--[if ...]>...<![endif]-->
  html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/g, "");

  // 2. Drop entire <style> blocks (Word emits enormous ones)
  html = html.replace(/<style[\s\S]*?<\/style>/gi, "");

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
