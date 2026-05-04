# User Journey Analysis: wordhtml (Word ↔ HTML Converter + WYSIWYG Editor)

## สรุป Executive Summary

wordhtml เป็นเครื่องมือแปลงเอกสาร Word ↔ HTML ที่ทำงานบน browser โดยไม่ต้องติดตั้งโปรแกรม (privacy-first, no server) มีจุดเด่นคือการแสดงผลแบบ dual-pane (Word editor ซ้าย / HTML editor ขวา) พร้อมฟีเจอร์ cleaning HTML แต่จากการวิเคราะห์ user journey พบ **friction points และ feature gaps จำนวนมาก** ที่ทำให้ user รู้สึก "ไม่สมบูรณ์" โดยเฉพาะเรื่อง:

- **ไม่มี A4 print preview / page layout** — user ไม่รู้ว่าเอกสารจะออกมาหน้าตาแบบไหนเมื่อพิมพ์
- **ไม่มี auto-save / session recovery** — ข้อมูลหายถ้า browser crash
- **ไม่มี header/footer, page number, table of contents** — ขาดสิ่งที่เอกสารราชการไทยต้องการ
- **ไม่มี batch processing / queue management** — ทำงานซ้ำๆ ลำบาก
- **ไม่มี template system / mail merge** — ทำเอกสารรูปแบบเดิมซ้ำๆ ไม่ได้

---

## 1. User Personas & Jobs-to-be-Done (JTBD)

### Persona 1: Office Worker (ข้าราชการ/พนักงานบริษัท)
**Job**: "ฉันต้องการแก้ไขเอกสารราชการที่มีหัวกระดาษ ตัวหนังสือภาษาไทย ตาราง แล้วพิมพ์ A4 ให้เหมือนกับ Word ทุกประการ"
**Pain**: ต้องพิมพ์ให้ตรงหน้ากระดาษ ต้องมีเลขหน้า วันที่ ลายเซ็น ต้องใช้ฟอนต์ไทยได้ถูกต้อง
**Frequency**: ทุกวัน
**Tech level**: ปานกลาง (รู้ Word แต่ไม่รู้ HTML)

### Persona 2: Developer / Content Writer
**Job**: "ฉันต้องการแปลงเอกสาร Word เป็น clean HTML ที่ไม่มี dirty markup แล้วเอาไปใช้ใน CMS/Website"
**Pain**: HTML ที่ Word สร้างมามี style inline เยอะ มี class ไม่จำเป็น ต้อง manual clean
**Frequency**: รายสัปดาห์
**Tech level**: สูง (รู้ HTML/CSS)

### Persona 3: Student
**Job**: "ฉันต้องการเขียนรายงาน แทรกรูปภาพ ตารางข้อมูล ส่งอาจารย์เป็น .docx"
**Pain**: ไม่มี Microsoft Word บนเครื่อง หรือต้องการทำบน tablet/Chromebook
**Frequency**: รายเดือน (ช่วงสอบ)
**Tech level**: ปานกลาง

### Persona 4: Casual User
**Job**: "ฉันต้องการเขียนเอกสารง่ายๆ แก้ไขอะไรสักอย่างอย่างเร็ว โดยไม่ต้องติดตั้งโปรแกรม"
**Pain**: ไม่อยากเปิด Word ที่ช้าและหนัก ไม่อยาก login ใช้งานฟรีได้เลยดีที่สุด
**Frequency**: นานๆ ที
**Tech level**: ต่ำ-ปานกลาง

---

## 2. User Flow Analysis

---

### Flow 1: เปิดเอกสาร Word แล้วแก้ไข

```
[เปิดเว็บ] → [ลากไฟล์/Paste] → [แก้ไขเนื้อหา] → [Export กลับ]
```

#### Step 1.1: เปิดเว็บ (First Visit)
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| ไม่มี onboarding / guided tour | 🔶 Medium | User ใหม่ไม่รู้ว่า dual-pane ทำงานยังไง ไม่รู้ว่าลากไฟล์วางได้ |
| ไม่มี "Recent Documents" | 🔶 Medium | ต้องเริ่มจากศูนย์ทุกครั้ง |
| ไม่มี "Open from URL" | 🟢 Low | บางคนอาจมีไฟล์อยู่บน cloud |

