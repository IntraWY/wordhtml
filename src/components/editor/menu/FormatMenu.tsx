"use client";

import { memo } from "react";
import { useEditorState } from "@tiptap/react";

import { MenuDropdown, MenuItem, MenuSub, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

function FormatMenuInner({ editor }: EditorMenuProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isParagraph: e?.isActive("paragraph") ?? false,
      isH1: e?.isActive("heading", { level: 1 }) ?? false,
      isH2: e?.isActive("heading", { level: 2 }) ?? false,
      isH3: e?.isActive("heading", { level: 3 }) ?? false,
      isBold: e?.isActive("bold") ?? false,
      isItalic: e?.isActive("italic") ?? false,
      isUnderline: e?.isActive("underline") ?? false,
      isStrike: e?.isActive("strike") ?? false,
      isSuperscript: e?.isActive("superscript") ?? false,
      isSubscript: e?.isActive("subscript") ?? false,
      isCode: e?.isActive("code") ?? false,
      alignLeft: e?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: e?.isActive({ textAlign: "center" }) ?? false,
      alignRight: e?.isActive({ textAlign: "right" }) ?? false,
      alignJustify: e?.isActive({ textAlign: "justify" }) ?? false,
    }),
  });

  const hasEditor = editor !== null;
  const s = state ?? {
    isParagraph: false,
    isH1: false,
    isH2: false,
    isH3: false,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isSuperscript: false,
    isSubscript: false,
    isCode: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
  };

  return (
    <MenuDropdown label="จัดรูปแบบ (Format)">
      <MenuSub label="รูปแบบย่อหน้า">
        <MenuItem
          label="ข้อความปกติ"
          checked={s.isParagraph}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        />
        <MenuItem
          label="หัวเรื่อง 1"
          checked={s.isH1}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />
        <MenuItem
          label="หัวเรื่อง 2"
          checked={s.isH2}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <MenuItem
          label="หัวเรื่อง 3"
          checked={s.isH3}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
      </MenuSub>
      <Sep />
      <MenuItem
        label="ตัวหนา (Bold)"
        shortcut="Ctrl+B"
        checked={s.isBold}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <MenuItem
        label="ตัวเอียง (Italic)"
        shortcut="Ctrl+I"
        checked={s.isItalic}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <MenuItem
        label="ขีดเส้นใต้ (Underline)"
        shortcut="Ctrl+U"
        checked={s.isUnderline}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <MenuItem
        label="ขีดทับ (Strikethrough)"
        checked={s.isStrike}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <MenuItem
        label="ตัวยก (Superscript)"
        checked={s.isSuperscript}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleSuperscript().run()}
      />
      <MenuItem
        label="ตัวห้อย (Subscript)"
        checked={s.isSubscript}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleSubscript().run()}
      />
      <MenuItem
        label="โค้ดบรรทัด (Inline Code)"
        shortcut="Ctrl+E"
        checked={s.isCode}
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleCode().run()}
      />
      <Sep />
      <MenuSub label="การจัดวาง (Align)">
        <MenuItem
          label="ชิดซ้าย (Left)"
          checked={s.alignLeft}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        />
        <MenuItem
          label="กึ่งกลาง (Center)"
          checked={s.alignCenter}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        />
        <MenuItem
          label="ชิดขวา (Right)"
          checked={s.alignRight}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        />
        <MenuItem
          label="กระจาย (Justify)"
          checked={s.alignJustify}
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
        />
      </MenuSub>
      <MenuSub label="ฟอนต์ (Font)">
        {[
          { label: "ค่าเริ่มต้น (Default)", value: null },
          { label: "Sarabun", value: "Sarabun, sans-serif" },
          { label: "Noto Sans Thai", value: "'Noto Sans Thai', sans-serif" },
          { label: "Geist", value: "var(--font-geist-sans)" },
          { label: "ระบบ Sans (System)", value: "system-ui, sans-serif" },
          { label: "Serif", value: "Georgia, serif" },
          { label: "Monospace", value: "var(--font-geist-mono)" },
        ].map(({ label, value }) => (
          <MenuItem
            key={label}
            label={label}
            onClick={() => {
              if (!editor) return;
              if (value === null) {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(value).run();
              }
            }}
          />
        ))}
      </MenuSub>
      <Sep />
      <MenuItem
        label="ล้างรูปแบบ (Clear Formatting)"
        disabled={!hasEditor}
        onClick={() =>
          editor?.chain().focus().clearNodes().unsetAllMarks().run()
        }
      />
    </MenuDropdown>
  );
}

export const FormatMenu = memo(FormatMenuInner);
