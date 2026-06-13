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
  handleVariableAdjacentSpace,
  handleVariableAdjacentTextInput,
} from "./variableAdjacentInput";
import { findVariableMarkRangeAtPos } from "./variableMarkRange";

describe("handleVariableAdjacentTextInput", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  it("returns false for empty text", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const { from, to } = editor.state.selection;
    expect(handleVariableAdjacentTextInput(editor.view, from, to, "")).toBe(false);
  });

  it("returns false when caret is in plain text away from any badge", () => {
    editor = createProductionVariableEditor("<p>hello</p>");
    editor.commands.setTextSelection(3);
    expect(handleVariableAdjacentTextInput(editor.view, 3, 3, "x")).toBe(false);
  });

  it("inserts plain text when caret sits right after a complete badge", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const after = editor.state.selection.from;
    const handled = handleVariableAdjacentTextInput(editor.view, after, after, "x");
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}x");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("places the caret after the inserted text", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    handleVariableAdjacentTextInput(editor.view, 3, 3, "ab");
    const { from, empty } = editor.state.selection;
    expect(empty).toBe(true);
    expect(editor.state.doc.textBetween(1, from)).toBe("{{customer}}ab");
  });

  it("appends after badge when caret is inside the mark", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    const handled = handleVariableAdjacentTextInput(editor.view, 3, 3, "ทดสอบ");
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}ทดสอบ");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("appends after badge for a selection fully inside the mark", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const handled = handleVariableAdjacentTextInput(editor.view, 3, 5, "X");
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}X");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("regression: selection ending exactly at badge end does not corrupt the token", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const range = findVariableMarkRangeAtPos(editor.state, 3)!;
    // Select from inside the badge to its end boundary, then type.
    const handled = handleVariableAdjacentTextInput(editor.view, 3, range.to, "X");
    expect(handled).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}X");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("returns false when selection extends beyond the badge into plain text", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const end = findVariableMarkRangeAtPos(editor.state, 3)!.to;
    editor.view.dispatch(
      editor.state.tr.insert(end, editor.state.schema.text(" tail"))
    );
    expect(
      handleVariableAdjacentTextInput(editor.view, 3, end + 3, "X")
    ).toBe(false);
  });

  it("returns false when selection spans two different badges", () => {
    editor = createProductionVariableEditor();
    insertTwoBadges(editor, "customer", "other");
    const first = findVariableMarkRangeAtPos(editor.state, 2)!;
    const second = findVariableMarkRangeAtPos(editor.state, first.to + 1)!;
    expect(
      handleVariableAdjacentTextInput(
        editor.view,
        first.from + 2,
        second.from + 2,
        "X"
      )
    ).toBe(false);
  });

  it("does not leave the variable mark on the inserted text", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    handleVariableAdjacentTextInput(editor.view, 3, 3, "x");
    const $at = editor.state.doc.resolve(editor.state.selection.from);
    expect($at.marks().some((m) => m.type.name === "variable")).toBe(false);
    const html = editor.getHTML();
    expect(html).not.toMatch(/data-variable="customer"[^>]*>[^<]*x/);
  });
});

describe("handleVariableAdjacentSpace", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  function spaceEvent() {
    return new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
  }

  it("ignores non-space keys", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    editor.commands.setTextSelection(3);
    const event = new KeyboardEvent("keydown", { key: "a" });
    expect(handleVariableAdjacentSpace(editor, event)).toBe(false);
  });

  it("ignores non-empty selections", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    editor.commands.setTextSelection({ from: 3, to: 5 });
    expect(handleVariableAdjacentSpace(editor, spaceEvent())).toBe(false);
  });

  it("inserts a space after the badge when caret is inside it", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    editor.commands.setTextSelection(3);
    expect(handleVariableAdjacentSpace(editor, spaceEvent())).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{name}} ");
    expect(badgeInnerFromHtml(editor.getHTML(), "name")).toBe("{{name}}");
  });

  it("inserts a space when caret is right after the badge", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "name");
    expect(handleVariableAdjacentSpace(editor, spaceEvent())).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{name}} ");
  });

  it("returns false in plain text away from any badge", () => {
    editor = createProductionVariableEditor("<p>hello</p>");
    editor.commands.setTextSelection(3);
    expect(handleVariableAdjacentSpace(editor, spaceEvent())).toBe(false);
  });
});

describe("VariableTypingGuard wiring (merged PM props)", () => {
  let editor: ReturnType<typeof createProductionVariableEditor>;

  afterEach(() => {
    if (editor) {
      exitVariableSuggestion(editor);
      editor.destroy();
    }
  });

  it("guard handles text input inside badge via handleTextInput prop", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    expect(simulateGuardTextInput(editor, "x")).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}x");
  });

  it("guard handles printable keydown inside badge", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    editor.commands.setTextSelection(3);
    expect(simulateGuardKeyDown(editor, "z")).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}z");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });

  it("regression: typing over selection ending at badge boundary via guard keeps badge intact", () => {
    editor = createProductionVariableEditor();
    insertVariableBadge(editor, 1, "customer");
    const range = findVariableMarkRangeAtPos(editor.state, 3)!;
    editor.commands.setTextSelection({ from: 3, to: range.to });
    expect(simulateGuardTextInput(editor, "X")).toBe(true);
    expect(editor.state.doc.textContent).toBe("{{customer}}X");
    expect(badgeInnerFromHtml(editor.getHTML(), "customer")).toBe("{{customer}}");
  });
});
