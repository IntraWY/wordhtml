import { describe, it, expect, afterEach } from "vitest";
import {
  createProductionVariableEditor,
  badgeInnerFromHtml,
  insertTwoBadges,
  simulateGuardTextInput,
  simulateGuardKeyDown,
} from "./variableTestHarness";
import { insertVariableBadge, exitVariableSuggestion } from "./insertVariableBadge";
import {
  findVariableMarkRangeAtPos,
  isCursorAfterCompleteVariable,
} from "./variableMarkRange";

describe("variable mark range boundaries", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  it("returns null when pos equals mark end (outside by pos < to rule)", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    const inside = findVariableMarkRangeAtPos(editor.state, 3);
    expect(inside).not.toBeNull();
    expect(findVariableMarkRangeAtPos(editor.state, inside!.to)).toBeNull();
  });

  it("isCursorAfterCompleteVariable is true at mark end", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    const end = findVariableMarkRangeAtPos(editor.state, 2)!.to;
    editor.commands.setTextSelection(end);
    expect(isCursorAfterCompleteVariable(editor.state)).toBe(true);
  });
});

describe("VariableTypingGuard (production stack)", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  it("types hello after badge without corrupting inner token", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const after = editor.state.selection.from;
    editor.commands.setTextSelection(after);
    simulateGuardTextInput(editor, " hello");
    expect(editor.state.doc.textContent).toBe("{{customer}} hello");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("types Thai text inside badge via guard without extending mark", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    simulateGuardTextInput(editor, "ทดสอบ");
    expect(editor.state.doc.textContent).toBe("{{customer}}ทดสอบ");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("inserts space inside badge at guard via keydown", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    editor.commands.setTextSelection(3);
    const handled = simulateGuardKeyDown(editor, " ");
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{name}} ");
  });

  it("replaces partial selection inside badge with plain text after mark", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection({ from: 3, to: 5 });
    simulateGuardTextInput(editor, "X");
    expect(editor.state.doc.textContent).toBe("{{customer}}X");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("types between two adjacent badges without merging marks", () => {
    editor = createProductionVariableEditor();
    insertTwoBadges(editor, "a", "b");
    const gap = findVariableMarkRangeAtPos(editor.state, 2)!.to;
    editor.commands.setTextSelection(gap);
    simulateGuardTextInput(editor, "|");
    expect(editor.state.doc.textContent).toBe("{{a}}|{{b}}");
    expect(badgeInnerFromHtml(editor.getHTML(), "a")).toBe("{{a}}");
    expect(badgeInnerFromHtml(editor.getHTML(), "b")).toBe("{{b}}");
  });

  it("loads pasted badge HTML then types after without corruption", () => {
    const html =
      '<p><span class="variable-badge" data-variable="customer">{{customer}}</span></p>';
    editor = createProductionVariableEditor(html);
    editor.commands.focus("end");
    simulateGuardTextInput(editor, " hello");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
    expect(editor.state.doc.textContent).toContain(" hello");
  });

  it("does not leave stored variable mark on caret after insert", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const $after = editor.state.doc.resolve(editor.state.selection.from);
    expect($after.marks().some((m) => m.type.name === "variable")).toBe(false);
  });

  it("replaces {{}} placeholder then types (regression: markInputRule corruption)", () => {
    editor = createProductionVariableEditor("<p>{{}}</p>");
    editor.commands.setTextSelection(3);
    insertVariableBadge(editor, editor.state.selection.from, "customer");
    simulateGuardTextInput(editor, " hello");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
    expect(editor.state.doc.textContent).toBe("{{customer}} hello");
  });
});
