# Competitive Analysis: wordhtml vs. Competitors
## สรุป Feature ที่คู่แข่งมี และ Gap Analysis สำหรับ wordhtml clone

---

## 1. wordhtml.com (ต้นฉบับ)

### Features ที่มีอยู่
| หมวด | Features |
|------|----------|
| **Document Formatting** | Bold, Italic, Underline, Strikethrough, Text color, Background color, Font family, Font size, Paragraph alignment (left/center/right/justify), Ordered/unordered lists, Indent/outdent, Blockquote |
| **Media & Objects** | Image insert (URL), Table (basic), Horizontal rule, Link |
| **Document Structure** | Page break (New page), Heading formats (via Formats dropdown) |
| **Productivity** | Word count, Character count, Undo/Redo, Clean HTML options |
| **Export/Import** | Import DOCX/HTML (drag & drop), Export HTML (inline/extracted images), Export ZIP, Export DOCX |
| **HTML Cleaning** | Remove inline styles, Remove empty tags, Clear successive spaces, Remove tag attributes (keep href/src), Strip classes & IDs, Remove nbsp-only elements, Remove HTML comments, Convert to plain text |

### สิ่งที่ clone ทำได้ดีกว่า
- A4 WYSIWYG preview (paper editor)
- Dark mode
- Ruler (cm) with draggable margins
- Paragraph formatting dialog (Word-style indents & spacing)
- History/snapshots
- Template system
- Markdown export/import
- Batch convert
- Find & Replace
- Better Tiptap-based editor architecture

### สิ่งที่ clone ยังขาดจากต้นฉบับ
- ไม่มีการแสดง HTML source แบบ split view (ต้นฉบับมี Word | HTML side-by-side)
- ไม่มี cleaning icons แบบ one-by-one execute
- ไม่มี compress/encoding toggle บน HTML pane

---

## 2. Microsoft Word for the Web (Word Online)

### Core Features (ทำงานบน Browser ได้)
| หมวด | Features | ใช้ Server? |
|------|----------|-------------|
| **Document Formatting** | Font, size, color, bold/italic/underline, strikethrough, subscript/superscript, highlight, paragraph spacing, line spacing, alignment, indentation, bullets/numbering, styles (Heading 1-3, Normal, Title) | Client-side |
| **Media & Objects** | Images (inline, wrap text), basic tables (insert/delete rows/columns, borders, shading), shapes (via Drawing canvas), text boxes, ink/pen drawing, SmartArt (view only), equations, symbols/special characters | Client-side |
| **Document Structure** | Headers/footers (basic), page breaks, table of contents, page numbers, page orientation, margins, paper size | Client-side |
| **Productivity** | Real-time co-authoring (requires SharePoint/OneDrive server), comments & @mentions, track changes (basic), version history, dictation (speech-to-text), checklists, dark mode, ruler, find & replace | Co-authoring = Server; อื่น = Client |
| **Export/Import** | Open DOCX, save to OneDrive, print to PDF, export to PPT (Transcribe), copy link to heading | Server |

### Features ที่ Word Online ไม่มี (ต้องใช้ Desktop)
- Mail merge, Macros, VBA
- Content controls (สร้าง/แก้ไข)
- Bibliography/Citations (สร้าง/แก้ไข)
- Watermarks, background colors
- Advanced table formatting (custom styles, text direction, autofit)
- Document Inspector, Restricted editing
- Compare/merge documents
- Advanced printing (markups, document properties)

### สิ่งที่ wordhtml ควรพิจารณาเพิ่ม (จาก Word Online)
1. **Headers/Footers** — สำคัญมากสำหรับ A4 editor (Tiptap Pages extension มีให้)
2. **Page Numbers** — ควรมีใน header/footer
3. **Dictation (Voice Typing)** — ใช้ Web Speech API ได้ client-side
4. **Checklists** — Tiptap TaskList มีอยู่แล้ว เพิ่ม UI toggle ได้
5. **Equations** — Math extension (KaTeX/MathJax) ใช้ได้
6. **Drawing / Ink** — ยากสำหรับ pure client-side แต่ใช้ Canvas + บันทึกเป็น image ได้
7. **Dark Mode** — มีแล้ว ✅

