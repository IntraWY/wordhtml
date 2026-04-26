"use client";

import { useEditorStore } from "@/store/editorStore";
import { countWords } from "@/lib/text";
import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

export function ToolsMenu(_props: EditorMenuProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const hasDoc = documentHtml.trim().length > 0;

  return (
    <MenuDropdown label="เครื่องมือ (Tools)">
      <MenuItem
        label="นับคำ (Word Count)"
        disabled={!hasDoc}
        onClick={() => {
          const count = countWords(documentHtml);
          window.alert(`จำนวนคำ: ${count.toLocaleString()} คำ`);
        }}
      />
      <Sep />
      <MenuItem
        label="ค้นหา/แทนที่ (Find & Replace)"
        shortcut="Ctrl+F"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wordhtml:open-search"));
          }
        }}
      />
      <MenuItem
        label="ตั้งค่าหน้ากระดาษ (Page Setup)…"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wordhtml:open-page-setup"));
          }
        }}
      />
      <Sep />
      <MenuItem
        label="ตัวเลือกการทำความสะอาด…"
        onClick={() => {
          document
            .querySelector<HTMLElement>("[data-cleaning-toolbar]")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </MenuDropdown>
  );
}
