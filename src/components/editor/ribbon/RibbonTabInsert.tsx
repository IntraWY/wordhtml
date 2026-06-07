"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  Minus,
  WrapText,
  Code2,
  BookOpen,
  Split,
  FilePlus,
  Globe,
  Braces,
  Sigma,
  TextCursorInput,
  FileText,
  PenLine,
  Captions as CaptionsIcon,
  Asterisk,
  Link2,
  Users,
} from "lucide-react";
import { buildSignatureBlockHtml } from "@/lib/officialLetter/signatureBlock";
import { buildCaptionHtml, nextCaptionNumber } from "@/lib/caption";
import {
  nextFootnoteNumber,
  buildFootnoteRefHtml,
  buildFootnoteNoteHtml,
} from "@/lib/footnotes";

import { RibbonGroup } from "./RibbonGroup";
import { RibbonButton } from "./RibbonButton";
import { useDialogStore } from "@/store/dialogStore";
import { useEditorStore } from "@/store/editorStore";
import { useUiStore } from "@/store/uiStore";
import { compressImageIfEnabled, readFileAsDataURL } from "@/lib/imageCompression";
import { assignHeadingIds, buildTocHtml, generateToc } from "@/lib/toc";
import { editorCan, isLiveEditor } from "@/lib/editorLive";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function RibbonTabInsert({ editor }: { editor: Editor | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef(editor);
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);
  const hasEditor = isLiveEditor(editor);

  const liveEditor = () => editorRef.current;

  const insertImageFromFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      useDialogStore.getState().openAlert(
        "รูปภาพ (Image)",
        "กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, GIF, WebP, SVG)"
      );
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      useDialogStore.getState().openAlert("รูปภาพ (Image)", "ไฟล์รูปภาพใหญ่เกิน 10MB");
      return;
    }
    try {
      const autoCompress = useEditorStore.getState().autoCompressImages;
      const finalFile = await compressImageIfEnabled(file, autoCompress);
      const src = await readFileAsDataURL(finalFile);
      useDialogStore.getState().openPrompt(
        "คำอธิบายรูปภาพ (Alt text)",
        "ใส่คำอธิบายสำหรับรูปภาพ:",
        "รูปภาพ (Image)",
        (alt) => {
          const ed = liveEditor();
          if (isLiveEditor(ed)) ed.chain().focus().setImage({ src, alt }).run();
        }
      );
    } catch {
      useDialogStore.getState().openAlert("รูปภาพ (Image)", "ไม่สามารถอ่านไฟล์ได้");
    }
  }, []);

  const handleLink = useCallback(() => {
    if (!isLiveEditor(editor)) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    useDialogStore.getState().openPrompt(
      "แทรกลิงก์ (Insert Link)",
      "ใส่ URL ของลิงก์:",
      previous ?? "https://",
      (url) => {
        const ed = liveEditor();
        if (!isLiveEditor(ed)) return;
        if (url === null) return;
        if (url === "") {
          ed.chain().focus().extendMarkRange("link").unsetLink().run();
          return;
        }
        let validatedUrl = url;
        try {
          const parsed = new URL(url, window.location.href);
          if (parsed.protocol === "javascript:") {
            useDialogStore.getState().openAlert("ลิงก์", "ไม่รองรับ URL ประเภท javascript:");
            return;
          }
          validatedUrl = parsed.href;
        } catch {
          if (/^javascript:/i.test(url)) {
            useDialogStore.getState().openAlert("ลิงก์", "ไม่รองรับ URL ประเภท javascript:");
            return;
          }
        }
        ed.chain().focus().extendMarkRange("link").setLink({ href: validatedUrl }).run();
      }
    );
  }, [editor]);

  const handleImageUrl = useCallback(() => {
    useDialogStore.getState().openPrompt(
      "รูปภาพจาก URL (Image URL)",
      "ใส่ URL ของรูปภาพ:",
      "",
      (src) => {
        if (!src) return;
        useDialogStore.getState().openPrompt(
          "คำอธิบายรูปภาพ (Alt text)",
          "ใส่คำอธิบายสำหรับรูปภาพ:",
          "รูปภาพ (Image)",
          (alt) => {
            const ed = liveEditor();
            if (isLiveEditor(ed)) ed.chain().focus().setImage({ src, alt }).run();
          }
        );
      }
    );
  }, []);

  const handleTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const handleHr = useCallback(() => editor?.chain().focus().setHorizontalRule().run(), [editor]);
  const handleSoftBreak = useCallback(() => editor?.chain().focus().setHardBreak().run(), [editor]);
  const handleCodeBlock = useCallback(() => editor?.chain().focus().toggleCodeBlock().run(), [editor]);

  const handleToc = useCallback(() => {
    if (!editor) return;
    assignHeadingIds(editor);
    const tocItems = generateToc(editor.getHTML());
    if (tocItems.length === 0) {
      useDialogStore.getState().openAlert("สารบัญ (TOC)", "ไม่พบหัวข้อในเอกสาร");
      return;
    }
    editor.chain().focus().insertContent(buildTocHtml(tocItems)).run();
  }, [editor]);

  const handlePageBreak = useCallback(() => editor?.chain().focus().insertPageBreak().run(), [editor]);
  const handleVariable = useCallback(() => {
    if (!editor) return;
    if (!useEditorStore.getState().templateMode) {
      useEditorStore.getState().toggleTemplateMode();
    }
    editor.chain().focus().insertContent("{{").run();
  }, [editor]);
  const handlePlaceholderField = useCallback(() => {
    editor?.chain().focus().insertPlaceholderField({ label: "ช่องกรอก" }).run();
  }, [editor]);
  const handleAddPage = useCallback(() => {
    if (!editor) return;
    const doc = editor.state.doc;
    const lastNode = doc.lastChild;
    const endPos = doc.content.size;
    if (lastNode?.type.name === "pageBreak") {
      editor.chain().focus().setTextSelection(endPos).insertContent({ type: "paragraph" }).insertPageBreak().run();
    } else {
      editor.chain().focus().setTextSelection(endPos).insertPageBreak().run();
    }
  }, [editor]);

  const handleMath = useCallback(() => {
    window.dispatchEvent(new CustomEvent("wordhtml:open-math-dialog"));
  }, []);

  const handleSignatureBlock = useCallback(() => {
    editor?.chain().focus().insertContent(buildSignatureBlockHtml()).run();
  }, [editor]);

  const handleCaption = useCallback(() => {
    if (!isLiveEditor(editor)) return;
    const num = nextCaptionNumber(editor.getHTML(), "figure");
    editor.chain().focus().insertContent(buildCaptionHtml("figure", num)).run();
  }, [editor]);

  const handleFootnote = useCallback(() => {
    if (!isLiveEditor(editor)) return;
    useDialogStore.getState().openPrompt(
      "เชิงอรรถ (Footnote)",
      "ข้อความเชิงอรรถ:",
      "",
      (text) => {
        const ed = liveEditor();
        if (!isLiveEditor(ed) || !text || !text.trim()) return;
        const num = nextFootnoteNumber(ed.getHTML());
        // 1) inline superscript ref at the cursor
        ed.chain().focus().insertContent(buildFootnoteRefHtml(num)).run();
        // 2) append the numbered note at the end of the last page body
        let lastBodyEnd = -1;
        ed.state.doc.descendants((node, pos) => {
          if (node.type.name === "pageBody") {
            lastBodyEnd = pos + node.nodeSize - 1;
          }
          return true;
        });
        if (lastBodyEnd > 0) {
          ed.chain()
            .insertContentAt(lastBodyEnd, buildFootnoteNoteHtml(num, text))
            .run();
        } else {
          ed.chain().focus().insertContent(buildFootnoteNoteHtml(num, text)).run();
        }
      }
    );
  }, [editor]);

  return (
    <>
      <RibbonGroup label="ลิงก์ & รูปภาพ">
        <RibbonButton label="แทรกลิงก์" onClick={handleLink} disabled={!hasEditor}>
          <LinkIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="อัปโหลดรูปภาพ" onClick={() => fileInputRef.current?.click()} disabled={!hasEditor}>
          <ImageIcon className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="รูปภาพจาก URL" onClick={handleImageUrl} disabled={!hasEditor}>
          <Globe className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="คำบรรยายภาพ (Caption)" onClick={handleCaption} disabled={!hasEditor}>
          <CaptionsIcon className="size-3.5" />
        </RibbonButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          aria-hidden="true"
          tabIndex={-1}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImageFromFile(file);
            e.target.value = "";
          }}
        />
      </RibbonGroup>

      <RibbonGroup label="ตาราง & รายการ">
        <RibbonButton label="แทรกตาราง" onClick={handleTable} disabled={!hasEditor}>
          <Table className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เส้นแบ่ง" onClick={handleHr} disabled={!hasEditor}>
          <Minus className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ขึ้นบรรทัดใหม่" onClick={handleSoftBreak} disabled={!hasEditor}>
          <WrapText className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="บล็อกโค้ด" onClick={handleCodeBlock} active={editor?.isActive("codeBlock")} disabled={!hasEditor}>
          <Code2 className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="เอกสาร">
        <RibbonButton label="สารบัญ" onClick={handleToc} disabled={!hasEditor}>
          <BookOpen className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="แทรกตัวแบ่งหน้า" onClick={handlePageBreak} disabled={!hasEditor || !editorCan(editor, (c) => c.insertPageBreak())}>
          <Split className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เพิ่มหน้าใหม่" onClick={handleAddPage} disabled={!hasEditor || !editorCan(editor, (c) => c.insertPageBreak())}>
          <FilePlus className="size-3.5" />
        </RibbonButton>
        <RibbonButton
          label="หนังสือราชการ (Official letter)"
          onClick={() => useUiStore.getState().openOfficialLetter()}
        >
          <FileText className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="บล็อกลงนาม (Signature block)" onClick={handleSignatureBlock} disabled={!hasEditor}>
          <PenLine className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="เชิงอรรถ (Footnote)" onClick={handleFootnote} disabled={!hasEditor}>
          <Asterisk className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="อ้างอิงข้าม (Cross-reference)" onClick={() => useUiStore.getState().openCrossRef()} disabled={!hasEditor}>
          <Link2 className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="ตัวแปร (Vars)">
        <RibbonButton label="แทรกตัวแปร" onClick={handleVariable} disabled={!hasEditor}>
          <Braces className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="ช่องกรอก" onClick={handlePlaceholderField} disabled={!hasEditor}>
          <TextCursorInput className="size-3.5" />
        </RibbonButton>
        <RibbonButton label="สำเนาเรียน (Distribution)" onClick={() => useUiStore.getState().openDistribution()} disabled={!hasEditor}>
          <Users className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>

      <RibbonGroup label="สมการ (Math)">
        <RibbonButton label="แทรกสมการ" onClick={handleMath} disabled={!hasEditor}>
          <Sigma className="size-3.5" />
        </RibbonButton>
      </RibbonGroup>
    </>
  );
}
