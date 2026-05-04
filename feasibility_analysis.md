# wordhtml Technical Feasibility Analysis
## Next.js 16 + Tiptap v3 + Zustand + Tailwind v4 (Static Export, No Server)

**วันที่วิเคราะห์:** 2025-01-20  
**หมายเหตุ:** ทุก feature ต้องทำงาน client-side 100% เนื่องจากเป็น static export ไม่มี backend

---

## Executive Summary

| Tier | Features | สรุปภาพรวม |
|------|--------|-----------|
| **Tier 1: Core** (8 items) | Image resize, Caption, Text wrap, Charts, Header/Footer, Page numbers, TOC, Text boxes | ทำได้ทั้งหมด แต่ Header/Footer + Page numbers + Text boxes ต้องอาศัย pagination engine หรือ custom implementation ที่ซับซ้อน |
| **Tier 2: Productivity** (6 items) | Auto-recovery, Clipboard history, Outline, Templates, Bookmarks, Table formulas | ทำได้ทั้งหมด เป็น pure client-side logic |
| **Tier 3: Privacy/Data** (4 items) | Local encryption, IndexedDB, P2P share, QR export | ทำได้ทั้งหมด Web APIs รองรับครบ |
| **Tier 4: UX Polish** (5 items) | Command Palette, Context menu, Inline comments, Zen mode, Typewriter scrolling | ทำได้ทั้งหมด โดย Inline comments ต้องออกแบบ local annotation เอง |

**คะแนนรวม:** 23/23 features ทำได้ใน browser (100% technically feasible)

---

## ตารางสรุปทั้งหมด

