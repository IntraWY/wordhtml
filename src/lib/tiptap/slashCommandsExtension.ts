import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import type { Editor } from "@tiptap/react";

import { slashSuggestion } from "./slashSuggestion";
import type { SlashItem } from "./slashCommandsConfig";
import { slashCommandsPluginKey } from "./suggestionPluginKeys";

export const SlashCommandsExtension = Extension.create({
  name: "slashCommands",

  addOptions() {
    return {
      suggestion: {
        ...slashSuggestion,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: { from: number; to: number };
          props: SlashItem;
        }) => {
          editor.chain().focus().deleteRange(range).run();
          props.command(editor);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        pluginKey: slashCommandsPluginKey,
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
