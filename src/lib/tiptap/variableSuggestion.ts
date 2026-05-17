"use client";

import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance, GetReferenceClientRect } from "tippy.js";
import { VariableSuggestionList } from "@/components/editor/VariableSuggestionList";
import { useEditorStore } from "@/store/editorStore";

export const variableSuggestion = {
  char: "{{",
  allowSpaces: false,
  startOfLine: false,
  items: ({ query }: { query: string }) => {
    const variables = useEditorStore.getState().variables.map((v) => v.name);
    return variables
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 10);
  },
  render: () => {
    let component: ReactRenderer<any>;
    let popup: TippyInstance[];

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(VariableSuggestionList, {
          props,
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

      onUpdate(props: any) {
        component.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }

        return (component.ref as any)?.onKeyDown(props);
      },

      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
