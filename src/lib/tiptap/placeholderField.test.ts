import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { PlaceholderField } from "./placeholderField";

// Tiptap v3 types config methods with a strict `this` context that cannot be
// satisfied in unit tests without a full Editor instance. Cast to `any` so we
// can invoke the functions directly (same pattern as pageNode.test.ts).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c = PlaceholderField.config as any;

function createEditor(html = "<p></p>") {
  return new Editor({
    extensions: [StarterKit, PlaceholderField],
    content: html,
  });
}

function fieldSpanHtml(attrs: Record<string, string>, inner = ""): string {
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(" ");
  return `<span data-placeholder-field="true" ${attrStr}>${inner}</span>`;
}

describe("PlaceholderField (config level)", () => {
  describe("attributes", () => {
    it("defines defaults: null id, Thai label, text type, optional, empty value", () => {
      const defs = c.addAttributes();
      expect(defs.fieldId.default).toBeNull();
      expect(defs.label.default).toBe("ช่องกรอก");
      expect(defs.fieldType.default).toBe("text");
      expect(defs.required.default).toBe(false);
      expect(defs.value.default).toBe("");
    });
  });

  describe("parseHTML", () => {
    it("matches only spans flagged with data-placeholder-field=true", () => {
      const rules = c.parseHTML();
      expect(rules).toHaveLength(1);
      expect(rules[0].tag).toBe('span[data-placeholder-field="true"]');
    });

    it("getAttrs extracts all data attributes", () => {
      const el = document.createElement("span");
      el.setAttribute("data-field-id", "f_1");
      el.setAttribute("data-label", "ชื่อหน่วยงาน");
      el.setAttribute("data-field-type", "date");
      el.setAttribute("data-required", "true");
      el.setAttribute("data-value", "๑๒ มิถุนายน ๒๕๖๙");
      const rules = c.parseHTML();
      expect(rules[0].getAttrs(el)).toEqual({
        fieldId: "f_1",
        label: "ชื่อหน่วยงาน",
        fieldType: "date",
        required: true,
        value: "๑๒ มิถุนายน ๒๕๖๙",
      });
    });

    it("getAttrs falls back to defaults for missing attributes", () => {
      const el = document.createElement("span");
      const attrs = c.parseHTML()[0].getAttrs(el);
      expect(attrs).toEqual({
        fieldId: null,
        label: "ช่องกรอก",
        fieldType: "text",
        required: false,
        value: "",
      });
    });

    it('getAttrs treats any data-required other than "true" as optional', () => {
      const el = document.createElement("span");
      el.setAttribute("data-required", "TRUE");
      expect(c.parseHTML()[0].getAttrs(el).required).toBe(false);
    });

    it("getAttrs rejects non-HTMLElement input", () => {
      expect(c.parseHTML()[0].getAttrs("span")).toBe(false);
    });
  });

  describe("renderHTML", () => {
    function render(attrs: Record<string, unknown>) {
      return c.renderHTML({ node: { attrs }, HTMLAttributes: {} });
    }

    it("shows the value as display text when filled", () => {
      const result = render({
        fieldId: "f1",
        label: "ชื่อ",
        fieldType: "text",
        required: false,
        value: "สมหญิง",
      });
      expect(result[0]).toBe("span");
      expect(result[2]).toBe("สมหญิง");
      const props = result[1] as Record<string, string>;
      expect(props.class).toBe("placeholder-field");
      expect(props["data-value"]).toBe("สมหญิง");
      expect(props.contenteditable).toBe("false");
    });

    it("falls back to the label and is-empty class when value is blank", () => {
      const result = render({
        fieldId: "f1",
        label: "ตำแหน่ง",
        fieldType: "text",
        required: false,
        value: "   ",
      });
      expect(result[2]).toBe("ตำแหน่ง");
      const props = result[1] as Record<string, string>;
      expect(props.class).toContain("is-empty");
    });

    it("adds is-required class and data-required for required fields", () => {
      const result = render({
        fieldId: "f1",
        label: "ลายเซ็น",
        fieldType: "text",
        required: true,
        value: "",
      });
      const props = result[1] as Record<string, string>;
      expect(props.class).toBe("placeholder-field is-empty is-required");
      expect(props["data-required"]).toBe("true");
    });
  });
});

