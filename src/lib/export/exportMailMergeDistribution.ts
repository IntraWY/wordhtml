import type { TemplateVariable, DataSet, PageSetup } from "@/types";
import { resolveHtmlPlaceholders } from "@/lib/placeholders/resolve";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";
import { normalizeRecipients } from "./distributionList";

export interface MailMergeDistributionOptions {
  html: string;
  variables: TemplateVariable[];
  dataSet: DataSet;
  /** Distribution recipients ("สำเนาเรียน") — trimmed, blanks dropped, de-duplicated. */
  recipients: string[];
  pageSetup: PageSetup;
  /** Merge field that receives the recipient. Defaults to "เรียน". */
  fieldName?: string;
  /** Document title (per-file <title>). Defaults to "document". */
  title?: string;
  /** Column whose value names each row's files. Falls back to a zero-padded index. */
  nameColumn?: string;
}

export interface MergedDistributionDocument {
  fileName: string;
  html: string;
  /** Zero-based index of the source data row. */
  rowIndex: number;
  recipient: string;
}

/**
 * Mail-merge × distribution-list combo (GAP 09): produce one standalone HTML
 * document per (data row × recipient) pair. For each pair, the row's merge
 * fields are resolved AND the recipient is applied to the distribution field
 * (`{{<fieldName>}}`, default `{{เรียน}}`).
 *
 * Both substitutions happen in a single export-mode resolution pass: the
 * recipient is injected as the distribution field's dataRow value, so it
 * overrides a same-named row column and is HTML-escaped exactly like
 * `buildDistributionDocuments`. Replacement output is never re-scanned, so
 * merge-field syntax inside row values or recipient names is not expanded.
 *
 * File names encode both axes — `{rowIndex}[-{nameColumnValue}]_{recipientIndex}-{recipient}.html`
 * (e.g. `001-นายสมชาย_01-ผู้ว่าราชการจังหวัด.html`) — sanitized via
 * `deriveFileName` like the two standalone exporters, and unique by
 * construction thanks to the numeric prefixes.
 *
 * Pure (no DOM download) so it is unit-testable; `downloadMailMergeDistributionZip`
 * wraps it with JSZip.
 */
export function buildMailMergeDistributionDocuments(
  options: MailMergeDistributionOptions
): MergedDistributionDocument[] {
  const { html, variables, dataSet, recipients, pageSetup, title, nameColumn } =
    options;
  const fieldName = options.fieldName ?? "เรียน";
  const rows = dataSet.rows ?? [];
  const uniqueRecipients = normalizeRecipients(recipients);
  const rowPad = Math.max(3, String(rows.length).length);
  const recipientPad = Math.max(2, String(uniqueRecipients.length).length);

  const docs: MergedDistributionDocument[] = [];
  rows.forEach((row, rowIndex) => {
    uniqueRecipients.forEach((recipient, recipientIndex) => {
      const resolved = resolveHtmlPlaceholders(html, {
        mode: "export",
        variables,
        dataRow: { ...row, [fieldName]: recipient },
      });
      // Defense-in-depth: sanitize each (row × recipient) document like the
      // single-doc export path (strips <script>, on* handlers, javascript: URLs).
      const body = sanitizeHtml(stripPaginationWrappers(resolved));
      const docHtml = wrapAsDocument(body, {
        title: title ?? "document",
        pageSetup,
      });

      const rowIndexName = String(rowIndex + 1).padStart(rowPad, "0");
      const columnValue = nameColumn ? row[nameColumn]?.trim() : "";
      const rowName = columnValue
        ? `${rowIndexName}-${columnValue}`
        : rowIndexName;
      const recipientName = `${String(recipientIndex + 1).padStart(recipientPad, "0")}-${recipient}`;

      docs.push({
        fileName: deriveFileName(`${rowName}_${recipientName}`, "html"),
        html: docHtml,
        rowIndex,
        recipient,
      });
    });
  });
  return docs;
}

/**
 * Build one document per (row × recipient) pair and download them as a single
 * flat ZIP — same packaging as `downloadMailMergeZip` / `downloadDistributionZip`.
 */
export async function downloadMailMergeDistributionZip(
  options: MailMergeDistributionOptions & { zipName?: string }
): Promise<void> {
  const docs = buildMailMergeDistributionDocuments(options);
  if (docs.length === 0) {
    throw new Error(
      "ไม่มีข้อมูลหรือรายชื่อผู้รับ (no data rows or recipients)"
    );
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const doc of docs) {
    zip.file(doc.fileName, doc.html);
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerDownload(blob, options.zipName ?? "mail-merge-distribution.zip");
}
