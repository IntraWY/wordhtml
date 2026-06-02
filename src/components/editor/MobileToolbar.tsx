"use client";

import { useRef, useState, useEffect } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo2,
  Redo2,
  Sparkles,
  MoreHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  Minus,
  Search,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RibbonSelect } from "./ribbon/RibbonSelect";
import { FontSizeSelector } from "./FontSizeSelector";
import { dispatchOpenSearch } from "@/lib/events";
import { FONT_OPTIONS } from "@/lib/fonts";
import { useCleanDocument } from "@/hooks/useCleanDocument";
import { editorCan } from "@/lib/editorLive";

function MobileBtn({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm transition-colors",
        active
          ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)]"
          : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
        disabled && "pointer-events-none opacity-40"
      )}
    >
      {children}
    </button>
  );
}

export function MobileToolbar({ editor }: { editor: Editor | null }) {
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const { cleanNow: handleCleanNow } = useCleanDocument();

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
      align: (e?.getAttributes("paragraph")?.textAlign as string | undefined) ?? "left",
      bulletList: e?.isActive("bulletList") ?? false,
      orderedList: e?.isActive("orderedList") ?? false,
      fontFamily: (e?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
    }),
  });

  const active = {
    bold: state?.bold ?? false,
    italic: state?.italic ?? false,
    underline: state?.underline ?? false,
    strike: state?.strike ?? false,
    align: state?.align ?? "left",
    bulletList: state?.bulletList ?? false,
    orderedList: state?.orderedList ?? false,
  };

  const currentFont = state?.fontFamily ?? "";

  /* close more dropdown on outside click or Escape */
  useEffect(() => {
    if (!showMore) return;
    const onDocClick = (e: MouseEvent) => {
      if (!moreRef.current?.contains(e.target as Node)) setShowMore(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMore(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showMore]);

  /* focus trap for more dropdown */
  useEffect(() => {
    if (!showMore) return;
    const dropdown = moreRef.current;
    if (!dropdown) return;

    const focusableSelectors =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusable = () =>
      Array.from(dropdown.querySelectorAll<HTMLElement>(focusableSelectors));

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    dropdown.addEventListener("keydown", handleTab);
    // Move focus into dropdown when opened
    const focusable = getFocusable();
    focusable[0]?.focus();

    return () => {
      dropdown.removeEventListener("keydown", handleTab);
    };
  }, [showMore]);

  const can = {
    bold: editorCan(editor, (c) => c.toggleBold()),
    italic: editorCan(editor, (c) => c.toggleItalic()),
    underline: editorCan(editor, (c) => c.toggleUnderline()),
    strike: editorCan(editor, (c) => c.toggleStrike()),
    undo: editorCan(editor, (c) => c.undo()),
    redo: editorCan(editor, (c) => c.redo()),
  };

  return (
    <div className="surface-chrome flex items-center gap-1 border-b px-2 py-1.5 shadow-sm md:hidden">
      <div className="flex flex-1 items-center gap-0.5 overflow-x-auto scrollbar-hide">
        <MobileBtn
          active={active.bold}
          disabled={!can.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="ตัวหนา (Bold)"
        >
          <Bold className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.italic}
          disabled={!can.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="ตัวเอียง (Italic)"
        >
          <Italic className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.underline}
          disabled={!can.underline}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="ขีดเส้นใต้ (Underline)"
        >
          <UnderlineIcon className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.strike}
          disabled={!can.strike}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          title="ขีดฆ่า (Strikethrough)"
        >
          <Strikethrough className="size-4" />
        </MobileBtn>

        <div className="mx-1 h-5 w-px bg-[color:var(--color-border)]" />

        <RibbonSelect
          label="ฟอนต์"
          value={currentFont}
          onChange={(val) => editor?.chain().focus().setFontFamily(val).run()}
          options={FONT_OPTIONS}
          className="h-8 text-xs"
        />
        {editor && <FontSizeSelector editor={editor} />}

        <div className="mx-1 h-5 w-px bg-[color:var(--color-border)]" />

        <MobileBtn
          active={active.align === "left"}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          title="จัดชิดซ้าย"
        >
          <AlignLeft className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.align === "center"}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          title="จัดกึ่งกลาง"
        >
          <AlignCenter className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.align === "right"}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          title="จัดชิดขวา"
        >
          <AlignRight className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.align === "justify"}
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          title="จัดเต็ม"
        >
          <AlignJustify className="size-4" />
        </MobileBtn>

        <div className="mx-1 h-5 w-px bg-[color:var(--color-border)]" />

        <MobileBtn
          active={active.bulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          title="ลูกศร"
        >
          <List className="size-4" />
        </MobileBtn>
        <MobileBtn
          active={active.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          title="ตัวเลข"
        >
          <ListOrdered className="size-4" />
        </MobileBtn>

        <div className="mx-1 h-5 w-px bg-[color:var(--color-border)]" />

        <MobileBtn
          disabled={!can.undo}
          onClick={() => editor?.chain().focus().undo().run()}
          title="เลิกทำ"
        >
          <Undo2 className="size-4" />
        </MobileBtn>
        <MobileBtn
          disabled={!can.redo}
          onClick={() => editor?.chain().focus().redo().run()}
          title="ทำซ้ำ"
        >
          <Redo2 className="size-4" />
        </MobileBtn>
      </div>

      <div className="relative" ref={moreRef}>
        <MobileBtn
          active={showMore}
          onClick={() => setShowMore((s) => !s)}
          title="เพิ่มเติม"
        >
          <MoreHorizontal className="size-4" />
        </MobileBtn>

        {showMore && (
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-2 shadow-xl">
            <div className="grid grid-cols-4 gap-1">
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().toggleHeading({ level: 1 }).run();
                  setShowMore(false);
                }}
                title="หัวข้อ 1"
              >
                <Heading1 className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().toggleHeading({ level: 2 }).run();
                  setShowMore(false);
                }}
                title="หัวข้อ 2"
              >
                <Heading2 className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().toggleHeading({ level: 3 }).run();
                  setShowMore(false);
                }}
                title="หัวข้อ 3"
              >
                <Heading3 className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().toggleBlockquote().run();
                  setShowMore(false);
                }}
                title="คำพูด"
              >
                <Quote className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().toggleCodeBlock().run();
                  setShowMore(false);
                }}
                title="โค้ดบล็อก"
              >
                <Code className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  editor?.chain().focus().setHorizontalRule().run();
                  setShowMore(false);
                }}
                title="เส้นคั่น"
              >
                <Minus className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  dispatchOpenSearch();
                  setShowMore(false);
                }}
                title="ค้นหา"
              >
                <Search className="size-4" />
              </MobileBtn>
              <MobileBtn
                onClick={() => {
                  const url = window.prompt("ใส่ลิงก์ (URL):");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                  setShowMore(false);
                }}
                title="ลิงก์"
              >
                <LinkIcon className="size-4" />
              </MobileBtn>
            </div>
            <div className="mt-2 border-t border-[color:var(--color-border)] pt-2">
              <button
                type="button"
                onClick={() => {
                  handleCleanNow();
                  setShowMore(false);
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-accent-foreground)] transition-colors hover:bg-[color:var(--color-accent-hover)]"
              >
                <Sparkles className="size-3.5" />
                ล้างตอนนี้
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

