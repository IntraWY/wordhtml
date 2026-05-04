"use client";

import { memo, useRef } from "react";

import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";
import { assignHeadingIds, buildTocHtml, generateToc } from "@/lib/toc";
import { useEditorStore } from "@/store/editorStore";
import { useDialogStore } from "@/store/dialogStore";
import { compressImageIfEnabled, readFileAsDataURL } from "@/lib/imageCompression";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

function InsertMenuInner({ editor }: EditorMenuProps) {
  const hasEditor = editor !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertImageFromFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      useDialogStore.getState().openAlert(
        "รูปภาพ (Image)",
        "กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, GIF, WebP, SVG)"
      );
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      useDialogStore.getState().openAlert(
        "รูปภาพ (Image)",
        "ไฟล์รูปภาพใหญ่เกิน 10MB"
      );
      return;
    }
    try {
      const autoCompress = useEditorStore.getState().autoCompressImages;
      const finalFile = await compressImageIfEnabled(file, autoCompress);
      const src = await readFileAsDataURL(finalFile);
      if (editor) {
        useDialogStore.getState().openPrompt(
          "คำอธิบายรูปภาพ (Alt text)",
          "ใส่คำอธิบายสำหรับรูปภาพ:",
          "รูปภาพ (Image)",
          (alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
          }
        );
      }
    } catch {
      useDialogStore.getState().openAlert(
        "รูปภาพ (Image)",
        "ไม่สามารถอ่านไฟล์ได้"
      );
    }
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
            useDialogStore.getState().openPrompt(
              "ลิงก์ (Link)",
              "ใส่ URL ของลิงก์:",
              "https://",
              (url) => {
                if (!url) return;
                editor?.chain().focus().setLink({ href: url }).run();
              }
            );
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
            useDialogStore.getState().openPrompt(
              "รูปภาพจาก URL (Image URL)",
              "ใส่ URL ของรูปภาพ:",
              "",
              (src) => {
                if (!src) return;
                useDialogStore.getState().openPrompt(
                  "คำอธิบายรูปภาพ (Alt text)",
                  "ใส่คำอธิบายสำหรับรูปภาพ:",
                  "รูปภาพ (Image)",
                  (alt) => {
                    editor?.chain().focus().setImage({ src, alt }).run();
                  }
                );
              }
            );
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
          label="สารบัญ (Table of Contents)"
          disabled={!hasEditor}
          onClick={() => {
            if (!editor) return;
            assignHeadingIds(editor);
            const tocItems = generateToc(editor.getHTML());
            if (tocItems.length === 0) {
              useDialogStore.getState().openAlert(
                "สารบัญ (Table of Contents)",
                "ไม่พบหัวข้อในเอกสาร"
              );
              return;
            }
            const tocHtml = buildTocHtml(tocItems);
            editor.chain().focus().insertContent(tocHtml).run();
          }}
        />
        <Sep />
        <MenuItem
          label="แทรกตัวแบ่งหน้า (Page Break)"
          shortcut="Ctrl+Enter / Cmd+Enter"
          disabled={!hasEditor || !editor?.can().insertPageBreak()}
          onClick={() => editor?.chain().focus().insertPageBreak().run()}
        />
        <MenuItem
          label="เพิ่มหน้าใหม่ (Add Page)"
          disabled={!hasEditor || !editor?.can().insertPageBreak()}
          onClick={() => {
            if (!editor) return;
            const doc = editor.state.doc;
            const lastNode = doc.lastChild;
            // If document already ends with a page break, insert a paragraph first
            // so the user has somewhere to type
            if (lastNode?.type.name === "pageBreak") {
              const endPos = doc.content.size;
              editor.chain().focus().setTextSelection(endPos).insertContent({ type: "paragraph" }).insertPageBreak().run();
            } else {
              const endPos = doc.content.size;
              editor.chain().focus().setTextSelection(endPos).insertPageBreak().run();
            }
          }}
        />
      </MenuDropdown>
    </>
  );
}

export const InsertMenu = memo(InsertMenuInner);
