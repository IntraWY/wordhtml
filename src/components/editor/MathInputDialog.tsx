"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import katex from "katex";

import { Button } from "@/components/ui/Button";
import type { Editor } from "@tiptap/react";

interface MathInputDialogProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
}

export function MathInputDialog({ open, onClose, editor }: MathInputDialogProps) {
  const [latex, setLatex] = useState("");
  const [inline, setInline] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (open) {
      setLatex("");
      setInline(false);
      setPreviewHtml("");
      // Focus textarea after dialog opens
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!latex.trim()) {
      setPreviewHtml("");
      return;
    }
    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: !inline,
      });
      setPreviewHtml(html);
    } catch {
      setPreviewHtml(`<span style=\"color:var(--color-danger)\">Error rendering equation</span>`);
    }
  }, [latex, inline]);

  const handleInsert = () => {
    if (!editor || !latex.trim()) return;
    editor.chain().focus().insertMathEquation({ latex: latex.trim(), inline }).run();
    onClose();
  };

  const exampleLatex = useMemo(
    () => [
      { label: "พื้นฐาน (Basic)", value: "E = mc^2" },
      { label: "เศษส่วน (Fraction)", value: "\\frac{a}{b}" },
      { label: "ราก (Square root)", value: "\\sqrt{x^2 + y^2}" },
      { label: "สัญลักษณ์ซัมมาชัน (Sum)", value: "\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}" },
      { label: "อินทิกรัล (Integral)", value: "\\int_{a}^{b} f(x) \\, dx" },
    ],
    []
  );

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed left-1/2 top-1/2 z-50 w-[560px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-lg"
        >
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <Dialog.Title id={titleId} className="text-base font-semibold tracking-tight">
              สมการ (Equation)
            </Dialog.Title>
            <Dialog.Description id={descId} className="sr-only">
              ใส่สมการคณิตศาสตร์ด้วย LaTeX แล้วแทรกลงในเอกสาร
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="ปิด"
                className="rounded-md p-1 text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
              >
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </header>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                โหมด (Mode)
              </span>
              <div className="flex rounded-md border border-[color:var(--color-border)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setInline(false)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    !inline
                      ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                      : "bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                  }`}
                >
                  แยกบรรทัด (Block)
                </button>
                <button
                  type="button"
                  onClick={() => setInline(true)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    inline
                      ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
                      : "bg-[color:var(--color-background)] text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]"
                  }`}
                >
                  แทรกในบรรทัด (Inline)
                </button>
              </div>
            </div>

            {/* LaTeX input */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                LaTeX
              </span>
              <textarea
                ref={textareaRef}
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleInsert();
                  }
                }}
                rows={4}
                placeholder="พิมพ์สมการ LaTeX ที่นี่..."
                className="w-full resize-none rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] font-mono"
                spellCheck={false}
              />
            </label>

            {/* Quick examples */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] text-[color:var(--color-muted-foreground)] self-center">
                ตัวอย่าง:
              </span>
              {exampleLatex.map((ex) => (
                <button
                  key={ex.value}
                  type="button"
                  onClick={() => setLatex(ex.value)}
                  className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/50 px-2 py-0.5 text-[11px] text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)]"
                  title={ex.value}
                >
                  {ex.label}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]/40 p-3">
              <div className="mb-2 text-xs font-semibold tracking-wider uppercase text-[color:var(--color-muted-foreground)]">
                ตัวอย่าง (Preview)
              </div>
              <div
                className="min-h-[48px] rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] p-3 text-[color:var(--color-foreground)]"
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{
                  __html: previewHtml || '<span class="text-[color:var(--color-muted-foreground)] text-sm">พิมพ์ LaTeX เพื่อดูตัวอย่าง...</span>',
                }}
              />
            </div>
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button size="sm" onClick={handleInsert} disabled={!latex.trim()}>
              แทรก (Insert)
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
