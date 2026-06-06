# Algorithm Logic Audit Report — wordhtml Pagination System

> **วันที่ตรวจสอบ:** 2025-01-XX
> **ไฟล์ที่ตรวจ:** 10 ไฟล์หลัก
> **รูปแบบ:** Logic errors, potential crashes, incorrect calculations พร้อมระดับความรุนแรง (Critical / High / Medium / Low) และวิธีแก้ไข

---

## 1. Pagination Engine (`src/lib/paginationEngine.ts`)

### 1.1 Widow/Orphan Control Oscillation — `🔴 Critical / Medium`

**ปัญหา:** `groupChildrenIntoPages()` มี widow/orphan post-processing 2 รอบที่ทำงานแยกกัน โดยไม่ recalculate indices:

```typescript
// Orphan control: pop จากหน้า p → unshift ไปหน้า p+1
for (let p = 0; p < pages.length - 1; p++) { ... }

// Widow control: pop จากหน้า p-1 → unshift ไปหน้า p  
for (let p = 1; p < pages.length; p++) { ... }
```

**ผลกระทบ:** ถ้ามี paragraph ที่มี 1 บรรทัด (line count < `minLinesBeforeBreak` และ < `minLinesAfterBreak`) อยู่ตอนท้ายหน้า p:
1. Orphan loop: pop จาก p → unshift ไป p+1
2. Widow loop: หน้า p+1 firstNode (paragraph 1 บรรทัด) < minLinesAfterBreak → pop จาก p → unshift ไป p+1

→ Paragraph นั้นเคลื่อนไปเคลื่อนมาระหว่าง 2 หน้า ผลลัพธ์ไม่ deterministic ขึ้นกับลำดับการประมวลผล

**เพิ่มเติม:** Orphan loop อาจทำให้ `pages.length` เปลี่ยน (เพิ่มหน้าว่าง หรือบางหน้าว่าง) แต่ widow loop ยังใช้ indices เก่า → อาจ pull node จากหน้าผิด หรือ skip หน้าที่ควร process

**วิธีแก้:**
```typescript
// รวมเป็น single pass ที่ process ทั้ง orphan + widow พร้อม recalculate
function applyWidowOrphanControl(pages: Element[][], ...): Element[][] {
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 3;
  
  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;
    
    for (let p = 0; p < pages.length - 1; p++) {
      const page = pages[p];
      if (page.length === 0) continue;
      const lastNode = page[page.length - 1];
      if (isParagraphLike(lastNode) && estimateLineCount(lastNode) < minLinesBeforeBreak) {
        page.pop();
        pages[p + 1].unshift(lastNode);
        changed = true;
      }
    }
    
    for (let p = 1; p < pages.length; p++) {
      const page = pages[p];
      if (page.length === 0) continue;
      const firstNode = page[0];
      if (isParagraphLike(firstNode) && estimateLineCount(firstNode) < minLinesAfterBreak) {
        const prevPage = pages[p - 1];
        if (prevPage.length > 0) {
          const pulled = prevPage.pop();
          if (pulled) page.unshift(pulled);
          changed = true;
        }
      }
    }
    
    // ลบหน้าว่างหลังแต่ละ iteration
    for (let p = pages.length - 1; p >= 0; p--) {
      if (pages[p].length === 0) pages.splice(p, 1);
    }
  }
  
  return pages;
}
```

---

### 1.2 `measureHtml` Hardcoded Font Styles — `🟡 Medium`

**ปัญหา:**
```typescript
measureHost.style.fontFamily = "sans-serif";
measureHost.style.fontSize = "16px";
measureHost.style.lineHeight = "1.5";
```

Measurement host ใช้ font styles แบบ hardcoded แทนที่จะ inherit จาก actual document styles (จาก editor หรือ CSS ของแอพ) → `getBoundingClientRect()` อาจ return ค่าที่ไม่ตรงกับการ render จริง ทำให้ page breaks คำนวณผิด

**วิธีแก้:**
```typescript
// Clone computed styles จาก target container จริง
const computed = window.getComputedStyle(actualContainer);
measureHost.style.fontFamily = computed.fontFamily;
measureHost.style.fontSize = computed.fontSize;
measureHost.style.lineHeight = computed.lineHeight;
measureHost.style.fontWeight = computed.fontWeight;
measureHost.style.letterSpacing = computed.letterSpacing;
// ... หรือใช้ CSS custom properties ถ้ามี
```

---

### 1.3 Empty Children Edge Case — `🟡 Medium`