#### Step 1.2: ลากไฟล์ .docx หรือ Paste from Word
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี progress indicator ขณะ convert** | 🔴 High | ไฟล์ใหญ่แล้ว user ไม่รู้ว่ากำลังทำงานอยู่หรือค้าง |
| **ไม่มี validation ก่อน convert** | 🔴 High | ถ้าไฟล์ corrupt หรือไม่ใช่ .docx จริง user รู้ตอนหลังว่าไม่ได้ |
| **ไม่มี "Import Settings"** | 🔶 Medium | บางครั้ง user อาจไม่ต้องการเอาทุกอย่างมา (เช่น ไม่เอา comments, ไม่เอา track changes) |
| **รูปภาพแทรกมาเป็น base64** | 🔶 Medium | ทำให้ HTML มีขนาดใหญ่มาก ไม่เหมาะกับการนำไปใช้ต่อ |
| **Paste from Word แล้ว formatting หาย** | 🔴 High | ฟอนต์ไทย ขนาดตัวอักษร สี highlight อาจเปลี่ยน |
| ไม่มี "Compare before/after" | 🟢 Low | User ไม่รู้ว่าอะไรหายไปจากต้นฉบับ |

#### Step 1.3: แก้ไขเนื้อหา
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี A4 page preview / pagination** | 🔴 **Critical** | สำหรับ Office Worker ไทย: ไม่รู้ว่าข้อความจะตกหน้าไหน ตัดหน้ายังไง จัดหน้าได้ไหม |
| **ไม่มี header/footer** | 🔴 High | เอกสารราชการไทยทุกฉบับต้องมีหัวกระดาษ/ท้ายกระดาษ |
| **ไม่มี page number** | 🔴 High | สารบัญ เอกสารทางการ ต้องมีเลขหน้า |
| **ไม่มี auto-save / localStorage recovery** | 🔴 High | ถ้า browser crash, ปิดแท็บผิด, refresh หน้า — งานหายทั้งหมด |
| **ไม่มี undo history ที่มองเห็นได้** | 🔶 Medium | มีปุ่ม undo แต่ไม่รู้ว่า undo ถึงไหน ไม่มี redo tree |
| **ไม่มี find & replace** | 🔶 Medium | เอกสารยาวๆ ต้องแก้ชื่อ, วันที่ หลายที่ |
| **ไม่มี word count ที่ละเอียด** | 🟢 Low | มี words count แต่ไม่มี character count, page count |
| **ไม่มี spell check (ภาษาไทย)** | 🔶 Medium | สำคัญมากสำหรับเอกสารราชการ |

#### Step 1.4: บันทึก / Export กลับเป็น docx
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี preview ก่อน export** | 🔴 High | ไม่รู้ว่า docx ที่ออกมาจะหน้าตายังไง |
| **ไม่มี export settings** | 🔶 Medium | ไม่เลือกได้ว่าจะ embed font หรือไม่, จะ compress image หรือไม่ |
| **ไม่มี "Save to Google Drive/Dropbox"** | 🟢 Low | ต้อง download แล้ว upload เอง |
| **ไม่มี file name suggestion** | 🟢 Low | ต้องตั้งชื่อเองทุกครั้ง |
| **ไม่มี export format อื่น** (PDF, ODT, RTF) | 🟢 Low | มีแค่ HTML และ Docx |
| **ไม่มี success confirmation ที่ชัดเจน** | 🔶 Medium | ไม่รู้ว่า download เสร็จแล้วจริงๆ หรือยัง |

---

### Flow 2: สร้างเอกสารใหม่ตั้งแต่ศูนย์

```
[เปิด blank] → [พิมพ์] → [จัดรูปแบบ] → [แทรกรูป] → [แทรกตาราง] → [ใส่เลขหน้า] → [สารบัญ] → [Export]
```

#### Step 2.1: เปิด blank document
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี template ให้เลือก** | 🔶 Medium | ไม่มีเอกสารเปล่าที่มีหัวกระดาษราชการไทย, ไม่มี resume template, ไม่มี report template |
| **ไม่มี font ไทยมาตรฐาน** | 🔴 High | TH Sarabun New, TH Sarabun PSK, TH Krub, TH Niramit AS — สำคัญมากสำหรับเอกสารไทย |
| **ไม่มี page setup (margin, orientation, size)** | 🔴 High | กระดาษ A4 ขอบกระดาษ หน้า-หลัง ซ้าย-ขวา ต้องปรับได้ |

