import { describe, it, expect } from "vitest";
import { buildExportHtmlDocument } from "./exportHtml";

/** Concatenated, whitespace-stripped text of the document <body>. */
function bodyText(htmlDoc: string): string {
  const doc = new DOMParser().parseFromString(htmlDoc, "text/html");
  return (doc.body?.textContent ?? "").replace(/\s/g, "");
}

function countTag(htmlDoc: string, tag: string): number {
  const doc = new DOMParser().parseFromString(htmlDoc, "text/html");
  return doc.body?.querySelectorAll(tag).length ?? 0;
}

describe("buildExportHtmlDocument — round-trip integrity", () => {
  it("preserves body content exactly (no loss from wrappers/style/title)", () => {
    const content = "สวัสดีครับ นี่คือเนื้อหาทดสอบการส่งออกที่ต้องคงครบทุกตัวอักษร";
    const html =
      `<div class="page-node"><div class="page-body"><p>${content}</p></div></div>`;
    const out = buildExportHtmlDocument(html);
    // This is the exact guard against the "5032 != 4320" false alarm: the
    // <style>/<title> chrome must never be counted as body content, and the
    // body content must equal the source content exactly.
    expect(bodyText(out)).toBe(content.replace(/\s/g, ""));
  });

  it("re-joins soft-split paragraph pieces into a single <p>", () => {
    const html =
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">ส่วนหนึ่ง </p></div></div>` +
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">ส่วนสอง</p></div></div>`;
    const out = buildExportHtmlDocument(html);
    expect(countTag(out, "p")).toBe(1);
    expect(bodyText(out)).toBe("ส่วนหนึ่งส่วนสอง");
  });

  it("strips all pagination + soft-split artifacts from the output", () => {
    const html =
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">ก</p></div></div>` +
      `<div class="page-node"><div class="page-body">` +
      `<p data-soft-split="true">ข</p></div></div>`;
    const out = buildExportHtmlDocument(html);
    const doc = new DOMParser().parseFromString(out, "text/html");
    expect(doc.body?.innerHTML).not.toContain("page-node");
    expect(doc.body?.innerHTML).not.toContain("page-body");
    expect(doc.body?.innerHTML).not.toContain("data-soft-split");
  });

  it("preserves a normal multi-paragraph document without merging", () => {
    const html =
      `<div class="page-node"><div class="page-body">` +
      `<p>ย่อหน้าหนึ่ง</p><p>ย่อหน้าสอง</p></div></div>`;
    const out = buildExportHtmlDocument(html);
    expect(countTag(out, "p")).toBe(2);
    expect(bodyText(out)).toBe("ย่อหน้าหนึ่งย่อหน้าสอง");
  });

  it("injects watermark CSS into the export when pageSetup.watermark is set", () => {
    const out = buildExportHtmlDocument(`<p>x</p>`, {
      pageSetup: {
        size: "A4",
        orientation: "portrait",
        marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
        watermark: { text: "สำเนา" },
      },
    });
    expect(out).toContain('content:"สำเนา"');
    expect(out).toContain("position:fixed");
  });

  it("does not inject watermark CSS when no watermark", () => {
    const out = buildExportHtmlDocument(`<p>x</p>`, {
      pageSetup: {
        size: "A4",
        orientation: "portrait",
        marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
      },
    });
    expect(out).not.toContain("position:fixed");
  });

  it("produces a self-contained document with <title> and <style>", () => {
    const out = buildExportHtmlDocument(`<p>x</p>`, { title: "งานของฉัน" });
    expect(out).toContain("<!doctype html>");
    expect(out).toContain("<title>งานของฉัน</title>");
    expect(out).toContain("<style>");
    // The title text lives in <head>, NOT <body> — must not pollute body content.
    expect(bodyText(out)).toBe("x");
  });
});
