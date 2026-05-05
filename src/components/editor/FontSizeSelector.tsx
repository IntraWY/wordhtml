"use client";

import { useCallback } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Type } from "lucide-react";

interface FontSizeSelectorProps {
  editor: Editor;
}

const PRESET_SIZES = [10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36];

export function FontSizeSelector({ editor }: FontSizeSelectorProps) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      fontSize: (e?.getAttributes("fontSize").size as number | undefined) ?? undefined,
    }),
  });

  const currentSize = state?.fontSize;

  const handleChange = useCallback(
    (size: number | null) => {
      if (size == null) {
        editor.chain().focus().unsetFontSize().run();
      } else {
        editor.chain().focus().setFontSize(size).run();
      }
    },
    [editor]
  );

  return (
    <div className="relative flex items-center">
      <Type className="absolute left-1.5 size-3 text-[color:var(--color-muted-foreground)] pointer-events-none" />
      <select
        aria-label="ขนาดตัวอักษร (Font Size)"
        value={currentSize ?? ""}
        onChange={(e) => {
          const val = e.target.value;
          handleChange(val ? Number(val) : null);
        }}
        className="h-7 appearance-none rounded-md border border-transparent bg-transparent pl-6 pr-5 text-xs text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] hover:bg-[color:var(--color-muted)] cursor-pointer"
      >
        <option value="">ค่าเริ่มต้น</option>
        {PRESET_SIZES.map((s) => (
          <option key={s} value={s}>{s} px</option>
        ))}
      </select>
      <span className="absolute right-1.5 pointer-events-none text-[color:var(--color-muted-foreground)] text-[10px]">▼</span>
    </div>
  );
}
