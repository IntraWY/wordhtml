# Component Integration Audit Report — wordhtml Pagination System

## สรุปภาพรวม (Summary)

| หมวดหมู่ | สถานะ | ปัญหา |
|---------|-------|--------|
| Props Passing | ✅ ผ่าน | ไม่มีปัญหา |
| Event Wiring | ⚠️ พบปัญหา | `wordhtml:page-next` / `page-prev` ไม่ถูกฟัง |
| Store Connections | ✅ ผ่าน | ไม่มีปัญหา |
| Dialog Flow | ✅ ผ่าน | ไม่มีปัญหา |
| Tiptap Extensions | 🛑 รุนแรง | `PaginationAware` ไม่ถูก register |

---

## 1. Props Passing Audit

### 1.1 EditorShell → PaginationManager ✅ CORRECT

**ไฟล์:** `EditorShell.tsx` (บรรทัด 399)

```tsx
<PaginationManager totalPages={totalPages} currentPage={currentPage} onPageChange={setCurrentPage} />
```

| Prop | แหล่งที่มา | สถานะ |
|------|-----------|--------|
| `totalPages` | `useAutoPagination` return | ✅ ถูกต้อง |
| `currentPage` | `useAutoPagination` return | ✅ ถูกต้อง |
| `onPageChange` | `setCurrentPage` จาก `useAutoPagination` | ✅ ถูกต้อง |

**คำอธิบาย:** `PaginationManager` รับ props ครบถ้วน ทั้ง 3 ตัวมี type ตรงกับ `PaginationManagerProps` ใน `PaginationManager.tsx` (บรรทัด 3-7)

---

### 1.2 EditorShell → PageBreakIndicator ✅ CORRECT

**ไฟล์:** `EditorShell.tsx` (บรรทัด 376)

```tsx
<PageBreakIndicator pageBreaks={pageBreaks} />
```

| Prop | แหล่งที่มา | สถานะ |
|------|-----------|--------|
| `pageBreaks` | `useAutoPagination` return | ✅ ถูกต้อง |

**คำอธิบาย:** `pageBreaks` เป็น `number[]` (pixel positions) จาก `useAutoPagination` ส่งเข้า `PageBreakIndicator` ที่รับ `pageBreaks: number[]` (บรรทัด 3-4 ใน `PageBreakIndicator.tsx`)

---

### 1.3 MultiPagePreview → ProcessedContent ✅ CORRECT

**ไฟล์:** `MultiPagePreview.tsx` (บรรทัด 42-52)

```tsx
<ProcessedContent
  html={pageHtml}
  pageSetup={pageSetup}
  className="overflow-hidden"
  exactHeight
  pageNumber={pageNumber}
  totalPages={pages.length}
  headerHtml={header}
  footerHtml={footer}
  showHeaderFooter={showHF}
/>
```

| Prop | ค่าที่ส่ง | สถานะ |
|------|----------|--------|
| `pageNumber` | `index + 1` | ✅ ถูกต้อง |
| `headerHtml` | `header` จาก `resolveHeaderFooter()` | ✅ ถูกต้อง |
| `footerHtml` | `footer` จาก `resolveHeaderFooter()` | ✅ ถูกต้อง |
| `totalPages` | `pages.length` | ✅ ถูกต้อง |
| `showHeaderFooter` | `hf?.enabled ?? false` | ✅ ถูกต้อง |

**คำอธิบาย:** `MultiPagePreview` ใช้ `resolveHeaderFooter()` เพื่อ resolve header/footer ตาม `differentFirstPage` และ `differentOddEven` แล้วส่งค่าที่ resolved แล้วลงไปให้ `ProcessedContent` ครบถ้วน

---

### 1.4 ProcessedContent รับ props ใหม่และ render ถูกต้อง ✅ CORRECT

**ไฟล์:** `ProcessedContent.tsx`

Interface (บรรทัด 9-21):
```tsx
interface ProcessedContentProps {
  html: string;
  pageSetup: PageSetup;
  className?: string;
  style?: React.CSSProperties;
  exactHeight?: boolean;
  pageNumber?: number;
  totalPages?: number;
  headerHtml?: string;
  footerHtml?: string;
  showHeaderFooter?: boolean;
}
```

