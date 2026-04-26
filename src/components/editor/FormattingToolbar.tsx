"use client";

import { useRef } from "react";
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
  Code2,
  Indent,
  Outdent,
  Palette,
  Highlighter,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface FormattingToolbarProps {
  editor: Editor;
}

export function FormattingToolbar({ editor }: FormattingToolbarProps) {
  const textColorRef = useRef<HTMLInputElement>(null);
  const highlightColorRef = useRef<HTMLInputElement>(null);

  const currentTextColor = editor.getAttributes("textStyle").color as string | undefined;
  const currentHighlight = editor.getAttributes("highlight").color as string | undefined;

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-1.5">
      {/* เลิกทำ / ทำซ้ำ */}
      <ToolGroup>
        <ToolButton
          label="เลิกทำ"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 />
        </ToolButton>
        <ToolButton
          label="ทำซ้ำ"
          onClick={() => editor.chain().focus().redo().run()}
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
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
        >
          <Heading1 />
        </ToolButton>
        <ToolButton
          label="หัวเรื่อง 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
        >
          <Heading2 />
        </ToolButton>
        <ToolButton
          label="หัวเรื่อง 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
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
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
        >
          <Bold />
        </ToolButton>
        <ToolButton
          label="ตัวเอียง"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
        >
          <Italic />
        </ToolButton>
        <ToolButton
          label="ขีดเส้นใต้"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
        >
          <UnderlineIcon />
        </ToolButton>
        <ToolButton
          label="ขีดทับ"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
        >
          <Strikethrough />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* การจัดตำแหน่ง */}
      <ToolGroup>
        <ToolButton
          label="ชิดซ้าย"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
        >
          <AlignLeft />
        </ToolButton>
        <ToolButton
          label="กึ่งกลาง"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
        >
          <AlignCenter />
        </ToolButton>
        <ToolButton
          label="ชิดขวา"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
        >
          <AlignRight />
        </ToolButton>
        <ToolButton
          label="เต็มบรรทัด"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
        >
          <AlignJustify />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* รายการและ quote */}
      <ToolGroup>
        <ToolButton
          label="รายการจุด"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
        >
          <List />
        </ToolButton>
        <ToolButton
          label="รายการตัวเลข"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
        >
          <ListOrdered />
        </ToolButton>
        <ToolButton
          label="อ้างอิง"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
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
          onClick={() => {
            if (editor.isActive("listItem")) {
              editor.chain().focus().liftListItem("listItem").run();
            }
          }}
          disabled={!editor.isActive("listItem")}
        >
          <Outdent />
        </ToolButton>
        <ToolButton
          label="เพิ่มเยื้อง"
          onClick={() => {
            if (editor.isActive("listItem")) {
              editor.chain().focus().sinkListItem("listItem").run();
            }
          }}
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
          onClick={() => {
            const previous = editor.getAttributes("link").href as string | undefined;
            const url = window.prompt("URL ของลิงก์", previous ?? "https://");
            if (url === null) return;
            if (url === "") {
              editor.chain().focus().extendMarkRange("link").unsetLink().run();
              return;
            }
            editor
              .chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href: url })
              .run();
          }}
          active={editor.isActive("link")}
        >
          <LinkIcon />
        </ToolButton>
      </ToolGroup>

      <Divider />

      {/* เส้นคั่น / บล็อกโค้ด / ล้างรูปแบบ */}
      <ToolGroup>
        <ToolButton
          label="เส้นคั่น"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus />
        </ToolButton>
        <ToolButton
          label="บล็อกโค้ด"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
        >
          <Code2 />
        </ToolButton>
        <ToolButton
          label="ล้างการจัดรูปแบบ"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
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
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
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
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .setHighlight({ color: e.target.value })
                .run()
            }
          />
        </div>
      </ToolGroup>
    </div>
  );
}

function ToolGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return (
    <span
      aria-hidden
      className="mx-1 h-5 w-px bg-[color:var(--color-border)]"
    />
  );
}

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
          "bg-[color:var(--color-foreground)] text-[color:var(--color-accent-foreground)] hover:bg-[color:var(--color-foreground)] hover:text-[color:var(--color-accent-foreground)]"
      )}
    >
      {children}
    </button>
  );
}
