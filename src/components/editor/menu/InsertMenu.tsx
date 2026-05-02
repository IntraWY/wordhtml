"use client";

import { useRef } from "react";

import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

export function InsertMenu({ editor }: EditorMenuProps) {
  const hasEditor = editor !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const promptFor = (msg: string): string => window.prompt(msg) ?? "";

  const insertImageFromFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      window.alert("กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, GIF, WebP, SVG)");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      window.alert("ไฟล์รูปภาพใหญ่เกิน 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result;
      if (typeof src === "string" && editor) {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      }
    };
    reader.onerror = () => window.alert("ไม่สามารถอ่านไฟล์ได้");
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImageFromFile(file);
          e.target.value = "";
        }}
      />
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
        <Sep />
        <MenuItem
          label="อัปโหลดรูปภาพ… (Upload Image)"
          disabled={!hasEditor}
          onClick={() => fileInputRef.current?.click()}
        />
        <MenuItem
          label="รูปภาพจาก URL… (Image URL)"
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
        <MenuItem
          label="ขึ้นบรรทัดใหม่ (Soft Break)"
          shortcut="Shift+Enter"
          disabled={!hasEditor}
          onClick={() => editor?.chain().focus().setHardBreak().run()}
        />
        <Sep />
        <MenuItem
          label="บล็อกโค้ด (Code Block)"
          disabled={!hasEditor}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        />
        <Sep />
        <MenuItem
          label="แทรกตัวแบ่งหน้า (Page Break)"
          shortcut="Ctrl+Enter"
          disabled={!hasEditor}
          onClick={() => editor?.chain().focus().insertPageBreak().run()}
        />
        <MenuItem
          label="เพิ่มหน้าใหม่ (Add Page)"
          disabled={!hasEditor}
          onClick={() => {
            // Go to end of document and insert a page break
            if (!editor) return;
            const endPos = editor.state.doc.content.size;
            editor.chain().focus().setTextSelection(endPos).insertPageBreak().run();
          }}
        />
      </MenuDropdown>
    </>
  );
}
