# wordhtml

Convert Word documents to clean, semantic HTML — and back. **Everything runs in your browser.** No uploads, no accounts, no tracking.

A redesigned clone of [wordhtml.com](https://wordhtml.com/) built with Next.js 16, Tiptap, and Tailwind v4.

## Features

- **Visual editor ↔ A4 Preview** — edit on the left, see the printed page on the right.
- **Eight HTML cleaners** — strip inline styles, empty tags, attributes, classes, comments, span wrappers, repeated whitespace, or convert to plain text. Toggle just what you need.
- **Five export formats** — clean `.html` (with images inlined or extracted), a `.zip` bundle, `.docx`, Markdown, or Google Apps Script code.
- **Paste from Word** — Word/Google Docs paste artifacts (mso-* styles, MsoNormal classes, conditional comments) are stripped on the way in.
- **WYSIWYG A4 editor** — interactive horizontal and vertical rulers with draggable margin guides, page setup (A4/Letter, portrait/landscape), and header/footer configuration.
- **Template mode** — define `{{variables}}`, paste data from Google Sheets, and preview merged documents. See [`docs/placeholder-system.md`](./docs/placeholder-system.md) for merge fields, page tokens, the Placeholder panel, and export policies.
- **Document history** — up to 20 snapshots per browser (localStorage); does not sync across devices.
- **Named templates (optional cloud)** — save documents as templates via Firebase Firestore when configured (see `.env.example`).
- **Client-side editing** — conversion and export run in the browser; static-export ready.

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

Optional Firebase env vars for cloud templates (see [`.env.example`](./.env.example)). History snapshots always stay in the browser's localStorage.

## Tech stack

- **Next.js 16** (App Router, static export)
- **TypeScript** (strict)
- **Tailwind CSS v4** with `@theme inline` design tokens
- **Tiptap v3** (ProseMirror-based rich editor)
- **Zustand** for editor state
- **mammoth.js** for `.docx` → HTML
- **html-docx-js** for HTML → `.docx`
- **JSZip** for ZIP exports with extracted images
- **Vitest** + **jsdom** for tests

## Documentation

| Doc | Description |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, conventions, pagination, and how to extend |
| [`docs/placeholder-system.md`](./docs/placeholder-system.md) | Placeholder registry, `{{variables}}`, header/footer tokens, panel, export health |
| [`docs/firebase-cloud-sync-design.md`](./docs/firebase-cloud-sync-design.md) | History vs Templates storage, Auth + cross-device sync |
| [`docs/deploy-firebase.md`](./docs/deploy-firebase.md) | Firebase Console + rules deploy checklist |

## Privacy

Everything happens in your browser for editing and export. No telemetry. Document **history** (ปุ่ม ประวัติ) is saved only in this browser's `localStorage` — it will not appear on another PC or device. **Templates** may sync via Firebase when the deployed site has Firebase configured. Cleaner preferences are also in `localStorage`. The in-progress document is gone on reload unless you saved a snapshot or template.

## License

MIT
