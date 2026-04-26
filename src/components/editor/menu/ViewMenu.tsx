"use client";

import { useEditorStore } from "@/store/editorStore";
import { MenuDropdown, MenuItem, Sep } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

interface ViewMenuProps extends EditorMenuProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ViewMenu({ isFullscreen, onToggleFullscreen }: ViewMenuProps) {
  const sourceOpen = useEditorStore((s) => s.sourceOpen);
  const previewOpen = useEditorStore((s) => s.previewOpen);
  const toggleSource = useEditorStore((s) => s.toggleSource);
  const togglePreview = useEditorStore((s) => s.togglePreview);

  return (
    <MenuDropdown label="มุมมอง (View)">
      <MenuItem
        label="ซอร์ส HTML"
        checked={sourceOpen}
        onClick={toggleSource}
      />
      <Sep />
      <MenuItem
        label="A4 Preview"
        checked={previewOpen}
        onClick={togglePreview}
      />
      <MenuItem
        label="เต็มหน้าจอ (Fullscreen)"
        shortcut="F11"
        checked={isFullscreen}
        onClick={onToggleFullscreen}
      />
    </MenuDropdown>
  );
}
