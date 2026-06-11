"use client";

import { useEditor, EditorContent, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image as ImageIcon,
} from "lucide-react";

import { FontSize } from "@/lib/tiptap/fontSize";
import { cn } from "@/lib/utils";

const PRESET_SIZES = [10, 11, 12, 14, 16, 18, 20, 22, 24];

/** Page tokens stay literal in the stored HTML; replacePageTokens resolves them at render/export. */
const PAGE_TOKENS = [
  { token: "{page}", desc: "เลขหน้า (Page number)" },
  { token: "{total}", desc: "จำนวนหน้าทั้งหมด (Total pages)" },
  { token: "{page_th}", desc: "เลขหน้าเลขไทย (Page no., Thai numerals)" },
  { token: "{total_th}", desc: "จำนวนหน้าเลขไทย (Total, Thai numerals)" },
  { token: "{date}", desc: "วันที่ (Date)" },
  { token: "{date_th}", desc: "วันที่ไทย พ.ศ. (Thai Buddhist date)" },
  { token: "{date_th_short}", desc: "วันที่ไทยแบบสั้น (Short Thai date)" },
];

export interface HeaderFooterRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
}

/**
 * Small Tiptap editor for header/footer content (Phase 2).
 *
 * Minimal extension set: paragraph text with bold/italic/underline, alignment,
 * inline font-size spans, and inline images (logo). Page tokens are inserted
 * as literal text — they resolve downstream via replacePageTokens.
 */
export function HeaderFooterRichEditor({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: HeaderFooterRichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        link: false,
      }),
      TextAlign.configure({ types: ["paragraph"] }),
      TextStyle,
      FontSize,
      Image.configure({ inline: true }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "hf-rich-content outline-none min-h-[56px] px-3 py-2 text-sm",
        "aria-label": ariaLabel,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? "" : e.getHTML());
    },
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      alignLeft: e?.isActive({ textAlign: "left" }) ?? false,
      alignCenter: e?.isActive({ textAlign: "center" }) ?? false,
      alignRight: e?.isActive({ textAlign: "right" }) ?? false,
      fontSize: (e?.getAttributes("fontSize").size as number | undefined) ?? undefined,
    }),
  });

  if (!editor) {
    return (
      <div className="min-h-[92px] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-muted)]" />
    );
  }

  const insertLogo = () => {
    const url = window.prompt("URL ของโลโก้/รูป (Logo image URL):", "");
    if (!url) return;
    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: "logo" })
      .run();
  };

  const toolbarButtons = [
    {
      icon: Bold,
      label: "ตัวหนา (Bold)",
      active: state?.bold,
      fn: () => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: Italic,
      label: "ตัวเอียง (Italic)",
      active: state?.italic,
      fn: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: UnderlineIcon,
      label: "ขีดเส้นใต้ (Underline)",
      active: state?.underline,
      fn: () => editor.chain().focus().toggleUnderline().run(),
    },
    {
      icon: AlignLeft,
      label: "ชิดซ้าย (Align left)",
      active: state?.alignLeft,
      fn: () => editor.chain().focus().setTextAlign("left").run(),
    },
    {
      icon: AlignCenter,
      label: "กึ่งกลาง (Align center)",
      active: state?.alignCenter,
      fn: () => editor.chain().focus().setTextAlign("center").run(),
    },
    {
      icon: AlignRight,
      label: "ชิดขวา (Align right)",
      active: state?.alignRight,
      fn: () => editor.chain().focus().setTextAlign("right").run(),
    },
    {
      icon: ImageIcon,
      label: "แทรกโลโก้/รูป (Insert logo)",
      active: false,
      fn: insertLogo,
    },
  ];

  return (
    <div className="rounded-md border border-[color:var(--color-border)] focus-within:border-[color:var(--color-accent)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)]/60 px-1.5 py-1">
        {toolbarButtons.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.label}
            aria-label={b.label}
            aria-pressed={b.active}
            onClick={b.fn}
            className={cn(
              "grid h-6 w-6 place-items-center rounded text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
              b.active &&
                "bg-[color:var(--color-accent)]/15 text-[color:var(--color-accent)]"
            )}
          >
            <b.icon className="size-3.5" />
          </button>
        ))}

        <select
          aria-label="ขนาดตัวอักษร (Font size)"
          value={state?.fontSize ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val) {
              editor.chain().focus().setFontSize(val).run();
            } else {
              editor.chain().focus().unsetFontSize().run();
            }
          }}
          className="h-6 rounded border border-transparent bg-transparent px-1 text-[11px] outline-none hover:bg-[color:var(--color-muted)] focus:border-[color:var(--color-accent)]"
        >
          <option value="">ขนาด</option>
          {PRESET_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} px
            </option>
          ))}
        </select>

        <select
          aria-label="แทรกตัวแปร (Insert variable)"
          value=""
          onChange={(e) => {
            const token = e.target.value;
            if (!token) return;
            editor.chain().focus().insertContent(token).run();
          }}
          className="h-6 max-w-[120px] rounded border border-transparent bg-transparent px-1 text-[11px] outline-none hover:bg-[color:var(--color-muted)] focus:border-[color:var(--color-accent)]"
        >
          <option value="">แทรกตัวแปร…</option>
          {PAGE_TOKENS.map((t) => (
            <option key={t.token} value={t.token} title={t.desc}>
              {t.token} — {t.desc}
            </option>
          ))}
        </select>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