| # | Feature | ทำได้ใน browser? | Library/API ที่ใช้ | Tiptap Extension / Custom? | ปัญหา Technical | Dependencies | ระดับความยาก |
|---|--------|-----------------|-------------------|---------------------------|----------------|-------------|------------|
| 1 | Image resize (ลากขอบ) | ✅ ทำได้ | `ResizableNodeView` (official Tiptap) หรือ `tiptap-extension-resizable-image` | Tiptap NodeView (custom wrapper) | Selection state อาจหายขณะ resize figure node ที่ซ้อนกัน | ต้อง extend Image node เพิ่ม width/height attributes | **Easy** |
| 2 | Image caption | ✅ ทำได้ | `@pentestpad/tiptap-extension-figure` หรือ custom figure node | Custom Node (`figure` + `figcaption`) หรือ extend Image + NodeView | Figure node selection ต่างจาก Image node ต้องจัดการ selection ให้ดี | ขึ้นกับ Image resize (ควรทำพร้อมกัน) | **Medium** |
| 3 | Image text wrap | ✅ ทำได้ | Pure CSS `float: left/right` + Tiptap image attributes | Extend Image node เพิ่ม `align` attribute | CSS float ทำงานใน contenteditable ได้ปกติ แต่ต้องระวัง `clear` behavior ใน ProseMirror | ขึ้นกับ Image resize + Caption | **Easy** |
| 4 | Charts (bar/line/pie) | ✅ ทำได้ | `chart.js` หรือ `recharts` (React) | Custom Node (`chart` node หรือ `iframe`-like NodeView) | Export เป็น static image ต้องใช้ canvas `toDataURL()` หรือ SVG serialization | ขึ้นกับ Image node (embed เป็น image) | **Medium** |
| 5 | Header & Footer | ✅ ทำได้ (ซับซ้อน) | `tiptap-pagination-plus` (3rd party) หรือ `@tiptap-pro/extension-pages` (pro) | Pagination extension หรือ custom page container Node | **Hard limit:** Tiptap Pages เป็น pro extension ($$) และต้องใช้ ConvertKit + TableKit ร่วมกัน หรือ build pagination engine เอง | ขึ้นกับ Page numbers + Page break logic | **Hard** |
| 6 | Page numbers | ✅ ทำได้ | CSS `counter(page)` (เฉพาะ print) หรือ JS calculation จาก pagination engine | Custom Plugin หรือใช้ร่วมกับ Pagination extension | CSS `@page` margin boxes ไม่มี browser support ใน Chrome/Firefox ต้องใช้ JS-rendered pagination | ขึ้นกับ Header/Footer | **Hard** |
| 7 | TOC อัตโนมัติ | ✅ ทำได้ | Tiptap `getJSON()` + heading nodes traverse | ไม่ต้องสร้าง extension ใหม่ ใช้ existing Heading nodes | ต้อง sync แบบ real-time ผ่าน editor events (doc changed) | ไม่มี | **Easy** |
| 8 | Text boxes / Shapes | ✅ ทำได้ | Custom Node + CSS `position: absolute` + SVG | Custom Node (`textBox`, `shape`) แบบ absolute positioning | ProseMirror ไม่ถนัด absolute positioning ต้องเก็บ x,y เป็น node attributes และ render ผ่าน NodeView | ไม่มี (แต่ซับซ้อน) | **Hard** |
| 9 | Auto-recovery | ✅ ทำได้ | `localStorage` / `IndexedDB` + `beforeunload` event | ไม่ต้อง Tiptap extension ใช้ Zustand store + debounced persist | Recovery ต้อง merge state ระหว่าง current doc กับ recovered snapshot | ขึ้นกับ IndexedDB | **Easy** |
| 10 | Clipboard history | ✅ ทำได้ | Clipboard API + `localStorage` / `IndexedDB` | ไม่ต้อง Tiptap extension ใช้ editor event listeners | Permission บาง browser อาจจำกัด clipboard read | ไม่มี | **Easy** |
| 11 | Outline/Navigation panel | ✅ ทำได้ | Tiptap `getJSON()` + heading extraction | ไม่ต้อง Tiptap extension | Scroll-to-position ต้อง map ระหว่าง heading index กับ DOM position | ขึ้นกับ TOC | **Easy** |
| 12 | Template gallery | ✅ ทำได้ | `localStorage` / `IndexedDB` เก็บ JSON templates | ไม่ต้อง Tiptap extension ใช้ `editor.commands.setContent()` | UI-heavy แต่ logic ง่าย | ไม่มี | **Easy** |
| 13 | Bookmarks | ✅ ทำได้ | Custom Mark หรือ anchor attributes | Custom Mark (`bookmark`) หรือ extend Text ด้วย anchor ID | Bookmark แบบ internal link ต้อง map position หรือ node ID | ไม่มี | **Medium** |
| 14 | Table formulas | ✅ ทำได้ | Pure JS `eval()` หรือ custom formula parser | Extend TableCell node เพิ่ม formula attribute | Security: `eval()` อันตราย ต้อง build safe math parser เอง หรือใช้ `mathjs` | ขึ้นกับ Table extension | **Medium** |
| 15 | Local encryption (Web Crypto) | ✅ ทำได้ | Web Crypto API (`crypto.subtle` - AES-GCM + PBKDF2) | ไม่ต้อง Tiptap extension | Key management (user password → derive key) ต้องออกแบบดี | ไม่มี | **Medium** |
| 16 | IndexedDB storage | ✅ ทำได้ | IndexedDB API หรือ `localforage` wrapper | ไม่ต้อง Tiptap extension | Safari อาจ auto-delete IndexedDB เมื่อ storage ต่ำ | ไม่มี | **Easy** |
| 17 | P2P share (WebRTC) | ✅ ทำได้ | WebRTC `RTCPeerConnection` + `RTCDataChannel` | ไม่ต้อง Tiptap extension | ต้องมี signaling server (แม้จะส่งข้อมูลผ่าน P2P) หรือใช้ QR code/WebRTC แบบ trickle | ขึ้นกับ QR code (สำหรับ signaling) | **Hard** |
| 18 | QR code export | ✅ ทำได้ | `qrcode` (npm) หรือ `qrcodejs` (pure JS) | ไม่ต้อง Tiptap extension | URL length limit (QR code capacity ~3KB-7KB) ไม่เหมาะกับเอกสารใหญ่ | ไม่มี | **Easy** |
| 19 | Command Palette | ✅ ทำได้ | `fuse.js` + Tiptap commands + `cmdk` (UI) | ใช้ existing Tiptap commands | ต้อง build searchable index จาก commands + actions | ไม่มี | **Easy** |
| 20 | Context menu | ✅ ทำได้ | `Radix UI ContextMenu` หรือ `@radix-ui/react-context-menu` | ไม่ต้อง Tiptap extension | ต้อง map click position → ProseMirror position → node/marks | ไม่มี | **Easy** |
| 21 | Inline comments | ✅ ทำได้ (แบบ local) | Custom Mark + local annotation store (Zustand) | Custom Mark (`comment`) + comment thread UI | Without YJS/server: ใช้ mark-based local comments ต้องจัดการ thread เอง และไม่ sync ข้าม devices | ไม่มี (ถ้า local-only) | **Medium** |
| 22 | Zen mode | ✅ ทำได้ | CSS toggle + Zustand state | ไม่ต้อง Tiptap extension | Pure UI/UX feature | ไม่มี | **Easy** |
| 23 | Typewriter scrolling | ✅ ทำได้ | `scrollIntoView()` + `Range.getBoundingClientRect()` | Tiptap Plugin หรือ transaction listener | Scroll behavior ต้อง smooth และไม่กวน user | ไม่มี | **Easy** |

---

## รายละเอียดแต่ละ Tier

