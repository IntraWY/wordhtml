"use client";

import type { Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { exitSuggestion } from "@tiptap/suggestion";
import tippy, { Instance as TippyInstance, GetReferenceClientRect } from "tippy.js";
import { VariableSuggestionList } from "@/components/editor/VariableSuggestionList";
import { useEditorStore } from "@/store/editorStore";
import { variableSuggestionPluginKey } from "./suggestionPluginKeys";

interface SuggestionProps {
  editor: Editor;
  range: { from: number; to: number };
  clientRect?: (() => DOMRect) | null;
  event: KeyboardEvent;
  items: string[];
}

function suggestionOverlapsVariableBadge(
  state: import("@tiptap/pm/state").EditorState,
  range: { from: number; to: number }
): boolean {
  const variableMark = state.schema.marks.variable;
  if (!variableMark) return false;

  const doc = state.doc;
  const from = Math.max(0, range.from);
  const to = Math.min(doc.content.size, range.to);
  if (from >= to) return false;

  let overlaps = false;
  doc.nodesBetween(from, to, (node) => {
    if (!node.isText) return;
    if (node.marks.some((m) => m.type === variableMark)) {
      overlaps = true;
    }
  });
  return overlaps;
}

export const variableSuggestion = {
  char: "{{",
  allowSpaces: false,
  startOfLine: false,
  shouldShow: ({ editor, range }: { editor: Editor; range: { from: number; to: number } }) =>
    !suggestionOverlapsVariableBadge(editor.state, range),
  items: ({ query }: { query: string }) => {
    const variables = useEditorStore.getState().variables.map((v) => v.name);
    return variables
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 10);
  },
  render: () => {
    let component: ReactRenderer<unknown>;
    let popup: TippyInstance[];

    let exited = false;

    return {
      onStart: (props: SuggestionProps) => {
        exited = false;
        component = new ReactRenderer(VariableSuggestionList, {
          props: props as unknown as Record<string, unknown>,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy("body", {
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: "manual",
          placement: "bottom-start",
        });
      },

      onUpdate(props: SuggestionProps) {
        component.updateProps(props as unknown as Record<string, unknown>);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
        });
      },

      onKeyDown(props: SuggestionProps) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }

        if (props.event.key === " ") {
          exitSuggestion(props.editor.view, variableSuggestionPluginKey);
          return false;
        }

        const ref = component.ref as { onKeyDown?: (p: SuggestionProps) => boolean | void } | undefined;
        return ref?.onKeyDown?.(props) ?? false;
      },

      onExit() {
        if (exited) return;
        exited = true;
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};
