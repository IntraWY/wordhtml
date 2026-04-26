"use client";

import { useRef } from "react";
import { Upload, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { useEditorStore } from "@/store/editorStore";

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

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isLoadingFile}
        aria-label="อัปโหลดไฟล์ .docx หรือ .html"
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
        accept=".docx,.html,.htm"
        className="hidden"
        onChange={handleChange}
      />
    </>
  );
}