**ปัญหา:** ถ้า `html` เป็น string ที่มีแต่ whitespace แต่ DOMParser สร้าง empty body (เช่น `<p>   </p>` ที่ browser strip) → `children` อาจเป็น `[]` → `pages` เป็น `[]` → fallback เป็น `[html]` (line 329) → แต่ถ้า `html.trim()` เป็น truthy จะไม่เข้า early return → อาจได้ `[]` หลัง groupChildren แล้ว fallback เป็น `[html]` ซึ่งเป็นพฤติกรรมที่ inconsistent

**วิธีแก้:** เพิ่ม guard หลัง `measureHtml`:
```typescript
if (children.length === 0) {
  document.body.removeChild(host);
  return [""];
}
```

---

### 1.4 `calculatePageBreaks` + `splitHtmlIntoPages` มี Bug ซ่อนเมื่อ `host` ถูก remove ก่อน cleanup — `🟡 Medium`

**ปัญหา:** ถ้ามี exception เกิดขึ้นระหว่าง `groupChildrenIntoPages` (เช่น `getBoundingClientRect` บน node ที่ detached) → code จะ throw โดยไม่ remove `host` จาก body → memory leak + ghost DOM element

**วิธีแก้:** ใช้ try-finally:
```typescript
try {
  const pages = groupChildrenIntoPages(...);
  // ... process
} finally {
  if (host.parentNode) {
    host.parentNode.removeChild(host);
  }
}
```

---

### 1.5 `measureHtml` ไม่มี `try-catch` รอบ DOMParser — `🟢 Low`

**ปัญหา:** DOMParser กับ `text/html` ไม่ค่อย throw แต่ใน edge case บาง browser อาจมีปัญหา

**วิธีแก้:** ไม่จำเป็นสำหรับ `text/html` แต่ควรมี defensive coding

---

## 2. useAutoPagination Hook (`src/hooks/useAutoPagination.ts`)

### 2.1 Chunked Page Commit Logic Bug — `🟡 Medium`

**ปัญหา:**
```typescript
const chunk = breaks.slice(0, Math.min(idx + chunkSize, breaks.length));
// idx=0 → slice(0, 50)   → 50 breaks
// idx=50 → slice(0, 100) → 100 breaks (ไม่ใช่ 50!)
```

Chunking ไม่ slice ตาม range ที่ถูกต้อง → ทุก chunk มีข้อมูลสะสมจากต้น ไม่ใช่ replace แบบ sliding window → state commit ไม่มีประโยชน์ของ "chunking" จริงๆ (เพราะสุดท้ายก็ commit ทั้งหมด)

**วิธีแก้:**
```typescript
const chunk = breaks.slice(idx, Math.min(idx + chunkSize, breaks.length));
// หรือถ้าต้องการ commit สะสม ให้ชื่อตัวแปรสื่อความหมายให้ชัดเจน
```

---

### 2.2 `runRecalculation` useCallback deps ไม่ stable — `🟢 Low`

**ปัญหา:** `pageSetup` และ `options` เป็น objects → identity เปลี่ยนบ่อย → `runRecalculation` recreate บ่อย → ResizeObserver/MutationObserver reconnect บ่อย → debounce หาย อาจ trigger recalculate ทันทีแทนที่จะ debounce

**วิธีแก้:** Memoize `pageSetup` และ `options` ที่ call site หรือใช้ serialized key ใน deps:
```typescript
const pageSetupKey = useMemo(() => JSON.stringify({
  size: pageSetup.size,
  orientation: pageSetup.orientation,
  marginMm: pageSetup.marginMm,
}), [pageSetup]);
```

---

### 2.3 `metrics` memoized แต่ไม่ได้ใช้ — `🟢 Low`

**ปัญหา:** `metrics` ถูก `useMemo` แต่ `runRecalculation` ไม่ได้ใช้ → `calculatePageBreaks` เรียก `calculatePageMetrics` ซ้ำภายใน → การคำนวณ mm→px เกิดขึ้น 2 ครั้ง

**วิธีแก้:** ส่ง `metrics` เข้า `calculatePageBreaks` เป็น optional parameter หรือ remove `metrics` จาก hook

---

## 3. ProcessedContent (`src/components/editor/ProcessedContent.tsx`)

### 3.1 `exactHeight` ไม่หัก Header/Footer — `🟡 Medium`

**ปัญหา:**
```typescript
height: exactHeight ? heightPx : undefined,
```

