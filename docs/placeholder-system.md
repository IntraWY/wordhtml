# ระบบ Placeholder แบบรวมศูนย์ (wordhtml)

เอกสารอ้างอิงการ implement และ debug รอบ 2026-05-26 — ครอบคลุม empty state, merge fields, header/footer tokens, content controls และ export health.

---

## ภาพรวม

wordhtml มี **สองระบบ token** ที่ทำงานร่วมกันผ่าน `src/lib/placeholders/`:

| ประเภท | Syntax | ใช้เมื่อ | ตัวอย่าง |
|--------|--------|----------|----------|
| **Merge field** | `{{ชื่อ}}` | Template / mail-merge | `{{customer_name}}` |
| **Page token** | `{page}`, `{total}`, `{date}` | ส่วนหัว/ท้ายกระดาษ | `หน้า {page} จาก {total}` |

โหมด resolve:

| โหมด | พฤติกรรม |
|------|-----------|
| `edit` | แสดง token ดิบใน editor |
| `preview` | แทนค่าจาก dataRow; ค่าขาด → `.placeholder-missing` |
| `export` / `print` | แทนค่าทั้งหมด; missing ตาม `exportMissingPolicy` |

---

## โครงสร้างโมดูล

```
src/lib/placeholders/
├── types.ts           # PlaceholderContext, EmptyStateConfig, ExportMissingPolicy
├── constants.ts       # MERGE_FIELD_REGEX, PAGE_TOKEN_REGEX
├── mergeFields.ts     # extractMergeFieldNames, replaceMergeFields
├── pageTokens.ts      # replacePageTokens, listPageTokensIn
├── fieldStatus.ts     # getMergeFieldStatuses, countMissingFields
├── emptyState.ts      # getEmptyStateConfig, isDocumentEmpty
├── resolve.ts         # resolveHtmlPlaceholders (export/preview pipeline)
├── jumpToMergeField.ts# scroll ไป {{name}} ผ่าน search extension
├── registry.ts        # PLACEHOLDER_KINDS (เอกสาร ID)
└── index.ts           # re-export สาธารณะ

src/lib/tiptap/placeholderField.ts   # Content control node (ช่องกรอก)
src/lib/export/
├── inlinePlaceholderFields.ts       # แปลง span ช่องกรอก → ข้อความตอน export
└── exportHealthCheck.ts             # ตรวจก่อนส่งออก
```

### การ rename (หลีกเลี่ยงชื่อชน)

| เดิม | ใหม่ | ไฟล์ |
|------|------|------|
| `replaceVariables` (template) | `replaceMergeFields` | `mergeFields.ts` |
| `replaceVariables` (header/footer) | `replacePageTokens` | `pageTokens.ts` |

Legacy: `templateEngine.replaceVariables` และ `PageHeaderFooter.replaceVariables` ยัง export alias เพื่อ backward compatibility

---

## UI และการเชื่อมต่อ

### Empty state (Layer 1)

- **Config:** `getEmptyStateConfig()` ตาม `templateMode`, `previewMode`, `dataSet`, `lastLoadWarnings`
- **Tiptap:** ข้อความ placeholder ผ่าน `editorEmptyPlaceholderText` (`src/lib/editorEmptyPlaceholder.ts`)
- **EmptyHint:** ปุ่ม contextual (`เปิดไฟล์`, `Preview`, `แผงตัวแปร`) — `pointer-events-auto` เฉพาะปุ่ม

### Variable Panel (แผงตัวแปร — v0.2.8)

- ช่องค้นหา + ชิปกรอง **ทั้งหมด / ในเอกสาร / ยังไม่กรอก** — pure logic ใน
  `src/lib/placeholders/panelFilter.ts`
- ปุ่ม "ล้างตัวแปรที่ไม่ได้ใช้" (Eraser + จำนวน) เมื่อมีตัวแปรที่ไม่อยู่ในเอกสารแล้ว
- ปุ่ม "ช่องว่างถัดไป" → `jumpToMergeField` ไปยังตัวแปรแรกที่ยังไม่กรอก
- Badge "ไม่ได้ใช้" บนแถวตัวแปรที่หายจากเอกสาร

### Click-to-fill (v0.2.8)

