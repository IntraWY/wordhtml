# Performance & Rendering Audit Report — wordhtml

> รายงานนี้สรุปปัญหา performance / rendering ที่พบจากการ audit source code
> ของ Next.js 16 + Tiptap v3 + Zustand + Tailwind v4 web app (client-side only)

---

## Critical (Crash, Freeze, Memory Leak ชัดเจน)

### 1. EditorShell re-render ทั้ง tree ทุก keystroke — `selectionUpdate` + `transaction` events
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 223-239)
- **ปัญหา**: `useEffect` ที่ attach event listeners `editor.on("selectionUpdate", update)` และ `editor.on("transaction", update)` จะเรียก `setCurrentIndent()` ทุกครั้งที่ cursor เปลี่ยนหรือมี transaction ใน ProseMirror (ทุก keystroke, ทุกการพิมพ์, ทุกการเลื่อน cursor)
- **ผลกระทบ**: `EditorShell` เป็น root component ที่ wrap `MenuBar`, `FormattingToolbar`, `Ruler`, `VisualEditor`, `StatusBar` ทั้งหมด re-render ทุกครั้งที่ user พิมพ์ตัวอักษรเดียว ทำให้เกิด **input lag / typing jank** ที่ชัดเจนเมื่อเอกสารยาวขึ้น
- **แนะนำ**: 
  - ย้าย indent tracking ลงไปอยู่ใน `Ruler` component เอง โดยให้ `Ruler` subscribe Tiptap events โดยตรง หรือ
  - ใช้ `editor.on("selectionUpdate")` แต่ wrap `setCurrentIndent` ด้วย `React.useRef` + `requestAnimationFrame` debounce หรือ
  - ใช้ `shallow` comparison ก่อน setState (เช็คว่าค่า indent เปลี่ยนจริงหรือไม่)

---

### 2. ResizeObserver ถูกสร้างใหม่ทุกครั้งที่ `documentHtml` เปลี่ยน
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 263-275)
- **ปัญหา**: `useEffect` สร้าง `ResizeObserver` โดยมี dependency array เป็น `[documentHtml]` ซึ่งเปลี่ยนทุก keystroke (ผ่าน `setHtml` จาก Tiptap `onUpdate`)
- **ผลกระทบ**: `ro.disconnect()` + `new ResizeObserver(...)` + `ro.observe()` ถูกเรียก **ทุกครั้งที่พิมพ์** ทำให้เกิด **layout thrashing** และ GC pressure สูง
- **แนะนำ**: 
  - เอา `documentHtml` ออกจาก dependency array (ใช้ `[]` หรือ `[articleRef.current]` ผ่าน ref)
  - หรือเก็บ `ResizeObserver` instance ใน `useRef` และ observe ครั้งเดียว

---

### 3. Tiptap `useEditor()` สร้าง editor instance ใหม่ทุก render (หรือเกือบทุก render)
- **ไฟล์**: `src/components/editor/VisualEditor.tsx` (บรรทัด 51-93)
- **ปัญหา**: `extensions` array ถูกสร้างเป็น **new array** ทุกครั้งที่ `VisualEditor` re-render (ซึ่งเกิดทุกครั้งที่ `EditorShell` re-render) และ `useEditor({ extensions: [...], ... })` ไม่ได้ระบุ `deps` array (หรือถ้า Tiptap v3 ใช้ default deps เป็น `[options]` จะสร้าง editor ใหม่ทุกครั้งเพราะ object reference เปลี่ยน)
- **ผลกระทบ**: 
  - ProseMirror instance ถูกสร้าง/ทำลาย **ทุก render** = memory leak ชัดเจน + browser freeze/crash
  - หรือถ้า Tiptap ไม่ recreate ก็ตาม แต่ `onEditorReady` จะส่ง editor ใหม่ขึ้นไป setState ใน `EditorShell` ทำให้ re-render cascade
- **แนะนำ**:
  - ย้าย `extensions` array ออกไปเป็น **module-level constant** หรือห่อด้วย `useMemo(() => [...], [])`
  - ระบุ deps array ที่ชัดเจนใน `useEditor`: `useEditor(options, [])`
  - ตรวจสอบ Tiptap v3 behavior: ถ้า `useEditor` ใช้ `useMemo` โดยไม่มี deps จะ recompute ทุก render

---

## High (Lag, Jank บ่อย)

