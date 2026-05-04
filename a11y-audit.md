# Accessibility (a11y) & UI Polish Audit — wordhtml

> ภาษาไทย (primary) พร้อม English technical terms ในวงเล็บ

---

## Critical

### C1. `html lang="en"` แต่เนื้อหา Primary เป็นภาษาไทย
- **ไฟล์**: `src/app/layout.tsx` บรรทัด 69
- **ปัญหา**: `<html lang="en">` ทำให้ Screen reader ออกเสียงภาษาไทยผิด (mispronunciation) เพราะ browser คาดว่าเนื้อหาเป็นภาษาอังกฤษ
- **ผลกระทบ**: Screen reader users ฟังภาษาไทยไม่รู้เรื่อง เช่น "โปรแกรมแก้ไข" อาจอ่านเป็นภาษาอังกฤษเต็มรูปแบบ
- **แก้ไข**:
  ```tsx
  <html lang="th" … >
  ```
  ถ้ามีส่วนที่เป็นภาษาอังกฤษยาว ๆ ให้ห่อด้วย `<span lang="en">`

### C2. MobileBlock.tsx ข้อความทั้งหมดเป็นภาษาอังกฤษ (ขัด i18n style)
- **ไฟล์**: `src/components/MobileBlock.tsx` บรรทัด 35–40
- **ปัญหา**: App กำหนด i18n style เป็น Thai primary, English in parentheses แต่ MobileBlock ใช้ภาษาอังกฤษ 100% ("wordhtml works best on desktop", "Open this page on a desktop…")
- **ผลกระทบ**: Thai users ที่ใช้มือถือได้รับข้อความภาษาอังกฤษโดยไม่มี Thai translation ขัดกับ UX ที่กำหนดไว้
- **แก้ไข**:
  ```tsx
  <h2 className="text-2xl font-semibold tracking-tight">
    wordhtml ใช้งานบน Desktop ดีที่สุด
  </h2>
  <p className="mt-3 text-[color:var(--color-muted-foreground)]">
    โปรแกรมแก้ไขแบบ Visual และ A4 Preview ต้องการหน้าจอกว้างกว่าที่โทรศัพท์มี
    (The visual editor needs a wider screen than your phone.)
  </p>
  ```

### C3. Ruler handles ไม่รองรับ Keyboard — Mouse-only interaction
- **ไฟล์**: `src/components/editor/Ruler.tsx` บรรทัด 233–270 (margin handles), 275–314 (indent triangles)
- **ปัญหา**: Draggable handles (`onMouseDown`) เป็น `<div>` ธรรมดา ไม่มี `tabIndex={0}`, ไม่มี `role="slider"`, ไม่มี `aria-valuenow/aria-valuemin/aria-valuemax`, และไม่มี `onKeyDown` handler
- **ผลกระทบ**: Keyboard-only users / Screen reader users ไม่สามารถปรับ margin หรือ paragraph indent ได้เลย (สูญเสียฟีเจอร์หลัก)
- **แก้ไข**:
  ```tsx
  // Margin handle example
  <div
    role="slider"
    tabIndex={0}
    aria-label={`ขอบซ้าย ${marginLeftMm.toFixed(1)} มม.`}
    aria-valuenow={marginLeftMm}
    aria-valuemin={0}
    aria-valuemax={pageWidthMm - marginRightMm - minContentMm}
    onMouseDown={startMarginDrag("marginLeft")}
    onKeyDown={(e) => {
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") { e.preventDefault(); onMarginChange?.(Math.max(0, marginLeftMm - step), marginRightMm); }
      if (e.key === "ArrowRight") { e.preventDefault(); onMarginChange?.(Math.min(pageWidthMm - marginRightMm - minContentMm, marginLeftMm + step), marginRightMm); }
    }}
    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)]"
    …
  />
  ```

---

## High

