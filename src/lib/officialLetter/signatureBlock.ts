/**
 * Builds a Thai official-document signature block (บล็อกลงนาม): a blank
 * line to sign on, then the signer's name (in parentheses) and position,
 * centered. Pure + testable; inserted into the editor via a ribbon button.
 */
export interface SignatureBlockOptions {
  /** Closing phrase above the signature, e.g. "ขอแสดงความนับถือ". Omitted if blank. */
  closing?: string;
  /** Signer name shown as "(ชื่อ)". */
  name?: string;
  /** Position line below the name. */
  position?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSignatureBlockHtml(
  options: SignatureBlockOptions = {}
): string {
  const name = (options.name ?? "").trim();
  const position = (options.position ?? "").trim();
  const closing = (options.closing ?? "").trim();

  const center = (inner: string) =>
    `<p style="text-align:center;margin:0">${inner}</p>`;

  const lines: string[] = [];
  if (closing) lines.push(center(escapeHtml(closing)));
  // Blank line to sign on.
  lines.push(center("&nbsp;"));
  lines.push(center("&nbsp;"));
  lines.push(center(`(${escapeHtml(name || "................................")})`));
  lines.push(center(escapeHtml(position || "ตำแหน่ง")));
  return lines.join("");
}