### 4. EditorShell เก็บ `editor` instance ใน `useState`
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 58)
- **ปัญหา**: `const [editor, setEditor] = useState<Editor | null>(null);` แล้วส่ง `setEditor` ลงไปให้ `VisualEditor` ผ่าน `onEditorReady` ทำให้เมื่อ `VisualEditor` mount สำเร็จ `setEditor` จะ trigger re-render ทั้ง `EditorShell`
- **ผลกระทบ**: ทุกครั้งที่ editor instance ถูกสร้าง (หรือ recreate) ทั้ง UI tree ต้อง re-render
- **แนะนำ**: 
  - ใช้ `useRef` แทน `useState` สำหรับ editor instance ถ้าไม่ต้องการ trigger re-render
  - ถ้าต้องการให้ child components ใช้ editor ให้ใช้ `React Context` หรือ lift editor instance ขึ้นมาแล้วผ่าน ref

---

### 5. StatusBar คำนวณ `countWords` + `plainTextFromHtml` บน main thread ทุก render
- **ไฟล์**: `src/components/editor/StatusBar.tsx` (บรรทัด 18-19)
- **ปัญหา**: 
  ```tsx
  const words = countWords(documentHtml);
  const chars = plainTextFromHtml(documentHtml).length;
  ```
  ถูกเรียก **ทุก render** โดยไม่มี `useMemo` หรือ `requestIdleCallback`
- **ผลกระทบ**: กับเอกสารที่มี base64 images หรือ HTML ขนาดหลาย MB การนับคำและ strip HTML tags จะ blocking main thread หลายร้อย ms
- **แนะนำ**: 
  - ห่อด้วย `useMemo` และใช้ debounce (เช่น 300ms) ผ่าน `useDeferredValue` หรือ `requestIdleCallback`
  - หรือคำนวณใน Web Worker

---

### 6. `pageCount` useMemo ใช้ regex บน `documentHtml` ขนาดใหญ่
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 288-293)
- **ปัญหา**: 
  ```tsx
  const pageCount = useMemo(() => {
    const breaks = (documentHtml.match(/<div[^>]*\sclass=["'][^"']*page-break[^"']*["'][^>]*>/gi) || []).length;
    return breaks + 1;
  }, [documentHtml]);
  ```
  Regex นี้ scan ทั้ง string ทุกครั้งที่ `documentHtml` เปลี่ยน
- **ผลกระทบ**: เอกสารยาวๆ (หลายหน้า A4) regex จะช้า และ `pageCount` เปลี่ยนบ่อยทำให้ `StatusBar` re-render บ่อย
- **แนะนำ**: 
  - ใช้ `editor.state.doc.descendants` นับ node ที่ type เป็น `pageBreak` แทนการ regex บน HTML string
  - หรือ debounce การคำนวณ pageCount

---

### 7. ExportDialog เรียก `applyCleaners()` blocking main thread ทันทีเมื่อเปิด
- **ไฟล์**: `src/components/editor/ExportDialog.tsx` (บรรทัด 56-59)
- **ปัญหา**: 
  ```tsx
  const cleanedHtml = useMemo(() => {
    if (!open) return "";
    return applyCleaners(documentHtml, enabledCleaners);
  }, [open, documentHtml, enabledCleaners]);
  ```
  `applyCleaners` ใช้ DOMParser parse/serialize ซ้อนกันหลายรอบ (ตามจำนวน cleaners ที่ enable) บน **main thread** ทันทีเมื่อ dialog เปิด
- **ผลกระทบ**: กับเอกสารหลายหน้า / มีรูปภาพ base64 ขนาดใหญ่ dialog จะ **freeze** หลายวินาทีก่อน render
- **แนะนำ**: 
  - ใช้ `useTransition` (React 18+) หรือ `requestIdleCallback` / `setTimeout` เพื่อ schedule cleaning แบบ non-blocking
  - แสดง spinner ขณะทำความสะอาด
  - หรือย้าย cleaning pipeline ไปทำงานใน Web Worker

---

### 8. MultiPagePreview + ProcessedContent สร้าง DOM trees หลายอันซ้อนกันไม่มี virtualization
- **ไฟล์**: `src/components/editor/MultiPagePreview.tsx` และ `ProcessedContent.tsx`
- **ปัญหา**: `MultiPagePreview` ใช้ `html.split(PAGE_BREAK_REGEX)` แล้ว render `ProcessedContent` แยกเป็น pages โดยใช้ `dangerouslySetInnerHTML={{ __html: html }}` ทุก page สร้าง DOM tree ใหม่
- **ผลกระทบ**: 
  - เอกสาร 10 หน้า = browser ต้อง parse HTML + สร้าง DOM node จำนวนมหาศาล (potentially หมื่น nodes)
  - ไม่มี virtualization (render เฉพาะ viewport) ทำให้ scroll ช้า / memory สูง
  - React reconciliation ไม่สามารถ diff ภายใน `dangerouslySetInnerHTML` ได้ ทำให้ทุกครั้งที่ `html` เปลี่ยน ต้อง destroy + recreate DOM ทั้งหมด