### H1. Color contrast ของ muted-foreground ไม่ผ่าน WCAG AA ใน Light mode
- **ไฟล์**: `src/app/globals.css` บรรทัด 7 (`--color-muted-foreground: #71717a`)
- **ปัญหา**: `#71717a` บนพื้นหลัง `#ffffff` = ~3.6:1 ต่ำกว่า WCAG AA 4.5:1 สำหรับ normal text
- **ผลกระทบ**: Secondary text, labels, hints, footer text อ่านยากสำหรับผู้มีปัญหาสายตา หรือใช้จอความสว่างต่ำ
- **แก้ไข**:
  ```css
  @theme inline {
    --color-muted-foreground: #52525b; /* ~5.8:1 บน #ffffff */
  }
  ```
  หรือปรับเป็น `#52525b` เพื่อให้ผ่าน AA ทั้ง light/dark (dark mode `#a1a1aa` บน `#09090b` ผ่านอยู่แล้ว)

### H2. SearchPanel ไม่มี label ที่เชื่อมโยงกับ input
- **ไฟล์**: `src/components/editor/SearchPanel.tsx` บรรทัด 89–103
- **ปัญหา**: `<input placeholder="ค้นหา…">` และ `<input placeholder="แทนที่ด้วย…">` ไม่มี `<label htmlFor>`, `aria-label`, หรือ `aria-labelledby`
- **ผลกระทบ**: Screen reader users ไม่ทราบว่า input นี้คืออะไร (placeholder ไม่ถือเป็น accessible name ที่เพียงพอ)
- **แก้ไข**:
  ```tsx
  <label htmlFor="search-term" className="sr-only">ค้นหา</label>
  <input id="search-term" aria-label="ค้นหา" … />
  <label htmlFor="replace-term" className="sr-only">แทนที่ด้วย</label>
  <input id="replace-term" aria-label="แทนที่ด้วย" … />
  ```

### H3. ExportDialog — GAS input ไม่มี label เชื่อมโยง
- **ไฟล์**: `src/components/editor/ExportDialog.tsx` บรรทัด 309–318
- **ปัญหา**: `<label>ชื่อฟังก์ชัน:</label>` ไม่มี `htmlFor` และ `<input>` ไม่มี `id` ทำให้ screen reader ไม่สามารถเชื่อมโยง label กับ input ได้
- **ผลกระทบ**: Screen reader users ไม่ทราบว่า input นี้คืออะไรเมื่อ focus เข้าไป
- **แก้ไข**:
  ```tsx
  <label htmlFor="gas-function-name" className="text-xs text-[color:var(--color-muted-foreground)]">
    ชื่อฟังก์ชัน:
  </label>
  <input id="gas-function-name" … />
  ```

### H4. SearchPanel เป็น custom overlay แต่ไม่มี Focus trap / Focus return
- **ไฟล์**: `src/components/editor/SearchPanel.tsx` บรรทัด 74
- **ปัญหา**: SearchPanel เป็น `div` แบบ absolute ที่ไม่ใช่ Radix Dialog ไม่มี focus trap และเมื่อปิด (Escape / คลิกปิด) focus ไม่ return ไปยัง element ที่เปิด panel
- **ผลกระทบ**: Keyboard users ต้อง tab ผ่านทั้งหน้าเพื่อกลับมาที่ editor หรืออาจหลุดไปที่ document root
- **แก้ไข**:
  1. เก็บ `lastFocusedElement` ก่อนเปิด panel (ใช้ `document.activeElement`)
  2. เมื่อปิด ให้ `lastFocusedElement?.focus()`
  3. ใช้ `FocusScope` จาก Radix UI หรือ implement focus trap ด้วย `Tab` / `Shift+Tab` loop ภายใน panel

