# Modern Clean Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-paper editor view with a true multi-page canvas display — white A4 pages with subtle shadows stacked vertically on a gray background, eliminating the need for dashed-line page break overlays.

**Architecture:** Use the existing Tiptap `pageNode`/`pageBody` extensions (built in Phase 1) to render each page as a white card. Move margins from `.page-node` padding to `.page-body` padding via CSS custom properties. Restructure `EditorShell` so `PageCanvas` becomes the scrollable gray canvas wrapper.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind CSS v4, Tiptap v3, ProseMirror

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/tiptap/pageNode.ts` | Tiptap node extension — renders `.page-node` div with dimensions and margin CSS variables |
| `src/app/globals.css` | Styles for `.page-canvas`, `.page-node`, `.page-body`, `.page-number-label`, and print overrides |
| `src/components/editor/PageCanvas.tsx` | Wrapper component — gray canvas background, centers editor content, forwards ref |
| `src/components/editor/EditorShell.tsx` | Orchestrates editor chrome — restructures DOM to put `PageCanvas` as the paper wrapper |
| `src/hooks/usePagination.ts` | Hook — `goToPage()` scrolls to `.page-node` top with breathing-room offset |
| `src/components/editor/PageBreakIndicator.tsx` | **Delete** — unused component, superseded by real page nodes |

---

### Task 1: Fix `pageNode.ts` margin rendering

**Files:**
- Modify: `src/lib/tiptap/pageNode.ts:102-109`

**Why:** Current code puts margins as padding directly on `.page-node`. Because `.page-body` has `height: 100%`, the body overflows the padded parent. Moving margins to CSS custom properties lets `.page-body` apply them as its own padding, fixing the overflow.

- [ ] **Step 1: Update `renderHTML` to emit CSS variables instead of padding**

```typescript
// src/lib/tiptap/pageNode.ts — replace the return statement in renderHTML
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        class: "page-node",
        style: `width:${widthPx}px;height:${heightPx}px;--page-margin-top:${marginTopPx}px;--page-margin-right:${marginRightPx}px;--page-margin-bottom:${marginBottomPx}px;--page-margin-left:${marginLeftPx}px;`,
      }),
      0,
    ];
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tiptap/pageNode.ts
git commit -m "fix(pagination): move page margins to CSS custom properties on pageNode"
```

---

### Task 2: Update pagination styles in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Why:** `.page-node` needs white background, centered auto margins, 20px bottom gap, and a simpler shadow. `.page-body` must consume the CSS variables for padding. Print styles need `.page-node` centering.

- [ ] **Step 1: Replace `.page-node` base styles**

```css
/* ── Real-time pagination (Word-style page display) ── */
.page-canvas {
  background-color: var(--color-muted);
  min-height: 100%;
}

.page-node {
  position: relative;
  background: #fff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.10),
    0 1px 2px rgba(0, 0, 0, 0.06);
  border-radius: 2px;
  overflow: hidden;
  margin: 0 auto 20px;
}

.page-node:last-child {
  margin-bottom: 0;
}

html[data-theme="dark"] .page-node {
  background: #fff;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.35);
}
```

- [ ] **Step 2: Replace `.page-body` styles to consume CSS variables**

```css
.page-body {
  padding-top: var(--page-margin-top, 0);
  padding-right: var(--page-margin-right, 0);
  padding-bottom: var(--page-margin-bottom, 0);
  padding-left: var(--page-margin-left, 0);
  overflow: hidden;
  height: 100%;
}
```

- [ ] **Step 3: Bump page number font size to 12px**

```css
.page-number-label,
.page-node[data-page-number]::after {
  content: attr(data-page-number);
  position: absolute;
  bottom: 8px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 12px;
  color: var(--color-muted-foreground);
  pointer-events: none;
  user-select: none;
}