- คลิก `{{ตัวแปร}}` ในเอกสาร (ทั้ง badge และ**ข้อความธรรมดา** — เทมเพลตจาก gallery
  โหลดเป็นข้อความ) → `VisualEditor.handleClick` dispatch `wordhtml:fill-variable`
  → `VariableFillPopover.tsx` กรอกค่า inline; Enter = บันทึก, "ถัดไป" = jump ช่องว่างถัดไป

### Repeat row UI (v0.2.8)

- คลิกขวาในตาราง → "แถวซ้ำตามรายการ (Repeat row)" toggle `data-repeat`
  (`toggleRepeatRow`/`isRepeatRow` ใน `src/lib/tiptap/repeatingRow.ts`)
- แถบสี accent ซ้ายของแถว (editor เท่านั้น — print/export ไม่มี)
- ตอน export แถวซ้ำขยายตามตัวแปรชนิดรายการ (List) — `expandRepeatingRows`

### Placeholder Panel

- เปิดจาก: Ribbon **มุมมอง → Placeholder** หรือ StatusBar badge เมื่อมี missing fields
- แท็บ:
  - **ตัวแปร** — สถานะ filled / empty / missing + jump
  - **หัว/ท้าย** — preview token + เปิด Header/Footer dialog
  - **คำเตือน** — รายการตัวแปรที่ missing ในโหมด Preview

### Header/Footer บน canvas (Layer 3)

- **`PageChromeLayer`** — overlay บน `PageCanvas` เมื่อ `pageSetup.headerFooter.enabled`
- ฟัง scroll ที่ `scrollContainerRef` (ไม่ใช่ PageCanvas เอง)
- ส่ง `headerFooterReservePx` → `usePagination` เพื่อลดความสูงเนื้อหา
- Ghost label เมื่อ zone ว่าง: `ส่วนหัว (Header)` / `ส่วนท้าย (Footer)`

### Content controls (Layer 4 — กรอกได้จริงตั้งแต่ v0.2.9)

- Tiptap node `placeholderField` — attrs: `fieldId`, `label`, `fieldType`, `required`, `value`
- Insert: Ribbon **แทรก → ช่องกรอก**
- **กรอกค่า: คลิกที่ช่องกรอกในเอกสาร** → `FieldFillPopover.tsx` เขียนค่าเข้า attr `value`
  ของ node (อยู่ใน HTML → รอด save/reload/template/export อัตโนมัติ)
- Export: `inlinePlaceholderFields` ใช้ลำดับ **attr > session fieldValues > label**
- Store: `fieldValues` (session, fallback), `exportMissingPolicy` (persist ใน localStorage)

### Persistence (v0.2.9)

- `DocumentSnapshot.variables?` / `DocumentTemplate.variables?` — ตัวแปร+ค่าติดไปกับ
  บันทึก/Template (รวม cloud sync); restore ผ่าน `mergeRestoredVariables`
  (ค่าใหม่เติมช่องว่าง ไม่ทับค่าที่ผู้ใช้พิมพ์ไว้)
- `dataSet` persist ข้าม reload เมื่อ ≤200KB (`shouldPersistDataSet`)
- Helpers: `src/lib/placeholders/variableStorage.ts`

---

## Export pipeline

ลำดับใน `ExportDialog` เมื่อเตรียม `cleanedHtml`:

1. `applyCleaners(documentHtml, enabledCleaners)`
2. `inlinePlaceholderFields(html, fieldValues)` — ช่องกรอก → ข้อความ
3. ถ้า `templateMode`: `resolveHtmlPlaceholders(..., { mode: "export", missingPolicy })`

**Export health** (`checkExportHealth`):

- เอกสารว่าง → `error` (บล็อกการดาวน์โหลด)
- ตัวแปร missing ใน preview → `warning`
- รูป inline base64 ใหญ่ → `warning`
- เอกสารยาว + ตาราง → `info` (แจ้งข้อจำกัด pagination ระดับแถว)

**Missing policy** (ใน Export dialog เมื่อ template mode):

- `bracket` — แสดง `[ชื่อ]`
- `blank` — เว้นว่าง

**Merge-field filters** (`constants.ts` → `MERGE_FIELD_FILTERS`):