### H5. Editor placeholder ไม่ announce ให้ screen reader
- **ไฟล์**: `src/components/editor/VisualEditor.tsx` บรรทัด 69
- **ปัญหา**: Tiptap Placeholder ใช้ `::before` pseudo-element (`content: attr(data-placeholder)`) ซึ่ง screen reader ส่วนใหญ่ไม่อ่าน
- **ผลกระทบ**: Screen reader users ไม่ทราบว่า editor ว่างเปล่าและสามารถเริ่มพิมพ์ได้
- **แก้ไข**:
  เพิ่ม `aria-describedby` ชี้ไปยัง hidden hint:
  ```tsx
  editorProps: {
    attributes: {
      class: "prose-editor …",
      role: "textbox",
      "aria-label": "โปรแกรมแก้ไขเอกสาร",
      "aria-multiline": "true",
      "aria-describedby": "editor-hint",
    },
  }
  ```
  แล้ว render:
  ```tsx
  <span id="editor-hint" className="sr-only">
    พิมพ์ วางจาก Word หรืออัปโหลดไฟล์ .docx เพื่อเริ่มต้น
  </span>
  ```

### H6. ไม่มี Skip link
- **ไฟล์**: `src/app/layout.tsx` ทั้งไฟล์
- **ปัญหา**: ไม่มี `<a href="#main-content" className="sr-only focus:not-sr-only">` หรือ skip navigation link
- **ผลกระทบ**: Keyboard users ต้อง tab ผ่าน TopBar, MenuBar, FormattingToolbar (อาจเป็นสิบ ๆ ครั้ง) ก่อนถึง editor ทุกครั้งที่ reload
- **แก้ไข**:
  ```tsx
  <body …>
    <a href="#main-editor" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-[color:var(--color-accent)] focus:text-[color:var(--color-accent-foreground)]">
      ข้ามไปยังโปรแกรมแก้ไข (Skip to editor)
    </a>
    …
    <div id="main-editor">…</div>
  </body>
  ```

---

## Medium

### M1. TopBar badge count ไม่มี accessible name
- **ไฟล์**: `src/components/editor/TopBar.tsx` บรรทัด 50–53
- **ปัญหา**: Badge แสดงจำนวน snapshot (`historyCount`) เป็น `<span>` ธรรมดา ไม่มี `aria-label` หรือ `aria-live`
- **ผลกระทบ**: Screen reader users ไม่ทราบว่ามีประวัติกี่รายการ และไม่รู้เมื่อมี snapshot ใหม่
- **แก้ไข**:
  ```tsx
  <span
    aria-label={`มีประวัติ ${historyCount} รายการ`}
    className="absolute -right-0.5 -top-0.5 …"
  >
    {historyCount > 9 ? "9+" : historyCount}
  </span>
  ```
  หรือห่อปุ่ม history ด้วย `aria-describedby` ที่ชี้ไปยัง badge count

### M2. MenuBar `<nav>` ไม่มี `aria-label`
- **ไฟล์**: `src/components/editor/MenuBar.tsx` บรรทัด 25
- **ปัญหา**: `<nav>` ไม่มี `aria-label` หรือ `aria-labelledby` เมื่อมี nav หลายตัวในหน้า (Header ก็มี nav) screen reader จะอ่านเป็น "navigation region" ซ้ำ ๆ โดยไม่แยกความแตกต่าง
- **ผลกระทบ**: Screen reader users ไม่สามารถ jump ไปยัง nav ที่ต้องการได้อย่างรวดเร็ว
- **แก้ไข**:
  ```tsx
  <nav aria-label="เมนูหลัก (Main menu)" className="…">
  ```

### M3. HistoryPanel — SnapshotRow ปุ่มแก้ไขชื่อไม่มี aria-label
- **ไฟล์**: `src/components/editor/HistoryPanel.tsx` บรรทัด 168–177
- **ปัญหา**: ปุ่ม `type="button"` ที่ trigger rename มีแต่ `title="คลิกเพื่อแก้ไขชื่อ"` ไม่มี `aria-label`
- **ผลกระทบ**: Title อาจอ่านได้บาง screen reader บางตัว แต่ไม่เป็น accessible name ที่มั่นคง
- **แก้ไข**:
  ```tsx
  <button
    type="button"
    onClick={startEdit}
    aria-label={`แก้ไขชื่อเอกสาร ${displayName}`}
    className="block w-full text-left"
  >
  ```

