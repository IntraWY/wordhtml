import type { Editor } from "@tiptap/react";

export interface SlashItem {
  title: string;
  titleEn: string;
  command: (editor: Editor) => void;
}

export const SLASH_ITEMS: SlashItem[] = [
  {
    title: "หัวข้อ 1",
    titleEn: "Heading 1",
    command: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "หัวข้อ 2",
    titleEn: "Heading 2",
    command: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "รายการหัวข้อ",
    titleEn: "Bullet list",
    command: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: "รายการลำดับ",
    titleEn: "Ordered list",
    command: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "ตาราง",
    titleEn: "Table",
    command: (e) =>
      e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "เส้นคั่น",
    titleEn: "Divider",
    command: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "แบ่งหน้า",
    titleEn: "Page break",
    command: (e) => {
      if (e.commands.splitPage?.()) return;
      e.commands.insertPageBreak?.();
    },
  },
  {
    title: "ตัวแปร",
    titleEn: "Variable",
    command: (e) => {
      e.chain().focus().insertContent("{{variable}}").run();
    },
  },
  {
    title: "ช่องกรอก",
    titleEn: "Placeholder field",
    command: (e) => e.commands.insertPlaceholderField?.(),
  },
  {
    title: "ช่องรูป",
    titleEn: "Image slot",
    command: (e) => e.commands.insertImageSlot?.(),
  },
  {
    title: "ช่องตาราง",
    titleEn: "Table slot",
    command: (e) => e.commands.insertTableSlot?.(),
  },
];
