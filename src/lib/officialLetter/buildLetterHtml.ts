// Pure module: build Thai government correspondence (งานสารบรรณ) HTML.
//
// Visual conventions mirror src/lib/templateGallery.ts:
// - centered <strong> header for memo / agency
// - "เรื่อง" / "เรียน" / "อ้างถึง" / "สิ่งที่ส่งมาด้วย" label paragraphs
// - body paragraphs with first-line indent (text-indent:2.5cm)
// - closing + signature block right/center aligned
//
// All input text is HTML-escaped (see local `escapeHtml`). `body` is kept as-is
// when it already contains tags; otherwise plain-text lines are wrapped in <p>.

export type OfficialLetterType = "external" | "memo"; // หนังสือภายนอก | บันทึกข้อความ

export interface OfficialLetterFields {
  type: OfficialLetterType;
  bookNumber?: string; // เลขที่หนังสือ e.g. "ศธ ๐๔๐๐๑/๑๒๓"
  agency?: string; // ส่วนราชการ / หน่วยงาน
  dateText?: string; // วันที่ (already-formatted Thai date string; do not format here)
  subject?: string; // เรื่อง
  to?: string; // เรียน
  references?: string; // อ้างถึง (optional)
  attachments?: string; // สิ่งที่ส่งมาด้วย (optional)
  body?: string; // เนื้อความ (plain text or simple HTML)
  closing?: string; // คำลงท้าย e.g. "ขอแสดงความนับถือ"
  signerName?: string; // ชื่อผู้ลงนาม
  signerPosition?: string; // ตำแหน่ง
}

/** Minimal HTML-escape for user-provided text (local; do not import). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** True when a string is present and non-blank after trimming. */
function present(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** Heuristic: does this body already contain HTML tags? */
function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

/**
 * Render the body. If it already contains tags, keep it verbatim. Otherwise
 * split on newlines and wrap each non-empty line in an escaped, indented <p>.
 */
function renderBody(body: string | undefined): string {
  if (!present(body)) return "";
  if (looksLikeHtml(body)) return body;
  return body
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="text-indent:2.5cm">${escapeHtml(line.trim())}</p>`)
    .join("\n");
}

/** A signature block shared by both letter types. */
function signatureBlock(
  fields: OfficialLetterFields,
  align: "center" | "right",
): string {
  const lines: string[] = [];
  // blank line before the signature
  lines.push(`<p style="text-align:${align};margin-top:1cm">&nbsp;</p>`);
  if (present(fields.signerName)) {
    lines.push(
      `<p style="text-align:${align}">${escapeHtml(fields.signerName.trim())}</p>`,
    );
  }
  if (present(fields.signerPosition)) {
    lines.push(
      `<p style="text-align:${align}">${escapeHtml(fields.signerPosition.trim())}</p>`,
    );
  }
  return lines.join("\n");
}

function buildExternal(fields: OfficialLetterFields): string {
  const lines: string[] = [];

  if (present(fields.agency)) {
    lines.push(
      `<p style="text-align:center"><strong>${escapeHtml(fields.agency.trim())}</strong></p>`,
    );
  }
  if (present(fields.bookNumber)) {
    lines.push(`<p>ที่ ${escapeHtml(fields.bookNumber.trim())}</p>`);
  }
  if (present(fields.dateText)) {
    lines.push(
      `<p style="text-align:right">${escapeHtml(fields.dateText.trim())}</p>`,
    );
  }
  if (present(fields.subject)) {
    lines.push(
      `<p>เรื่อง&nbsp;&nbsp;&nbsp;${escapeHtml(fields.subject.trim())}</p>`,
    );
  }
  if (present(fields.to)) {
    lines.push(`<p>เรียน&nbsp;&nbsp;&nbsp;${escapeHtml(fields.to.trim())}</p>`);
  }
  if (present(fields.references)) {
    lines.push(
      `<p>อ้างถึง&nbsp;&nbsp;${escapeHtml(fields.references.trim())}</p>`,
    );
  }
  if (present(fields.attachments)) {
    lines.push(
      `<p>สิ่งที่ส่งมาด้วย&nbsp;&nbsp;${escapeHtml(fields.attachments.trim())}</p>`,
    );
  }

  const body = renderBody(fields.body);
  if (body) lines.push(body);

  if (present(fields.closing)) {
    lines.push(
      `<p style="text-align:center;margin-top:1cm">${escapeHtml(fields.closing.trim())}</p>`,
    );
  }

  lines.push(signatureBlock(fields, "center"));

  return lines.join("\n");
}

function buildMemo(fields: OfficialLetterFields): string {
  const lines: string[] = [];

  lines.push(
    `<p style="text-align:center"><strong>บันทึกข้อความ</strong></p>`,
  );
  if (present(fields.agency)) {
    lines.push(
      `<p><strong>ส่วนราชการ</strong> ${escapeHtml(fields.agency.trim())}</p>`,
    );
  }

  // "ที่ {bookNumber}    วันที่ {dateText}" — render each present part.
  const hasBook = present(fields.bookNumber);
  const hasDate = present(fields.dateText);
  if (hasBook || hasDate) {
    const parts: string[] = [];
    if (hasBook) {
      parts.push(`<strong>ที่</strong> ${escapeHtml(fields.bookNumber!.trim())}`);
    }
    if (hasDate) {
      parts.push(`<strong>วันที่</strong> ${escapeHtml(fields.dateText!.trim())}`);
    }
    lines.push(`<p>${parts.join("&nbsp;&nbsp;&nbsp;&nbsp;")}</p>`);
  }

  if (present(fields.subject)) {
    lines.push(`<p><strong>เรื่อง</strong> ${escapeHtml(fields.subject.trim())}</p>`);
  }
  if (present(fields.to)) {
    lines.push(`<p><strong>เรียน</strong> ${escapeHtml(fields.to.trim())}</p>`);
  }

  const body = renderBody(fields.body);
  if (body) lines.push(body);

  lines.push(signatureBlock(fields, "right"));

  return lines.join("\n");
}

/**
 * Build well-formed งานสารบรรณ HTML for an official letter.
 * Omitted / blank optional fields are skipped cleanly (no empty label lines).
 */
export function buildOfficialLetterHtml(fields: OfficialLetterFields): string {
  return fields.type === "memo" ? buildMemo(fields) : buildExternal(fields);
}
