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
  ArrowLeftToLine,
  ArrowRightToLine,
} from "lucide-react";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { RibbonSelect } from "./RibbonSelect";
import { FontSizeSelector } from "../FontSizeSelector";
import { useToastStore } from "@/store/toastStore";
import { useDialogStore } from "@/store/dialogStore";
import { useUiStore } from "@/store/uiStore";
import { dispatchOpenSearch } from "@/lib/events";
import { editorCan, isLiveEditor } from "@/lib/editorLive";

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

  const currentTextColor = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("textStyle").color as string | undefined) ?? undefined,
  }) ?? undefined;
  const currentHighlight = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("highlight").color as string | undefined) ?? undefined,
  }) ?? undefined;
  const currentFont = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("textStyle").fontFamily as string | undefined) ?? "",
  }) ?? "";
  const isImage = useEditorState({
    editor,
    selector: ({ editor: e }) => e?.isActive("image") ?? false,
  }) ?? false;
  const imageAlign = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("image").align as string | undefined) ?? undefined,
  }) ?? undefined;
  const currentLineHeightMode = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("paragraph").lineHeightMode as string | undefined) ?? "single",
  }) ?? "single";
  const currentSpaceBefore = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("paragraph").spaceBefore as number | undefined) ?? 0,
  }) ?? 0;
  const currentSpaceAfter = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      (e?.getAttributes("paragraph").spaceAfter as number | undefined) ?? 0,
  }) ?? 0;

  const setImageAlign = useCallback((align: "left" | "center" | "right") => {
    editor?.chain().focus().updateAttributes("image", { align }).run();
  }, [editor]);

  const isImageAlign = (align: "left" | "center" | "right") => imageAlign === align;

  type FormatAction =
    | "bold" | "italic" | "underline" | "strike" | "subscript" | "superscript"
    | "h1" | "h2" | "h3"
    | "alignLeft" | "alignCenter" | "alignRight" | "alignJustify"
    | "bulletList" | "orderedList" | "blockquote"
    | "outdent" | "indentList"
    | "codeBlock" | "code" | "horizontalRule" | "clearFormatting"
    | "undo" | "redo"
    | "increaseBlockIndent" | "decreaseBlockIndent"
    | "paragraph";

  const handleFormat = useCallback((action: FormatAction) => {
    if (!isLiveEditor(editor)) return;
    const chain = editor.chain().focus();
    switch (action) {
      case "bold": chain.toggleBold().run(); break;
      case "italic": chain.toggleItalic().run(); break;
      case "underline": chain.toggleUnderline().run(); break;
      case "strike": chain.toggleStrike().run(); break;
      case "subscript": chain.toggleSubscript().run(); break;
      case "superscript": chain.toggleSuperscript().run(); break;
      case "h1": chain.toggleHeading({ level: 1 }).run(); break;
      case "h2": chain.toggleHeading({ level: 2 }).run(); break;
      case "h3": chain.toggleHeading({ level: 3 }).run(); break;
      case "alignLeft":
        if (isImage) setImageAlign("left");
        else chain.setTextAlign("left").run();
        break;
      case "alignCenter":
        if (isImage) setImageAlign("center");
        else chain.setTextAlign("center").run();
        break;
      case "alignRight":
        if (isImage) setImageAlign("right");
        else chain.setTextAlign("right").run();
        break;
      case "alignJustify": chain.setTextAlign("justify").run(); break;
      case "bulletList": chain.toggleBulletList().run(); break;
      case "orderedList": chain.toggleOrderedList().run(); break;
      case "blockquote": chain.toggleBlockquote().run(); break;
      case "outdent":
        if (editor.isActive("listItem")) chain.liftListItem("listItem").run();
        break;
      case "indentList":
        if (editor.isActive("listItem")) chain.sinkListItem("listItem").run();
        break;
      case "codeBlock": chain.toggleCodeBlock().run(); break;
      case "code": chain.toggleCode().run(); break;
      case "horizontalRule": chain.setHorizontalRule().run(); break;
      case "clearFormatting": chain.clearNodes().unsetAllMarks().run(); break;
      case "undo": chain.undo().run(); break;
      case "redo": chain.redo().run(); break;
      case "increaseBlockIndent": chain.increaseBlockIndent().run(); break;
      case "decreaseBlockIndent": chain.decreaseBlockIndent().run(); break;
      case "paragraph": useUiStore.getState().openParagraph(); break;
    }
  }, [editor, isImage, setImageAlign]);

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

  const handleLineSpacingChange = useCallback((value: string) => {
    if (!editor) return;
    const mode = value as import("@/lib/tiptap/paragraphFormat").LineHeightMode;
    if (mode === "single" || mode === "oneHalf" || mode === "double") {
      editor.chain().focus().setLineSpacing(mode).run();
    } else {
      const current = editor.getAttributes("paragraph").lineHeight as number | undefined;
      editor.chain().focus().setLineSpacing(mode, current ?? 12).run();
    }
  }, [editor]);

  const handleSpaceBeforeChange = useCallback((value: string) => {
    const num = parseFloat(value);
    if (!Number.isNaN(num)) {
      editor?.chain().focus().setParagraphFormat({ spaceBefore: num }).run();
    }
  }, [editor]);

  const handleSpaceAfterChange = useCallback((value: string) => {
    const num = parseFloat(value);
    if (!Number.isNaN(num)) {
      editor?.chain().focus().setParagraphFormat({ spaceAfter: num }).run();
    }
  }, [editor]);


  const hasEditor = isLiveEditor(editor);

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
          disabled={!hasEditor}
        />
        {hasEditor && editor && <FontSizeSelector editor={editor} />}
        <RibbonButton label="ตัวหนา (Bold)" onClick={() => handleFormat("bold")} active={editor?.isActive("bold")} disabled={!hasEditor}>
          <Bold className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวเอียง (Italic)" onClick={() => handleFormat("italic")} active={editor?.isActive("italic")} disabled={!hasEditor}>
          <Italic className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ขีดเส้นใต้ (Underline)" onClick={() => handleFormat("underline")} active={editor?.isActive("underline")} disabled={!hasEditor}>
          <UnderlineIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ขีดทับ (Strikethrough)" onClick={() => handleFormat("strike")} active={editor?.isActive("strike")} disabled={!hasEditor}>
          <Strikethrough className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวห้อย (Subscript)" onClick={() => handleFormat("subscript")} active={editor?.isActive("subscript")} disabled={!hasEditor}>
          <SubscriptIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ตัวยก (Superscript)" onClick={() => handleFormat("superscript")} active={editor?.isActive("superscript")} disabled={!hasEditor}>
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
          onClick={() => handleFormat("alignLeft")}
          active={isImage ? isImageAlign("left") : editor?.isActive({ textAlign: "left" })}
          disabled={!hasEditor}
        >
          <AlignLeft className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={isImage ? "จัดรูปกึ่งกลาง" : "กึ่งกลาง"}
          onClick={() => handleFormat("alignCenter")}
          active={isImage ? isImageAlign("center") : editor?.isActive({ textAlign: "center" })}
          disabled={!hasEditor}
        >
          <AlignCenter className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label={isImage ? "จัดรูปชิดขวา" : "ชิดขวา"}
          onClick={() => handleFormat("alignRight")}
          active={isImage ? isImageAlign("right") : editor?.isActive({ textAlign: "right" })}
          disabled={!hasEditor}
        >
          <AlignRight className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="เต็มบรรทัด"
          onClick={() => handleFormat("alignJustify")}
          active={editor?.isActive({ textAlign: "justify" })}
          disabled={!hasEditor || isImage}
        >
          <AlignJustify className="size-3.5" />
        </RibbonButton>
        <RibbonSelect
          label="ระยะบรรทัด (Spacing)"
          value={currentLineHeightMode}
          onChange={handleLineSpacingChange}
          options={[
            { label: "Single", value: "single" },
            { label: "1.5 Lines", value: "oneHalf" },
            { label: "Double", value: "double" },
            { label: "At least", value: "atLeast" },
            { label: "Exactly", value: "exactly" },
            { label: "Multiple", value: "multiple" },
          ]}
        />
        <RibbonButton label="ลดเยื้อง (Outdent)" onClick={() => handleFormat("decreaseBlockIndent")} disabled={!hasEditor}>
          <ArrowLeftToLine className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เพิ่มเยื้อง (Indent)" onClick={() => handleFormat("increaseBlockIndent")} disabled={!hasEditor}>
          <ArrowRightToLine className="size-3.5" />
        </RibbonButton>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-[color:var(--color-muted-foreground)]">ก่อน</label>
          <input
            type="number"
            min={0}
            step={1}
            value={currentSpaceBefore}
            onChange={(e) => handleSpaceBeforeChange(e.target.value)}
            disabled={!hasEditor}
            className="h-6 w-12 rounded-md border border-[color:var(--color-border)] bg-transparent px-1 text-xs text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] disabled:opacity-40"
            aria-label="ก่อน (Before) pt"
          />
          <span className="text-[10px] text-[color:var(--color-muted-foreground)]">pt</span>
        </div>
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-[color:var(--color-muted-foreground)]">หลัง</label>
          <input
            type="number"
            min={0}
            step={1}
            value={currentSpaceAfter}
            onChange={(e) => handleSpaceAfterChange(e.target.value)}
            disabled={!hasEditor}
            className="h-6 w-12 rounded-md border border-[color:var(--color-border)] bg-transparent px-1 text-xs text-[color:var(--color-foreground)] outline-none focus:border-[color:var(--color-accent)] disabled:opacity-40"
            aria-label="หลัง (After) pt"
          />
          <span className="text-[10px] text-[color:var(--color-muted-foreground)]">pt</span>
        </div>
        <RibbonButton label="ย่อหน้า…" onClick={() => handleFormat("paragraph")} disabled={!hasEditor}>
          <Type className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="รายการจุด" onClick={() => handleFormat("bulletList")} active={editor?.isActive("bulletList")} disabled={!hasEditor}>
          <List className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="รายการตัวเลข" onClick={() => handleFormat("orderedList")} active={editor?.isActive("orderedList")} disabled={!hasEditor}>
          <ListOrdered className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ลดเยื้อง" onClick={() => handleFormat("outdent")} disabled={!hasEditor || !editor?.isActive("listItem")}>
          <Outdent className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เพิ่มเยื้อง" onClick={() => handleFormat("indentList")} disabled={!hasEditor || !editor?.isActive("listItem")}>
          <Indent className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      {/* Styles */}
      <RibbonGroup label="รูปแบบ">
        <RibbonButton label="หัวเรื่อง 1" onClick={() => handleFormat("h1")} active={editor?.isActive("heading", { level: 1 })} disabled={!hasEditor}>
          <Heading1 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="หัวเรื่อง 2" onClick={() => handleFormat("h2")} active={editor?.isActive("heading", { level: 2 })} disabled={!hasEditor}>
          <Heading2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="หัวเรื่อง 3" onClick={() => handleFormat("h3")} active={editor?.isActive("heading", { level: 3 })} disabled={!hasEditor}>
          <Heading3 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="อ้างอิง" onClick={() => handleFormat("blockquote")} active={editor?.isActive("blockquote")} disabled={!hasEditor}>
          <Quote className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="บล็อกโค้ด" onClick={() => handleFormat("codeBlock")} active={editor?.isActive("codeBlock")} disabled={!hasEditor}>
          <Code2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="โค้ดบรรทัด" onClick={() => handleFormat("code")} active={editor?.isActive("code")} disabled={!hasEditor}>
          <Code className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เส้นคั่น" onClick={() => handleFormat("horizontalRule")} disabled={!hasEditor}>
          <Minus className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ล้างการจัดรูปแบบ" onClick={() => handleFormat("clearFormatting")} disabled={!hasEditor}>
          <Eraser className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      {/* Edit */}
      <RibbonGroup label="แก้ไข">
        <RibbonButton label="เลิกทำ" onClick={() => handleFormat("undo")} disabled={!editorCan(editor, (c) => c.undo())}>
          <Undo2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ทำซ้ำ" onClick={() => handleFormat("redo")} disabled={!editorCan(editor, (c) => c.redo())}>
          <Redo2 className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ค้นหา/แทนที่" onClick={dispatchOpenSearch}>
          <Search className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
