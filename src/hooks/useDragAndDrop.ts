"use client";

import { useCallback } from "react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { useToastStore } from "@/store/toastStore";
import { compressImageIfEnabled, readFileAsDataURL } from "@/lib/imageCompression";

export function useDragAndDrop(
  editor: Editor | null,
  setIsDragging: (v: boolean) => void
) {
  const loadFile = useEditorStore((s) => s.loadFile);

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes("Files")) {
        e.preventDefault();
        setIsDragging(true);
      }
    },
    [setIsDragging]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
    },
    [setIsDragging]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      const images = files.filter((f) => f.type.startsWith("image/"));
      const others = files.filter((f) => !f.type.startsWith("image/"));

      if (images.length > 0 && editor) {
        const autoCompress = useEditorStore.getState().autoCompressImages;
        let inserted = 0;
        for (const file of images) {
          try {
            const finalFile = await compressImageIfEnabled(file, autoCompress);
            const src = await readFileAsDataURL(finalFile);
            editor.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
            inserted++;
          } catch {
            try {
              const src = await readFileAsDataURL(file);
              editor.chain().focus().setImage({ src, alt: "รูปภาพ (Image)" }).run();
              inserted++;
            } catch {
              useToastStore.getState().show(`ไม่สามารถแทรกรูป ${file.name}`, "error");
            }
          }
        }
        if (inserted > 0) {
          useToastStore.getState().show(`แทรกรูปภาพ ${inserted} รายการแล้ว`, "success");
        }
      }

      if (others.length > 0) {
        const file = others[0];
        try {
          await loadFile(file);
          useToastStore.getState().show(`โหลดไฟล์ ${file.name} แล้ว`, "success");
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : "ไม่สามารถโหลดไฟล์ได้";
          useToastStore.getState().show(`โหลดไฟล์ ${file.name} ล้มเหลว: ${message}`, "error");
        }
      }
    },
    [editor, loadFile, setIsDragging]
  );

  return { onDragOver, onDragLeave, onDrop };
}