`article` มี `height = heightPx` (เช่น 1123px) แต่ถ้ามี `showHeaderFooter && headerHtml` และ `footerHtml` → header + footer จะเพิ่มความสูงอีก → total height เกิน `heightPx` → overflow หรือ page break ผิด

**วิธีแก้:**
```typescript
const headerHeight = showHeaderFooter && headerHtml ? estimatedHeaderHeight : 0;
const footerHeight = showHeaderFooter && footerHtml ? estimatedFooterHeight : 0;
const contentHeight = exactHeight ? heightPx - headerHeight - footerHeight : undefined;
// ใช้ contentHeight เป็น max-height ของ content div
```

---

### 3.2 Sanitize Fallback Returns Raw HTML — `🟡 Medium`

**ปัญหา:**
```typescript
try { ... sanitize ... } catch {
  return raw; // BUG: ถ้า DOMParser fails ควร return ""
}
```

ถ้า DOMParser มีปัญหา (เช่น in certain browser extensions / CSP) → raw HTML ที่อาจมี `<script>` จะถูก inject ผ่าน `dangerouslySetInnerHTML`

**วิธีแก้:**
```typescript
try { ... } catch {
  return ""; // หรือ return escapeHtml(raw) แบบ primitive
}
```

---

### 3.3 `dangerousTags` ไม่ครอบคลุม SVG Event Handlers — `🟢 Low`

**ปัญหา:** Sanitizer ลบ `on*` attributes แต่ SVG มี event handlers ใน namespace อื่น (เช่น `onload` ใน `<svg>`) → ครอบคลุมแล้วผ่าน `name.startsWith("on")` → OK แต่ควรเพิ่ม `link` หรือ `style` ที่มี `@import` หรือ `url()` ที่อาจ load external

---

## 4. PageHeaderFooter (`src/components/editor/PageHeaderFooter.tsx`)

### 4.1 Missing Odd-Specific Header/Footer — `🟢 Low`

**ปัญหา:** `resolveHeaderFooter` รองรับ `differentOddEven` แต่ไม่มี `oddHeaderHtml` / `oddFooterHtml` แยก:

```typescript
} else if (differentOddEven && pageNumber % 2 === 0) {
  // Even page
} else {
  // Odd page → ใช้ baseHeader/baseFooter เท่านั้น
}
```

ถ้า user ต้องการหน้าคี่แตกต่างจากหน้าคู่ จะไม่สามารถตั้งค่า odd page แยกได้ (ต้องใช้ base ซึ่งก็คือ default)

**วิธีแก้:** เพิ่ม `oddHeaderHtml` / `oddFooterHtml` เข้า `HeaderFooterConfig`

---

### 4.2 `replaceVariables` ไม่ Escape HTML — `🟢 Low`

**ปัญหา:** ถ้า `pageNumber` หรือ `totalPages` ถูก inject (แม้จะเป็น number) → safe แต่ถ้ามีการ extend ให้รองรับ custom variables ในอนาคต → ควร escape HTML entities

**วิธีแก้:** ใช้ helper escape:
```typescript
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
// หรือใช้ lodash.escape หรือ DOMPurify
```

---

## 5. HeaderFooterDialog (`src/components/editor/HeaderFooterDialog.tsx`)

### 5.1 Code Duplication: `replaceVariables` — `🟢 Low`

**ปัญหา:** `replaceVariables` ถูก define ใหม่ในไฟล์นี้ (line 312-319) แทนที่จะ import จาก `PageHeaderFooter.tsx` → maintenance risk ถ้า format เปลี่ยน (เช่น รองรับตัวแปรใหม่)

**วิธีแก้:** `import { replaceVariables } from "./PageHeaderFooter"`

---

### 5.2 `insertVariable` ใช้ Append แทน Cursor Insert — `🟢 Low`

**ปัญหา:** `insertVariable` ใช้ `(d[field] || "") + variable` → append ต่อท้ายเสมอ ไม่สามารถ insert ตรง cursor position ใน textarea ได้ → UX แย่ถ้า user พิมพ์ไปแล้วอยากแทรกตรงกลาง

**วิธีแก้:** ใช้ `textarea.selectionStart` และ `selectionEnd`:
```typescript
const insertVariable = useCallback((variable: string) => {
  const field = activeTab === "header" ? "headerHtml" : "footerHtml";
  const textarea = textareaRef.current;
  if (!textarea) {
    setDraft((d) => ({ ...d, [field]: (d[field as "headerHtml"] || "") + variable }));
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const current = draft[field as "headerHtml"] || "";
  const newValue = current.slice(0, start) + variable + current.slice(end);
  setDraft((d) => ({ ...d, [field]: newValue }));
  // ต้อง setSelectionRange หลัง render
}, [activeTab, draft]);
```

