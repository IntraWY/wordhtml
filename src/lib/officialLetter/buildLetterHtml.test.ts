import { describe, expect, it } from "vitest";
import {
  buildOfficialLetterHtml,
  type OfficialLetterFields,
} from "./buildLetterHtml";

describe("buildOfficialLetterHtml — external (หนังสือภายนอก)", () => {
  it("includes เรื่อง + subject + signerName", () => {
    const html = buildOfficialLetterHtml({
      type: "external",
      agency: "สำนักงานเขตพื้นที่การศึกษา",
      bookNumber: "ศธ ๐๔๐๐๑/๑๒๓",
      dateText: "๗ มิถุนายน ๒๕๖๙",
      subject: "ขอเชิญประชุม",
      to: "ผู้อำนวยการโรงเรียน",
      body: "ด้วยสำนักงานมีกำหนดจัดประชุม",
      closing: "ขอแสดงความนับถือ",
      signerName: "นายสมชาย ใจดี",
      signerPosition: "ผู้อำนวยการ",
    });
    expect(html).toContain("เรื่อง");
    expect(html).toContain("ขอเชิญประชุม");
    expect(html).toContain("นายสมชาย ใจดี");
    expect(html).toContain("ขอแสดงความนับถือ");
    expect(html).toContain("ผู้อำนวยการ");
  });

  it("omits optional references / attachments when not provided", () => {
    const html = buildOfficialLetterHtml({
      type: "external",
      subject: "เรื่องทดสอบ",
      to: "ผู้รับ",
      signerName: "ผู้ลงนาม",
    });
    expect(html).not.toContain("อ้างถึง");
    expect(html).not.toContain("สิ่งที่ส่งมาด้วย");
  });

  it("includes references / attachments when provided", () => {
    const html = buildOfficialLetterHtml({
      type: "external",
      subject: "เรื่องทดสอบ",
      references: "หนังสือที่ ศธ ๑/๑",
      attachments: "เอกสารแนบ ๑ ชุด",
    });
    expect(html).toContain("อ้างถึง");
    expect(html).toContain("หนังสือที่ ศธ ๑/๑");
    expect(html).toContain("สิ่งที่ส่งมาด้วย");
    expect(html).toContain("เอกสารแนบ ๑ ชุด");
  });

  it("escapes HTML in subject containing <script>", () => {
    const html = buildOfficialLetterHtml({
      type: "external",
      subject: "<script>alert('x')</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildOfficialLetterHtml — memo (บันทึกข้อความ)", () => {
  it("includes บันทึกข้อความ + ส่วนราชการ", () => {
    const html = buildOfficialLetterHtml({
      type: "memo",
      agency: "กลุ่มบริหารงานบุคคล",
      bookNumber: "ศธ ๐๔/๒๒",
      dateText: "๗ มิถุนายน ๒๕๖๙",
      subject: "รายงานผล",
      to: "ผู้บังคับบัญชา",
      signerName: "นางสาวสมหญิง",
      signerPosition: "หัวหน้ากลุ่ม",
    });
    expect(html).toContain("บันทึกข้อความ");
    expect(html).toContain("ส่วนราชการ");
    expect(html).toContain("กลุ่มบริหารงานบุคคล");
    expect(html).toContain("นางสาวสมหญิง");
  });
});

describe("buildOfficialLetterHtml — body handling", () => {
  it("wraps plain text body lines in <p>", () => {
    const html = buildOfficialLetterHtml({
      type: "external",
      body: "บรรทัดแรก\nบรรทัดที่สอง",
    });
    expect(html).toContain("<p");
    expect(html).toContain("บรรทัดแรก");
    expect(html).toContain("บรรทัดที่สอง");
    // two body paragraphs produced
    const matches = html.match(/บรรทัด/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it("keeps body verbatim when it already contains tags", () => {
    const fields: OfficialLetterFields = {
      type: "memo",
      body: "<p>เนื้อความ HTML</p>",
    };
    const html = buildOfficialLetterHtml(fields);
    expect(html).toContain("<p>เนื้อความ HTML</p>");
  });
});
