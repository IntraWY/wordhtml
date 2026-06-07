"use client";

import { useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Link2 } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";
import { isLiveEditor } from "@/lib/editorLive";
import { assignHeadingIds } from "@/lib/toc";
import {
  listCrossRefTargets,
  buildCrossRefHtml,
  defaultCrossRefLabel,
} from "@/lib/crossref";

/**
 * Cross-reference picker (B7): lists document headings and inserts an internal
 * link (`<a href="#id">ดูหัวข้อ "…"</a>`) to the chosen heading at the cursor.
 * Heading ids are (re)assigned first so the slug matches the link target.
 */
export function CrossRefDialog({ editor }: { editor: Editor | null }) {
  const open = useUiStore((s) => s.crossRefOpen);
  const close = useUiStore((s) => s.closeCrossRef);

  const targets = useMemo(() => {
    if (!open || !isLiveEditor(editor)) return [];
    assignHeadingIds(editor);
    return listCrossRefTargets(editor.getHTML());
  }, [open, editor]);

  const insertRef = (index: number) => {
    if (!isLiveEditor(editor)) return;
    const target = targets[index];
    if (!target) return;
    editor
      .chain()
      .focus()
      .insertContent(buildCrossRefHtml(target.id, defaultCrossRefLabel(target)))
      .run();
    close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-xl">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              <Link2 className="size-5" />
              <Dialog.Title className="text-base font-semibold">
                อ้างอิงข้าม (Cross-reference)
              </Dialog.Title>
            </div>
            <Dialog.Description className="sr-only">
              เลือกหัวข้อเพื่อแทรกลิงก์อ้างอิงภายในเอกสาร
            </Dialog.Description>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="overflow-y-auto p-3">
            {targets.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
                ไม่พบหัวข้อในเอกสาร — เพิ่มหัวเรื่อง (Heading) ก่อนจึงจะอ้างอิงได้
              </p>
            ) : (
              <ul className="space-y-1">
                {targets.map((t, i) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => insertRef(i)}
                      className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[color:var(--color-muted)]"
                      style={{ paddingLeft: `${(t.level - 1) * 14 + 12}px` }}
                    >
                      {t.text || "(หัวข้อว่าง)"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-[color:var(--color-border)] px-5 py-3">
            <Button variant="secondary" size="sm" onClick={close}>
              ปิด
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