describe("PlaceholderField (editor round-trip)", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  it("round-trips a filled field through parse → serialize without loss", () => {
    const source = `<p>เรียน ${fieldSpanHtml(
      {
        "data-field-id": "f_recipient",
        "data-label": "ผู้รับ",
        "data-field-type": "text",
        "data-required": "true",
        "data-value": "อธิบดีกรมสรรพากร",
      },
      "อธิบดีกรมสรรพากร"
    )}</p>`;
    editor = createEditor(source);
    const html = editor.getHTML();
    expect(html).toContain('data-field-id="f_recipient"');
    expect(html).toContain('data-label="ผู้รับ"');
    expect(html).toContain('data-required="true"');
    expect(html).toContain('data-value="อธิบดีกรมสรรพากร"');
    expect(html).toContain(">อธิบดีกรมสรรพากร</span>");
    // Re-parsing the serialized HTML must be stable (idempotent round-trip).
    const second = createEditor(html);
    expect(second.getHTML()).toBe(html);
    second.destroy();
  });

  it("renders the label as visible content for an unfilled field", () => {
    editor = createEditor(
      `<p>${fieldSpanHtml(
        { "data-field-id": "f1", "data-label": "ช่องว่าง", "data-value": "" },
        "ช่องว่าง"
      )}</p>`
    );
    // Atom nodes carry no doc text; the label is rendered as the span's content.
    expect(editor.state.doc.textContent).toBe("");
    expect(editor.getHTML()).toContain(">ช่องว่าง</span>");
    expect(editor.getHTML()).toContain("is-empty");
  });

  it("does not parse ordinary spans as placeholder fields", () => {
    editor = createEditor('<p><span data-field-id="f1">ปกติ</span></p>');
    expect(editor.getHTML()).not.toContain("data-placeholder-field");
  });

  it("insertPlaceholderField inserts an empty field with a generated id and defaults", () => {
    editor = createEditor();
    const ok = editor.commands.insertPlaceholderField();
    expect(ok).toBe(true);
    const html = editor.getHTML();
    expect(html).toMatch(/data-field-id="field_[a-z0-9]+_[a-z0-9]+"/);
    expect(html).toContain('data-label="ช่องกรอก"');
    expect(html).toContain('data-required="false"');
    expect(html).toContain('data-value=""');
    expect(html).toContain("is-empty");
  });

  it("insertPlaceholderField honors custom label/type/required and forces empty value", () => {
    editor = createEditor();
    editor.commands.insertPlaceholderField({
      fieldId: "f_custom",
      label: "วันที่ลงนาม",
      fieldType: "date",
      required: true,
    });
    const html = editor.getHTML();
    expect(html).toContain('data-field-id="f_custom"');
    expect(html).toContain('data-label="วันที่ลงนาม"');
    expect(html).toContain('data-field-type="date"');
    expect(html).toContain('data-required="true"');
    expect(html).toContain('data-value=""');
    // Empty value → label is the rendered display text.
    expect(html).toContain(">วันที่ลงนาม</span>");
  });

  it("is an inline atom: field sits inside a paragraph alongside text", () => {
    editor = createEditor(
      `<p>ก่อน ${fieldSpanHtml(
        { "data-field-id": "f1", "data-label": "กลาง" },
        "กลาง"
      )} หลัง</p>`
    );
    expect(editor.state.doc.childCount).toBe(1);
    // Surrounding text survives; the atom itself contributes no doc text.
    expect(editor.state.doc.textContent).toBe("ก่อน  หลัง");
    expect(editor.getHTML()).toMatch(/ก่อน <span[^>]*data-placeholder-field[^>]*>กลาง<\/span> หลัง/);
    let fieldCount = 0;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "placeholderField") {
        fieldCount++;
        expect(node.isInline).toBe(true);
        expect(node.isAtom).toBe(true);
      }
    });
    expect(fieldCount).toBe(1);
  });
});