---

## Tier 1: Core Features

### 1. Image Resize (ลากขอบ) — Easy

**วิธีทำ:** Tiptap v3 มี `ResizableNodeView` เป็น official utility ที่ wrap HTMLElement ใดๆ และเพิ่ม resize handles ให้โดยอัตโนมัติ

```javascript
// ใช้ ResizableNodeView จาก @tiptap/core
new ResizableNodeView({
  element: img,
  node,
  getPos,
  onCommit: (w, h) => {
    editor.commands.updateAttributes('image', { width: w, height: h })
  }
})
```

**หรือใช้ library สำเร็จ:**
- `tiptap-extension-resizable-image` — รองรับ Tiptap v2+v3, มี caption option ด้วย
- `@pentestpad/tiptap-extension-figure` — รองรับ resize + align + caption

**ปัญหา:**
- Figure node (image+caption) มี selection behavior ต่างจาก Image node ธรรมดา เมื่อลาก resize อาจทำให้ figure หลุดจาก selection
- ต้องระวัง `contentEditable` nodes (เช่น caption) ไม่รองรับการ resize โดยตรงจาก ResizableNodeView

**Tiptap Extension:** ต้อง extend Image node เพิ่ม `width`, `height` attributes + `addNodeView()`

---

### 2. Image Caption — Medium

**วิธีทำ:** สร้าง custom `figure` node ที่มี schema แบบ:
```
figure
├── img
└── figcaption (contentEditable)
```

**Library พร้อมใช้:**
- `@pentestpad/tiptap-extension-figure` — ใช้ Tiptap 2.x (อาจต้อง check v3 compatibility)
- `tiptap-extension-resizable-image` — มี `withCaption: true` option
- Tiptap official Figure extension (experiment) — ยังไม่ publish ต้อง copy source code

**ปัญหา:**
- `figcaption` ต้องเป็น editable content ซึ่ง ProseMirror รองรับผ่าน `contentDOM` ใน NodeView
- Figure node เป็น block node ที่มี inline content ภายใน (img + figcaption) ต้องระวัง cursor/selection behavior
- ถ้าใช้ร่วมกับ resize ต้องจัดการให้ resize handle ยังแสดงขณะที่ figcaption ถูก focus

**Tiptap Extension:** Custom Node หรือ extend Image + NodeView ที่ render `<figure>` wrapper

---

### 3. Image Text Wrap — Easy

**วิธีทำ:** ใช้ CSS `float` property บน image element ที่อยู่ใน contenteditable

```css
.ProseMirror img[data-align="left"] { float: left; margin: 0 1rem 1rem 0; }
.ProseMirror img[data-align="right"] { float: right; margin: 0 0 1rem 1rem; }
.ProseMirror img[data-align="center"] { display: block; margin: 0 auto; }
```

**การทำงานใน ProseMirror/Tiptap:**
- CSS float ทำงานได้ปกติใน `contenteditable` (เป็น standard CSS ไม่เกี่ยวกับ editing engine)
- ต้อง extend Image node เพิ่ม `align` attribute แล้ว map เป็น CSS class หรือ inline style
- ต้องระวัง `clear` ใน paragraph ถัดไป (อาจต้องใส่ `<br clear="all">` หรือ handle ผ่าน CSS)

**ปัญหา:**
- Float ทำให้ caret/selection มี behavior ที่ไม่คาดคิดบางครั้ง (เช่น cursor ข้าม image ไปอีกข้าง)
- ใน WYSIWYG บางตัว การลบ image ที่ float อาจทิ้ง empty block ที่มี float style ค้างไว้

**Tiptap Extension:** Extend Image node เพิ่ม `align` attribute

---

### 4. Charts (bar/line/pie) — Medium

**วิธีทำ:** ใช้ Chart library ใน browser แล้ว embed ผลลัพธ์ใน Tiptap

**Library แนะนำ:**
- `chart.js` —  lightweight, canvas-based, export ผ่าน `.toBase64Image()`
- `recharts` — React-based, SVG output (copy SVG element ได้เลย)
- `d3` — ความยืดหยุ่นสูง แต่ learning curve สูง

**แนวทาง integration:**
1. **Interactive charts (live rendering):** สร้าง custom Tiptap NodeView ที่ render Chart component ใน React โดยตรง
2. **Static charts (export to image):** Render chart → capture canvas/SVG → insert เป็น Image node

**ปัญหา:**
- Canvas-based charts (Chart.js) ต้อง render ลง canvas ก่อน แล้วใช้ `canvas.toDataURL()` เพื่อ get image data
- SVG-based charts (Recharts/D3) ดีกว่าสำหรับ print/scale แต่ต้อง serialize SVG เป็น string หรือ data URL
- ถ้าเก็บเอกสารเป็น JSON ต้องเก็บ chart data (labels, values) ไม่ใช่แค่ image จะได้ edit ได้ภายหลัง

