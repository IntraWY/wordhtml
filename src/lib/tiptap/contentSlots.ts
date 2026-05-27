import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageSlot: { insertImageSlot: () => ReturnType };
    tableSlot: { insertTableSlot: () => ReturnType };
  }
}

export const ImageSlot = Node.create({
  name: "imageSlot",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: { default: "ช่องรูปภาพ" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-image-slot="true"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const label = (node.attrs.label as string) ?? "ช่องรูปภาพ";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-image-slot": "true",
        class: "content-slot content-slot-image",
      }),
      ["span", { class: "content-slot-label" }, label],
    ];
  },

  addCommands() {
    return {
      insertImageSlot:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { label: "ช่องรูปภาพ (Image slot)" },
          }),
    };
  },
});

export const TableSlot = Node.create({
  name: "tableSlot",
  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: { default: "ช่องตาราง" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-table-slot="true"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const label = (node.attrs.label as string) ?? "ช่องตาราง";
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-table-slot": "true",
        class: "content-slot content-slot-table",
      }),
      ["span", { class: "content-slot-label" }, label],
    ];
  },

  addCommands() {
    return {
      insertTableSlot:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { label: "ช่องตาราง (Table slot)" },
          }),
    };
  },
});
