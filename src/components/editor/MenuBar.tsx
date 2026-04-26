"use client";

import { useRef } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Check } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

interface MenuBarProps {
  editor: Editor | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

// ─── primitives ─────────────────────────────────────────────────────────────

function MenuDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          "rounded px-2 py-1 text-xs font-medium text-[color:var(--color-foreground)]",
          "hover:bg-[color:var(--color-border)] data-[state=open]:bg-[color:var(--color-border)]",
          "outline-none select-none"
        )}
      >
        {label}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={2}
          className={cn(
            "z-50 min-w-52 rounded-lg border border-[color:var(--color-border)]",
            "bg-white py-1 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function MenuItem({
  label,
  shortcut,
  disabled,
  danger,
  checked,
  onClick,
}: {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  onClick?: () => void;
}) {
  return (
    <DropdownMenu.Item
      disabled={disabled}
      onSelect={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs outline-none select-none",
        "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
        danger && "text-[color:var(--color-danger)] hover:bg-red-50",
        disabled && "cursor-default opacity-40"
      )}
    >
      <span className="flex items-center gap-2">
        {checked !== undefined && (
          <Check
            className={cn("size-3", checked ? "opacity-100" : "opacity-0")}
          />
        )}
        {label}
      </span>
      {shortcut && (
        <span className="ml-8 text-[10px] text-[color:var(--color-muted-foreground)]">
          {shortcut}
        </span>
      )}
    </DropdownMenu.Item>
  );
}

