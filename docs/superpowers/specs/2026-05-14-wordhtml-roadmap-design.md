# wordhtml Roadmap — Phase 1/2/3 Design Spec

> 2026-05-14

## Context

wordhtml เป็น static Next.js 16 web app สำหรับแปลง Word ↔ HTML ฝั่ง client-side มี WYSIWYG editor บนกระดาษ A4 พร้อมฟีเจอร์พื้นฐานครบถ้วนแล้ว (export, template, variable, pagination, cleaning, ruler, etc.)

## Problem

- มี known bug (Paste + Enter) ที่กระทบประสบการณ์ผู้ใช้โดยตรง
- ไม่มี E2E test และ CI pipeline — regression อาจหลุดเข้า production
- ฟีเจอร์ขั้นสูงยังขาด (math equation, PDF export) ทำให้ตามหลังคู่แข่ง
- `EditorShell.tsx` โตจน maintain ยาก (~490 บรรทัด)

## Design

### Phase 1: Stability + Critical Bug

**1.1 Fix Paste + Enter Bug**
- **Files:** `src/components/editor/VisualEditor.tsx`, `src/lib/conversion/pasteCleanup.ts`
- **Approach:** ตรวจสอบ `transformPastedHTML` และ `cleanPastedHtml` ว่ากำลังสร้าง wrapper node ที่ Tiptap แยก paragraph ไม่ได้หรือไม่ ใช้ TDD — เขียน test จำลอง paste HTML จาก Word/Google Docs ก่อน แล้วค่อยแก้

**1.2 E2E Smoke Tests (Playwright)**
- **Files:** `e2e/smoke.spec.ts` (new)
- **Tests:**
  - เปิดหน้า /app ได้
  - พิมพ์ข้อความลง editor ได้
  - กด Export HTML ได้
  - อัปโหลด .docx แล้วแสดงเนื้อหาได้

**1.3 GitHub Actions CI**
- **Files:** `.github/workflows/ci.yml` (new)
- **Steps:** `npm ci` → `npm run lint` → `npm test` → `npm run build`
- ใช้ `actions/setup-node@v4` + cache

### Phase 2: Advanced Features

**2.1 Math Equation Support (KaTeX)**
- **Files:** `src/lib/tiptap/mathEquation.ts` (new), `src/components/editor/MathEditor.tsx` (new)
- **Approach:** Tiptap Node สำหรับแสดง/แก้ไขสมการ LaTeX ใช้ `katex` สำหรับ render แสดงผล inline และ block แบบ Word
- **Export:** KaTeX สามารถ export เป็น HTML ที่มี CSS ฝังได้

**2.2 PDF Export**
- **Files:** `src/lib/export/exportPdf.ts` (new)
- **Approach:** ใช้ `html2pdf.js` หรือ `paged.js` แปลง `.paper` element เป็น PDF ฝั่ง client
- **UI:** เพิ่ม "PDF" ใน Export dialog

**2.3 Refactor EditorShell**
- **Files:** `src/components/editor/EditorShell.tsx`, `src/components/editor/IndentRuler.tsx` (new), `src/components/editor/TemplatePreview.tsx` (new), `src/components/editor/SourcePane.tsx` (new)
- **Approach:** แยก sub-components ที่ define ภายใน `EditorShell` (`IndentRuler`, `TemplatePreview`, `SourcePane`) ออกเป็นไฟล์ standalone ลดขนาด `EditorShell` เหลือ ~300 บรรทัด

### Phase 3: Polish

**3.1 Onboarding Tour**
- **Files:** `src/components/onboarding/Tour.tsx` (new)
- **Approach:** ใช้ `driver.js` หรือ custom Spotlight + Tooltip แนะนำผู้ใช้ใหม่ 4-5 ขั้นตอน: เปิดไฟล์, พิมพ์, ตั้งค่าหน้ากระดาษ, export
- **Persistence:** บันทึก state `hasSeenTour` ลง localStorage

**3.2 Virtual Scrolling for Long Documents**
- **Files:** `src/hooks/useVirtualScroll.ts` (new), `src/components/editor/VisualEditor.tsx`
- **Approach:** สำหรับเอกสาร >10 หน้า ใช้ `content-visibility: auto` + IntersectionObserver เพื่อไม่ render หน้าที่อยู่นอก viewport

**3.3 Dark Mode for Editor Canvas**
- **Files:** `src/app/globals.css`, `src/components/editor/EditorShell.tsx`
- **Approach:** ขณะนี้มี `html[data-theme="dark"]` อยู่แล้ว แต่ `.paper` ใช้ `background: var(--color-background)` ซึ่งเป็น white ต้องปรับให้ `.paper` รองรับ dark mode โดยไม่ทำลายการ print

## Success Criteria

- Phase 1: Paste + Enter bug หาย, CI pass เขียวทุก PR, E2E 4 tests pass
- Phase 2: พิมพ์สมการ `E=mc^2` ได้, export PDF ได้, EditorShell < 350 บรรทัด
- Phase 3: ผู้ใช้ใหม่เห็น tour ครั้งแรก, scroll เอกสาร 50 หน้า smooth, dark mode สวยงาม

## Verification

- Run `npm test` (unit + E2E)
- Run `npm run build` (static export สำเร็จ)
- Manual smoke test: paste จาก Word → กด Enter → ต้องขึ้นบรรทัดใหม่สะอาด
