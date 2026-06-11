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

## Documentation

| Topic | File |
|---|---|
| Placeholder system (`{{variables}}`, page tokens, panel, export health) | [`docs/placeholder-system.md`](./docs/placeholder-system.md) |

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
│   ├── page.tsx                  # / editor (EditorShell) — the app lives at root
│   ├── landing/page.tsx          # /landing marketing page
│   ├── procurement/page.tsx      # /procurement — Thai 3-stage จัดซื้อจัดจ้าง builder
│   ├── privacy/page.tsx          # /privacy
│   └── help/page.tsx             # /help docs
├── components/
│   ├── editor/
│   │   ├── EditorShell.tsx       # outer shell — owns A4 paper grid (corner + H/V ruler +
│   │   │                         #   article.paper), drag-drop, beforeunload, keyboard,
│   │   │                         #   search panel, page-setup dialog, all window event listeners
│   │   ├── TopBar.tsx            # logo + filename + history/upload/export/batch-convert
│   │   ├── ribbon/               # Ribbon UI (replaced legacy MenuBar + FormattingToolbar)
│   │   │   ├── Ribbon.tsx        # tab bar + tab switching
│   │   │   ├── RibbonGroup.tsx   # labelled group of ribbon buttons
│   │   │   ├── RibbonButton.tsx  # button primitive (aria-pressed, active highlight)
│   │   │   ├── RibbonSelect.tsx  # dropdown select in ribbon
│   │   │   ├── RibbonTabHome.tsx # Font, Bold/Italic/…, Align, List, Heading, Edit group
│   │   │   ├── RibbonTabInsert.tsx # Link, Image, Table, HR, Variable, Math, Page Break, Symbols (☐☑✓✗)
│   │   ├── TableSizePicker.tsx # Word-style hover grid (≤8×10) for insert table; withHeaderRow:false
│   │   │   ├── RibbonTabLayout.tsx # Page Setup, margins, header/footer
│   │   │   ├── RibbonTabClean.tsx  # cleaner pills (replaces CleaningToolbar)
│   │   │   ├── RibbonTabView.tsx   # Source HTML, TOC, Shortcuts, Fullscreen
│   │   │   └── RibbonTabSettings.tsx # app settings
│   │   ├── VisualEditor.tsx      # Tiptap editor setup + EditorContent + EmptyHint only
│   │   │                         #   (no outer container — rendered inside article.paper)
│   │   │                         #   Extensions: StarterKit + TextStyle + Color + FontFamily +
│   │   │                         #   FontSize (custom) + ParagraphFormat + Table + … (full list inside)
│   │   ├── ParagraphDialog.tsx   # Word-style Paragraph dialog: indents + spacing
│   │   ├── FontSizeSelector.tsx  # Font size dropdown (10-36px), used inside RibbonTabHome
│   │   ├── MobileToolbar.tsx     # Mobile-only bottom toolbar (mirrors RibbonTabHome formatting)
│   │   ├── Ruler.tsx             # H/V cm rulers with margin guides (PX_PER_CM=37.81).
│   │   │                         #   Horizontal ruler: margin handles (z-10 base, z-20 on hover)
│   │   │                         #   sit above indent ▽ triangles to prevent occlusion at indentLeft=0.
│   │   │                         #   + indent triangles (left/first-line).
│   │   ├── SearchPanel.tsx       # Ctrl+F floating Find & Replace panel
│   │   ├── PageSetupDialog.tsx   # A4/Letter, portrait/landscape, margins
│   │   ├── ExportDialog.tsx      # 5-format download (HTML/ZIP/DOCX/MD/PDF) + cleaner preview
│   │   ├── UploadButton.tsx      # listens "wordhtml:open-file" event
│   │   ├── HistoryPanel.tsx      # snapshot list with restore/duplicate/delete
│   │   ├── MathInputDialog.tsx   # KaTeX LaTeX equation editor (Ctrl+Shift+M)
│   │   ├── HeaderFooterDialog.tsx# Header/footer config: variant tabs + rich editors
│   │   ├── HeaderFooterRichEditor.tsx # Mini Tiptap sub-editor for header/footer content
│   │   ├── PageChromeLayer.tsx   # Live header/footer strips over each page (dblclick → dialog)
│   │   ├── SourcePane.tsx        # HTML source editor panel
│   │   ├── TemplatePreview.tsx   # processed template preview for preview mode
│   │   ├── PaginationManager.tsx # page navigation: total/current + goToPage controls
│   │   ├── PageCanvas.tsx        # multi-page container: gray canvas + stacked white A4 pages
│   │   ├── PageWrapper.tsx       # single page wrapper: shadow, page number, margin CSS vars
│   │   ├── IndentRuler.tsx       # horizontal ruler with indent handles (extracted from EditorShell)
│   │   └── EditorPaperLayout.tsx # shared ruler+paper grid (edit + template preview)
│   ├── landing/                  # Hero, Features, HowItWorks, Footer, Header
│   ├── help/                     # FAQ, CleanerExplainers, PasteTips
│   ├── ui/Button.tsx             # primary button primitive (cva variants)
│   └── MobileBlock.tsx           # < 768px overlay
├── lib/
│   ├── conversion/
│   │   ├── docxToHtml.ts         # mammoth wrapper; warnings: MammothMessage[]
│   │   ├── xlsxToHtml.ts         # exceljs (dynamic import) → HTML table; merges/widths/
│   │   │                         #   bold/align; no-border cells → data-borders="none"
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
│   ├── placeholders/             # Registry: merge fields, page tokens, resolve, export health
│   │   ├── registry.ts, resolve.ts, mergeFields.ts, pageTokens.ts, …
│   │   └── See docs/placeholder-system.md
│   ├── tiptap/
│   │   ├── paragraphFormat.ts    # ParagraphFormatExtension: marginLeft/Right, textIndent,
│   │   │                         #   spaceBefore/After, lineHeight/lineHeightMode
│   │   ├── fontSize.ts           # Custom Mark for inline font-size spans
│   │   ├── indentExtension.ts    # (legacy) replaced by paragraphFormat.ts
│   │   ├── pageNode.ts           # PageNode block (content: pageBody)
│   │   ├── pageBody.ts           # PageBodyNode measurable content container
│   │   ├── pageCommands.ts       # insertPage, splitPage, mergePage, setPageSetup
│   │   ├── pageBreak.ts          # Block-level page break node
│   │   ├── variableMark.ts       # Template variable {{name}} mark
│   │   ├── repeatingRow.ts       # Table row with data-repeat attrs
│   │   ├── tableCellBorder.ts    # TableCell/TableHeader + borders attr (data-borders="none");
│   │   │                         #   setSelectedCellBorders/selectionHasCell helpers
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
- `activeSnapshotId` — pointer to the saved document; on load it auto-restores that snapshot into the editor
- `pageSetup` — `{ size, orientation, marginMm }`

