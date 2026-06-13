import { describe, it, expect } from "vitest";
import {
  inlinePlaceholderFields,
  listPlaceholderFields,
} from "./inlinePlaceholderFields";

/** Build a fill-in field span exactly as PlaceholderField.renderHTML emits it. */
function fieldSpan(opts: {
  id?: string;
  label?: string;
  value?: string;
  required?: boolean;
}): string {
  const { id = "f1", label = "ช่องกรอก", value = "", required = false } = opts;
  return (
    `<span class="placeholder-field${value.trim() ? "" : " is-empty"}${required ? " is-required" : ""}"` +
    ` data-placeholder-field="true" data-field-id="${id}" data-label="${label}"` +
    ` data-field-type="text" data-required="${required ? "true" : "false"}"` +
    ` data-value="${value}" contenteditable="false">${value.trim() || label}</span>`
  );
}

describe("inlinePlaceholderFields", () => {
  it("returns html unchanged (same reference path) when no fill-in fields exist", () => {
    const html = "<p>เอกสารธรรมดา ไม่มีช่องกรอก</p>";
    expect(inlinePlaceholderFields(html, { f1: "x" })).toBe(html);
  });

  it("replaces a field span with the value from fieldValues by field id", () => {
    const html = `<p>เรียน ${fieldSpan({ id: "name" })} ครับ</p>`;
    const out = inlinePlaceholderFields(html, { name: "สมชาย ใจดี" });
    expect(out).toBe("<p>เรียน สมชาย ใจดี ครับ</p>");
  });

  it("strips all field markup — no span, classes, or data attributes survive", () => {
    const html = `<p>${fieldSpan({ id: "a", value: "ค่า", required: true })}</p>`;
    const out = inlinePlaceholderFields(html, {});
    expect(out).not.toContain("data-placeholder-field");
    expect(out).not.toContain("placeholder-field");
    expect(out).not.toContain("contenteditable");
    expect(out).not.toContain("<span");
  });

  it("prefers fieldValues over the stored data-value attribute", () => {
    const html = `<p>${fieldSpan({ id: "a", value: "ค่าเก่า" })}</p>`;
    expect(inlinePlaceholderFields(html, { a: "ค่าใหม่" })).toBe("<p>ค่าใหม่</p>");
  });

  it("falls back to data-value when fieldValues has no entry for the id", () => {
    const html = `<p>${fieldSpan({ id: "a", value: "ค่าในเอกสาร" })}</p>`;
    expect(inlinePlaceholderFields(html, {})).toBe("<p>ค่าในเอกสาร</p>");
  });

  it("falls back to the label when both fieldValues and data-value are empty (required and optional alike)", () => {
    const html =
      `<p>${fieldSpan({ id: "req", label: "ชื่อผู้ลงนาม", required: true })}` +
      ` / ${fieldSpan({ id: "opt", label: "หมายเหตุ", required: false })}</p>`;
    expect(inlinePlaceholderFields(html, {})).toBe("<p>ชื่อผู้ลงนาม / หมายเหตุ</p>");
  });

  it("ignores fieldValues lookup when the span has no usable data-field-id", () => {
    const html =
      `<p><span data-placeholder-field="true" data-label="ตำแหน่ง" data-value="">ตำแหน่ง</span></p>`;
    // "" is falsy → stored stays "", label wins; the "" key must not be consulted.
    expect(inlinePlaceholderFields(html, { "": "ห้ามใช้" })).toBe("<p>ตำแหน่ง</p>");
  });

  it("trims surrounding whitespace from the resolved value", () => {
    const html = `<p>[${fieldSpan({ id: "a" })}]</p>`;
    expect(inlinePlaceholderFields(html, { a: "  เว้นวรรค  " })).toBe("<p>[เว้นวรรค]</p>");
  });

  it("inserts values as text — HTML special characters are escaped, not parsed", () => {
    const html = `<p>${fieldSpan({ id: "a" })}</p>`;
    const out = inlinePlaceholderFields(html, { a: '<b onclick="x">1 & 2</b>' });
    expect(out).toBe('<p>&lt;b onclick="x"&gt;1 &amp; 2&lt;/b&gt;</p>');
  });

  it("resolves multiple fields independently in one pass", () => {
    const html =
      `<p>${fieldSpan({ id: "a", label: "ก" })} กับ ${fieldSpan({ id: "b", label: "ข" })}</p>`;
    const out = inlinePlaceholderFields(html, { a: "หนึ่ง", b: "สอง" });
    expect(out).toBe("<p>หนึ่ง กับ สอง</p>");
  });

  it("is idempotent — a second pass leaves the output untouched", () => {
    const html = `<p>เรียน ${fieldSpan({ id: "a" })}</p>`;
    const once = inlinePlaceholderFields(html, { a: "ผู้ว่าราชการจังหวัด" });
    expect(inlinePlaceholderFields(once, { a: "ค่าอื่น" })).toBe(once);
  });

  it("preserves surrounding document structure and unrelated spans", () => {
    const html =
      `<h1>หัวเรื่อง</h1><p><span class="other">คงไว้</span> ${fieldSpan({ id: "a" })}</p>`;
    const out = inlinePlaceholderFields(html, { a: "ค่า" });
    expect(out).toContain("<h1>หัวเรื่อง</h1>");
    expect(out).toContain('<span class="other">คงไว้</span>');
    expect(out).toContain("ค่า");
  });

  it("replaces a fully-empty field (no value, no label) with empty text", () => {
    const html = `<p>ก่อน<span data-placeholder-field="true" data-field-id="a"></span>หลัง</p>`;
    expect(inlinePlaceholderFields(html, {})).toBe("<p>ก่อนหลัง</p>");
  });
});

describe("listPlaceholderFields", () => {
  it("returns [] when the document has no fill-in fields", () => {
    expect(listPlaceholderFields("<p>ไม่มีช่องกรอก</p>")).toEqual([]);
    expect(listPlaceholderFields("")).toEqual([]);
  });

  it("lists fields in document order with all attributes", () => {
    const html =
      `<p>${fieldSpan({ id: "a", label: "ชื่อ", required: true })}</p>` +
      `<p>${fieldSpan({ id: "b", label: "หมายเหตุ", value: "ค่าเดิม" })}</p>`;
    expect(listPlaceholderFields(html)).toEqual([
      { fieldId: "a", label: "ชื่อ", fieldType: "text", required: true, value: "" },
      { fieldId: "b", label: "หมายเหตุ", fieldType: "text", required: false, value: "ค่าเดิม" },
    ]);
  });

  it("de-duplicates repeated field ids, keeping the first occurrence", () => {
    const html =
      `<p>${fieldSpan({ id: "a", label: "แรก" })} ${fieldSpan({ id: "a", label: "ซ้ำ" })}</p>`;
    const fields = listPlaceholderFields(html);
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe("แรก");
  });

  it("keeps fields without an id as separate entries with defaults applied", () => {
    const html =
      `<p><span data-placeholder-field="true"></span>` +
      `<span data-placeholder-field="true"></span></p>`;
    const fields = listPlaceholderFields(html);
    expect(fields).toHaveLength(2);
    expect(fields[0]).toEqual({
      fieldId: "",
      label: "ช่องกรอก",
      fieldType: "text",
      required: false,
      value: "",
    });
  });

  it("ignores spans whose data-placeholder-field is not exactly \"true\"", () => {
    const html = `<p><span data-placeholder-field="false" data-field-id="x">x</span></p>`;
    expect(listPlaceholderFields(html)).toEqual([]);
  });
});
