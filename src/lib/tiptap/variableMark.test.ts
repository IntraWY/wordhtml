import { describe, it, expect, afterEach } from "vitest";
import { createMinimalVariableEditor, badgeInnerFromHtml } from "./variableTestHarness";
import { insertVariableBadge } from "./insertVariableBadge";

describe("VariableMark parse/render", () => {
  let editor: ReturnType<typeof createMinimalVariableEditor>;

  afterEach(() => {
    editor?.destroy();
  });

  it("round-trips Thai variable badge HTML", () => {
    const source =
      '<p>สวัสดี <span class="variable-badge" data-variable="ลูกค้า">{{ลูกค้า}}</span></p>';
    editor = createMinimalVariableEditor(source);
    const html = editor.getHTML();
    expect(html).toMatch(/data-variable="ลูกค้า"/);
    expect(badgeInnerFromHtml(html, "ลูกค้า")).toBe("{{ลูกค้า}}");
    expect(html).not.toMatch(/\{\{ลูกค้า\}\}\{\{ลูกค้า\}\}/);
  });

  it("loads Latin identifier badges from pasted HTML", () => {
    const source =
      '<p><span class="variable-badge" data-variable="customer">{{customer}}</span></p>';
    editor = createMinimalVariableEditor(source);
    expect(editor.state.doc.textContent).toBe("{{customer}}");
    expect(editor.getHTML()).toMatch(
      /<span[^>]*class="variable-badge"[^>]*data-variable="customer"/
    );
  });

  it("does not treat spans without data-variable as variable marks", () => {
    editor = createMinimalVariableEditor("<p><span class='variable-badge'>{{orphan}}</span></p>");
    expect(editor.getHTML()).not.toContain('data-variable="');
  });

  it("renderHTML uses child slot 0 (no duplicated token in DOM)", () => {
    editor = createMinimalVariableEditor();
    insertVariableBadge(editor, 1, "อนุมัติ");
    const html = editor.getHTML();
    expect(badgeInnerFromHtml(html, "อนุมัติ")).toBe("{{อนุมัติ}}");
    expect(html.match(/\{\{อนุมัติ\}\}/g)?.length).toBe(1);
  });
});