Session-scoped (not persisted): `documentHtml`, `sourceOpen`, `pendingExportFormat`, `lastLoadWarnings`, `lastEditAt`.

Auto-snapshot: `setHtml` debounces 2 minutes idle and saves a snapshot if HTML differs from the most recent.

## Architecture conventions

- **No server code.** All conversion, cleaning, and exporting happens in `'use client'` components or in pure-function libraries called from them. Do not introduce API routes, Server Actions, or `'use server'` blocks.
- **Store as single source of truth for editor state.** UI components read with separate selectors (`useEditorStore((s) => s.x)`) — avoid destructuring the whole store, which causes unnecessary re-renders. (A stale whole-store destructure in a past Ribbon tab was exactly this pattern.)
- **Cleaners are pure.** Each cleaner takes an HTML string and returns a new one. They use `DOMParser`, which is a browser API and also available under jsdom for tests.
- **Cleaners apply only at export.** Editing should stay snappy; the paper editor shows the *current* document, not the cleaned-for-export version.
- **Saved document auto-restores; unsaved edits stay volatile.** localStorage holds preferences (cleaners, imageMode, pageSetup), **history snapshots (device-local only)**, and the **`activeSnapshotId` pointer** (persisted in `partialize`). On load, `restoreActiveSnapshotFromSession()` (`editorStore.ts`) auto-loads the active snapshot's HTML back into the editor via `loadSnapshot()` (bumps `htmlSyncRevision` so Tiptap re-applies content) — so the **last saved document survives reload/reopen** on the same device. Pressing **บันทึก / Ctrl+S** is therefore a real save. Edits made *after* the last save are still volatile and only covered by the recovery-draft prompt (`useDraftRecovery`). `beforeunload` warns when current HTML differs from the latest snapshot. History/saved docs are **local-only by default**, but **sync to Firebase opt-in via sign-in**: when Firebase is configured and the user is signed in, `saveSnapshot` also pushes to `users/{uid}/snapshots/{id}` (`syncSnapshotToCloud` → `historyFirestore.ts`), and `useCloudHistorySync` merges remote snapshots back into local history. Pressing **บันทึก** is therefore cloud-aware — the toast and the `TopBar` `CloudSyncIndicator` reflect whether the save synced to cloud (signed in), saved locally with a sign-in nudge (configured, signed out), or is local-only (Firebase not configured); see `src/lib/saveFeedback.ts`. Anonymous/unconfigured users can still move work via Export or **Template** (Firestore). (This intentionally supersedes the earlier "document never persists" privacy stance, per user request.)
- **UI toggles are session-scoped.** `sourceOpen` (HTML source pane) and `isFullscreen` reset on reload.
- **History is local-first, cloud-optional.** Up to 20 document snapshots in localStorage. Auto-snapshot fires after 2 min idle. Total serialized size is capped at 4MB; oldest snapshots are dropped first. When Firebase is configured **and** the user is signed in, snapshots also sync to `users/{uid}/snapshots` (`historyFirestore.ts` + `useCloudHistorySync.ts`, conflict-merged via `mergeSnapshots.ts`); signed-out or unconfigured = localStorage only.
- **Templates use Firebase Firestore** when `NEXT_PUBLIC_FIREBASE_*` env vars are set at build time (`src/lib/templateFirestore.ts`, `templateStore.ts`). Up to 50 templates; real-time `onSnapshot` when the Template panel is open. JSON export/import still works for backup. **Firebase Auth is implemented** (Google sign-in via `src/lib/firebaseAuth.ts`); templates are stored **per-user** at `users/{uid}/templates`, with one-time migration from the legacy global `templates` collection on first sign-in (`migrateLegacyTemplatesToUser`). When Firebase is configured but the user is not signed in, cloud template save requires sign-in first (the legacy global path is read-only via `firestore.rules`). **History (document snapshots) also syncs per-user** at `users/{uid}/snapshots` when signed in (see the "History is local-first, cloud-optional" bullet above) — a separate collection from Templates. Both are dormant unless `NEXT_PUBLIC_FIREBASE_*` is set at build time and the user signs in.
- **Cleaner order matters.** See `src/lib/cleaning/pipeline.ts` — comments → styles → classes → attributes → **unwrapDeprecatedTags** → unwrapSpans → empty tags → spaces → (terminal) plainText.
- **Editor reactivity for ribbon buttons.** Ribbon tab components that show active/disabled states based on cursor position (e.g., `RibbonTabHome`) must use `useEditorState` from `@tiptap/react` with a consolidated selector. Direct `editor.isActive()` calls in JSX are not reactive — they only evaluate at the render that triggered for other reasons. See `MobileToolbar.tsx` for the correct pattern.
- **Cross-component coordination via custom events.** Menu items dispatch `wordhtml:open-search`, `wordhtml:open-page-setup`, `wordhtml:open-file` on `window`. `EditorShell` and `UploadButton` listen. Avoids passing dialog state through props.