---

## 6. PaginationAware Extension (`src/lib/tiptap/paginationAware.ts`)

### 6.1 End-of-Document Check ไม่แม่นยำ — `🟢 Low`

**ปัญหา:**
```typescript
if (selection.to >= doc.content.size - 1) {
  // Treat as end of document
}
```

`doc.content.size` ของ ProseMirror ไม่ใช่ character count แต่เป็น "node size" ที่รวม position offsets ของ nested nodes → `selection.to >= doc.content.size - 1` อาจ evaluate เป็น `true` ก่อนถึงจริงๆ (เช่น ถ้ามี hard break หรือ leaf nodes)

**วิธีแก้:**
```typescript
import { TextSelection } from "prosemirror-state";
// ...
ArrowDown: () => {
  const { state } = this.editor;
  const { selection, doc } = state;
  // Check if selection is at the last text position
  const endPos = doc.content.size - 1;
  if (selection.to === endPos && selection.empty) {
    this.editor.commands.goToNextPage();
    return true;
  }
  return false;
}
```

---

### 6.2 `editor` parameter ไม่ได้ใช้ใน commands — `🟢 Low`

**ปัญหา:**
```typescript
goToNextPage: () => ({ editor }): boolean => {
  // editor ไม่ถูกใช้
}
```

TypeScript warning ไม่มี แต่เป็น dead parameter → clean code issue

---

## 7. Editor Store (`src/store/editorStore.ts`)

### 7.1 Snapshot Size Limit ใช้ `JSON.stringify().length` — `🟢 Low`

**ปัญหา:**
```typescript
JSON.stringify(updated).length > SNAPSHOT_SIZE_LIMIT
```

`JSON.stringify().length` นับจำนวน UTF-16 code units ไม่ใช่ byte size จริง:
- ภาษาไทย: `string.length` = 1 ต่อตัวอักษร แต่ UTF-8 ใช้ 3 bytes
- Emoji: `string.length` = 2 (surrogate pair) แต่ UTF-8 ใช้ 4 bytes

→ ถ้า snapshot มีภาษาไทย/emoji เยอะ → จริงๆ แล้วอาจเกิน 4MB ใน localStorage แต่ check ยังผ่าน

**วิธีแก้:**
```typescript
function getByteSize(str: string): number {
  return new Blob([str]).size; // หรือ new TextEncoder().encode(str).length
}
// ...
while (updated.length > 1 && getByteSize(JSON.stringify(updated)) > SNAPSHOT_SIZE_LIMIT) {
  updated = updated.slice(0, -1);
}
```

---

### 7.2 `reset()` ไม่ได้ reset `pageSetup` — `🟢 Low`

**ปัญหา:** `reset()` ไม่ได้คืนค่า `pageSetup` เป็น `DEFAULT_PAGE_SETUP` → user อาจงงว่าทำไม page setup ยังคงเดิมหลัง reset

**วิธีแก้:**
```typescript
reset: () => set({
  documentHtml: "",
  fileName: null,
  loadError: null,
  lastLoadWarnings: [],
  pendingExportFormat: null,
  lastEditAt: 0,
  pageSetup: DEFAULT_PAGE_SETUP, // เพิ่ม
}),
```

---

### 7.3 `setHtml` debounce ใช้ module-scoped timer — `🟢 Low`

**ปัญหา:** `autoSnapshotTimer` เป็น module-scoped singleton → ถ้ามี multiple store instances (เช่น test หรือ SSR ที่ create store ใหม่) → timer อาจไม่ถูก clear ได้ถูกต้อง

**วิธีแก้:** ไม่มีปัญหาจริงเพราะ zustand store เป็น singleton แต่ใน unit test ควร expose cleanup function

---

## 8. MultiPagePreview (`src/components/editor/MultiPagePreview.tsx`)

### 8.1 `key={index}` อาจทำให้ React Reuse Component ผิด — `🟢 Low`

**ปัญหา:**
```typescript
{pages.map((pageHtml, index) => (
  <div key={index} className="relative page-virtual">
```

ถ้า content เปลี่ยนแต่จำนวน page เท่าเดิม → React จะ reuse component ที่มี index เดิม → `ProcessedContent` อาจไม่ re-render ถ้า props ไม่เปลี่ยน (แต่ `pageHtml` เปลี่ยนอยู่แล้ว → OK)

