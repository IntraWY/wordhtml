import { marked } from "marked";

export async function markdownToHtml(file: File): Promise<string> {
  const text = await file.text();
  const html = await marked.parse(text, {
    gfm: true,
  });
  return html;
}
