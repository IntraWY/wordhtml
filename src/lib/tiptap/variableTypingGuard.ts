import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import {
  handleVariableAdjacentSpace,
  handleVariableAdjacentTextInput,
} from "./variableAdjacentInput";

const variableTypingGuardKey = new PluginKey("variableTypingGuard");

/** Ensures typing beside/inside variable badges stays outside the mark (high-priority PM props). */
export const VariableTypingGuard = Extension.create({
  name: "variableTypingGuard",
  priority: 1000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: variableTypingGuardKey,
        props: {
          handleTextInput(view, from, to, text) {
            return handleVariableAdjacentTextInput(view, from, to, text);
          },
          handleKeyDown(view, event) {
            if (handleVariableAdjacentSpace(editor, event)) {
              event.preventDefault();
              return true;
            }
            if (
              !event.ctrlKey &&
              !event.metaKey &&
              !event.altKey &&
              event.key.length === 1 &&
              !event.isComposing
            ) {
              const { from, to } = view.state.selection;
              if (handleVariableAdjacentTextInput(view, from, to, event.key)) {
                event.preventDefault();
                return true;
              }
            }
            return false;
          },
          handleDOMEvents: {
            beforeinput(view, event) {
              const input = event as InputEvent;
              const data = input.data;
              if (!data) return false;
              if (
                input.inputType !== "insertText" &&
                input.inputType !== "insertCompositionText" &&
                input.inputType !== "insertFromComposition"
              ) {
                return false;
              }
              const { from, to } = view.state.selection;
              if (handleVariableAdjacentTextInput(view, from, to, data)) {
                input.preventDefault();
                return true;
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