---

## 3. Google Docs

### Core Features (Web-based)
| หมวด | Features | ใช้ Server? |
|------|----------|-------------|
| **Document Formatting** | Fonts, sizes, bold/italic/underline, strikethrough, text color, highlight, alignment, indentation, line spacing, bullets/numbering, heading styles, clear formatting | Client-side |
| **Media & Objects** | Images (upload, URL, stock), tables, drawings (basic canvas), charts (from Sheets), diagrams, special characters, equations, bookmarks, horizontal line, page break | Client-side |
| **Document Structure** | Table of contents, headers/footers, page numbers, sections (pageless mode), document tabs (2024), cover images (2024), page setup (margins, orientation, color) | Client-side |
| **Productivity** | Real-time collaboration (50 users), comments, suggestions mode, @mentions, action items, version history, offline mode (Chrome extension + IndexedDB), voice typing, dictionary/thesaurus, translate, research tool (Explore), Smart Chips, eSignature, AI (Gemini) | Collaboration = Server; Offline/Smart Chips/AI = Hybrid |
| **Export/Import** | Import DOCX, ODT, RTF, TXT, HTML; Export DOCX, ODT, RTF, PDF, TXT, HTML, EPUB; Publish to web; Email as attachment | Server |

### สิ่งที่ Google Docs ทำได้ client-side (offline hints)
- **Offline editing**: ใช้ Google Docs Offline Chrome extension + IndexedDB + Service Worker
- **Auto-save**: ใช้ local changes queue แล้ว sync ตอน online
- **Markdown shortcuts**: ใช้ได้ทันที (Tools > Preferences > Enable markdown)
- **Voice typing**: ใช้ Web Speech API
- **Dictionary**: client-side lookup

### UX Patterns ที่น่าเอาใช้
1. **Slash commands** (`/` menu) — Notion style, เร็วกว่า dropdown menu
2. **Command palette** (Ctrl+K) — ค้นหา command ทั้งหมด
3. **@mentions** — สำหรับ comments/collaboration
4. **Smart Chips** — พิมพ์ `@` แล้วเลือก person, date, file
5. **Pageless mode** — ไม่มี page break สำหรับ online reading
6. **Document tabs** — แยก section ในเอกสารเดียว
7. **Cover images** — ภาพหน้าปกเต็มความกว้าง

---

## 4. Notion / Craft / AppFlowy

