"use client";

import { useEditorStore } from "@/store/editorStore";
import { MenuDropdown, MenuItem } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

interface ViewMenuProps extends EditorMenuProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ViewMenu({ isFullscreen, onToggleFullscreen }: ViewMenuProps) {
  const sourceOpen = useEditorStore((s) => s.sourceOpen);
  const toggleSource = useEditorStore((s) => s.toggleSource);

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
        onClick={onToggleFullscreen}
      />
    </MenuDropdown>
  );
}
