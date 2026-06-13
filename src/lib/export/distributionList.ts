import { escapeHtml } from "@/lib/placeholders/escapeHtml";
import type { PageSetup } from "@/types";
import { stripPaginationWrappers } from "./stripPaginationWrappers";
import { wrapAsDocument, triggerDownload, deriveFileName } from "./wrap";

/** One generated document for a single recipient ("สำเนาเรียน"). */
export interface DistributionResult {
  recipient: string;
  html: string;
}

/** Escape a string so it can be embedded literally inside a RegExp. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Trim, drop blanks, de-duplicate while preserving first-seen order. */
export function normalizeRecipients(recipients: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of recipients) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * Distribution list ("สำเนาเรียน"): from ONE letter template, produce one
 * document per recipient by substituting a single recipient placeholder.
 *
 * Every `{{<fieldName>}}` occurrence in `templateHtml` is replaced with the
 * HTML-escaped recipient text. Recipients are trimmed; blanks are skipped and
 * duplicates removed (preserving order). `fieldName` defaults to "เรียน".
 */
export function buildDistributionDocuments(params: {
  templateHtml: string;
  recipients: string[];
  fieldName?: string;
}): DistributionResult[] {
  const { templateHtml, recipients } = params;
  const fieldName = params.fieldName ?? "เรียน";

  const uniqueRecipients = normalizeRecipients(recipients);
  const placeholder = new RegExp(`\\{\\{${escapeRegExp(fieldName)}\\}\\}`, "g");

  return uniqueRecipients.map((recipient) => ({
    recipient,
    html: templateHtml.replace(placeholder, escapeHtml(recipient)),
  }));
}

/**
 * Parse a free-form textarea string of recipients. Splits on BOTH newlines and
 * commas, trims each entry, drops blanks, and de-duplicates (preserving order).
 */
export function parseRecipientList(raw: string): string[] {
  return normalizeRecipients(raw.split(/[\n,]/));
}

/**
 * Build one standalone document per recipient and download them as a ZIP.
 * Mirrors `downloadMailMergeZip`: each doc is pagination-stripped + wrapped.
 */
export async function downloadDistributionZip(params: {
  templateHtml: string;
  recipients: string[];
  pageSetup: PageSetup;
  fieldName?: string;
  title?: string;
  zipName?: string;
}): Promise<void> {
  const docs = buildDistributionDocuments(params);
  if (docs.length === 0) {
    throw new Error("ไม่มีรายชื่อผู้รับ (no recipients)");
  }

  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  docs.forEach((doc, i) => {
    const body = stripPaginationWrappers(doc.html);
    const docHtml = wrapAsDocument(body, {
      title: params.title ?? doc.recipient,
      pageSetup: params.pageSetup,
    });
    const idx = String(i + 1).padStart(3, "0");
    zip.file(deriveFileName(`${idx}-${doc.recipient}`, "html"), docHtml);
  });

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerDownload(blob, params.zipName ?? "distribution.zip");
}