**Tiptap Extension:** Custom Node (`chart` node) ที่มี attributes: `type`, `data`, `width`, `height` พร้อม NodeView ที่ render chart library

---

### 5. Header & Footer — Hard

**วิธีทำ:** มี 2 แนวทาง

#### แนวทาง A: ใช้ Pagination Engine (สำเร็จรูป)
- `@tiptap-pro/extension-pages` (Tiptap Pro, $$$) — มี pagination, header/footer, page formats ครบ
- `tiptap-pagination-plus` (3rd party, open source) — มี header/footer, page numbers, margins

**ข้อจำกัดของ Tiptap Pages Pro:**
- ต้องใช้ `@tiptap-pro/extension-convert-kit` + `@tiptap-pro/extension-pages-tablekit` ร่วมกัน
- เป็น paid extension
- **Hard limit:** "Non-splittable blocks larger than a page cause an infinite layout loop"
- "No browser-print integration" — ต้องใช้ export API (ซึ่งต้อง server บางตัว)

#### แนวทาง B: Custom Implementation
- สร้าง page container div ที่มี fixed height (เช่น A4 = 1123px)
- ใช้ CSS หรือ JS ตัด content ลงแต่ละ page
- Header/footer เป็น absolute-positioned element ในแต่ละ page

**ปัญหา:**
- Content ที่ยาวเกิน page height ต้อง split — ProseMirror ไม่มี built-in pagination
- Tables, images ที่ยาวเกินหน้า ไม่สามารถ split ได้ (ต้องย้ายทั้ง block)
- Print layout กับ on-screen layout ต่างกัน (screen ใช้ px, print ใช้ mm/cm)

**Tiptap Extension:** ถ้าใช้แนวทาง custom ต้องสร้าง `page` node ที่เป็น container ของ content + `header`/`footer` node ย่อย

---

### 6. Page Numbers — Hard

**วิธีทำ:** ขึ้นกับแนวทาง Header/Footer

**ถ้าใช้ CSS Print (จำกัด):**
```css
@media print {
  @page { @bottom-center { content: counter(page); } }
}
```
**ข้อจำกัด:** CSS `@page` margin boxes (`@bottom-center` ฯลฯ) **ไม่มี browser support** ใน Chrome/Firefox — ใช้ได้เฉพาะ PrinceXML, WeasyPrint, Paged.js

**ถ้าใช้ Pagination Engine:**
- Tiptap Pages / PaginationPlus มี `{page}` และ `{total}` placeholders
- Render แบบ real-time โดย JS calculation

**ถ้า custom implementation:**
- นับจำนวน `page` nodes ใน document
- Render page number เป็น text node ใน footer ของแต่ละ page

**ปัญหา:**
- "Page X of Y" ต้องรู้ total pages ก่อน render — ต้อง 2-pass layout หรือ estimate
- CSS `counter(pages)` ไม่รองรับใน Chrome (counter(page) ใช้ได้)

**Tiptap Extension:** ถ้าใช้ pagination engine ไม่ต้อง custom มาก แต่ถ้า custom ต้องสร้าง plugin ที่ update page numbers หลัง render

---

### 7. TOC (Table of Contents) อัตโนมัติ — Easy

**วิธีทำ:**
```javascript
const headings = [];
editor.state.doc.descendants((node, pos) => {
  if (node.type.name === 'heading') {
    headings.push({ level: node.attrs.level, text: node.textContent, pos });
  }
});
```

**Integration:**
- ใช้ Tiptap `getJSON()` หรือ traverse ProseMirror document tree
- Update TOC ผ่าน `editor.on('update', ...)` event
- Click TOC item → `editor.commands.setTextSelection(pos)` + `editor.commands.scrollIntoView()`

**ปัญหา:**
- TOC ต้อง sync แบบ real-time เมื่อ headings เปลี่ยน (เพิ่ม/ลบ/แก้ไข)
- ถ้าใช้ pagination ต้องรู้ page number ของแต่ละ heading → ต้องรอ layout เสร็จ

**Tiptap Extension:** ไม่ต้องสร้าง extension ใหม่ ใช้ heading nodes ที่มีอยู่

---

### 8. Text Boxes / Shapes — Hard

**วิธีทำ:** สร้าง custom node ที่ใช้ absolute positioning

```javascript
// Node schema
const textBox = Node.create({
  name: 'textBox',
  group: 'block',  // หรือ 'inline' ถ้าอยู่ใน paragraph
  atom: true,
  draggable: true,
  attrs: {
    x: { default: 0 },
    y: { default: 0 },
    width: { default: 200 },
    height: { default: 100 },
    content: { default: '' },
  },
  addNodeView() {
    return ({ node, getPos }) => {
      // Render absolute-positioned div ด้วย CSS transform/position
    }
  }
})
```

