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
npm test             # vitest run (560 tests across ~20 files)
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

## Key files

| Path | Purpose |
|---|---|
| `src/app/globals.css` | Tailwind tokens, `.prose-editor`/`.paper` typography, ruler, print stylesheet |
| `src/app/page.tsx` | Editor root → `EditorShell` |
| `src/components/editor/EditorShell.tsx` | A4 shell: rulers, keyboard shortcuts, dialogs, window events |
| `src/components/editor/VisualEditor.tsx` | Tiptap setup — **all extensions registered here** |
| `src/components/editor/ribbon/` | `Ribbon` + `RibbonTabHome/Insert/Layout/Clean/View/Settings` |
| `src/components/editor/PageCanvas.tsx` | Multi-page gray canvas + stacked white pages |
| `src/lib/tiptap/paragraphFormat.ts` | `ParagraphFormatExtension`: indents, spacing, Tab keymap |
| `src/lib/tiptap/pageNode.ts` | `PageNode` block: `pageHeader? pageBody pageFooter?`, watermark vars |
| `src/lib/tiptap/` | Also: `columnBlock`, `tableSplit`, `commentMark`, `trackChange`, `mathEquation`, `variableMark`, `pageCommands`, `pageBreak`, … |
| `src/lib/pagination/repaginate.ts` | Holistic reflow: `buildRepaginateTransaction` + `computePageBreaks` |
| `src/lib/pagination/` | Also: `engine.ts`, `splitter.ts`, `normalizeIncomingHtml.ts` |
| `src/lib/cleaning/cleaners.ts` | 9 pure HTML cleaners; order in `pipeline.ts` |
| `src/lib/export/` | `exportHtml/Zip/Docx/Pdf/Markdown`, `exportMailMerge`, `distributionList`, `wrap`, `stripPaginationWrappers` |
| `src/lib/placeholders/` | Merge fields, page tokens, resolve, export health — see `docs/placeholder-system.md` |
| `src/lib/thai/` | `bahtText()`, `toThaiDigits()`, `formatThaiDate()` |
| `src/lib/officialLetter/` | `buildLetterHtml.ts` (C1), `signatureBlock.ts` (C2) |
| `src/lib/page.ts` | A4/LETTER constants + `mmToPx` |
| `src/lib/project.ts` | Save/open `.wordhtml.json` |
| `src/store/editorStore.ts` | Zustand store — see Editor store section |
| `src/hooks/usePagination.ts` | Wires engine to editor; returns `pageCount`, `currentPage`, `goToPage` |

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
- **Store as single source of truth for editor state.** UI components read with separate selectors (`useEditorStore((s) => s.x)`) — avoid destructuring the whole store, which causes unnecessary re-renders. (A stale whole-store destructure in a past Ribbon tab was exactly this pattern.)
- **Cleaners are pure.** Each cleaner takes an HTML string and returns a new one. They use `DOMParser`, which is a browser API and also available under jsdom for tests.
- **Cleaners apply only at export.** Editing should stay snappy; the paper editor shows the *current* document, not the cleaned-for-export version.
- **Document never persists.** localStorage holds only preferences (cleaners, imageMode, pageSetup) and **history snapshots**. The current document is gone on reload — by design, for privacy. `beforeunload` warns if there are unsaved changes (current HTML differs from latest snapshot).
- **UI toggles are session-scoped.** `sourceOpen` (HTML source pane) and `isFullscreen` reset on reload.
- **History: local-first, cloud-synced when signed in.** Up to 20 `DocumentSnapshot[]` in localStorage; auto-snapshot after 2 min idle; 4MB serialized cap (oldest dropped first). When signed in with Google, `useCloudHistorySync` mirrors snapshots to Firestore `users/{uid}/snapshots` and merges cloud↔local on load. **Save reliability invariant (see below):** the cloud subscription must only start after persist hydration, and a freshly-saved local edit must never be overwritten by a stale remote copy.
- **Cloud history merge rules** (`src/lib/mergeSnapshots.ts`, `src/hooks/useCloudHistorySync.ts`): merge is last-write-wins by `savedAt`, but a per-device `locallyUpdatedAt` marker (set in `saveSnapshot`, never sent to cloud) makes the local copy win on a same-`savedAt` tie or clock-skew inversion. `useCloudHistorySync` gates `subscribeSnapshots` on `useEditorStore.persist.hasHydrated()` (mirrors `useDraftRecovery`) so the first Firestore emission can't merge against an empty `history` and clobber a saved edit; it also reconcile-uploads local-newer snapshots on **every** load (not gated by the per-session upload flag, which can survive a hard refresh).
- **Templates use Firebase Firestore** (`NEXT_PUBLIC_FIREBASE_*` env vars) — per-user at `users/{uid}/templates`, Google sign-in required to save (`firebaseAuth.ts`). Separate from history snapshots — do not confuse the two.
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
- **Ruler:** 18 px wide/tall, ticks every 0.5 cm, labels at 1 cm. `IndentRuler` (horizontal) + `Ruler` (vertical) shown in edit mode only; template preview uses spacers. Manual regression: [`docs/ruler-test-matrix.md`](docs/ruler-test-matrix.md).
- **i18n style:** Thai labels primary, English in parentheses. Example: `"ไฟล์ (File)"`, `"ตัวหนา (Bold)"`. Keep this consistent for any new menu/toolbar item.