แต่ถ้า pages ลดลง (เช่น จาก 3 หน้าเป็น 2 หน้า) → React จะ remove หน้าสุดท้าย แทนที่จะ remove หน้าที่ content เปลี่ยน → อาจไม่ใช่ปัญหาใหญ่แต่ไม่ optimal

**วิธีแก้:** ใช้ content hash หรือ page number เป็น key:
```typescript
key={`page-${pageNumber}-${pageHtml.length}`} // หรือใช้ hash จริง
```

---

## 9. Constants (`src/lib/page.ts`)

### 9.1 `PX_PER_CM` คำนวณ — `✅ Correct`

```typescript
export const PX_PER_CM = 794 / 21; // ≈ 37.8095
```

96 DPI: 1 inch = 96px, 1 inch = 2.54cm → 21cm = 8.2677 inch → 8.2677 × 96 = 793.7 ≈ **794px** ✅

### 9.2 A4 Dimensions — `✅ Correct`

```typescript
export const A4 = { wMm: 210, hMm: 297 };
```

Height 297mm @ 96 DPI = 29.7cm × 37.8095 = **1122.94px ≈ 1123px** ✅

### 9.3 `mmToPx` Formula — `✅ Correct`

```typescript
export function mmToPx(mm: number): number {
  return (mm / 10) * PX_PER_CM;
}
```

mm → cm → px: `(mm / 10) × 37.8095` → **ถูกต้อง** ✅

---

## 10. Store Logic (`src/store/paginationStore.ts`)

### 10.1 `currentPage` Auto-Clamp — `✅ Correct`

```typescript
setCurrentPage: (n) => {
  const { totalPages } = get();
  set({ currentPage: Math.min(Math.max(1, n), totalPages) });
},
```

Clamp ระหว่าง `[1, totalPages]` → **ถูกต้อง** ✅

### 10.2 `totalPages` Minimum — `✅ Correct`

```typescript
setTotalPages: (n) => set({ totalPages: Math.max(1, n) }),
```

ไม่ต่ำกว่า 1 → **ถูกต้อง** ✅

### 10.3 ไม่มี Persist — `✅ Correct`

ไม่ใช้ `zustand/middleware/persist` → pagination state ไม่ persist หลัง refresh → **ถูกต้องตาม requirement** ✅

---

## 11. Observer Cleanup (`src/hooks/useAutoPagination.ts`)

### 11.1 ResizeObserver Disconnect — `✅ Correct`

```typescript
return () => { ro.disconnect(); };
```

### 11.2 MutationObserver Disconnect — `✅ Correct`

```typescript
return () => { mo.disconnect(); };
```

### 11.3 Debounce Timer Cleanup — `✅ Correct`

```typescript
if (timerRef.current) { clearTimeout(timerRef.current); }
// และใน unmount cleanup ด้วย
```

### 11.4 Idle Callback Cleanup — `✅ Correct`

```typescript
if (idleRef.current) { cancelIdle(idleRef.current); }
```

### 11.5 AbortController Cleanup — `✅ Correct`

```typescript
if (abortControllerRef.current) {
  abortControllerRef.current.abort();
}
```

---

## สรุปรวม

| ระดับ | จำนวน | หมวดหลัก |
|-------|--------|----------|
| 🔴 Critical / Medium | 1 | Widow/Orphan Oscillation |
| 🟡 Medium | 6 | measureHtml font, exactHeight, chunked slice, sanitize fallback, empty children, host cleanup |
| 🟢 Low | 9 | Key index, code dup, odd-specific missing, JSON size, end-of-doc check, reset incomplete, deps stability, insertVariable UX, replaceVariables escape |
| ✅ Correct | 6 | Constants, Store clamp, Observer cleanup, Variable replacement context, Empty HTML handling, No persist |

**ข้อควรแก้ไขเร่งด่วน:**
1. Widow/Orphan oscillation ใน `paginationEngine.ts` — อาจทำให้ page breaks ไม่ deterministic
2. `ProcessedContent.tsx` `exactHeight` ไม่หัก header/footer — อาจทำให้ page overflow
3. `sanitizeHtml` fallback returns raw — security risk ถ้า DOMParser fails
4. Chunked page slice logic ผิดใน `useAutoPagination.ts` — ไม่มีประโยชน์จริงของ chunking
5. `measureHtml` hardcoded font styles — measurement ไม่ตรงกับ render จริง