### UX Patterns ที่ดี
| Pattern | รายละเอียด | Implement ยากไหม |
|---------|-----------|------------------|
| **Slash Commands** (`/`) | พิมพ์ `/` แล้วเลือก block type — heading, list, image, table, code, quote, divider, callout | ง่าย (Tiptap มี Slash Menu ให้) |
| **Drag-and-drop blocks** | ลาก block ย้ายตำแหน่ง, สร้าง columns | ปานกลาง (Tiptap มี drag-and-drop extension) |
| **Markdown shortcuts** | `#` = H1, `##` = H2, `*` = bullet, `1.` = ordered, `>` = quote, `` ` `` = code | ง่าย (Tiptap มี Markdown shortcuts) |
| **Command palette** (Cmd+K) | ค้นหา commands ทั้งหมดในแอพ | ง่าย |
| **Block-based architecture** | ทุกอย่างเป็น block: text, image, table, embed | ปานกลาง |
| **Toggle blocks** |  block ที่พับ/กางได้ (collapse/expand) | ง่าย |
| **Callouts** |  block สีพื้นหลัง + icon สำหรับเน้นข้อความ | ง่าย |
| **Databases** | ตารางที่เป็น database ได้ (Notion) | ยาก |
| **Kanban** | board view (AppFlowy/Craft) | ยาก |
| **Backlinks** | ลิงก์ระหว่างเอกสาร | ปานกลาง |

### สิ่งที่ port มาใช้ได้ง่ายใน wordhtml
1. **Slash commands** ✅ ทำได้ทันทีด้วย Tiptap
2. **Markdown shortcuts** ✅ Tiptap มี built-in
3. **Drag-and-drop blocks** ✅ Tiptap มี extension
4. **Toggle blocks / Callouts** ✅ สร้าง custom Tiptap node ได้
5. **Command palette** ✅ ใช้ library เช่น cmdk
6. **Cover images** ✅ ใช้ Tiptap image node + CSS

---

## 5. Tiptap / ProseMirror / Quill Ecosystem

### Tiptap v3 Open Source (มีให้ใช้ฟรี)
| Feature | Extension | ใช้ใน wordhtml แล้ว? |
|---------|-----------|---------------------|
| Bold, Italic, Strike, Code | StarterKit (Marks) | ✅ |
| Underline | `@tiptap/extension-underline` | ✅ (v3 อยู่ใน StarterKit) |
| Link | `@tiptap/extension-link` | ✅ |
| Heading 1-6 | StarterKit | ✅ |
| Bullet/Ordered lists | StarterKit | ✅ |
| Blockquote | StarterKit | ✅ |
| Code block | StarterKit | ✅ |
| Horizontal rule | StarterKit | ✅ |
| Hard break | StarterKit | ✅ |
| Table | `@tiptap/extension-table` + row/cell/header | ✅ |
| Task list | `@tiptap/extension-task-list` + task-item | ✅ |
| Image | `@tiptap/extension-image` | ✅ (custom ImageWithAlign) |
| Text align | `@tiptap/extension-text-align` | ✅ |
| Text color / Highlight | `@tiptap/extension-color` + highlight | ✅ |
| Font family | `@tiptap/extension-font-family` | ✅ |
| Subscript/Superscript | `@tiptap/extension-subscript` + superscript | ✅ |
| Placeholder | `@tiptap/extension-placeholder` | ✅ |
| History (undo/redo) | StarterKit | ✅ |
| Dropcursor / Gapcursor | StarterKit | ✅ |
| Search & Replace | `@sereneinserenade/tiptap-search-and-replace` | ✅ |
| Character count | `@tiptap/extension-character-count` | ❌ |
| Focus | `@tiptap/extension-focus` | ❌ |
| Collaboration (Yjs) | `@tiptap/extension-collaboration` | ❌ |
| Placeholder | `@tiptap/extension-placeholder` | ✅ |

### Tiptap Pro (ต้องจ่ายเงิน — แต่บ่งชั้นได้)
| Feature | Extension | ราคา/หมายเหตุ |
|---------|-----------|---------------|
| **Pages** (Pagination, A4/Letter, headers/footers, page breaks) | `@tiptap-pro/extension-pages` | Pro subscription |
| **DOCX Import** | `@tiptap-pro/extension-import-docx` | Pro + Convert App ID |
| **DOCX Export** | `@tiptap-pro/extension-export-docx` | Pro |
| **PDF Export** | `@tiptap-pro/extension-export-pdf` | Pro |
| **TableKit for Pages** | `@tiptap-pro/extension-pages-tablekit` | Pro |
| **Collaboration** | Hocuspocus (open source) + Tiptap Cloud | OSS ฟรี / Cloud จ่าย |
| **Comments** | `@tiptap-pro/extension-comments` | Pro |
| **AI Toolkit** | `@tiptap-pro/extension-ai` | Pro |
| **Math** | `@tiptap-pro/extension-mathematics` | Pro |

### ProseMirror (Foundation ของ Tiptap)
- **Input rules**: Markdown-like shortcuts (`# ` → H1, `* ` → bullet, `> ` → blockquote)
- **Keymaps**: Keyboard shortcuts แบบ Vim/Emacs style
- **Plugins**: สร้าง custom plugin ได้ unlimited
- **Schema**: กำหนด document structure เองได้
- **Node views**: ใช้ React/Vue component เป็น content ใน editor ได้