Render logic (บรรทัด 108-129):
```tsx
{showHeaderFooter && headerHtml && (
  <div className="page-header" dangerouslySetInnerHTML={{ __html: replacedHeader }} />
)}
<div className="page-content" style={{ paddingTop: marginTopPx, ... }} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
{showHeaderFooter && footerHtml && (
  <div className="page-footer" dangerouslySetInnerHTML={{ __html: replacedFooter }} />
)}
```

**คำอธิบาย:**
- Props ใหม่ (`pageNumber`, `totalPages`, `headerHtml`, `footerHtml`, `showHeaderFooter`) ถูกประกาศใน interface ครบถ้วน
- ใช้ `useMemo` แปลงตัวแปร `{page}`, `{total}`, `{date}` ใน header/footer (บรรทัด 89-96)
- Render แบบ conditional ด้วย `showHeaderFooter && headerHtml/footerHtml` ถูกต้อง
- Default values: `pageNumber = 1`, `totalPages = 1`, `showHeaderFooter = false` (บรรทัด 70-74) — ป้องกัน backward compatibility กับ caller เก่า

---

## 2. Event Wiring Audit

### 2.1 `wordhtml:open-header-footer` ✅ CORRECT

**Dispatch chain:**
1. `ToolsMenu.tsx` (บรรทัด 87): `onClick={dispatchOpenHeaderFooter}`
2. `events.ts` (บรรทัด 68-71): `dispatchOpenHeaderFooter()` → `new CustomEvent("wordhtml:open-header-footer")`

**Listen chain:**
1. `EditorShell.tsx` (บรรทัด 218): `addEventListener("wordhtml:open-header-footer", onHeaderFooter)`
2. `EditorShell.tsx` (บรรทัด 201): `const onHeaderFooter = () => openHeaderFooter()` → เรียก `uiStore.openHeaderFooter()`

**สถานะ:** ✅ เชื่อมต่อสมบูรณ์

---

### 2.2 `wordhtml:page-next` / `wordhtml:page-prev` 🛑 BROKEN — **ระดับรุนแรง: สูง**

**Dispatch chain (ทำงาน):**
1. `paginationAware.ts` (บรรทัด 33, 41): ส่ง event `wordhtml:page-next` และ `wordhtml:page-prev`
2. Keyboard shortcuts ที่ trigger: `ArrowDown` (ที่ end of doc), `ArrowUp` (ที่ start of doc), `PageDown`, `PageUp`

**Listen chain (ขาดหาย):**
- `EditorShell.tsx` ไม่มี listener สำหรับ `wordhtml:page-next` และ `wordhtml:page-prev`!

ดูใน `EditorShell.tsx` บรรทัด 196-229:
```tsx
addEventListener("wordhtml:open-search", onSearch);
addEventListener("wordhtml:open-page-setup", onPageSetup);
addEventListener("wordhtml:open-shortcuts", onShortcuts);
addEventListener("wordhtml:open-toc", onToc);
addEventListener("wordhtml:open-header-footer", onHeaderFooter);
addEventListener("wordhtml:open-templates", onTemplates);
addEventListener("wordhtml:insert-variable", onInsertVariable);
```

**ไม่มี:**
```tsx
// ❌ ขาดหายไป!
addEventListener("wordhtml:page-next", ...);
addEventListener("wordhtml:page-prev", ...);
```

**ผลกระทบ:**
- ผู้ใช้กด `PageDown`, `PageUp`, `ArrowDown` ที่ท้ายเอกสาร, หรือ `ArrowUp` ที่ต้นเอกสาร → event ถูก dispatch แต่ไม่มีใครฟัง → หน้าไม่เปลี่ยน
- `PaginationManager` มี UI ปุ่ม ‹ › ที่ใช้ `onPageChange` ได้ปกติ แต่ keyboard navigation ไม่ทำงาน

**วิธีแก้:**
เพิ่ม listeners ใน `EditorShell.tsx` useEffect (บรรทัด 196-229):

