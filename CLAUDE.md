# CLAUDE.md — wordhtml

> Project guide for Claude Code working in this repository.

## What this is

**wordhtml** is a static Next.js 16 web app that converts Word (`.docx`) ↔ HTML in the browser, with a visual editor + A4 preview and configurable cleaning options. It is a redesigned clone of [wordhtml.com](https://wordhtml.com/), built fresh with a "Modern Productivity" aesthetic (Linear / Vercel / Notion influence).

Everything runs **client-side** — no API routes, no server processing. The site is exported as static HTML/CSS/JS and can be deployed to Vercel, Netlify, Cloudflare Pages, or any static host.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # produces ./out — static export
npm test             # vitest run (107 tests across 8 files)
npm run lint
```

## Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | `output: "export"` for static deploy |
| Language | **TypeScript** | strict mode |
| Styling | **Tailwind CSS v4** | tokens defined in `src/app/globals.css` via `@theme inline` |
| Editor | **Tiptap v3** | StarterKit + Underline + Link + ImageWithAlign + Placeholder + TextAlign + Color + Highlight + Table + Subscript + Superscript + TaskList + FontFamily + SearchAndReplace + custom IndentExtension |
| Find/Replace | `@sereneinserenade/tiptap-search-and-replace` | community pkg via `--legacy-peer-deps` |
| State | **Zustand** | `src/store/editorStore.ts`; cleaner prefs / pageSetup / history persisted to localStorage |
| docx → HTML | **mammoth.js** | uses package `browser` field; ambient types in `src/types/mammoth.d.ts` |
| HTML → docx | **html-docx-js** | UMD altchunks approach; dynamically imported |
| HTML → markdown | **turndown** | with custom GFM-table rule |
| ZIP packaging | **JSZip** | for ZIP exports with extracted images |
| Icons | **lucide-react** | |
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
│   │   ├── EditorShell.tsx       # outer shell — drag-drop, beforeunload, keyboard,
│   │   │                         #   search panel, page-setup dialog, source pane
│   │   ├── TopBar.tsx            # logo + filename + history/upload/export
│   │   ├── MenuBar.tsx           # 7-menu nav, slim composition
│   │   ├── menu/
│   │   │   ├── primitives.tsx    # MenuDropdown, MenuItem, MenuSub, Sep
│   │   │   ├── FileMenu.tsx      # New, Open, Export HTML/ZIP/DOCX/MD, Snapshot
│   │   │   ├── EditMenu.tsx      # Undo/Redo/Copy-as-HTML/Select All
│   │   │   ├── InsertMenu.tsx    # Link, Image upload/URL, Table, HR, Soft Break, Code
│   │   │   ├── ViewMenu.tsx      # Source HTML, A4 Preview, Fullscreen
│   │   │   ├── FormatMenu.tsx    # paragraph, B/I/U/Strike, Sub/Sup/Code,
│   │   │   │                     #   Align submenu, Font submenu, Clear Formatting
│   │   │   ├── TableMenu.tsx     # Insert Table, row/column ops, Delete Table
│   │   │   └── ToolsMenu.tsx     # Word Count, Find/Replace, Page Setup, Cleaning
│   │   ├── CleaningToolbar.tsx   # cleaner pills row
│   │   ├── VisualEditor.tsx      # Tiptap editor (slim) + cursor preservation
│   │   ├── FormattingToolbar.tsx # icon toolbar — image-aware align/size, sub/sup, code
│   │   ├── A4Preview.tsx         # paper rendering driven by pageSetup, with Ruler
│   │   ├── Ruler.tsx             # H/V cm rulers with margin guides (PX_PER_CM=37.81)
│   │   ├── SearchPanel.tsx       # Ctrl+F floating Find & Replace panel
│   │   ├── PageSetupDialog.tsx   # A4/Letter, portrait/landscape, margins
│   │   ├── ExportDialog.tsx      # 4-format download + cleaner preview
│   │   ├── UploadButton.tsx      # listens "wordhtml:open-file" event
│   │   └── HistoryPanel.tsx      # snapshot list with restore/duplicate/delete
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
│   │   ├── exportMarkdown.ts     # turndown wrapper with GFM tables (+ tests)
│   │   └── wrap.ts               # wrapAsDocument({ title, pageSetup }), @page CSS
│   ├── tiptap/
│   │   └── imageWithAlign.ts     # Image extension extended with align/width attrs
│   ├── images.ts                 # extract base64 <img> → File[] for ZIP
│   ├── text.ts                   # plainTextFromHtml, Thai-aware countWords (+ tests)
│   └── utils.ts                  # cn() — clsx + tailwind-merge
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

Session-scoped (not persisted): `documentHtml`, `sourceOpen`, `previewOpen`, `pendingExportFormat`, `lastLoadWarnings`, `lastEditAt`.

Auto-snapshot: `setHtml` debounces 2 minutes idle and saves a snapshot if HTML differs from the most recent.

## Architecture conventions

- **No server code.** All conversion, cleaning, and exporting happens in `'use client'` components or in pure-function libraries called from them. Do not introduce API routes, Server Actions, or `'use server'` blocks.
- **Store as single source of truth for editor state.** UI components read with separate selectors (`useEditorStore((s) => s.x)`) — avoid destructuring the whole store, which causes unnecessary re-renders. The `MenuBar` perf bug from history was exactly this pattern.
- **Cleaners are pure.** Each cleaner takes an HTML string and returns a new one. They use `DOMParser`, which is a browser API and also available under jsdom for tests.
- **Cleaners apply only at export.** Editing should stay snappy; the A4 Preview reflects the *current* document, not the cleaned-for-export version.
- **Document never persists.** localStorage holds only preferences (cleaners, imageMode, pageSetup) and history snapshots. The current document is gone on reload — by design, for privacy. `beforeunload` warns if there are unsaved changes (current HTML differs from latest snapshot).
- **UI toggles are session-scoped.** `sourceOpen` (HTML source pane), `previewOpen` (A4 preview), and `isFullscreen` reset on reload.
- **History is local-only.** Up to 20 document snapshots in localStorage. Auto-snapshot fires after 2 min idle. Total serialized size is capped at 4MB; oldest snapshots are dropped first.
- **Cleaner order matters.** See `src/lib/cleaning/pipeline.ts` — comments → styles → classes → attributes → **unwrapDeprecatedTags** → unwrapSpans → empty tags → spaces → (terminal) plainText.
- **Editor reactivity for menus.** Menu components that show active/disabled states based on cursor position (e.g., `FormatMenu`, `EditMenu`) use `useEditorState` from `@tiptap/react` to subscribe to selection changes. Without it, checkmarks go stale.
- **Cross-component coordination via custom events.** Menu items dispatch `wordhtml:open-search`, `wordhtml:open-page-setup`, `wordhtml:open-file` on `window`. `EditorShell` and `UploadButton` listen. Avoids passing dialog state through props.

## Design system

Tokens live in `src/app/globals.css` under `@theme inline`. Tailwind v4 picks them up automatically as `bg-background`, `text-foreground`, etc.

- **Palette:** zinc-based monochrome (`#fafafa` / `#18181b`) with success green and danger red. No dark mode (light only).
- **Type:** Geist Sans for UI and body, Geist Mono for code/terminal surfaces. Font menu also offers Sarabun, Noto Sans Thai, system-ui, serif.
- **Radius:** 4 / 6 / 8 / 12 / 16 px (`--radius-xs` … `--radius-xl`).
- **Editor & A4 preview share `.prose-editor` / `.paper` rules** so what you type matches what you see in the right pane and what you export.
- **A4 dimensions:** 794×1123 px @ 96 DPI = 210×297 mm. Conversion `1 cm = 794/21 ≈ 37.81 px`. Letter is 215.9×279.4 mm. Page setup drives both `<A4Preview>` and the print stylesheet.
- **Ruler:** 18 px wide/tall, ticks every 0.5 cm, labels at every 1 cm, faint red guides at margin start/end. Scrolls with paper so cm marks always align.
- **i18n style:** Thai labels primary, English in parentheses. Example: `"ไฟล์ (File)"`, `"ตัวหนา (Bold)"`. Keep this consistent for any new menu/toolbar item.

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
| Ctrl+P | Print (A4 preview only via `@media print`) |
| F11 | Toggle fullscreen |

Tiptap StarterKit handles: Ctrl+B/I/U, Ctrl+Z/Y, Ctrl+A, Ctrl+E (inline code).

## Adding features

Before writing new code:
1. Check existing patterns in this file.
2. Read the relevant Next.js 16 doc in `node_modules/next/dist/docs/`.
3. Reuse: `cn()`, `Button`, `useEditorStore`, the cleaner pipeline, `MenuItem`/`MenuDropdown` primitives, `Ruler`, `countWords`/`plainTextFromHtml`.
4. New cleaners: add to `cleaners.ts`, register in `pipeline.ts`'s `ORDER`, add to `CLEANERS` in `types/index.ts`, add an example to `EXAMPLES` in `CleanerExplainers.tsx`, add a test in `cleaners.test.ts`.
5. New menu items: pick the right menu file under `components/editor/menu/`. Use `MenuItem` / `MenuSub` / `Sep` primitives. For shortcut text, only display what's actually wired in `EditorShell` or in Tiptap's keymap — don't display unwired shortcuts.
6. New Tiptap extensions: install, then register in `VisualEditor.tsx` extensions array. Verify default vs named export — most v3 packages support both.
7. New keyboard shortcuts: add to `EditorShell.tsx`'s consolidated keydown listener, then update the menu/toolbar shortcut text.

## Testing

- Pure libs in `lib/cleaning/`, `lib/export/`, `lib/conversion/`, `lib/text.ts`, `lib/images.ts` are unit-tested with Vitest + jsdom (107 tests across 8 files).
- No E2E suite is wired up — verify manually via `npm run dev`. Past sessions have also used Playwright MCP for smoke testing.
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

That's it — no env vars, no secrets, no runtime config required.