## Paragraph Formatting

`ParagraphFormatExtension` (`paragraphFormat.ts`) adds global attrs to `paragraph`/`heading`: `marginLeft`, `marginRight`, `textIndent` (cm), `spaceBefore`, `spaceAfter` (pt), `lineHeightMode`/`lineHeight`. Also owns the position-aware Tab/Shift-Tab keymap. UI: `ParagraphDialog.tsx` → `editor.commands.setParagraphFormat()`. Default font: `THSarabunPSK` applied via `useEffect` in `VisualEditor.tsx`.

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
ParagraphFormatExtension handles: Tab (position-aware — indent block at line start, insert `\t` mid-line, sink list); Shift+Tab (lift list, delete preceding `\t`, or outdent −0.5cm).
VisualEditor.tsx handles: Ctrl+Enter (insert page break node).

## Shipped Features (v0.1.38)

**560 unit tests pass. All 17 items from `wordhtml-feature-proposal.html` shipped.**

### Thai Government Document Features

| ID | Feature | Code | Ribbon entry |
|---|---|---|---|
| B4 | Watermark | `src/lib/watermark.ts` | Page Setup dialog presets (ร่าง/สำเนา/ลับ) |
| B3 | Style gallery | `src/lib/styles/paragraphStylePresets.ts` | Home → Styles group |
| C1 | Official-letter wizard | `src/lib/officialLetter/buildLetterHtml.ts` | Insert → "หนังสือราชการ" |
| C2 | Signature block | `src/lib/officialLetter/signatureBlock.ts` | Insert → "บล็อกลงนาม" |
| C4 | Thai page tokens | `src/lib/placeholders/pageTokens.ts` | `{page_th}` `{total_th}` `{date_th}` |
| B2 | Figure captions | `src/lib/caption.ts` | Insert → "คำบรรยายภาพ" |
| B1 | Footnotes | `src/lib/footnotes.ts` | Insert → "เชิงอรรถ" |
| B7 | Cross-references | `src/lib/crossref.ts` | Insert → "อ้างอิงข้าม" |
| C3 | Distribution list | `src/lib/export/distributionList.ts` | Insert → "สำเนาเรียน" |
| B5 | Comments | `src/lib/comments.ts` + `tiptap/commentMark.ts` | View → Review group |
| B9 | Citations | `src/lib/citations.ts` | Insert → "อ้างอิง/บรรณานุกรม" |
| B8 | Track changes | `src/lib/tiptap/trackChange.ts` | View → Review group |
| A1 | Header/footer toolbar | `HeaderFooterDialog.tsx` | Layout ribbon |
| A2 | First-page margins | `PageSetup.firstPageMarginMm` | Page Setup → "หน้าแรกต่าง" |
| B6 | Multi-column | `src/lib/tiptap/columnBlock.ts` | Layout → "คอลัมน์" |
| A3 | Table split | `src/lib/tiptap/tableSplit.ts` | Insert → "แยกตารางข้ามหน้า" |