- **แนะนำ**: 
  - ใช้ `contenteditable="false"` + single Tiptap editor instance สำหรับ preview แทนการ split HTML
  - หรือใช้ `iframe` / `object` สำหรับแต่ละ page เพื่อ isolate DOM
  - หรือ render เฉพาะ pages ที่อยู่ใน viewport (virtualization)

---

### 9. SourcePane textarea controlled component กับ `documentHtml` ขนาดใหญ่
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 33-55)
- **ปัญหา**: `textarea` เป็น controlled component โดย `value={documentHtml}` และ `onChange={(e) => setHtml(e.target.value)}` ทำให้ทุกครั้งที่ `documentHtml` เปลี่ยน (ทุก keystroke ใน Tiptap editor) `SourcePane` จะ re-render + React ต้อง diff controlled textarea กับ string ขนาดใหญ่
- **ผลกระทบ**: กับเอกสารหลายหน้า textarea จะกระพริบ / ช้า และกิน memory
- **แนะนำ**: 
  - ใช้ `useDeferredValue(documentHtml)` หรือ debounce การ update textarea
  - หรือเปลี่ยนเป็น uncontrolled + sync ด้วย ref เป็นระยะๆ

---

## Medium (Re-render ไม่จำเป็น, สามารถ optimize ได้)

### 10. Ruler ไม่มี `React.memo` + `ticks` array สร้างใหม่ทุก render
- **ไฟล์**: `src/components/editor/Ruler.tsx` (บรรทัด 41-319)
- **ปัญหา**: `Ruler` component ไม่มี `React.memo` และ `ticks` array (บรรทัด 64-71) ถูกสร้างใหม่ทุก render
- **ผลกระทบ**: แม้ค่า `cm`, `marginStart`, `marginEnd` ไม่เปลี่ยน `Ruler` ก็ re-render ทั้งหมดเพราะ parent (`EditorShell`) re-render
- **แนะนำ**: 
  - ห่อ `Ruler` ด้วย `React.memo`
  - ย้าย `ticks` generation ไปเป็น `useMemo(() => generateTicks(...), [cm, orientation, contentHeight])`

---

### 11. FormattingToolbar ไม่มี `React.memo`
- **ไฟล์**: `src/components/editor/FormattingToolbar.tsx`
- **ปัญหา**: Component ไม่มี memoization ทำให้ re-render ทุกครั้งที่ `EditorShell` re-render แม้ editor state ไม่เปลี่ยน
- **ผลกระทบ**: ปุ่ม toolbar ~30 ปุ่ม re-render ทุก keystroke (ถ้า EditorShell re-render)
- **แนะนำ**: `export const FormattingToolbar = React.memo(function FormattingToolbar(...) { ... })`

---

### 12. MenuBar และ menu/* ทั้งหมดไม่มี `React.memo`
- **ไฟล์**: `src/components/editor/MenuBar.tsx` และ `menu/*.tsx`
- **ปัญหา**: ทุก menu component ไม่มี `React.memo` ทำให้ re-render cascade เมื่อ `EditorShell` re-render
- **ผลกระทบ**: Radix UI dropdown menus, icons, event handlers ถูกสร้างใหม่ทั้งหมด
- **แนะนำ**: 
  - ห่อ `MenuBar` และแต่ละ menu ด้วย `React.memo`
  - ใช้ `useCallback` สำหรับ handlers ที่ส่งผ่าน props

---

### 13. `useEffect` keydown listener dependencies ไม่ stable
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 136-221)
- **ปัญหา**: dependency array รวม `[openExportDialog, saveSnapshot, hasDoc, triggerFileOpen, reset, editor]` ซึ่งบางตัวเปลี่ยนบ่อย (เช่น `hasDoc`, `editor`)
- **ผลกระทบ**: add/remove `keydown` listener บ่อย แม้จะไม่มี leak แต่สร้าง overhead และมีโอกาส miss event ระหว่าง swap
- **แนะนำ**: 
  - ใช้ `useRef` เก็บ callbacks ล่าสุด แล้ว listener อ่านจาก ref
  - ทำให้ `useEffect` มี dependency เป็น `[]` (mount/unmount เท่านั้น)

---

