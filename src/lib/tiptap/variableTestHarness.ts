import { vi } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { VariableMark } from "./variableMark";
import { VariableTypingGuard } from "./variableTypingGuard";
import { VariableSuggestion } from "./variableSuggestionExtension";
import { insertVariableBadge } from "./insertVariableBadge";
import { variableSuggestionPluginKey } from "./suggestionPluginKeys";

vi.mock("@/store/editorStore", () => ({
  useEditorStore: {
    getState: () => ({
      variables: [
        { name: "customer", value: "", isList: false },
        { name: "other", value: "", isList: false },
        { name: "ลูกค้า", value: "", isList: false },
      ],
    }),
  },
}));

/** Editor stack matching VisualEditor variable extensions. */
export function createProductionVariableEditor(html = "<p></p>") {
  return new Editor({
    extensions: [StarterKit, VariableMark, VariableTypingGuard, VariableSuggestion],
    content: html,
  });
}

export function createMinimalVariableEditor(html = "<p></p>") {
  return new Editor({
    extensions: [StarterKit, VariableMark],
    content: html,
  });
}

export function badgeInnerFromHtml(html: string, name: string): string | undefined {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`data-variable="${escaped}"[^>]*>([^<]*)<`))?.[1];
}

export function insertTwoBadges(editor: Editor, a: string, b: string) {
  insertVariableBadge(editor, 1, a);
  insertVariableBadge(editor, editor.state.selection.from, b);
}

/** Invoke merged ProseMirror handleTextInput (includes VariableTypingGuard). */
export function simulateGuardTextInput(editor: Editor, text: string): boolean {
  const view = editor.view;
  const { from, to } = view.state.selection;
  const deflt = () => view.state.tr.insertText(text, from, to);
  return (
    view.someProp("handleTextInput", (fn) => fn(view, from, to, text, deflt)) ??
    false
  );
}

export function simulateGuardKeyDown(editor: Editor, key: string): boolean {
  const view = editor.view;
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  return view.someProp("handleKeyDown", (fn) => fn(view, event)) ?? false;
}

export function suggestionIsActive(editor: Editor): boolean {
  return variableSuggestionPluginKey.getState(editor.state)?.active ?? false;
}