### Mail-merge + Thai helpers
- Thai helpers: `bahtText()`, `toThaiDigits()`, `formatThaiDate()` in `src/lib/thai/`
- Merge filters: `{{x|baht}}`, `{{x|thai}}`, `{{x|date}}` in `mergeFields.ts`
- Mail-merge ZIP: `src/lib/export/exportMailMerge.ts` (Export dialog when templateMode + data rows)
- Built-in gallery: `src/lib/templateGallery.ts` (สารบรรณ: หนังสือภายนอก, บันทึกข้อความ, ประกาศ, รายงานขอซื้อ)

### Word-style Tab (v0.1.38)
Tab is position-aware in `paragraphFormat.ts`: indent block at line start, insert `\t` mid-line, sink list. Tab-stop grid: `tab-size: 1.27cm` + `white-space: pre-wrap` in `globals.css`, `wrap.ts`, `exportPdf.ts`. `collapseSpaces` cleaner preserves `\t` (`/ {2,}/g` not `/[ \t]+/g`).

### Pagination
Holistic reflow via `repaginate.ts` (`computePageBreaks` fill-to-limit). Over-tall paragraphs soft-split (`data-soft-split`, `findParagraphSegments`). Ghost pages stripped by `normalizeIncomingHtml.ts`. All five export formats re-join soft-split pieces via `stripPaginationWrappers.ts`.

### Known Pending
- **C.2 cloud history sync — implemented, in-system Firebase verification pending.** Firebase-backed history across devices works (`useCloudHistorySync` + `historyFirestore` + `mergeSnapshots`); the save-loss-on-refresh bug (hydration race + LWW tie) is fixed and covered by unit tests + local E2E. End-to-end confirmation against live Firestore while signed in (network write to `users/{uid}/snapshots`, then bug flow) is still TODO — requires Google login.
- **Custom ruler tab stops** — click-to-set (uniform 1.27cm grid for now).
- **Full per-page header/footer** — odd/even pages with independent rich text (placeholder nodes exist).
- **Mid-reflow table/image splitting** — A3 is a discrete command; automatic mid-repagination split not implemented.

## Pagination Architecture

DOM: `EditorShell → PageCanvas (ResizeObserver) → EditorContent → div.page-node → div.page-header? + div.page-body + div.page-footer?`

- Each `.page-node` sets inline CSS vars `--page-margin-{top/right/bottom/left}` from `pageSetup.marginMm`; `.page-body` consumes them as padding — frame and content inset stay decoupled, so export stripping doesn't affect margin logic.
- Page numbers rendered via CSS `::after { content: attr(data-page-number) }` on `.page-node`; auto-renumber on `splitPage`/`mergePage`.
- Engine observes `.page-body` for overflow and emits `SplitCandidate` — it measures only, never mutates; the hook applies transactions.
- Dark mode: canvas `#0f0f10`, pages always `#ffffff`; print forces white paper.

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

- Pure libs in `lib/cleaning/`, `lib/export/`, `lib/conversion/`, `lib/text.ts`, `lib/images.ts`, `lib/tiptap/`, `lib/thai/` and others are unit-tested with Vitest + jsdom (560 tests across ~20 files).
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
- **Current version**: **v0.1.38**

### Patch bump rule (deploy default)

When deploying, bump patch by **+0.0.1** (e.g. `0.1.5` → `0.1.6`) before building.

```bash
npm run version:bump
```

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