.page-number-label {
  content: none;
}
```

- [ ] **Step 4: Remove unused `.page-break-indicator` styles**

Delete the entire `.page-break-indicator` and `.page-break-indicator-label` rule blocks (lines ~380-415 in the current file). Also remove them from the `@media print` hide list.

- [ ] **Step 5: Add print centering for `.page-node`**

Inside `@media print`, add to the existing `.page-node` block:

```css
@media print {
  /* ... existing rules ... */

  .page-node {
    background: #fff !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    margin: 0 auto !important;
    page-break-after: always;
    break-after: page;
  }

  .page-canvas {
    padding: 0 !important;
    gap: 0 !important;
    background: transparent !important;
  }

  /* ... rest of existing rules ... */
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(ui): Modern Clean pagination styles for .page-node and .page-body"
```

---

### Task 3: Forward ref in `PageCanvas.tsx`

**Files:**
- Modify: `src/components/editor/PageCanvas.tsx`

**Why:** `EditorShell` attaches `articleRef` to the paper wrapper for `useEditorResize`. We need that ref on `PageCanvas` instead of the old `div.printable-paper`.

- [ ] **Step 1: Rewrite component with `forwardRef`**

```tsx
"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface PageCanvasProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const PageCanvas = forwardRef<HTMLDivElement, PageCanvasProps>(
  function PageCanvas({ children, className, id }, ref) {
    return (
      <div
        ref={ref}
        id={id}
        className={cn(
          "page-canvas flex flex-col items-center gap-5 py-6",
          className
        )}
      >
        {children}
      </div>
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/PageCanvas.tsx
git commit -m "feat(ui): forward ref through PageCanvas for resize observer"
```

---

### Task 4: Restructure `EditorShell.tsx`

**Files:**
- Modify: `src/components/editor/EditorShell.tsx`

**Why:** Remove the old `.printable-paper` wrapper; attach `articleRef` and `id="editor-content"` directly to `PageCanvas`; keep `className="printable-paper"` on `PageCanvas` so print visibility rules still work.

- [ ] **Step 1: Remove `PageBreakIndicator` import (if present) and the wrapper div**

In the JSX return, find this block (~line 299-308):

```tsx
<div className="relative" data-tour="editor">
  <div
    id="editor-content"
    ref={articleRef as React.RefObject<HTMLDivElement>}
    className="printable-paper"
  >
    <PageCanvas>
      <VisualEditor onEditorReady={onEditorReady} />
    </PageCanvas>
  </div>
</div>
```

Replace with:

```tsx
<div className="relative" data-tour="editor">
  <PageCanvas
    ref={articleRef as React.RefObject<HTMLDivElement>}
    id="editor-content"
    className="printable-paper"
  >
    <VisualEditor onEditorReady={onEditorReady} />
  </PageCanvas>
</div>
```

Also remove the import for `PageBreakIndicator` if it exists (it is currently unused, so it may not be imported).

- [ ] **Step 2: Commit**

```bash
git add src/components/editor/EditorShell.tsx
git commit -m "feat(ui): wire PageCanvas as the editor paper wrapper, remove printable-paper div"
```

---

### Task 5: Fix `goToPage` scroll offset

**Files:**
- Modify: `src/hooks/usePagination.ts:248-267`

**Why:** Currently scrolls to `.page-body` top. We want to scroll to the `.page-node` top and leave a 24px breathing-room offset so the page doesn't sit flush against the viewport edge.

- [ ] **Step 1: Update `goToPage` callback**

```typescript
  const goToPage = useCallback(
    (pageNumber: number) => {
      if (typeof document === "undefined") return;
      const container = scrollContainerRef?.current;
      if (!container) return;

      const nodes = document.querySelectorAll(".page-node");
      const targetNode = nodes[pageNumber - 1];
      if (!targetNode) return;

      const containerRect = container.getBoundingClientRect();
      const nodeRect = targetNode.getBoundingClientRect();
      const relativeTop =
        nodeRect.top - containerRect.top + container.scrollTop - 24;

      container.scrollTo({ top: Math.max(0, relativeTop), behavior: "smooth" });
      setCurrentPage(pageNumber);
    },
    [scrollContainerRef]
  );
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePagination.ts
git commit -m "feat(ui): scroll goToPage to .page-node top with 24px offset"
```

---

### Task 6: Delete unused `PageBreakIndicator.tsx`

**Files:**
- Delete: `src/components/editor/PageBreakIndicator.tsx`

**Why:** The component was never imported anywhere and is superseded by real `.page-node` rendering.

- [ ] **Step 1: Delete file**

```bash
git rm src/components/editor/PageBreakIndicator.tsx
git commit -m "chore(ui): remove unused PageBreakIndicator component"
```

---

### Task 7: Verify tests, build, and visual appearance

**Files:**
- Run commands in repo root

- [ ] **Step 1: Run unit tests**

```bash
npm test
```

Expected: All 193 tests pass (no test files reference `.page-node` or `PageBreakIndicator`).

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build completes with 0 errors.

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000/app` and check:

1. **Single page:** One white page centered on gray canvas, page number "1" at bottom center
2. **Multi-page:** Paste enough content to trigger pagination; verify pages stack with 20px gray gap, each has its own page number
3. **Dark mode:** Toggle dark mode; canvas goes dark, pages stay white, shadows visible
4. **Print preview:** Press Ctrl+P; verify only white pages print, no gaps, no page numbers, page breaks between pages
5. **goToPage:** Use PaginationManager or Ctrl+Page Down to navigate; verify smooth scroll to page top with offset
6. **Drag-and-drop:** Drop a .docx file onto the canvas; file loads correctly
7. **Rulers:** Horizontal ruler shows margin guides at correct positions; vertical ruler extends to full document height

- [ ] **Step 4: Commit any fixes (if needed)**

If visual verification reveals issues, fix them in small follow-up commits before finishing.

---

## Self-Review Checklist

**Spec coverage:**
- [x] White pages with subtle shadow on gray canvas → Task 2
- [x] 20px gap between pages → Task 2 (`.page-node { margin-bottom: 20px }`)
- [x] Page numbers at bottom center → Task 2 (`font-size: 12px`)
- [x] Dark mode pages stay white → Task 2 (`background: #fff` in dark)
- [x] CSS custom properties for margins → Task 1
- [x] `EditorShell` restructure → Task 4
- [x] `goToPage` scroll offset → Task 5
- [x] Remove `PageBreakIndicator` → Task 6
- [x] Print/export unaffected → Task 2 (print CSS)

**Placeholder scan:**
- [x] No "TBD", "TODO", or "implement later"
- [x] All code blocks contain exact code
- [x] All commands have expected output

**Type consistency:**
- [x] `pageNode.ts` uses same attribute names (`pageSetup`, `pageNumber`) as existing code
- [x] `usePagination.ts` keeps same `UsePaginationResult` interface
- [x] `PageCanvas` props unchanged (`children`, `className`)
