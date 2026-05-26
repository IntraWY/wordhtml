import { Node, mergeAttributes } from "@tiptap/core";

export type PlaceholderFieldType = "text" | "date" | "number";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    placeholderField: {
      insertPlaceholderField: (attrs?: {
        fieldId?: string;
        label?: string;
        fieldType?: PlaceholderFieldType;
        required?: boolean;
      }) => ReturnType;
    };
  }
}

function newFieldId(): string {
  return `field_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export const PlaceholderField = Node.create({
  name: "placeholderField",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      fieldId: { default: null },
      label: { default: "ช่องกรอก" },
      fieldType: { default: "text" },
      required: { default: false },
      value: { default: "" },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-placeholder-field="true"]',
        getAttrs: (el) => {
          if (!(el instanceof HTMLElement)) return false;
          return {
            fieldId: el.getAttribute("data-field-id"),
            label: el.getAttribute("data-label") ?? "ช่องกรอก",
            fieldType: (el.getAttribute("data-field-type") as PlaceholderFieldType) ?? "text",
            required: el.getAttribute("data-required") === "true",
            value: el.getAttribute("data-value") ?? "",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const fieldId = (node.attrs.fieldId as string) ?? "";
    const label = (node.attrs.label as string) ?? "ช่องกรอก";
    const fieldType = (node.attrs.fieldType as PlaceholderFieldType) ?? "text";
    const required = Boolean(node.attrs.required);
    const value = (node.attrs.value as string) ?? "";
    const display = value.trim() || label;
    const empty = !value.trim();

    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        class: `placeholder-field${empty ? " is-empty" : ""}${required ? " is-required" : ""}`,
        "data-placeholder-field": "true",
        "data-field-id": fieldId,
        "data-label": label,
        "data-field-type": fieldType,
        "data-required": required ? "true" : "false",
        "data-value": value,
        contenteditable: "false",
      }),
      display,
    ];
  },

  addCommands() {
    return {
      insertPlaceholderField:
        (attrs) =>
        ({ chain }) => {
          const fieldId = attrs?.fieldId ?? newFieldId();
          const label = attrs?.label ?? "ช่องกรอก";
          return chain()
            .insertContent({
              type: this.name,
              attrs: {
                fieldId,
                label,
                fieldType: attrs?.fieldType ?? "text",
                required: attrs?.required ?? false,
                value: "",
              },
            })
            .run();
        },
    };
  },
});
