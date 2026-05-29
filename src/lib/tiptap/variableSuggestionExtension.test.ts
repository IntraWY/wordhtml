import { describe, it, expect, afterEach } from "vitest";
import {
  createProductionVariableEditor,
  badgeInnerFromHtml,
  insertTwoBadges,
  simulateGuardTextInput,
  suggestionIsActive,
} from "./variableTestHarness";
import { insertVariableBadge } from "./insertVariableBadge";
import { exitVariableSuggestion } from "./insertVariableBadge";
import { findVariableMarkRangeAtPos } from "./variableMarkRange";

describe("VariableSuggestion + badge overlap", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  it("does not activate suggestion when cursor is after an existing badge", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    simulateGuardTextInput(editor, "x");
    expect(suggestionIsActive(editor)).toBe(false);
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
    expect(editor.state.doc.textContent).toBe("{{customer}}x");
  });

  it("does not activate suggestion when cursor is inside badge text", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    simulateGuardTextInput(editor, "z");
    expect(suggestionIsActive(editor)).toBe(false);
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
    expect(editor.state.doc.textContent).toBe("{{customer}}z");
  });

  it("still allows suggestion for plain {{ trigger in empty paragraph", () => {
    editor = createProductionVariableEditor();
    editor.commands.insertContent("{{");
    editor.commands.setTextSelection(3);
    expect(suggestionIsActive(editor)).toBe(true);
  });

  it("does not open suggestion on second badge when typing between two badges", () => {
    editor = createProductionVariableEditor();
    insertTwoBadges(editor, "a", "b");
    const firstEnd = findVariableMarkRangeAtPos(editor.state, 2)!.to;
    editor.commands.setTextSelection(firstEnd);
    simulateGuardTextInput(editor, " ");
    expect(suggestionIsActive(editor)).toBe(false);
    expect(editor.state.doc.textContent).toBe("{{a}} {{b}}");
  });
});