| Filter | ผลลัพธ์ | ตัวอย่าง |
|--------|---------|----------|
| `\|baht` | จำนวนเงินเป็นตัวอักษรไทย | `1250.50` → หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์ |
| `\|thai` | เลขอารบิก → เลขไทย | `2569` → ๒๕๖๙ |
| `\|date` | วันที่ไทย พ.ศ. | `2026-06-07` → ๗ มิถุนายน ๒๕๖๙ |
| `\|comma` | คั่นหลักพัน | `1234567.5` → 1,234,567.5 |

Filter ที่พิมพ์ผิด (เช่น `\|commaa`) จะไม่ถูกแทนค่า — `checkExportHealth` แจ้ง `warning`
code `unknown-merge-filter` ก่อนส่งออก

---

## CSS

| Class | ความหมาย |
|-------|----------|
| `.placeholder-missing` | ค่า merge field ขาดใน preview |
| `.placeholder-field` | ช่องกรอก (content control) |
| `.page-chrome-header` / `.page-chrome-footer` | overlay หัว/ท้าย |
| `.page-chrome-placeholder` | ghost text ใน zone ว่าง |

---

## การทดสอบด้วยมือ

1. เปิด `/app` → พิมพ์ `{{test}}` → เปิด Placeholder panel → กด jump → ต้อง highlight ใน editor
2. Page Setup → เปิดหัว/ท้าย → ใส่ `หน้า {page}` → scroll หลายหน้า → overlay ติดกับแต่ละหน้า
3. Template mode + data set → Preview → StatusBar แสดงจำนวน missing (ถ้ามี)
4. Export → เอกสารว่างต้อง toast error; template มีตัวเลือก missing policy

### คำสั่งอัตโนมัติ

```bash
npm test    # รวม placeholders.test.ts, exportHealthCheck.test.ts
npm run lint
npm run build
```

---

## บั๊กที่พบและแก้ (debug 2026-05-26)

| ปัญหา | สาเหตุ | การแก้ |
|--------|--------|--------|
| Jump ตัวแปรไม่ทำงาน | เรียก `nextSearchResult` (ไม่มีใน extension) | `jumpToMergeField()` ใช้ `nextMatch` |
| หัว/ท้ายเลื่อนผิดตอน scroll | ฟัง scroll บน PageCanvas | ฟัง `scrollContainerRef` |
| Preview หัว/ท้ายในแผง | ไม่เรียก `replacePageTokens` | แทนค่า + `sanitizeHtml` |
| ดึงชื่อตัวแปรไม่ครบ | เฉพาะ regex `{{}}` | อ่าน `[data-variable]` จาก badge |
| Placeholder hint ไม่อัปเดต | Tiptap ไม่ redecorate | `dispatch(tr)` หลังเปลี่ยน empty text |
| Export เอกสารว่าง | ไม่มี guard | `checkExportHealth` severity `error` |

---

## Roadmap ที่ยังไม่ทำ (นอก scope รอบนี้)

- แก้ header/footer ใน ProseMirror โดยตรง (zone แก้ได้บนกระดาษ — แนวทาง B ในแผน)
- แยกตาราง/รูปข้ามหน้าระดับแถว (pagination Phase 3 เต็มรูปแบบ)
- OOXML round-trip สำหรับ Word content controls
- Block slots (`imageSlot` / `tableSlot`)

---

## ไฟล์ที่เกี่ยวข้อง (อ้างอิงเร็ว)

| ไฟล์ | บทบาท |
|------|--------|
| `src/components/editor/VisualEditor.tsx` | Empty state, PlaceholderField extension |
| `src/components/editor/EditorShell.tsx` | PageChromeLayer, PlaceholderPanel |
| `src/components/editor/PlaceholderPanel.tsx` | แผงรวม |
| `src/components/editor/PageChromeLayer.tsx` | Overlay หัว/ท้าย |
| `src/components/editor/ExportDialog.tsx` | Health + export resolve |
| `src/components/editor/StatusBar.tsx` | Badge missing |
| `src/store/editorStore.ts` | `fieldValues`, `exportMissingPolicy` |
| `src/store/uiStore.ts` | `placeholderPanelOpen` |

---

## อ้างอิง

- แผนออกแบบ: `.cursor/plans/unified_placeholder_system_c92ee759.plan.md` (อย่าแก้ใน repo ถ้าเป็น snapshot ของ Cursor)
- สถาปัตยกรรม pagination: `CLAUDE.md` → Pagination Architecture
- Log การ implement agents: `AGENTS.md` → 2026-05-21 / parallel rounds