## Design system

Tokens live in `src/app/globals.css` under `@theme inline`. Tailwind v4 picks them up automatically as `bg-background`, `text-foreground`, etc.

- **Palette:** warm stone/sand neutrals — background `#faf8f5`, foreground `#1c1917`, muted-foreground `#57534e` (passes WCAG AA on the light background), canvas `#e8e2d9` — with a **blue accent** (`#3B82F6` light / `#60A5FA` dark), success green and danger red. Dark mode supported via `html[data-theme="dark"]`; `.paper` uses `--color-paper` token (`#1f1f23` in dark) to remain distinct from the canvas. Print stylesheet forces white paper regardless of theme.
- **Type:** **IBM Plex Sans Thai** for UI and body (`--font-sans`), **Plus Jakarta Sans** for display/headings (`--font-display`), system mono for code/terminal surfaces. Font menu also offers TH Sarabun PSK, Sarabun, Noto Sans Thai, Kanit, Prompt, system-ui, serif, monospace.
- **Radius:** 4 / 6 / 8 / 12 / 16 px (`--radius-xs` … `--radius-xl`).
- **Editor IS the paper.** The Tiptap `EditorContent` renders inside `PageCanvas`, which replaces the old single `<article class="paper">` wrapper. Each page is a `PageWrapper` containing a `page-node > page-body` structure. `.prose-editor` and `.paper` share the same typography rules in `globals.css` so exports look identical to what you type.
- **A4 dimensions:** 794×1123 px @ 96 DPI = 210×297 mm. Conversion `1 cm = 794/21 ≈ 37.81 px` — see `src/lib/page.ts`. Letter is 215.9×279.4 mm. Page setup drives the paper padding and the print stylesheet.
- **Ruler:** 18 px wide/tall (`RULER_COLUMN_PX`), ticks every 0.5 cm, labels at every 1 cm, faint red guides at margin start/end. Layout shell: [`EditorPaperLayout.tsx`](src/components/editor/EditorPaperLayout.tsx) — shared `widthPx + 18` grid for **edit and template preview** (preview uses empty ruler spacers so paper does not shift horizontally).
  - **Edit only:** `IndentRuler` (horizontal margins + paragraph indents) and vertical `Ruler` (page margins). `IndentRuler` syncs on `selectionUpdate` + `transaction`; walks ancestor chain for paragraph/heading (including when an image in that block is selected).
  - Vertical ruler uses measured `contentOffsetPx` from first `.page-node` inside `PageCanvas` (`PAGE_CANVAS_PADDING_PX` default) and `PAGE_STACK_GAP_PX` (20) between stacked pages.
  - **Template preview:** interactive rulers are **not** shown; margins still come from `pageSetup`. Image width uses toolbar presets; `%` widths are normalized to px on enter preview (`normalizeImagePercentWidths`). Preview stack uses the same canvas padding/gap constants as edit (`MultiPagePreview`).
  - Manual regression checklist: [`docs/ruler-test-matrix.md`](docs/ruler-test-matrix.md).
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
- Accessible from: RibbonTabHome "ย่อหน้า…" button (Type icon, in Paragraph group)
- Dialog reads current node attrs from cursor position and applies via `editor.commands.setParagraphFormat()`