### สิ่งที่ Tiptap ecosystem มีแต่ wordhtml ยังไม่ได้ใช้
1. **Character count** — ง่าย มี extension ให้
2. **Focus mode** — เน้น paragraph ปัจจุบัน ทำให้เหลือจาง
3. **Collaboration cursor** — แสดง cursor ของคนอื่น (ใช้ Yjs)
4. **Comments** — side panel comments (Pro หรือทำเอง)
5. **AI autocompletion** — Pro หรือต่อ GPT API เอง
6. **Math equations** — KaTeX/MathJax node
7. **Drawing / Canvas** — custom NodeView ด้วย Canvas API
8. **Embeds** — YouTube, Figma, etc. (iframe node)
9. **Mentions** — `@username` autocomplete
10. **Table of Contents** — สร้างจาก heading nodes (ทำเองได้)

---

## สรุป Feature Gap & แนะนำสำหรับ wordhtml

### A. Document Formatting
| Feature | wordhtml มี? | คู่แข่ง | ควรเพิ่ม? | ความยาก |
|---------|-------------|--------|----------|---------|
| Bold/Italic/Underline/Strike | ✅ | ทุกตัว | — | — |
| Text color / Highlight | ✅ | ทุกตัว | — | — |
| Font family / Size | ✅ | ทุกตัว | — | — |
| Alignment | ✅ | ทุกตัว | — | — |
| Lists (bullet/ordered/task) | ✅ | ทุกตัว | — | — |
| Indent/Outdent | ✅ | ทุกตัว | — | — |
| Paragraph spacing (before/after) | ✅ | Word, GDocs | — | — |
| Line height (single/1.5/double/custom) | ✅ | Word, GDocs | — | — |
| Hanging indent / First-line indent | ✅ | Word, GDocs | — | — |
| **Styles (Heading 1-3 + Normal)** | ⚠️ บางส่วน | Word, GDocs | ✅ **ควรเพิ่ม** | ง่าย |
| **Clear formatting** | ✅ | GDocs | — | — |
| **Columns (2/3 columns)** | ❌ | Word, GDocs | ⚠️ พิจารณา | ปานกลาง |
| **Text direction (RTL)** | ❌ | Word, GDocs | ⚠️ พิจารณา | ง่าย |
| **Drop cap** | ❌ | Word | ❌ ไม่จำเป็น | — |

### B. Media & Objects
| Feature | wordhtml มี? | คู่แข่ง | ควรเพิ่ม? | ความยาก |
|---------|-------------|--------|----------|---------|
| Images (upload/URL) | ✅ | ทุกตัว | — | — |
| Image resize | ✅ | ทุกตัว | — | — |
| Image align | ✅ | ทุกตัว | — | — |
| Tables | ✅ | ทุกตัว | — | — |
| Table merge cells | ❌ | Word, GDocs | ⚠️ พิจารณา | ปานกลาง |
| Table styles (striped, bordered) | ⚠️ 基本 | Word, GDocs | ✅ **ควรเพิ่ม** | ง่าย |
| Horizontal rule | ✅ | ทุกตัว | — | — |
| **Shapes / Drawing** | ❌ | Word Online | ❌ ไม่จำเป็น (ยาก) | ยาก |
| **Charts** | ❌ | Word, GDocs | ❌ ไม่จำเป็น | ยาก |
| **Equations (Math)** | ❌ | Word, GDocs | ⚠️ พิจารณา | ปานกลาง |
| **Bookmarks / Anchors** | ❌ | Word, GDocs | ⚠️ พิจารณา | ง่าย |
| **Embeds (YouTube, etc.)** | ❌ | Notion, GDocs | ⚠️ พิจารณา | ง่าย |

