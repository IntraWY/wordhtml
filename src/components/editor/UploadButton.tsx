"use client";

import { useEffect, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";
import { addEventListener, removeEventListener, EVENT_NAMES } from "@/lib/events";

export function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const loadFile = useEditorStore((s) => s.loadFile);
  const isLoadingFile = useEditorStore((s) => s.isLoadingFile);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await loadFile(file);
    event.target.value = "";
  };

  // Allow other components (e.g. the File menu) to trigger the file picker
  // via a custom DOM event so we keep a single hidden file input.
  useEffect(() => {
    const handler = () => {
      inputRef.current?.click();
    };
    addEventListener(EVENT_NAMES.openFile, handler);
    return () => {
      removeEventListener(EVENT_NAMES.openFile, handler);
    };
  }, []);

  return (
    <>
      <Button
        data-tour="upload"
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoadingFile}
        aria-label="อัปโหลดไฟล์ .docx, .html, หรือ .md"
      >
        {isLoadingFile ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Upload />
        )}
        อัปโหลด
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".docx,.html,.htm,.md"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
