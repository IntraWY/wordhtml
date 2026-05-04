# WordHTML Pagination System - แผน Implementation ฉบับสมบูรณ์

> **Version:** 1.0  
> **Date:** 2025  
> **Status:** Draft - Technical Analysis & Implementation Plan  
> **Author:** Frontend Architecture Specialist  

---

## สารบัญ

1. [Problem Analysis - วิเคราะห์ปัญหา Pagination ปัจจุบัน](#1-problem-analysis)
2. [Solution Comparison - เปรียบเทียบ 5 ทางเลือก](#2-solution-comparison)
3. [Recommended Architecture - สถาปัตยกรรมที่แนะนำ](#3-recommended-architecture)
4. [Implementation Plan - แผนการทำงาน 3 Phases](#4-implementation-plan)
5. [Code Architecture - การเปลี่ยนแปลงโค้ด](#5-code-architecture)
6. [Risk & Mitigation - ความเสี่ยงและการแก้ไข](#6-risk--mitigation)
7. [Appendix - เทคนิคเพิ่มเติม](#7-appendix)

---

## 1. Problem Analysis

### 1.1 ปัญหาหลัก: Content "ไหลลงไปเรื่อยๆ" ใน Editor

ปัจจุบัน Editor ของ wordhtml ใช้โครงสร้าง single `<article>` container ที่มี `minHeight` แต่ไม่มี `maxHeight` หรือ forced break:

```tsx
// จาก EditorShell.tsx (บรรทัด 361-375)
<article
  id="editor-content"
  ref={articleRef}
  className="paper printable-paper bg-white shadow-sm"
  style={{
    minHeight: heightPx,      // ← มีแค่ minHeight
    width: widthPx,
    paddingTop: marginTopPx,
    paddingRight: marginRightPx,
    paddingBottom: marginBottomPx,
    paddingLeft: marginLeftPx,
  }}
>
  <VisualEditor onEditorReady={onEditorReady} />
</article>
```

**ผลที่เกิด:**
- เมื่อ content ยาวเกิน `heightPx` (เช่น A4 = 1123px) article จะขยายตัวเองอัตโนมัติ (เพราะไม่มี `maxHeight`)
- Content ไหลต่อเนื่องในหน้าเดียว ไม่มี visual page boundary
- ผู้ใช้ไม่สามารถเห็นว่าข้อความไหนจะอยู่หน้าไหนตอน print

### 1.2 Architectural Limitation: ProseMirror Flat Model vs Pagination

ProseMirror (underlying engine ของ Tiptap) ใช้ **flat document model**:

```
ProseMirror Document Structure (Flat):
doc
├── paragraph
├── heading
├── paragraph
├── paragraph
├── table
├── paragraph
└── ...
```

โครงสร้างนี้ไม่มี concept ของ "page" เป็น first-class citizen ใน document tree เอกสารคือ stream ของ block nodes ต่อเนื่องกัน

**Pagination ที่ต้องการ (Word/Google Docs style):**

```
Desired Structure (Paginated):
doc
├── page (page 1)
│   ├── paragraph
│   ├── heading
│   └── paragraph
├── page (page 2)
│   ├── paragraph
│   ├── table
│   └── paragraph
└── page (page 3)
    └── paragraph
```

**ปัญหาคือ:** ถ้าเรา insert `page` nodes เข้าไปใน document schema:
1. **Cursor/Selection ซับซ้อน** - การกด "ลง" ที่ท้ายหน้า ต้องไปต้นหน้าถัดไป
2. **Undo/Redo ยาก** - การเพิ่ม/ลบ page break เป็น side-effect ของการพิมพ์ ไม่ใช่ user action
3. **Copy-Paste ยุ่งยาก** - paste ข้อความข้าม page boundary
4. **Collaboration ยาก** - ถ้ามี real-time collaboration page count เปลี่ยนตลอดเวลา

นี่คือเหตุผลว่าทำไม **ทุก solution ที่ดี จึงไม่ใช้ page nodes ใน schema** แต่ใช้ **visual decorations + runtime calculation** แทน

### 1.3 ทำไม CSS `print` / `@page` แก้ปัญหาไม่ได้

ปัจจุบัน wordhtml มี `@media print` และ `@page` CSS:

```css
/* globals.css บรรทัด 377-423 */
@media print {
  .printable-paper {
    position: static;
    box-shadow: none !important;
    margin: 0 auto;
    page-break-after: always;
    break-after: page;
  }
  @page {
    size: A4;
    margin: 0;
  }
}
```

**ปัญหา:**
1. `@page` CSS ใช้ได้ **แค่ตอน print** (`window.print()`) หรือ print-to-PDF
2. ใน editor preview mode content ยังไหลลงไปเรื่อยๆ
3. `page-break-after: always` ใช้ได้แค่กับ manual page breaks ที่ user ใส่เอง
4. ไม่มี auto pagination ตาม content height
5. ใน `@media print` เอกสารจะถูก browser engine จัดการเอง ซึ่ง:
   - ไม่แสดง page numbers ใน preview
   - ไม่แสดง header/footer ใน preview
   - ไม่ control widow/orphan
   - ไม่สามารถ interact กับหน้าได้ (เป็น static output)

**สรุป:** `@page` CSS คือ solution สำหรับ **export/print** ไม่ใช่สำหรับ **editing experience**

### 1.4 สรุปสถานะปัจจุบัน

| Component | สถานะ | ปัญหา |
|---|---|---|
| `page.ts` | Constants A4/LETTER + mmToPx | ดี ใช้ต่อได้ |
| `pageBreak.ts` | Manual page break node | ใช้ได้แค่กับ manual breaks |
| `ProcessedContent.tsx` | `<article>` A4 ไม่มี maxHeight | Content ไหลเกินหน้า |
| `MultiPagePreview.tsx` | Split ตาม `div.page-break` | ไม่มี auto pagination |
| `wrap.ts` | `@page` CSS for export | ใช้ได้แค่ตอน print |
| `StatusBar.tsx` | นับ manual breaks | Page count ไม่ตรง |
| `EditorShell.tsx` | Single container | ไม่มี visual page boundary |

---

## 2. Solution Comparison

### 2.1 ตารางเปรียบเทียบ 5 Options

| Criteria | A. Tiptap Pro Pages | B. tiptap-pagination-plus | C. tiptap-pagination-breaks | D. DIY Engine | E. CSS Columns |
|---|---|---|---|---|---|
| **Cost** | $$$ (Pro license) | Free (OSS) | Free (OSS) | Free (dev cost) | Free |
| **Implementation Effort** | Medium | Low | Low | Very High | Low (but limited) |
| **Auto Pagination** | ✅ Yes | ✅ Yes | ✅ Yes | ⚠️ Manual build | ❌ No |
| **Header/Footer** | ✅ Yes (rich) | ✅ Yes (text/HTML) | ❌ No | ต้อง build เอง | ❌ No |
| **Page Numbers** | ✅ `{page}`/`{total}` | ✅ `{page}`/`{total}` | ⚠️ Basic | ต้อง build เอง | ❌ No |
| **Table Pagination** | ✅ TableKit | ✅ TablePlus extensions | ❌ No | ยากมาก | ❌ No |
| **Tiptap v3 Support** | ✅ Yes | ✅ Yes | ⚠️ Unclear | N/A | N/A |
| **Thai/Unicode** | ✅ Yes | ✅ Yes | ✅ Yes | ต้อง test | ✅ Yes |
| **Maintainability** | High (official) | Medium (community) | Low (stale?) | Low (in-house) | High |
| **Performance** | Good | Good | Good | ต้อง optimize เอง | Excellent |
| **Cursor Management** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ⚠️ ซับซ้อน | ✅ Native |
| **Export/Print** | ✅ Works | ✅ Works | ✅ Works | ต้อง build เอง | ✅ Works |

### 2.2 วิเคราะห์แต่ละ Option

#### Option A: Tiptap Pro Pages (Commercial)

**ข้อดี:**
- Official Tiptap product - quality & support ดีที่สุด
- มี `ConvertKit` สำหรับ DOCX import/export ที่เข้ากันได้
- มี `TableKit` สำหรับ table pagination
- Header/footer แบบ rich text (Tiptap editor ใน overlay)
- Zoom support [0.25, 4]
- Odd/even page header/footer

**ข้อเสีย:**
- ต้องเสียเงิน Tiptap Pro subscription ($$$)
- ต้อง replace StarterKit ด้วย ConvertKit (breaking change ใหญ่)
- ยังเป็น alpha stage (API อาจเปลี่ยน)
- ไม่มี automatic content-based pagination (เค้าบอกเองใน docs)
- Lock-in กับ Tiptap ecosystem

**สรุป:** ดีที่สุดถ้ามี budget แต่สำหรับ wordhtml เป็น open-source project ไม่เหมาะ

#### Option B: tiptap-pagination-plus (Recommended)

**ข้อดี:**
- Free & open source
- รองรับ Tiptap v2 และ v3 (latest tag = v3)
- Auto pagination based on DOM measurement
- Header/footer support พร้อม `{page}` variable
- Table pagination ด้วย TablePlus extensions
- Predefined page sizes (A4, A3, A5, Letter, Legal)
- Commands สำหรับ dynamic update (`updatePageSize`, `updateMargins`, etc.)
- Toggle pagination on/off ได้ runtime
- Multi-line rich text HTML ใน header/footer

**ข้อเสีย:**
- Community maintained - ไม่มี official support
- ต้องใช้ `TablePlus`/`TableRowPlus`/`TableCellPlus`/`TableHeaderPlus` แทน Tiptap มาตรฐาน ถ้าต้องการ table pagination
- ต้อง test compatibility กับ custom extensions ของ wordhtml
- DOM measurement-based → อาจมี edge cases กับ custom node views

**สรุป:** **Best choice สำหรับ wordhtml** - free, feature-complete, Tiptap v3 compatible

#### Option C: tiptap-pagination-breaks

**ข้อดี:**
- Free & open source
- Simple configuration
- Auto pagination

**ข้อเสีย:**
- ไม่มี header/footer support
- ไม่มี table pagination
- Package ออกมา 1 ปีแล้ว อาจไม่ค่อย maintained
- มี dependencies 2 ตัว (pagination-plus มี 0 dependencies)
- Feature set น้อยกว่า pagination-plus มาก

**สรุป:** ใช้ได้แค่ basic pagination ไม่มี page numbers/headers/footers

#### Option D: DIY Custom Pagination Engine

**ข้อดี:**
- Full control ทุก aspect
- ไม่ dependent กับ third-party
- Optimize ได้เต็มที่สำหรับ use case ของ wordhtml

**ข้อเสีย:**
- Implementation effort สูงมาก (2-3 เดือน)
- Cursor management = ซับซ้อนมาก
- Undo/redo integration = ยาก
- Performance optimization ต้องทำเองทั้งหมด
- Edge cases (tables, images, nested lists) = ไม่มีที่สิ้นสุด
- Maintainability ต่ำ - ต้อง maintain engine เอง

**สรุป:** ไม่คุ้มค่าเวลา ยกเว้นถ้าไม่มี package ไหนใช้ได้เลย

#### Option E: CSS Columns / Print Simulation

**ข้อดี:**
- Native browser support
- Performance ดีที่สุด
- No JavaScript needed

**ข้อเสีย:**
- `break-before`/`break-after`/`break-inside` ใช้ได้แค่ตอน print
- `@page` ใช้ได้แค่ตอน print
- ไม่สามารถใช้ใน interactive editor ได้
- ไม่มี page numbers
- ไม่มี header/footer

**สรุป:** ใช้ได้แค่ print preview ไม่ใช่ editing

### 2.3 คำแนะนำ: Primary + Fallback

| ลำดับ | Solution | สถานะ |
|---|---|---|
| **Primary** | **Option B: tiptap-pagination-plus** | ใช้เป็น main solution |
| **Fallback** | **Option D: DIY (simplified)** | ถ้า pagination-plus ไม่ compatible |
| **Print Export** | **Existing @page CSS** | ใช้ต่อได้ ไม่ต้องแก้ |

---

## 3. Recommended Architecture

### 3.1 เหตุผลที่เลือก tiptap-pagination-plus

1. **Open source ไม่มีค่าใช้จ่าย** - เหมาะกับ wordhtml ที่เป็น open-source project
2. **ทำงานกับ Tiptap v3 ได้** - wordhtml ใช้ `@tiptap/*` version `^3.22.4`
3. **มี header/footer support** พร้อม `{page}` / `{total}` variables
4. **มี table pagination** - ด้วย TablePlus extensions
5. **Auto pagination** ตาม content height (ไม่ต้อง manual breaks)
6. **Commands สำหรับ dynamic config** - เปลี่ยน page size, margins runtime
7. **Toggle on/off ได้** - ผู้ใช้สามารถ enable/disable pagination ได้

### 3.2 Compatibility Analysis กับ Existing Code

#### ✅ สิ่งที่เข้ากันได้ดี

| ส่วน | ความเข้ากันได้ | หมายเหตุ |
|---|---|---|
| Tiptap v3 | ✅ Excellent | pagination-plus รองรับ v3 (latest tag) |
| `StarterKit` | ✅ Good | pagination-plus ทำงานบน StarterKit |
| `page.ts` constants | ✅ Excellent | ใช้ A4/LETTER constants ที่มีอยู่ได้เลย |
| `PageBreak` node | ✅ Good | pagination-plus มี page break concept ของตัวเอง แต่ manual breaks ยังใช้ได้ |
| `mmToPx()` | ✅ Excellent | ใช้ convert margins จาก mm เป็น px ได้ |
| Zustand store | ✅ Good | `pageSetup` state ใช้ config pagination-plus ได้ |

#### ⚠️ สิ่งที่ต้องตรวจสอบ / อาจต้องแก้

| ส่วน | ระดับความเสี่ยง | รายละเอียด |
|---|---|---|
| Custom `Table` extensions | ⚠️ Medium | pagination-plus มี TablePlus แยก อาจต้อง replace หรือ configure |
| `ImageResizeView` (NodeView) | ⚠️ Low-Medium | DOM measurement อาจมีปัญหากับ custom node views |
| `IndentExtension` | ⚠️ Low | margin-left จาก indent อาจส่งผลต่อ pagination calculation |
| `HeadingWithId` | ✅ Low | น่าจะทำงานได้ |
| `BulletListWithClass` | ✅ Low | น่าจะทำงานได้ |
| `VariableMark` | ⚠️ Low | mark nodes ไม่ควรส่งผลต่อ pagination |
| `SearchAndReplace` | ✅ Low | decorations ไม่ส่งผลต่อ pagination |

#### ❌ สิ่งที่ต้องแทนที่

| ส่วน | การเปลี่ยนแปลง |
|---|---|
| `MultiPagePreview.tsx` | **Remove** - pagination-plus จัดการ visual pages เอง |
| `StatusBar.tsx` pageCount | **Rewrite** - ใช้ pagination-plus data แทน regex match |
| `EditorShell.tsx` article layout | **Modify** - เปลี่ยนจาก single article เป็น pagination-plus container |

### 3.3 สถาปัตยกรรมหลัง Implement

```
Before (Current):
EditorShell
├── <article class="paper">  ← single container, no maxHeight
│   └── VisualEditor (Tiptap)
│       └── ProseMirror (flat content)
└── MultiPagePreview (split by manual breaks only)

After (With pagination-plus):
EditorShell
├── <PaginationContainer>  ← managed by pagination-plus
│   └── VisualEditor (Tiptap)
│       └── ProseMirror (flat content)
│       └── PaginationPlus Plugin
│           ├── DOM Measurement
│           ├── Page Decorations (visual boundaries)
│           └── Header/Footer per page
└── (MultiPagePreview removed - replaced by live pagination)
```

### 3.4 Data Flow ใหม่

```
pageSetup (Zustand Store)
    │
    ├──► mmToPx() conversion
    │
    ├──► PaginationPlus.configure({
    │      pageHeight: heightPx,
    │      pageWidth: widthPx,
    │      marginTop: marginTopPx,
    │      marginBottom: marginBottomPx,
    │      marginLeft: marginLeftPx,
    │      marginRight: marginRightPx,
    │    })
    │
    ├──► VisualEditor (Tiptap)
    │      └── Auto pagination by DOM measurement
    │
    └──► StatusBar (pageCount from pagination-plus)
```

---

## 4. Implementation Plan

### 4.1 Phase 1: Quick Win - Auto Pagination (1-2 สัปดาห์)

#### 4.1.1 เป้าหมาย
- ติดตั้ง `tiptap-pagination-plus`
- ทำให้ editor แสดง visual page boundaries แบบ auto
- Content ที่ยาวเกินหน้า จะถูกแบ่งเป็นหน้าใหม่อัตโนมัติ
- ใช้ A4/LETTER constants ที่มีอยู่

#### 4.1.2 ขั้นตอนการทำงาน

**Step 1: ติดตั้ง dependency**

```bash
npm install tiptap-pagination-plus
```

**Step 2: สร้าง Pagination Config Utility**

```typescript
// src/lib/pagination/config.ts
import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";
import type { PageSetup } from "@/types";
import { A4, LETTER, mmToPx } from "@/lib/page";

export function createPaginationExtension(pageSetup: PageSetup) {
  const base = pageSetup.size === "Letter" ? LETTER : A4;
  const isLandscape = pageSetup.orientation === "landscape";
  const widthMm = isLandscape ? base.hMm : base.wMm;
  const heightMm = isLandscape ? base.wMm : base.hMm;

  const pageHeight = Math.round(mmToPx(heightMm));
  const pageWidth = Math.round(mmToPx(widthMm));
  const marginTop = Math.round(mmToPx(pageSetup.marginMm.top));
  const marginBottom = Math.round(mmToPx(pageSetup.marginMm.bottom));
  const marginLeft = Math.round(mmToPx(pageSetup.marginMm.left));
  const marginRight = Math.round(mmToPx(pageSetup.marginMm.right));

  // คำนวณ content area (ลบ margin ออกจาก page height)
  const contentMarginTop = marginTop;
  const contentMarginBottom = marginBottom;

  return PaginationPlus.configure({
    pageHeight,
    pageWidth,
    pageGap: 20,              // ระยะห่างระหว่างหน้า (px)
    pageGapBorderSize: 1,      // ขนาดเส้นแบ่งหน้า
    pageGapBorderColor: "var(--color-border)",
    pageBreakBackground: "var(--color-background)",
    pageHeaderHeight: 0,       // Phase 1: ยังไม่มี header
    pageFooterHeight: 0,       // Phase 1: ยังไม่มี footer
    marginTop: 0,              // pagination จัดการเอง
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    contentMarginTop,
    contentMarginBottom,
    contentMarginLeft: marginLeft,
    contentMarginRight: marginRight,
  });
}

export { PAGE_SIZES };
```

**Step 3: แก้ไข VisualEditor - เพิ่ม PaginationPlus Extension**

```typescript
// src/components/editor/VisualEditor.tsx
import { useMemo } from "react";
import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";
import { createPaginationExtension } from "@/lib/pagination/config";

// ... existing imports

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const pageSetup = useEditorStore((s) => s.pageSetup);

  const extensions = useMemo(() => {
    const paginationExt = createPaginationExtension(pageSetup);

    return [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        link: false,
        underline: false,
      }),
      // ... existing extensions
      paginationExt,  // ← เพิ่มต่อท้ายสุด (สำคัญ!)
    ];
  }, [pageSetup]);  // ← re-create เมื่อ pageSetup เปลี่ยน

  // ... rest of component
}
```

**⚠️ สำคัญ:** Extension registration order มีความสำคัญมาก:
1. `StarterKit` และ base extensions ต้องลงทะเบียนก่อน
2. `PaginationPlus` ควรลงทะเบียน **หลังสุด** เพื่อให้ plugin ทำงานหลังจาก content render เสร็จ

**Step 4: แก้ไข EditorShell - ลบ article wrapper ที่เป็น single container**

```tsx
// EditorShell.tsx - เปลี่ยนจาก single article เป็น pagination-compatible
// pagination-plus จะสร้าง page containers เอง ดังนั้นเราไม่ต้อง wrap ด้วย <article>

// แทนที่:
// <article className="paper printable-paper ...">
//   <VisualEditor onEditorReady={onEditorReady} />
// </article>

// ด้วย:
<div className="editor-paper-container">
  <VisualEditor onEditorReady={onEditorReady} />
</div>
```

pagination-plus จะจัดการการ render หลายหน้าเอง โดยใช้ DOM measurement + decorations

**Step 5: Update StatusBar pageCount**

```typescript
// src/components/editor/StatusBar.tsx
import { useEditorStore } from "@/store/editorStore";

// pagination-plus จะเก็บ page count ใน editor storage หรือ state
// เราจะสร้าง hook สำหรับอ่านค่า:

function usePageCount(): number {
  const editor = useEditorStore((s) => s.editor); // หรือผ่าน props/context
  // pagination-plus เก็บ page count ไว้ใน editor.storage
  return editor?.storage?.pagination?.pageCount ?? 1;
}
```

**Step 6: Remove MultiPagePreview**

```typescript
// MultiPagePreview.tsx จะถูกแทนที่ด้วย pagination-plus live preview
// เนื่องจาก editor จะแสดง pages แบบ real-time แล้ว
// สามารถลบ file นี้ออกหรือ keep ไว้สำหรับ fallback mode
```

#### 4.1.3 ผลลัพธ์ที่คาดหวังหลัง Phase 1

- Editor แสดง visual page boundaries (เส้นแบ่งหน้า)
- Content ที่ยาวเกิน page height ถูกแบ่งเป็นหน้าใหม่อัตโนมัติ
- Page count ใน StatusBar ตรงกับจำนวนหน้าจริง
- Manual page breaks ยังใช้ได้ (ร่วมกับ auto pagination)

### 4.2 Phase 2: Header/Footer + Page Numbers (2-3 สัปดาห์)

#### 4.2.1 เป้าหมาย
- เพิ่ม header/footer แบบ per-page
- รองรับ `{page}` / `{total}` variables
- First page different header/footer (ตาม Word convention)
- Thai font support ใน header/footer

#### 4.2.2 ขั้นตอนการทำงาน

**Step 1: Update Pagination Config ด้วย Header/Footer**

```typescript
// src/lib/pagination/config.ts (Phase 2 update)

interface PaginationHeaderFooterConfig {
  headerLeft?: string;
  headerCenter?: string;
  headerRight?: string;
  footerLeft?: string;
  footerCenter?: string;
  footerRight?: string;
  firstPageDifferent?: boolean;
  oddEvenDifferent?: boolean;
}

export function createPaginationExtension(
  pageSetup: PageSetup,
  hfConfig?: PaginationHeaderFooterConfig
) {
  // ... existing calculation

  return PaginationPlus.configure({
    // ... existing config
    pageHeaderHeight: 40,      // ความสูง header (px)
    pageFooterHeight: 40,      // ความสูง footer (px)
    headerLeft: hfConfig?.headerLeft ?? "",
    headerRight: hfConfig?.headerRight ?? "",
    footerLeft: hfConfig?.footerLeft ?? "",
    footerRight: hfConfig?.footerRight ?? "{page}",  // default: page number
    footerCenter: hfConfig?.footerCenter ?? "",
    // สำหรับ multiline HTML header/footer:
    headerHTML: hfConfig?.headerLeft
      ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:#666;">
           <span>${hfConfig.headerLeft}</span>
           <span>${hfConfig.headerRight ?? ""}</span>
         </div>`
      : undefined,
  });
}
```

**Step 2: สร้าง Header/Footer Editor UI**

```tsx
// src/components/editor/PageHeaderFooterEditor.tsx
"use client";

import { useState } from "react";
import { useEditorStore } from "@/store/editorStore";

interface HeaderFooterState {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  firstPageDifferent: boolean;
}

export function PageHeaderFooterEditor() {
  const [config, setConfig] = useState<HeaderFooterState>({
    headerLeft: "",
    headerCenter: "",
    headerRight: "",
    footerLeft: "",
    footerCenter: "",
    footerRight: "{page}",  // default page number
    firstPageDifferent: false,
  });

  // ผูกกับ store เพื่อ sync กับ pagination-plus
  // ใช้ commands: updateHeaderContent, updateFooterContent

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">ส่วนหัว (Header)</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="ซ้าย"
            value={config.headerLeft}
            onChange={(e) => setConfig((c) => ({ ...c, headerLeft: e.target.value }))}
            className="..."
          />
          <input
            placeholder="กลาง"
            value={config.headerCenter}
            onChange={(e) => setConfig((c) => ({ ...c, headerCenter: e.target.value }))}
            className="..."
          />
          <input
            placeholder="ขวา"
            value={config.headerRight}
            onChange={(e) => setConfig((c) => ({ ...c, headerRight: e.target.value }))}
            className="..."
          />
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">ส่วนท้าย (Footer)</label>
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="ซ้าย"
            value={config.footerLeft}
            onChange={(e) => setConfig((c) => ({ ...c, footerLeft: e.target.value }))}
            className="..."
          />
          <input
            placeholder="กลาง"
            value={config.footerCenter}
            onChange={(e) => setConfig((c) => ({ ...c, footerCenter: e.target.value }))}
            className="..."
          />
          <input
            placeholder="ขวา"
            value={config.footerRight}
            onChange={(e) => setConfig((c) => ({ ...c, footerRight: e.target.value }))}
            className="..."
          />
        </div>
      </div>

      {/* Variables Help */}
      <div className="text-xs text-muted-foreground">
        ตัวแปรที่ใช้ได้: {"{page}"} = หน้าปัจจุบัน, {"{total}"} = จำนวนหน้าทั้งหมด
      </div>

      {/* First page different */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={config.firstPageDifferent}
          onChange={(e) => setConfig((c) => ({ ...c, firstPageDifferent: e.target.checked }))}
        />
        <span className="text-sm">หน้าแรกต่างจากหน้าอื่น</span>
      </label>
    </div>
  );
}
```

**Step 3: เพิ่ม Header/Footer Config ใน PageSetup Store**

```typescript
// src/types/index.ts - update PageSetup

export interface PageSetup {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
  // เพิ่ม:
  headerFooter?: {
    headerLeft: string;
    headerCenter: string;
    headerRight: string;
    footerLeft: string;
    footerCenter: string;
    footerRight: string;
    firstPageDifferent: boolean;
  };
}
```

**Step 4: Thai Font Support**

```typescript
// ใน pagination-plus config ระบุ font-family สำหรับ header/footer:
headerHTML: `<div style="font-family: 'Sarabun', var(--font-sans), sans-serif; ...">...</div>`,
```

หรือใช้ CSS class:

```css
/* globals.css */
.pagination-header,
.pagination-footer {
  font-family: var(--font-sans), "Sarabun", -apple-system, sans-serif;
  font-size: 11px;
  color: var(--color-muted-foreground);
}
```

#### 4.2.3 ผลลัพธ์ที่คาดหวังหลัง Phase 2

- ทุกหน้าแสดง header/footer
- Page numbers แสดงตามจริง (`{page}` / `{total}`)
- สามารถ configure header/footer ผ่าน UI
- หน้าแรกสามารถมี header/footer ต่างจากหน้าอื่น

### 4.3 Phase 3: Polish & Edge Cases (1-2 สัปดาห์)

#### 4.3.1 เป้าหมาย
- Widow/Orphan control
- Keep heading with next paragraph
- Image/table break-inside: avoid
- Performance optimization
- Virtual scrolling สำหรับเอกสารยาว

#### 4.3.2 Widow/Orphan Control

**ปัญหา:** บางครั้ง paragraph ถูกแบ่งข้ามหน้า ทำให้บรรทัดเดียวติดท้ายหน้า (widow) หรือบรรทัดเดียวอยู่หัวหน้า (orphan)

**วิธีแก้:**

```typescript
// ใช้ CSS ร่วมกับ pagination-plus:
// ใน globals.css เพิ่ม:

.prose-editor p {
  orphans: 2;    /* ไม่ให้มี orphan (บรรทัดเดียวหัวหน้า) */
  widows: 2;     /* ไม่ให้มี widow (บรรทัดเดียวท้ายหน้า) */
}

// หมายเหตุ: orphans/widows ใช้ได้แค่ตอน print
// สำหรับ editor preview ต้องใช้ pagination-plus logic เอง
```

pagination-plus จัดการเรื่องนี้ผ่าน DOM measurement - ถ้า block ที่เหลือสั้นเกินไปจะ push ทั้ง block ไปหน้าถัดไป

#### 4.3.3 Keep Heading With Next Paragraph

```css
/* globals.css */
.prose-editor h1,
.prose-editor h2,
.prose-editor h3 {
  break-after: avoid;      /* ไม่ให้ heading อยู่ท้ายหน้า */
  page-break-after: avoid;
}

.prose-editor h1 + p,
.prose-editor h2 + p,
.prose-editor h3 + p {
  break-before: avoid;     /* ไม่ให้ paragraph หลัง heading อยู่หัวหน้า */
  page-break-before: avoid;
}
```

ใน pagination-plus context:
- ใช้ CSS `break-inside: avoid` กับ heading blocks
- pagination-plus DOM measurement จะพยายามไม่ split heading

#### 4.3.4 Image/Table Break-Inside: Avoid

```css
/* globals.css */
.prose-editor img,
.prose-editor table {
  break-inside: avoid;
  page-break-inside: avoid;
}

/* สำหรับ table ที่ใหญ่เกิน 1 หน้า - ใช้ TablePlus extensions */
```

#### 4.3.5 Table Pagination

ถ้าต้องการ table pagination (table ใหญ่ split ข้ามหน้า พร้อม header row ซ้ำ):

```bash
npm install tiptap-pagination-plus  # มี TablePlus มาในชุดเดียวกัน
```

```typescript
// VisualEditor.tsx - แทน Table extensions:
import {
  TablePlus,
  TableRowPlus,
  TableCellPlus,
  TableHeaderPlus,
} from "tiptap-pagination-plus";

// แทน:
// Table.configure({ resizable: true }),
// RepeatingRow,
// TableHeader,
// TableCell,

// ด้วย:
TablePlus.configure({ resizable: true }),
TableRowPlus,
TableHeaderPlus,
TableCellPlus,
```

**⚠️ Risk:** การแทน Table extensions อาจส่งผลต่อ:
- Existing table data (backward compatibility)
- RepeatingRow extension (ใช้กับ template mode)
- Table resize handles

**แนะนำ:** ทดสอบ compatibility อย่างละเอียดก่อน replace

#### 4.3.6 Performance Optimization

**ปัญหา:** เอกสารยาว (50+ หน้า) อาจทำให้ browser slow

**วิธีแก้:**

1. **Lazy pagination calculation:**

```typescript
// ใช้ requestIdleCallback แทน setTimeout:
const schedulePagination = (callback: () => void) => {
  if (typeof requestIdleCallback !== "undefined") {
    requestIdleCallback(callback, { timeout: 100 });
  } else {
    requestAnimationFrame(callback);
  }
};
```

2. **Debounced updates:**

```typescript
// ใน pagination-plus หรือ custom plugin:
let debounceTimer: ReturnType<typeof setTimeout>;

const debouncedPagination = () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    runPagination();
  }, 150);  // 150ms debounce
};
```

3. **Virtual Scrolling (สำหรับเอกสารมากกว่า 20 หน้า):**

```tsx
// ใช้ intersection observer เพื่อ render เฉพาะหน้าที่ visible
import { useVirtualizer } from "@tanstack/react-virtual";

function PaginatedEditor() {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: pageCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => pageHeight + pageGap,
    overscan: 2,  // render 2 หน้าก่อน/หลัง viewport
  });

  // ... render virtual items
}
```

**หมายเหตุ:** pagination-plus อาจไม่ support virtual scrolling โดยตรง อาจต้อง implement เองหรือใช้ workaround

4. **Measure only visible content:**

```typescript
// แทนที่จะ measure ทุก node ทุกครั้ง:
// Measure เฉพาะ nodes ที่อยู่ใน/ใกล้ viewport
const visibleRange = getVisibleNodeRange();
for (let i = visibleRange.start; i < visibleRange.end; i++) {
  measureNode(nodes[i]);
}
```

---

## 5. Code Architecture

### 5.1 ไฟล์ที่ต้องแก้ไข/สร้าง

| ไฟล์ | การกระทำ | รายละเอียด |
|---|---|---|
| `package.json` | เพิ่ม dependency | `tiptap-pagination-plus` |
| `src/lib/pagination/config.ts` | **สร้างใหม่** | Config utility สำหรับ pagination-plus |
| `src/lib/pagination/hooks.ts` | **สร้างใหม่** | React hooks สำหรับ page count, header/footer |
| `src/components/editor/VisualEditor.tsx` | แก้ไข | เพิ่ม PaginationPlus extension |
| `src/components/editor/EditorShell.tsx` | แก้ไข | ลบ single article wrapper |
| `src/components/editor/StatusBar.tsx` | แก้ไข | ใช้ page count จาก pagination |
| `src/components/editor/PageSetupDialog.tsx` | แก้ไข | เพิ่ม header/footer controls |
| `src/components/editor/PageHeaderFooterEditor.tsx` | **สร้างใหม่** | UI สำหรับ header/footer config |
| `src/store/editorStore.ts` | แก้ไข | เพิ่ม header/footer ใน PageSetup |
| `src/types/index.ts` | แก้ไข | ขยาย PageSetup interface |
| `src/app/globals.css` | แก้ไข | เพิ่ม pagination styles |
| `src/components/editor/MultiPagePreview.tsx` | ลบหรือ deprecate | แทนด้วย pagination-plus |
| `src/hooks/usePagination.ts` | **สร้างใหม่** | Hook สำหรับ pagination state |

### 5.2 Extension Registration Order (สำคัญมาก)

```typescript
// ✅ ลำดับที่ถูกต้อง:
const extensions = [
  // 1. Base schema (ต้องมาก่อน)
  StarterKit.configure({
    heading: false,        // แทนด้วย HeadingWithId
    bulletList: false,     // แทนด้วย BulletListWithClass
    link: false,           // แทนด้วย Link ที่ configure เอง
    underline: false,      // แทนด้วย Underline
  }),

  // 2. Node extensions (ที่ต้องการ custom schema)
  HeadingWithId.configure({ levels: [1, 2, 3] }),
  BulletListWithClass,
  Underline,
  Link.configure({ openOnClick: false }),
  createImageWithAlign(ImageResizeView),

  // 3. Formatting extensions
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Color,
  Highlight.configure({ multicolor: true }),
  Subscript,
  Superscript,
  FontFamily,

  // 4. Structure extensions
  IndentExtension,
  Placeholder.configure({ ... }),

  // 5. Table extensions
  Table.configure({ resizable: true }),
  RepeatingRow,
  TableHeader,
  TableCell,

  // 6. Special features
  VariableMark,
  PageBreak,  // ยังคงใช้สำหรับ manual breaks
  SearchAndReplace.configure({ ... }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Gapcursor,

  // 7. PAGINATION - ต้องอยู่ท้ายสุด!
  // เพราะต้องทำงานหลังจากทุกอย่าง render เสร็จ
  PaginationPlus.configure({ ... }),
];
```

**หลักการ:**
- Base schema ต้องมาก่อน
- Pagination ต้องมาท้ายสุด เพราะต้อง measure DOM หลังจากทุก extension ทำการ render แล้ว
- ถ้ามี TablePlus แทน Table มาตรฐาน ต้องใส่ก่อน PaginationPlus เช่นกัน

### 5.3 CSS Changes

```css
/* src/app/globals.css - เพิ่ม */

/* ── Pagination Plus Styles ── */
.pagination-page {
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.pagination-page-gap {
  border-top: 1px dashed var(--color-border);
  margin: 10px 0;
}

.pagination-header {
  font-family: var(--font-sans), "Sarabun", -apple-system, sans-serif;
  font-size: 11px;
  color: var(--color-muted-foreground);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 0;
}

.pagination-footer {
  font-family: var(--font-sans), "Sarabun", -apple-system, sans-serif;
  font-size: 11px;
  color: var(--color-muted-foreground);
  border-top: 1px solid var(--color-border);
  padding: 8px 0;
}

/* สำหรับ dark mode */
html[data-theme="dark"] .pagination-page {
  background: var(--color-background);
}

/* Print styles ร่วมกับ pagination */
@media print {
  .pagination-page {
    box-shadow: none !important;
    margin-bottom: 0 !important;
    page-break-after: always;
    break-after: page;
  }
  
  .pagination-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  
  .pagination-page-gap {
    display: none !important;
  }
}

/* Break control */
.prose-editor h1,
.prose-editor h2,
.prose-editor h3,
.prose-editor img,
.prose-editor table {
  break-inside: avoid;
  page-break-inside: avoid;
}

.prose-editor h1,
.prose-editor h2,
.prose-editor h3 {
  break-after: avoid;
  page-break-after: avoid;
}

.prose-editor tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

### 5.4 Store Changes

```typescript
// src/types/index.ts

export interface HeaderFooterConfig {
  headerLeft: string;
  headerCenter: string;
  headerRight: string;
  footerLeft: string;
  footerCenter: string;
  footerRight: string;
  firstPageDifferent: boolean;
  oddEvenDifferent: boolean;  // Phase 3
}

export interface PageSetup {
  size: "A4" | "Letter";
  orientation: "portrait" | "landscape";
  marginMm: { top: number; right: number; bottom: number; left: number };
  headerFooter?: HeaderFooterConfig;  // ← เพิ่ม
}

// src/store/editorStore.ts

const DEFAULT_HEADER_FOOTER: HeaderFooterConfig = {
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "{page}",
  firstPageDifferent: false,
  oddEvenDifferent: false,
};

const DEFAULT_PAGE_SETUP: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  headerFooter: DEFAULT_HEADER_FOOTER,
};

// Actions:
setPageSetup: (partial) => set((s) => ({ pageSetup: { ...s.pageSetup, ...partial } })),
setHeaderFooter: (partial) =>
  set((s) => ({
    pageSetup: {
      ...s.pageSetup,
      headerFooter: {
        ...s.pageSetup.headerFooter,
        ...partial,
      },
    },
  })),
```

### 5.5 Hook สำหรับ Pagination State

```typescript
// src/hooks/usePagination.ts

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/core";

interface PaginationState {
  pageCount: number;
  currentPage: number;
  isPaginated: boolean;
}

export function usePagination(editor: Editor | null): PaginationState {
  const [state, setState] = useState<PaginationState>({
    pageCount: 1,
    currentPage: 1,
    isPaginated: false,
  });

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      const storage = editor.storage?.pagination as
        | { pageCount?: number; currentPage?: number; isPaginated?: boolean }
        | undefined;

      setState({
        pageCount: storage?.pageCount ?? 1,
        currentPage: storage?.currentPage ?? 1,
        isPaginated: storage?.isPaginated ?? false,
      });
    };

    // Listen to pagination changes
    editor.on("paginationUpdate", updateState);
    editor.on("update", updateState);

    // Initial state
    updateState();

    return () => {
      editor.off("paginationUpdate", updateState);
      editor.off("update", updateState);
    };
  }, [editor]);

  return state;
}
```

### 5.6 Updated StatusBar

```tsx
// src/components/editor/StatusBar.tsx (Phase 1+ update)

import { usePagination } from "@/hooks/usePagination";

export function StatusBar() {
  const editor = useEditorStore((s) => s.editor); // หรือผ่าน context
  const pagination = usePagination(editor);

  // แทนที่ pageCount จาก regex match:
  const pageCount = pagination.isPaginated
    ? pagination.pageCount
    : (documentHtml.match(/<div[^>]*\sclass=["'][^"']*\bpage-break\b[^"']*["'][^>]*>/gi) || []).length + 1;

  // ... rest of component
}
```

---

## 6. Risk & Mitigation

### 6.1 Compatibility Risk กับ Custom Extensions

| ระดับ | Extension | ความเสี่ยง | Mitigation |
|---|---|---|---|
| **สูง** | `Table` + `RepeatingRow` | TablePlus อาจ conflict | ทดสอบ table data migration, keep fallback |
| **สูง** | `ImageResizeView` (NodeView) | DOM measurement อาจคำนวณผิด | Test กับ images หลายขนาด, ใช้ `break-inside: avoid` |
| **กลาง** | `IndentExtension` | margin-left อาจทำให้ content กว้างเกิน | Test pagination กับ indent values |
| **กลาง** | `VariableMark` | Mark nodes อาจมีปัญหากับ DOM split | Test กับ template content |
| **ต่ำ** | `HeadingWithId` | น่าจะทำงานได้ | Basic test |
| **ต่ำ** | `SearchAndReplace` | Decorations ไม่ส่งผล | No action needed |

**Mitigation Strategy:**
1. สร้าง **test document** ที่มีทุก node type (paragraph, heading, table, image, list, task list, code block, quote, variable mark)
2. ทดสอบ pagination กับ document นี้
3. ถ้ามีปัญหา ใช้ **feature flag** เพื่อ disable pagination สำหรับ document ที่มีปัญหา

### 6.2 Performance Risk กับเอกสารยาว

| สถานการณ์ | ผลกระทบ | Mitigation |
|---|---|---|
| เอกสาร 50+ หน้า | Browser slow, typing lag | Debounced pagination + virtual scrolling |
| เอกสารมี images หนาย | DOM measurement ช้า | Lazy image loading + async measurement |
| เอกสารมี tables ใหญ่ | Table recalculation ช้า | TablePlus optimization |
| Rapid typing | Pagination recalc ทุก keystroke | 150ms debounce + requestIdleCallback |

**Mitigation Code:**

```typescript
// ใน pagination config:
const PAGINATION_DEBOUNCE_MS = 150;
const PAGINATION_IDLE_TIMEOUT_MS = 100;

function createDebouncedPagination(editor: Editor) {
  let timer: ReturnType<typeof setTimeout>;
  
  return () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(
          () => editor.commands.recalculatePagination(),
          { timeout: PAGINATION_IDLE_TIMEOUT_MS }
        );
      } else {
        editor.commands.recalculatePagination();
      }
    }, PAGINATION_DEBOUNCE_MS);
  };
}
```

### 6.3 Cursor Jumping Risk

**ปัญหา:** เมื่อ pagination recalculate แล้ว content ย้ายข้าม page cursor อาจกระโดดไปตำแหน่งไม่ถูกต้อง

**Mitigation:**

```typescript
// ก่อน recalculate pagination บันทึก cursor position:
const saveCursorPosition = (editor: Editor) => {
  const { from, to } = editor.state.selection;
  const nodeBefore = editor.state.doc.resolve(from).nodeBefore;
  const nodeAfter = editor.state.doc.resolve(from).nodeAfter;
  
  return {
    relativePos: from,
    nodeBeforeText: nodeBefore?.textContent?.slice(-20),
    nodeAfterText: nodeAfter?.textContent?.slice(0, 20),
  };
};

// หลัง recalculate คืน cursor position:
const restoreCursorPosition = (editor: Editor, saved: ReturnType<typeof saveCursorPosition>) => {
  // ใช้ node text content เพื่อหา pos ใหม่
  // หรือใช้ bookmark pattern ของ ProseMirror
};
```

pagination-plus น่าจะ handle เรื่องนี้ให้อยู่แล้ว แต่ต้อง test อย่างละเอียด

### 6.4 Data Migration (Snapshots เก่า)

**ปัญหา:** Snapshots เก่าใน localStorage อาจมี HTML ที่ไม่ compatible กับ pagination-plus

**Mitigation:**

```typescript
// ใน store migration:
const MIGRATION_VERSION = 2;

interface PersistedState {
  _v: number;
  // ... other fields
}

// เมื่อโหลด state จาก storage:
function migrateState(state: PersistedState): PersistedState {
  if (state._v < 2) {
    // Add default headerFooter config
    return {
      ...state,
      pageSetup: {
        ...state.pageSetup,
        headerFooter: DEFAULT_HEADER_FOOTER,
      },
      _v: 2,
    };
  }
  return state;
}
```

### 6.5 Print/Export Compatibility

**ปัญหา:** pagination-plus ใช้ DOM decorations ซึ่งไม่ได้อยู่ใน document HTML output

**Mitigation:**

```typescript
// ใน export/wrap.ts - print ยังใช้ @page CSS เหมือนเดิม:
// pagination-plus จัดการแค่ editor preview
// export/print ใช้ @page CSS ซึ่ง browser จัดการ pagination เอง

// แต่ถ้าต้องการ page numbers ใน print:
// อาจต้องใช้ running headers/footers หรือ
// สร้าง multi-page HTML สำหรับ export
```

**สรุป:**
- **Editor preview:** ใช้ pagination-plus (auto pagination + page numbers)
- **Print/PDF:** ใช้ `@page` CSS + `@media print` (browser native)
- **Export HTML:** อาจต้องสร้าง page wrappers ใน HTML output

---

## 7. Appendix

### 7.1 โครงสร้างไฟล์ใหม่หลัง Implement

```
src/
├── lib/
│   ├── page.ts              # (existing) A4/LETTER constants, mmToPx
│   ├── pagination/
│   │   ├── config.ts        # PaginationPlus configuration utility
│   │   ├── constants.ts     # Pagination constants (gaps, colors, etc.)
│   │   └── utils.ts         # Helper functions (debounce, measurement)
│   └── tiptap/
│       ├── pageBreak.ts     # (existing) Manual page break node
│       ├── ...              # (existing extensions)
│
├── components/
│   └── editor/
│       ├── VisualEditor.tsx          # (modified) + PaginationPlus
│       ├── EditorShell.tsx             # (modified) Remove single article
│       ├── StatusBar.tsx               # (modified) Pagination-aware count
│       ├── PageSetupDialog.tsx         # (modified) + header/footer
│       ├── PageHeaderFooterEditor.tsx  # (new) Header/footer UI
│       ├── MultiPagePreview.tsx        # (removed/deprecated)
│       └── ...
│
├── hooks/
│   ├── usePagination.ts     # (new) Pagination state hook
│   └── useEditorResize.ts   # (existing) May need update
│
├── store/
│   └── editorStore.ts       # (modified) + headerFooter in PageSetup
│
├── types/
│   └── index.ts             # (modified) Extended PageSetup
│
└── app/
    └── globals.css          # (modified) + pagination styles
```

### 7.2 API Reference สำหรับ tiptap-pagination-plus

#### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `pageHeight` | `number` | `842` | ความสูงหน้า (px) |
| `pageWidth` | `number` | `789` | ความกว้างหน้า (px) |
| `pageGap` | `number` | `20` | ระยะห่างระหว่างหน้า (px) |
| `pageGapBorderSize` | `number` | `1` | ขนาดเส้นแบ่งหน้า |
| `pageGapBorderColor` | `string` | `"#e5e5e5"` | สีเส้นแบ่งหน้า |
| `pageBreakBackground` | `string` | `"#ffffff"` | สีพื้นหลังช่องว่างระหว่างหน้า |
| `pageHeaderHeight` | `number` | `0` | ความสูง header |
| `pageFooterHeight` | `number` | `0` | ความสูง footer |
| `headerLeft` | `string` | `""` | ข้อความ header ซ้าย |
| `headerRight` | `string` | `""` | ข้อความ header ขวา |
| `footerLeft` | `string` | `""` | ข้อความ footer ซ้าย |
| `footerRight` | `string` | `""` | ข้อความ footer ขวา |
| `marginTop` | `number` | `0` | Margin บน |
| `marginBottom` | `number` | `0` | Margin ล่าง |
| `marginLeft` | `number` | `0` | Margin ซ้าย |
| `marginRight` | `number` | `0` | Margin ขวา |
| `contentMarginTop` | `number` | `0` | Content margin บน |
| `contentMarginBottom` | `number` | `0` | Content margin ล่าง |
| `contentMarginLeft` | `number` | `0` | Content margin ซ้าย |
| `contentMarginRight` | `number` | `0` | Content margin ขวา |

#### Commands

```typescript
// Toggle pagination on/off
editor.commands.togglePagination()
editor.commands.enablePagination()
editor.commands.disablePagination()

// Update page dimensions
editor.commands.updatePageSize(PAGE_SIZES.A4)
editor.commands.updatePageHeight(1000)
editor.commands.updatePageWidth(800)

// Update margins
editor.commands.updateMargins({
  top: 30,
  bottom: 30,
  left: 60,
  right: 60,
})

// Update header/footer content
editor.commands.updateHeaderContent("Document Title", "Page {page}")
editor.commands.updateFooterContent("Confidential", "Page {page} of {total}")
```

#### Predefined Page Sizes

```typescript
import { PAGE_SIZES } from "tiptap-pagination-plus";

PAGE_SIZES.A4      // { width: 794, height: 1123 }  @ 96 DPI
PAGE_SIZES.A3      // { width: 1123, height: 1587 }
PAGE_SIZES.A5      // { width: 559, height: 794 }
PAGE_SIZES.LETTER  // { width: 816, height: 1056 }
PAGE_SIZES.LEGAL   // { width: 816, height: 1345 }
```

**หมายเหตุ:** wordhtml ใช้ `mmToPx()` แทน predefined sizes เพราะ constants ที่มีอยู่ใช้หน่วย mm ซึ่งตรงกับ Word

### 7.3 Migration Checklist

- [ ] ติดตั้ง `tiptap-pagination-plus`
- [ ] สร้าง `src/lib/pagination/config.ts`
- [ ] แก้ไข `VisualEditor.tsx` - เพิ่ม PaginationPlus extension
- [ ] แก้ไข `EditorShell.tsx` - ลบ single article wrapper
- [ ] แก้ไข `StatusBar.tsx` - ใช้ pagination page count
- [ ] แก้ไข `PageSetupDialog.tsx` - เพิ่ม header/footer controls
- [ ] สร้าง `PageHeaderFooterEditor.tsx`
- [ ] แก้ไข `editorStore.ts` - ขยาย PageSetup type
- [ ] แก้ไข `types/index.ts` - เพิ่ม HeaderFooterConfig
- [ ] สร้าง `usePagination.ts` hook
- [ ] แก้ไข `globals.css` - เพิ่ม pagination styles
- [ ] ทดสอบกับ existing test documents
- [ ] ทดสอบ backward compatibility (snapshots เก่า)
- [ ] ทดสอบ print/export
- [ ] ทดสอบ Thai/Unicode content
- [ ] ทดสอบ performance กับเอกสารยาว
- [ ] ทดสอบ table pagination (ถ้าใช้ TablePlus)
- [ ] Update documentation
- [ ] Deploy to staging

### 7.4 Testing Strategy

**Unit Tests:**

```typescript
// __tests__/pagination/config.test.ts
import { createPaginationExtension } from "@/lib/pagination/config";
import { A4, LETTER, mmToPx } from "@/lib/page";

describe("Pagination Config", () => {
  it("should calculate A4 portrait dimensions correctly", () => {
    const pageSetup = {
      size: "A4" as const,
      orientation: "portrait" as const,
      marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
    };

    const ext = createPaginationExtension(pageSetup);
    const config = ext.options;

    expect(config.pageHeight).toBe(Math.round(mmToPx(297)));
    expect(config.pageWidth).toBe(Math.round(mmToPx(210)));
    expect(config.contentMarginTop).toBe(Math.round(mmToPx(25)));
  });

  it("should swap dimensions for landscape", () => {
    const pageSetup = {
      size: "A4" as const,
      orientation: "landscape" as const,
      marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
    };

    const ext = createPaginationExtension(pageSetup);
    const config = ext.options;

    expect(config.pageHeight).toBe(Math.round(mmToPx(210)));
    expect(config.pageWidth).toBe(Math.round(mmToPx(297)));
  });
});
```

**Integration Tests:**

```typescript
// __tests__/pagination/integration.test.ts
// ทดสอบกับเอกสารจริง - ใช้ playwright หรือ testing-library

describe("Pagination Integration", () => {
  it("should split content into multiple pages", async () => {
    // สร้าง editor ด้วย content ยาว
    // ตรวจสอบว่ามี page decorations หลายอัน
  });

  it("should update page count when content changes", async () => {
    // พิมพ์ content เพิ่ม
    // ตรวจสอบว่า page count เปลี่ยน
  });

  it("should handle Thai text correctly", async () => {
    // ใส่ Thai text ยาว ๆ
    // ตรวจสอบว่า pagination ทำงานถูกต้อง
  });
});
```

**Performance Tests:**

```typescript
// ทดสอบกับเอกสาร 50+ หน้า
// วัด FPS ขณะพิมพ์
// วัด time to first pagination
```

### 7.5 Fallback Plan

ถ้า `tiptap-pagination-plus` ไม่ทำงานตาม expectation:

1. **Option 1: ใช้ pagination-plus แบบ limited**
   - Disable auto pagination
   - ใช้แค่ visual page boundaries (decorations) โดย manual calculation
   - เก็บ page count จาก DOM measurement

2. **Option 2: DIY Simplified**
   - สร้าง ProseMirror plugin ที่ใช้ `ResizeObserver` + `DecorationSet`
   - ไม่ insert nodes เข้า schema
   - แสดงเส้นแบ่งหน้าเป็น decorations เท่านั้น
   - Page count คำนวณจาก DOM height

3. **Option 3: Revert กลับไป manual only**
   - ปรับปรุง `MultiPagePreview` ให้ดีขึ้น
   - ให้ user ใส่ manual breaks เอง
   - StatusBar นับจาก manual breaks เหมือนเดิม

---

## สรุป (Executive Summary)

### สถานะปัจจุบัน
wordhtml มี pagination แบบ **manual only** - ใช้ได้แค่กับ page breaks ที่ user ใส่เอง ไม่มี auto pagination, header/footer หรือ page numbers ใน editor preview

### แนะนำ Solution
**`tiptap-pagination-plus`** - community OSS extension ที่รองรับ Tiptap v3, มี auto pagination, header/footer, page numbers, และ table pagination

### Timeline
- **Phase 1 (Auto Pagination):** 1-2 สัปดาห์ - Editor แสดง visual page boundaries
- **Phase 2 (Header/Footer):** 2-3 สัปดาห์ - Page numbers, per-page header/footer
- **Phase 3 (Polish):** 1-2 สัปดาห์ - Widow/orphan, performance, edge cases

**รวมประมาณ 4-7 สัปดาห์** สำหรับ pagination แบบสมบูรณ์

### ความเสี่ยงหลัก
1. **Compatibility** กับ custom extensions (table, image, indent) - ต้อง test อย่างละเอียด
2. **Performance** กับเอกสารยาว - ต้อง implement debounce + virtual scrolling
3. **Cursor management** - ต้อง test user experience ขณะพิมพ์

### ขั้นตอนต่อไปที่แนะนำ
1. ติดตั้ง `tiptap-pagination-plus` ใน branch แยก
2. สร้าง PoC (Proof of Concept) ด้วย config พื้นฐาน
3. ทดสอบ compatibility กับ existing extensions
4. ถ้าผ่าน → เริ่ม Phase 1 implementation
5. ถ้าไม่ผ่าน → ใช้ DIY simplified fallback

---

*End of Document*
