import TurndownService from "turndown";

import { triggerDownload, deriveFileName } from "./wrap";

let cachedTurndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (cachedTurndown) return cachedTurndown;
  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
  });
  // Strikethrough rule (turndown doesn't include it by default)
  td.addRule("strikethrough", {
    filter: ["s", "del", "strike"] as never,
    replacement: (content) => `~~${content}~~`,
  });
  // Underline → Markdown has no underline; emit raw <u> as a fallback
  td.addRule("underline", {
    filter: ["u"] as never,
    replacement: (content) => `<u>${content}</u>`,
  });
  // GFM-style tables
  td.addRule("table", {
    filter: "table",
    replacement: (_, node) => {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.rows);
      if (rows.length === 0) return "";
      const cells = (row: HTMLTableRowElement) =>
        Array.from(row.cells).map((c) =>
          (c.textContent ?? "")
            .replace(/\|/g, "\\|")
            .replace(/\n/g, " ")
            .trim()
        );
      const headerCells = cells(rows[0]);
      const sep = headerCells.map(() => "---");
      const bodyRows = rows.slice(1).map(cells);
      return (
        "\n\n" +
        [
          "| " + headerCells.join(" | ") + " |",
          "| " + sep.join(" | ") + " |",
          ...bodyRows.map((r) => "| " + r.join(" | ") + " |"),
        ].join("\n") +
        "\n\n"
      );
    },
  });
  cachedTurndown = td;
  return td;
}

export function htmlToMarkdown(html: string): string {
  return getTurndown().turndown(html);
}

export async function exportMarkdown(
  html: string,
  fileName: string | null
): Promise<void> {
  const md = htmlToMarkdown(html);
  const base = deriveFileName(fileName, "md");
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, base);
}
