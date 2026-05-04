"use client";

import { useUiStore } from "@/store/uiStore";
import { ExportDialog } from "./ExportDialog";
import { BatchUploadDialog } from "./BatchUploadDialog";
import { TemplatePanel } from "./TemplatePanel";
import { Toast } from "./Toast";
import { SearchPanel } from "./SearchPanel";
import { PageSetupDialog } from "./PageSetupDialog";
import { HeaderFooterDialog } from "./HeaderFooterDialog";
import { ShortcutsPanel } from "./ShortcutsPanel";
import { TableOfContentsPanel } from "./TableOfContentsPanel";
import { DialogSystem } from "./DialogSystem";
import { MobileBlock } from "@/components/MobileBlock";
import type { Editor } from "@tiptap/react";

interface DialogManagerProps {
  editor: Editor | null;
}

export function DialogManager({ editor }: DialogManagerProps) {
  const searchOpen = useUiStore((s) => s.searchOpen);
  const closeSearch = useUiStore((s) => s.closeSearch);
  const pageSetupOpen = useUiStore((s) => s.pageSetupOpen);
  const closePageSetup = useUiStore((s) => s.closePageSetup);
  const shortcutsOpen = useUiStore((s) => s.shortcutsOpen);
  const closeShortcuts = useUiStore((s) => s.closeShortcuts);
  const tocOpen = useUiStore((s) => s.tocOpen);
  const closeToc = useUiStore((s) => s.closeToc);
  const headerFooterOpen = useUiStore((s) => s.headerFooterOpen);
  const closeHeaderFooter = useUiStore((s) => s.closeHeaderFooter);

  return (
    <>
      <ExportDialog />
      <DialogSystem />
      <BatchUploadDialog />
      <TemplatePanel />
      <Toast />
      <SearchPanel editor={editor} open={searchOpen} onClose={closeSearch} />
      <PageSetupDialog open={pageSetupOpen} onClose={closePageSetup} />
      <HeaderFooterDialog open={headerFooterOpen} onClose={closeHeaderFooter} />
      <ShortcutsPanel open={shortcutsOpen} onClose={closeShortcuts} />
      <TableOfContentsPanel editor={editor} open={tocOpen} onClose={closeToc} />
      <MobileBlock />
    </>
  );
}
