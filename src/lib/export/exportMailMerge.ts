import type { TemplateVariable, DataSet, PageSetup } from "@/types";
import { resolveHtmlPlaceholders } from "@/lib/placeholders/resolve";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";

export interface MailMergeOptions {
  html: string;
  variables: TemplateVariable[];
  dataSet: DataSet;
  pageSetup: PageSetup;
  /** Document title (per-file <title>). Defaults to "document". */
  title?: string;
  /** Column whose value names each file. Falls back to a zero-padded index. */
  nameColumn?: string;
}

export interface MergedDocument {
  fileName: string;
  html: string;
}

/**
 * Resolve the template once per data row into a standalone HTML document.
 * Pure (no DOM download) so it is unit-testable; `downloadMailMergeZip` wraps
 * it with JSZip. One document per row, merge fields + filters resolved in
 * export mode, pagination wrappers stripped.
 */
export function buildMergedDocuments(
  options: MailMergeOptions
): MergedDocument[] {
  const { html, variables, dataSet, pageSetup, title, nameColumn } = options;
  const rows = dataSet.rows ?? [];
  const pad = String(rows.length).length;

  return rows.map((row, i) => {
    const resolved = resolveHtmlPlaceholders(html, {
      mode: "export",
      variables,
      dataRow: row,
    });
    const body = stripPaginationWrappers(resolved);
    const docHtml = wrapAsDocument(body, {
      title: title ?? "document",
      pageSetup,
    });

    const indexName = String(i + 1).padStart(Math.max(3, pad), "0");
    const columnValue = nameColumn ? row[nameColumn]?.trim() : "";
    const fileName = columnValue
      ? deriveFileName(`${indexName}-${columnValue}`, "html")
      : `${indexName}.html`;

    return { fileName, html: docHtml };
  });
}

/**
 * Build merged documents for every data row and download them as a single ZIP.
 */
export async function downloadMailMergeZip(
  options: MailMergeOptions & { zipName?: string }
): Promise<void> {
  const docs = buildMergedDocuments(options);
  if (docs.length === 0) {
    throw new Error("ไม่มีข้อมูลสำหรับ mail-merge (no data rows)");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const doc of docs) {
    zip.file(doc.fileName, doc.html);
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerDownload(blob, options.zipName ?? "mail-merge.zip");
}
