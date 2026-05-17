import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { variableSuggestion } from "./variableSuggestion";

export const VariableSuggestion = Extension.create({
  name: "variableSuggestion",

  addOptions() {
    return {
      suggestion: {
        char: "{{",
        command: ({ editor, range, props }: any) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: "text",
                marks: [
                  {
                    type: "variable",
                    attrs: {
                      name: props.name,
                    },
                  },
                ],
                text: `{{${props.name}}}`,
              },
            ])
            .run();
        },
        allow: ({ state, range }: any) => {
          const $from = state.doc.resolve(range.from);
          const type = $from.parent.type.name;
          return type === "paragraph" || type === "heading";
        },
        ...variableSuggestion,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