### 14. Cleaning pipeline ใช้ DOMParser ซ้อนกันหลายรอบต่อ cleaner
- **ไฟล์**: `src/lib/cleaning/cleaners.ts` และ `pipeline.ts`
- **ปัญหา**: แต่ละ cleaner (`removeInlineStyles`, `removeEmptyTags`, `collapseSpaces`, ...) มี pattern: 
  ```ts
  const doc = parse(html); // new DOMParser().parseFromString(...)
  // ... mutate DOM ...
  return serialize(doc); // doc.body.innerHTML
  ```
  `applyCleaners` เรียก cleaners ต่อกันเป็น chain โดย parse-serialize แต่ละรอบ
- **ผลกระทบ**: เอกสาร 10 หน้า + 8 cleaners = parse DOM 8 รอบ + serialize 8 รอบ บน main thread = blocking
- **แนะนำ**: 
  - รวม cleaners ที่ทำงานบน DOM ให้ parse ครั้งเดียว แล้ว apply หลาย mutation ต่อ DOM tree เดียวกัน
  - ใช้ `requestIdleCallback` หรือ Web Worker สำหรับ cleaning pipeline

---

### 15. SearchPanel push search term เข้า Tiptap extension ทุกการพิมพ์
- **ไฟล์**: `src/components/editor/SearchPanel.tsx` (บรรทัด 37-49)
- **ปัญหา**: 
  ```tsx
  useEffect(() => {
    if (!editor) return;
    const commands = editor.commands as unknown as SearchCommands;
    commands.setSearchTerm?.(searchTerm);
    commands.resetIndex?.();
  }, [editor, searchTerm]);
  ```
  ทุกครั้งที่ user พิมพ์ในช่อง search จะ trigger Tiptap search-and-replace extension ให้ scan ทั้ง document
- **ผลกระทบ**: เอกสารใหญ่ + search term สั้นๆ จะทำให้ search extension ทำงานหนักติดต่อกัน
- **แนะนำ**: debounce `searchTerm` ด้วย `useDeferredValue` หรือ custom debounce hook (เช่น 150ms)

---

### 16. `processedHtml` useMemo ทำงานหนักบน main thread
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 277-285)
- **ปัญหา**: `processTemplate` ใช้ regex + DOMParser + string replace ทุกครั้งที่ `documentHtml` เปลี่ยน
- **ผลกระทบ**: template mode กับเอกสารใหญ่จะ lag
- **แนะนำ**: ใช้ `useDeferredValue(documentHtml)` หรือ schedule ด้วย `setTimeout`

---

### 17. Zustand persist เก็บ history snapshots ขนาดใหญ่ใน localStorage
- **ไฟล์**: `src/store/editorStore.ts` (บรรทัด 292-307)
- **ปัญหา**: `partialize` เก็บ `history` array ที่แต่ละ item มี `html` string ขนาดใหญ่ (potentially หลาย MB ต่อ snapshot) ลง `localStorage` ผ่าน `persist` middleware
- **ผลกระทบ**: 
  - localStorage write หนัก = UI jank (localStorage เป็น synchronous blocking IO)
  - SNAPSHOT_SIZE_LIMIT (4MB) ตรวจสอบแค่ serialized history ไม่รวม state อื่น
  - ถ้ามี history หลาย snapshot อาจทำให้ quota exceeded
- **แนะนำ**: 
  - ย้าย history ไปเก็บใน IndexedDB แทน localStorage
  - หรือใช้ `storage` option ของ persist เป็น custom storage ที่เขียน async

---

### 18. ImageResizeView `updateAttributes` ทุก frame ขณะ drag
- **ไฟล์**: `src/components/editor/ImageResizeView.tsx` (บรรทัด 56)
- **ปัญหา**: ใน `requestAnimationFrame` callback ขณะ drag resize มี `updateAttributes({ width: String(newW), height: String(newH) })` ซึ่ง trigger ProseMirror transaction ทุก frame
- **ผลกระทบ**: resize รูปภาพในเอกสารที่มี node จำนวนมากจะ stutter
- **แนะนำ**: 
  - เก็บค่า dimension ใน local state (`useState`) ระหว่าง drag แล้ว `updateAttributes` เฉพาะตอน `mouseup`
  - หรือ throttle `updateAttributes` ด้วย rAF batching

---

## Low (Best practices เพิ่มเติม)

### 19. `onDrop` / `onDragOver` ใน EditorShell ไม่ใช้ `useCallback`
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 330-377)
- **ปัญหา**: event handlers ถูกสร้างเป็น inline functions ใหม่ทุก render
- **แนะนำ**: ห่อด้วย `useCallback` เพื่อลด re-render ของ child components (ถ้ามี)

---