#### Step 2.2: พิมพ์เนื้อหา
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี Thai typing cursor ที่ smooth** | 🔶 Medium | บาง WYSIWYG editor มีปัญหา cursor jump เวลาพิมพ์ภาษาไทย |
| **ไม่มี line spacing control** (1.0, 1.5, 2.0, custom) | 🔶 Medium | เอกสารราชการไทยต้องมี line spacing ที่กำหนด |
| **ไม่มี paragraph spacing (before/after)** | 🟢 Low | ต้องเว้นวรรคย่อหน้าให้เหมาะสม |
| **ไม่มี tab stops / ruler** | 🔶 Medium | จัดตำแหน่งข้อความไม่ได้ |

#### Step 2.3: จัดรูปแบบ (font, size, color, align)
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี styles panel (Heading 1, Heading 2, Normal, Title)** | 🔴 High | สร้างสารบัญไม่ได้ถ้าไม่มี heading styles |
| **ไม่มี theme / color palette** | 🟢 Low | casual user อาจอยากได้สีที่สวยง่ายๆ |
| **ไม่มี format painter** | 🟢 Low | คัดลอกรูปแบบจากย่อหนึ่งไปอีกย่อหนึ่ง |
| **ไม่มี clear formatting ที่ครอบคลุม** | 🟢 Low | มีบางส่วนแต่ไม่ครบ |

#### Step 2.4: แทรกรูปภาพ
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี image resize แบบลากมุม** | 🔴 High | ต้องลากให้เป็นสัดส่วน หรือใส่ pixel เอง |
| **ไม่มี image caption** | 🔶 Medium | รายงานต้องมีคำบรรยายภาพ |
| **ไม่มี image alignment (inline, left, right, center, wrap text)** | 🔴 High | จัดตำแหน่งรูปยาก |
| **ไม่มี alt text input** | 🔶 Medium | สำคัญสำหรับ accessibility และ HTML export |
| **ไม่มี image compression option** | 🟢 Low | ไฟล์ใหญ่เกินไป |

#### Step 2.5: แทรกตาราง
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี merge/split cells** | 🔶 Medium | ตารางซับซ้อนไม่ได้ |
| **ไม่มี table styles** | 🟢 Low | ต้องจัดสีเอง |
| **ไม่มี formula/calculation** | 🔶 Medium | ตารางคะแนน ตารางงบประมาณ ต้องคำนวณได้ |
| **ไม่มี table of contents จาก heading** | 🔴 High | เอกสารยาวต้องมีสารบัญ |
| **ไม่มี row/column ซ้ำหัวตารางที่ page break** | 🔶 Medium | ตารางยาวๆ ตัดหน้าแล้วหัวตารางหาย |

#### Step 2.6: ใส่หมายเลขหน้า / สร้างสารบัญ
| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี page number ในทุกรูปแบบ** (top, bottom, center, left, right, roman numeral) | 🔴 **Critical** | ขาดไม่ได้สำหรับเอกสารทางการ |
| **ไม่มี table of contents auto-generation** | 🔴 **Critical** | สร้างสารบัญต้องทำเอง |
| **ไม่มี page break control** (manual page break) | 🔴 High | ควบคุมการตัดหน้าไม่ได้ |
| **ไม่มี section break** (different header/footer per section) | 🔶 Medium | บทที่ 1-3 อาจต้องการ header ต่างกัน |

---

### Flow 3: Convert HTML ↔ Word (Batch Processing)

```
[มีไฟล์หลายฉบับ] → [ต้องแปลงทั้งหมด] → [แก้ไขทีละไฟล์]
```

| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี batch upload (multi-file drag)** | 🔴 **Critical** | ต้องทำทีละไฟล์ ไม่มี batch |
| **ไม่มี queue management / progress bar** | 🔴 High | ไม่รู้ว่าไฟล์ไหนเสร็จแล้ว เหลืออีกกี่ไฟล์ |
| **ไม่มี batch export settings** | 🔶 Medium | ต้องตั้งค่าซ้ำทุกไฟล์ |
| **ไม่มี "Apply same cleaning to all"** | 🔶 Medium | ถ้ามี 10 ไฟล์ ต้องกด clean 10 ครั้ง |
| **ไม่มี history / log ของการ convert** | 🟢 Low | ไม่รู้ว่า convert อะไรไปบ้าง |
| **ไม่มี folder upload** | 🟢 Low | ถ้ามีโฟลเดอร์ย่อยต้องทำเอง |

