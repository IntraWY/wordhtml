# wordhtml — แผนงาน Editor + Collaboration (Stream A + D)

> 2026-05-29 · จาก planner session (ลำดับความสำคัญผู้ใช้: **A** คุณภาพ editor/pagination, **D** cloud sync + ทีม)

## เป้าหมาย (Goals) และขอบเขตที่ไม่ทำ (Non-goals)

### เป้าหมาย

1. **Stream A** — ยกระดับ editor ให้ใกล้ Microsoft Word: header/footer แก้ไขได้จริง, ตาราง/รูปแบ่งหน้าอัจฉริยะ, และ **print parity** ระหว่าง canvas กับ `@media print` / PDF export
2. **Stream D** — ทำให้ผู้ใช้ที่ลงชื่อเข้าใช้ (signed in) เข้าใจสถานะ cloud sync, จัดการ conflict อย่างชัดเจน, และเตรียม **team template library** บน Firestore โดยยังคง static export + client-only
3. รักษา **privacy-by-default**: เอกสารที่กำลังแก้ยังอยู่ใน memory; sync เฉพาะ snapshot/template ที่ผู้ใช้เลือกบันทึก

### Non-goals (ห้ามหลุดขอบเขต)

- **ไม่มี real-time co-editing** — ไม่ใช้ CRDT/OT, ไม่มี cursor ร่วม, ไม่มี live presence
- **ไม่มี server-side document processing** — ไม่เพิ่ม Next.js API routes, Server Actions, หรือ backend แปลง docx/HTML; mammoth, cleaners, export ยังรันบน browser เท่านั้น
- **ไม่บังคับบัญชี** — anonymous ยังใช้ local history ได้ตามเดิม

---

## Stream A — Editor & Pagination

| รหัส | หัวข้อ | รายละเอียด |
|------|--------|------------|
| **A1** | Header/Footer Phase 2 | เปิด `page-header` / `page-footer` ให้ `contenteditable`, toolbar/menu แยก, ผูก placeholder (`{page}`, `{total}`, `{{field}}`) กับ `PageChromeLayer` และ export health |
| **A2** | Table/Image pagination | แยกตาราง/รูปข้ามหน้า (ไม่ย้ายทั้งก้อนเมื่อ overflow), รองรับ different first page / odd-even headers (Phase 3 ตาม `CLAUDE.md`) |
| **A3** | Print parity | จูน `@media print`, margin จาก `pageSetup`, ซ่อน chrome บน canvas; ให้ PDF (`html2pdf.js`) สอดคล้องกับสิ่งที่เห็นบนกระดาษ |

**ทางเทคนิคหลัก:** `pageNode.ts`, `pageCommands.ts`, `usePagination` / `PaginationEngine`, `stripPaginationWrappers.ts`, `globals.css` print block

---

## Stream D — Cloud Sync & ทีม

| รหัส | หัวข้อ | รายละเอียด |
|------|--------|------------|
| **D1** | Cloud sync UX | สถานะ signed in/out ใน TopBar, ป้าย “ซิงก์แล้ว / รอซิงก์ / ออฟไลน์”, คำอธิบายใน History/Template panel ว่าอะไรอยู่ local vs `users/{uid}/…` (อ้างอิง `docs/firebase-cloud-sync-design.md`) |
| **D2** | Conflict policy | กำหนดกติกาเมื่อ `savedAt` / `updatedAt` ขัด: last-write-wins พร้อม banner, หรือ “เก็บทั้งสอง” เป็น snapshot ใหม่; ไม่ merge HTML อัตโนมัติแบบ co-edit |
| **D3** | Team template library | คอลเลกชัน `teams/{teamId}/templates` (หรือ shared flag บน template), สิทธิ์ read/write ผ่าน Firestore rules + UI แชร์/ดึง template เข้า editor |

**ทางเทคนิคหลัก:** `authStore`, `historyFirestore`, `templateFirestore`, `useCloudHistorySync`, `firestore.rules` — ไม่เพิ่ม server render

---

## ลำดับที่แนะนำ (Recommended order)

1. **D1 → D2** — ทำให้ผู้ใช้ไว้ใจ cloud ก่อน (UX + นโยบาย conflict) ลดความเสียหายเมื่อเปิด sync กว้างขึ้น
2. **A1 → A2** — หลัง sync นิ่ง ค่อยลงทุน pagination ลึก (header/footer แล้วตามด้วย split ตาราง/รูป)
3. **A3 และ D3 ท้ายสุด** — print parity และ template ทีมพึ่งพา foundation จาก A1/A2 และ D1/D2

---

## MVP เป็นช่วง (ภาษาไทย)

| ช่วง | ชื่อ | ส่งมอบหลัก |
|------|------|-------------|
| **M1** | ไว้ใจ cloud ได้ | D1 + D2: เข้าสู่ระบบ Google, เห็นสถานะ sync, ประวัติ snapshot ขึ้น `users/{uid}/snapshots`, แก้ conflict ตามนโยบายที่ตกลง |
| **M2** | กระดาษเหมือน Word | A1 + A2: แก้ header/footer บน canvas, pagination ตาราง/รูปขั้นพื้นฐาน, regression tests + E2E smoke |
| **M3** | ทีม + พิมพ์สมบูรณ์ | D3 + A3: แชร์ template ในทีม, print/PDF ตรงกับ canvas; เอกสาร FAQ อัปเดต |

---

## ความเสี่ยงระหว่าง Stream A และ D (Risks)

| ความเสี่ยง | ผลกระทบ | แนวทางลด |
|------------|---------|----------|
| **HTML ขนาดใหญ่ sync ช้า/เกินโควตา** | D ล้มเหลวขณะ A เพิ่ม wrapper หน้า | จำกัดขนาด snapshot, strip wrappers ก่อน upload (`stripPaginationWrappers`) |
| **Conflict หลังแก้ pagination** | โครงสร้าง `.page-node` ต่างกันระหว่างเครื่อง | D2 ก่อน rollout A2 กว้าง; version field ใน snapshot metadata |
| **Firestore rules กับ global `templates`** | D3 เปิดรั่วก่อน Auth ครบ | บังคับ `users/{uid}/templates` + ทด `firebase-smoke.mjs` ทุก release |
| **Print ≠ canvas หลัง A2** | ผู้ใช้ไม่เชื่อ export | A3 ชัดเฉพาะท้าย; manual matrix ใน `docs/ruler-test-matrix.md` |
| **Scope creep ไป co-edit** | หนี static/privacy story | ยึด Non-goals ด้านบนใน PR review |

---

## อ้างอิง

- [`docs/firebase-cloud-sync-design.md`](../../firebase-cloud-sync-design.md)
- [`CLAUDE.md`](../../CLAUDE.md) — Pagination Phase 2/3, Placeholder system
- [`docs/placeholder-system.md`](../../placeholder-system.md)