```tsx
import { usePaginationStore } from "@/store/paginationStore";
// ...
const nextPage = usePaginationStore((s) => s.nextPage);
const prevPage = usePaginationStore((s) => s.prevPage);
// ...
useEffect(() => {
  // ... existing listeners ...
  const onPageNext = () => nextPage();
  const onPagePrev = () => prevPage();
  addEventListener("wordhtml:page-next", onPageNext);
  addEventListener("wordhtml:page-prev", onPagePrev);
  // ...
  return () => {
    // ... existing cleanups ...
    removeEventListener("wordhtml:page-next", onPageNext);
    removeEventListener("wordhtml:page-prev", onPagePrev);
  };
}, [/* deps */ nextPage, prevPage]);
```

---

### 2.3 `useAutoPagination` containerRef ✅ CORRECT

**ไฟล์:** `EditorShell.tsx` (บรรทัด 186-192)

```tsx
const { articleRef, contentHeight } = useEditorResize();
const { totalPages, currentPage, setCurrentPage, pageBreaks } = useAutoPagination(
  articleRef,
  pageSetup,
  undefined,
  [documentHtml, pageSetup]
);
```

**ไฟล์:** `useEditorResize.ts`
```tsx
export function useEditorResize() {
  const articleRef = useRef<HTMLElement>(null);
  // ...
  return { articleRef, contentHeight };
}
```

**ไฟล์:** `EditorShell.tsx` (บรรทัด 377-391)
```tsx
<article
  id="editor-content"
  ref={articleRef}
  className="paper printable-paper bg-white shadow-sm"
  style={{ minHeight: heightPx, width: widthPx, paddingTop: marginTopPx, ... }}
>
  <VisualEditor onEditorReady={onEditorReady} />
</article>
```

**คำอธิบาย:**
- `articleRef` เป็น `RefObject<HTMLElement>` ที่ attach กับ `<article>` element ที่ wrap เนื้อหา editor
- `useAutoPagination` รับ `containerRef: RefObject<HTMLElement | null>` → type ตรงกัน
- Hook อ่าน `container.innerHTML` (บรรทัด 75 ใน `useAutoPagination.ts`) และใช้ `ResizeObserver` + `MutationObserver` observe container → ถูกต้อง
- `containerRef` ชี้ไปที่ element ที่มี content จริง (article > VisualEditor > EditorContent) → ✅ ถูกต้อง

---

## 3. Store Connections Audit

### 3.1 `usePaginationStore` subscriptions ✅ CORRECT

**StatusBar.tsx** (บรรทัด 20):
```tsx
const storeTotalPages = usePaginationStore((s) => s.totalPages);
```
✅ Subscribe ถูกต้อง

**PaginationManager.tsx** — ไม่ subscribe โดยตรง แต่รับ props ผ่าน EditorShell
- นี่เป็น pattern ที่ถูกต้อง (prop drilling จาก hook ที่ subscribe แล้ว)

**EditorShell.tsx** — ไม่ subscribe โดยตรง แต่ใช้ `useAutoPagination` ซึ่ง subscribe ภายใน
- `useAutoPagination.ts` (บรรทัด 43-52): ใช้ `usePaginationStore()` แบบ selector-less หรือ destructured
- ได้ค่า `totalPages`, `currentPage`, `pageBreaks`, `isCalculating`, `setCurrentPage` จาก store

**สถานะ:** ✅ Store subscriptions อยู่ในที่ที่ต้องการ

---

### 3.2 `editorStore` `headerFooter` persist ✅ CORRECT

**ไฟล์:** `editorStore.ts` (บรรทัด 284-294)

```tsx
partialize: (state) => ({
  _v: 1,
  enabledCleaners: state.enabledCleaners,
  imageMode: state.imageMode,
  history: state.history,
  pageSetup: state.pageSetup,      // ← headerFooter อยู่ข้างใน
  templateMode: state.templateMode,
  variables: state.variables,
  dataSet: state.dataSet,
  autoCompressImages: state.autoCompressImages,
}),
```

