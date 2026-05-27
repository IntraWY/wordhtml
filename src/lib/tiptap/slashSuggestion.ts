"use client";

import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance, type GetReferenceClientRect } from "tippy.js";
import type { SuggestionProps } from "@tiptap/suggestion";

import { SlashCommandList } from "@/components/editor/SlashCommandList";
import { SLASH_ITEMS, type SlashItem } from "./slashCommandsConfig";

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.titleEn.toLowerCase().includes(q)
  );
}

export const slashSuggestion = {
  char: "/",
  allowSpaces: false,
  startOfLine: false,
  items: ({ query }: { query: string }) => filterSlashItems(query),
  render: () => {
    let component: ReactRenderer<unknown>;
    let popup: TippyInstance[];

    return {
      onStart: (props: SuggestionProps<SlashItem>) => {
        component = new ReactRenderer(SlashCommandList, {
          props: props as unknown as Record<string, unknown>,
          editor: props.editor,
        });
        if (!props.clientRect) return;
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
      onUpdate(props: SuggestionProps<SlashItem>) {
        component.updateProps(props as unknown as Record<string, unknown>);
        if (!props.clientRect) return;
        popup[0].setProps({
          getReferenceClientRect: props.clientRect as GetReferenceClientRect,
        });
      },
      onKeyDown(props: SuggestionProps<SlashItem> & { event: KeyboardEvent }) {
        if (props.event.key === "Escape") {
          popup[0].hide();
          return true;
        }
        const ref = component.ref as {
          onKeyDown?: (
            p: SuggestionProps<SlashItem> & { event: KeyboardEvent }
          ) => boolean | void;
        };
        return ref?.onKeyDown?.(props) ?? false;
      },
      onExit() {
        popup[0].destroy();
        component.destroy();
      },
    };
  },
};
