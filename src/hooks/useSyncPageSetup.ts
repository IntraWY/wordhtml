"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

import type { PageSetup } from "@/types";
import { isLiveEditor } from "@/lib/editorLive";

/**
 * Sync global `pageSetup` (ruler, ribbon, dialogs) into every page-node in
 * the editor. Behaviour-identical extraction of the effect formerly inline
 * in `EditorShell`.
 */
export function useSyncPageSetup(editor: Editor | null, pageSetup: PageSetup) {
  useEffect(() => {
    if (!isLiveEditor(editor)) return;
    editor.commands.setDocumentPageSetup({
      size: pageSetup.size,
      orientation: pageSetup.orientation,
      marginMm: pageSetup.marginMm,
      // Always forward watermark (even undefined) so clearing it propagates.
      watermark: pageSetup.watermark,
      firstPageMarginMm: pageSetup.firstPageMarginMm,
      ...(pageSetup.headerFooter ? { headerFooter: pageSetup.headerFooter } : {}),
    });
  }, [editor, pageSetup]);
}
