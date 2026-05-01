# Template System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-created template system to the `/app` editor — save current document (HTML + pageSetup) as a named template, manage templates in a dialog accessible via File Menu.

**Architecture:** A separate Zustand store (`templateStore.ts`) persists templates to `wordhtml-templates` localStorage key. A new `TemplatePanel.tsx` Radix Dialog handles listing, renaming, deleting, and saving templates. `FileMenu.tsx` dispatches a custom event; `EditorShell.tsx` listens and opens the panel.

**Tech Stack:** TypeScript · Zustand + persist middleware · Radix UI Dialog · Tailwind CSS v4 (CSS var tokens) · lucide-react icons · Vitest (store unit tests)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/store/templateStore.ts` | **Create** | Zustand store with persist — `DocumentTemplate[]`, CRUD actions, `panelOpen` flag |
| `src/store/templateStore.test.ts` | **Create** | Unit tests for store actions |
| `src/components/editor/TemplatePanel.tsx` | **Create** | Radix Dialog — list + inline rename + delete + save-as-template footer |
| `src/components/editor/menu/FileMenu.tsx` | **Modify** | Add "เปิดจาก Template…" menu item dispatching `wordhtml:open-templates` |
| `src/components/editor/EditorShell.tsx` | **Modify** | Add event listener for `wordhtml:open-templates` + render `<TemplatePanel />` |

---

## Task 1: Create `src/store/templateStore.ts`

**Files:**
- Create: `src/store/templateStore.ts`
- Create: `src/store/templateStore.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/store/templateStore.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { useTemplateStore } from "./templateStore";

