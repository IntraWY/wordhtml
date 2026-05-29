import { Extension } from "@tiptap/core";
import Suggestion, {
  findSuggestionMatch as defaultFindSuggestionMatch,
  type Trigger,
} from "@tiptap/suggestion";
import { variableSuggestion } from "./variableSuggestion";
import { variableSuggestionPluginKey } from "./suggestionPluginKeys";
import { insertVariableBadge } from "./insertVariableBadge";

function matchOverlapsVariableBadge(
  doc: import("@tiptap/pm/model").Node,
  range: { from: number; to: number }
): boolean {
  const variableType = doc.type.schema.marks.variable;
  if (!variableType) return false;

  let overlaps = false;
  doc.nodesBetween(range.from, range.to, (node) => {
    if (!node.isText) return;
    if (node.marks.some((m) => m.type === variableType)) {
      overlaps = true;
    }
  });
  return overlaps;
}

import type { Editor } from "@tiptap/core";

interface SuggestionCommandProps {
  editor: Editor;
  range: { from: number; to: number };
  props: { name: string };
}

import type { EditorState } from "@tiptap/pm/state";

interface SuggestionAllowProps {
  state: EditorState;
  range: { from: number; to: number };
}

export const VariableSuggestion = Extension.create({
  name: "variableSuggestion",

  addOptions() {
    return {
      suggestion: {
        command: ({ editor, range, props }: SuggestionCommandProps) => {
          editor.chain().focus().deleteRange(range).run();
          insertVariableBadge(editor, range.from, props.name);
        },
        allow: ({ state, range }: SuggestionAllowProps) => {
          const $from = state.doc.resolve(range.from);
          const parent = $from.parent;
          if (parent.type.name !== "paragraph" && parent.type.name !== "heading") {
            return false;
          }

          const variableMark = state.schema.marks.variable;
          if (!variableMark) return true;

          const parentStart = $from.start();
          let overlapsVariableBadge = false;
          parent.forEach((child, offset) => {
            if (!child.isText) return;
            const hasVariable = child.marks.some((m) => m.type === variableMark);
            if (!hasVariable) return;
            const from = parentStart + offset;
            const to = from + child.nodeSize;
            if (range.from < to && range.to > from) {
              overlapsVariableBadge = true;
            }
          });
          return !overlapsVariableBadge;
        },
        ...variableSuggestion,
        findSuggestionMatch: (config: Trigger) => {
          const match = defaultFindSuggestionMatch(config);
          if (!match) return null;
          if (matchOverlapsVariableBadge(config.$position.doc, match.range)) {
            return null;
          }
          return match;
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: variableSuggestionPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
