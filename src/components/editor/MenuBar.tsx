"use client";

import type { Editor } from "@tiptap/react";

import { FileMenu } from "./menu/FileMenu";
import { EditMenu } from "./menu/EditMenu";
import { InsertMenu } from "./menu/InsertMenu";
import { ViewMenu } from "./menu/ViewMenu";
import { FormatMenu } from "./menu/FormatMenu";
import { TableMenu } from "./menu/TableMenu";
import { ToolsMenu } from "./menu/ToolsMenu";

interface MenuBarProps {
  editor: Editor | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function MenuBar({
  editor,
  isFullscreen,
  onToggleFullscreen,
}: MenuBarProps) {
  return (
    <nav className="flex h-8 shrink-0 items-center gap-0.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2">
      <FileMenu editor={editor} />
      <EditMenu editor={editor} />
      <InsertMenu editor={editor} />
      <ViewMenu
        editor={editor}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />
      <FormatMenu editor={editor} />
      <TableMenu editor={editor} />
      <ToolsMenu editor={editor} />
    </nav>
  );
}