### M4. ExportDialog — ปุ่ม "คัดลอก" ไม่มี live region แจ้งสถานะ
- **ไฟล์**: `src/components/editor/ExportDialog.tsx` บรรทัด 209–216 และ 294–301
- **ปัญหา**: เมื่อกดคัดลอก ข้อความเปลี่ยนจาก "คัดลอก" เป็น "คัดลอกแล้ว" แต่ไม่มี `aria-live="polite"` region สำหรับ announce สถานะ
- **ผลกระทบ**: Screen reader users ไม่ทราบว่าคัดลอกสำเร็จหรือไม่
- **แก้ไข**:
  ```tsx
  <button … aria-live="polite" aria-atomic="true">
    {copied ? "คัดลอกแล้ว" : "คัดลอก"}
  </button>
  ```
  หรือเพิ่ม `<span aria-live="polite" className="sr-only">{copied ? "คัดลอก HTML แล้ว" : ""}</span>`

### M5. PageSetupDialog — inputs ไม่มี `aria-invalid` / error messaging
- **ไฟล์**: `src/components/editor/PageSetupDialog.tsx` บรรทัด 113–127
- **ปัญหา**: `<input type="number" min={0} max={100}>` ถ้า user ใส่ค่าเกิน 100 browser จะ block แต่ไม่มี `aria-invalid` หรือ error text ที่ screen reader อ่านได้
- **ผลกระทบ**: Screen reader users ไม่ทราบว่าทำไมค่าไม่ถูกต้อง หรือทำไมปุ่ม Save ไม่ทำงาน
- **แก้ไข**:
  ```tsx
  <input
    type="number"
    min={0} max={100}
    aria-describedby={`margin-${side}-hint`}
    aria-invalid={draft.marginMm[side] > 100 || draft.marginMm[side] < 0}
  />
  <span id={`margin-${side}-hint`} className="sr-only">ค่าตั้งแต่ 0 ถึง 100 มม.</span>
  ```

### M6. Loading overlay ไม่มี `role="status"`
- **ไฟล์**: `src/components/editor/EditorShell.tsx` บรรทัด 524–531
- **ปัญหา**: Overlay "กำลังโหลดไฟล์…" มี spinner แต่ไม่มี `role="status"` หรือ `aria-live`
- **ผลกระทบ**: Screen reader อาจไม่อ่านว่ากำลังโหลด หรืออ่านแคบ "กำลังโหลดไฟล์" แต่ไม่ announce ว่าเป็น progress
- **แก้ไข**:
  ```tsx
  <div role="status" aria-live="polite" className="absolute inset-0 z-50 …">
    <Loader2 className="size-5 animate-spin …" aria-hidden="true" />
    <span>กำลังโหลดไฟล์…</span>
  </div>
  ```

### M7. Drag overlay ไม่มี `aria-hidden`
- **ไฟล์**: `src/components/editor/EditorShell.tsx` บรรทัด 500–522
- **ปัญหา**: Drag overlay (`pointer-events-none absolute inset-0`) เป็น visual-only แต่ไม่มี `aria-hidden="true"`
- **ผลกระทบ**: Screen reader อาจพยายามอ่าน content ใน overlay แม้จะเป็น non-interactive
- **แก้ไข**:
  ```tsx
  <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 …">
  ```