**Default font:** New empty documents auto-apply `THSarabunPSK` (with Google Font `Sarabun` fallback) via `useEffect` in `VisualEditor.tsx`.

## Keyboard shortcuts

Wired in `EditorShell.tsx`:

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save document (persists + auto-restores on reload) + open Export dialog (if doc has content) |
| Ctrl+Shift+S | Save document only (no dialog) |
| Ctrl+O | Open file picker |
| Ctrl+Shift+N | Reset to new document |
| Ctrl+F | Toggle Find & Replace panel |
| Ctrl+K | Insert link prompt |
| Ctrl+Shift+M | Open math equation dialog |
| Ctrl+P | Print (A4 preview only via `@media print`) |
| F11 | Toggle fullscreen |

Tiptap StarterKit handles: Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+A, Ctrl+E (inline code).
ParagraphFormatExtension handles: Tab (caret at block start / multi-block → block indent ±0.5cm; otherwise insert real `\t`; list → sink/lift), Shift+Tab (block indent -0.5cm, or lift list).
VisualEditor.tsx `handleKeyDown` handles: Ctrl+K (command palette), Ctrl+Enter (split page / page break), Backspace/Delete at page boundaries (merge pages), Backspace (outdent at start of indented paragraph). It does **not** intercept Tab — the only Tab handler is `ParagraphFormatExtension`.

## Current state (v0.2.7)

All 17 items from `wordhtml-feature-proposal.html` are shipped (A1–A3, B1–B9, C1–C4). **608 unit tests pass; lint + build clean.**

