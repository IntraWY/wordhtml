"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useUiStore } from "@/store/uiStore";
import {
  Trash2,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Settings,
  FileText,
  Merge,
  Split,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import { editorCan } from "@/lib/editorLive";

interface EditorContextMenuProps {
  editor: Editor | null;
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface MenuItem {
  id: string;
  label: string;
  action?: () => void;
  disabled?: boolean;
  divider?: boolean;
  icon?: React.ReactNode;
}

export function EditorContextMenu({ editor, containerRef }: EditorContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const openParagraph = useUiStore((s) => s.openParagraph);

  const handleContextMenu = useCallback(
    (event: MouseEvent) => {
      const container = containerRef?.current;
      if (!container) return;

      const target = event.target as Node;
      if (!container.contains(target)) return;

      event.preventDefault();

      // Adjust position if menu would go off-screen
      const x = event.clientX;
      const y = event.clientY;
      const menuWidth = 240;
      const menuHeight = 400; // estimated max height

      const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
      const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

      setPosition({ x: adjustedX, y: adjustedY });
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
    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef?.current;
      if (!container) return;
      if (event.key === "Shift" || event.key === "F10") {
        if (event.shiftKey && event.key === "F10") {
          event.preventDefault();
          const selection = window.getSelection();
          let rect: DOMRect | undefined;
          if (selection && selection.rangeCount > 0) {
            rect = selection.getRangeAt(0).getBoundingClientRect();
          }
          const x = rect ? rect.left : container.getBoundingClientRect().left;
          const y = rect ? rect.bottom : container.getBoundingClientRect().top;
          const menuWidth = 240;
          const menuHeight = 400;
          const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
          const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
          setPosition({ x: adjustedX, y: adjustedY });
          setOpen(true);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [containerRef]);

  useEffect(() => {
    if (!open) return;

    // Move focus to first menu item
    const firstItem = itemRefs.current.find(Boolean);
    firstItem?.focus();

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };

    const handleArrowNav = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      const enabled = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
      if (enabled.length === 0) return;
      const currentIndex = enabled.findIndex((el) => el === document.activeElement);
      let nextIndex: number;
      if (event.key === "ArrowDown") {
        nextIndex = currentIndex < enabled.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : enabled.length - 1;
      }
      enabled[nextIndex]?.focus();
    };

    const menuNode = menuRef.current;
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    menuNode?.addEventListener("keydown", handleArrowNav);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      menuNode?.removeEventListener("keydown", handleArrowNav);
    };
  }, [open]);

  const getCurrentMarginLeft = useCallback((): number => {
    if (!editor) return 0;
    const attrs = editor.getAttributes("paragraph");
    return (attrs.marginLeft as number) ?? 0;
  }, [editor]);

  const isTable = editor?.isActive("table");
  const isImage = editor?.isActive("image");

  const menuItems: MenuItem[] = [];

  if (isTable) {
    menuItems.push(
      {
        id: "add-row-before",
        label: "เพิ่มแถวด้านบน (Insert row above)",
        icon: <ArrowUp className="size-4" />,
        action: () => {
          editor?.chain().focus().addRowBefore().run();
          setOpen(false);
        },
      },
      {
        id: "add-row-after",
        label: "เพิ่มแถวด้านล่าง (Insert row below)",
        icon: <ArrowDown className="size-4" />,
        action: () => {
          editor?.chain().focus().addRowAfter().run();
          setOpen(false);
        },
      },
      {
        id: "delete-row",
        label: "ลบแถว (Delete row)",
        icon: <Minus className="size-4" />,
        action: () => {
          editor?.chain().focus().deleteRow().run();
          setOpen(false);
        },
      },
      { id: "div-table-1", label: "", divider: true },
      {
        id: "add-col-before",
        label: "เพิ่มคอลัมน์ด้านซ้าย (Insert column before)",
        icon: <ChevronLeft className="size-4" />,
        action: () => {
          editor?.chain().focus().addColumnBefore().run();
          setOpen(false);
        },
      },
      {
        id: "add-col-after",
        label: "เพิ่มคอลัมน์ด้านขวา (Insert column after)",
        icon: <ChevronRight className="size-4" />,
        action: () => {
          editor?.chain().focus().addColumnAfter().run();
          setOpen(false);
        },
      },
      {
        id: "delete-col",
        label: "ลบคอลัมน์ (Delete column)",
        icon: <Minus className="size-4 rotate-90" />,
        action: () => {
          editor?.chain().focus().deleteColumn().run();
          setOpen(false);
        },
      },
      { id: "div-table-2", label: "", divider: true },
      {
        id: "merge-cells",
        label: "ผสานเซลล์ (Merge cells)",
        icon: <Merge className="size-4" />,
        action: () => {
          editor?.chain().focus().mergeCells().run();
          setOpen(false);
        },
        disabled: !editorCan(editor, (c) => c.mergeCells()),
      },
      {
        id: "split-cell",
        label: "แยกเซลล์ (Split cell)",
        icon: <Split className="size-4" />,
        action: () => {
          editor?.chain().focus().splitCell().run();
          setOpen(false);
        },
        disabled: !editorCan(editor, (c) => c.splitCell()),
      },
      { id: "div-table-3", label: "", divider: true },
      {
        id: "delete-table",
        label: "ลบตาราง (Delete table)",
        icon: <Trash2 className="size-4" />,
        action: () => {
          editor?.chain().focus().deleteTable().run();
          setOpen(false);
        },
      }
    );
  } else if (isImage) {
    menuItems.push(
      {
        id: "align-left",
        label: "ชิดซ้าย (Align left)",
        icon: <AlignLeft className="size-4" />,
        action: () => {
          editor?.chain().focus().updateAttributes("image", { align: "left" }).run();
          setOpen(false);
        },
      },
      {
        id: "align-center",
        label: "กึ่งกลาง (Align center)",
        icon: <AlignCenter className="size-4" />,
        action: () => {
          editor?.chain().focus().updateAttributes("image", { align: "center" }).run();
          setOpen(false);
        },
      },
      {
        id: "align-right",
        label: "ชิดขวา (Align right)",
        icon: <AlignRight className="size-4" />,
        action: () => {
          editor?.chain().focus().updateAttributes("image", { align: "right" }).run();
          setOpen(false);
        },
      },
      { id: "div-image-1", label: "", divider: true },
      {
        id: "delete-image",
        label: "ลบรูปภาพ (Delete image)",
        icon: <Trash2 className="size-4" />,
        action: () => {
          editor?.chain().focus().deleteSelection().run();
          setOpen(false);
        },
      }
    );
  } else {
    menuItems.push(
      {
        id: "paragraph-dialog",
        label: "ย่อหน้า… (Paragraph…)",
        icon: <Settings className="size-4" />,
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
        icon: <FileText className="size-4" />,
        action: () => {
          editor?.chain().focus().setParagraphFormat({ lineHeightMode: "single" }).run();
          setOpen(false);
        },
        disabled: !editor,
      },
      {
        id: "one-half-spacing",
        label: "1.5 spacing",
        icon: <FileText className="size-4" />,
        action: () => {
          editor?.chain().focus().setParagraphFormat({ lineHeightMode: "oneHalf" }).run();
          setOpen(false);
        },
        disabled: !editor,
      },
      {
        id: "double-spacing",
        label: "Double spacing",
        icon: <FileText className="size-4" />,
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
        icon: <ChevronRight className="size-4" />,
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
        icon: <ChevronLeft className="size-4" />,
        action: () => {
          const current = getCurrentMarginLeft();
          const next = Math.max(0, current - 0.5);
          editor?.chain().focus().setParagraphFormat({ marginLeft: next }).run();
          setOpen(false);
        },
        disabled: !editor || getCurrentMarginLeft() <= 0,
      }
    );
  }

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] w-[240px] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] py-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {menuItems.map((item, index) =>
        item.divider ? (
          <div
            key={item.id}
            className="my-1 h-px bg-[color:var(--color-border)]"
            role="separator"
          />
        ) : (
          <button
            key={item.id}
            ref={(el) => { itemRefs.current[index] = el; }}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={item.action}
            className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm text-[color:var(--color-foreground)] transition-colors hover:bg-[color:var(--color-muted)] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:bg-[color:var(--color-muted)]"
          >
            <span className="shrink-0 text-[color:var(--color-muted-foreground)]">
              {item.icon}
            </span>
            <span className="flex-1 truncate">{item.label}</span>
          </button>
        )
      )}
    </div>
  );
}