function MenuSub({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger
        className={cn(
          "flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs outline-none select-none",
          "text-[color:var(--color-foreground)] hover:bg-[color:var(--color-muted)]",
          "data-[state=open]:bg-[color:var(--color-muted)]"
        )}
      >
        {label}
        <ChevronRight className="size-3 text-[color:var(--color-muted-foreground)]" />
      </DropdownMenu.SubTrigger>
      <DropdownMenu.Portal>
        <DropdownMenu.SubContent
          sideOffset={2}
          className={cn(
            "z-50 min-w-40 rounded-lg border border-[color:var(--color-border)]",
            "bg-white py-1 shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          {children}
        </DropdownMenu.SubContent>
      </DropdownMenu.Portal>
    </DropdownMenu.Sub>
  );
}

function Sep() {
  return (
    <DropdownMenu.Separator className="my-1 h-px bg-[color:var(--color-border)]" />
  );
}

// ─── MenuBar ────────────────────────────────────────────────────────────────

export function MenuBar({ editor, isFullscreen, onToggleFullscreen }: MenuBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    documentHtml,
    sourceOpen,
    previewOpen,
    toggleSource,
    togglePreview,
    openExportDialog,
    saveSnapshot,
    reset,
    loadFile,
  } = useEditorStore((s) => ({
    documentHtml: s.documentHtml,
    sourceOpen: s.sourceOpen,
    previewOpen: s.previewOpen,
    toggleSource: s.toggleSource,
    togglePreview: s.togglePreview,
    openExportDialog: s.openExportDialog,
    saveSnapshot: s.saveSnapshot,
    reset: s.reset,
    loadFile: s.loadFile,
  }));

  const hasDoc = Boolean(documentHtml.trim());
  const inTable = editor?.isActive("table") ?? false;

  function prompt(msg: string, fallback = ""): string {
    return window.prompt(msg) ?? fallback;
  }

  // ── File ──────────────────────────────────────────────────────────────────
  const fileMenu = (
    <MenuDropdown label="ไฟล์ (File)">
      <MenuItem label="เอกสารใหม่ (New)" onClick={reset} />
      <MenuItem
        label="เปิดไฟล์… (Open)"
        shortcut="Ctrl+O"
        onClick={() => fileInputRef.current?.click()}
      />
      <Sep />
      <MenuItem
        label="ส่งออก HTML"
        shortcut="Ctrl+S"
        disabled={!hasDoc}
        onClick={openExportDialog}
      />
      <MenuItem
        label="ส่งออก ZIP"
        disabled={!hasDoc}
        onClick={openExportDialog}
      />
      <MenuItem
        label="ส่งออก DOCX"
        disabled={!hasDoc}
        onClick={openExportDialog}
      />
      <Sep />
      <MenuItem
        label="บันทึก Snapshot"
        disabled={!hasDoc}
        onClick={saveSnapshot}
      />
    </MenuDropdown>
  );

  // ── Edit ──────────────────────────────────────────────────────────────────
  const editMenu = (
    <MenuDropdown label="แก้ไข (Edit)">
      <MenuItem
        label="เลิกทำ (Undo)"
        shortcut="Ctrl+Z"
        disabled={!editor?.can().undo()}
        onClick={() => editor?.chain().focus().undo().run()}
      />
      <MenuItem
        label="ทำซ้ำ (Redo)"
        shortcut="Ctrl+Y"
        disabled={!editor?.can().redo()}
        onClick={() => editor?.chain().focus().redo().run()}
      />
      <Sep />
      <MenuItem
        label="ตัด (Cut)"
        shortcut="Ctrl+X"
        onClick={() => document.execCommand("cut")}
      />
      <MenuItem
        label="คัดลอก (Copy)"
        shortcut="Ctrl+C"
        onClick={() => document.execCommand("copy")}
      />
      <MenuItem
        label="วาง (Paste)"
        shortcut="Ctrl+V"
        onClick={() => document.execCommand("paste")}
      />
      <Sep />
      <MenuItem
        label="เลือกทั้งหมด (Select All)"
        shortcut="Ctrl+A"
        disabled={!editor}
        onClick={() => editor?.commands.selectAll()}
      />
    </MenuDropdown>
  );

  // ── Insert ────────────────────────────────────────────────────────────────
  const insertMenu = (
    <MenuDropdown label="แทรก (Insert)">
      <MenuItem
        label="ลิงก์… (Link)"
        shortcut="Ctrl+K"
        disabled={!editor}
        onClick={() => {
          const url = prompt("ใส่ URL ของลิงก์:");
          if (!url) return;
          editor?.chain().focus().setLink({ href: url }).run();
        }}
      />
      <MenuItem
        label="รูปภาพ… (Image)"
        disabled={!editor}
        onClick={() => {
          const src = prompt("ใส่ URL ของรูปภาพ:");
          if (!src) return;
          editor?.chain().focus().setImage({ src }).run();
        }}
      />
      <Sep />
      <MenuItem
        label="ตาราง (Table)"
        disabled={!editor}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <MenuItem
        label="เส้นแบ่ง (Horizontal Rule)"
        disabled={!editor}
        onClick={() => editor?.chain().focus().setHorizontalRule().run()}
      />
      <Sep />
      <MenuItem
        label="บล็อกโค้ด (Code Block)"
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
      />
    </MenuDropdown>
  );

  // ── View ──────────────────────────────────────────────────────────────────
  const viewMenu = (
    <MenuDropdown label="มุมมอง (View)">
      <MenuItem
        label="ซอร์ส HTML"
        checked={sourceOpen}
        onClick={toggleSource}
      />
      <Sep />
      <MenuItem
        label="A4 Preview"
        checked={previewOpen}
        onClick={togglePreview}
      />
      <MenuItem
        label="เต็มหน้าจอ (Fullscreen)"
        shortcut="F11"
        checked={isFullscreen}
        onClick={onToggleFullscreen}
      />
    </MenuDropdown>
  );

  // ── Format ────────────────────────────────────────────────────────────────
  const formatMenu = (
    <MenuDropdown label="จัดรูปแบบ (Format)">
      <MenuSub label="รูปแบบย่อหน้า">
        <MenuItem
          label="ข้อความปกติ"
          checked={editor?.isActive("paragraph")}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        />
        <MenuItem
          label="หัวเรื่อง 1"
          checked={editor?.isActive("heading", { level: 1 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 1 }).run()
          }
        />
        <MenuItem
          label="หัวเรื่อง 2"
          checked={editor?.isActive("heading", { level: 2 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <MenuItem
          label="หัวเรื่อง 3"
          checked={editor?.isActive("heading", { level: 3 })}
          onClick={() =>
            editor?.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
      </MenuSub>
      <Sep />
      <MenuItem
        label="ตัวหนา (Bold)"
        shortcut="Ctrl+B"
        checked={editor?.isActive("bold")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      />
      <MenuItem
        label="ตัวเอียง (Italic)"
        shortcut="Ctrl+I"
        checked={editor?.isActive("italic")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      />
      <MenuItem
        label="ขีดเส้นใต้ (Underline)"
        shortcut="Ctrl+U"
        checked={editor?.isActive("underline")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <MenuItem
        label="ขีดทับ (Strikethrough)"
        checked={editor?.isActive("strike")}
        disabled={!editor}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      />
      <Sep />
      <MenuSub label="การจัดวาง (Align)">
        <MenuItem
          label="ชิดซ้าย (Left)"
          checked={editor?.isActive({ textAlign: "left" })}
          onClick={() => editor?.chain().focus().setTextAlign("left").run()}
        />
        <MenuItem
          label="กึ่งกลาง (Center)"
          checked={editor?.isActive({ textAlign: "center" })}
          onClick={() => editor?.chain().focus().setTextAlign("center").run()}
        />
        <MenuItem
          label="ชิดขวา (Right)"
          checked={editor?.isActive({ textAlign: "right" })}
          onClick={() => editor?.chain().focus().setTextAlign("right").run()}
        />
        <MenuItem
          label="กระจาย (Justify)"
          checked={editor?.isActive({ textAlign: "justify" })}
          onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
        />
      </MenuSub>
      <Sep />
      <MenuItem
        label="ล้างรูปแบบ (Clear Formatting)"
        disabled={!editor}
        onClick={() =>
          editor?.chain().focus().clearNodes().unsetAllMarks().run()
        }
      />
    </MenuDropdown>
  );

  // ── Table ─────────────────────────────────────────────────────────────────
  const tableMenu = (
    <MenuDropdown label="ตาราง (Table)">
      <MenuItem
        label="แทรกตาราง (Insert Table)"
        disabled={!editor}
        onClick={() =>
          editor
            ?.chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <Sep />
      <MenuItem
        label="เพิ่มแถวด้านบน"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addRowBefore().run()}
      />
      <MenuItem
        label="เพิ่มแถวด้านล่าง"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addRowAfter().run()}
      />
      <MenuItem
        label="ลบแถว (Delete Row)"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().deleteRow().run()}
      />
      <Sep />
      <MenuItem
        label="เพิ่มคอลัมน์ก่อนหน้า"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addColumnBefore().run()}
      />
      <MenuItem
        label="เพิ่มคอลัมน์ถัดไป"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().addColumnAfter().run()}
      />
      <MenuItem
        label="ลบคอลัมน์ (Delete Column)"
        disabled={!inTable}
        onClick={() => editor?.chain().focus().deleteColumn().run()}
      />
      <Sep />
      <MenuItem
        label="ลบตาราง (Delete Table)"
        disabled={!inTable}
        danger
        onClick={() => editor?.chain().focus().deleteTable().run()}
      />
    </MenuDropdown>
  );

  // ── Tools ─────────────────────────────────────────────────────────────────
  const toolsMenu = (
    <MenuDropdown label="เครื่องมือ (Tools)">
      <MenuItem
        label="นับคำ (Word Count)"
        disabled={!hasDoc}
        onClick={() => {
          const text = documentHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          const count = text ? text.split(" ").length : 0;
          window.alert(`จำนวนคำ: ${count.toLocaleString()} คำ`);
        }}
      />
      <Sep />
      <MenuItem
        label="ตัวเลือกการทำความสะอาด…"
        onClick={() => {
          document
            .querySelector<HTMLElement>("[data-cleaning-toolbar]")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </MenuDropdown>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.html,.htm"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) loadFile(file);
          e.target.value = "";
        }}
      />
      <nav className="flex h-8 shrink-0 items-center gap-0.5 border-b border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-2">
        {fileMenu}
        {editMenu}
        {insertMenu}
        {viewMenu}
        {formatMenu}
        {tableMenu}
        {toolsMenu}
      </nav>
    </>
  );
}