**v0.2.7 — Placeholder polish round 1 (filters).** New `{{x|comma}}` merge-field filter (thousand separators, tolerates pre-formatted input, non-numeric passes through) — registered in `MERGE_FIELD_FILTERS` + the filtered regex (`src/lib/placeholders/constants.ts`). New `ANY_FILTERED_MERGE_FIELD_REGEX_SOURCE` lets `checkExportHealth` flag typo'd filters (`unknown-merge-filter` warning) that the resolve passes would otherwise silently skip. Missing-policy UI already existed in ExportDialog (select at ~L397) — a prior audit note claiming otherwise was wrong. Filter docs table added to `docs/placeholder-system.md`.

**v0.2.6 — .xlsx import.** `src/lib/conversion/xlsxToHtml.ts` converts Excel-as-layout print forms to an editable HTML table via **exceljs** (dynamically imported — heavy dep; chosen over SheetJS CE because it reads cell styles). Preserves merged cells (`worksheet.model.merges` → colspan/rowspan), column widths (`data-colwidth` on first-row cells, Excel chars ×7px), bold, horizontal alignment, and the bordered/borderless distinction: cells with **no** Excel border get `data-borders="none"` (v0.2.4 tableCellBorder model), so form letterhead/signature zones import borderless while grid zones keep borders. Used-range detection counts text **or any border side** (empty bordered fill-in boxes are meaningful) and trims Excel's stray trailing dimension. Formulas → cached results; rich text/hyperlinks flattened; sheet with most rows wins (warning lists skipped sheets); embedded images/OLE not imported (warning). Wired into `editorStore.loadFile` (20MB cap) + `UploadButton` accept + drag-drop overlay text. Tests build real workbooks with exceljs in-memory (`xlsxToHtml.test.ts`). Verified live with the user's actual `ฟอร์มใบตัดงบ.xlsx` (16×10, all 39 merges) and `เอกสารส่งคืน.xlsx` (46 rows, `{{ชื่องานคำอธิบาย}}`/`{{เลขWBS}}` survive as template fields).

**v0.2.5 — Real-form gallery templates.** Three templates modeled on the user's actual documents added to `templateGallery.ts` (gallery now has 9): `pea-temp-switch` (บันทึกขออนุมัติติดตั้งอุปกรณ์ตัดตอนชั่วคราว กฟภ. — **2 pages** via new `pages(...)` helper, memo + แบบฟอร์มแจ้งความประสงค์ with a 9-col table), `budget-certification` (ใบตัดงบ — 4 budget lines 53010060/53052040/53069020/เบ็ดเตล็ด × งบ/เบิกแล้ว/คงเหลือ/เบิกครั้งนี้), `material-return` (ฟอร์มส่งคืนพัสดุ — uses the user's own field names `{{ชื่องานคำอธิบาย}}`/`{{เลขWBS}}`). All use Thai merge-field names (regex supports Thai), `data-repeat="true"` rows for line items (mail-merge ready), `data-borders="none"` signature/letterhead zones (v0.2.4 feature), ☐ checklist chars, and `{date_th}` tokens. `TemplateGalleryDialog` needed no changes (renders from the array); gained an sr-only `Dialog.Description` (was a Radix a11y warning).

**v0.2.4 — Form-authoring tools (รองรับฟอร์มราชการ/ฟอร์ม Excel).** Driven by the user's real PEA documents (บันทึกขออนุมัติติดตั้งอุปกรณ์ตัดตอน + ฟอร์มใบตัดงบ/เอกสารส่งคืน in Excel). Three additions: (1) **Table size picker** — `ribbon/TableSizePicker.tsx` replaces the fixed 3×3 insert button with a Word-style hover grid (up to 8×10); inserts with `withHeaderRow: false` (Thai forms use plain cells). (2) **Per-cell borders** — `src/lib/tiptap/tableCellBorder.ts` extends TableCell/TableHeader with `borders: "all"|"none"` attr rendering `data-borders="none"` + inline `border:none`; toggled from the editor context menu (ซ่อน/แสดงเส้นขอบเซลล์, works on CellSelection or caret cell via `setSelectedCellBorders`). Editor shows a faint dashed guide (`globals.css`, `!important` over the inline style); print + `wrap.ts` + `exportPdf.ts` CSS render truly borderless. Cleaners whitelist `data-borders` (PRESERVE_ATTRS + GLOBAL_PRESERVE_ATTRS) and `border` (removeInlineStyles KEEP). `wrap.ts` also gained default table CSS (exported HTML previously had NO table borders at all). Note: jsdom serializes `border:none` as `border: medium` — tests assert the attr, not the style string; `parseHTML` falls back to matching `border*: none|0` inline styles for imported HTML (e.g. future xlsx import). (3) **Symbol quick-insert** — ☐ ☑ ✓ ✗ ( ) buttons in RibbonTabInsert ("เครื่องหมาย" group) for form checklists.