**ปัญหา:**
- ProseMirror ถูกออกแบบมาสำหรับ flow layout ไม่ใช่ absolute positioning
- Text box ที่ absolute จะไม่参与ใน document flow — cursor/selection behavior จะแปลก
- ถ้าใช้ `group: 'inline'` + `position: absolute` อาจทำให้ text selection ทำงานผิดพลาด
- Shapes (rectangle, circle) ใช้ SVG หรือ CSS ได้ แต่ต้องเป็น `atom: true` (leaf node)
- ต้อง implement drag-to-move เอง โดยใช้ mouse events + update node attributes

**Tiptap Extension:** Custom Node + NodeView ที่ซับซ้อนมาก

---

## Tier 2: Productivity Features

### 9. Auto-recovery — Easy

**วิธีทำ:**
```javascript
// Zustand store + debounced persist
useEffect(() => {
  const unsubscribe = editor.on('update', ({ editor }) => {
    debouncedSave(editor.getJSON());
  });
  return unsubscribe;
}, []);

const debouncedSave = debounce((content) => {
  localStorage.setItem('wordhtml-recovery', JSON.stringify({
    content,
    timestamp: Date.now(),
  }));
}, 2000);
```

**ปัญหา:**
- ถ้าเก็บทุก 2 วินาที อาจมี performance impact — ใช้ debounce + เก็บเฉพาะเมื่อ idle
- Recovery ต้องถาม user ก่อน restore (อาจจะ restore ทับ content ปัจจุบัน)

---

### 10. Clipboard History — Easy

**วิธีทำ:**
```javascript
// เก็บ pasted content ล่าสุด 10-20 รายการ
const clipboardHistory = [];

editor.on('paste', ({ editor, event }) => {
  const html = event.clipboardData.getData('text/html');
  const text = event.clipboardData.getData('text/plain');
  clipboardHistory.unshift({ html, text, timestamp: Date.now() });
  if (clipboardHistory.length > 20) clipboardHistory.pop();
  localStorage.setItem('clipboard-history', JSON.stringify(clipboardHistory));
});
```

**ปัญหา:**
- Clipboard API (`navigator.clipboard.readText()`) ต้องขอ permission ใน Chrome/Firefox
- บาง browser (Safari) มีข้อจำกัดเรื่อง clipboard access
- เก็บแค่ content ที่ paste เข้า editor ของตัวเอง (ไม่ใช่ system clipboard history)

---

### 11. Outline / Navigation Panel — Easy

**วิธีทำ:** เหมือน TOC แต่แสดงเป็น panel ด้านข้าง + highlight current section

```javascript
const currentHeading = findHeadingAtPosition(editor.state.selection.head);
// ใช้ editor.state.selection.from หา heading ที่ใกล้ที่สุดด้านบน
```

**ปัญหา:**
- Scroll sync ระหว่าง editor กับ outline panel ต้องใช้ IntersectionObserver หรือ scroll events

---

### 12. Template Gallery — Easy

**วิธีทำ:**
```javascript
const templates = [
  { name: 'Resume', content: { type: 'doc', content: [...] } },
  { name: 'Letter', content: { type: 'doc', content: [...] } },
];

// เก็บใน localStorage หรือ hardcode
const loadTemplate = (name) => {
  const template = templates.find(t => t.name === name);
  editor.commands.setContent(template.content);
};
```

**ปัญหา:**
- UI-heavy (gallery view, preview thumbnail) แต่ logic ง่าย
- ถ้าทำให้ user สร้าง template เองได้ ต้องมี template editor + storage

---

### 13. Bookmarks — Medium

**วิธีทำ:**

**แนวทาง A: Bookmark Mark (แนะนำ)**
```javascript
const bookmark = Mark.create({
  name: 'bookmark',
  attrs: { id: { default: null } },
  parseHTML() {
    return [{ tag: 'a[name]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes, { name: HTMLAttributes.id }), 0];
  },
})
```

**แนวทาง B: Anchor Node**
สร้าง atom node ที่เป็น invisible anchor

**ปัญหา:**
- Internal link ต้อง map `href="#bookmark-id"` → ProseMirror position → scroll to that position
- ถ้าใช้ Mark ต้องระวังว่า bookmark จะไม่สามารถ "ไปที่" ได้โดยตรงถ้า content เปลี่ยน (position mapping ต้องใช้ ProseMirror mapping)

---

### 14. Table Formulas — Medium

**วิธีทำ:**

