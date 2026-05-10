"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useUiStore } from "@/store/uiStore";

interface ParagraphContextMenuProps {
  editor: Editor | null;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface MenuItem {
  id: string;
  label: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

export function ParagraphContextMenu({ editor, containerRef }: ParagraphContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const openParagraph = useUiStore((s) => s.openParagraph);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const container = containerRef?.current;
      if (!container) return;

      const target = event.target as Node;
      if (!container.contains(target)) return;

      event.preventDefault();
      setPosition({ x: event.clientX, y: event.clientY });
      setOpen(true);
    },
    [containerRef]
  );

  useEffect(() => {
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [handleContextMenu]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const getCurrentMarginLeft = useCallback((): number => {
    if (!editor) return 0;
    const attrs = editor.getAttributes("paragraph");
    return (attrs.marginLeft as number) ?? 0;
  }, [editor]);

  const menuItems: MenuItem[] = [
    {
      id: "paragraph-dialog",
      label: "ย่อหน้า… (Paragraph…)",
      action: () => {
        openParagraph();
        setOpen(false);
      },
      disabled: !editor,
    },
    { id: "divider-1", label: "", divider: true },
    {
      id: "single-spacing",
      label: "Single spacing",
      action: () => {
        editor?.chain().focus().setParagraphFormat({ lineHeightMode: "single" }).run();
        setOpen(false);
      },
      disabled: !editor,
    },
    {
      id: "one-half-spacing",
      label: "1.5 spacing",
      action: () => {
        editor?.chain().focus().setParagraphFormat({ lineHeightMode: "oneHalf" }).run();
        setOpen(false);
      },
      disabled: !editor,
    },
    {
      id: "double-spacing",
      label: "Double spacing",
      action: () => {
        editor?.chain().focus().setParagraphFormat({ lineHeightMode: "double" }).run();
        setOpen(false);
      },
      disabled: !editor,
    },
    { id: "divider-2", label: "", divider: true },
    {
      id: "increase-indent",
      label: "เพิ่มเยื้อง (Increase indent)",
      action: () => {
        const current = getCurrentMarginLeft();
        editor?.chain().focus().setParagraphFormat({ marginLeft: current + 0.5 }).run();
        setOpen(false);
      },
      disabled: !editor,
    },
    {
      id: "decrease-indent",
      label: "ลดเยื้อง (Decrease indent)",
      action: () => {
        const current = getCurrentMarginLeft();
        const next = Math.max(0, current - 0.5);
        editor?.chain().focus().setParagraphFormat({ marginLeft: next }).run();
        setOpen(false);
      },
      disabled: !editor || getCurrentMarginLeft() <= 0,
    },
  ];

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] w-[200px] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] py-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {menuItems.map((item) =>
        item.divider ? (
          <div
            key={item.id}
            className="my-1 h-px bg-[color:var(--color-border)]"
            role="separator"
          />
        ) : (
          <button
            key={item.id}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={item.action}
            className="w-full px-3 py-1.5 text-left text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