### M8. Image alt text ใช้ชื่อไฟล์โดยอัตโนมัติ — ไม่มีความหมาย
- **ไฟล์**: `src/components/editor/EditorShell.tsx` บรรทัด 355, `src/components/editor/InsertMenu.tsx` บรรทัด 33
- **ปัญหา**: `alt: finalFile.name` หรือ `alt: file.name` ส่งผลให้ alt text เป็น "IMG_20240101.jpg" ซึ่งไม่มีความหมาย
- **ผลกระทบ**: Screen reader users ได้ยินแต่ชื่อไฟล์ ไม่ทราบเนื้อหาของรูปภาพ
- **แก้ไข**: เปิด prompt ให้ user ระบุ alt text หรือใช้ default ที่ดีกว่า:
  ```ts
  const alt = window.prompt("คำอธิบายรูปภาพ (Alt text):", finalFile.name) || finalFile.name;
  editor.chain().focus().setImage({ src, alt }).run();
  ```

### M9. `focus-visible:ring-offset-2` อาจหายใน dark mode
- **ไฟล์**: `src/components/ui/Button.tsx` บรรทัด 10
- **ปัญหา**: `focus-visible:ring-offset-2` + `ring-offset-background` ถ้า background สีมืดมากและ ring color ใกล้เคียงกัน offset อาจไม่ชัดเจนพอ
- **ผลกระทบ**: Keyboard users อาจไม่เห็น focus indicator ชัดเจนใน dark mode
- **แก้ไข**: เพิ่ม `focus-visible:ring-offset-background` ที่มี contrast ชัด หรือใช้ `outline` แทน `ring`:
  ```ts
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]"
  ```

### M10. SearchPanel ไม่มี live region สำหรับจำนวน match
- **ไฟล์**: `src/components/editor/SearchPanel.tsx`
- **ปัญหา**: ไม่มี `aria-live` แจ้งว่าพบกี่ match / อยู่ที่ match ที่เท่าไหร่
- **ผลกระทบ**: Screen reader users ไม่ทราบว่าการค้นหาพบผลลัพธ์หรือไม่
- **แก้ไข**: หาก search extension ให้ข้อมูล match count ให้ render:
  ```tsx
  <span aria-live="polite" className="sr-only">
    {matchCount > 0 ? `พบ ${matchCount} รายการ` : "ไม่พบผลลัพธ์"}
  </span>
  ```

---

## Low

### L1. MenuItem shortcut text อ่านยากสำหรับ screen reader
- **ไฟล์**: `src/components/editor/menu/primitives.tsx` บรรทัด 80–84
- **ปัญหา**: `<span>{shortcut}</span>` อยู่ภายใน menu item แต่ไม่มี `aria-hidden` หรือ `aria-keyshortcuts`
- **ผลกระทบ**: Screen reader อาจอ่าน "Ctrl บวก Z" ซึ่งไม่ชัดเจนเท่า "Ctrl+Z"
- **แก้ไข**:
  ```tsx
  {shortcut && (
    <span aria-hidden="true" className="ml-8 text-[10px] …">{shortcut}</span>
  )}
  ```
  และเพิ่ม `aria-keyshortcuts` บน `<DropdownMenu.Item>` ถ้า Radix รองรับ (ปกติไม่รองรับโดยตรง แต่ใส่ `aria-keyshortcuts` บน element ก็ได้)

### L2. SourcePane textarea มีทั้ง `aria-label` และ `aria-labelledby`
- **ไฟล์**: `src/components/editor/EditorShell.tsx` บรรทัด 45–47
- **ปัญหา**: `aria-label` และ `aria-labelledby` อยู่บน element เดียวกัน ทำให้ browser อาจสับสนว่าจะใช้อันไหน (spec ให้ `aria-labelledby` มี priority สูงกว่า)
- **ผลกระทบ**: ไม่รุนแรง แต่เป็น redundancy
- **แก้ไข**: ลบ `aria-label` ออก หรือใช้อย่างใดอย่างหนึ่ง:
  ```tsx
  <textarea aria-labelledby="source-pane-label" … />
  ```