```javascript
// Extend TableCell node
addAttributes() {
  return {
    ...this.parent(),
    formula: { default: null },
    value: { default: null },
  };
}

// Formula evaluation
const evaluateFormula = (formula, tableNode, cellPos) => {
  // Parse: SUM(A1:A3), A1+B1, etc.
  // ใช้ mathjs หรือ custom parser
};
```

**Library:**
- `mathjs` — safe math expression evaluator (ไม่ใช่ `eval()`)
- หรือ build custom parser ที่ support: `A1`, `A1:B3`, `SUM()`, `AVG()`, `+`, `-`, `*`, `/`

**ปัญหา:**
- Circular reference (A1 references B1, B1 references A1) → ต้อง detect cycle
- Formula recalculation — เมื่อ cell ใดๆ เปลี่ยน ต้อง recalculate dependent cells
- Spreadsheet-like ต้องมี cell addressing system (A1 notation)
- Table merge/split จะทำให้ cell references ผิด → ต้อง remap references

**Tiptap Extension:** Extend TableCell + custom plugin ที่ recalculate formulas

---

## Tier 3: Privacy / Data Features

### 15. Local Encryption (Web Crypto) — Medium

**วิธีทำ:**
```javascript
// AES-GCM 256-bit ผ่าน Web Crypto API
const encrypt = async (plaintext, password) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return { salt, iv, ciphertext };
};
```

**ข้อดี:**
- Web Crypto API เป็น native browser API (ไม่ต้อง install library)
- Hardware-accelerated AES (AES-NI instructions)
- รองรับทุก modern browser (Chrome 37+, Firefox 34+, Safari 10.1+)

**ปัญหา:**
- Key management — user ต้องจำ password (ถ้าลืม = ข้อมูลหาย)
- `crypto.subtle` ทำงานบน secure context (HTTPS หรือ localhost) เท่านั้น
- ไม่สามารถ encrypt ไฟล์ใหญ่มาก (>100MB) ได้สบาย ต้อง chunk

---

### 16. IndexedDB Storage — Easy

**วิธีทำ:**
```javascript
// ใช้ localforage หรือ idb
import localforage from 'localforage';

const saveDocument = async (id, doc) => {
  await localforage.setItem(`doc-${id}`, {
    content: doc,
    updatedAt: Date.now(),
  });
};
```

**เปรียบเทียบ LocalStorage vs IndexedDB:**

| Feature | LocalStorage | IndexedDB |
|---------|-------------|-----------|
| Storage limit | ~5-10 MB | GBs (up to 80% disk in Chrome) |
| API | Sync, ง่าย | Async, complex |
| Data type | String only | Objects, blobs, files |
| Performance | Read fast, write fast | Async, non-blocking |
| Best for | Settings, small state | Large documents, images, blobs |

**ปัญหา:**
- Safari อาจ auto-delete IndexedDB เมื่อ device storage ต่ำ
- API ซับซ้อนกว่า localStorage (แนะนำใช้ `localforage` หรือ `idb` wrapper)

---

### 17. P2P Share (WebRTC) — Hard

**วิธีทำ:**
```javascript
// WebRTC DataChannel
const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
const dc = pc.createDataChannel('document', { ordered: true });

// Send document JSON
const sendDocument = (doc) => {
  const chunks = chunkString(JSON.stringify(doc), 16384); // 16KB chunks
  chunks.forEach(chunk => dc.send(chunk));
};
```

**Architecture:**
```
[Browser A] ← WebRTC DataChannel (P2P) → [Browser B]
     ↕️ WebSocket Signaling Server (เฉพาะ ice exchange)
```

**ปัญหา:**
- **ต้องมี signaling server** — WebRTC ไม่สามารถเชื่อมต่อโดยตรงได้โดยไม่มี signaling (ICE exchange)
- ถ้าเป็น static export (no server) → ต้องหาวิธีอื่นใน signaling:
  - ใช้ public STUN + สร้าง QR code หรือ copy-paste SDP offer/answer ด้วยตนเอง
  - ใช้ TURN server (อาจต้องมี cost)
- NAT traversal บาง network ไม่ผ่าน (corporate firewall)
- สำหรับ static export แบบ pure browser → ใช้ "copy-paste signaling" หรือ QR-based SDP exchange ได้ แต่ UX แย่

---

### 18. QR Code Export — Easy

**วิธีทำ:**
```javascript
import QRCode from 'qrcode';

const generateQR = async (data) => {
  const dataUrl = await QRCode.toDataURL(data, { width: 300 });
  return dataUrl; // ใช้เป็น <img src={dataUrl}> หรือ download
};
```

**Library:**
- `qrcode` (npm) — รองรับ canvas, SVG, data URL, มี TypeScript support
- `qrcodejs` — pure JS, no dependencies, แต่เก่ากว่า

