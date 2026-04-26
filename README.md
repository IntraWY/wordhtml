# wordhtml

Convert Word documents to clean, semantic HTML — and back. **Everything runs in your browser.** No uploads, no accounts, no tracking.

A redesigned clone of [wordhtml.com](https://wordhtml.com/) built with Next.js 16, Tiptap, and Tailwind v4.

## Features

- **Visual editor ↔ A4 Preview** — edit on the left, see the printed page on the right.
- **Eight HTML cleaners** — strip inline styles, empty tags, attributes, classes, comments, span wrappers, repeated whitespace, or convert to plain text. Toggle just what you need.
- **Three export formats** — clean `.html` (with images inlined or extracted), a `.zip` bundle, or a fresh `.docx`.
- **Paste from Word** — Word/Google Docs paste artifacts (mso-* styles, MsoNormal classes, conditional comments) are stripped on the way in.
- **100% client-side** — no document ever leaves your machine. Static-export ready.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # produces ./out — static export
npm test             # vitest run (cleaners + pipeline)
npm run lint
```

## Deploy

The build output is a plain static site:

```bash
npm run build
# Then upload ./out to:
#   - Vercel (zero config)
#   - Netlify
#   - Cloudflare Pages
#   - GitHub Pages
#   - any S3 / nginx / static host
```

No environment variables. No runtime config. No backend.

## Tech stack

- **Next.js 16** (App Router, static export)
- **TypeScript** (strict)
- **Tailwind CSS v4** with `@theme inline` design tokens
- **Tiptap v2** (ProseMirror-based rich editor)
- **Zustand** for editor state
- **mammoth.js** for `.docx` → HTML
- **html-docx-js** for HTML → `.docx`
- **JSZip** for ZIP exports with extracted images
- **Vitest** + **jsdom** for tests

See [`CLAUDE.md`](./CLAUDE.md) for architecture, conventions, and how to extend.

## Privacy

Everything happens in your browser. No telemetry. No third-party requests for document content. Your cleaner preferences (which toggles are on, which image mode you prefer) are saved in `localStorage`; the document itself is gone on reload.

## License

MIT
