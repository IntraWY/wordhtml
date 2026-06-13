"use client";

import {
  FileCode2,
  FileArchive,
  FileText,
  FileType2,
  FileDown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { ExportFormat } from "@/types";

interface ExportFormatButtonsProps {
  selectedFormat: ExportFormat;
  busy: ExportFormat | null;
  disabled: boolean;
  primaryBtnRef: React.RefObject<HTMLButtonElement | null>;
  onExport: (kind: ExportFormat) => void;
}

/**
 * Row of per-format download buttons (docx / zip / html / md / pdf).
 * Behaviour-identical extraction from `ExportDialog`. The parent owns busy /
 * format state and the export handler — this is pure presentation.
 */
export function ExportFormatButtons({
  selectedFormat,
  busy,
  disabled,
  primaryBtnRef,
  onExport,
}: ExportFormatButtonsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant={selectedFormat === "docx" ? "primary" : "secondary"}
        onClick={() => onExport("docx")}
        disabled={disabled}
        aria-busy={busy === "docx"}
        aria-label={busy === "docx" ? "กำลังดาวน์โหลด .docx" : "ดาวน์โหลด .docx"}
      >
        {busy === "docx" ? (
          <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .docx" />
        ) : (
          <FileText />
        )}
        ดาวน์โหลด .docx
      </Button>
      <Button
        variant={selectedFormat === "zip" ? "primary" : "secondary"}
        onClick={() => onExport("zip")}
        disabled={disabled}
        aria-busy={busy === "zip"}
        aria-label={busy === "zip" ? "กำลังดาวน์โหลด .zip" : "ดาวน์โหลด .zip"}
      >
        {busy === "zip" ? (
          <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .zip" />
        ) : (
          <FileArchive />
        )}
        ดาวน์โหลด .zip
      </Button>
      <Button
        ref={primaryBtnRef}
        variant={selectedFormat === "html" ? "primary" : "secondary"}
        onClick={() => onExport("html")}
        disabled={disabled}
        aria-busy={busy === "html"}
        aria-label={busy === "html" ? "กำลังดาวน์โหลด .html" : "ดาวน์โหลด .html"}
      >
        {busy === "html" ? (
          <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .html" />
        ) : (
          <FileCode2 />
        )}
        ดาวน์โหลด .html
      </Button>
      <Button
        variant={selectedFormat === "md" ? "primary" : "secondary"}
        onClick={() => onExport("md")}
        disabled={disabled}
        aria-busy={busy === "md"}
        aria-label={busy === "md" ? "กำลังดาวน์โหลด .md" : "ดาวน์โหลด .md"}
      >
        {busy === "md" ? (
          <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .md" />
        ) : (
          <FileType2 />
        )}
        ดาวน์โหลด .md
      </Button>
      <Button
        variant={selectedFormat === "pdf" ? "primary" : "secondary"}
        onClick={() => onExport("pdf")}
        disabled={disabled}
        aria-busy={busy === "pdf"}
        aria-label={busy === "pdf" ? "กำลังดาวน์โหลด .pdf" : "ดาวน์โหลด .pdf"}
      >
        {busy === "pdf" ? (
          <Loader2 className="animate-spin" role="progressbar" aria-valuetext="กำลังดาวน์โหลด .pdf" />
        ) : (
          <FileDown />
        )}
        ดาวน์โหลด .pdf
      </Button>
    </div>
  );
}
