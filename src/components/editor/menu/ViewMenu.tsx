"use client";

import { memo } from "react";
import { useUiStore } from "@/store/uiStore";
import { MenuDropdown, MenuItem } from "./primitives";
import type { EditorMenuProps } from "./FileMenu";

function ViewMenuInner(_props: EditorMenuProps) {
  void _props;
  const sourceOpen = useUiStore((s) => s.sourceOpen);
  const toggleSource = useUiStore((s) => s.toggleSource);
  const isFullscreen = useUiStore((s) => s.fullscreen);
  const toggleFullscreen = useUiStore((s) => s.toggleFullscreen);

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
    </MenuDropdown>
  );
}

export const ViewMenu = memo(ViewMenuInner);