**v0.2.3 — Header/Footer Phase 2+3 (rich editing + odd/even).** `HeaderFooterDialog` now uses `HeaderFooterRichEditor.tsx` — a mini Tiptap instance (minimal StarterKit + TextAlign + TextStyle + FontSize + inline Image + Placeholder) with a compact toolbar (B/I/U, align, size, logo, variable dropdown inserting literal `{page}`-style tokens) — replacing the old textareas. Variant tabs ทุกหน้า/หน้าแรก/หน้าคู่ edit all six `HeaderFooterConfig` HTML fields; all are sanitized on save. Form state lives in an inner `HeaderFooterForm` that unmounts with the Radix portal, so every open seeds a fresh draft from the store (no setState-in-effect — React Compiler lint forbids it). `pageChromeReserve.ts` exposes `measureChromeReservePx(hf)` → `{headerPx, footerPx, totalPx}`: header/footer measured separately, max across **active** variants, per-zone clamp 24–80px; `PageChromeLayer` sizes its strips from the measured zones (no more hard-coded `h-[28px]`) and its strips are `pointer-events-auto` with **double-click → `wordhtml:open-header-footer`** (gotcha: the unlayered `.page-chrome-*` rule in `globals.css` previously had `pointer-events:none`, which beat the Tailwind utility — unlayered CSS wins over `@layer utilities`). PDF export (`exportPdf.ts`) now pre-paginates via `splitHtmlIntoPages` when header/footer is enabled and renders per-page chrome absolutely inside the margin bands of exact-height page divs (jsPDF margins switch to 0 in that mode); shared resolution lives in `resolveHeaderFooterForPage` (`headerFooterResolve.ts`), used by both the canvas overlay and the PDF path. DOCX still doesn't support header/footer (noted in ExportDialog). The unreachable `pageHeader.ts`/`pageFooter.ts` stub nodes were deleted (PageNode content is `pageBody` only; `stripPaginationWrappers` keeps `.page-header/.page-footer` selectors for legacy HTML).

**v0.2.1 — Tab character survives save/reload.** Word-style mid-line Tab inserts a real `\t` (v0.1.38), but `VisualEditor.tsx` re-parsed store HTML back into the editor without `parseOptions.preserveWhitespace`, so ProseMirror's DOMParser collapsed the tab on every store→editor re-apply (the v0.2.0 auto-restore on reload, snapshot load, file open, dev HMR). Symptom: pressing **บันทึก** then reloading reverted the text to before the Tab. Fix: `parseOptions: { preserveWhitespace: "full" }` on both `useEditor` and `applyContent`'s `setContent` (matches `.prose-editor` `white-space: pre-wrap`); the tab was always stored correctly — only the re-parse dropped it. Locked by a tab round-trip test in `paragraphFormat.roundtrip.test.ts`. Commit `bbe6c8b`.

**v0.2.0 — Real document save.** Pressing **บันทึก / Ctrl+S** now persists the document: `activeSnapshotId` is whitelisted in `partialize`, and on load `restoreActiveSnapshotFromSession()` auto-loads that snapshot's HTML into the editor via `loadSnapshot()`. The saved document survives reload/reopen on the same device (intentionally supersedes the old "document never persists" stance). A `lastSyncedRevision` guard in `VisualEditor.onUpdate` prevents mount-time pagination normalization (which emits empty `<p></p>`) from clobbering the freshly restored document before the store→editor sync applies it.

**Feature map:**
- A1 Header/footer rich toolbar · A2 First-page different margins · A3 Discrete table split (`tableSplit.ts`)
- B1 Footnotes (`footnotes.ts`, `data-footnote`) · B2 Figure captions (`caption.ts`, `data-caption`) · B3 Style gallery (`paragraphStylePresets.ts`) · B4 Watermark (`watermark.ts`, `--wm-*` CSS vars) · B5 Comments (`commentMark.ts`) · B6 Multi-column (`columnBlock.ts`) · B7 Cross-references (`crossref.ts`) · B8 Track changes (`trackChange.ts`) · B9 Citations (`citations.ts`, `data-citation`)
- C1 Official-letter wizard (`buildLetterHtml.ts`, `OfficialLetterDialog`) · C2 Signature block (`signatureBlock.ts`) · C3 Distribution list / สำเนาเรียน (`distributionList.ts`) · C4 Thai page tokens `{page_th}` / `{total_th}` / `{date_th}`