### C. Document Structure
| Feature | wordhtml มี? | คู่แข่ง | ควรเพิ่ม? | ความยาก |
|---------|-------------|--------|----------|---------|
| Page breaks | ✅ | ทุกตัว | — | — |
| **Headers / Footers** | ❌ | Word, GDocs | ✅ **สำคัญมาก** | ปานกลาง |
| **Page numbers** | ❌ | Word, GDocs | ✅ **สำคัญมาก** | ง่าย |
| **Table of Contents** | ✅ | Word, GDocs | — | — |
| **Sections (different margins per section)** | ❌ | Word | ❌ ไม่จำเป็น | ยาก |
| Document tabs (GDocs) | ❌ | GDocs | ❌ ไม่จำเป็น | ยาก |
| Cover images | ❌ | GDocs, Notion | ⚠️ พิจารณา | ง่าย |

### D. Productivity
| Feature | wordhtml มี? | คู่แข่ง | ควรเพิ่ม? | ความยาก |
|---------|-------------|--------|----------|---------|
| Undo/Redo | ✅ | ทุกตัว | — | — |
| Find & Replace | ✅ | ทุกตัว | — | — |
| Word count | ✅ | ทุกตัว | — | — |
| Character count | ❌ | Tiptap ext | ✅ **ง่าย** | ง่าย |
| **Slash commands** | ❌ | Notion, Craft, Tiptap demos | ✅ **ควรเพิ่ม** | ง่าย |
| **Command palette (Cmd+K)** | ❌ | Notion, GDocs, Linear | ✅ **ควรเพิ่ม** | ง่าย |
| **Markdown shortcuts** | ⚠️ บางส่วน | GDocs, Notion | ✅ **ควรเพิ่ม** | ง่าย |
| **Keyboard shortcuts panel** | ✅ | Word, GDocs | — | — |
| **Templates** | ✅ | Word, GDocs | — | — |
| **History / Snapshots** | ✅ | GDocs | — | — |
| **Dark mode** | ✅ | Word, GDocs | — | — |
| **Comments** | ❌ | Word, GDocs | ⚠️ พิจารณา | ปานกลาง |
| **Collaboration** | ❌ | Word, GDocs, Notion | ❌ ไม่จำเป็น (scope) | ยาก |
| **Voice typing** | ❌ | Word, GDocs | ⚠️ พิจารณา | ง่าย |
| **Auto-save / Crash recovery** | ⚠️ Snapshots | GDocs | ✅ **ควรเพิ่ม** | ง่าย |
| **Print preview / @media print** | ✅ | Word, GDocs | — | — |
| **Ruler** | ✅ | Word, GDocs | — | — |
| **Page setup dialog** | ✅ | Word, GDocs | — | — |
| **Status bar** | ✅ | Word | — | — |

### E. Export/Import Capabilities
| Feature | wordhtml มี? | คู่แข่ง | ควรเพิ่ม? | ความยาก |
|---------|-------------|--------|----------|---------|
| Import DOCX | ✅ | ทุกตัว | — | — |
| Import HTML | ✅ | ทุกตัว | — | — |
| **Import Markdown** | ✅ | GDocs | — | — |
| **Import ODT/RTF** | ❌ | Word, GDocs | ❌ ไม่จำเป็น | ยาก |
| Export HTML | ✅ | ทุกตัว | — | — |
| Export ZIP (with images) | ✅ | ต้นฉบับ | — | — |
| Export DOCX | ✅ | ทุกตัว | — | — |
| **Export PDF** | ❌ | Word, GDocs | ✅ **ควรเพิ่ม** | ปานกลาง |
| **Export Markdown** | ✅ | GDocs | — | — |
| **Export ODT** | ❌ | Word, GDocs | ❌ ไม่จำเป็น | ยาก |
| **Batch convert** | ✅ | — | — | — |
| **Image compression** | ✅ | — | — | — |
| **Paste from Word cleanup** | ✅ | ทุกตัว | — | — |