**ปัญหา:**
- QR code มี capacity limit (~2,953 bytes สำหรับ alphanumeric, ระดับ correction L)
- ไม่เหมาะกับเอกสารใหญ่ — ใช้ได้เฉพาะ URL, สั้นๆ, หรือ encrypted key
- ถ้าเอกสารใหญ่ ต้อง generate QR ที่ชี้ไปยัง download URL (ต้องมี server) หรือใช้ QR เป็น signaling data

---

## Tier 4: UX Polish Features

### 19. Command Palette — Easy

**วิธีทำ:**
```javascript
import Fuse from 'fuse.js';
import { useCommands } from './commands-registry';

const commands = [
  { id: 'bold', title: 'Bold', shortcut: 'Ctrl+B', action: () => editor.chain().focus().toggleBold().run() },
  { id: 'insert-table', title: 'Insert Table', action: () => editor.chain().focus().insertTable(...).run() },
  // ...
];

const fuse = new Fuse(commands, { keys: ['title', 'id'], threshold: 0.3 });
const results = fuse.search(query);
```

**UI:**
- ใช้ `cmdk` (Radix-based command palette component) หรือ `kbar`
- `fuse.js` v7 รองรับ token search, logical search, match highlighting

**ปัญหา:**
- ถ้ามี commands เยอะมาก (>1000) อาจช้า — แต่สำหรับ word processor ปกติไม่เกิน 100 commands

---

### 20. Context Menu — Easy

**วิธีทำ:**
```jsx
import * as ContextMenu from '@radix-ui/react-context-menu';

<ContextMenu.Root>
  <ContextMenu.Trigger>
    <EditorContent editor={editor} />
  </ContextMenu.Trigger>
  <ContextMenu.Content>
    <ContextMenu.Item onSelect={handleCut}>Cut</ContextMenu.Item>
    <ContextMenu.Item onSelect={handleCopy}>Copy</ContextMenu.Item>
    <ContextMenu.Item onSelect={handlePaste}>Paste</ContextMenu.Item>
  </ContextMenu.Content>
</ContextMenu.Root>
```

**ปัญหา:**
- ต้อง map right-click position → ProseMirror position (`editor.view.posAtCoords()`)
- ต้องแสดง menu ที่ context-appropriate (เช่น คลิกบน table แสดง table options)
- บาง browser/OS มี native context menu ที่ override ยาก

---

### 21. Inline Comments (Local) — Medium

**วิธีทำ (ไม่ใช้ YJS/server):**

**แนวทาง A: Comment Mark**
```javascript
const commentMark = Mark.create({
  name: 'comment',
  attrs: {
    commentId: { default: null },
  },
  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-comment-id': HTMLAttributes.commentId, class: 'comment-highlight' }), 0];
  },
});
```

**Comment Store (Zustand):**
```javascript
const useCommentStore = create((set) => ({
  threads: {}, // { [commentId]: { text, author, timestamp, resolved } }
  addThread: (id, thread) => set((state) => ({ threads: { ...state.threads, [id]: thread } })),
}));
```

**ปัญหา:**
- Without YJS: comments ไม่ sync ข้าม devices
- ถ้า text ที่มี comment ถูกลบ/แก้ไข → comment ต้อง map position ใหม่ (ใช้ ProseMirror position mapping)
- Comment thread UI (side panel, popup) ต้อง build เอง
- ถ้าใช้ Mark-based approach ต้องระวังว่า mark จะถูก split/merge ตาม text changes

---

### 22. Zen Mode — Easy

**วิธีท้ำ:** Pure CSS + Zustand state toggle
```css
.zen-mode .toolbar { display: none; }
.zen-mode .sidebar { display: none; }
.zen-mode .editor { max-width: 65ch; margin: 0 auto; }
.zen-mode { background: #fafafa; }
```

---

### 23. Typewriter Scrolling — Easy

**วิธีทำ:**
```javascript
// ใช้ Tiptap plugin หรือ transaction listener
editor.on('transaction', ({ editor }) => {
  const { from } = editor.state.selection;
  const dom = editor.view.domAtPos(from);
  dom.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
```

**หรือใช้:**
```javascript
// Scroll ให้ caret อยู่ตรงกลางจอเสมอ
const scrollToCaret = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const targetY = rect.top + window.scrollY - window.innerHeight / 2;
  window.scrollTo({ top: targetY, behavior: 'smooth' });
};
```

---

## สรุป Dependencies ระหว่าง Features

