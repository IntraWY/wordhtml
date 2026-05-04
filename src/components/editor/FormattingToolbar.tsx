"use client";

import { memo, useCallback, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Eraser,
  Minus,
  Code,
  Code2,
  Indent,
  Outdent,
  Palette,
  Highlighter,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Split,
} from "lucide-react";

import { TemplateModeToggle } from "./TemplateModeToggle";

import { cn } from "@/lib/utils";
import { useToastStore } from "@/store/toastStore";

interface FormattingToolbarProps {
  editor: Editor;
}

function FormattingToolbarInner({ editor }: FormattingToolbarProps) {
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      textColor: (e?.getAttributes("textStyle").color as string | undefined) ?? undefined,
      highlightColor: (e?.getAttributes("highlight").color as string | undefined) ?? undefined,
      isImage: e?.isActive("image") ?? false,
      imageAlign: (e?.getAttributes("image").align as string | undefined) ?? undefined,
    }),
  });

  const currentTextColor = state?.textColor;
  const currentHighlight = state?.highlightColor;
  const isImage = state?.isImage ?? false;
  const imageAttrs = { align: state?.imageAlign };

  const setImageAlign = useCallback((align: "left" | "center" | "right") => {
    editor.chain().focus().updateAttributes("image", { align }).run();
  }, [editor]);

  const isImageAlign = useCallback((align: "left" | "center" | "right") => {
    return imageAttrs.align === align;
  }, [imageAttrs.align]);

  const handleUndo = useCallback(() => editor.chain().focus().undo().run(), [editor]);
  const handleRedo = useCallback(() => editor.chain().focus().redo().run(), [editor]);
  const handleH1 = useCallback(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const handleH2 = useCallback(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const handleH3 = useCallback(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const handleBold = useCallback(() => editor.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor.chain().focus().toggleItalic().run(), [editor]);
  const handleUnderline = useCallback(() => editor.chain().focus().toggleUnderline().run(), [editor]);
  const handleStrike = useCallback(() => editor.chain().focus().toggleStrike().run(), [editor]);
  const handleSubscript = useCallback(() => editor.chain().focus().toggleSubscript().run(), [editor]);
  const handleSuperscript = useCallback(() => editor.chain().focus().toggleSuperscript().run(), [editor]);
  const handleAlignLeft = useCallback(() => {
    if (isImage) setImageAlign("left");
    else editor.chain().focus().setTextAlign("left").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignCenter = useCallback(() => {
    if (isImage) setImageAlign("center");
    else editor.chain().focus().setTextAlign("center").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignRight = useCallback(() => {
    if (isImage) setImageAlign("right");
    else editor.chain().focus().setTextAlign("right").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignJustify = useCallback(() => editor.chain().focus().setTextAlign("justify").run(), [editor]);
  const handleBulletList = useCallback(() => editor.chain().focus().toggleBulletList().run(), [editor]);
  const handleOrderedList = useCallback(() => editor.chain().focus().toggleOrderedList().run(), [editor]);
  const handleBlockquote = useCallback(() => editor.chain().focus().toggleBlockquote().run(), [editor]);
  const handleOutdent = useCallback(() => {
    if (editor.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
    }
  }, [editor]);
  const handleIndentList = useCallback(() => {
    if (editor.isActive("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
    }
  }, [editor]);
  const handleLink = useCallback(() => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const { openPrompt } = require("@/store/dialogStore").useDialogStore.getState();
    openPrompt(
      "แทรกลิงก์ (Insert Link)",
      "ใส่ URL ของลิงก์:",
      previous ?? "https://",
      (url: string) => {
        if (url === null) return;
        if (url === "") {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        // Validate URL and block javascript: scheme
        let validatedUrl = url;
        try {
          const parsed = new URL(url, window.location.href);
          if (parsed.protocol === "javascript:") {
            useToastStore.getState().show("ไม่รองรับ URL ประเภท javascript:", "error");
            return;
          }
          validatedUrl = parsed.href;
        } catch {
          if (/^javascript:/i.test(url)) {
            useToastStore.getState().show("ไม่รองรับ URL ประเภท javascript:", "error");
            return;
          }
        }
        editor.chain().focus().extendMarkRange("link").setLink({ href: validatedUrl }).run();
      }
    );
  }, [editor]);
  const handleHorizontalRule = useCallback(() => editor.chain().focus().setHorizontalRule().run(), [editor]);
  const handleCodeBlock = useCallback(() => editor.chain().focus().toggleCodeBlock().run(), [editor]);
  const handleCode = useCallback(() => editor.chain().focus().toggleCode().run(), [editor]);
  const handleClearFormatting = useCallback(() => editor.chain().focus().clearNodes().unsetAllMarks().run(), [editor]);
  const handlePageBreak = useCallback(() => editor.chain().focus().insertPageBreak().run(), [editor]);
  const handleSetColor = useCallback((color: string) => editor.chain().focus().setColor(color).run(), [editor]);
  const handleSetHighlight = useCallback((color: string) => editor.chain().focus().setHighlight({ color }).run(), [editor]);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5">
      {/* เลิกทำ / ทำซ้ำ */}
      <ToolGroup>
        <ToolButton
          label="เลิกทำ"
          onClick={handleUndo}
          disabled={!editor.can().undo()}
        >
          <Undo2 />
        </ToolButton>
        <ToolButton
          label="ทำซ้ำ"
          onClick={handleRedo}
          disabled={!editor.can().redo()}
        >
          <Redo2 />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* หัวเรื่อง */}
      <ToolGroup>
        <ToolButton
          label="หัวเรื่อง 1"
          onClick={handleH1}
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 />
        </ToolButton>
        <ToolButton
          label="หัวเรื่อง 2"
          onClick={handleH2}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 />
        </ToolButton>
        <ToolButton
          label="หัวเรื่อง 3"
          onClick={handleH3}
          active={editor.isActive("heading", { level: 3 })}
        >
          <Heading3 />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* การจัดรูปแบบตัวอักษร */}
      <ToolGroup>
        <ToolButton
          label="ตัวหนา"
          onClick={handleBold}
          active={editor.isActive("bold")}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="ตัวเอียง"
          onClick={handleItalic}
          active={editor.isActive("italic")}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="ขีดเส้นใต้"
          onClick={handleUnderline}
          active={editor.isActive("underline")}
        >
          <UnderlineIcon />
        </ToolButton>
        <ToolButton
          label="ขีดทับ"
          onClick={handleStrike}
          active={editor.isActive("strike")}
        >
          <Strikethrough />
        </ToolButton>
        <ToolButton
          label="ตัวห้อย"
          onClick={handleSubscript}
          active={editor.isActive("subscript")}
        >
          <SubscriptIcon />
        </ToolButton>
        <ToolButton
          label="ตัวยก"
          onClick={handleSuperscript}
          active={editor.isActive("superscript")}
        >
          <SuperscriptIcon />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* การจัดตำแหน่ง (รองรับรูปภาพ) */}
      <ToolGroup>
        <ToolButton
          label={isImage ? "จัดรูปชิดซ้าย" : "ชิดซ้าย"}
          onClick={handleAlignLeft}
          active={
            isImage
              ? isImageAlign("left")
              : editor.isActive({ textAlign: "left" })
          }
        >
          <AlignLeft />
        </ToolButton>
        <ToolButton
          label={isImage ? "จัดรูปกึ่งกลาง" : "กึ่งกลาง"}
          onClick={handleAlignCenter}
          active={
            isImage
              ? isImageAlign("center")
              : editor.isActive({ textAlign: "center" })
          }
        >
          <AlignCenter />
        </ToolButton>
        <ToolButton
          label={isImage ? "จัดรูปชิดขวา" : "ชิดขวา"}
          onClick={handleAlignRight}
          active={
            isImage
              ? isImageAlign("right")
              : editor.isActive({ textAlign: "right" })
          }
        >
          <AlignRight />
        </ToolButton>
        <ToolButton
          label="เต็มบรรทัด"
          onClick={handleAlignJustify}
          active={editor.isActive({ textAlign: "justify" })}
          disabled={isImage}
        >
          <AlignJustify />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* รายการและ quote */}
      <ToolGroup>
        <ToolButton
          label="รายการจุด"
          onClick={handleBulletList}
          active={editor.isActive("bulletList")}
        >
          <List />
        </ToolButton>
        <ToolButton
          label="รายการตัวเลข"
          onClick={handleOrderedList}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered />
        </ToolButton>
        <ToolButton
          label="อ้างอิง"
          onClick={handleBlockquote}
          active={editor.isActive("blockquote")}
        >
          <Quote />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* เยื้อง */}
      <ToolGroup>
        <ToolButton
          label="ลดเยื้อง"
          onClick={handleOutdent}
          disabled={!editor.isActive("listItem")}
        >
          <Outdent />
        </ToolButton>
        <ToolButton
          label="เพิ่มเยื้อง"
          onClick={handleIndentList}
          disabled={!editor.isActive("listItem")}
        >
          <Indent />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* ลิงก์ */}
      <ToolGroup>
        <ToolButton
          label="แทรกลิงก์"
          onClick={handleLink}
          active={editor.isActive("link")}
        >
          <LinkIcon />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* เส้นคั่น / บล็อกโค้ด / โค้ดบรรทัด / ล้างรูปแบบ */}
      <ToolGroup>
        <ToolButton
          label="เส้นคั่น"
          onClick={handleHorizontalRule}
        >
          <Minus />
        </ToolButton>
        <ToolButton
          label="บล็อกโค้ด"
          onClick={handleCodeBlock}
          active={editor.isActive("codeBlock")}
        >
          <Code2 />
        </ToolButton>
        <ToolButton
          label="โค้ดบรรทัด (Ctrl+E)"
          onClick={handleCode}
          active={editor.isActive("code")}
        >
          <Code />
        </ToolButton>
        <ToolButton
          label="ล้างการจัดรูปแบบ"
          onClick={handleClearFormatting}
        >
          <Eraser />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* สีตัวอักษร & ไฮไลต์ */}
      <ToolGroup>
        <div className="relative">
          <ToolButton
            label="สีตัวอักษร"
            onClick={() => textColorRef.current?.click()}
          >
            <span className="flex flex-col items-center gap-[2px]">
              <Palette className="size-3.5" />
              <span
                className="h-[3px] w-3.5 rounded-[1px]"
                style={{ backgroundColor: currentTextColor ?? "currentColor" }}
              />
            </span>
          </ToolButton>
          <input
            ref={textColorRef}
            type="color"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            defaultValue={currentTextColor ?? "#000000"}
            onChange={(e) => handleSetColor(e.target.value)}
          />
        </div>
        <div className="relative">
          <ToolButton
            label="สีพื้นหลัง"
            onClick={() => highlightColorRef.current?.click()}
          >
            <span className="flex flex-col items-center gap-[2px]">
              <Highlighter className="size-3.5" />
              <span
                className="h-[3px] w-3.5 rounded-[1px]"
                style={{ backgroundColor: currentHighlight ?? "transparent", border: currentHighlight ? "none" : "1px solid currentColor" }}
              />
            </span>
          </ToolButton>
          <input
            ref={highlightColorRef}
            type="color"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            defaultValue={currentHighlight ?? "#ffff00"}
            onChange={(e) => handleSetHighlight(e.target.value)}
          />
        </div>
      </ToolGroup>

      <Divider />

      {/* Page break — always available */}
      <ToolGroup>
        <ToolButton
          label="แทรกตัวแบ่งหน้า (Page Break)"
          disabled={!editor.can().insertPageBreak()}
          onClick={handlePageBreak}
        >
          <Split />
        </ToolButton>
      </ToolGroup>

      <Divider />

      <TemplateModeToggle />
    </div>
  );
}

export const FormattingToolbar = memo(FormattingToolbarInner);

interface ToolButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}

function ToolButton({ label, onClick, disabled, active, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors",
        "hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-40",
        "[&_svg]:size-3.5",
        active &&
          "bg-[color:var(--color-accent)] text-[color:var(--color-accent-foreground)] ring-2 ring-[color:var(--color-ring)] ring-offset-1"
      )}
    >
      {children}
    </button>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-[color:var(--color-border)]" />;
}
