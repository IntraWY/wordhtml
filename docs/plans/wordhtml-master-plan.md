# Master Feature Expansion Plan: wordhtml
## แผนขยายฟีเจอร์ฉบับสมบูรณ์สำหรับ wordhtml (Word ↔ HTML Converter + WYSIWYG A4 Editor)

---

**จัดทำโดย:** Technical Product Manager & Architecture Synthesis  
**วันที่:** 2025-01-20  
**แหล่งข้อมูล:** Competitive Analysis, Technical Feasibility Analysis, User Journey Analysis, CLAUDE.md (Repository Guide)  
**รูปแบบ:** Markdown — ไทย primary, English technical terms ในวงเล็บ  
**ความยาวประมาณการ:** 50-80 หน้า A4 (ถ้าพิมพ์)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Competitive Landscape](#3-competitive-landscape)
4. [Feature Matrix (5 Tiers)](#4-feature-matrix-5-tiers)
5. [Phased Roadmap (Phase 1-5)](#5-phased-roadmap-phase-1-5)
6. [Technical Architecture Notes](#6-technical-architecture-notes)
7. [Risk Assessment & Mitigation](#7-risk-assessment--mitigation)
8. [Success Metrics](#8-success-metrics)

---

## 1. Executive Summary

### 1.1 สรุปปัญหา: ทำไม wordhtml clone ยังรู้สึก "ไม่สมบูรณ์"

wordhtml clone (Next.js 16 + Tiptap v3 + Zustand) เป็นเครื่องมือแปลง Word ↔ HTML ที่ทำงานบน browser 100% ไม่มี server ไม่ต้อง login ซึ่งเป็นจุดแข็งด้าน privacy-first แต่จากการวิเคราะห์ user journey พบว่า user รู้สึก "ไม่สมบูรณ์" (incomplete) จากปัญหาหลัก 4 กลุ่ม:

#### กลุ่มที่ 1: Document Structure — ขาดสิ่งที่เอกสารทางการต้องมี
- **ไม่มี Header/Footer Editor** — เอกสารราชการไทยทุกฉบับต้องมีหัวกระดาษ (letterhead) และท้ายกระดาษ ปัจจุบัน clone มี A4 paper editor ที่สวยงามแต่ไม่มี header/footer zone
- **ไม่มี Page Numbers** — เลขหน้าเป็นสิ่งจำเป็นพื้นฐานสำหรับเอกสารที่พิมพ์ออกมา
- **ไม่มี A4 Pagination Engine** — user ไม่รู้ว่าเนื้อหาจะตกหน้าไหนเมื่อพิมพ์ ไม่มี true "what you see is what you print"
- **Table of Contents (TOC)** — มีอยู่แล้วแต่เป็นระดับพื้นฐาน ยังไม่มี auto-sync แบบ real-time และยังไม่แสดงเลขหน้า

#### กลุ่มที่ 2: Data Safety & Recovery — กลัวข้อมูลหาย
- **ไม่มี Auto-save / Crash Recovery** — ปัจจุบันมี snapshot แบบ manual (Ctrl+Shift+S) และ auto-snapshot หลัง 2 นาที idle แต่ไม่มี recovery prompt เมื่อ browser crash/refresh
- **ไม่มี Unsaved Changes Warning** — มี `beforeunload` แต่ UX ยังไม่สมบูรณ์ (ไม่มี discard/restore choice)
- **Document ไม่ persist** — โดย design current document หายเมื่อ reload ซึ่งดีต่อ privacy แต่ bad ต่อ user experience

#### กลุ่มที่ 3: Productivity & UX — ทำงานช้าเกินไป
- **ไม่มี Slash Commands (`/`)** — UX ยังเป็น menu-based แบบ Office 2000 ไม่มี block insertion แบบ Notion/Google Docs
- **ไม่มี Command Palette (Ctrl+K)** — ค้นหา command ทั้งหมดในแอพไม่ได้ ต้องจำว่าอยู่ใน menu ไหน
- **ไม่มี Markdown Shortcuts** — power users ต้องการ `# ` → H1, `* ` → bullet, `> ` → quote
- **ไม่มี Progress Indicators** — convert ไฟล์ใหญ่แล้ว user ไม่รู้ว่ากำลังทำงานอยู่หรือค้าง
- **ไม่มี Context Menu (right-click)** — ต้องไปหา command ใน menu bar ทุกครั้ง

#### กลุ่มที่ 4: Media & Objects — จัดการรูปภาพและตารางยาก
- **Image resize ไม่สมบูรณ์** — มี width/height attributes แต่ไม่มี drag-to-resize handles
- **ไม่มี Image Caption** — รายงานต้องมีคำบรรยายภาพ (figcaption)
- **ไม่มี Image Text Wrap** — จัดตำแหน่งรูปแบบ float left/right ไม่ได้
- **ไม่มี Table Merge/Split Cells** — ตารางซับซ้อนไม่สามารถสร้างได้
- **ไม่มี Charts/Equations** — รายงานวิชาการ/งบประมาณต้องการ

### 1.2 สรุปโอกาส: Features ที่ทำได้ใน Browser 100%

จากการวิเคราะห์ technical feasibility พบว่า **ทุก feature ที่ระบุ (23/23) ทำได้จริงใน browser 100%** โดยไม่ต้อง backend server:

| Tier | Features | สรุป Feasibility |
|------|----------|-----------------|
| **Tier 1: Core Document** (8 items) | Image resize, Caption, Text wrap, Charts, Header/Footer, Page numbers, TOC, Text boxes | ทำได้ทั้งหมด โดย Header/Footer + Page numbers ต้องใช้ pagination engine (ซื้อ Pro หรือ build เอง) |
| **Tier 2: Productivity** (6 items) | Auto-recovery, Clipboard history, Outline, Templates, Bookmarks, Table formulas | ทำได้ทั้งหมด เป็น pure client-side logic |
| **Tier 3: Privacy & Data** (4 items) | Local encryption, IndexedDB, P2P share, QR export | ทำได้ทั้งหมด Web APIs รองรับครบ |
| **Tier 4: UX Polish** (5 items) | Command Palette, Context menu, Inline comments, Zen mode, Typewriter scrolling | ทำได้ทั้งหมด |
| **Tier 5: Advanced** (เพิ่มเติม) | PDF export, Embeds, Drawing canvas, Voice typing, Math equations | ทำได้ทั้งหมด |

**จุดแข็งที่ clone มีเหนือคู่แข่ง:**
1. **100% client-side, privacy-first** — ไม่มี server, ไม่ต้อง login
2. **A4 WYSIWYG paper editor** — ใกล้เคียง Word มากกว่า HTML editor ทั่วไป
3. **Thai-first i18n** — TH Sarabun, Noto Sans Thai, Kanit, Prompt พร้อม paragraph spacing แบบไทย
4. **Template Studio** — มี variable badges, data import, multi-page preview (เหนือกว่าต้นฉบับ wordhtml.com)
5. **Ruler + Margin guides** — professional page layout feel (cm-scale)
6. **History/Snapshots** — local version control (ถึงจะ manual อยู่)
7. **Modern stack** — Next.js 16, Tiptap v3, Tailwind v4

### 1.3 สรุปแผน: 5 Phases, 20 สัปดาห์

| Phase | ชื่อ | สัปดาห์ | เป้าหมายหลัก |
|-------|------|---------|-------------|
| **Phase 1** | Foundation & Quick Wins | สัปดาห์ 1-3 | สร้าง trust กับ user: auto-save, slash commands, command palette, progress indicators, Thai fonts สมบูรณ์ |
| **Phase 2** | Document Structure | สัปดาห์ 4-7 | ทำให้เป็น "Word บน browser": header/footer, page numbers, TOC, bookmarks, page break |
| **Phase 3** | Media & Objects | สัปดาห์ 8-11 | จัดการสื่อและวัตถุ: charts, image text wrap, table merge/formulas, embeds, drawing |
| **Phase 4** | Productivity & Polish | สัปดาห์ 12-15 | ทำให้ทำงานเร็วขึ้น: template gallery, clipboard history, outline, comments, context menu, zen mode |
| **Phase 5** | Privacy & Advanced | สัปดาห์ 16-20 | ยกระดับความเป็นส่วนตัว: IndexedDB migration, encryption, PDF export, P2P share, plugin system |

**Timeline รวม:** ประมาณ 20 สัปดาห์ (5 เดือน) สำหรับทีม 1-2 developers แบบ full-time หรือ 8-10 เดือนสำหรับทีม part-time

---

## 2. Current State Analysis

### 2.1 Features ที่มีอยู่แล้วใน Repository (จาก CLAUDE.md)

#### Document Formatting
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Bold, Italic, Underline, Strikethrough | ✅ Done | Tiptap StarterKit + Underline |
| Text color / Background highlight | ✅ Done | `@tiptap/extension-color` + highlight |
| Font family (7+ fonts) | ✅ Done | TH Sarabun PSK, Sarabun, Noto Sans Thai, Kanit, Prompt, system-ui, serif, monospace |
| Font size (10-36px) | ✅ Done | Custom `fontSize` Mark |
| Paragraph alignment | ✅ Done | `@tiptap/extension-text-align` |
| Ordered/unordered lists | ✅ Done | StarterKit + custom bulletListWithClass |
| Task lists | ✅ Done | `@tiptap/extension-task-list` |
| Indent/outdent | ✅ Done | Tab/Shift+Tab ใน ParagraphFormatExtension |
| Blockquote | ✅ Done | StarterKit |
| Subscript/Superscript | ✅ Done | `@tiptap/extension-subscript` + superscript |
| Code inline / Code block | ✅ Done | StarterKit |
| Horizontal rule | ✅ Done | StarterKit |
| Paragraph spacing (before/after) | ✅ Done | ParagraphFormatExtension: `spaceBefore`, `spaceAfter` |
| Line height (single/1.5/double/custom) | ✅ Done | ParagraphFormatExtension: `lineHeight` + `lineHeightMode` |
| Hanging indent / First-line indent | ✅ Done | ParagraphFormatExtension: `textIndent`, `marginLeft/Right` |
| Link insertion | ✅ Done | `@tiptap/extension-link` |
| Hard break / Soft break | ✅ Done | StarterKit + custom soft break |
| Clear formatting | ✅ Done | FormatMenu |
| Page break | ✅ Done | Custom `pageBreak` block node |
| Heading 1-6 | ✅ Done | StarterKit + custom `headingWithId` |

#### Media & Objects
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Image insert (upload/URL) | ✅ Done | Custom `imageWithAlign` node |
| Image alignment (left/center/right) | ✅ Done | `imageWithAlign` attributes |
| Table (basic) | ✅ Done | `@tiptap/extension-table` + row/cell/header |
| Table row/column ops | ✅ Done | TableMenu: insert/delete rows/columns |
| Horizontal rule | ✅ Done | StarterKit |

#### Document Structure
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Page break | ✅ Done | Custom `pageBreak` node |
| Heading formats | ✅ Done | StarterKit + headingWithId |
| Table of Contents (basic) | ⚠️ Partial | มี TOC UI แต่เป็น manual/one-time generation |

#### Productivity
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Word count | ✅ Done | `countWords()` Thai-aware |
| Undo/Redo | ✅ Done | StarterKit history |
| Find & Replace | ✅ Done | `@sereneinserenade/tiptap-search-and-replace` |
| Keyboard shortcuts | ✅ Done | Ctrl+S/O/F/K/P, F11, Tab/Shift+Tab |
| Snapshots (manual) | ✅ Done | HistoryPanel: save/restore/duplicate/delete |
| Auto-snapshot (2 min idle) | ⚠️ Partial | มีแต่ไม่มี crash recovery |
| Template system | ✅ Done | Template Studio: create/save/load/export/import |
| Template variables ({{name}}) | ✅ Done | `variableMark` |
| Data import for templates | ✅ Done | JSON/CSV import for variable filling |
| Batch convert | ✅ Done | Multi-file conversion |
| Dark mode | ❌ No | Light only per CLAUDE.md (แต่ competitive analysis บอกว่ามี dark mode?) |
| Ruler (cm) | ✅ Done | H/V rulers with draggable margin handles |
| Page setup dialog | ✅ Done | A4/Letter, portrait/landscape, margins |
| Print preview | ⚠️ Partial | `@media print` มีแต่ไม่มี visual preview modal |

#### Export/Import
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Import DOCX (drag & drop) | ✅ Done | mammoth.js |
| Import HTML | ✅ Done | `loadHtmlFile.ts` |
| Import Markdown | ✅ Done | turndown reverse (หรือแยก parser?) |
| Export HTML (inline/extracted) | ✅ Done | `exportHtml.ts` |
| Export ZIP (with images) | ✅ Done | JSZip |
| Export DOCX | ✅ Done | html-docx-js (dynamic import) |
| Export Markdown | ✅ Done | turndown with GFM tables |
| Image compression | ✅ Done | Extract base64 → File[] for ZIP |

#### HTML Cleaning
| Feature | สถานะ | รายละเอียด |
|---------|--------|------------|
| Remove inline styles | ✅ Done | `cleaners.ts` |
| Remove empty tags | ✅ Done | cleaners |
| Clear successive spaces | ✅ Done | cleaners |
| Remove tag attributes | ✅ Done | cleaners |
| Strip classes & IDs | ✅ Done | cleaners |
| Remove nbsp-only elements | ✅ Done | cleaners |
| Remove HTML comments | ✅ Done | cleaners |
| Convert to plain text | ✅ Done | terminal cleaner |
| Unwrap deprecated tags | ✅ Done | cleaners |

### 2.2 Features ที่ Audit พบว่าขาด / Broken

จากการวิเคราะห์ 3 รายงาน + CLAUDE.md พบ features ที่ขาดหรือไม่สมบูรณ์:

| # | Feature | สถานะ | Severity | หมายเหตุ |
|---|---------|--------|----------|---------|
| 1 | **Header & Footer Editor** | ❌ Missing | 🔴 Critical | จุดขาดที่สำคัญที่สุดสำหรับ A4 editor |
| 2 | **Page Numbers** | ❌ Missing | 🔴 Critical | ต้องทำคู่กับ header/footer |
| 3 | **Auto-save / Crash Recovery** | ⚠️ Partial | 🔴 High | มี auto-snapshot แต่ไม่มี recovery prompt |
| 4 | **Unsaved Changes Dialog** | ⚠️ Partial | 🔴 High | `beforeunload` มีแต่ UX ยัง primitive |
| 5 | **Slash Commands (`/`)** | ❌ Missing | 🔴 High | UX สมัยใหม่ที่ทุกคนรอคอย |
| 6 | **Command Palette (Ctrl+K)** | ❌ Missing | 🔴 High | Ctrl+K ตอนนี้ทำงานเป็น Insert Link |
| 7 | **Markdown Shortcuts** | ⚠️ Partial | 🔶 Medium | Tiptap มี built-in แต่ยังไม่ได้ enable |
| 8 | **Progress Indicator (convert/export)** | ❌ Missing | 🔶 Medium | ไฟล์ใหญ่แล้ว user ไม่รู้ว่ากำลังทำงาน |
| 9 | **Image Resize (drag handles)** | ⚠️ Partial | 🔶 Medium | มี width/height attributes แต่ไม่มี drag UI |
| 10 | **Image Caption (figcaption)** | ❌ Missing | 🔶 Medium | ต้องสร้าง figure node |
| 11 | **Image Text Wrap (float)** | ⚠️ Partial | 🔶 Medium | มี align แต่ไม่มี float/wrap |
| 12 | **Table Merge/Split Cells** | ❌ Missing | 🔶 Medium | Tiptap table extension ไม่รวม merge |
| 13 | **Table Formulas** | ❌ Missing | 🟢 Low | ขาดสำหรับงบประมาณ/คะแนน |
| 14 | **Charts (bar/line/pie)** | ❌ Missing | 🟢 Low | รายงานวิชาการต้องการ |
| 15 | **Math Equations (KaTeX)** | ❌ Missing | 🟢 Low | สมการคณิตศาสตร์ |
| 16 | **Bookmarks / Anchors** | ❌ Missing | 🟢 Low | Internal linking |
| 17 | **Embeds (YouTube, iframe)** | ❌ Missing | 🟢 Low | แทรกสื่อภายนอก |
| 18 | **Inline Comments** | ❌ Missing | 🟢 Low | คอมเมนต์บนเอกสาร (local-only) |
| 19 | **Context Menu (right-click)** | ❌ Missing | 🔶 Medium | UX พื้นฐาน |
| 20 | **Zen Mode / Focus Mode** | ❌ Missing | 🟢 Low | โหมดโฟกัส |
| 21 | **Typewriter Scrolling** | ❌ Missing | 🟢 Low | Scroll ให้ caret อยู่ตรงกลาง |
| 22 | **Clipboard History** | ❌ Missing | 🟢 Low | ประวัติการคัดลอก |
| 23 | **Outline / Navigation Panel** | ⚠️ Partial | 🟢 Low | TOC มีแต่ไม่มี side panel |
| 24 | **Export PDF** | ❌ Missing | 🔶 Medium | ใช้ html2pdf |
| 25 | **IndexedDB Storage** | ❌ Missing | 🔶 Medium | เก็บเอกสารใหญ่ได้ |
| 26 | **Local Encryption** | ❌ Missing | 🟢 Low | Web Crypto API |
| 27 | **P2P Share (WebRTC)** | ❌ Missing | 🟢 Low | แชร์เอกสารโดยไม่ผ่าน server |
| 28 | **QR Code Export** | ❌ Missing | 🟢 Low | สร้าง QR จากเอกสาร |
| 29 | **Voice Typing** | ❌ Missing | 🟢 Low | Web Speech API |
| 30 | **Character Count** | ❌ Missing | 🟢 Low | Tiptap extension มีให้ |
| 31 | **Drawing Canvas (basic shapes)** | ❌ Missing | 🟢 Low | รูปทรงพื้นฐาน |
| 32 | **Import from URL** | ❌ Missing | 🟢 Low | เปิดไฟล์จาก URL |
| 33 | **Plugin System** | ❌ Missing | 🟢 Low | ระบบปลั๊กอิน |

### 2.3 Architecture ปัจจุบัน (หลัง Refactor)

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js 16 (App Router)                  │
│                        output: "export" (Static)               │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer                                                        │
│  ├── EditorShell.tsx       (A4 paper + ruler + drag-drop)       │
│  ├── TopBar.tsx            (filename + history/upload/export)     │
│  ├── MenuBar.tsx           (7-menu nav)                          │
│  ├── FormattingToolbar.tsx (icon toolbar)                        │
│  ├── VisualEditor.tsx      (Tiptap EditorContent)               │
│  └── Dialogs/ Panels       (Paragraph, PageSetup, Export, etc.)   │
├─────────────────────────────────────────────────────────────────┤
│  Editor Engine (Tiptap v3)                                       │
│  ├── StarterKit            (bold, italic, lists, headings, etc.) │
│  ├── Custom Extensions                                               │
│  │   ├── ParagraphFormatExtension  (indent, spacing, line height)│
│  │   ├── FontSize                  (inline font-size mark)       │
│  │   ├── PageBreak                 (block-level page break)      │
│  │   ├── VariableMark              ({{variable}} mark)           │
│  │   ├── RepeatingRow               (table data-repeat)           │
│  │   ├── HeadingWithId              (heading + id attr)          │
│  │   ├── BulletListWithClass        (list + class attr)            │
│  │   └── ImageWithAlign             (image + align/width)         │
│  └── Community Extensions                                          │
│      ├── SearchAndReplace          (find/replace)                │
│      ├── Table + Row + Cell + Header                             │
│      ├── TaskList + TaskItem                                     │
│      ├── TextAlign, Color, Highlight, FontFamily                │
│      ├── Subscript, Superscript                                  │
│      ├── Underline, Link, Placeholder                            │
├─────────────────────────────────────────────────────────────────┤
│  State Management (Zustand)                                      │
│  ├── editorStore.ts        (documentHtml, pageSetup, history)   │
│  ├── Persisted: enabledCleaners, imageMode, history, pageSetup │
│  └── Session: documentHtml, sourceOpen, pendingExportFormat     │
├─────────────────────────────────────────────────────────────────┤
│  Conversion & Export                                               │
│  ├── mammoth.js            (DOCX → HTML)                         │
│  ├── html-docx-js          (HTML → DOCX, dynamic import)       │
│  ├── turndown              (HTML → Markdown)                     │
│  ├── JSZip                 (ZIP export with extracted images)    │
│  └── Cleaning Pipeline     (9 pure HTML cleaners)                │
├─────────────────────────────────────────────────────────────────┤
│  Styling (Tailwind CSS v4)                                      │
│  ├── globals.css           (@theme inline tokens)                │
│  ├── .prose-editor         (editor typography)                   │
│  ├── .paper                (A4 paper dimensions)               │
│  └── @media print          (print stylesheet)                   │
└─────────────────────────────────────────────────────────────────┘
```

**ข้อมูลสำคัญ:**
- **Static Export** — ไม่มี API routes, ไม่มี server processing
- **Privacy-first by design** — document ไม่ persist โดย default (ตั้งใจให้หายเมื่อ reload)
- **localStorage only** — เก็บ preferences + history snapshots (capped 4MB)
- **No IndexedDB** — ยังไม่ได้ใช้ IndexedDB ทั้งๆ ที่เหมาะสมกับเอกสารใหญ่
- **Thai-first** — รองรับฟอนต์ไทย มี `countWords()` ที่ Thai-aware
- **A4 WYSIWYG** — 794×1123 px paper editor ที่ใกล้เคียง Word มากที่สุดใน browser

---

## 3. Competitive Landscape

### 3.1 สรุปจาก Competitive Analysis

#### wordhtml.com (ต้นฉบับ)
**จุดแข็ง:** HTML source split view (Word | HTML side-by-side), cleaning icons one-by-one, compress/encoding toggle  
**จุดอ่อน:** ไม่มี A4 WYSIWYG, ไม่มี ruler, ไม่มี template system, ไม่มี dark mode  
**clone ทำได้ดีกว่า:** A4 paper editor, dark mode (?) , ruler, paragraph dialog, history, template system, markdown export/import, batch convert, find & replace

#### Microsoft Word for the Web (Word Online)
**ทำใน browser ได้:** Font, size, color, alignment, images, basic tables, headers/footers (basic), page numbers, TOC, comments, dictation, dark mode, ruler  
**ต้องใช้ Desktop:** Mail merge, macros, watermarks, advanced tables, compare/merge  
**clone ควร port:** Headers/Footers, Page Numbers, Dictation (Web Speech API), Checklists, Equations

#### Google Docs
**ทำใน browser ได้:** เกือบทุกอย่างรวม collaboration 50 users, comments, version history, offline mode (IndexedDB), voice typing, Smart Chips  
**UX patterns ที่น่า port:** Slash commands (`/`), Command palette (Ctrl+K), @mentions, Pageless mode, Document tabs, Cover images

#### Notion / Craft / AppFlowy
**UX patterns ที่ดี:** Slash commands, Drag-and-drop blocks, Markdown shortcuts, Command palette, Toggle blocks, Callouts  
**สิ่งที่ port มาใช้ได้ง่าย:** Slash commands ✅, Markdown shortcuts ✅, Drag-and-drop ✅, Toggle blocks/Callouts ✅, Command palette ✅, Cover images ✅

### 3.2 Feature Gap Table: wordhtml vs Competitors

| Feature Category | wordhtml (Current) | Word Online | Google Docs | Notion | wordhtml.com (Original) |
|-----------------|-------------------|-------------|-------------|--------|------------------------|
| **Document Formatting** |
| Bold/Italic/Underline/Strike | ✅ | ✅ | ✅ | ✅ | ✅ |
| Text color / Highlight | ✅ | ✅ | ✅ | ✅ | ✅ |
| Font family / Size | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alignment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lists (bullet/ordered/task) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Indent/Outdent | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paragraph spacing | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Line height control | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| Hanging/first-line indent | ✅ | ✅ | ✅ | ❌ | ❌ |
| Styles (Heading 1-3 + Normal) | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| Clear formatting | ✅ | ✅ | ✅ | ✅ | ✅ |
| Columns (2/3) | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Media & Objects** |
| Images (upload/URL) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Image resize | ⚠️ | ✅ | ✅ | ✅ | ⚠️ |
| Image align | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Image caption | ❌ | ✅ | ✅ | ✅ | ❌ |
| Image text wrap | ❌ | ✅ | ✅ | ❌ | ❌ |
| Tables (basic) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Table merge cells | ❌ | ✅ | ✅ | ❌ | ❌ |
| Table styles | ⚠️ | ✅ | ✅ | ⚠️ | ⚠️ |
| Table formulas | ❌ | ✅ | ✅ | ❌ | ❌ |
| Horizontal rule | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shapes / Drawing | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| Charts | ❌ | ✅ | ✅ | ❌ | ❌ |
| Equations (Math) | ❌ | ✅ | ✅ | ✅ | ❌ |
| Bookmarks / Anchors | ❌ | ✅ | ✅ | ✅ | ❌ |
| Embeds (YouTube, etc.) | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Document Structure** |
| Page breaks | ✅ | ✅ | ✅ | ❌ | ✅ |
| Headers / Footers | ❌ | ✅ | ✅ | ❌ | ❌ |
| Page numbers | ❌ | ✅ | ✅ | ❌ | ❌ |
| Table of Contents | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Sections (different margins) | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Productivity** |
| Undo/Redo | ✅ | ✅ | ✅ | ✅ | ✅ |
| Find & Replace | ✅ | ✅ | ✅ | ✅ | ❌ |
| Word count | ✅ | ✅ | ✅ | ✅ | ✅ |
| Character count | ❌ | ✅ | ✅ | ✅ | ❌ |
| Slash commands | ❌ | ❌ | ✅ | ✅ | ❌ |
| Command palette | ❌ | ❌ | ✅ | ✅ | ❌ |
| Markdown shortcuts | ⚠️ | ⚠️ | ✅ | ✅ | ❌ |
| Keyboard shortcuts panel | ✅ | ✅ | ✅ | ✅ | ❌ |
| Templates | ✅ | ✅ | ✅ | ✅ | ❌ |
| History / Snapshots | ✅ | ✅ | ✅ | ✅ | ❌ |
| Dark mode | ❌ (light only) | ✅ | ✅ | ✅ | ❌ |
| Comments | ❌ | ✅ | ✅ | ✅ | ❌ |
| Collaboration | ❌ | ✅ | ✅ | ✅ | ❌ |
| Voice typing | ❌ | ✅ | ✅ | ❌ | ❌ |
| Auto-save / Crash recovery | ⚠️ | ✅ | ✅ | ✅ | ❌ |
| Print preview | ⚠️ | ✅ | ✅ | ❌ | ❌ |
| Ruler | ✅ | ✅ | ❌ | ❌ | ❌ |
| Page setup dialog | ✅ | ✅ | ✅ | ❌ | ❌ |
| Status bar | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Export/Import** |
| Import DOCX | ✅ | ✅ | ✅ | ❌ | ✅ |
| Import HTML | ✅ | ❌ | ✅ | ❌ | ✅ |
| Import Markdown | ✅ | ❌ | ❌ | ✅ | ❌ |
| Export HTML | ✅ | ❌ | ✅ | ✅ | ✅ |
| Export ZIP | ✅ | ❌ | ❌ | ❌ | ✅ |
| Export DOCX | ✅ | ✅ | ✅ | ❌ | ✅ |
| Export PDF | ❌ | ✅ | ✅ | ❌ | ❌ |
| Export Markdown | ✅ | ❌ | ✅ | ✅ | ❌ |
| Batch convert | ✅ | ❌ | ❌ | ❌ | ❌ |
| Image compression | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Privacy / Special** |
| 100% client-side | ✅ | ❌ | ❌ | ❌ | ✅ |
| No login required | ✅ | ❌ | ❌ | ❌ | ✅ |
| Local encryption | ❌ | ❌ | ❌ | ❌ | ❌ |
| P2P share | ❌ | ❌ | ❌ | ❌ | ❌ |
| QR code export | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.3 UX Patterns ที่ควร Port มาใช้

จากการวิเคราะห์คู่แข่ง ระบุ UX patterns ที่ควรนำมาใช้ใน wordhtml clone:

| UX Pattern | มาจาก | Implement ยากไหม | แผน |
|-----------|--------|------------------|-----|
| **Slash Commands (`/`)** | Notion, Craft, Tiptap demos | ง่าย | Phase 1 — Tiptap มี Slash Menu ให้ |
| **Command Palette (Ctrl+K)** | Notion, GDocs, Linear | ง่าย | Phase 1 — ใช้ `cmdk` + `fuse.js` |
| **Markdown Shortcuts** | GDocs, Notion | ง่าย | Phase 1 — Tiptap มี InputRules |
| **Drag-and-drop blocks** | Notion, Craft | ปานกลาง | Phase 4 — Tiptap มี drag-and-drop extension |
| **Context Menu (right-click)** | Word, GDocs | ง่าย | Phase 4 — Radix ContextMenu |
| **Progress Indicators** | GDocs, Linear | ง่าย | Phase 1 — UI component |
| **Inline Comments** | Word, GDocs | ปานกลาง | Phase 4 — Custom Mark + Zustand store |
| **Toast Notifications** | Linear, Vercel | ง่าย | Phase 1 — ใช้ sonner หรือ custom |
| **Empty State Illustrations** | Notion, Linear | ง่าย | Phase 1 — Quick-start actions |
| **Zen Mode** | iA Writer, Ulysses | ง่าย | Phase 4 — CSS toggle |
| **Typewriter Scrolling** | iA Writer | ง่าย | Phase 4 — scrollIntoView |
| **@mentions / Smart Chips** | GDocs, Notion | ปานกลาง | Phase 5 — Tiptap Mention extension |

---

## 4. Feature Matrix (5 Tiers)

แบ่ง features ออกเป็น 5 Tiers ตามลำดับความสำคัญและความเกี่ยวข้องกัน แต่ละ feature มีรายละเอียดครบถ้วน

---

### Tier 1: Core Document (พื้นฐานที่สุด — ทำก่อน)

ฟีเจอร์พื้นฐานที่ทำให้ wordhtml เป็น "word processor" ที่สมบูรณ์ ไม่ใช่แค่ text editor

---

#### T1-F01: Header & Footer System

| Field | Value |
|-------|-------|
| **Description** | ระบบหัวกระดาษ (header) และท้ายกระดาษ (footer) ที่แสดงซ้ำในทุกหน้า หรือแตกต่างตาม section รองรับการแก้ไขแบบ WYSIWYG ภายใน header/footer zone |
| **Impact** | 10/10 | เอกสารราชการไทยทุกฉบับต้องมี |
| **Effort** | Hard |
| **Technical Approach** | มี 2 แนวทาง: (A) ใช้ `@tiptap-pro/extension-pages` (paid, มี pagination + header/footer + page formats ครบ) หรือ (B) ใช้ `tiptap-pagination-plus` (open source, มี header/footer + page numbers + margins) หรือ (C) สร้าง custom pagination engine เอง |
| **Dependencies** | Page break logic, Page numbers (T1-F02), Pagination engine |
| **Status** | Planned |
| **Risk** | 🔴 High — Pagination engine ซับซ้อนมาก ถ้าใช้ Pro extension ต้องจ่ายเงิน ถ้า build เองใช้เวลามาก |
| **Alternatives** | ถ้า budget ไม่พอ: ลด scope ให้เป็น "print-only header/footer" (แสดงเฉพาะตอน print ผ่าน `@media print` CSS) ก่อน แล้วค่อยทำ WYSIWYG |

**รายละเอียด Technical:**
- Tiptap Pages Pro มีข้อจำกัด: "Non-splittable blocks larger than a page cause an infinite layout loop" และ "No browser-print integration"
- Pagination engine ต้อง handle: content splitting ระหว่างหน้า, orphan/widow control, table ที่ยาวเกินหน้า
- ถ้าใช้แนวทาง custom: สร้าง `page` node ที่เป็น container ของ content + `header`/`footer` node ย่อย

---

#### T1-F02: Page Numbers

| Field | Value |
|-------|-------|
| **Description** | หมายเลขหน้าที่แสดงใน header หรือ footer รองรับรูปแบบ: 1, 2, 3... หรือ i, ii, iii... (roman numeral) ตำแหน่ง: top/bottom, left/center/right |
| **Impact** | 10/10 | เอกสารทางการต้องมี |
| **Effort** | Hard |
| **Technical Approach** | ขึ้นกับแนวทาง Header/Footer: ถ้าใช้ pagination engine → มี `{page}` และ `{total}` placeholders ถ้า custom → นับจำนวน `page` nodes แล้ว render เป็น text node ใน footer |
| **Dependencies** | Header & Footer (T1-F01), Pagination engine |
| **Status** | Planned |
| **Risk** | 🔴 High — "Page X of Y" ต้องรู้ total pages ก่อน render → ต้อง 2-pass layout หรือ estimate |
| **Note** | CSS `@page { @bottom-center { content: counter(page) } }` ไม่มี browser support ใน Chrome/Firefox — ใช้ได้เฉพาะ PrinceXML, WeasyPrint, Paged.js |

---

#### T1-F03: Image Resize (Drag Handles)

| Field | Value |
|-------|-------|
| **Description** | ลากมุมรูปภาพเพื่อปรับขนาด (resize handles) พร้อม maintain aspect ratio (Shift+drag) และแสดง dimensions ขณะลาก |
| **Impact** | 8/10 | จัดรูปภาพพื้นฐาน |
| **Effort** | Easy |
| **Technical Approach** | Tiptap v3 มี `ResizableNodeView` เป็น official utility ที่ wrap HTMLElement ใดๆ และเพิ่ม resize handles ให้โดยอัตโนมัติ หรือใช้ library: `tiptap-extension-resizable-image` (รองรับ Tiptap v2+v3, มี caption option) หรือ `@pentestpad/tiptap-extension-figure` (resize + align + caption) |
| **Dependencies** | Extend Image node เพิ่ม `width`, `height` attributes |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Figure node (image+caption) มี selection behavior ต่างจาก Image node ธรรมดา |

---

#### T1-F04: Image Caption (figcaption)

| Field | Value |
|-------|-------|
| **Description** | คำบรรยายภาพ (caption) ที่อยู่ใต้รูปภาพ แก้ไขได้ รองรับการจัดตำแหน่ง (left/center/right) |
| **Impact** | 7/10 | รายงานต้องมีคำบรรยายภาพ |
| **Effort** | Medium |
| **Technical Approach** | สร้าง custom `figure` node ที่มี schema: `figure → [img, figcaption (contentEditable)]` ใช้ `contentDOM` ใน NodeView สำหรับ figcaption ที่ editable หรือใช้ library: `@pentestpad/tiptap-extension-figure` หรือ `tiptap-extension-resizable-image` (withCaption: true) |
| **Dependencies** | Image Resize (T1-F03) — ควร implement ร่วมกัน |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Figure node selection behavior ต่างจาก Image node ต้องจัดการ cursor/selection ให้ดี |

---

#### T1-F05: Image Text Wrap (Float)

| Field | Value |
|-------|-------|
| **Description** | ตัวหนังสือห่อหุ้มรูปภาพ (text wrap) แบบ float left/right หรือ inline รองรับ margin/spacing ระหว่างรูปกับข้อความ |
| **Impact** | 7/10 | จัดหน้าเอกสารสวยงาม |
| **Effort** | Easy |
| **Technical Approach** | ใช้ CSS `float: left/right` บน image element ที่อยู่ใน contenteditable Extend Image node เพิ่ม `align` attribute แล้ว map เป็น CSS class หรือ inline style |
| **Dependencies** | Image Resize (T1-F03), Image Caption (T1-F04) |
| **Status** | Planned |
| **Risk** | 🟢 Low — CSS float ทำงานใน contenteditable ได้ปกติ แต่ต้องระวัง `clear` behavior |

---

#### T1-F06: TOC Auto-Generation (Enhanced)

| Field | Value |
|-------|-------|
| **Description** | สารบัญที่ sync แบบ real-time เมื่อ headings เปลี่ยน (เพิ่ม/ลบ/แก้ไข) แสดงเลขหน้า (ถ้ามี pagination) และรองรับการ click-to-scroll |
| **Impact** | 9/10 | เอกสารยาวต้องมีสารบัญ |
| **Effort** | Easy |
| **Technical Approach** | ใช้ Tiptap `getJSON()` หรือ traverse ProseMirror document tree (`editor.state.doc.descendants()`) เพื่อหา heading nodes Update TOC ผ่าน `editor.on('update', ...)` event Click TOC item → `editor.commands.setTextSelection(pos)` + `editor.commands.scrollIntoView()` |
| **Dependencies** | Heading nodes (มีอยู่แล้ว), Page numbers (T1-F02) — สำหรับ page number ในสารบัญ |
| **Status** | In Progress (มีอยู่แล้วแต่เป็น one-time generation) |
| **Risk** | 🟢 Low — logic ง่าย แต่ถ้ามี pagination ต้องรอ layout เสร็จก่อนแสดงเลขหน้า |

---

#### T1-F07: Charts (Bar, Line, Pie)

| Field | Value |
|-------|-------|
| **Description** | แทรกกราฟ (bar chart, line chart, pie chart) แก้ไขข้อมูลได้ แสดงแบบ interactive หรือ static image |
| **Impact** | 6/10 | รายงานวิชาการ งบประมาณ |
| **Effort** | Medium |
| **Technical Approach** | ใช้ Chart library ใน browser: `chart.js` (canvas-based, lightweight) หรือ `recharts` (React/SVG-based) หรือ `d3` (ความยืดหยุ่นสูง) Integration: สร้าง custom Tiptap `chart` NodeView ที่ render Chart component ใน React โดยตรง เก็บ chart data (labels, values) ใน JSON เพื่อ edit ได้ภายหลัง |
| **Dependencies** | Image node (สำหรับ static export) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Canvas-based charts ต้อง render ลง canvas แล้วใช้ `canvas.toDataURL()` สำหรับ print/export |

---

#### T1-F08: Text Boxes / Basic Shapes

| Field | Value |
|-------|-------|
| **Description** | กล่องข้อความ (text box) และรูปทรงพื้นฐาน (rectangle, circle, arrow) ที่วางบนเอกสารได้ |
| **Impact** | 5/10 | เอกสารนำเสนอ |
| **Effort** | Hard |
| **Technical Approach** | สร้าง custom node ที่ใช้ absolute positioning ผ่าน CSS `position: absolute` + SVG หรือ HTML ธรรมดา เก็บ x, y, width, height เป็น node attributes แล้ว render ผ่าน NodeView ProseMirror ไม่ถนัด absolute positioning — ต้องระวัง cursor/selection behavior |
| **Dependencies** | ไม่มี (แต่ซับซ้อน) |
| **Status** | Planned |
| **Risk** | 🔴 High — ProseMirror ถูกออกแบบมาสำหรับ flow layout ไม่ใช่ absolute positioning |
| **Alternatives** | ลด scope ให้เป็น "anchored text boxes" ที่ติดกับ paragraph (เหมือน Word) แทน absolute positioning |

---

### Tier 2: Productivity (ทำงานเร็วขึ้น)

ฟีเจอร์ที่ช่วยให้ user ทำงานได้เร็วขึ้น มีประสิทธิภาพมากขึ้น

---

#### T2-F01: Auto-save / Crash Recovery

| Field | Value |
|-------|-------|
| **Description** | บันทึกเอกสารอัตโนมัติทุก N วินาที (เช่น 30 วินาที) เมื่อ browser crash / ปิดแท็บผิด / refresh หน้า → แสดง dialog ให้ restore งานล่าสุด |
| **Impact** | 10/10 | กลัวข้อมูลหายเป็นปัญหาหลัก |
| **Effort** | Easy |
| **Technical Approach** | ใช้ Zustand store + debounced persist ผ่าน `editor.on('update', ...)` event เก็บใน `localStorage` หรือ `IndexedDB` ใช้ `beforeunload` event ถ้ามี recovery data ให้แสดง dialog เมื่อโหลดหน้าใหม่ |
| **Dependencies** | IndexedDB (T3-F02) — สำหรับเอกสารใหญ่ |
| **Status** | Planned |
| **Risk** | 🟢 Low — logic ง่าย แต่ต้องระวัง performance ถ้าเก็บบ่อยเกินไป |

---

#### T2-F02: Markdown Shortcuts

| Field | Value |
|-------|-------|
| **Description** | พิมพ์ shortcut แล้วแปลงเป็น formatting ทันที: `# ` → H1, `## ` → H2, `* ` → bullet, `1. ` → ordered, `> ` → quote, `` ` `` → code, `---` → horizontal rule, `[]` → task list |
| **Impact** | 8/10 | Power users ต้องการ |
| **Effort** | Easy |
| **Technical Approach** | Tiptap StarterKit มี InputRules ให้แล้ว (`heading`, `bulletList`, `orderedList`, `blockquote`, `codeBlock`, `horizontalRule`) แค่ enable และเพิ่ม custom input rules สำหรับ task list และอื่นๆ |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — Tiptap มี built-in |

---

#### T2-F03: Slash Commands (`/` menu)

| Field | Value |
|-------|-------|
| **Description** | พิมพ์ `/` แล้วแสดง menu ให้เลือก block type: heading, list, image, table, code, quote, divider, callout, chart, embed รวมถึง formatting commands |
| **Impact** | 9/10 | UX สมัยใหม่ที่ทุกคนรอคอย |
| **Effort** | Easy |
| **Technical Approach** | Tiptap มี `@tiptap/extension-slash-commands` หรือ `Suggestion` extension ใช้ร่วมกับ custom React component ที่ render menu ใช้ pattern เดียวกับ Tiptap mention/suggestion |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — Tiptap มี built-in utilities |

---

#### T2-F04: Command Palette (Ctrl+K)

| Field | Value |
|-------|-------|
| **Description** | กด Ctrl+K แล้วแสดง search box สำหรับค้นหา commands ทั้งหมดในแอพ พร้อม keyboard shortcuts และ fuzzy search |
| **Impact** | 9/10 | รวมทุกคำสั่งไว้ที่เดียว |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `cmdk` (Radix-based command palette component) หรือ `kbar` รวมกับ `fuse.js` v7 สำหรับ fuzzy search สร้าง commands registry จาก Tiptap commands + UI actions ทั้งหมด |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — library สำเร็จรูปพร้อมใช้ |
| **Note** | ปัจจุบัน Ctrl+K ใช้สำหรับ Insert Link → ต้อง rebind เป็น Ctrl+Shift+K หรือเปลี่ยน command palette เป็น Ctrl+Shift+P |

---

#### T2-F05: Progress Indicators (Convert/Export)

| Field | Value |
|-------|-------|
| **Description** | แสดง progress bar / spinner ขณะ convert DOCX → HTML หรือ export HTML → DOCX/PDF รวมถึง step-by-step indicator (Parsing → Cleaning → Generating → Downloading) |
| **Impact** | 7/10 | ไฟล์ใหญ่แล้ว user ไม่รู้ว่ากำลังทำงาน |
| **Effort** | Easy |
| **Technical Approach** | ใช้ async/await pattern พร้อม state machine สำหรับ conversion steps UI: Radix Progress + animation หรือ custom toast notification |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — pure UI feature |

---

#### T2-F06: Thai Fonts Complete (TH Sarabun New)

| Field | Value |
|-------|-------|
| **Description** | เพิ่มฟอนต์ไทยมาตรฐานราชการให้ครบ: TH Sarabun New, TH Sarabun PSK, TH Krub, TH Niramit AS, TH Charm of AS, TH Kodchasan และ ensure ว่าฟอนต์โหลดได้เร็ว (font-display: swap) |
| **Impact** | 9/10 | เอกสารราชการไทยต้องใช้ |
| **Effort** | Easy |
| **Technical Approach** | โหลดฟอนต์จาก Google Fonts หรือ local font files เพิ่มเข้าไปใน FontSelector และ globals.css `@font-face` ใช้ `font-display: swap` เพื่อป้องกัน FOIT (Flash of Invisible Text) |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — แค่เพิ่ม font loading |

---

#### T2-F07: Template Gallery (Enhanced)

| Field | Value |
|-------|-------|
| **Description** | ขยายระบบ template ที่มีอยู่ให้มี gallery view พร้อม preview thumbnail, categories (รายงาน, หนังสือราชการ, Resume, Memo), featured templates และ template import from JSON |
| **Impact** | 8/10 | ทำเอกสารรูปแบบเดิมซ้ำๆ |
| **Effort** | Easy |
| **Technical Approach** | ใช้ existing template system ใน localStorage (`wordhtml-templates`) เพิ่ม UI: gallery view, category filter, preview thumbnail (render HTML to canvas หรือ iframe) |
| **Dependencies** | Template system (มีอยู่แล้ว) |
| **Status** | In Progress (มีระบบอยู่แล้ว ต้อง enhance UI) |
| **Risk** | 🟢 Low — UI-heavy แต่ logic ง่าย |

---

#### T2-F08: Character Count

| Field | Value |
|-------|-------|
| **Description** | แสดงจำนวนตัวอักษร (character count) รวมถึง with/without spaces, word count, page count estimate |
| **Impact** | 6/10 | รายงานมักมี requirement |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `@tiptap/extension-character-count` (official Tiptap extension) หรือ custom implementation ผ่าน `editor.state.doc.textContent.length` |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — Tiptap มี extension ให้ |

---

#### T2-F09: Undo/Redo History Panel

| Field | Value |
|-------|-------|
| **Description** | แสดง panel รายการ undo history พร้อง preview ของแต่ละ step และสามารถ jump ไปยัง state ใดๆ ได้ |
| **Impact** | 6/10 | ไม่รู้ว่า undo ถึงไหน |
| **Effort** | Medium |
| **Technical Approach** | Tiptap history ใช้ ProseMirror history plugin ที่เก็บ undo stack เป็น `Item` objects แต่ไม่ expose friendly UI ต้องสร้าง custom history panel ที่ listen จาก Tiptap transactions หรือใช้ snapshot system ที่มีอยู่แล้ว |
| **Dependencies** | Snapshot system (มีอยู่แล้ว) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — ProseMirror history API ไม่ได้ออกแบบมาสำหรับ UI introspection |

---

### Tier 3: Privacy & Data (ความเป็นส่วนตัว)

ฟีเจอร์ที่เสริมจุดแข็งด้าน privacy-first และทำให้ข้อมูลปลอดภัย

---

#### T3-F01: IndexedDB Storage Migration

| Field | Value |
|-------|-------|
| **Description** | ย้ายการเก็บข้อมูลจาก localStorage ไป IndexedDB เพื่อรองรับเอกสารใหญ่ (localStorage limit ~5-10 MB, IndexedDB limit GBs) รวมถึงเก็บ binary data (images, blobs) ได้โดยตรง |
| **Impact** | 8/10 | เอกสารใหญ่ + รูปภาพหลายรูป |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `localforage` (wrapper บน IndexedDB) หรือ `idb` (low-level wrapper) สร้าง schema: `documents` store (id, name, content JSON, updatedAt), `images` store (id, blob, docId), `settings` store (key, value) |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Safari อาจ auto-delete IndexedDB เมื่อ device storage ต่ำ → ต้องมี fallback เป็น localStorage + แจ้งเตือน user |
| **Migration Strategy** | Phase 1: เก็บเอกสารใหม่ใน IndexedDB พร้อม sync กลับ localStorage สำหรับ compatibility Phase 2: ย้าย history snapshots ไป IndexedDB ทั้งหมด |

---

#### T3-F02: Local Encryption (Web Crypto)

| Field | Value |
|-------|-------|
| **Description** | เข้ารหัสเอกสาร snapshot ด้วยรหัสผ่านที่ user ตั้งเอง ใช้ AES-GCM 256-bit ผ่าน Web Crypto API รองรับการ decrypt เมื่อ restore |
| **Impact** | 7/10 | Privacy-first ระดับสูง |
| **Effort** | Medium |
| **Technical Approach** | Web Crypto API (`crypto.subtle`): 1) PBKDF2 derive key จาก password + salt (210,000 iterations, SHA-256) 2) AES-GCM 256-bit encryption/decryption 3) เก็บ salt + iv + ciphertext ใน IndexedDB |
| **Dependencies** | IndexedDB (T3-F01) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Key management: user ต้องจำ password (ถ้าลืม = ข้อมูลหาย) `crypto.subtle` ทำงานบน secure context (HTTPS หรือ localhost) เท่านั้น |

**Code ตัวอย่าง:**
```typescript
const encrypt = async (plaintext: string, password: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );
  return { salt, iv, ciphertext };
};
```

---

#### T3-F03: P2P Share (WebRTC)

| Field | Value |
|-------|-------|
| **Description** | แชร์เอกสารโดยตรงระหว่าง browser 2 เครื่อง โดยไม่ผ่าน server ใช้ WebRTC DataChannel ส่ง JSON document |
| **Impact** | 6/10 | Privacy-first sharing |
| **Effort** | Hard |
| **Technical Approach** | WebRTC `RTCPeerConnection` + `RTCDataChannel` ส่งข้อมูลเป็น chunks (16KB) Signaling: เนื่องจากเป็น static export (no server) ต้องใช้ "manual signaling" — copy-paste SDP offer/answer หรือ QR code exchange ใช้ public STUN server (stun.l.google.com:19302) |
| **Dependencies** | QR Code Export (T3-F04) — สำหรับ signaling data exchange |
| **Status** | Planned |
| **Risk** | 🔴 High — NAT traversal บาง network ไม่ผ่าน (corporate firewall) UX ของ manual signaling ยากและไม่ user-friendly |

---

#### T3-F04: QR Code Export

| Field | Value |
|-------|-------|
| **Description** | สร้าง QR code จากเอกสาร snapshot หรือ URL สำหรับ quick sharing หรือใช้เป็น signaling data สำหรับ WebRTC |
| **Impact** | 5/10 | สะดวกสำหรับ sharing |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `qrcode` (npm package) รองรับ canvas, SVG, data URL, TypeScript สร้าง QR จาก: document ID ใน IndexedDB, หรือ encrypted document key, หรือ short URL |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — QR code capacity limit ~2,953 bytes (alphanumeric, correction L) → ใช้ได้เฉพาะ short key/URL |

---

#### T3-F05: Import from URL

| Field | Value |
|-------|-------|
| **Description** | เปิดเอกสารจาก URL (เช่น ไฟล์ .docx, .html บน Google Drive, Dropbox, หรือ public URL) ผ่าน CORS proxy หรือ direct fetch |
| **Impact** | 5/10 | เปิดไฟล์จาก cloud ได้ |
| **Effort** | Easy |
| **Technical Approach** | Fetch file จาก URL แล้วใช้ existing conversion pipeline (mammoth.js สำหรับ .docx, loadHtmlFile สำหรับ .html) CORS issue: ถ้า URL ไม่มี CORS headers ต้องใช้ CORS proxy (เช่น `https://corsproxy.io/`) หรือแจ้ง user ให้ download แล้ว upload |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — CORS อาจเป็น issue แต่มี workaround |

---

### Tier 4: UX Polish (ความละเอียด)

ฟีเจอร์ที่ทำให้ user experience ราบรื่น สวยงาม และ professional

---

#### T4-F01: Context Menu (Right-Click)

| Field | Value |
|-------|-------|
| **Description** | คลิกขวาที่ editor แสดง context menu ที่ context-appropriate: บน text (cut/copy/paste/format), บน image (resize/align/caption/wrap), บน table (merge/split/insert/delete), บน link (edit/remove) |
| **Impact** | 7/10 | UX พื้นฐานที่ทุกคนใช้ |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `@radix-ui/react-context-menu` หรือ custom context menu component Map right-click position → ProseMirror position (`editor.view.posAtCoords()`) แล้ว detect node type ที่ตำแหน่งนั้น |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — library พร้อมใช้ |

---

#### T4-F02: Inline Comments (Local-Only)

| Field | Value |
|-------|-------|
| **Description** | คอมเมนต์บนเอกสารแบบ local-only (ไม่ sync ข้าม devices) รองรับ highlight text + side panel แสดง comment threads, resolve/unresolve |
| **Impact** | 6/10 | ให้อาจารย์/หัวหน้า comment ได้ |
| **Effort** | Medium |
| **Technical Approach** | ใช้ Custom Mark (`comment`) ที่มี `commentId` attribute เก็บ comment data (text, author, timestamp, resolved) ใน Zustand store หรือ IndexedDB ไม่ใช้ YJS/server → เป็น local annotation ล้วนๆ |
| **Dependencies** | ไม่มี (ถ้า local-only) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — ถ้า text ที่มี comment ถูกลบ/แก้ไข → comment ต้อง map position ใหม่ (ใช้ ProseMirror position mapping) |

---

#### T4-F03: Zen Mode / Focus Mode

| Field | Value |
|-------|-------|
| **Description** | โหมดโฟกัส: ซ่อน toolbar, sidebar, ruler แสดงแค่ editor + paper เปลี่ยนพื้นหลังเป็นสี calm (เช่น #fafafa) รองรับ full-screen |
| **Impact** | 5/10 | เขียนเอกสารยาวได้สมาธิ |
| **Effort** | Easy |
| **Technical Approach** | Pure CSS toggle + Zustand state ซ่อน elements ด้วย CSS class `.zen-mode` ใช้ `editor.commands.focus()` เพื่อรักษา cursor position |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — pure UI |

---

#### T4-F04: Typewriter Scrolling

| Field | Value |
|-------|-------|
| **Description** | Scroll ให้ caret (cursor) อยู่ตรงกลางหน้าจอเสมอ เหมือนเครื่องพิมพ์ดีด (typewriter) ช่วยให้สายตาไม่ต้องขยับ |
| **Impact** | 4/10 | สบายตาเวลาพิมพ์นานๆ |
| **Effort** | Easy |
| **Technical Approach** | ใช้ Tiptap plugin หรือ transaction listener (`editor.on('transaction', ...)`) เรียก `scrollIntoView({ behavior: 'smooth', block: 'center' })` บน DOM node ที่ caret อยู่ |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — scroll behavior ต้อง smooth และไม่กวน user |

---

#### T4-F05: Outline / Navigation Panel

| Field | Value |
|-------|-------|
| **Description** | Panel ด้านข้างแสดงโครงสร้างเอกสารจาก headings (H1, H2, H3) พร้อม highlight section ปัจจุบัน และ click-to-scroll |
| **Impact** | 6/10 | นำทางเอกสารยาว |
| **Effort** | Easy |
| **Technical Approach** | ใช้ Tiptap `getJSON()` + heading extraction (เหมือน TOC) แต่แสดงเป็น sticky panel ด้านซ้าย/ขวา Highlight current section ด้วย `IntersectionObserver` หรือ scroll position mapping |
| **Dependencies** | TOC (T1-F06) |
| **Status** | Planned |
| **Risk** | 🟢 Low — logic คล้าย TOC |

---

#### T4-F06: Clipboard History

| Field | Value |
|-------|-------|
| **Description** | เก็บประวัติการคัดลอก/วางล่าสุด 10-20 รายการ สามารถเลือกวางจากประวัติได้ |
| **Impact** | 5/10 | ทำงานเร็วขึ้น |
| **Effort** | Easy |
| **Technical Approach** | Listen `editor.on('paste', ...)` event เก็บ clipboard data (`text/html`, `text/plain`) ใน localStorage/IndexedDB แสดงเป็น dropdown menu หรือ command palette item |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — แต่ Clipboard API บาง browser อาจจำกัด permission |

---

#### T4-F07: Toast Notifications

| Field | Value |
|-------|-------|
| **Description** | แสดง toast notification สำหรับ events: export success, snapshot saved, recovery available, error messages รองรับ action buttons (undo, dismiss, view) |
| **Impact** | 6/10 | Feedback ที่ชัดเจน |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `sonner` (lightweight toast library จาก shadcn ecosystem) หรือ custom toast component ด้วย Radix + Tailwind |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low |

---

#### T4-F08: Empty State Enhancement

| Field | Value |
|-------|-------|
| **Description** | ปรับปรุงหน้าเอกสารว่างให้มี quick-start actions: "Open a .docx", "Paste from Word", "Start from Template", "Recent Files" พร้อม featured templates |
| **Impact** | 6/10 | Onboarding ที่ดี |
| **Effort** | Easy |
| **Technical Approach** | แก้ไข EmptyHint component ให้แสดง action cards แทนแค่ text hint เชื่อมต่อกับ IndexedDB สำหรับ recent files |
| **Dependencies** | IndexedDB (T3-F01) |
| **Status** | Planned |
| **Risk** | 🟢 Low |

---

### Tier 5: Advanced (ฟีเจอร์ขั้นสูง)

ฟีเจอร์ที่เพิ่มความสามารถในระดับ power user / enterprise และเตรียมพร้อมสำหรับ future expansion

---

#### T5-F01: PDF Export (html2pdf)

| Field | Value |
|-------|-------|
| **Description** | Export เอกสารเป็น PDF โดยตรงจาก browser ไม่ต้องผ่าน server รองรับ page setup (A4, margins, orientation) |
| **Impact** | 8/10 | สำคัญมากสำหรับ sharing |
| **Effort** | Medium |
| **Technical Approach** | ใช้ `html2pdf.js` (library ที่ wrap `jsPDF` + `html2canvas`) หรือ `jspdf` + `html2canvas` โดยตรง Flow: 1) Render paper element เป็น canvas ผ่าน html2canvas 2) ใส่ canvas ลง PDF ด้วย jsPDF 3) Download หรือ `paged.js` สำหรับ CSS-based pagination ที่ดีกว่า |
| **Dependencies** | Page setup (มีอยู่แล้ว), Header/Footer (T1-F01) สำหรับ print-ready PDF |
| **Status** | Planned |
| **Risk** | 🟡 Medium — html2canvas มีข้อจำกัดกับ CSS บางอย่าง (flexbox, grid, custom fonts) ฟอนต์ไทยอาจมีปัญหา |

---

#### T5-F02: Math Equations (KaTeX)

| Field | Value |
|-------|-------|
| **Description** | แทรกสมการคณิตศาสตร์ด้วย LaTeX syntax แสดงผลแบบสวยงามด้วย KaTeX หรือ MathJax |
| **Impact** | 5/10 | เอกสารวิชาการ |
| **Effort** | Medium |
| **Technical Approach** | สร้าง custom Tiptap node (`math`) ที่ render KaTeX ใน NodeView ใช้ `katex` (npm) — lightweight กว่า MathJax รองรับ inline (`$...$`) และ block (`$$...$$`) equations |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟡 Medium — KaTeX ไม่รองรับทุก LaTeX command แต่พอสำหรับส่วนใหญ่ |

---

#### T5-F03: Embeds (YouTube, iframe)

| Field | Value |
|-------|-------|
| **Description** | แทรกสื่อภายนอก: YouTube video, Figma, Google Sheets, หรือ iframe ใดๆ แสดงผลแบบ interactive |
| **Impact** | 5/10 | เอกสาร interactive |
| **Effort** | Easy |
| **Technical Approach** | สร้าง custom Tiptap node (`embed` หรือ `iframe`) ที่ render `<iframe>` ด้วย sandbox attributes รองรับ oEmbed URLs (YouTube, Vimeo, etc.) ที่ parse เป็น embed URL อัตโนมัติ |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — iframe ง่าย แต่ต้องระวัง security (sandbox attribute) |

---

#### T5-F04: Drawing Canvas (Basic Shapes)

| Field | Value |
|-------|-------|
| **Description** | วาดรูปทรงพื้นฐานบน canvas: rectangle, circle, line, arrow ด้วย mouse/touch บันทึกเป็น image หรือ SVG |
| **Impact** | 4/10 | เอกสารนำเสนอ |
| **Effort** | Medium |
| **Technical Approach** | ใช้ HTML5 Canvas API + สร้าง custom Tiptap node (`drawing` หรือ `canvas`) ที่ render Canvas element ใน NodeView เก็บ drawing data เป็น JSON (strokes, shapes) หรือ raster เป็น PNG ผ่าน `canvas.toDataURL()` |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Canvas ใน NodeView มี performance issue ถ้าเอกสารใหญ่ |

---

#### T5-F05: Voice Typing (Web Speech API)

| Field | Value |
|-------|-------|
| **Description** | พิมพ์ด้วยเสียง (dictation) ผ่าน Web Speech API รองรับภาษาไทยและภาษาอังกฤษ |
| **Impact** | 5/10 | Accessibility + สะดวก |
| **Effort** | Easy |
| **Technical Approach** | ใช้ `webkitSpeechRecognition` (Chrome) หรือ `SpeechRecognition` API (standard) แสดง microphone button ใน toolbar หรือ command palette แทรก transcribed text ที่ cursor position |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — แต่ browser support ไม่สมบูรณ์ (Chrome ดีที่สุด, Safari จำกัด) |

---

#### T5-F06: Plugin System Architecture

| Field | Value |
|-------|-------|
| **Description** | ระบบปลั๊กอินที่ช่วยให้ developer สามารถเพิ่มฟีเจอร์เข้า wordhtml ได้โดยไม่ต้อง fork repo รองรับ custom Tiptap extensions, custom cleaners, custom export formats |
| **Impact** | 4/10 | Extensibility |
| **Effort** | Hard |
| **Technical Approach** | ออกแบบ plugin API: `registerExtension()`, `registerCleaner()`, `registerExporter()`, `registerCommand()` ใช้ dynamic import (`import()`) สำหรับโหลด plugin modules จาก URL หรือ localStorage เก็บ plugin metadata + code ใน IndexedDB |
| **Dependencies** | IndexedDB (T3-F01), Command Palette (T2-F04) |
| **Status** | Planned |
| **Risk** | 🔴 High — ออกแบบ API ที่ดีใช้เวลา และมี security risk ถ้าโหลด plugin จาก untrusted source |

---

#### T5-F07: Print Preview Enhancement

| Field | Value |
|-------|-------|
| **Description** | แสดงตัวอย่างก่อนพิมพ์แบบ visual (ไม่ใช่แค่ `@media print`) รวมถึง header/footer preview, page number preview, margin preview |
| **Impact** | 6/10 | รู้ว่าพิมพ์ออกมายังไง |
| **Effort** | Medium |
| **Technical Approach** | สร้าง print preview modal ที่ render เอกสารใน iframe หรือ separate DOM ด้วย `@media print` styles แสดงหลายหน้าเป็น thumbnail grid ใช้ CSS `transform: scale()` เพื่อย่อขนาด |
| **Dependencies** | Header/Footer (T1-F01), Page numbers (T1-F02) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — การ render หลายหน้าอาจช้าถ้าเอกสารยาว |

---

#### T5-F08: Table Merge Cells + Styles

| Field | Value |
|-------|-------|
| **Description** | รวม/แยก cells ในตาราง (merge/split) พร้อม table styles: striped, bordered, colored header, alternating rows |
| **Impact** | 7/10 | ตารางซับซ้อน |
| **Effort** | Medium |
| **Technical Approach** | Tiptap table extension ไม่มี merge cells built-in ต้องใช้ `@tiptap/extension-table` + custom cell merging logic ผ่าน `colspan` และ `rowspan` attributes หรือใช้ `tiptap-table-merge-cells` (3rd party) สำหรับ styles: ใช้ CSS classes + Tailwind utilities |
| **Dependencies** | Table extension (มีอยู่แล้ว) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Table cell merging ซับซ้อนใน ProseMirror |

---

#### T5-F09: Table Formulas (Basic)

| Field | Value |
|-------|-------|
| **Description** | สูตรคำนวณในตาราง: `=SUM(A1:A3)`, `=A1+B1`, `=AVG(B2:B5)` รองรับ A1 notation และ basic operators |
| **Impact** | 5/10 | งบประมาณ/คะแนน |
| **Effort** | Medium |
| **Technical Approach** | Extend `TableCell` node เพิ่ม `formula` และ `value` attributes ใช้ `mathjs` (safe math evaluator) หรือ custom parser ที่ support: cell references (A1), ranges (A1:B3), functions (SUM, AVG, MIN, MAX, COUNT) Recalculate เมื่อ cell ใดๆ เปลี่ยน |
| **Dependencies** | Table extension (มีอยู่แล้ว), Table Merge (T5-F08) |
| **Status** | Planned |
| **Risk** | 🟡 Medium — Circular reference detection, formula recalculation performance |

---

#### T5-F10: Bookmarks / Anchors

| Field | Value |
|-------|-------|
| **Description** | สร้าง bookmark (anchor) ในเอกสาร แล้ว link ไปยัง bookmark นั้นจากที่อื่นในเอกสาร (internal linking) |
| **Impact** | 5/10 | Navigation ในเอกสารยาว |
| **Effort** | Easy |
| **Technical Approach** | ใช้ Custom Mark (`bookmark`) ที่มี `id` attribute: `parseHTML() { return [{ tag: 'a[name]' }] }` Internal link: `href="#bookmark-id"` → map เป็น ProseMirror position → scroll to that position |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low — แต่ position mapping ต้องใช้ ProseMirror mapping ถ้า content เปลี่ยน |

---

#### T5-F11: Cover Images / Pageless Mode

| Field | Value |
|-------|-------|
| **Description** | ภาพหน้าปกเต็มความกว้าง (cover image) สำหรับเอกสาร และ pageless mode (ไม่มี page break) สำหรับ online reading |
| **Impact** | 4/10 | เอกสารสวยงาม |
| **Effort** | Easy |
| **Technical Approach** | Cover image: ใช้ Tiptap image node + CSS `width: 100%` + `object-fit: cover` ก่อนเนื้อหา Pageless mode: toggle class ที่ลบ `page-break` และปรับ paper padding |
| **Dependencies** | ไม่มี |
| **Status** | Planned |
| **Risk** | 🟢 Low |

---

### 4.1 Summary: Feature Matrix รวม

| Tier | จำนวน Features | Easy | Medium | Hard | รวม Impact |
|------|---------------|------|--------|------|-----------|
| **Tier 1: Core Document** | 8 | 2 | 2 | 4 | 68/80 |
| **Tier 2: Productivity** | 9 | 7 | 2 | 0 | 68/90 |
| **Tier 3: Privacy & Data** | 5 | 3 | 1 | 1 | 31/50 |
| **Tier 4: UX Polish** | 8 | 8 | 0 | 0 | 43/80 |
| **Tier 5: Advanced** | 11 | 2 | 5 | 1 | 55/110 |
| **รวมทั้งหมด** | **41** | **22** | **10** | **6** | **265/410** |

---

## 5. Phased Roadmap (Phase 1-5)

แบ่งการพัฒนาเป็น 5 phases ตามลำดับ priority และ dependencies แต่ละ phase มีระยะเวลาประมาณการ features ที่รวม technical deliverables success criteria และ risk

---

### Phase 1: Foundation & Quick Wins
**ระยะเวลา:** สัปดาห์ 1-3 (3 สัปดาห์)
**เป้าหมาย:** สร้าง trust กับ user แก้ pain point ที่รู้สึก "ไม่สมบูรณ์" มากที่สุด ด้วย effort ต่ำ

#### Features (8 features)

| # | Feature ID | ชื่อ | Effort | Impact |
|---|-----------|------|--------|--------|
| 1 | T2-F01 | Auto-save / Crash Recovery | Easy | 10 |
| 2 | T2-F02 | Markdown Shortcuts | Easy | 8 |
| 3 | T2-F03 | Slash Commands (`/` menu) | Easy | 9 |
| 4 | T2-F04 | Command Palette (Ctrl+K) | Easy | 9 |
| 5 | T2-F05 | Progress Indicators (convert/export) | Easy | 7 |
| 6 | T2-F06 | Thai Fonts Complete (TH Sarabun New) | Easy | 9 |
| 7 | T4-F07 | Toast Notifications | Easy | 6 |
| 8 | T4-F08 | Empty State Enhancement | Easy | 6 |

#### Technical Deliverables

1. **Auto-save System:**
   - Zustand store + debounced persist (30 วินาที)
   - Recovery dialog เมื่อโหลดหน้าใหม่ (ถ้ามี recovery data)
   - Merge strategy ระหว่าง current doc กับ recovered snapshot
   - `beforeunload` enhancement: discard/restore choice

2. **Markdown Shortcuts:**
   - Enable Tiptap InputRules จาก StarterKit
   - `# ` → H1, `## ` → H2, `### ` → H3
   - `* ` → bullet, `1. ` → ordered, `> ` → quote
   - `` ` `` → code inline, ` ``` ` → code block
   - `---` → horizontal rule, `[]` → task list
   - `>` + space → blockquote (อาจ conflict กับ existing)

3. **Slash Commands:**
   - สร้าง suggestion component (React) ที่ render เมื่อพิมพ์ `/`
   - รายการ commands: heading 1-3, bullet list, ordered list, task list, image, table, code block, quote, divider, page break
   - ใช้ Tiptap `Suggestion` extension + custom popup positioning
   - Keyboard navigation: ↑↓ Enter Escape

4. **Command Palette:**
   - สร้าง commands registry (ทั้ง Tiptap commands และ UI actions)
   - ใช้ `cmdk` หรือ `kbar` สำหรับ UI
   - ใช้ `fuse.js` v7 สำหรับ fuzzy search
   - Rebind: Ctrl+K → Command Palette (เดิมเป็น Insert Link → เปลี่ยนเป็น Ctrl+Shift+K)
   - รองรับ keyboard shortcuts display

5. **Progress Indicators:**
   - สร้าง progress component สำหรับ conversion pipeline
   - Steps: Parsing → Cleaning → Generating → Downloading
   - ใช้สำหรับ: DOCX import, HTML export, DOCX export, batch convert
   - Cancel button (abort conversion)

6. **Thai Fonts:**
   - เพิ่มฟอนต์: TH Sarabun New, TH Krub, TH Niramit AS, TH Charm of AS, TH Kodchasan
   - Font loading optimization (`font-display: swap`)
   - Preload critical fonts
   - Default font สำหรับเอกสารราชการ: TH Sarabun New (fallback จาก Sarabun Google Font)

7. **Toast Notifications:**
   - ใช้ `sonner` หรือ custom toast
   - Events: export success, snapshot saved, recovery available, conversion error, auto-save triggered
   - Action buttons: undo, dismiss, view details

8. **Empty State:**
   - Quick-start action cards: Open DOCX, Paste from Word, Start from Template, Open Recent
   - Featured templates: หนังสือราชการ, รายงาน, Resume, Memo
   - Onboarding hint: "ลากไฟล์มาวางที่นี่" (drag zone highlight)

#### Success Criteria
- [ ] User สามารถ recover งานหลัง browser crash/refresh ได้
- [ ] User พิมพ์ `# ` แล้วได้ H1 ทันที
- [ ] User พิมพ์ `/` แล้วแสดง menu ให้เลือก block type
- [ ] User กด Ctrl+K แล้ว search commands ได้
- [ ] Progress indicator แสดงขณะ convert ไฟล์ใหญ่
- [ ] ฟอนต์ TH Sarabun New ใช้งานได้
- [ ] Toast แสดงเมื่อ export/save สำเร็จ
- [ ] หน้าเอกสารว่างมี quick-start actions

#### Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ctrl+K rebind ทำให้ user ที่ชินกับ Insert Link สับสน | Low | แสดง hint ชั่วคราว + รองรับ Ctrl+Shift+K สำหรับ Insert Link |
| Markdown shortcuts conflict กับ existing input | Low | ทดสอบทุก shortcut กับ Thai keyboard layout |
| Slash command popup ทำงานผิดใน mobile | Medium | ปิด slash command บน mobile (< 768px) หรือใช้ trigger อื่น |

---

### Phase 2: Document Structure
**ระยะเวลา:** สัปดาห์ 4-7 (4 สัปดาห์)
**เป้าหมาย:** ทำให้ wordhtml เป็น "Word บน browser" — เอกสารทางการไทยใช้ได้จริง

#### Features (6 features)

| # | Feature ID | ชื่อ | Effort | Impact |
|---|-----------|------|--------|--------|
| 1 | T1-F01 | Header & Footer System | Hard | 10 |
| 2 | T1-F02 | Page Numbers | Hard | 10 |
| 3 | T1-F06 | TOC Auto-Generation (Enhanced) | Easy | 9 |
| 4 | T5-F10 | Bookmarks / Anchors | Easy | 5 |
| 5 | T1-F08 | Text Boxes / Basic Shapes | Hard | 5 |
| 6 | T5-F07 | Print Preview Enhancement | Medium | 6 |

#### Technical Deliverables

1. **Header & Footer System:**
   - Research และเลือก pagination engine:
     - Option A: `tiptap-pagination-plus` (open source, free)
     - Option B: `@tiptap-pro/extension-pages` (paid, $$$)
     - Option C: Custom implementation (ใช้เวลามาก)
   - สร้าง header zone (top of paper) และ footer zone (bottom of paper)
   - Header/footer editor: คลิกที่ zone เพื่อแก้ไข (เหมือน Word)
   - รองรับ different header/footer ตาม section (first page, odd/even)
   - เก็บ header/footer content เป็น Tiptap JSON แยกจาก main content

2. **Page Numbers:**
   - ใส่ `{page}` และ `{total}` placeholders ใน header/footer
   - รองรับ formats: Arabic (1, 2, 3), Roman (i, ii, iii), Alpha (a, b, c)
   - ตำแหน่ง: top-left, top-center, top-right, bottom-left, bottom-center, bottom-right
   - Start page number from: 1, 0, หรือ custom number
   - Real-time update เมื่อ content เปลี่ยน (ถ้าใช้ pagination engine)

3. **TOC Enhanced:**
   - Real-time sync: update TOC เมื่อ headings เปลี่ยน (ผ่าน `editor.on('update')`)
   - แสดงเลขหน้า (ถ้ามี pagination engine)
   - Click-to-scroll พร้อม smooth scroll
   - รองรับ TOC levels: H1-H3 (configurable)
   - TOC สามารถ insert/remove ได้จาก slash command หรือ menu

4. **Bookmarks:**
   - Custom Mark (`bookmark`) ด้วย `id` attribute
   - UI: "Insert Bookmark" dialog, "Go to Bookmark" dropdown
   - Internal links: `href="#bookmark-id"` → scroll to bookmark
   - Bookmark list panel (แสดง bookmarks ทั้งหมด)

5. **Text Boxes / Basic Shapes:**
   - Custom Node (`textBox`) ด้วย absolute positioning
   - รองรับ: drag-to-move, resize, text editing
   - รูปทรง: rectangle, circle, arrow (SVG-based)
   - Scope ลด: anchored กับ paragraph แทน absolute positioning (ลด risk)
   - หรือใช้ pattern "floating elements" ที่อยู่ระหว่าง paragraphs

6. **Print Preview:**
   - Modal แสดงตัวอย่างก่อนพิมพ์
   - Multi-page thumbnail grid
   - Header/footer preview
   - Page number preview
   - Margin guides (faint lines)
   - Print settings: copies, pages range, paper size, orientation

#### Success Criteria
- [ ] User สามารถใส่หัวกระดาษ (header) และท้ายกระดาษ (footer) ได้
- [ ] User สามารถใส่เลขหน้าได้ (top/bottom, left/center/right)
- [ ] TOC sync real-time และแสดงเลขหน้า
- [ ] User สามารถสร้าง bookmark และ link ไปยัง bookmark ได้
- [ ] Print preview แสดงหลายหน้าพร้อม header/footer
- [ ] A4 paper editor ใกล้เคียง Word มากที่สุดใน browser

#### Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pagination engine ทำงานไม่สมบูรณ์กับ content ยาว | 🔴 High | ทดสอบกับเอกสาร 10+ หน้า, มี fallback เป็น simple page break |
| Header/footer ทำให้ performance ตก | 🟡 Medium | Lazy render header/footer, ไม่ render ถ้าไม่ visible |
| ProseMirror absolute positioning มีปัญหา | 🔴 High | ลด scope ให้เป็น anchored elements แทน |

---

### Phase 3: Media & Objects
**ระยะเวลา:** สัปดาห์ 8-11 (4 สัปดาห์)
**เป้าหมาย:** จัดการสื่อและวัตถุในเอกสาร — รูปภาพ ตาราง กราฟ สมการ

#### Features (7 features)

| # | Feature ID | ชื่อ | Effort | Impact |
|---|-----------|------|--------|--------|
| 1 | T1-F03 | Image Resize (Drag Handles) | Easy | 8 |
| 2 | T1-F04 | Image Caption (figcaption) | Medium | 7 |
| 3 | T1-F05 | Image Text Wrap (Float) | Easy | 7 |
| 4 | T1-F07 | Charts (Bar, Line, Pie) | Medium | 6 |
| 5 | T5-F08 | Table Merge Cells + Styles | Medium | 7 |
| 6 | T5-F09 | Table Formulas (Basic) | Medium | 5 |
| 7 | T5-F03 | Embeds (YouTube, iframe) | Easy | 5 |

#### Technical Deliverables

1. **Image Resize:**
   - ใช้ `ResizableNodeView` จาก Tiptap v3 (official utility)
   - Resize handles: 4 corners + 4 edges
   - Maintain aspect ratio: Shift+drag
   - แสดง dimensions (width × height) ขณะลาก
   - Min/max constraints (เช่น min 50px, max paper width)
   - เก็บ width/height เป็น attributes ใน Image node

2. **Image Caption:**
   - สร้าง `figure` node: `figure → [img, figcaption (contentEditable)]`
   - ใช้ `contentDOM` ใน NodeView สำหรับ editable figcaption
   - Caption alignment: left/center/right
   - Caption สามารถ format ได้ (bold, italic, etc.)
   - ใช้ร่วมกับ resize handles

3. **Image Text Wrap:**
   - Extend Image node เพิ่ม `align` attribute: inline, left, right, center
   - CSS: `float: left/right`, `display: block; margin: 0 auto`
   - Margin/spacing ระหว่างรูปกับข้อความ (configurable)
   - `clear` behavior หลัง float

4. **Charts:**
   - ใช้ `chart.js` (lightweight, canvas-based) หรือ `recharts` (React/SVG)
   - Custom `chart` node ด้วย attributes: `type`, `data`, `width`, `height`
   - NodeView ที่ render Chart component
   - Chart editor: แก้ไข data (labels, values) ผ่าน dialog
   - Export: canvas → `toDataURL()` สำหรับ print
   - Chart types: bar, line, pie, doughnut

5. **Table Merge Cells:**
   - Extend TableCell node เพิ่ม `colspan` และ `rowspan` attributes
   - UI: คลิกขวาที่ table → "Merge Cells", "Split Cell"
   - Table styles: striped, bordered, colored header (CSS classes)
   - รองรับ header row repeat ที่ page break

6. **Table Formulas:**
   - Extend TableCell เพิ่ม `formula` และ `value` attributes
   - Formula parser: A1 notation, ranges (A1:B3), functions (SUM, AVG, MIN, MAX, COUNT)
   - ใช้ `mathjs` แทน `eval()` (security)
   - Auto-recalculate เมื่อ cell เปลี่ยน
   - Circular reference detection

7. **Embeds:**
   - Custom `embed` node สำหรับ iframe
   - URL parsing: YouTube, Vimeo, Figma, Google Sheets, หรือ generic URL
   - Sandbox attributes: `allow-scripts`, `allow-same-origin`
   - Responsive sizing: aspect ratio preservation
   - Preview thumbnail ก่อน load

#### Success Criteria
- [ ] User ลากมุมรูปเพื่อ resize ได้
- [ ] User ใส่ caption ใต้รูปได้
- [ ] User จัด text wrap (float left/right) ได้
- [ ] User แทรกกราฟ bar/line/pie ได้
- [ ] User merge/split table cells ได้
- [ ] User ใส่สูตร `=SUM(A1:A3)` ในตารางได้
- [ ] User แทรก YouTube video ได้

#### Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Figure node + resize handles selection conflict | 🟡 Medium | ใช้ library สำเร็จรูปที่ handle selection ให้ |
| Chart canvas export ไม่ได้กับบาง browser | 🟡 Medium | มี fallback เป็น static image + SVG option |
| Table merge ทำให้ data model ซับซ้อน | 🟡 Medium | ทดสอบกับ table ขนาดใหญ่ (20×20 cells) |

---

### Phase 4: Productivity & Polish
**ระยะเวลา:** สัปดาห์ 12-15 (4 สัปดาห์)
**เป้าหมาย:** ทำให้ทำงานเร็วขึ้น UX ราบรื่น สวยงาม

#### Features (8 features)

| # | Feature ID | ชื่อ | Effort | Impact |
|---|-----------|------|--------|--------|
| 1 | T2-F07 | Template Gallery (Enhanced) | Easy | 8 |
| 2 | T4-F06 | Clipboard History | Easy | 5 |
| 3 | T4-F05 | Outline / Navigation Panel | Easy | 6 |
| 4 | T4-F02 | Inline Comments (Local) | Medium | 6 |
| 5 | T4-F01 | Context Menu | Easy | 7 |
| 6 | T4-F03 | Zen Mode / Focus Mode | Easy | 5 |
| 7 | T4-F04 | Typewriter Scrolling | Easy | 4 |
| 8 | T2-F09 | Undo/Redo History Panel | Medium | 6 |

#### Technical Deliverables

1. **Template Gallery:**
   - Gallery view: grid แสดง template thumbnails
   - Categories: รายงาน, หนังสือราชการ, Resume, Memo, อื่นๆ
   - Preview: render template HTML ใน iframe หรือ canvas thumbnail
   - Featured templates (hardcoded): เอกสารราชการไทย, รายงานการประชุม, Resume สมัยใหม่
   - Search/filter templates
   - Import/export template library (JSON)

2. **Clipboard History:**
   - Store 10-20 recent clipboard items
   - เก็บ `text/html` และ `text/plain`
   - Access ผ่าน: context menu, command palette, หรือ Ctrl+Shift+V
   - Preview ของแต่ละ item (truncated)
   - Clear history option

3. **Outline Panel:**
   - Sticky panel ด้านซ้าย/ขวา (collapsible)
   - แสดง heading tree (H1, H2, H3)
   - Highlight current section (ผ่าน scroll position)
   - Click-to-scroll พร้อม smooth animation
   - Collapse/expand sections

4. **Inline Comments:**
   - Custom Mark (`comment`) ด้วย `commentId`
   - Highlight text ด้วยสีพื้นหลัง
   - Side panel แสดง comment threads
   - Add/edit/delete/resolve comments
   - ไม่ sync ข้าม devices (local-only)
   - Store ใน IndexedDB

5. **Context Menu:**
   - Radix ContextMenu ครอบ EditorContent
   - Position mapping: `editor.view.posAtCoords()`
   - Context-aware items:
     - บน text: Cut, Copy, Paste, Bold, Italic, Link
     - บน image: Resize, Align, Caption, Wrap, Delete
     - บน table: Insert row/col, Delete row/col, Merge cells, Delete table
     - บน link: Edit link, Remove link, Open link

6. **Zen Mode:**
   - Toggle button: ใน toolbar หรือ command palette
   - ซ่อน: toolbar, sidebar, ruler, status bar
   - แสดง: editor + paper + minimal controls
   - Full-screen support (F11 หรือ Zen + fullscreen)
   - Background: calm color (#fafafa หรือ dark #1a1a1a)
   - Max-width: 65ch (optimal reading width)

7. **Typewriter Scrolling:**
   - Scroll caret ให้อยู่ตรงกลางจอเสมอ
   - Trigger: ทุกการพิมพ์, ทุกการกดลูกศร, ทุกการ click
   - Smooth scroll behavior
   - Disable option (สำหรับ user ที่ไม่ชอบ)

8. **Undo History Panel:**
   - แสดงรายการ undo steps
   - Preview ของแต่ละ state (truncated text)
   - Jump to any state
   - Visual diff (highlight changes)

#### Success Criteria
- [ ] Template gallery แสดง thumbnail + categories
- [ ] Clipboard history เก็บ 20 รายการล่าสุด
- [ ] Outline panel highlight section ปัจจุบัน
- [ ] User สามารถ comment บน text ได้ (local-only)
- [ ] Right-click แสดง context menu ที่ context-appropriate
- [ ] Zen mode ซ่อนทุกอย่างยกเว้น editor
- [ ] Caret อยู่ตรงกลางจอเสมอ (typewriter mode)
- [ ] Undo history panel แสดง steps + preview

#### Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| Comments ทำให้ data model ซับซ้อน | 🟡 Medium | ใช้ Mark-based approach ที่ง่ายที่สุด |
| Outline panel ทำให้ layout แคบ | 🟢 Low | Collapsible + ซ่อนได้ |
| Zen mode ทำให้ power users หา feature ไม่เจอ | 🟢 Low | มี escape hint (กด Escape หรือ mouse move ที่ขอบ) |

---

### Phase 5: Privacy & Advanced
**ระยะเวลา:** สัปดาห์ 16-20 (5 สัปดาห์)
**เป้าหมาย:** ยกระดับความเป็นส่วนตัว สามารถใช้งานได้ offline และส่งออกเอกสารได้หลากหลาย

#### Features (8 features)

| # | Feature ID | ชื่อ | Effort | Impact |
|---|-----------|------|--------|--------|
| 1 | T3-F01 | IndexedDB Storage Migration | Easy | 8 |
| 2 | T3-F02 | Local Encryption (Web Crypto) | Medium | 7 |
| 3 | T5-F01 | PDF Export (html2pdf) | Medium | 8 |
| 4 | T3-F03 | P2P Share (WebRTC) | Hard | 6 |
| 5 | T3-F04 | QR Code Export | Easy | 5 |
| 6 | T3-F05 | Import from URL | Easy | 5 |
| 7 | T5-F06 | Plugin System Architecture | Hard | 4 |
| 8 | T5-F05 | Voice Typing (Web Speech) | Easy | 5 |

#### Technical Deliverables

1. **IndexedDB Migration:**
   - ใช้ `localforage` เป็น wrapper
   - Schema:
     - `documents`: id, name, content (JSON), html, updatedAt, encrypted (boolean)
     - `images`: id, blob, docId, filename
     - `settings`: key, value
     - `templates`: id, name, html, pageSetup, createdAt
     - `history`: id, docId, snapshot, timestamp
   - Migration จาก localStorage: อ่าน existing data แล้วย้ายเข้า IndexedDB
   - Fallback: ถ้า IndexedDB ไม่ available → ใช้ localStorage
   - Size limits: แจ้งเตือนเมื่อใกล้เต็ม

2. **Local Encryption:**
   - Algorithm: AES-GCM 256-bit (Web Crypto API)
   - Key derivation: PBKDF2, 210,000 iterations, SHA-256
   - Flow:
     1. User ตั้ง password
     2. Derive key จาก password + salt
     3. Encrypt document JSON
     4. เก็บ salt + iv + ciphertext ใน IndexedDB
   - Decrypt: ใส่ password → derive key → decrypt
   - รองรับ: encrypt individual snapshots หรือ encrypt ทั้ง document library
   - Warning: ถ้าลืม password = ข้อมูลหาย (no recovery)

3. **PDF Export:**
   - Library: `html2pdf.js` หรือ `jspdf` + `html2canvas`
   - Flow:
     1. Clone paper element
     2. Apply print styles
     3. ใช้ html2canvas render เป็น canvas
     4. ใส่ canvas ลง PDF (jsPDF)
     5. Download
   - รองรับ: A4/Letter, portrait/landscape, margins
   - Header/footer ใน PDF (ถ้ามี pagination engine)
   - Quality settings: low/medium/high (DPI)

4. **P2P Share:**
   - WebRTC `RTCPeerConnection` + `RTCDataChannel`
   - Signaling: manual (copy-paste SDP offer/answer)
   - UX flow:
     1. User A กด "Share" → generate SDP offer
     2. User A copy SDP → ส่งให้ User B (ผ่าน chat, email)
     3. User B paste SDP → generate SDP answer
     4. User B copy answer → ส่งกลับ User A
     5. P2P connection established → ส่งเอกสาร
   - QR Code: ใช้สำหรับส่ง short SDP หรือ document key
   - File size limit: 5-10 MB (WebRTC data channel)
   - Progress indicator ขณะส่ง

5. **QR Code Export:**
   - Library: `qrcode` (npm)
   - Generate QR จาก:
     - Document ID (สำหรับ open ใน device อื่น ถ้ามี sync)
     - Encrypted document key
     - Short URL (ถ้ามี hosting)
     - WebRTC signaling data
   - Download QR เป็น PNG
   - Print QR code บนเอกสาร (footer)

6. **Import from URL:**
   - Input field สำหรับใส่ URL
   - Fetch file แล้ว detect type จาก extension และ MIME type
   - รองรับ: .docx, .html, .txt, .md
   - CORS handling: แจ้ง user ถ้า CORS ไม่ผ่าน + แนะนำ download แล้ว upload
   - Progress indicator ขณะ download

7. **Plugin System:**
   - Plugin API design:
     ```typescript
     interface WordhtmlPlugin {
       name: string;
       version: string;
       register(editor: Editor): void;
       registerCommands?(registry: CommandRegistry): void;
       registerCleaners?(registry: CleanerRegistry): void;
       registerExporters?(registry: ExporterRegistry): void;
     }
     ```
   - Plugin manager: enable/disable, update, uninstall
   - Security: sandbox ผ่าน iframe หรือ Content Security Policy
   - Store plugins ใน IndexedDB
   - UI: plugin marketplace (local), plugin settings

8. **Voice Typing:**
   - Web Speech API (`SpeechRecognition`)
   - Language: th-TH (ไทย), en-US (อังกฤษ)
   - UI: microphone button ใน toolbar
   - แทรก text ที่ cursor position
   - รองรับ continuous listening หรือ one-shot
   - Browser support detection + fallback message

#### Success Criteria
- [ ] เอกสารเก็บใน IndexedDB ได้ (ไม่จำกัดขนาด)
- [ ] User สามารถ encrypt snapshot ด้วย password ได้
- [ ] User สามารถ export PDF ได้
- [ ] User สามารถ share เอกสารผ่าน WebRTC ได้ (manual signaling)
- [ ] User สามารถสร้าง QR code จากเอกสารได้
- [ ] User สามารถ import ไฟล์จาก URL ได้
- [ ] Plugin system สามารถ register extension ได้
- [ ] User สามารถพิมพ์ด้วยเสียงได้ (Chrome)

#### Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebRTC signaling ยากใน static export | 🔴 High | ใช้ manual copy-paste + QR code ชัดเจน มี video tutorial |
| PDF export ฟอนต์ไทยเพี้ยน | 🟡 Medium | ใช้ font embedding ใน html2canvas หรือ fallback เป็น image |
| Plugin security risk | 🟡 Medium | Sandbox + CSP + user confirmation |
| Encryption password recovery ไม่ได้ | 🟡 Medium | แจ้งเตือนชัดเจนว่า "ถ้าลืม password ข้อมูลหาย" |

---

### 5.1 Timeline Summary

```
สัปดาห์ที่:  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
            ├────── Phase 1 ──────┤
                                 ├──────── Phase 2 ────────┤
                                                            ├──────── Phase 3 ────────┤
                                                                                       ├──────── Phase 4 ────────┤
                                                                                                                  ├────────── Phase 5 ──────────┤
```

| Phase | สัปดาห์ | Features | Easy | Medium | Hard |
|-------|--------|----------|------|--------|------|
| 1: Foundation | 1-3 | 8 | 8 | 0 | 0 |
| 2: Document Structure | 4-7 | 6 | 2 | 1 | 3 |
| 3: Media & Objects | 8-11 | 7 | 3 | 3 | 1 |
| 4: Productivity & Polish | 12-15 | 8 | 6 | 2 | 0 |
| 5: Privacy & Advanced | 16-20 | 8 | 4 | 2 | 2 |
| **รวม** | **20 สัปดาห์** | **37** | **23** | **8** | **6** |

---

## 6. Technical Architecture Notes

### 6.1 Tiptap Extensions ที่ต้องสร้าง

| Extension ชื่อ | ใช้สำหรับ | ความซับซ้อน | แนวทาง |
|----------------|----------|------------|--------|
| `FigureNode` | Image + Caption | Medium | Custom Node: `figure → [img, figcaption]` |
| `ResizableImage` | Image drag-resize | Easy | `ResizableNodeView` wrapper หรือ `tiptap-extension-resizable-image` |
| `ChartNode` | Charts (bar/line/pie) | Medium | Custom NodeView ที่ render Chart.js/Recharts |
| `EmbedNode` | YouTube, iframe | Easy | Custom Node ที่ render `<iframe>` |
| `MathNode` | KaTeX equations | Medium | Custom NodeView ที่ render KaTeX |
| `DrawingNode` | Canvas shapes | Hard | Custom NodeView ด้วย Canvas API |
| `BookmarkMark` | Bookmarks/anchors | Easy | Custom Mark ด้วย `id` attribute |
| `CommentMark` | Inline comments | Medium | Custom Mark ด้วย `commentId` |
| `TextBoxNode` | Floating text boxes | Hard | Custom Node ด้วย absolute positioning |
| `HeaderNode` / `FooterNode` | Header/Footer | Hard | ขึ้นกับ pagination engine |
| `PageNumber` | Page number placeholders | Hard | Plugin ที่ update ตาม pagination |
| `AutoRecover` | Auto-save logic | Easy | Tiptap Plugin ที่ listen `update` event |
| `TableCellFormula` | Table formulas | Medium | Extend TableCell + formula parser |
| `CoverImageNode` | Page cover | Easy | Image node + CSS `width: 100%` |

### 6.2 New Dependencies (npm packages)

| Package | ใช้สำหรับ | Phase | ขนาด (ประมาณ) |
|---------|----------|-------|--------------|
| `cmdk` | Command Palette UI | 1 | ~15 KB |
| `fuse.js` | Fuzzy search | 1 | ~10 KB |
| `sonner` | Toast notifications | 1 | ~5 KB |
| `localforage` | IndexedDB wrapper | 5 | ~8 KB |
| `qrcode` | QR code generation | 5 | ~15 KB |
| `chart.js` + `react-chartjs-2` | Charts | 3 | ~60 KB |
| `katex` | Math equations | 5 | ~40 KB |
| `html2pdf.js` | PDF export | 5 | ~100 KB |
| `mathjs` | Table formulas | 3 | ~150 KB |
| `tiptap-extension-resizable-image` | Image resize | 3 | ~5 KB |
| `@tiptap/extension-character-count` | Character count | 1 | ~2 KB |
| `@radix-ui/react-context-menu` | Context menu | 4 | ~10 KB |

**รวม bundle size เพิ่ม:** ~420 KB (gzipped ~140 KB) — รับได้สำหรับ Next.js code splitting

### 6.3 Web APIs ที่ใช้

| API | ใช้สำหรับ | Phase | Browser Support |
|-----|----------|-------|-----------------|
| **Web Crypto API** (`crypto.subtle`) | Local encryption | 5 | Chrome 37+, FF 34+, Safari 10.1+ |
| **IndexedDB** | Large document storage | 5 | Universal (Safari มี limitations) |
| **WebRTC** (`RTCPeerConnection`) | P2P share | 5 | Chrome, FF, Safari (รองรับครบ) |
| **Web Speech API** (`SpeechRecognition`) | Voice typing | 5 | Chrome (ดีที่สุด), Safari จำกัด |
| **Clipboard API** (`navigator.clipboard`) | Clipboard history | 4 | Chrome, FF (permission-based) |
| **ResizeObserver** | Ruler, layout | 2 | Universal |
| **IntersectionObserver** | Outline highlight | 4 | Universal |
| **BeforeUnload Event** | Unsaved changes | 1 | Universal |
| **File System Access API** | (Future) Open/Save | - | Chrome only (ไม่ใช้ตอนนี้) |

### 6.4 Data Model Changes

#### Snapshot Format (ใหม่)

```typescript
interface DocumentSnapshot {
  id: string;
  name: string;
  content: JSONContent;        // Tiptap JSON
  html: string;                // Rendered HTML (for quick preview)
  pageSetup: PageSetup;
  createdAt: number;
  updatedAt: number;
  encrypted?: boolean;         // true ถ้า encrypt แล้ว
  salt?: Uint8Array;            // สำหรับ encryption
  iv?: Uint8Array;              // สำหรับ encryption
}

interface PageSetup {
  size: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  marginMm: { top: number; bottom: number; left: number; right: number };
}

interface HeaderFooterConfig {
  header: JSONContent | null;
  footer: JSONContent | null;
  differentFirstPage: boolean;
  differentOddEven: boolean;
}
```

#### Template Format (ใหม่)

```typescript
interface Template {
  id: string;
  name: string;
  category: 'official' | 'report' | 'resume' | 'memo' | 'custom';
  description: string;
  thumbnail?: string;          // data URL หรือ base64
  html: string;
  pageSetup: PageSetup;
  headerFooter?: HeaderFooterConfig;
  variables: string[];         // ['name', 'date', 'company']
  createdAt: number;
}
```

#### Comment Format (ใหม่)

```typescript
interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
  resolved: boolean;
  position: { from: number; to: number }; // ProseMirror position
}
```

---

## 7. Risk Assessment & Mitigation

### 7.1 Technical Risks

| # | Risk | Features ที่ได้รับผล | ระดับ | Mitigation |
|---|------|----------------------|-------|------------|
| 1 | **Pagination engine complexity** | Header/Footer, Page Numbers, TOC page sync | 🔴 High | ใช้ 3rd-party pagination engine (`tiptap-pagination-plus`) ก่อน ถ้าไม่พอใจค่อย evaluate Tiptap Pro หรือ build เอง |
| 2 | **ProseMirror absolute positioning** | Text Boxes, Shapes | 🔴 High | ลด scope ให้เป็น "anchored elements" ที่ติดกับ paragraph แทน absolute positioning |
| 3 | **WebRTC signaling ใน static export** | P2P Share | 🔴 High | ใช้ manual signaling (copy-paste SDP) + QR code exchange ชัดเจน มี video tutorial |
| 4 | **PDF export font rendering** | PDF Export | 🟡 Medium | ทดสอบกับฟอนต์ไทยทุกตัว ใช้ `html2canvas` + `jsPDF` ที่รองรับ custom fonts หรือ fallback เป็น raster |
| 5 | **Table formula circular references** | Table Formulas | 🟡 Medium | Build cycle detection ก่อน evaluate ใช้ `mathjs` แทน `eval()` |
| 6 | **Image resize + caption selection conflict** | Image Resize, Caption | 🟡 Medium | ใช้ library สำเร็จรูป (`tiptap-extension-resizable-image`) ที่ handle selection ให้ |
| 7 | **Comment position mapping ผิด** | Inline Comments | 🟡 Medium | ใช้ ProseMirror position mapping ทุกครั้งที่ content เปลี่ยน ถ้า text ถูกลบ → mark comment as "orphaned" |
| 8 | **IndexedDB Safari deletion** | IndexedDB Storage | 🟡 Medium | มี fallback เป็น localStorage + แจ้งเตือน user เมื่อ storage ต่ำ |
| 9 | **Web Crypto secure context** | Local Encryption | 🟢 Low | รับรอง HTTPS / localhost หรือแจ้งเตือน user |
| 10 | **QR code capacity limit** | QR Export | 🟢 Low | ใช้สำหรับ short URL/key เท่านั้น ไม่ใช้สำหรับเอกสารเต็ม |
| 11 | **Bundle size increase** | ทุก phase | 🟡 Medium | Code splitting ด้วย dynamic imports (`React.lazy` + `import()`) โหลด feature แยกตาม phase |
| 12 | **Tiptap v3 compatibility** | ทุก extension | 🟡 Medium | ทดสอบทุก extension กับ Tiptap v3 ก่อน merge ใช้ `tiptap-extension-resizable-image` ที่รองรับ v3 |

### 7.2 User Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **Breaking changes จาก data model migration** | 🔴 High | Migration script ที่รันอัตโนมัติ มี backup ก่อน migrate แสดง changelog ชัดเจน |
| 2 | **User สับสนกับ Ctrl+K rebind** | 🟢 Low | แสดง hint ชั่วคราว 2 สัปดาห์ รองรับ Ctrl+Shift+K สำหรับ Insert Link |
| 3 | **User ลืม encryption password** | 🔴 High | แจ้งเตือนชัดเจนว่า "ถ้าลืม password = ข้อมูลหาย" ไม่มี recovery ไม่มี reset |
| 4 | **Auto-save ทำให้ performance ตก** | 🟡 Medium | Debounce 30 วินาที + เก็บเฉพาะเมื่อ idle (ไม่มี typing) |
| 5 | **P2P share ไม่ work บาง network** | 🟡 Medium | แจ้งเตือนว่าใช้ได้เฉพาะ network ที่ไม่มี corporate firewall |

### 7.3 Performance Risks

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | **IndexedDB ช้ากับเอกสารใหญ่** | 🟡 Medium | ใช้ `localforage` ที่ optimize แล้ว แบ่ง chunk ถ้าเอกสาร > 10 MB |
| 2 | **Encryption overhead** | 🟡 Medium | Encrypt เฉพาะ snapshot ที่ user เลือก ไม่ encrypt ทั้งหมด ใช้ Web Worker สำหรับ encrypt/decrypt |
| 3 | **Chart rendering ทำให้ editor ช้า** | 🟢 Low | Render chart เป็น static image ถ้าไม่ active ใช้ `requestAnimationFrame` |
| 4 | **Pagination engine re-render บ่อย** | 🔴 High | Debounce pagination calculation ใช้ virtual scrolling สำหรับเอกสารยาว |
| 5 | **Bundle size โตเร็ว** | 🟡 Medium | Dynamic imports สำหรับทุก feature ที่ไม่ใช่ core (charts, math, PDF export, encryption) |

### 7.4 Mitigation Strategies สรุป

```
High Priority Mitigation:
├── Pagination: ใช้ 3rd-party engine ก่อน ทดสอบกับเอกสาร 10+ หน้า
├── Absolute Positioning: ลด scope เป็น anchored elements
├── WebRTC: Manual signaling + clear UX + video tutorial
├── Data Migration: Auto-migration script + backup + changelog
└── Encryption Password: Clear warning + no recovery policy

Medium Priority Mitigation:
├── PDF Fonts: Test all Thai fonts + fallback to raster
├── Table Formulas: Cycle detection + mathjs (no eval)
├── Image Selection: Use battle-tested library
├── IndexedDB: localforage + fallback + storage warning
├── Performance: Debounce + Web Workers + dynamic imports
└── Bundle Size: Code splitting + lazy loading
```

---

## 8. Success Metrics

### 8.1 วัดยังไงว่า "สมบูรณ์" แล้ว

wordhtml จะถือว่า "สมบูรณ์" เมื่อสามารถทำเอกสารราชการไทยฉบับหนึ่งได้จากต้นจนจบ โดยไม่ต้องพึ่ง Microsoft Word หรือ Google Docs เอกสารราชการมาตรฐานประกอบด้วย:

- [ ] หัวกระดาษ (header) ที่มีชื่อหน่วยงาน
- [ ] ท้ายกระดาษ (footer) ที่มีเลขหน้า
- [ ] ฟอนต์ TH Sarabun New
- [ ] สารบัญ (TOC) ที่มีเลขหน้า
- [ ] ตารางที่ merge cells ได้
- [ ] รูปภาพที่มี caption และ text wrap
- [ ] หน้ากระดาษ A4 ที่แสดง pagination ได้
- [ ] Export เป็น PDF หรือ DOCX ที่ header/footer ไม่หาย

### 8.2 Performance Metrics

| Metric | เป้าหมาย | วัดยังไง |
|--------|---------|----------|
| **Initial load time** | < 3 วินาที (on 4G) | Lighthouse Performance score |
| **Time to Interactive** | < 4 วินาที | Lighthouse TTI |
| **Editor re-render count** | < 5 ครั้ง/keystroke | React DevTools Profiler |
| **Auto-save latency** | < 100ms | Performance API |
| **DOCX convert time** | < 5 วินาที (10 หน้า) | Stopwatch measurement |
| **PDF export time** | < 10 วินาที (10 หน้า) | Stopwatch measurement |
| **Memory usage** | < 200 MB (เอกสาร 50 หน้า) | Chrome DevTools Memory |
| **Bundle size (initial)** | < 500 KB gzipped | `next build` output |
| **Bundle size (all features loaded)** | < 1.5 MB gzipped | `next build` + dynamic imports |

### 8.3 User Experience Metrics

| Metric | เป้าหมาย | วัดยังไง |
|--------|---------|----------|
| **Task completion rate (เอกสารราชการ)** | > 80% | User testing กับ 10+ ข้าราชการ |
| **Time to create standard document** | < 15 นาที | Stopwatch measurement |
| **Feature discovery rate** | > 60% รู้ว่ามี slash command | Onboarding survey |
| **Recovery success rate** | > 95% (หลัง crash/refresh) | Analytics หรือ manual log |
| **User satisfaction (NPS)** | > 50 | Survey |
| **Error rate (convert/export)** | < 5% | Error tracking |
| **Support requests / feature requests ratio** | < 20% เป็น "ขาด feature พื้นฐาน" | Issue tracker analysis |

### 8.4 Definition of Done แต่ละ Phase

| Phase | Definition of Done |
|-------|-------------------|
| **Phase 1** | User ไม่กลัวข้อมูลหายอีก (auto-save + recovery) และทำงานเร็วขึ้น (slash commands + command palette) |
| **Phase 2** | User สามารถสร้างเอกสารราชการไทยฉบับสมบูรณ์ได้ (header/footer/page numbers/TOC) |
| **Phase 3** | User สามารถแทรกและจัดการรูปภาพ ตาราง กราฟ ได้สมบูรณ์ |
| **Phase 4** | User รู้สึกว่า UX "ราบรื่น" — context menu, comments, outline, zen mode |
| **Phase 5** | User สามารถใช้งาน offline สมบูรณ์ (IndexedDB + encryption) และ share ได้ (P2P/QR/PDF) |

### 8.5 Final Checklist: "สมบูรณ์" สำหรับแต่ละ Persona

| Persona | เกณฑ์ "สมบูรณ์" | Phase ที่ครบ |
|---------|------------------|--------------|
| **Office Worker (ข้าราชการ)** | เอกสารราชการไทย: header/footer, page numbers, TH Sarabun New, TOC, table, image, export PDF/DOCX | Phase 2 + 3 + 5 |
| **Developer/Content Writer** | Convert/clean HTML ได้สมบูรณ์, batch process, markdown shortcuts, command palette | Phase 1 + 4 |
| **Student** | เขียนรายงาน: image + caption, TOC, page numbers, comments, export DOCX | Phase 2 + 3 + 4 |
| **Casual User** | เขียนเอกสารง่ายๆ ไม่กลัวข้อมูลหาย, auto-save, undo, templates | Phase 1 |

---

## Appendix A: Feature Cross-Reference Table

| Feature | Phase | Tier | Effort | Impact | Dependencies |
|---------|-------|------|--------|--------|-------------|
| Auto-save / Crash Recovery | 1 | T2 | Easy | 10 | IndexedDB (Phase 5) |
| Markdown Shortcuts | 1 | T2 | Easy | 8 | - |
| Slash Commands | 1 | T2 | Easy | 9 | - |
| Command Palette | 1 | T2 | Easy | 9 | - |
| Progress Indicators | 1 | T2 | Easy | 7 | - |
| Thai Fonts Complete | 1 | T2 | Easy | 9 | - |
| Toast Notifications | 1 | T4 | Easy | 6 | - |
| Empty State Enhancement | 1 | T4 | Easy | 6 | IndexedDB |
| Character Count | 1 | T2 | Easy | 6 | - |
| Header & Footer | 2 | T1 | Hard | 10 | Page Numbers |
| Page Numbers | 2 | T1 | Hard | 10 | Header/Footer |
| TOC Enhanced | 2 | T1 | Easy | 9 | Page Numbers |
| Bookmarks | 2 | T5 | Easy | 5 | - |
| Text Boxes / Shapes | 2 | T1 | Hard | 5 | - |
| Print Preview | 2 | T5 | Medium | 6 | Header/Footer |
| Image Resize | 3 | T1 | Easy | 8 | - |
| Image Caption | 3 | T1 | Medium | 7 | Image Resize |
| Image Text Wrap | 3 | T1 | Easy | 7 | Image Resize |
| Charts | 3 | T1 | Medium | 6 | - |
| Table Merge Cells | 3 | T5 | Medium | 7 | - |
| Table Formulas | 3 | T5 | Medium | 5 | Table Merge |
| Embeds | 3 | T5 | Easy | 5 | - |
| Template Gallery | 4 | T2 | Easy | 8 | - |
| Clipboard History | 4 | T4 | Easy | 5 | - |
| Outline Panel | 4 | T4 | Easy | 6 | TOC |
| Inline Comments | 4 | T4 | Medium | 6 | - |
| Context Menu | 4 | T4 | Easy | 7 | - |
| Zen Mode | 4 | T4 | Easy | 5 | - |
| Typewriter Scrolling | 4 | T4 | Easy | 4 | - |
| Undo History Panel | 4 | T2 | Medium | 6 | - |
| IndexedDB Migration | 5 | T3 | Easy | 8 | - |
| Local Encryption | 5 | T3 | Medium | 7 | IndexedDB |
| PDF Export | 5 | T5 | Medium | 8 | - |
| P2P Share | 5 | T3 | Hard | 6 | QR Code |
| QR Code Export | 5 | T3 | Easy | 5 | - |
| Import from URL | 5 | T3 | Easy | 5 | - |
| Plugin System | 5 | T5 | Hard | 4 | Command Palette |
| Voice Typing | 5 | T5 | Easy | 5 | - |
| Math Equations | 5 | T5 | Medium | 5 | - |
| Drawing Canvas | 5 | T5 | Medium | 4 | - |
| Cover Images | 5 | T5 | Easy | 4 | - |

---

## Appendix B: Resource Estimation

### ทีมที่แนะนำ

| บทบาท | จำนวน | ความรับผิดชอบ |
|-------|--------|--------------|
| **Frontend Developer (Next.js/Tiptap)** | 1-2 | พัฒนา features ทั้งหมด โฟกัสที่ Tiptap extensions และ UI |
| **UX/UI Designer** | 0.5 (part-time) | ออกแบบ slash commands, command palette, context menu, empty states |
| **QA / Tester** | 0.5 (part-time) | ทดสอบกับเอกสารราชการจริง ทดสอบ Thai fonts, print preview, export |

### เวลาประมาณการรวม

| Scenario | ระยะเวลา | หมายเหตุ |
|----------|----------|----------|
| **Full-time team (2 devs)** | 20 สัปดาห์ (5 เดือน) | ตาม roadmap ที่กำหนด |
| **Part-time (1 dev, 20 hrs/week)** | 40 สัปดาห์ (10 เดือน) | แบ่ง Phase 1-5 ตามความเหมาะสม |
| **Solo dev (full-time)** | 30 สัปดาห์ (7.5 เดือน) | Phase 2-3 ใช้เวลามากที่สุด |
| **MVP (Phase 1 + Phase 2 บางส่วน)** | 6 สัปดาห์ | ทำแค่สิ่งที่จำเป็นสำหรับเอกสารราชการ |

---

## Appendix C: Recommended Reading & References

| หัวข้อ | แหล่งข้อมูล |
|--------|------------|
| Tiptap v3 Documentation | https://tiptap.dev/docs |
| Tiptap Pagination Plus | https://github.com/yjs/tiptap-pagination-plus |
| Tiptap Pro Extensions | https://tiptap.dev/product/extensions |
| ProseMirror Guide | https://prosemirror.net/docs/guide/ |
| Web Crypto API | https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API |
| WebRTC DataChannel | https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel |
| html2pdf.js | https://ekoopmans.github.io/html2pdf.js/ |
| KaTeX | https://katex.org/ |
| chart.js | https://www.chartjs.org/ |
| fuse.js | https://www.fusejs.io/ |
| cmdk | https://cmdk.paco.me/ |

---

*จัดทำ: Master Feature Expansion Plan สำหรับ wordhtml*  
*แหล่งข้อมูล: Competitive Analysis, Technical Feasibility Analysis, User Journey Analysis, CLAUDE.md*  
*หมายเหตุ: ทุก feature ต้องทำงาน client-side 100% เนื่องจากเป็น static export ไม่มี backend*

---

**END OF DOCUMENT**
