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
npm test             # vitest run (cleaners + pipeline)
npm run lint
```

## Stack

| Layer | Library | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router) | `output: "export"` for static deploy |
| Language | **TypeScript** | strict mode |
| Styling | **Tailwind CSS v4** | tokens defined in `src/app/globals.css` via `@theme inline` |
| Editor | **Tiptap v3** | StarterKit + Underline + Link + Image + Placeholder + TextAlign + Color + Highlight + Table |
| State | **Zustand** | `src/store/editorStore.ts`; cleaner prefs persisted to localStorage |
| docx → HTML | **mammoth.js** | uses package `browser` field; ambient types in `src/types/mammoth.d.ts` |
| HTML → docx | **html-docx-js** | UMD altchunks approach; dynamically imported |
| ZIP packaging | **JSZip** | for ZIP exports with extracted images |
| Icons | **lucide-react** | |
| Tests | **Vitest** + **jsdom** | `*.test.ts` colocated next to source |

> **Heads-up:** This is **Next.js 16** — APIs and conventions can differ from older training data. Read `node_modules/next/dist/docs/01-app/...` before introducing patterns from earlier versions. The repo's `AGENTS.md` reiterates this.

## File structure

```
src/
├── app/                       # Next.js App Router
│   ├── layout.tsx             # root layout, fonts, metadata
│   ├── globals.css            # Tailwind + design tokens + .prose-editor / .paper typography
│   ├── page.tsx               # / landing
│   ├── app/page.tsx           # /app editor
│   └── help/page.tsx          # /help docs
├── components/
│   ├── editor/                # EditorShell, TopBar, MenuBar, CleaningToolbar,
│   │                          # VisualEditor (Tiptap), A4Preview,
│   │                          # ExportDialog, UploadButton, HistoryPanel
│   ├── landing/               # Hero, Features, HowItWorks, Footer, Header
│   ├── help/                  # FAQ, CleanerExplainers, PasteTips
│   ├── ui/Button.tsx          # primary button primitive (cva variants)
│   └── MobileBlock.tsx        # < 768px overlay
├── lib/
│   ├── conversion/
│   │   ├── docxToHtml.ts      # mammoth wrapper, base64-inlined images
│   │   ├── loadHtmlFile.ts    # .html file reader + cleanup
│   │   └── pasteCleanup.ts    # strip Word/Office mso-* artifacts
│   ├── cleaning/
│   │   ├── cleaners.ts        # 8 pure HTML cleaners
│   │   ├── pipeline.ts        # ordered apply + plainText terminal
│   │   ├── cleaners.test.ts
│   │   └── pipeline.test.ts
│   ├── export/
│   │   ├── exportHtml.ts
│   │   ├── exportZip.ts       # JSZip + extracted images
│   │   ├── exportDocx.ts      # html-docx-js (dynamic import)
│   │   └── wrap.ts            # wrapAsDocument, triggerDownload, deriveFileName
│   ├── images.ts              # extract base64 <img> → File[] for ZIP
│   └── utils.ts               # cn() — clsx + tailwind-merge
├── store/editorStore.ts       # Zustand global store
└── types/
    ├── index.ts               # CleanerKey, CLEANERS, ImageMode, ExportFormat
    ├── mammoth.d.ts           # ambient types (no official @types)
    └── html-docx-js.d.ts      # ambient types
```

## Architecture conventions

- **No server code.** All conversion, cleaning, and exporting happens in `'use client'` components or in pure-function libraries called from them. Do not introduce API routes, Server Actions, or `'use server'` blocks.
- **Store as single source of truth for editor state.** UI components read with selectors (`useEditorStore((s) => s.x)`) — avoid destructuring the whole store, which causes unnecessary re-renders.
- **Cleaners are pure.** Each cleaner takes an HTML string and returns a new one. They use `DOMParser`, which is a browser API and also available under jsdom for tests.
- **Cleaners apply only at export.** Editing should stay snappy; the A4 Preview reflects the *current* document, not the cleaned-for-export version.
- **Document never persists.** localStorage holds only the user's cleaner preferences and image-mode choice (see `partialize` in `editorStore.ts`). The document itself is gone on reload — by design, for privacy.
- **UI toggles are session-scoped.** `sourceOpen` (HTML source pane) and `previewOpen` (A4 preview) reset on reload — only cleaner prefs and history persist.
- **History is local-only.** Up to 20 document snapshots are stored in localStorage as part of `wordhtml-editor`. See `HistoryPanel` and `saveSnapshot`/`loadSnapshot` actions.
- **Cleaner order matters.** See `src/lib/cleaning/pipeline.ts` — comments → styles → classes → attributes → unwrap spans → empty tags → spaces → (terminal) plainText.

## Design system

Tokens live in `src/app/globals.css` under `@theme inline`. Tailwind v4 picks them up automatically as `bg-background`, `text-foreground`, etc.

- **Palette:** zinc-based monochrome (`#fafafa` / `#18181b`) with success green and danger red. No dark mode (light only).
- **Type:** Geist Sans for UI and body, Geist Mono for code/terminal surfaces.
- **Radius:** 4 / 6 / 8 / 12 / 16 px (`--radius-xs` … `--radius-xl`).
- **Editor & A4 preview share `.prose-editor` / `.paper` rules** so what you type matches what you see in the right pane and what you export.

## Adding features

Before writing new code:
1. Check existing patterns in this file.
2. Read the relevant Next.js 16 doc in `node_modules/next/dist/docs/`.
3. Reuse: `cn()`, `Button`, `useEditorStore`, the cleaner pipeline.
4. New cleaners: add to `cleaners.ts`, register in `pipeline.ts`'s `ORDER`, add to `CLEANERS` in `types/index.ts`, add an example to `EXAMPLES` in `CleanerExplainers.tsx`, add a test in `cleaners.test.ts`.

## Testing

- Cleaners and pipeline are unit-tested with Vitest + jsdom.
- No E2E suite is wired up yet — verify manually via `npm run dev` against the flow in the project plan.
- TypeScript runs as part of `next build` — `npm run build` is your type-check.

## What NOT to do

- Don't add server-side processing — kills the privacy story.
- Don't add user accounts, telemetry, or third-party trackers.
- Don't use `next/image` for user-uploaded content (no loader configured for static export).
- Don't move cleaning into the live editor render path — it'll feel laggy on long documents.
- Don't add `html-to-docx` (the singular-`to` package) — it's Node-only. The browser path uses `html-docx-js`. The package was previously listed in deps but never imported; it has been removed.

## Deploy

```bash
npm run build              # produces ./out
npx serve out              # local static preview
# Deploy ./out to any static host: Vercel, Netlify, CF Pages, S3+CloudFront, GitHub Pages, etc.
```

That's it — no env vars, no secrets, no runtime config required.
