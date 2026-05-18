import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { variableSuggestion } from "./variableSuggestion";

interface SuggestionCommandProps {
  editor: {
    chain: () => {
      focus: () => {
        insertContentAt: (range: { from: number; to: number }, content: unknown[]) => { run: () => boolean };
      };
    };
  };
  range: { from: number; to: number };
  props: { name: string };
}

interface SuggestionAllowProps {
  state: {
    doc: {
      resolve: (pos: number) => {
        parent: {
          type: {
            name: string;
          };
        };
      };
    };
  };
  range: { from: number };
}

export const VariableSuggestion = Extension.create({
  name: "variableSuggestion",

  addOptions() {
    return {
      suggestion: {
        command: ({ editor, range, props }: SuggestionCommandProps) => {
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
        allow: ({ state, range }: SuggestionAllowProps) => {
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