### 20. TopBar `enabledCleaners` selector re-render ทั้ง component เมื่อ toggle cleaner
- **ไฟล์**: `src/components/editor/TopBar.tsx` (บรรทัด 13)
- **ปัญหา**: `useEditorStore((s) => s.enabledCleaners)` ทำให้ `TopBar` re-render ทุกครั้งที่ toggle cleaner แม้จะใช้แค่ `.length`
- **แนะนำ**: เปลี่ยนเป็น `useEditorStore((s) => s.enabledCleaners.length)` หรือใช้ `shallow` comparison ถ้าต้องการ array

---

### 21. `extractImages` ใช้ `DOMParser` บน main thread กับ HTML ที่มี base64 ขนาดใหญ่
- **ไฟล์**: `src/lib/images.ts` (บรรทัด 30-63)
- **ปัญหา**: `new DOMParser().parseFromString(...)` กับ HTML ที่มี base64 images หลาย MB จะช้า
- **แนะนำ**: ใช้ regex-based extraction สำหรับ base64 images แทน DOMParser (เร็วกว่ามากสำหรับ use-case นี้)

---

### 22. `triggerDownload` ใช้ `setTimeout(..., 1000)` ก่อน revoke blob URL
- **ไฟล์**: `src/lib/export/wrap.ts` (บรรทัด 92-103)
- **ปัญหา**: blob URL ค้างอยู่ 1 วินาทีหลัง click ถ้า download หลายไฟล์ต่อเนื่องอาจสะสม memory
- **แนะนำ**: revoke ทันทีใน `window.requestAnimationFrame` หรือใช้ `URL.revokeObjectURL(url)` หลังจากตรวจสอบว่า download เริ่มแล้ว

---

### 23. `base64 images` ถูกเก็บใน `documentHtml` ทำให้ string ขนาดใหญ่ทุก operation
- **ไฟล์**: ทั้งระบบ (โดยเฉพาะ `docxToHtml.ts`)
- **ปัญหา**: mammoth.js inline images เป็น `data:image/png;base64,...` ใน HTML string ทำให้ `documentHtml` ขนาดหลาย MB ทุก `setHtml` = copy string ขนาดใหญ่ทุกครั้ง
- **แนะนำ**: 
  - แยกเก็บ images เป็น lookup table (Object URL / blob URL) แล้วใช้ placeholder ใน HTML
  - หรือใช้ `URL.createObjectURL` สำหรับ images แทน base64 inline

---

### 24. VariableMark input rule regex ทั่วไปอาจช้ากับเอกสารใหญ่
- **ไฟล์**: `src/lib/tiptap/variableMark.ts` (บรรทัด 44-53)
- **ปัญหา**: `markInputRule` ใช้ regex `/\{\{([A-Za-z_฀-๿][\w฀-๿_]*)\}\}/g` ซึ่ง Tiptap จะ scan ทั้ง document เมื่อมี input
- **ผลกระทบ**: เอกสารที่มี `{{...}}` จำนวนมากอาจทำให้ input lag
- **แนะนำ**: ตรวจสอบ performance ด้วยเอกสารที่มี variable หลายร้อยตัว

---

## สรุป Priority Action Items

| Priority | Action | ไฟล์ |
|----------|--------|------|
| **Critical** | แก้ `selectionUpdate` + `transaction` ให้ไม่ setState ทุก keystroke | `EditorShell.tsx:223-239` |
| **Critical** | เอา `documentHtml` ออกจาก ResizeObserver deps | `EditorShell.tsx:263-275` |
| **Critical** | ห่อ `extensions` ด้วย `useMemo` และระบุ deps ใน `useEditor` | `VisualEditor.tsx:51-93` |
| **High** | ย้าย `editor` จาก `useState` เป็น `useRef` | `EditorShell.tsx:58` |
| **High** | Memoize `countWords` + `plainTextFromHtml` ใน StatusBar | `StatusBar.tsx:18-19` |
| **High** | Schedule `applyCleaners` แบบ non-blocking ใน ExportDialog | `ExportDialog.tsx:56-59` |
| **High** | Debounce / defer `documentHtml` สำหรับ SourcePane | `EditorShell.tsx:33-55` |
| **Medium** | ห่อ `Ruler`, `FormattingToolbar`, `MenuBar` ด้วย `React.memo` | หลายไฟล์ |
| **Medium** | Refactor cleaning pipeline ให้ parse DOM ครั้งเดียว | `cleaners.ts` |
| **Medium** | Debounce search term ใน SearchPanel | `SearchPanel.tsx:37-49` |
| **Low** | ย้าย history snapshots ไป IndexedDB | `editorStore.ts` |

---

*รายงานจัดทำโดย AI Frontend Performance Auditor*