---

### Flow 4: ทำงานซ้ำๆ (Template-Based)

```
[ใช้เอกสารแบบเดิม] → [แก้ไขบางส่วน] → [Export]
```

| Friction | Severity | รายละเอียด |
|----------|----------|-----------|
| **ไม่มี template library / saved templates** | 🔴 **Critical** | ต้องเริ่มจากศูนย์ทุกครั้ง |
| **ไม่มี template variables ({{name}}, {{date}}, {{company}})** | 🔴 High | ทำ mail merge / form letter ไม่ได้ |
| **ไม่มี "Save as Template"** | 🔴 High | ทำเอกสารรูปแบบเดิมซ้ำๆ ลำบาก |
| **ไม่มี auto-fill / smart fields** | 🔶 Medium | วันที่ปัจจุบัน, ชื่อผู้เขียน, เลขที่เอกสาร |
| **ไม่มี "Duplicate document"** | 🟢 Low | ต้อง copy-paste เนื้อหาเอง |

---

## 3. Missing States Analysis

### Empty State (เอกสารว่าง)
**ปัจจุบัน**: แสดง editor ว่างๆ มี tooltip บอกให้ paste หรือ compose
**สิ่งที่ขาด**:
- ❌ ไม่มี quick-start actions ("Open a .docx", "Paste from Word", "Start from Template")
- ❌ ไม่มี featured templates ที่น่าสนใจ
- ❌ ไม่มี recent files (เพราะไม่มี storage)
- ❌ ไม่มี onboarding hint ที่ contextual (เช่น "ลากไฟล์มาวางที่นี่" แบบชัดเจน)

### Error State
**ปัจจุบัน**: ไม่ชัดเจนว่ามี error handling ยังไง
**สิ่งที่ขาด**:
- ❌ ไม่มี "File too large" error (limit เท่าไหร่?)
- ❌ ไม่มี "Unsupported file format" ที่ชัดเจน (รองรับ .doc ด้วยไหม? .odt?)
- ❌ ไม่มี "Conversion failed" ที่บอกว่าอะไรพัง (image? table? font?)
- ❌ ไม่มี "Browser compatibility warning" (บาง browser อาจไม่รองรับ)
- ❌ ไม่มี "Out of memory" warning สำหรับเอกสารใหญ่

### Loading State
**ปัจจุบัน**: ไม่ชัดเจน
**สิ่งที่ขาด**:
- ❌ ไม่มี progress bar / spinner ขณะ convert
- ❌ ไม่มี "Step 1/3: Parsing document..." ที่ชัดเจน
- ❌ ไม่มี "Large file detected, this may take a moment" ที่ชัดเจน
- ❌ ไม่มี skeleton screen ขณะโหลด

### Success State
**ปัจจุบัน**: Download เริ่มขึ้นอัตโนมัติ (หรือต้องกด HTML/DOCX button)
**สิ่งที่ขาด**:
- ❌ ไม่มี toast notification "Export successful!"
- ❌ ไม่มี file info summary (ขนาดไฟล์, จำนวนหน้า, จำนวนรูป)
- ❌ ไม่มี "Open in new tab" สำหรับ preview
- ❌ ไม่มี "Share link" (เพราะไม่มี server อาจเป็น data URL)

### Confirmation State
**ปัจจุบัน**: ไม่มี
**สิ่งที่ขาด**:
- ❌ ไม่มี "You have unsaved changes. Discard?" เมื่อปิด browser / refresh
- ❌ ไม่มี "This will overwrite the existing file. Continue?"
- ❌ ไม่มี "Are you sure you want to clear the editor?"
- ❌ ไม่มี "Convert will lose some formatting. Proceed?"

### Help State
**ปัจจุบัน**: มี video tutorial ด้านล่างหน้า แต่ซ่อนอยู่ต้อง scroll
**สิ่งที่ขาด**:
- ❌ ไม่มี inline contextual help (เครื่องหมาย ? ข้าง feature)
- ❌ ไม่มี keyboard shortcut cheat sheet
- ❌ ไม่มี tooltip บน toolbar buttons
- ❌ ไม่มี "What's this?" สำหรับ HTML cleaning options
- ❌ ไม่มี FAQ / Troubleshooting ที่เข้าถึงง่าย

---

## 4. Feature Gaps ที่ควรมี (พร้อม Priority)

