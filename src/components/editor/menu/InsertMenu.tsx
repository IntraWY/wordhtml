"use client";

import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

export function InsertMenu({ editor }: EditorMenuProps) {
  const hasEditor = editor !== null;

  const promptFor = (msg: string): string => window.prompt(msg) ?? "";

  return (
    <MenuDropdown label="แทรก (Insert)">
      <MenuItem
        label="ลิงก์… (Link)"
        disabled={!hasEditor}
        onClick={() => {
          const url = promptFor("ใส่ URL ของลิงก์:");
          if (!url) return;
          editor?.chain().focus().setLink({ href: url }).run();
        }}
      />
      <MenuItem
        label="รูปภาพ… (Image)"
        disabled={!hasEditor}
        onClick={() => {
          const src = promptFor("ใส่ URL ของรูปภาพ:");
          if (!src) return;
          editor?.chain().focus().setImage({ src }).run();
        }}
      />
      <Sep />
      <MenuItem
        label="ตาราง (Table)"
        disabled={!hasEditor}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <MenuItem
        label="เส้นแบ่ง (Horizontal Rule)"
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />
      <Sep />
      <MenuItem
        label="บล็อกโค้ด (Code Block)"
        disabled={!hasEditor}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      />
    </MenuDropdown>
  );
}