**คำอธิบาย:**
- `headerFooter` เป็น nested object ภายใน `pageSetup`
- `partialize` รวม `pageSetup` ทั้ง object → `headerFooter` ถูก persist ไปด้วย
- `setPageSetup` action (บรรทัด 143-156) มี logic merge `headerFooter` แบบ shallow:
  ```tsx
  headerFooter: partial.headerFooter
    ? { ...s.pageSetup.headerFooter, ...partial.headerFooter }
    : s.pageSetup.headerFooter,
  ```

**สถานะ:** ✅ `headerFooter` ถูก persist ถูกต้อง

---

### 3.3 `uiStore` `headerFooterOpen` ✅ CORRECT

**ไฟล์:** `uiStore.ts`

State declaration (บรรทัด 15):
```tsx
headerFooterOpen: boolean;
```

Actions (บรรทัด 33-34, 47, 65-66):
```tsx
openHeaderFooter: () => void;
closeHeaderFooter: () => void;
// ...
openHeaderFooter: () => set({ headerFooterOpen: true }),
closeHeaderFooter: () => set({ headerFooterOpen: false }),
```

**สถานะ:** ✅ `headerFooterOpen` มีครบถ้วน (state + open/close actions)

---

## 4. Dialog Flow Audit

### 4.1 HeaderFooterDialog ถูก render ใน DialogManager ✅ CORRECT

**ไฟล์:** `DialogManager.tsx`

Import (บรรทัด 11):
```tsx
import { HeaderFooterDialog } from "./HeaderFooterDialog";
```

Render (บรรทัด 42):
```tsx
<HeaderFooterDialog open={headerFooterOpen} onClose={closeHeaderFooter} />
```

**สถานะ:** ✅ Dialog ถูก mount ใน DialogManager ถูกต้อง

---

### 4.2 Dialog state จาก uiStore ✅ CORRECT

**DialogManager.tsx** (บรรทัด 30-31):
```tsx
const headerFooterOpen = useUiStore((s) => s.headerFooterOpen);
const closeHeaderFooter = useUiStore((s) => s.closeHeaderFooter);
```

**HeaderFooterDialog.tsx** (บรรทัด 12-15):
```tsx
interface HeaderFooterDialogProps {
  open: boolean;
  onClose: () => void;
}
```

- `open` ← `headerFooterOpen` จาก uiStore ✅
- `onClose` ← `closeHeaderFooter` จาก uiStore ✅
- `Dialog.Root` ใช้ `onOpenChange={(o) => (o ? null : onClose())}` — ปิด dialog ได้ ✅
- Save handler (`handleSave`) เรียก `onClose()` หลัง save ✅

**สถานะ:** ✅ Dialog state flow สมบูรณ์

---

## 5. Tiptap Extensions Audit

### 5.1 `PaginationAware` ไม่ถูก register 🛑 BROKEN — **ระดับรุนแรง: สูง**

**ไฟล์:** `VisualEditor.tsx` (บรรทัด 52-95)

```tsx
const extensions = useMemo(() => [
  StarterKit.configure({ ... }),
  HeadingWithId.configure({ levels: [1, 2, 3] }),
  BulletListWithClass,
  Underline,
  Link.configure({ ... }),
  createImageWithAlign(ImageResizeView),
  Placeholder.configure({ ... }),
  TextAlign.configure({ ... }),
  Color,
  Highlight.configure({ multicolor: true }),
  IndentExtension,
  Table.configure({ resizable: true }),
  RepeatingRow,
  TableHeader,
  TableCell,
  VariableMark,
  PageBreak,
  SearchAndReplace.configure({ ... }),
  Subscript,
  Superscript,
  TaskList,
  TaskItem.configure({ nested: true }),
  FontFamily,
  Gapcursor,
  // ❌ PaginationAware ขาดหายไป!
], []);
```

**ไฟล์ที่มีอยู่แต่ไม่ถูกใช้:** `/mnt/agents/wordhtml/src/lib/tiptap/paginationAware.ts`

**ผลกระทบ:**
- Keyboard shortcuts ทั้งหมดใน `PaginationAware` ไม่ทำงาน:
  - `ArrowDown` ที่ end of document → ไม่ trigger page next
  - `ArrowUp` ที่ start of document → ไม่ trigger page prev
  - `PageDown` → ไม่ทำงาน
  - `PageUp` → ไม่ทำงาน