### 🔴 Critical Priority ("ทำไม่ได้ = ใช้ไม่ได้")

| # | Feature | Pain Point ที่แก้ | Personas |
|---|---------|-------------------|----------|
| 1 | **A4 Page Layout View + Print Preview** | Office Worker ไม่รู้ว่าพิมพ์ออกมายังไง | 1, 3 |
| 2 | **Header / Footer Editor** | เอกสารราชการไทยต้องมีหัวกระดาษ | 1, 3 |
| 3 | **Page Numbering (หมายเลขหน้า)** | เอกสารทุกฉบับต้องมีเลขหน้า | 1, 3 |
| 4 | **Thai Fonts (TH Sarabun New, etc.)** | ฟอนต์มาตรฐานราชการไทย | 1 |
| 5 | **Auto-Save to localStorage / IndexedDB** | งานหายถ้า browser crash | ทุก persona |
| 6 | **Table of Contents Auto-Generation** | สร้างสารบัญเองลำบาก | 1, 3 |
| 7 | **Batch Upload + Queue Management** | แปลงทีละไฟล์ลำบาก | 2 |
| 8 | **Template System (Save + Reuse)** | ทำเอกสารรูปแบบเดิมซ้ำๆ | 1, 3 |
| 9 | **Mail Merge / Template Variables** | สร้างเอกสารแบบฟอร์ม | 1 |
| 10 | **Find & Replace** | แก้ชื่อ/วันที่ หลายที่ในเอกสาร | 1, 2, 3 |

### 🔶 High Priority ("มีแล้วดี ไม่มีแล้วลำบาก")

| # | Feature | Pain Point ที่แก้ | Personas |
|---|---------|-------------------|----------|
| 11 | **Export Preview (before download)** | ไม่รู้ว่า docx ออกมาหน้าตายังไง | ทุก persona |
| 12 | **Undo/Redo History Panel** | ไม่รู้ว่า undo ถึงไหน | ทุก persona |
| 13 | **Image Resize + Caption + Wrap** | จัดรูปภาพยาก | 1, 3 |
| 14 | **Table Merge/Split Cells** | ตารางซับซ้อนไม่ได้ | 1, 3 |
| 15 | **Page Break / Section Break** | ควบคุมการตัดหน้า | 1, 3 |
| 16 | **Progress Indicator for Conversion** | ไฟล์ใหญ่แล้วไม่รู้ว่ากำลัง convert หรือค้าง | ทุก persona |
| 17 | **Error Messages ที่ชัดเจน** | ไม่รู้ว่าทำไมไฟล์เปิดไม่ได้ | ทุก persona |
| 18 | **Line Spacing & Paragraph Spacing** | เอกสารราชการต้องมี spacing ที่กำหนด | 1 |
| 19 | **Ruler + Tab Stops** | จัดตำแหน่งข้อความ | 1 |
| 20 | **Spell Check (ภาษาไทย)** | สลับ ก-ไก่, สระผิด | 1, 3 |

### 🟢 Medium-Low Priority ("มี = premium experience")

| # | Feature | Pain Point ที่แก้ | Personas |
|---|---------|-------------------|----------|
| 21 | **Format Painter** | คัดลอกรูปแบบเร็วขึ้น | 1 |
| 22 | **Image Compression Option** | ไฟล์เล็กลง | 2, 3 |
| 23 | **Export to PDF** | บางคนอยากได้ PDF | 1, 3 |
| 24 | **Cloud Save (Google Drive, Dropbox)** | ไม่ต้อง download-upload เอง | ทุก persona |
| 25 | **Comments / Annotations** | ให้อาจารย์/หัวหน้า comment ได้ | 1, 3 |
| 26 | **Track Changes** | รู้ว่าแก้อะไรไปบ้าง | 1 |
| 27 | **Word Count (pages, characters, lines)** | รายงานมักมี requirement | 3 |
| 28 | **Keyboard Shortcuts + Cheat Sheet** | Power user ทำงานเร็วขึ้น | 2 |
| 29 | **Inline Contextual Help** | มือใหม่ไม่ต้องเดา | 4 |
| 30 | **Recent Files / Document History** | กลับมาแก้ไขได้ | ทุก persona |

---

## 5. Subjective "ความรู้สึกไม่สมบูรณ์" แยกตาม Persona

