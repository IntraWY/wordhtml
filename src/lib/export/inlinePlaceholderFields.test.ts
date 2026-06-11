import { describe, it, expect } from "vitest";
import { inlinePlaceholderFields } from "./inlinePlaceholderFields";

const field = (id: string, label: string, value = "") =>
  `<span data-placeholder-field="true" data-field-id="${id}" data-label="${label}" data-value="${value}">${value || label}</span>`;

describe("inlinePlaceholderFields", () => {
  it("prefers the node attribute value (in-document fill) over session fieldValues", () => {
    const html = `<p>${field("f1", "ชื่องาน", "ค่าจากเอกสาร")}</p>`;
    const out = inlinePlaceholderFields(html, { f1: "ค่าจาก session" });
    expect(out).toBe("<p>ค่าจากเอกสาร</p>");
  });

  it("falls back to session fieldValues, then the label", () => {
    const html = `<p>${field("f1", "ชื่องาน")} ${field("f2", "หน่วยงาน")}</p>`;
    const out = inlinePlaceholderFields(html, { f1: "งานก่อสร้าง" });
    expect(out).toContain("งานก่อสร้าง");
    expect(out).toContain("หน่วยงาน");
    expect(out).not.toContain("data-placeholder-field");
  });

  it("returns html unchanged when no fields exist", () => {
    expect(inlinePlaceholderFields("<p>ไม่มีช่องกรอก</p>", {})).toBe(
      "<p>ไม่มีช่องกรอก</p>"
    );
  });
});