- Commands `goToNextPage()` และ `goToPreviousPage()` ไม่มีใน editor
- Custom events `wordhtml:page-next` / `wordhtml:page-prev` จะไม่ถูก dispatch เลย (เพราะ extension ไม่ถูก register)

> **หมายเหตุสำคัญ:** แม้จะแก้ไข EditorShell ให้ฟัง events (ตาม 2.2) แต่ถ้า extension ไม่ถูก register → events ก็จะไม่ถูก dispatch อยู่ดี

**วิธีแก้:**

```tsx
// VisualEditor.tsx
import { PaginationAware } from "@/lib/tiptap/paginationAware";
// ...
const extensions = useMemo(() => [
  // ... existing extensions ...
  PaginationAware,  // ← เพิ่มบรรทัดนี้
], []);
```

---

## 6. Findings Summary

### 🛑 Critical (ต้องแก้ก่อนใช้งาน)

| # | ปัญหา | ไฟล์ | บรรทัด | ผลกระทบ |
|---|-------|------|--------|----------|
| C1 | `PaginationAware` extension ไม่ถูก register ใน `VisualEditor` | `VisualEditor.tsx` | 52-95 | Keyboard pagination (PageDown/Up, Arrow ที่ boundary) ไม่ทำงาน |
| C2 | `wordhtml:page-next` / `wordhtml:page-prev` ไม่มี listener ใน `EditorShell` | `EditorShell.tsx` | 196-229 | Events ถูก dispatch แต่ไม่มีผล — page navigation ไม่เปลี่ยน |

> **C1 และ C2 เป็น dependency chain:** ต้องแก้ C1 ก่อน C2 ถึงจะ meaningful เพราะถ้าไม่ register extension → events ไม่ถูก dispatch อยู่ดี

### ✅ All Clear (ไม่มีปัญหา)

| หมวดหมู่ | รายการ |
|---------|--------|
| Props | EditorShell→PaginationManager, EditorShell→PageBreakIndicator, MultiPagePreview→ProcessedContent, ProcessedContent props interface |
| Events | `wordhtml:open-header-footer` dispatch + listen สมบูรณ์ |
| Store | `usePaginationStore` subscriptions, `editorStore` persist `headerFooter`, `uiStore` `headerFooterOpen` |
| Dialog | `HeaderFooterDialog` ใน `DialogManager`, dialog state จาก `uiStore` |
| Ref | `useAutoPagination` ใช้ `articleRef` ที่ถูกต้อง (ชี้ไป `<article>` ที่มี content) |

---

## 7. Recommended Fixes (เรียงตาม priority)

### Fix 1: Register PaginationAware extension (Critical)

```tsx
// VisualEditor.tsx
import { PaginationAware } from "@/lib/tiptap/paginationAware";

const extensions = useMemo(() => [
  // ... existing extensions ...
  PaginationAware,
], []);
```

### Fix 2: Add page-next/page-prev event listeners in EditorShell (Critical)

```tsx
// EditorShell.tsx
// เพิ่มใน useEffect บรรทัด ~196:
const onPageNext = () => usePaginationStore.getState().nextPage();
const onPagePrev = () => usePaginationStore.getState().prevPage();
addEventListener("wordhtml:page-next", onPageNext);
addEventListener("wordhtml:page-prev", onPagePrev);

// เพิ่มใน cleanup:
removeEventListener("wordhtml:page-next", onPageNext);
removeEventListener("wordhtml:page-prev", onPagePrev);
```

**หรือใช้ approach ที่ดีกว่า:** ให้ `PaginationManager` หรือ `useAutoPagination` subscribe ตรงๆ กับ paginationStore เพื่อ sync `currentPage` กับ scroll position แทนการใช้ events (เพราะ events เป็น Phase-1 bridge ที่อาจไม่จำเป็นแล้วหากใช้ store โดยตรง)

---

*รายงานจัดทำโดย Component Integration Auditor*
