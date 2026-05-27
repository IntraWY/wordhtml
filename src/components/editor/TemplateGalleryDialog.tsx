"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GALLERY_TEMPLATES } from "@/lib/templateGallery";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { clearRecoveryDraft } from "@/lib/draftRecovery";

export function TemplateGalleryDialog() {
  const open = useUiStore((s) => s.templateGalleryOpen);
  const close = useUiStore((s) => s.closeTemplateGallery);

  const applyTemplate = (id: string) => {
    const tpl = GALLERY_TEMPLATES.find((t) => t.id === id);
    if (!tpl) return;
    clearRecoveryDraft();
    useEditorStore.setState((state) => ({
      documentHtml: tpl.html,
      fileName: `${tpl.title}.html`,
      templateMode: tpl.templateMode ?? state.templateMode,
      htmlSyncRevision: state.htmlSyncRevision + 1,
    }));
    close();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(560px,92vw)] max-h-[88vh] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-xl flex flex-col">
          <header className="flex items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <LayoutTemplate className="size-5" />
              <Dialog.Title className="text-base font-semibold">
                แกลเลอรีเทมเพลต (Template gallery)
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>
          <div className="overflow-y-auto p-4 grid gap-3 sm:grid-cols-2">
            {GALLERY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => applyTemplate(tpl.id)}
                className="rounded-lg border border-[color:var(--color-border)] p-4 text-left transition-colors hover:border-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]/50"
              >
                <p className="font-medium text-sm">
                  {tpl.title}{" "}
                  <span className="text-[color:var(--color-muted-foreground)] font-normal">
                    ({tpl.titleEn})
                  </span>
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                  {tpl.description}
                </p>
              </button>
            ))}
          </div>
          <footer className="border-t border-[color:var(--color-border)] px-6 py-3 flex justify-end">
            <Button variant="secondary" size="sm" onClick={close}>
              ปิด
            </Button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
