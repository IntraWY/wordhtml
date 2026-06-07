/**
 * Convert a baht amount to Thai text (จำนวนเงินเป็นตัวอักษร) — the standard
 * format used on Thai official / financial documents, e.g.
 *   1234.50  →  "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"
 *   2500     →  "สองพันห้าร้อยบาทถ้วน"
 *
 * Accepts a number or a numeric string (commas allowed). Rounds to 2 decimals,
 * carrying 100 satang up to baht.
 */

const DIGITS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

/** Reads an integer group of up to 6 digits (no ล้าน). Leading zeros ignored. */
function readGroup(raw: string): string {
  const group = raw.replace(/^0+/, "");
  if (group === "") return "";
  const len = group.length;
  let s = "";
  for (let i = 0; i < len; i++) {
    const d = Number(group[i]);
    if (d === 0) continue;
    const place = len - i - 1; // 0=units, 1=tens, 2=hundreds, …
    if (place === 0) {
      // "เอ็ด" when a higher digit in this group is non-zero (e.g. 11, 101).
      const higherNonZero = group.slice(0, len - 1).split("").some((c) => c !== "0");
      s += d === 1 && higherNonZero ? "เอ็ด" : DIGITS[d];
    } else if (place === 1) {
      if (d === 1) s += "สิบ";
      else if (d === 2) s += "ยี่สิบ";
      else s += DIGITS[d] + "สิบ";
    } else {
      s += DIGITS[d] + PLACES[place];
    }
  }
  return s;
}

/** Reads an arbitrary-length non-negative integer string, inserting ล้าน. */
function readInteger(intStr: string): string {
  const stripped = intStr.replace(/^0+/, "") || "0";
  if (stripped === "0") return DIGITS[0];
  if (stripped.length <= 6) return readGroup(stripped);
  const low = stripped.slice(-6);
  const high = stripped.slice(0, -6);
  return readInteger(high) + "ล้าน" + readGroup(low);
}

export function bahtText(input: number | string): string {
  const raw = typeof input === "string" ? input.replace(/,/g, "").trim() : input;
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";

  const negative = n < 0;
  const abs = Math.abs(n);

  let baht = Math.floor(abs);
  let satang = Math.round((abs - baht) * 100);
  if (satang === 100) {
    baht += 1;
    satang = 0;
  }

  let text = "";
  if (baht > 0) text += readInteger(String(baht)) + "บาท";

  if (satang === 0) {
    // Pure-zero amount reads "ศูนย์บาทถ้วน".
    if (baht === 0) text += "ศูนย์บาท";
    text += "ถ้วน";
  } else {
    text += readInteger(String(satang)) + "สตางค์";
  }

  return negative ? "ลบ" + text : text;
}
