"use client";

import { useCallback, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Indent,
  Outdent,
  Eraser,
  Code,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Undo2,
  Redo2,
  Search,
  ClipboardPaste,
  Scissors,
  Copy as CopyIcon,
  Palette,
  Highlighter,
  Type,
  Minus,
} from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { RibbonSelect } from "./RibbonSelect";
import { FontSizeSelector } from "../FontSizeSelector";
import { useToastStore } from "@/store/toastStore";
import { useDialogStore } from "@/store/dialogStore";
import { useUiStore } from "@/store/uiStore";
import { dispatchOpenSearch } from "@/lib/events";

const FONT_OPTIONS = [
  { label: "ค่าเริ่มต้น", value: "" },
  { label: "TH Sarabun PSK", value: "'TH Sarabun PSK', 'Sarabun', sans-serif" },
  { label: "Sarabun", value: "Sarabun, sans-serif" },
  { label: "Noto Sans Thai", value: "'Noto Sans Thai', sans-serif" },
  { label: "Geist", value: "var(--font-geist-sans)" },
  { label: "System Sans", value: "system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Monospace", value: "var(--font-geist-mono)" },
];

export function RibbonTabHome({ editor }: { editor: Editor | null }) {
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      textColor: (e?.getAttributes("textStyle").color as string | undefined) ?? undefined,
      highlightColor: (e?.getAttributes("highlight").color as string | undefined) ?? undefined,
      fontFamily: (e?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
      isImage: e?.isActive("image") ?? false,
      imageAlign: (e?.getAttributes("image").align as string | undefined) ?? undefined,
    }),
  });

  const currentTextColor = state?.textColor;
  const currentHighlight = state?.highlightColor;
  const currentFont = state?.fontFamily ?? "";
  const isImage = state?.isImage ?? false;
  const imageAlign = state?.imageAlign;

  const setImageAlign = useCallback((align: "left" | "center" | "right") => {
    editor?.chain().focus().updateAttributes("image", { align }).run();
  }, [editor]);

  const isImageAlign = useCallback((align: "left" | "center" | "right") => imageAlign === align, [imageAlign]);

  const handleUndo = useCallback(() => editor?.chain().focus().undo().run(), [editor]);
  const handleRedo = useCallback(() => editor?.chain().focus().redo().run(), [editor]);
  const handleH1 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 1 }).run(), [editor]);
  const handleH2 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 2 }).run(), [editor]);
  const handleH3 = useCallback(() => editor?.chain().focus().toggleHeading({ level: 3 }).run(), [editor]);
  const handleBold = useCallback(() => editor?.chain().focus().toggleBold().run(), [editor]);
  const handleItalic = useCallback(() => editor?.chain().focus().toggleItalic().run(), [editor]);
  const handleUnderline = useCallback(() => editor?.chain().focus().toggleUnderline().run(), [editor]);
  const handleStrike = useCallback(() => editor?.chain().focus().toggleStrike().run(), [editor]);
  const handleSubscript = useCallback(() => editor?.chain().focus().toggleSubscript().run(), [editor]);
  const handleSuperscript = useCallback(() => editor?.chain().focus().toggleSuperscript().run(), [editor]);
  const handleAlignLeft = useCallback(() => {
    if (isImage) setImageAlign("left");
    else editor?.chain().focus().setTextAlign("left").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignCenter = useCallback(() => {
    if (isImage) setImageAlign("center");
    else editor?.chain().focus().setTextAlign("center").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignRight = useCallback(() => {
    if (isImage) setImageAlign("right");
    else editor?.chain().focus().setTextAlign("right").run();
  }, [editor, isImage, setImageAlign]);
  const handleAlignJustify = useCallback(() => editor?.chain().focus().setTextAlign("justify").run(), [editor]);
  const handleBulletList = useCallback(() => editor?.chain().focus().toggleBulletList().run(), [editor]);
  const handleOrderedList = useCallback(() => editor?.chain().focus().toggleOrderedList().run(), [editor]);
  const handleBlockquote = useCallback(() => editor?.chain().focus().toggleBlockquote().run(), [editor]);
  const handleOutdent = useCallback(() => {
    if (editor?.isActive("listItem")) {
      editor.chain().focus().liftListItem("listItem").run();
    }
  }, [editor]);
  const handleIndentList = useCallback(() => {
    if (editor?.isActive("listItem")) {
      editor.chain().focus().sinkListItem("listItem").run();
    }
  }, [editor]);
  const handleParagraph = useCallback(() => useUiStore.getState().openParagraph(), []);
  const handleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);
  const handleCode = useCallback(() => editor?.chain().focus().toggleCode().run(), [editor]);
  const handleClearFormatting = useCallback(() => editor?.chain().focus().clearNodes().unsetAllMarks().run(), [editor]);
  const handleHorizontalRule = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);
  const handleSetColor = useCallback((color: string) => editor?.chain().focus().setColor(color).run(), [editor]);
  const handleSetHighlight = useCallback((color: string) => editor?.chain().focus().setHighlight({ color }).run(), [editor]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      editor?.chain().focus().insertContent(text).run();
    } catch {
      useToastStore.getState().show("ไม่สามารถวางได้ — เบราว์เซอร์ไม่อนุญาต", "error");
    }
  }, [editor]);

  const handleCut = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    navigator.clipboard.writeText(html).then(() => {
      editor.chain().focus().deleteSelection().run();
      useToastStore.getState().show("ตัดไปยังคลิปบอร์ดแล้ว");
    }).catch(() => {
      useToastStore.getState().show("ไม่สามารถตัดได้", "error");
    });
  }, [editor]);

  const handleCopy = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    navigator.clipboard.writeText(html).then(() => {
      useToastStore.getState().show("คัดลอก HTML แล้ว");
    }).catch(() => {
      useDialogStore.getState().openAlert("คัดลอก (Copy)", "ไม่สามารถคัดลอกได้ — เบราว์เซอร์ไม่อนุญาต");
    });
  }, [editor]);

  const handleFontChange = useCallback((value: string) => {
    if (!editor) return;
    if (!value) {
      editor.chain().focus().unsetFontFamily().run();
    } else {
      editor.chain().focus().setFontFamily(value).run();
    }
  }, [editor]);

  const hasEditor = editor !== null;

  return (
    <>
      {/* Clipboard */}
      <RibbonGroup label="คลิปบอร์ด">
        <RibbonButton label="วาง (Paste)" onClick={handlePaste} disabled={!hasEditor}>
          <ClipboardPaste className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัด (Cut)" onClick={handleCut} disabled={!hasEditor}>
          <Scissors className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="คัดลอก (Copy)" onClick={handleCopy} disabled={!hasEditor}>
          <CopyIcon className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      {/* Font */}
      <RibbonGroup label="ตัวอักษร">
        <RibbonSelect
          label="ฟอนต์ (Font)"
          value={currentFont}
          onChange={handleFontChange}
          options={FONT_OPTIONS}
        />
        {editor && <FontSizeSelector editor={editor} />}
        <RibbonButton label="ตัวหนา (Bold)" onClick={handleBold} active={editor?.isActive("bold")} disabled={!hasEditor}>
          <Bold className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวเอียง (Italic)" onClick={handleItalic} active={editor?.isActive("italic")} disabled={!hasEditor}>
          <Italic className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ขีดเส้นใต้ (Underline)" onClick={handleUnderline} active={editor?.isActive("underline")} disabled={!hasEditor}>
          <UnderlineIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ขีดทับ (Strikethrough)" onClick={handleStrike} active={editor?.isActive("strike")} disabled={!hasEditor}>
          <Strikethrough className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวห้อย (Subscript)" onClick={handleSubscript} active={editor?.isActive("subscript")} disabled={!hasEditor}>
          <SubscriptIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวยก (Superscript)" onClick={handleSuperscript} active={editor?.isActive("superscript")} disabled={!hasEditor}>
          <SuperscriptIcon className="size-3.5" />
        </RibbonButton>
        <div className="relative">
          <RibbonButton label="สีตัวอักษร" onClick={() => textColorRef.current?.click()} disabled={!hasEditor}>
            <span className="flex flex-col items-center gap-[2px]">
              <Palette className="size-3.5" />
              <span className="h-[3px] w-3.5 rounded-[1px]" style={{ backgroundColor: currentTextColor ?? "currentColor" }} />
            </span>
          </RibbonButton>
          <input
            ref={textColorRef}
            type="color"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            defaultValue={currentTextColor ?? "#000000"}
            onChange={(e) => handleSetColor(e.target.value)}
          />
        </div>
        <div className="relative">
          <RibbonButton label="สีพื้นหลัง" onClick={() => highlightColorRef.current?.click()} disabled={!hasEditor}>
            <span className="flex flex-col items-center gap-[2px]">
              <Highlighter className="size-3.5" />
              <span
                className="h-[3px] w-3.5 rounded-[1px]"
                style={{
                  backgroundColor: currentHighlight ?? "transparent",
                  border: currentHighlight ? "none" : "1px solid currentColor",
                }}
              />
            </span>
          </RibbonButton>
          <input
            ref={highlightColorRef}
            type="color"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
            defaultValue={currentHighlight ?? "#ffff00"}
            onChange={(e) => handleSetHighlight(e.target.value)}
          />
        </div>
      </RibbonGroup>

      {/* Paragraph */}
      <RibbonGroup label="ย่อหน้า">
        <RibbonButton
          label={isImage ? "จัดรูปชิดซ้าย" : "ชิดซ้าย"}
          onClick={handleAlignLeft}
          active={isImage ? isImageAlign("left") : editor?.isActive({ textAlign: "left" })}
          disabled={!hasEditor}
        >
          <AlignLeft className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={isImage ? "จัดรูปกึ่งกลาง" : "กึ่งกลาง"}
          onClick={handleAlignCenter}
          active={isImage ? isImageAlign("center") : editor?.isActive({ textAlign: "center" })}
          disabled={!hasEditor}
        >
          <AlignCenter className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={isImage ? "จัดรูปชิดขวา" : "ชิดขวา"}
          onClick={handleAlignRight}
          active={isImage ? isImageAlign("right") : editor?.isActive({ textAlign: "right" })}
          disabled={!hasEditor}
        >
          <AlignRight className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="เต็มบรรทัด"
          onClick={handleAlignJustify}
          active={editor?.isActive({ textAlign: "justify" })}
          disabled={!hasEditor || isImage}
        >
          <AlignJustify className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ย่อหน้า…" onClick={handleParagraph} disabled={!hasEditor}>
          <Type className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="รายการจุด" onClick={handleBulletList} active={editor?.isActive("bulletList")} disabled={!hasEditor}>
          <List className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="รายการตัวเลข" onClick={handleOrderedList} active={editor?.isActive("orderedList")} disabled={!hasEditor}>
          <ListOrdered className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ลดเยื้อง" onClick={handleOutdent} disabled={!editor?.isActive("listItem")}>
          <Outdent className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เพิ่มเยื้อง" onClick={handleIndentList} disabled={!editor?.isActive("listItem")}>
          <Indent className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      {/* Styles */}
      <RibbonGroup label="รูปแบบ">
        <RibbonButton label="หัวเรื่อง 1" onClick={handleH1} active={editor?.isActive("heading", { level: 1 })} disabled={!hasEditor}>
          <Heading1 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="หัวเรื่อง 2" onClick={handleH2} active={editor?.isActive("heading", { level: 2 })} disabled={!hasEditor}>
          <Heading2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="หัวเรื่อง 3" onClick={handleH3} active={editor?.isActive("heading", { level: 3 })} disabled={!hasEditor}>
          <Heading3 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="อ้างอิง" onClick={handleBlockquote} active={editor?.isActive("blockquote")} disabled={!hasEditor}>
          <Quote className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="บล็อกโค้ด" onClick={handleCodeBlock} active={editor?.isActive("codeBlock")} disabled={!hasEditor}>
          <Code2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="โค้ดบรรทัด" onClick={handleCode} active={editor?.isActive("code")} disabled={!hasEditor}>
          <Code className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เส้นคั่น" onClick={handleHorizontalRule} disabled={!hasEditor}>
          <Minus className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ล้างการจัดรูปแบบ" onClick={handleClearFormatting} disabled={!hasEditor}>
          <Eraser className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      {/* Edit */}
      <RibbonGroup label="แก้ไข">
        <RibbonButton label="เลิกทำ" onClick={handleUndo} disabled={!editor?.can().undo()}>
          <Undo2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ทำซ้ำ" onClick={handleRedo} disabled={!editor?.can().redo()}>
          <Redo2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ค้นหา/แทนที่" onClick={dispatchOpenSearch}>
          <Search className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