const defaultPageSetup = {
  size: "A4" as const,
  orientation: "portrait" as const,
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

describe("templateStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useTemplateStore.setState({ templates: [], panelOpen: false });
  });

  it("saveTemplate adds a template with correct shape", () => {
    useTemplateStore.getState().saveTemplate("หนังสือราชการ", "<p>test</p>", defaultPageSetup);
    const { templates } = useTemplateStore.getState();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("หนังสือราชการ");
    expect(templates[0].html).toBe("<p>test</p>");
    expect(templates[0].pageSetup).toEqual(defaultPageSetup);
    expect(templates[0].id).toBeDefined();
    expect(templates[0].createdAt).toBeDefined();
  });

  it("saveTemplate prepends — newest template is first", () => {
    useTemplateStore.getState().saveTemplate("Template A", "<p>a</p>", defaultPageSetup);
    useTemplateStore.getState().saveTemplate("Template B", "<p>b</p>", defaultPageSetup);
    const { templates } = useTemplateStore.getState();
    expect(templates[0].name).toBe("Template B");
    expect(templates[1].name).toBe("Template A");
  });

  it("renameTemplate updates name, leaves other fields unchanged", () => {
    useTemplateStore.getState().saveTemplate("Old Name", "<p>x</p>", defaultPageSetup);
    const id = useTemplateStore.getState().templates[0].id;
    useTemplateStore.getState().renameTemplate(id, "New Name");
    const { templates } = useTemplateStore.getState();
    expect(templates[0].name).toBe("New Name");
    expect(templates[0].html).toBe("<p>x</p>");
  });

  it("deleteTemplate removes the matching template by id", () => {
    useTemplateStore.getState().saveTemplate("To Delete", "<p>d</p>", defaultPageSetup);
    const id = useTemplateStore.getState().templates[0].id;
    useTemplateStore.getState().deleteTemplate(id);
    expect(useTemplateStore.getState().templates).toHaveLength(0);
  });

  it("openPanel / closePanel toggle panelOpen", () => {
    expect(useTemplateStore.getState().panelOpen).toBe(false);
    useTemplateStore.getState().openPanel();
    expect(useTemplateStore.getState().panelOpen).toBe(true);
    useTemplateStore.getState().closePanel();
    expect(useTemplateStore.getState().panelOpen).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
npx vitest run src/store/templateStore.test.ts
```

Expected: error — `Cannot find module './templateStore'`

- [ ] **Step 3: Create `src/store/templateStore.ts`**

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PageSetup } from "./editorStore";

export interface DocumentTemplate {
  id: string;
  name: string;
  createdAt: string;
  html: string;
  pageSetup: PageSetup;
}

interface TemplateState {
  templates: DocumentTemplate[];
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  saveTemplate: (name: string, html: string, pageSetup: PageSetup) => void;
  renameTemplate: (id: string, name: string) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      templates: [],
      panelOpen: false,

      openPanel: () => set({ panelOpen: true }),
      closePanel: () => set({ panelOpen: false }),

      saveTemplate: (name, html, pageSetup) =>
        set((state) => ({
          templates: [
            {
              id: crypto.randomUUID(),
              name,
              createdAt: new Date().toISOString(),
              html,
              pageSetup,
            },
            ...state.templates,
          ],
        })),

      renameTemplate: (id, name) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, name } : t
          ),
        })),

      deleteTemplate: (id) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        })),
    }),
    {
      name: "wordhtml-templates",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
npx vitest run src/store/templateStore.test.ts
```

Expected: `5 tests passed`

- [ ] **Step 5: Commit**

```bash
git add src/store/templateStore.ts src/store/templateStore.test.ts
git commit -m "feat(templates): add templateStore with persist"
```

---

## Task 2: Create `src/components/editor/TemplatePanel.tsx`

**Files:**
- Create: `src/components/editor/TemplatePanel.tsx`

No automated test — UI component. Manual verification in Task 5.

- [ ] **Step 1: Create `src/components/editor/TemplatePanel.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { BookmarkPlus, FileText, Pencil, Trash2, X } from "lucide-react";

import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TemplatePanel() {
  const open = useTemplateStore((s) => s.panelOpen);
  const closePanel = useTemplateStore((s) => s.closePanel);
  const templates = useTemplateStore((s) => s.templates);
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);
  const renameTemplate = useTemplateStore((s) => s.renameTemplate);
  const deleteTemplate = useTemplateStore((s) => s.deleteTemplate);

  const documentHtml = useEditorStore((s) => s.documentHtml);
  const pageSetup = useEditorStore((s) => s.pageSetup);
  const setHtml = useEditorStore((s) => s.setHtml);
  const setPageSetup = useEditorStore((s) => s.setPageSetup);
  const setFileName = useEditorStore((s) => s.setFileName);

  const [saveName, setSaveName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const hasDoc = documentHtml.trim().length > 0;

  function handleLoad(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    if (
      hasDoc &&
      !window.confirm(
        "โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?"
      )
    ) {
      return;
    }
    setHtml(template.html);
    setPageSetup(template.pageSetup);
    setFileName(template.name);
    closePanel();
  }

  function handleSave() {
    const name = saveName.trim();
    if (!name || !hasDoc) return;
    saveTemplate(name, documentHtml, pageSetup);
    setSaveName("");
  }

  function handleRenameStart(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
  }

  function handleRenameCommit(id: string) {
    const name = renameValue.trim();
    if (name) renameTemplate(id, name);
    setRenamingId(null);
  }

  function handleRenameAbort() {
    setRenamingId(null);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && closePanel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(560px,92vw)] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-background)] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.35)]"
          aria-describedby={undefined}
        >
          <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--color-border)] px-6 py-4">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-[color:var(--color-muted-foreground)]" />
              <Dialog.Title className="text-base font-semibold tracking-tight">
                Template ของฉัน
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              className="grid h-8 w-8 place-items-center rounded-md text-[color:var(--color-muted-foreground)] transition-colors hover:bg-[color:var(--color-muted)] hover:text-[color:var(--color-foreground)]"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto">
            {templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <FileText className="size-10 text-[color:var(--color-border-strong)]" />
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  ยังไม่มี Template
                </p>
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  บันทึกเอกสารปัจจุบันเป็น Template ด้านล่าง
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)]">
                {templates.map((t) => (
                  <TemplateRow
                    key={t.id}
                    name={t.name}
                    createdAt={t.createdAt}
                    pageSize={t.pageSetup.size}
                    isRenaming={renamingId === t.id}
                    renameValue={renameValue}
                    onRenameValueChange={setRenameValue}
                    onLoad={() => handleLoad(t.id)}
                    onRenameStart={() => handleRenameStart(t.id, t.name)}
                    onRenameCommit={() => handleRenameCommit(t.id)}
                    onRenameAbort={handleRenameAbort}
                    onDelete={() => deleteTemplate(t.id)}
                  />
                ))}
              </ul>
            )}
          </div>

          <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-muted)] px-6 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--color-muted-foreground)]">
              บันทึกเอกสารปัจจุบันเป็น Template
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="ตั้งชื่อ template…"
                className="flex-1 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={!saveName.trim() || !hasDoc}
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-foreground)] px-4 py-2 text-sm font-medium text-[color:var(--color-background)] transition-colors disabled:opacity-40"
              >
                <BookmarkPlus className="size-3.5" />
                บันทึก
              </button>
            </div>
            {!hasDoc && (
              <p className="mt-1.5 text-[11px] text-[color:var(--color-muted-foreground)]">
                เปิดหรือสร้างเอกสารก่อนบันทึก template
              </p>
            )}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface TemplateRowProps {
  name: string;
  createdAt: string;
  pageSize: "A4" | "Letter";
  isRenaming: boolean;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onLoad: () => void;
  onRenameStart: () => void;
  onRenameCommit: () => void;
  onRenameAbort: () => void;
  onDelete: () => void;
}

function TemplateRow({
  name,
  createdAt,
  pageSize,
  isRenaming,
  renameValue,
  onRenameValueChange,
  onLoad,
  onRenameStart,
  onRenameCommit,
  onRenameAbort,
  onDelete,
}: TemplateRowProps) {
  // Tracks whether Escape was pressed so onBlur doesn't commit after abort.
  const escapedRef = useRef(false);

  return (
    <li className="group flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[color:var(--color-muted)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--color-foreground)] text-[10px] font-bold text-[color:var(--color-background)]">
        {pageSize === "A4" ? "A4" : "Ltr"}
      </div>

      <div className="min-w-0 flex-1">
        {isRenaming ? (
          <input
            autoFocus
            type="text"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                escapedRef.current = false;
                onRenameCommit();
              }
              if (e.key === "Escape") {
                escapedRef.current = true;
                onRenameAbort();
              }
            }}
            onBlur={() => {
              if (!escapedRef.current) onRenameCommit();
              escapedRef.current = false;
            }}
            className="w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-background)] px-2 py-0.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[color:var(--color-foreground)]"
          />
        ) : (
          <button
            type="button"
            onClick={onLoad}
            className="block w-full truncate text-left text-sm font-medium hover:underline"
          >
            {name}
          </button>
        )}
        <p className="mt-0.5 text-xs text-[color:var(--color-muted-foreground)]">
          {formatDate(createdAt)}
        </p>
      </div>

      {!isRenaming && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <RowBtn label="เปลี่ยนชื่อ" onClick={onRenameStart}>
            <Pencil className="size-3.5" />
          </RowBtn>
          <RowBtn label="ลบ" onClick={onDelete} danger>
            <Trash2 className="size-3.5" />
          </RowBtn>
        </div>
      )}
    </li>
  );
}

interface RowBtnProps {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}

function RowBtn({ label, onClick, danger, children }: RowBtnProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-7 w-7 place-items-center rounded-md transition-colors",
        danger
          ? "text-[color:var(--color-muted-foreground)] hover:bg-red-100 hover:text-red-600"
          : "text-[color:var(--color-muted-foreground)] hover:bg-[color:var(--color-border)] hover:text-[color:var(--color-foreground)]"
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Verify TypeScript sees no errors in this file**

```bash
npx tsc --noEmit 2>&1 | grep -i "TemplatePanel\|templateStore"
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/TemplatePanel.tsx
git commit -m "feat(templates): add TemplatePanel dialog component"
```

---

## Task 3: Modify `src/components/editor/menu/FileMenu.tsx`

**Files:**
- Modify: `src/components/editor/menu/FileMenu.tsx`

- [ ] **Step 1: Add "เปิดจาก Template…" menu item**

Replace the entire file content with:

```tsx
"use client";

import type { Editor } from "@tiptap/react";

import { useEditorStore } from "@/store/editorStore";
import { MenuDropdown, MenuItem, Sep } from "./primitives";

export interface EditorMenuProps {
  editor: Editor | null;
}

export function FileMenu(_props: EditorMenuProps) {
  const documentHtml = useEditorStore((s) => s.documentHtml);
  const reset = useEditorStore((s) => s.reset);
  const triggerFileOpen = useEditorStore((s) => s.triggerFileOpen);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);
  const saveSnapshot = useEditorStore((s) => s.saveSnapshot);

  const hasDoc = documentHtml.trim().length > 0;

  return (
    <MenuDropdown label="ไฟล์ (File)">
      <MenuItem
        label="เอกสารใหม่ (New)"
        shortcut="Ctrl+Shift+N"
        onClick={reset}
      />
      <MenuItem label="เปิดไฟล์… (Open)" onClick={triggerFileOpen} />
      <MenuItem
        label="เปิดจาก Template…"
        onClick={() =>
          window.dispatchEvent(new CustomEvent("wordhtml:open-templates"))
        }
      />
      <Sep />
      <MenuItem
        label="ส่งออก HTML"
        shortcut="Ctrl+S"
        disabled={!hasDoc}
        onClick={() => openExportDialog("html")}
      />
      <MenuItem
        label="ส่งออก ZIP"
        disabled={!hasDoc}
        onClick={() => openExportDialog("zip")}
      />
      <MenuItem
        label="ส่งออก DOCX"
        disabled={!hasDoc}
        onClick={() => openExportDialog("docx")}
      />
      <MenuItem
        label="ส่งออก Markdown"
        disabled={!hasDoc}
        onClick={() => openExportDialog("md")}
      />
      <Sep />
      <MenuItem
        label="บันทึก Snapshot"
        shortcut="Ctrl+Shift+S"
        disabled={!hasDoc}
        onClick={saveSnapshot}
      />
    </MenuDropdown>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep FileMenu
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/editor/menu/FileMenu.tsx
git commit -m "feat(templates): add 'เปิดจาก Template…' item to File Menu"
```

---

## Task 4: Modify `src/components/editor/EditorShell.tsx`

**Files:**
- Modify: `src/components/editor/EditorShell.tsx`

- [ ] **Step 1: Add two imports**

After the existing import block at the top of the file, add:

```tsx
import { TemplatePanel } from "./TemplatePanel";
import { useTemplateStore } from "@/store/templateStore";
```

Place them after the `PageSetupDialog` import line. The updated import block becomes:

```tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { Editor } from "@tiptap/react";

import { TopBar } from "./TopBar";
import { MenuBar } from "./MenuBar";
import { CleaningToolbar } from "./CleaningToolbar";
import { VisualEditor } from "./VisualEditor";
import { A4Preview } from "./A4Preview";
import { ExportDialog } from "./ExportDialog";
import { SearchPanel } from "./SearchPanel";
import { PageSetupDialog } from "./PageSetupDialog";
import { TemplatePanel } from "./TemplatePanel";
import { MobileBlock } from "@/components/MobileBlock";
import { useEditorStore } from "@/store/editorStore";
import { useTemplateStore } from "@/store/templateStore";
import { cn } from "@/lib/utils";
```

- [ ] **Step 2: Extend the custom-event `useEffect` to handle `wordhtml:open-templates`**

Find the existing `useEffect` (around line 63) that adds `wordhtml:open-search` and `wordhtml:open-page-setup` listeners. Replace it with:

```tsx
useEffect(() => {
  const onSearch = () => setSearchOpen(true);
  const onPageSetup = () => setPageSetupOpen(true);
  const onTemplates = () => useTemplateStore.getState().openPanel();
  window.addEventListener("wordhtml:open-search", onSearch);
  window.addEventListener("wordhtml:open-page-setup", onPageSetup);
  window.addEventListener("wordhtml:open-templates", onTemplates);
  return () => {
    window.removeEventListener("wordhtml:open-search", onSearch);
    window.removeEventListener("wordhtml:open-page-setup", onPageSetup);
    window.removeEventListener("wordhtml:open-templates", onTemplates);
  };
}, []);
```

- [ ] **Step 3: Add `<TemplatePanel />` to the JSX**

Find the line `<ExportDialog />` near the bottom of the returned JSX and add `<TemplatePanel />` directly after it:

```tsx
        <ExportDialog />
        <TemplatePanel />
        <SearchPanel
          editor={editor}
          open={searchOpen}
          onClose={() => setSearchOpen(false)}
        />
        <PageSetupDialog
          open={pageSetupOpen}
          onClose={() => setPageSetupOpen(false)}
        />
```

- [ ] **Step 4: Verify full TypeScript build passes**

```bash
npx tsc --noEmit
```

Expected: exit 0, no errors

- [ ] **Step 5: Commit**

```bash
git add src/components/editor/EditorShell.tsx
git commit -m "feat(templates): wire TemplatePanel into EditorShell"
```

---

## Task 5: Smoke Test & Final Build Verify

No file changes — manual testing and build gate.

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Open `http://localhost:3000/app`

- [ ] **Step 2: Verify File Menu entry**

Click "ไฟล์ (File)" → confirm "เปิดจาก Template…" appears between "เปิดไฟล์…" and the separator line.

- [ ] **Step 3: Verify empty state**

Click "เปิดจาก Template…" → dialog opens → confirm:
- Title shows "Template ของฉัน"
- Empty-state icon + "ยังไม่มี Template" + hint text visible
- Footer save input + "บันทึก" button visible (button disabled, no content)

- [ ] **Step 4: Save a template**

1. Type some text in the editor
2. Open template dialog
3. Type "หนังสือราชการ กฟส.วว." in the name input
4. Click "บันทึก"

Confirm:
- Template row appears with name + today's date + A4 badge
- Save input clears after save
- No error in browser console

- [ ] **Step 5: Persist across reload**

Reload the page. Open template dialog. Confirm the template is still listed (stored in `wordhtml-templates` localStorage key).

- [ ] **Step 6: Load into empty editor**

After reload the editor is blank. Click the template name in the dialog row.

Confirm:
- No `window.confirm()` appears (editor was empty)
- Editor fills with the saved HTML
- TopBar filename changes to "หนังสือราชการ กฟส.วว."
- Dialog closes automatically

- [ ] **Step 7: Load when editor has content (discard confirm)**

Type new text in the editor so it has content. Open dialog, click the template row.

Confirm:
- `window.confirm()` appears with message "โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?"
- Click Cancel → dialog stays open, editor unchanged
- Click OK → editor replaced, TopBar updated, dialog closes

- [ ] **Step 8: Rename — Enter to commit**

Hover a template row → click pencil icon → input appears with current name → edit the name → press Enter.
Confirm new name shows in the list.

- [ ] **Step 9: Rename — Escape to abort**

Hover → click pencil → change text → press Escape.
Confirm original name is preserved (rename aborted, no change).

- [ ] **Step 10: Rename — click away to commit**

Hover → click pencil → edit name → click somewhere outside the input.
Confirm new name committed.

- [ ] **Step 11: Delete**

Hover a template row → click trash icon.
Confirm template disappears. If it was the only one, empty state re-appears.

- [ ] **Step 12: Run all tests**

```bash
npx vitest run
```

Expected: all tests pass (112 tests — 107 existing + 5 new templateStore tests)

- [ ] **Step 13: Production build**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors
