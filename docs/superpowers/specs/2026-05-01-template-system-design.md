# Template System — Design Spec

**Date:** 2026-05-01
**Status:** Approved
**Feature:** Save/Load user-created document templates in `/app` editor

---

## Problem

ผู้ใช้ต้องพิมพ์รูปแบบเอกสารซ้ำๆ ทุกครั้ง (font, margin, โครงสร้าง) โดยไม่มีวิธีบันทึกและโหลดกลับมาใช้ได้เร็ว

## Solution

ระบบ template ที่ผู้ใช้สร้างเองได้ — บันทึกเอกสารปัจจุบัน (content + pageSetup) ตั้งชื่อ แล้วโหลดกลับมาได้จาก File Menu

---

## UI/UX

**Access point:** File Menu → "เปิดจาก Template…"

**Template Dialog:**
- รายการ template ที่บันทึกไว้ (name, page size, วันที่บันทึก)
- คลิก row → โหลด template เข้า editor ทันที (ถาม discard หากมีเอกสารอยู่)
- ปุ่ม "✏️ เปลี่ยนชื่อ" และ "🗑 ลบ" ต่อ row — จัดการใน dialog เดียวกัน
- Section ด้านล่าง: input ชื่อ + ปุ่ม "💾 บันทึก" เพื่อ save เอกสารปัจจุบันเป็น template
- Empty state: ข้อความแนะนำเมื่อยังไม่มี template

---

## Confirmed Design Decisions

### 1. Discard behavior when loading a template

ก่อนโหลด template ให้เช็คว่า `documentHtml.trim().length > 0` — ถ้ามีเนื้อหาอยู่ให้แสดง `window.confirm()` ก่อน:

```
"โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?"
```

ถ้าผู้ใช้ยืนยัน → โหลด template; ถ้ายกเลิก → ไม่ทำอะไร

### 2. fileName on load

เมื่อโหลด template สำเร็จให้ตั้ง `editorStore.setFileName(template.name)` เพื่อให้ TopBar แสดงชื่อ template แทน "Untitled"

### 3. fontLabel removed

ไม่มี `fontLabel` ใน data model — การ extract font จาก HTML ด้วย regex ไม่ reliable (font อาจฝังหลายชั้น, มีหลาย font-family, หรือไม่มีเลย) Dialog แสดงเฉพาะ name + date

---

## Data Model

```typescript
interface DocumentTemplate {
  id: string;          // crypto.randomUUID()
  name: string;        // user-defined
  createdAt: string;   // ISO timestamp
  html: string;        // full document HTML
  pageSetup: PageSetup; // { size, orientation, marginMm }
}
```

**Storage:** localStorage key `wordhtml-templates`
**Limit:** ไม่จำกัดจำนวน (template เป็นถาวร ผู้ใช้ลบเอง)

---

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/store/templateStore.ts` | Zustand store แยกต่างหาก, persist ใน `wordhtml-templates` |
| `src/components/editor/TemplatePanel.tsx` | Radix Dialog สำหรับ template management |

### Modified files

| File | Change |
|------|--------|
| `src/components/editor/menu/FileMenu.tsx` | เพิ่ม menu item "เปิดจาก Template…" |
| `src/components/editor/EditorShell.tsx` | listen `wordhtml:open-templates` event + render `<TemplatePanel />` |

### Store shape (`templateStore.ts`)

```typescript
interface TemplateState {
  templates: DocumentTemplate[];
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  saveTemplate: (name: string, html: string, pageSetup: PageSetup) => void;
  renameTemplate: (id: string, name: string) => void;
  deleteTemplate: (id: string) => void;
}
```

### Data flow

```
FileMenu → "เปิดจาก Template…"
    → dispatch CustomEvent("wordhtml:open-templates")
    → EditorShell listens → opens TemplatePanel

TemplatePanel (load):
    → reads useTemplateStore().templates
    → click row:
        if documentHtml.trim().length > 0:
            window.confirm("โหลด template จะแทนที่เอกสารปัจจุบัน — ดำเนินการต่อไหม?")
            if cancelled → return
        editorStore.setHtml(template.html)
        editorStore.setPageSetup(template.pageSetup)
        editorStore.setFileName(template.name)
        close panel

TemplatePanel (save):
    → fill name + click save → templateStore.saveTemplate(
        name,
        editorStore.documentHtml,
        editorStore.pageSetup
      )
```

---

## Patterns reused from existing code

- **Radix Dialog:** same as `HistoryPanel.tsx` and `PageSetupDialog.tsx`
- **Custom event bridge:** same as `wordhtml:open-search`, `wordhtml:open-page-setup`
- **Zustand + persist:** same as `editorStore.ts` (different storage key)
- **Selector pattern:** `useTemplateStore((s) => s.templates)` per field
- **setFileName:** already in `editorStore` — same call as when opening a `.docx` file

---

## Verification

```bash
npm run dev  # http://localhost:3000/app
```

1. File Menu → "เปิดจาก Template…" → dialog เปิด
2. ไม่มี template → empty state แสดง
3. กรอกชื่อ + กด บันทึก → template ปรากฏในรายการ (แสดง name + date)
4. Reload หน้า → template ยังอยู่ใน localStorage
5. คลิก template (editor ว่างเปล่า) → เนื้อหา + pageSetup โหลดเข้า editor, TopBar แสดงชื่อ template
6. คลิก template (editor มีเนื้อหา) → confirm dialog แสดง; ยืนยัน → โหลด; ยกเลิก → ไม่ทำอะไร
7. ปุ่มเปลี่ยนชื่อ → แก้ชื่อได้ inline
8. ปุ่มลบ → template หายไป
9. `npm run build` → TypeScript ไม่มี error