```
Header/Footer (#5)
  └── ขึ้นกับ Page Numbers (#6) ── ขึ้นกับ Pagination Engine

Image Caption (#2)
  └── ขึ้นกับ Image Resize (#1) ── ควร implement ร่วมกัน

Image Text Wrap (#3)
  └── ขึ้นกับ Image Resize (#1) + Caption (#2)

Charts (#4)
  └── ขึ้นกับ Image Node (embed เป็น image)

TOC (#7) / Outline (#11)
  └── ใช้ข้อมูลเดียวกัน (heading nodes)

Table Formulas (#14)
  └── ขึ้นกับ Table extension

P2P Share (#17)
  └── อาจใช้ QR Code (#18) สำหรับ signaling data

Auto-recovery (#9)
  └── ขึ้นกับ IndexedDB (#16) สำหรับ large docs

Inline Comments (#21)
  └── อาศัย ProseMirror position mapping (ไม่ต้องใช้ server)
```

---

## สรุป Risk Assessment

| Risk | Features ที่ได้รับผล | ระดับ | วิธีลด Risk |
|------|----------------------|-------|-------------|
| **Pagination complexity** | Header/Footer, Page Numbers | 🔴 High | ใช้ 3rd-party pagination engine หรือลด scope (ไม่ทำ true pagination) |
| **Absolute positioning in ProseMirror** | Text Boxes | 🔴 High | ออกแบบให้เป็น "anchored" กับ paragraph ไม่ใช่ absolute บนหน้ากระดาษ |
| **WebRTC signaling ใน static export** | P2P Share | 🟡 Medium | ใช้ manual signaling (copy-paste SDP) หรือ QR code exchange |
| **ProseMirror selection + resize** | Image Resize, Caption | 🟡 Medium | ใช้ library สำเร็จรูปที่ handle selection ให้ |
| **Formula security** | Table Formulas | 🟡 Medium | ใช้ mathjs แทน eval(), validate ก่อน execute |
| **Safari IndexedDB deletion** | IndexedDB storage | 🟡 Medium | มี fallback เป็น localStorage + แจ้งเตือน user |
| **Web Crypto secure context** | Local encryption | 🟢 Low | รับรอง HTTPS / localhost หรือแจ้งเตือน user |
| **QR capacity limit** | QR export | 🟢 Low | ใช้สำหรับ short URL/key เท่านั้น |

---

## สรุป Library ที่แนะนำ

| ประเภท | Library | ใช้สำหรับ |
|--------|---------|----------|
| **Tiptap Image** | `tiptap-extension-resizable-image` หรือ `@pentestpad/tiptap-extension-figure` | Image resize + caption |
| **Pagination** | `tiptap-pagination-plus` (open source) หรือ `@tiptap-pro/extension-pages` (paid) | Header/Footer/Page numbers |
| **Charts** | `recharts` (React/SVG) หรือ `chart.js` (canvas) | Charts |
| **Fuzzy Search** | `fuse.js` v7 | Command Palette |
| **QR Code** | `qrcode` (npm) | QR export |
| **Math Eval** | `mathjs` | Table formulas |
| **Storage** | `localforage` | IndexedDB wrapper |
| **Context Menu** | `@radix-ui/react-context-menu` | Context menu |
| **Command Palette** | `cmdk` | Command palette UI |
| **Encryption** | Web Crypto API (native) | Local encryption |
| **P2P** | WebRTC API (native) | P2P share |

---

## สรุป

**ทุก feature (23/23) ทำได้จริงใน browser 100%** ไม่มี feature ใดที่เป็น technical impossibility

**Features ที่ต้องใช้ effort มากที่สุด (Hard):**
1. **Header & Footer + Page Numbers** — ต้องใช้ pagination engine (ซื้อ pro หรือ build เอง)
2. **Text Boxes / Shapes** — ProseMirror ไม่ถนัด absolute positioning
3. **P2P Share** — ต้อง handle WebRTC signaling โดยไม่มี server

**Features ที่แนะนำทำก่อน (Easy + High Impact):**
1. TOC อัตโนมัติ
2. Image resize + caption + text wrap
3. Command Palette
4. IndexedDB storage
5. Auto-recovery
6. Zen mode
7. Context menu
8. Typewriter scrolling
9. QR code export
10. Outline panel

**Features ที่ควรทำทีหลังหรือลด scope:**
- Header/Footer/Page Numbers → ถ้าไม่มี budget ซื้อ pro extension อาจต้อง implement pagination เองซึ่งใช้เวลามาก
- Text Boxes/Shapes → อาจแก้ไข scope ให้เป็น "floating elements" ที่ anchored กับ paragraphs แทน absolute positioning
- Table Formulas → scope ใหญ่ (spreadsheet-like) ถ้าไม่จำเป็นอาจข้ามไปก่อน
- P2P Share → ถ้าไม่มี server สำหรับ signaling UX จะยาก
