import { describe, it, expect } from "vitest";
import { buildSignatureBlockHtml } from "./signatureBlock";

describe("buildSignatureBlockHtml", () => {
  it("includes name in parentheses and the position", () => {
    const html = buildSignatureBlockHtml({
      name: "นายทดสอบ ระบบดี",
      position: "ผู้อำนวยการ",
    });
    expect(html).toContain("(นายทดสอบ ระบบดี)");
    expect(html).toContain("ผู้อำนวยการ");
  });

  it("renders a closing line when provided, omits it when blank", () => {
    expect(buildSignatureBlockHtml({ closing: "ขอแสดงความนับถือ" })).toContain(
      "ขอแสดงความนับถือ"
    );
    expect(buildSignatureBlockHtml({})).not.toContain("ขอแสดงความนับถือ");
  });

  it("falls back to placeholders when name/position missing", () => {
    const html = buildSignatureBlockHtml({});
    expect(html).toContain("ตำแหน่ง");
    expect(html).toContain("(");
  });

  it("centers every line", () => {
    const html = buildSignatureBlockHtml({ name: "ก" });
    expect((html.match(/text-align:center/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("escapes HTML in name", () => {
    const html = buildSignatureBlockHtml({ name: "<script>" });
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});
