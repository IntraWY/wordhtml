# Procurement Document Builder — Design Spec

**Date:** 2026-05-01  
**Status:** Approved  
**Project:** wordhtml (`/procurement` page)

---

## Problem

ผู้ใช้ที่ กฟส. ต้องสร้างเอกสารราชการซ้ำๆ โดยเปิดไฟล์เก่าแล้วแก้ทับ เสี่ยงข้อมูลเก่าค้าง เสียเวลา

## Solution

เพิ่มหน้า `/procurement` ใน wordhtml — form-based document generator สำหรับ 2 ประเภทเอกสาร:

1. **รายงานขอจัดซื้อ/จัดจ้าง** (.docx) — 3 stages ที่ data ไหลต่อกัน
2. **ใบตัดงบ/แบบฟอร์มรับรองยอดงบประมาณ** (.xlsx) — 4-category budget table

## Architecture

- **Route:** `src/app/procurement/page.tsx`
- **State:** Local React state (transient) + localStorage for presets & form history
- **Module 1 export:** HTML builder → existing `downloadDocx()` (html-docx-js)
- **Module 2 export:** SheetJS (dynamic import) → `triggerDownload()`

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 3-stage flow with auto-fill | ข้อมูลจาก Stage 1 ไหลต่อ Stage 2–3 ไม่ต้องกรอกซ้ำ |
| Personnel presets | บันทึกชื่อ/ตำแหน่งบุคคลที่ใช้บ่อย ไม่พิมพ์ซ้ำ |
| Form history (10 sessions) | โหลด session เก่ามาแก้ได้เลย — แก้ pain point หลัก |
| Dynamic import xlsx | ป้องกัน 700KB bundle bloat ให้โหลดเฉพาะตอนกด export |
| Smoke test html-docx-js first | ตรวจ fidelity ก่อน implement ครบ — ถ้าพัง switch to `docx` pkg |
| GAS handoff seam | Types/HTML generators ออกแบบให้ GAS รับช่วงต่อได้โดยไม่ rewrite |

## Module 1 — Stage Flow

```
Stage 1: กรอก header + items + personnel → export .docx (รายงานขอจัดซื้อ)
Stage 2: + vendor info (auto-fill items จาก S1) → export .docx (รายงานผลการพิจารณา)
Stage 3: + receipt date (auto-fill all จาก S1+S2) → export .docx (ตรวจรับพัสดุ)
```

## Module 2 — Budget Form

- 4 expense categories (แสดงเฉพาะที่กรอก): ค่าแรงจ้างเหมา / ค่าควบคุมงาน / ค่าขนส่ง / ค่าเบ็ดเตล็ด
- คงเหลือ = งบประมาณ - เบิกแล้ว (auto-calc)
- Export: .xlsx via SheetJS

## Files

16 new files + 3 modified. See implementation plan at:  
`C:\Users\510273\.claude\plans\templete-harmonic-chipmunk.md`
