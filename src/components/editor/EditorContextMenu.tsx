"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useUiStore } from "@/store/uiStore";
import { useToastStore } from "@/store/toastStore";
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
  ArrowDown,
  Square,
  SquareDashed,
  Repeat,
  Image as ImageIcon,
  Layers,
  SquareStack,
} from "lucide-react";
import { editorCan } from "@/lib/editorLive";
import {
  attrsForLayoutMode,
  type ImageLayoutMode,
} from "@/lib/imageLayout";
import {
  setSelectedCellBorders,
  selectionHasCell,
} from "@/lib/tiptap/tableCellBorder";
import { isRepeatRow, toggleRepeatRow } from "@/lib/tiptap/repeatingRow";

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
        id: "hide-cell-borders",
        label: "ซ่อนเส้นขอบเซลล์ (Hide cell borders)",
        icon: <SquareDashed className="size-4" />,
        action: () => {
          if (editor) setSelectedCellBorders(editor, "none");
          setOpen(false);
        },
        disabled: !editor || !selectionHasCell(editor),
      },
      {
        id: "show-cell-borders",
        label: "แสดงเส้นขอบเซลล์ (Show cell borders)",
        icon: <Square className="size-4" />,
        action: () => {
          if (editor) setSelectedCellBorders(editor, "all");
          setOpen(false);
        },
        disabled: !editor || !selectionHasCell(editor),
      },
      {
        id: "toggle-repeat-row",
        label: editor && isRepeatRow(editor)
          ? "✓ แถวซ้ำตามรายการ (Repeat row)"
          : "แถวซ้ำตามรายการ (Repeat row)",
        icon: <Repeat className="size-4" />,
        action: () => {
          if (editor) {
            const nowOn = !isRepeatRow(editor);
            toggleRepeatRow(editor);
            useToastStore
              .getState()
              .show(
                nowOn
                  ? "แถวนี้จะซ้ำตามตัวแปรชนิดรายการ (List) ตอนส่งออก"
                  : "ยกเลิกแถวซ้ำแล้ว",
                "success"
              );
          }
          setOpen(false);
        },
      },
      { id: "div-table-4", label: "", divider: true },
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
    const applyImageLayout = (mode: ImageLayoutMode) => {
      let patch: Record<string, unknown> = { ...attrsForLayoutMode(mode) };
      // Seed a sensible free-float start position from the image's current spot
      // so switching to front/behind doesn't snap it to the page's top-left.
      if (mode === "front" || mode === "behind") {
        const from = editor?.state.selection.from;
        const dom =
          typeof from === "number" ? editor?.view.nodeDOM(from) : null;
        if (dom instanceof HTMLElement) {
          const img =
            dom.tagName === "IMG"
              ? (dom as HTMLImageElement)
              : dom.querySelector("img");
          const page = dom.closest(".page-node");
          if (img && page) {
            const ir = img.getBoundingClientRect();
            const pr = page.getBoundingClientRect();
            patch = {
              ...patch,
              posX: Math.max(0, Math.round(ir.left - pr.left)),
              posY: Math.max(0, Math.round(ir.top - pr.top)),
            };
          }
        }
      }
      editor?.chain().focus().updateAttributes("image", patch).run();
      setOpen(false);
    };
    const imageLayoutItems: MenuItem[] = [
      {
        id: "img-block",
        label: "เต็มความกว้าง (Block)",
        icon: <ImageIcon className="size-4" />,
        action: () => applyImageLayout("block"),
      },
      {
        id: "img-wrap-left",
        label: "ล้อมซ้าย (Wrap left)",
        icon: <AlignLeft className="size-4" />,
        action: () => applyImageLayout("wrapLeft"),
      },
      {
        id: "img-wrap-right",
        label: "ล้อมขวา (Wrap right)",
        icon: <AlignRight className="size-4" />,
        action: () => applyImageLayout("wrapRight"),
      },
      {
        id: "img-center",
        label: "กึ่งกลาง บน-ล่าง (Top & bottom)",
        icon: <AlignCenter className="size-4" />,
        action: () => applyImageLayout("center"),
      },
      {
        id: "img-front",
        label: "หน้าข้อความ (In front)",
        icon: <Layers className="size-4" />,
        action: () => applyImageLayout("front"),
      },
      {
        id: "img-behind",
        label: "หลังข้อความ (Behind text)",
        icon: <SquareStack className="size-4" />,
        action: () => applyImageLayout("behind"),
      },
    ];
    menuItems.push(
      ...imageLayoutItems,
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