**Pagination milestones:** ghost-page fix (`normalizeIncomingHtml.ts`), holistic repaginate (`repaginate.ts`, `computePageBreaks`), intra-paragraph soft-split (`expandTallBlocks` + cumulative baseline fix), export re-join in `stripPaginationWrappers.ts`.

**Thai mail-merge:** `src/lib/thai/` (`bahtText`, `toThaiDigits`, `formatThaiDate`), merge-field filters `{{x|baht|thai|date}}`, built-in สารบรรณ gallery (`templateGallery.ts`), batch export (`exportMailMerge.ts`).

**v0.1.38 Tab behavior** (`paragraphFormat.ts`): caret at `parentOffset===0` or multi-block → block indent ±0.5cm; otherwise insert real `\t`; list → sink/lift. Tab-stop CSS: `tab-size: 1.27cm` + `white-space: pre-wrap` on p/h1–h3/li in `globals.css`, `wrap.ts`, and `exportPdf.ts`. `collapseSpaces` cleaner preserves `\t` (regex `/ {2,}/g`, not `/[ \t]+/g`). **`VisualEditor.tsx` parses content with `parseOptions: { preserveWhitespace: "full" }` on both `useEditor` and `applyContent`'s `setContent`** — without it ProseMirror's DOMParser collapses the literal `\t` on every store→editor re-apply (auto-restore on reload, snapshot load, file open), making tabs silently vanish after save/reload. Locked by a tab round-trip test in `paragraphFormat.roundtrip.test.ts`. Spec: `docs/superpowers/specs/2026-06-07-word-style-tab-design.md`.

### Known Pending Issues
- (none tracked) — roadmap history: `docs/superpowers/specs/2026-06-07-production-roadmap-design.md`.

## Pagination Architecture

### DOM Structure

```
EditorShell
└── PageCanvas (forwardRef → ResizeObserver)
    └── EditorContent (Tiptap)
        └── div.page-node (PageNode)
            └── div.page-body (PageBodyNode, data-page-body="true")
                └── …actual document content…
```

Header/footer chrome is **not** part of the document: `PageChromeLayer` overlays
each `.page-node` with measured strips (see v0.2.3 above) and the pagination
engine subtracts `measureChromeReservePx().totalPx` from the content height.

- `PageCanvas` is a `forwardRef` component so `EditorShell` can attach a `ResizeObserver` to the scroll container for vertical ruler extension and pagination engine measurements.
- Each `page-node` is a Tiptap `PageNode` block with `pageNumber` and `pageSetup` attributes.
- `page-body` is the measurable content container; the pagination engine watches these elements for overflow.

### CSS Custom Properties for Margins

Each `.page-node` sets `--page-margin-{top|right|bottom|left}` inline CSS vars from `pageSetup.marginMm`; `.page-body` consumes them via `padding`. This decouples the visual page frame from content inset so exports can strip wrappers cleanly.

Page numbers rendered via `.page-node::after { content: attr(data-page-number) }`, updated automatically by `splitPage`/`mergePage` commands.

**Dark mode:** canvas `#0f0f10`, pages always `#ffffff`, print forces white.

## Pagination — pending work

- ~~Phase 2 — Header/footer rich text editing~~ ✅ v0.2.3 (dialog sub-editor + double-click chrome)
- ~~Phase 3 — Odd/even page headers/footers~~ ✅ v0.2.3 (variant tabs in HeaderFooterDialog)

## Placeholder System

Unified placeholders for merge fields (`{{name}}`), page tokens (`{page}`, `{total}`, `{date}`), empty-state hints, the Placeholder panel (View ribbon), live header/footer chrome on the canvas, inline fill-in fields, and export health checks.