---

## Priority Matrix: ควรทำอะไรก่อน

### 🔴 High Priority (ทำก่อน — Impact สูง, Effort ต่ำ-ปานกลาง)
1. **Headers/Footers + Page Numbers** — สำคัญมากสำหรับ A4 editor (Tiptap Pages หรือทำเอง)
2. **Slash Commands (`/` menu)** — UX สมัยใหม่ ง่ายมากด้วย Tiptap
3. **Markdown shortcuts** — `#`, `##`, `*`, `1.`, `>`, `` ` `` ฯลฯ
4. **Command Palette (Ctrl+K)** — รวมทุกคำสั่งไว้ที่เดียว
5. **Character count** — Tiptap extension มีให้
6. **Auto-save / Crash recovery** — ใช้ beforeunload + IndexedDB

### 🟠 Medium Priority (Impact ดี, Effort ปานกลาง)
7. **Table merge cells / Table styles** — ใช้ table extension ขั้นสูง
8. **Math equations (KaTeX)** — สำคัญสำหรับ academic documents
9. **PDF Export** — ใช้ html2pdf หรือ Tiptap Pro
10. **Bookmarks / Anchors** — ใช้ heading IDs + link to anchor
11. **Cover images** — สำหรับ pageless mode / หน้าปก
12. **Embeds (YouTube, etc.)** — iframe node ง่ายๆ
13. **Voice typing** — Web Speech API
14. **Comments / Suggestions** — ปานกลาง ต้องออกแบบ data model

### 🟢 Low Priority / Future (Impact น้อยหรือ Effort สูง)
15. Real-time collaboration (Yjs + WebSocket)
16. Drawing / Ink / Shapes (Canvas-based)
17. Charts (integration กับ chart library)
18. Columns layout (CSS columns)
19. RTL support
20. Import ODT/RTF
21. AI features (autocomplete, summarization)

---

## ข้อสังเกตเกี่ยวกับ wordhtml clone

### จุดแข็ง (ที่เหนือกว่าต้นฉบับและคู่แข่งบางตัว)
1. **100% client-side, privacy-first** — ไม่มี server, ไม่ต้อง login
2. **A4 WYSIWYG paper editor** — ใกล้เคียง Word มากกว่า HTML editor ทั่วไป
3. **Thai-first i18n** — รองรับภาษาไทยดี (TH Sarabun, Noto Sans Thai, Kanit, Prompt)
4. **Template Studio** — มี variable badges, data import, multi-page preview (เหนือกว่าต้นฉบับมาก)
5. **Ruler + Margin guides** — professional page layout feel
6. **History/Snapshots** — local version control
7. **Modern stack** — Next.js 16, Tiptap v3, Tailwind v4

### จุดอ่อน (ที่ควรปรับปรุง)
1. **ไม่มี headers/footers** — ขาดสำหรับ A4 document editor
2. **ไม่มี page numbers** — ขาดสำหรับ print-ready documents
3. **ไม่มี slash commands** — UX ยังเป็นแบบ menu-based แบบ Office 2000
4. **ไม่มี markdown shortcuts** — power users ต้องการ
5. **ไม่มี PDF export** — สำคัญสำหรับ sharing
6. **ไม่มี collaboration** — ไม่ใช่ scope แต่ถ้าจะขยายต้องคิดไว้

---

*จัดทำ: Competitive Analysis สำหรับ wordhtml clone*
*แหล่งข้อมูล: wordhtml.com, GitHub IntraWY/wordhtml (CLAUDE.md, commits), Microsoft Learn (Word for the web service description), Google Workspace Updates, Tiptap Docs, Notion/Craft/AppFlowy documentation*
