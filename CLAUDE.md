# CLAUDE.md — wordhtml

> Project guide for Claude Code working in this repository.

## What this is

**wordhtml** is a static Next.js 16 web app that converts Word (`.docx`) ↔ HTML in the browser, with a WYSIWYG A4-paper editor and configurable cleaning options. It is a redesigned clone of [wordhtml.com](https://wordhtml.com/), built fresh with a "Modern Productivity" aesthetic (Linear / Vercel / Notion influence).

Everything runs **client-side** — no API routes, no server processing. The site is exported as static HTML/CSS/JS and can be deployed to Vercel, Netlify, Cloudflare Pages, or any static host.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # produces ./out — static export
npm test             # vitest run (193 tests across 15 files)
npm run lint
```

## Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | `output: "export"` for static deploy |
| Language | **TypeScript** | strict mode |
| Styling | **Tailwind CSS v4** | tokens defined in `src/app/globals.css` via `@theme inline` |
| Editor | **Tiptap v3** | StarterKit + Underline + Link + ImageWithAlign + Placeholder + TextAlign + Color + Highlight + Table + Subscript + Superscript + TaskList + FontFamily + TextStyle + FontSize (custom mark) + SearchAndReplace + custom ParagraphFormatExtension (indent + spacing) |
| Find/Replace | `@sereneinserenade/tiptap-search-and-replace` | community pkg via `--legacy-peer-deps` |
| State | **Zustand** | `src/store/editorStore.ts`; cleaner prefs / pageSetup / history persisted to localStorage |
| docx → HTML | **mammoth.js** | uses package `browser` field; ambient types in `src/types/mammoth.d.ts` |
| HTML → docx | **html-docx-js** | UMD altchunks approach; dynamically imported |
| HTML → markdown | **turndown** | with custom GFM-table rule |
| ZIP packaging | **JSZip** | for ZIP exports with extracted images |
| Icons | **lucide-react** | |
| Math | **KaTeX** | Tiptap Node extension with `data-latex`; inline + block |
| PDF export | **html2pdf.js** | client-side rasterized PDF with A4/Letter margins |
| E2E | **Playwright** | `tests/e2e/*.spec.ts`; auto-runs `npm run dev` |
| Tests | **Vitest** + **jsdom** | `*.test.ts` colocated next to source |

> **Heads-up:** This is **Next.js 16** — APIs and conventions can differ from older training data. Read `node_modules/next/dist/docs/01-app/...` before introducing patterns from earlier versions.

## File structure

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # root layout, fonts, metadata
│   ├── globals.css               # Tailwind + design tokens + .prose-editor / .paper +
│   │                             # image-align styles + ruler styles + print stylesheet
│   ├── page.tsx                  # / landing
│   ├── app/page.tsx              # /app editor
│   └── help/page.tsx             # /help docs
├── components/
│   ├── editor/
│   │   ├── EditorShell.tsx       # outer shell — owns A4 paper grid (corner + H/V ruler +
│   │   │                         #   article.paper), FormattingToolbar, drag-drop,
│   │   │                         #   beforeunload, keyboard, search panel, page-setup dialog
│   │   ├── TopBar.tsx            # logo + filename + history/upload/export
│   │   ├── MenuBar.tsx           # 7-menu nav, slim composition
│   │   ├── menu/
│   │   │   ├── primitives.tsx    # MenuDropdown, MenuItem, MenuSub, Sep
│   │   │   ├── FileMenu.tsx      # New, Open, Export HTML/ZIP/DOCX/MD, Snapshot
│   │   │   ├── EditMenu.tsx      # Undo/Redo/Copy-as-HTML/Select All
│   │   │   ├── InsertMenu.tsx    # Link, Image upload/URL, Table, HR, Soft Break, Code, Variable
│   │   │   ├── ViewMenu.tsx      # Source HTML, Fullscreen
│   │   │   ├── FormatMenu.tsx    # paragraph, B/I/U/Strike, Sub/Sup/Code,
│   │   │   │                     #   Align submenu, Font submenu, Font Size submenu, Paragraph dialog, Clear Formatting
│   │   │   ├── TableMenu.tsx     # Insert Table, row/column ops, Delete Table
│   │   │   └── ToolsMenu.tsx     # Word Count, Find/Replace, Page Setup, Cleaning
│   │   ├── CleaningToolbar.tsx   # cleaner pills row
│   │   ├── VisualEditor.tsx      # Tiptap editor setup + EditorContent + EmptyHint only
│   │   │                         #   (no outer container — rendered inside article.paper)
│   │   ├── FormattingToolbar.tsx # icon toolbar — image-aware align/size, sub/sup, code, font, paragraph dialog
│   │   ├── ParagraphDialog.tsx   # Word-style Paragraph dialog: indents + spacing
│   │   ├── FontSelector.tsx      # Font family dropdown (TH Sarabun, Noto Sans Thai, etc.)
│   │   ├── FontSizeSelector.tsx  # Font size dropdown (10-36px)
│   │   ├── Ruler.tsx             # H/V cm rulers with margin guides (PX_PER_CM=37.81).
│   │   │                         #   Vertical ruler auto-extends to content height via ResizeObserver.
│   │   │                         #   Horizontal ruler has draggable margin handles (left/right)
│   │   │                         #   + indent triangles (left/first-line).
│   │   ├── SearchPanel.tsx       # Ctrl+F floating Find & Replace panel
│   │   ├── PageSetupDialog.tsx   # A4/Letter, portrait/landscape, margins
│   │   ├── ExportDialog.tsx      # 5-format download (HTML/ZIP/DOCX/MD/PDF) + cleaner preview
│   │   ├── UploadButton.tsx      # listens "wordhtml:open-file" event
│   │   ├── HistoryPanel.tsx      # snapshot list with restore/duplicate/delete
│   │   ├── MathInputDialog.tsx   # KaTeX LaTeX equation editor (Ctrl+Shift+M)
│   │   ├── SourcePane.tsx        # HTML source editor panel
│   │   ├── TemplatePreview.tsx   # processed template preview for preview mode
│   │   ├── PaginationManager.tsx # page navigation: total/current + goToPage controls
│   │   ├── PageCanvas.tsx        # multi-page container: gray canvas + stacked white A4 pages
│   │   ├── PageWrapper.tsx       # single page wrapper: shadow, page number, margin CSS vars
│   │   └── IndentRuler.tsx       # horizontal ruler with indent handles (extracted from EditorShell)
│   ├── landing/                  # Hero, Features, HowItWorks, Footer, Header
│   ├── help/                     # FAQ, CleanerExplainers, PasteTips
│   ├── ui/Button.tsx             # primary button primitive (cva variants)
│   └── MobileBlock.tsx           # < 768px overlay
├── lib/
│   ├── conversion/
│   │   ├── docxToHtml.ts         # mammoth wrapper; warnings: MammothMessage[]
│   │   ├── loadHtmlFile.ts       # .html file reader + cleanup
│   │   └── pasteCleanup.ts       # strip Word/Office mso-* artifacts
│   ├── cleaning/
│   │   ├── cleaners.ts           # 9 pure HTML cleaners (incl. unwrapDeprecatedTags)
│   │   ├── pipeline.ts           # ordered apply + plainText terminal
│   │   ├── cleaners.test.ts
│   │   └── pipeline.test.ts
│   ├── export/
│   │   ├── exportHtml.ts
│   │   ├── exportZip.ts          # JSZip + extracted images
│   │   ├── exportDocx.ts         # html-docx-js (dynamic import)
│   │   ├── exportPdf.ts          # html2pdf.js client-side PDF generation
│   │   ├── exportMarkdown.ts     # turndown wrapper with GFM tables (+ tests)
│   │   ├── stripPaginationWrappers.ts # strip .page-node/.page-body wrappers before export
│   │   └── wrap.ts               # wrapAsDocument({ title, pageSetup }), @page CSS
│   ├── pagination/
│   │   ├── engine.ts             # PaginationEngine: ResizeObserver + overflow detection
│   │   └── splitter.ts           # ProseMirror transaction builders for page splits
│   ├── tiptap/
│   │   ├── paragraphFormat.ts    # ParagraphFormatExtension: marginLeft/Right, textIndent,
│   │   │                         #   spaceBefore/After, lineHeight/lineHeightMode
│   │   ├── fontSize.ts           # Custom Mark for inline font-size spans
│   │   ├── indentExtension.ts    # (legacy) replaced by paragraphFormat.ts
│   │   ├── pageNode.ts           # PageNode block: pageHeader? pageBody pageFooter?
│   │   ├── pageBody.ts           # PageBodyNode measurable content container
│   │   ├── pageHeader.ts         # Placeholder header node (Phase 2)
│   │   ├── pageFooter.ts         # Placeholder footer node (Phase 2)
│   │   ├── pageCommands.ts       # insertPage, splitPage, mergePage, setPageSetup
│   │   ├── pageBreak.ts          # Block-level page break node
│   │   ├── variableMark.ts       # Template variable {{name}} mark
│   │   ├── repeatingRow.ts       # Table row with data-repeat attrs
│   │   ├── headingWithId.ts      # Heading with preserved id attr
│   │   ├── bulletListWithClass.ts# BulletList with preserved class attr
│   │   ├── imageWithAlign.ts     # Image extension extended with align/width attrs
│   │   └── mathEquation.ts       # KaTeX Node extension (inline + block LaTeX)
│   ├── onboarding/
│   │   └── Tour.tsx              # driver.js 5-step onboarding spotlight tour
│   ├── images.ts                 # extract base64 <img> → File[] for ZIP
│   ├── page.ts                   # A4/LETTER constants + mmToPx (shared by EditorShell & Ruler)
│   ├── text.ts                   # plainTextFromHtml, Thai-aware countWords (+ tests)
│   └── utils.ts                  # cn() — clsx + tailwind-merge
├── hooks/
│   ├── useEditorResize.ts       # ResizeObserver on article; returns contentHeight
│   ├── useOnboarding.ts         # localStorage-backed tour state (start/skip/reset)
│   ├── usePagination.ts         # Wires PaginationEngine to editor; returns pageCount/currentPage/goToPage
│   └── useVirtualScroll.ts      # IntersectionObserver + content-visibility for >5 pages
├── store/editorStore.ts          # Zustand global store
└── types/
    ├── index.ts                  # CleanerKey, CLEANERS, ImageMode,
    │                             #   ExportFormat ("html"|"zip"|"docx"|"md")
    ├── mammoth.d.ts              # ambient types
    └── html-docx-js.d.ts         # ambient types
```

## Editor store (`src/store/editorStore.ts`)

Persists to localStorage under `wordhtml-editor`. `partialize` whitelists:
- `enabledCleaners` — user's cleaner preferences
- `imageMode` — `"inline"` vs `"separate"` for ZIP export
- `history` — up to 20 `DocumentSnapshot[]`, with 4MB total size guard
- `pageSetup` — `{ size, orientation, marginMm }`

Session-scoped (not persisted): `documentHtml`, `sourceOpen`, `pendingExportFormat`, `lastLoadWarnings`, `lastEditAt`.

Auto-snapshot: `setHtml` debounces 2 minutes idle and saves a snapshot if HTML differs from the most recent.

## Architecture conventions

- **No server code.** All conversion, cleaning, and exporting happens in `'use client'` components or in pure-function libraries called from them. Do not introduce API routes, Server Actions, or `'use server'` blocks.
- **Store as single source of truth for editor state.** UI components read with separate selectors (`useEditorStore((s) => s.x)`) — avoid destructuring the whole store, which causes unnecessary re-renders. The `MenuBar` perf bug from history was exactly this pattern.
- **Cleaners are pure.** Each cleaner takes an HTML string and returns a new one. They use `DOMParser`, which is a browser API and also available under jsdom for tests.
- **Cleaners apply only at export.** Editing should stay snappy; the paper editor shows the *current* document, not the cleaned-for-export version.
- **Document never persists.** localStorage holds only preferences (cleaners, imageMode, pageSetup) and history snapshots. The current document is gone on reload — by design, for privacy. `beforeunload` warns if there are unsaved changes (current HTML differs from latest snapshot).
- **UI toggles are session-scoped.** `sourceOpen` (HTML source pane) and `isFullscreen` reset on reload.
- **History is local-only.** Up to 20 document snapshots in localStorage. Auto-snapshot fires after 2 min idle. Total serialized size is capped at 4MB; oldest snapshots are dropped first.
- **Templates are local-only.** Up to 50 document templates in localStorage (`wordhtml-templates`). Each stores `id`, `name`, `createdAt`, `html`, `pageSetup`. Export downloads all as JSON; import reads JSON and merges (skips duplicate `id`).
- **Cleaner order matters.** See `src/lib/cleaning/pipeline.ts` — comments → styles → classes → attributes → **unwrapDeprecatedTags** → unwrapSpans → empty tags → spaces → (terminal) plainText.
- **Editor reactivity for menus.** Menu components that show active/disabled states based on cursor position (e.g., `FormatMenu`, `EditMenu`) use `useEditorState` from `@tiptap/react` to subscribe to selection changes. Without it, checkmarks go stale.
- **Cross-component coordination via custom events.** Menu items dispatch `wordhtml:open-search`, `wordhtml:open-page-setup`, `wordhtml:open-file` on `window`. `EditorShell` and `UploadButton` listen. Avoids passing dialog state through props.

## Design system

Tokens live in `src/app/globals.css` under `@theme inline`. Tailwind v4 picks them up automatically as `bg-background`, `text-foreground`, etc.

- **Palette:** zinc-based monochrome (`#fafafa` / `#18181b`) with success green and danger red. Dark mode supported via `html[data-theme="dark"]`; `.paper` uses `--color-paper` token (`#1f1f23` in dark) to remain distinct from the canvas. Print stylesheet forces white paper regardless of theme.
- **Type:** Geist Sans for UI and body, Geist Mono for code/terminal surfaces. Font menu also offers TH Sarabun PSK, Sarabun, Noto Sans Thai, Kanit, Prompt, system-ui, serif, monospace.
- **Radius:** 4 / 6 / 8 / 12 / 16 px (`--radius-xs` … `--radius-xl`).
- **Editor IS the paper.** The Tiptap `EditorContent` renders inside `PageCanvas`, which replaces the old single `<article class="paper">` wrapper. Each page is a `PageWrapper` containing a `page-node > page-body` structure. `.prose-editor` and `.paper` share the same typography rules in `globals.css` so exports look identical to what you type.
- **A4 dimensions:** 794×1123 px @ 96 DPI = 210×297 mm. Conversion `1 cm = 794/21 ≈ 37.81 px` — see `src/lib/page.ts`. Letter is 215.9×279.4 mm. Page setup drives the paper padding and the print stylesheet.
- **Ruler:** 18 px wide/tall, ticks every 0.5 cm, labels at every 1 cm, faint red guides at margin start/end.
  - Vertical ruler auto-extends to full content height (multi-page docs) via `ResizeObserver` on `<article>`.
  - Horizontal ruler has draggable grey square handles at left/right margin guides (adjusts page margins in mm).
  - Indent triangles (▽ blue for left indent, △ purple for first-line indent) drag to set paragraph indents.
- **i18n style:** Thai labels primary, English in parentheses. Example: `"ไฟล์ (File)"`, `"ตัวหนา (Bold)"`. Keep this consistent for any new menu/toolbar item.

## Paragraph Formatting (Word-style)

Implemented via `ParagraphFormatExtension` (`src/lib/tiptap/paragraphFormat.ts`) — a Tiptap Extension with `addGlobalAttributes()` targeting `paragraph` and `heading` nodes.

**Indents:**
- `marginLeft` (cm) → `style="margin-left:Xcm"`
- `marginRight` (cm) → `style="margin-right:Xcm"`
- `textIndent` (cm) → positive = first-line indent, negative = hanging indent

**Spacing:**
- `spaceBefore` (pt) → `style="margin-top:Xpt"`
- `spaceAfter` (pt) → `style="margin-bottom:Xpt"`
- `lineHeightMode` + `lineHeight` → `style="line-height:X"`
  - `single` → 1.15, `oneHalf` → 1.5, `double` → 2
  - `atLeast`/`exactly` → value in pt, `multiple` → multiplier

**UI:**
- `ParagraphDialog.tsx` — Radix Dialog with two fieldsets: "เยื้อง (Indents)" and "ระยะห่าง (Spacing)"
- Accessible from: FormattingToolbar icon (between Align and List), FormatMenu → "ย่อหน้า... (Paragraph...)"
- Dialog reads current node attrs from cursor position and applies via `editor.commands.setParagraphFormat()`

**Default font:** New empty documents auto-apply `THSarabunPSK` (with Google Font `Sarabun` fallback) via `useEffect` in `VisualEditor.tsx`.

## Keyboard shortcuts

Wired in `EditorShell.tsx`:

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save snapshot + open Export dialog (if doc has content) |
| Ctrl+Shift+S | Save snapshot only (no dialog) |
| Ctrl+O | Open file picker |
| Ctrl+Shift+N | Reset to new document |
| Ctrl+F | Toggle Find & Replace panel |
| Ctrl+K | Insert link prompt |
| Ctrl+Shift+M | Open math equation dialog |
| Ctrl+P | Print (A4 preview only via `@media print`) |
| F11 | Toggle fullscreen |

Tiptap StarterKit handles: Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+A, Ctrl+E (inline code).
ParagraphFormatExtension handles: Tab (block indent +0.5cm, or sink list), Shift+Tab (block indent -0.5cm, or lift list).
VisualEditor.tsx handles: Tab (insert 4 spaces at cursor), Backspace (delete 4-space tab block), Ctrl+Enter (insert page break node).

## Recent Changes & Known Issues

### Phase 1 — Stability (2026-05-14)
1. **Paste + Enter bug fixed** — `pasteCleanup.ts` now unwraps semantic container elements (`<section>`, `<article>`, `<main>`, `<header>`, `<footer>`, `<aside>`, `<nav>`) that previously caused Tiptap paragraph splitting to fail after paste.
2. **E2E smoke tests** — Playwright tests for app load, typing, export dialog, and .docx upload (`tests/e2e/smoke.spec.ts`).
3. **GitHub Actions CI** — `.github/workflows/ci.yml` runs lint + unit tests + build + E2E on push/PR to `master`.

### Phase 2 — Advanced Features (2026-05-14)
4. **KaTeX math equations** — Tiptap Node extension with `MathInputDialog` (Ctrl+Shift+M). Supports inline and block LaTeX. Rendered via KaTeX in editor and exports.
5. **PDF export** — Client-side PDF generation via `html2pdf.js` with A4/Letter margins, fonts, and image support. Added as 5th export format.
6. **EditorShell refactor** — Extracted `IndentRuler`, `TemplatePreview`, `SourcePane` into standalone files. Reduced `EditorShell.tsx` from 495 to 376 lines.

### Phase 3 — Polish (2026-05-14)
7. **Onboarding tour** — 5-step `driver.js` spotlight tour auto-starts on first visit to `/app`. Skippable. State persisted in `localStorage`.
8. **Virtual scroll** — `content-visibility: auto` + `contain-intrinsic-size` for documents >5 pages. Keeps ProseMirror state intact while improving scroll performance.
9. **Dark mode paper** — `.paper` now uses `--color-paper` token (`#1f1f23` in dark mode) distinct from canvas. Print stylesheet forces white paper regardless of theme.

### Phase 4 — Modern Clean Pagination (2026-05-21)
10. **True multi-page canvas display** — Replaced dashed-line page break indicators with stacked white A4 pages on a gray canvas background, matching Microsoft Word visual layout.
11. **PageCanvas + PageWrapper components** — `PageCanvas` (forwardRef) renders multiple `PageWrapper` pages vertically with 16px gap and gray canvas. `PageWrapper` applies subtle shadow, enforces A4 dimensions, and renders page numbers via CSS `::after` pseudo-element.
12. **CSS custom properties for margins** — Each `page-node` sets inline CSS variables (`--page-margin-top`, `--page-margin-right`, `--page-margin-bottom`, `--page-margin-left`) driven by `pageSetup.marginMm`. `page-body` uses these variables for internal padding, keeping the page frame and content layout decoupled.
13. **Dark mode pages** — Canvas background darkens in dark mode (`#0f0f10`), while individual pages stay white (`#ffffff`) for readability. Print stylesheet forces white paper regardless of theme.
14. **Export wrapper stripping** — `stripPaginationWrappers.ts` removes `.page-node` / `.page-body` containers before all five export paths (HTML, ZIP, DOCX, PDF, Markdown), ensuring clean output without internal pagination artifacts.
15. **Ctrl+Enter page split** — VisualEditor now calls `splitPage` command (with `insertPageBreak` fallback) to create a new page node at cursor position.
16. **goToPage scroll** — `PaginationManager` uses `goToPage` from `usePagination.ts` to scroll to `.page-node` top with 24px offset for comfortable viewing.

### Previously (2026-05-12)
- **Placeholder hints** — `EmptyHint` now shows guidance about `{{variable}}` template syntax; FAQ and PasteTips include variable usage sections.
2. **Dashed page break indicators** — Automatic pagination separators (`.page-break-indicator`) changed from thick dot-grid bands to simple dashed horizontal lines with centered page labels, matching Microsoft Word style.
3. **Insert Variable button** — Added to Insert ribbon tab (`InsertMenu.tsx`); inserts `{{variable}}` template mark.
4. **Tab / Backspace fix** — Tab inserts 4 spaces; Backspace correctly deletes the preceding 4-space block when at appropriate positions (off-by-one bug in `parentOffset` vs `textContent` alignment fixed).

### Known Pending Issues
- None — pagination UI integration is complete.

## Pagination Architecture

### DOM Structure

```
EditorShell
└── PageCanvas (forwardRef → ResizeObserver)
    └── EditorContent (Tiptap)
        └── div.page-node (PageNode)
            ├── div.page-header (optional, Phase 2)
            ├── div.page-body (PageBodyNode, data-page-body="true")
            │   └── …actual document content…
            └── div.page-footer (optional, Phase 2)
```

- `PageCanvas` is a `forwardRef` component so `EditorShell` can attach a `ResizeObserver` to the scroll container for vertical ruler extension and pagination engine measurements.
- Each `page-node` is a Tiptap `PageNode` block with `pageNumber` and `pageSetup` attributes.
- `page-body` is the measurable content container; the pagination engine watches these elements for overflow.

### CSS Custom Properties for Margins

Each `.page-node` sets inline CSS variables based on `pageSetup.marginMm`:

```css
.page-node {
  --page-margin-top:    {topMm}mm;
  --page-margin-right:  {rightMm}mm;
  --page-margin-bottom: {bottomMm}mm;
  --page-margin-left:   {leftMm}mm;
}
```

`.page-body` consumes them:

```css
.page-body {
  padding:
    var(--page-margin-top)
    var(--page-margin-right)
    var(--page-margin-bottom)
    var(--page-margin-left);
}
```

This keeps the visual page frame (white background + shadow) separate from the content inset, so exports can strip wrappers without affecting margin logic.

### Page Numbers

Rendered via CSS `::after` on `.page-node`:

```css
.page-node::after {
  content: attr(data-page-number);
  position: absolute;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #9ca3af;
}
```

Numbers update automatically when `splitPage` / `mergePage` commands renumber nodes.

### Dark Mode

- Canvas: `#f3f4f6` (light) / `#0f0f10` (dark)
- Pages: always `#ffffff` so text remains readable
- Print: forces white paper regardless of theme

## Ongoing Work — Real-time Pagination (Microsoft Word-style)

**Status**: Phase 1 complete. Phase 1.5 (Debug Audit) complete. Phase 4 (UI Integration) complete.

### Completed (2026-05-19)

**Tiptap Extensions** (`src/lib/tiptap/`):
- `pageNode.ts` — `PageNode` block node with `pageHeader? pageBody pageFooter?` structure, attributes: `pageNumber`, `pageSetup`
- `pageBody.ts` — `PageBodyNode` measurable content container (`data-page-body`)
- `pageHeader.ts` / `pageFooter.ts` — placeholder nodes (`contenteditable="false"`) for Phase 2
- `pageCommands.ts` — Commands: `insertPage`, `splitPage`, `mergePage`, `setPageSetup` (auto-renumber on split/merge)
- Registered in `VisualEditor.tsx` extensions array

**Pagination Engine** (`src/lib/pagination/` + `src/hooks/`):
- `engine.ts` — `PaginationEngine` class with ResizeObserver (100ms debounce), `calculatePageMetrics`, `findSplitPosition`, idempotent + infinite-loop-safe
- `splitter.ts` — `splitNodeAtHeight`, paragraph-level split, atomic unit handling (tables/images move whole), batch transaction builder
- `usePagination.ts` — React hook wiring engine to editor, returns `{ isPaginating, pageCount, currentPage, goToPage }`, handles window resize and cleanup

**Phase 1.5 — Debug Audit (2026-05-20)**
- `splitter.ts` — Fixed `Fragment` import (value import, not type-only). Fixed `splitOffset === 0` infinite loop. Removed unused `buildBatchSplitTransaction`.
- `usePagination.ts` — Added `goToPage` with scroll-to-page logic. Added `scrollContainerRef` option. Fixed size check to `splitsInserted > 0`. Added `scheduleCheck()` debounce.
- `VisualEditor.tsx` — Changed Ctrl+Enter from `insertPageBreak` to `splitPage` with fallback.
- `EditorShell.tsx` — Integrated `goToPage` with `PaginationManager`. Added `wordhtml:page-next` / `wordhtml:page-prev` listeners.
- Export pipeline — Created `stripPaginationWrappers.ts`. Integrated into all 5 export paths (HTML, ZIP, DOCX, PDF, Markdown). PDF export uses static CSS instead of scraping `document.styleSheets`.
- Verification — `npm test` 193/193 passed, `npm run lint` 0 errors, `npm run build` passed.

### Pending / Not Yet Started

1. **Phase 2** — Header/Footer rich text editing (enable `contenteditable`, add header/footer toolbar/menu, per-page header/footer state)
2. **Phase 3** — Table/image splitting across pages, different first page, odd-even page headers/footers
3. **Integration Testing** — Verify Tiptap extensions + layout engine + UI work together without breaking existing export/cleaning/search features

### Architecture Notes

- `PageNode` renders as `<div class="page-node">` with CSS margin custom properties; `PageBodyNode` as `<div class="page-body" data-page-body="true">`
- Layout engine observes `.page-body` elements and emits `SplitCandidate` when overflow detected
- Splitter inserts existing `pageBreak` nodes (`src/lib/tiptap/pageBreak.ts`) or uses `splitPage` command
- Engine only measures and reports; it does NOT mutate document directly (hook applies transactions)
- Phase 1 scope: paragraph-level splitting. Tables/images that overflow move to next page as atomic units.
- **Goal**: Editor displays pages visually separated like Microsoft Word, with content flowing automatically across pages in real-time.
- **Constraint**: Must remain static client-side; no server rendering or API routes.

## Adding features

Before writing new code:
1. Check existing patterns in this file.
2. Read the relevant Next.js 16 doc in `node_modules/next/dist/docs/`.
3. Reuse: `cn()`, `Button`, `useEditorStore`, the cleaner pipeline, `MenuItem`/`MenuDropdown` primitives, `Ruler`, `mmToPx`/`A4`/`LETTER` from `src/lib/page.ts`, `countWords`/`plainTextFromHtml`.
4. New cleaners: add to `cleaners.ts`, register in `pipeline.ts`'s `ORDER`, add to `CLEANERS` in `types/index.ts`, add an example to `EXAMPLES` in `CleanerExplainers.tsx`, add a test in `cleaners.test.ts`.
5. New menu items: pick the right menu file under `components/editor/menu/`. Use `MenuItem` / `MenuSub` / `Sep` primitives. For shortcut text, only display what's actually wired in `EditorShell` or in Tiptap's keymap — don't display unwired shortcuts.
6. New Tiptap extensions: install, then register in `VisualEditor.tsx` extensions array. Verify default vs named export — most v3 packages support both.
7. New keyboard shortcuts: add to `EditorShell.tsx`'s consolidated keydown listener, then update the menu/toolbar shortcut text.
8. New dialogs: follow `ParagraphDialog.tsx` pattern — Radix Dialog with overlay, title, body sections, and OK/Cancel footer.

## Testing

- Pure libs in `lib/cleaning/`, `lib/export/`, `lib/conversion/`, `lib/text.ts`, `lib/images.ts` are unit-tested with Vitest + jsdom (190 tests across 15 files).
- E2E suite is wired up with Playwright (`tests/e2e/smoke.spec.ts`) covering app load, typing, export dialog, and .docx upload.
- CI runs on GitHub Actions (`lint → unit test → build → e2e`).
- TypeScript runs as part of `next build` — `npm run build` is your type-check.

## What NOT to do

- Don't add server-side processing — kills the privacy story.
- Don't add user accounts, telemetry, or third-party trackers.
- Don't use `next/image` for user-uploaded content (no loader configured for static export).
- Don't move cleaning into the live editor render path — it'll feel laggy on long documents.
- Don't add `html-to-docx` (the singular-`to` package) — it's Node-only. The browser path uses `html-docx-js`. The package was once listed in deps but never imported; it has been removed.
- Don't destructure the whole Zustand store in a component — use one `useEditorStore` call per field. New-object selector return causes whole-component re-renders on any store change.
- Don't display keyboard shortcuts in menus that aren't actually wired. Audit `EditorShell.tsx` keydown handler + StarterKit defaults before adding shortcut text.

## Deploy

```bash
npm run build              # produces ./out
npx serve out              # local static preview
# Deploy ./out to any static host: Vercel, Netlify, CF Pages, S3+CloudFront, GitHub Pages, etc.
```

**Current deployment:**
- **GitHub:** `IntraWY/wordhtml` (private repo)
- **Vercel:** `wordhtml.vercel.app` (auto-deploy on push to `master`)

That's it — no env vars, no secrets, no runtime config required.