### Office Worker (ข้าราชการ/พนักงาน)
> "เปิดเว็บมา พิมพ์เอกสาร แต่ไม่มีหัวกระดาษ ไม่มีเลขหน้า ไม่มีฟอนต์ไทย ไม่รู้ว่าพิมพ์ออกมาหน้าตายังไง — รู้สึกเหมือนใช้ Notepad ที่มี bold/italic"

**ความรู้สึกไม่สมบูรณ์: 9/10** — ใช้ทำเอกสารราชการไม่ได้เลย ขาด header/footer/page number/A4 preview

### Developer/Content Writer
> "แปลง Word เป็น HTML ได้ แต่ไม่มี batch, ไม่มี progress, ไม่มี compare, ต้อง clean ทีละไฟล์ — ใช้สคริปต์เองเร็วกว่า"

**ความรู้สึกไม่สมบูรณ์: 6/10** — ใช้ได้สำหรับไฟล์เดียว แต่ไม่ scalable ไม่มี API

### Student
> "เขียนรายงานได้ แต่แทรกรูปแล้ว resize ไม่ค่อยดี ไม่มีสารบัญ ไม่มี page number ต้องส่งเป็น docx แต่ไม่รู้ว่าออกมายังไง"

**ความรู้สึกไม่สมบูรณ์: 7/10** — พื้นฐานพอใช้ได้ แต่ขาดสิ่งที่รายงานต้องการ

### Casual User
> "เขียนเอกสารง่ายๆ ได้ แต่ถ้าปิด browser ผิดพลาด งานหายหมด ไม่มี undo ที่มั่นใจได้"

**ความรู้สึกไม่สมบูรณ์: 5/10** — ใช้งานง่ายๆ พอไหว แต่กลัวข้อมูลหาย

---

## 6. Quick Wins (ทำได้เร็ว + Impact สูง)

1. **Add auto-save to localStorage** — ง่ายมาก แก้ pain point "กลัวข้อมูลหาย"
2. **Add "Unsaved changes" confirmation** — ก่อน refresh/close browser
3. **Add Find & Replace** — ฟีเจอร์พื้นฐานที่ทุกคนใช้
4. **Add progress spinner ขณะ convert** — บอก user ว่ากำลังทำงานอยู่
5. **Add Thai fonts** — ใส่ TH Sarabun New, TH Krub ลงไปใน font list
6. **Add Export preview modal** — แสดงผลคร่าวๆ ก่อน download
7. **Add inline help tooltips** — บน toolbar buttons
8. **Add "Recent files" from localStorage** — เปิดไฟล์ล่าสุดได้เร็ว

---

## 7. Strategic Features (ทำยากแต่ differentiating)

1. **A4 Page Layout Engine** — แยกหน้ากระดาษแบบ Word บน browser (ท้าทายแต่เป็นจุดขาย)
2. **Template Marketplace** — มี template สำหรับเอกสารไทย (รายงาน, หนังสือราชการ, Resume)
3. **Batch Convert Queue** — ลากหลายไฟล์ รอ convert ทีเดียว
4. **Cloud Connector** — เปิด/บันทึกจาก Google Drive, OneDrive
5. **Collaborative Comments** — ส่งลิงก์ให้อาจารย์ comment ได้ (แม้จะไม่มี real-time)

---

## 8. สรุป Priority Matrix

```
                    Low Effort                          High Effort
                ┌──────────────────┐            ┌──────────────────┐
    High Impact │ Auto-save        │            │ A4 Page Layout   │
                │ Unsaved warning  │            │ Header/Footer    │
                │ Find & Replace   │            │ Template System  │
                │ Progress spinner │            │ Batch Queue      │
                │ Thai fonts       │            │                  │
                └──────────────────┘            └──────────────────┘
                ┌──────────────────┐            ┌──────────────────┐
    Low Impact  │ Format Painter   │            │ Cloud Save       │
                │ Export PDF       │            │ Real-time Collab │
                │ Shortcut cheat   │            │ Track Changes    │
                │ sheet            │            │                  │
                └──────────────────┘            └──────────────────┘
```

**แนะนำให้เริ่มจาก quadrant "High Impact + Low Effort" ก่อน** เพื่อสร้าง trust กับ user แล้วค่อยต่อยอดไป Strategic Features

---

*Report generated from UX/User Journey Analyst perspective*
*Focus: wordhtml.com as a privacy-first, browser-based Word ↔ HTML converter*
