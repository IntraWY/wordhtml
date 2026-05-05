"use client";

import { memo } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

function ViewMenuInner(_props: EditorMenuProps) {
  void _props;
  const sourceOpen = useUiStore((s) => s.sourceOpen);
  const toggleSource = useUiStore((s) => s.toggleSource);
  const isFullscreen = useUiStore((s) => s.fullscreen);
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen);

  const spellcheckEnabled = useEditorStore((s) => s.spellcheckEnabled);
  const toggleSpellcheck = useEditorStore((s) => s.toggleSpellcheck);

  return (
    <MenuDropdown label="มุมมอง (View)">
      <MenuItem
        label="ซอร์ส HTML"
        checked={sourceOpen}
        onClick={toggleSource}
      />
      <MenuItem
        label="เต็มหน้าจอ (Fullscreen)"
        shortcut="F11"
        checked={isFullscreen}
        onClick={toggleFullscreen}
      />
      <Sep />
      <MenuItem
        label="ตรวจสอบการสะกด (Spellcheck)"
        checked={spellcheckEnabled}
        onClick={toggleSpellcheck}
      />
    </MenuDropdown>
  );
}

export const ViewMenu = memo(ViewMenuInner);