### L3. `window.confirm` ใช้ native browser dialog — ไม่สวยแต่ accessible
- **ไฟล์**: หลายไฟล์ (เช่น `HistoryPanel.tsx`, `ToolsMenu.tsx`)
- **ปัญหา**: `window.confirm()` เป็น browser-native dialog ซึ่ง screen reader รองรับดี แต่ styling ไม่สอดคล้องกับ app และไม่มี heading/label ที่ control ได้
- **ผลกระทบ**: ไม่ใช่ a11y blocker แต่เป็น UI polish ที่ควรใช้ custom confirm dialog ถ้าต้องการ consistency
- **แก้ไข**: ใช้ Radix AlertDialog แทน `window.confirm`

### L4. EmptyHint ใช้ `aria-hidden="true"` แต่ Tiptap placeholder ไม่ announce
- **ไฟล์**: `src/components/editor/VisualEditor.tsx` บรรทัด 212
- **ปัญหา**: `EmptyHint` ซ่อนไว้จาก screen reader (ดี) แต่ ProseMirror/Tiptap placeholder ไม่ expose ให้ screen reader ทำให้ editor ดูเหมือน empty โดยไม่มีคำแนะนำ (ซ้ำกับ H5)
- **ผลกระทบ**: Low เพราะ user อาจรู้จาก heading หรือ surrounding context
- **แก้ไข**: ดู H5

### L5. Footer link "GitHub" ไม่มี `aria-label` บอก destination
- **ไฟล์**: `src/components/landing/Footer.tsx` บรรทัด 31–37
- **ปัญหา**: Link text "GitHub" ไม่บอกว่าไปที่ไหน (เช่น "GitHub repository") แต่ก็ยังพอเข้าใจได้
- **ผลกระทบ**: น้อยมาก
- **แก้ไข**:
  ```tsx
  <a href="https://github.com" aria-label="GitHub repository">GitHub</a>
  ```

### L6. `@media print` ซ่อน `.search-panel` แต่ SearchPanel ไม่มี class นั้น
- **ไฟล์**: `src/app/globals.css` บรรทัด 390
- **ปัญหา**: CSS selector `.search-panel` ไม่มีใน DOM (SearchPanel ใช้ class จาก Tailwind utility classes) ทำให้ print styles ไม่จับ SearchPanel ได้ถ้า user เปิดไว้ขณะพิมพ์
- **ผลกระทบ**: ถ้า SearchPanel เปิดอยู่ขณะพิมพ์ อาจยังแสดงอยู่บน print output
- **แก้ไข**: เพิ่ม class `.search-panel` ให้ SearchPanel root div หรือใช้ selector อื่นที่จับได้

---

## สรุปจำนวนปัญหา

| ระดับ | จำนวน |
|---|---|
| Critical | 3 |
| High | 6 |
| Medium | 10 |
| Low | 6 |
| **รวม** | **25** |

---

## แนะนำลำดับการแก้ไข (Priority Roadmap)

1. **แก้ C1 (lang="th")** — 1 บรรทัด ผลกระทบสูงมาก
2. **แก้ C3 (Ruler keyboard)** — เพิ่ม `tabIndex`, `role="slider"`, `onKeyDown`
3. **แก้ H1 (Color contrast)** — เปลี่ยน `--color-muted-foreground` เป็น `#52525b`
4. **แก้ H2 + H3 (Form labels)** — เพิ่ม `htmlFor` + `id` ให้ SearchPanel และ ExportDialog
5. **แก้ H4 (SearchPanel focus)** — Focus trap + return focus
6. **แก้ H5 (Editor placeholder)** — เพิ่ม `aria-describedby` + hidden hint
7. **แก้ H6 (Skip link)** — เพิ่ม skip navigation ใน layout.tsx
8. **แก้ C2 (MobileBlock i18n)** — แปลเป็นภาษาไทย
9. **แก้ M1–M10 (Medium items)** — badge label, nav label, live regions, aria-invalid, loading status, drag overlay, alt text, focus ring
10. **แก้ L1–L6 (Low / Polish)** — shortcut formatting, confirm dialog, print selector cleanup