- **Code:** `src/lib/placeholders/`, `PlaceholderPanel.tsx`, `PageChromeLayer.tsx`, `placeholderField.ts`
- **Full guide:** [`docs/placeholder-system.md`](./docs/placeholder-system.md) — architecture, modules, UI entry points, export order, testing, roadmap

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

## Versioning

- **Single source of truth**: `package.json` → `version`
- **Where it shows up**:
  - `src/lib/version.ts` exports `APP_VERSION` and `APP_VERSION_LABEL`
  - `src/app/layout.tsx` injects the version into HTML metadata (`generator` + meta `app-version`)
- **Current version**: **v0.2.7**

### Patch bump rule (deploy default)

When deploying, bump patch by **+0.0.1** (e.g. `0.1.5` → `0.1.6`) before building.

```bash
npm run version:bump
```

## Deploy

```bash
npm run build              # next build + scripts/build-sw.mjs → ./out (includes out/sw.js)
npx serve out              # local static preview
# Deploy ./out to any static host: Vercel, Netlify, CF Pages, S3+CloudFront, GitHub Pages, etc.
```

**PWA / Offline:** the app is installable and works offline. `src/app/manifest.ts` emits
`manifest.webmanifest` (`start_url: "/"`); `scripts/build-sw.mjs` runs after `next build` and
generates `out/sw.js` from `scripts/sw.template.js` (precaches HTML pages + `_next/static` +
icons/fonts; navigations are network-first with cached fallback; **non-GET and cross-origin
requests are never intercepted** so Firebase sync is unaffected).
`src/components/ServiceWorkerRegistration.tsx` (mounted in `layout.tsx`) registers the SW in
production only and shows a "มีเวอร์ชันใหม่ (Update available)" banner → SKIP_WAITING → reload.
Cache name rotates per build (BUILD_ID/version), so deploys invalidate old caches automatically.
`next dev` never has a service worker.

**Current deployment:**
- **GitHub:** `IntraWY/wordhtml` (private repo)
- **Vercel:** `wordhtml.vercel.app` (auto-deploy on push to `master`)

The static converter/editor runs with **no env vars**. Optional cloud sync (Templates + document history) activates only when `NEXT_PUBLIC_FIREBASE_*` is set at build time — see below.

## Firebase cloud sync (activated)

Cloud sync for **Templates** (`users/{uid}/templates`) and **document history / saved snapshots** (`users/{uid}/snapshots`) is **live**. Pressing **บันทึก** writes to local history always, and additionally to `users/{uid}/snapshots/{id}` when signed in (`saveSnapshot` → `syncSnapshotToCloud` → `historyFirestore.ts`); `useCloudHistorySync` merges remote back into local. The save toast / `TopBar` `CloudSyncIndicator` reflect the state (synced / sign-in nudge / local-only) via `src/lib/saveFeedback.ts`. Sign-in is Google OAuth (`AuthButton`, `firebaseAuth.ts`).

**Firebase project:** `webhtml-d6832` (display "Webhtml"), web app `1:1048333810649:web:5ff4999c86685b7626f7c8`.

**What's configured (done):**
- `.env.local` holds the `NEXT_PUBLIC_FIREBASE_*` web config (gitignored; values are public client config, not secrets). Re-pull anytime with: `firebase apps:sdkconfig WEB <appId> --project webhtml-d6832`.
- `firestore.rules` deployed (`firebase deploy --only firestore:rules`) — grants `users/{uid}/**` to the owner; legacy global `templates` is read-only.
- Auth → Google provider **enabled**; Authorized domains include `localhost` + `wordhtml.vercel.app`.
- Vercel project env has all 7 `NEXT_PUBLIC_FIREBASE_*` (Production/Preview/Development) so the deployed build is Firebase-enabled.

**Verify config without signing in:** authorized domains via `GET identitytoolkit.googleapis.com/v1/projects?key=<apiKey>`; Google provider via `POST identitytoolkit.googleapis.com/v1/accounts:createAuthUri` (returns an `authUri` when enabled). A real end-to-end sign-in must be done in a normal browser — Google blocks OAuth in automation-controlled browsers.

> **Heads-up:** Firebase web `apiKey` is a public client identifier (already embedded in the deployed JS), gated by Firestore rules + authorized domains — not a secret. Still kept out of git via `.env*` ignore.
