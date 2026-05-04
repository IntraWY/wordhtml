# UX & Interaction Audit Report — wordhtml

> จัดทำจากการอ่าน source code ทั้งหมดที่ระบุ (ไม่ได้ run app จริง) โดย UX & Interaction Expert
> วันที่ audit: ตามเวลาปัจจุบัน

---

## สรุปภาพรวม

แอปพลิเคชัน **wordhtml** เป็น Next.js 16 + Tiptap v3 + Tailwind v4 web app สำหรับแปลก Word ↔ HTML ที่มี visual editor + A4 preview ใน browser ทั้งหมด (client-side only) หลังจากอ่าน source code ครบถ้วนพบปัญหา UX/Interaction จำนวนมากที่ทำให้ app รู้สึก "ไม่ smooth" และไม่สมบูรณ์ โดยเฉพาะเรื่อง **focus management**, **dialog patterns**, **keyboard shortcuts ที่สับสน**, **mobile experience**, และ **visual feedback** ที่ขาดหายไป

---

## Critical — ใช้งานไม่ได้ / สับสนมาก

### 1. MobileBlock เป็น Hard Block โดยไม่มีทางเลือก
- **ไฟล์**: `src/components/MobileBlock.tsx` (บรรทัด 9–52)
- **ปัญหา**: บล็อกทุกหน้าจอที่ < 768px โดยไม่มีทางเลือกใช้งานแบบจำกัด แม้แต่ tablet ใน landscape mode ที่ width >= 768px แต่ height น้อยก็จะถูกบล็อกถ้า rotate ผิดทาง นอกจากนี้ landing page CTA ("เปิดโปรแกรมแก้ไข") พาไปหน้าที่ถูกบล็อกทันที ทำให้ UX ขาด continuity
- **แนะนำ**:
  - ใช้ `userAgent` + `touch` detection ร่วมกับ width
  - หรือแสดง warning แทน block พร้อมปุ่ม "ใช้งานต่อ" (Proceed at your own risk)
  - หรือ redirect จาก `/` บน mobile ไปหน้า landing พร้อม message

### 2. Keyboard Shortcuts ที่แสดงใน ShortcutsPanel ไม่ตรงกับ Implementation จริง
- **ไฟล์**: `src/components/editor/ShortcutsPanel.tsx` (บรรทัด 34–35) และ `src/components/editor/EditorShell.tsx` (บรรทัด 136–221)
- **ปัญหา**: ShortcutsPanel แสดง `Ctrl+E` = "จัดกึ่งกลาง (Center align)" แต่จริง ๆ:
  - `EditorShell.tsx` **ไม่มี handler สำหรับ `Ctrl+E` เลย**
  - `FormattingToolbar.tsx` (บรรทัด 332–337) ใช้ `Ctrl+E` สำหรับ "โค้ดบรรทัด (Inline Code)" ผ่าน ToolButton label
  - นี่คือ **conflicting shortcut** ระหว่างที่แสดงใน ShortcutsPanel กับที่ implement จริง ทำให้ผู้ใช้สับสนอย่างมาก
- **แนะนำ**:
  - ปรับ ShortcutsPanel ให้ตรงกับ implementation จริง
  - หรือ implement `Ctrl+E` ให้ตรงกับที่แสดง (แนะนำให้เปลี่ยนเป็น `Ctrl+Shift+E` สำหรับ inline code เนื่องจาก `Ctrl+E` เป็นที่รู้จักกันว่า center align)

### 3. Search Panel ไม่มี Focus Trap และไม่ย้าย Focus เมื่อเปิด
- **ไฟล์**: `src/components/editor/SearchPanel.tsx` (บรรทัด 31–141)
- **ปัญหา**: SearchPanel เป็น floating panel ไม่ใช่ Radix Dialog ไม่มี focus trap ผู้ใช้สามารถ `Tab` ออกไปนอก panel ได้ง่าย ไม่มี focus return เมื่อปิด ไม่มี scroll lock ไม่มี ARIA `role="dialog"` หรือ `aria-modal`
- **แนะนำ**:
  - ห่อ SearchPanel ใน Radix Dialog หรือใช้ `aria-modal="true"` + focus trap ด้วย `useFocusTrap` hook
  - เก็บ `previouslyFocusedElement` แล้ว restore focus เมื่อปิด

### 4. TableOfContentsPanel ไม่มี Focus Management เลย
- **ไฟล์**: `src/components/editor/TableOfContentsPanel.tsx` (บรรทัด 15–100)
- **ปัญหา**: เป็น floating panel ไม่ใช่ dialog ไม่มี initial focus, focus trap, หรือ focus return เมื่อปิด ไม่สมบูรณ์สำหรับ keyboard-only users
- **แนะนำ**:
  - ย้าย TOC ไปใส่ใน Radix Dialog หรือ Drawer component
  - หรือเพิ่ม focus trap + initial focus ที่ close button

---

## High — กระทบ experience อย่างมาก

### 5. Menu Dropdown ไม่มี Close-on-Click-Outside ที่ชัดเจน และไม่มี Focus Return
- **ไฟล์**: `src/components/editor/menu/primitives.tsx` (บรรทัด 14–42)
- **ปัญหา**: `MenuDropdown` ใช้ Radix DropdownMenu.Root แต่ไม่ expose `open` state จากภายนอก ทำให้ programmatic close ไม่ได้ ไม่มี focus return ไปที่ trigger เมื่อปิด menu นอกจากนี้เมนูย่อย (`MenuSub`) ใช้ hover trigger บน desktop แต่ไม่มี click trigger สำหรับ touch device (tablet ที่ width >= 768px อาจใช้ touch ได้)
- **แนะนำ**:
  - Expose `open` / `onOpenChange` prop จาก `MenuDropdown`
  - ใช้ `@radix-ui/react-dropdown-menu` แบบ controlled mode

### 6. Export Dialog ไม่มี Initial Focus และ Scroll Lock ไม่สมบูรณ์
- **ไฟล์**: `src/components/editor/ExportDialog.tsx` (บรรทัด 136–335)
- **ปัญหา**:
  - Dialog ใช้ Radix Dialog ซึ่งมี focus trap แต่เนื้อหายาวมาก initial focus ไปที่ไหนไม่ชัดเจน ผู้ใช้อาจต้อง `Tab` หลายครั้งถึงปุ่ม download
  - `cleanedHtml` คำนวณจาก `useMemo` ซึ่งอาจ heavy สำหรับเอกสารใหญ่ แต่ไม่มี loading state สำหรับ preview
  - ปุ่ม download ทั้งหมด disabled พร้อมกันเมื่อ `busy !== null` แต่ไม่มี visual indicator ว่ากำลัง download อยู่ นอกจาก spinner บนปุ่มที่กด (ผู้ใช้อาจไม่เห็นหาก scroll ลงไป)
- **แนะนำ**:
  - เพิ่ม `useEffect` สำหรับ initial focus ที่ปุ่ม primary action
  - เพิ่ม loading skeleton หรือ shimmer สำหรับ HTML preview
  - เพิ่ม global loading overlay ที่ disabled ทั้ง dialog เมื่อ busy

### 7. `window.prompt` / `window.confirm` / `window.alert` Anti-patterns กระจัดกระจายทั่ว App
- **ไฟล์หลายไฟล์**:
  - `EditorShell.tsx` บรรทัด 205 (`prompt` สำหรับ URL)
  - `EditMenu.tsx` บรรทัด 30 (`alert` สำหรับ copy error)
  - `InsertMenu.tsx` บรรทัด 21, 25, 36, 116 (`alert` หลายจุด)
  - `ToolsMenu.tsx` บรรทัด 25, 39, 50, 132 (`confirm` / `alert`)
  - `TemplatePanel.tsx` บรรทัด 50 (`confirm`)
  - `HistoryPanel.tsx` บรรทัด 54 (`confirm`)
- **ปัญหา**: `window.alert/confirm/prompt` เป็น blocking dialogs ที่หยุด JavaScript execution ทำให้ app ไม่ smooth ไม่มี styling ที่ consistent กับ app design system และไม่ accessible (screen reader อาจไม่ announce ถูกต้อง)
- **แนะนำ**:
  - สร้าง `ConfirmDialog`, `AlertDialog`, `PromptDialog` components ที่ใช้ Radix Dialog พร้อม focus trap และ consistent styling
  - แทนที่ทุก `window.*` call ด้วย dialogs เหล่านี้

### 8. History Panel — Rename onBlur Commit ทำให้ User ไม่ตั้งใจ Save
- **ไฟล์**: `src/components/editor/HistoryPanel.tsx` (บรรทัด 131–164)
- **ปัญหา**: `SnapshotRow` ใช้ `onBlur={commit}` ซึ่ง commit การเปลี่ยนชื่อทันทีเมื่อ click ออกนอก input ผู้ใช้อาจพิมพ์ชื่อแล้วไม่ตั้งใจ save
- **แนะนำ**:
  - ใช้ pattern เดียวกับ `TemplatePanel.tsx` ที่มี `keyHandledRef` + Enter/Escape handling
  - หรือเพิ่ม icon buttons (✓ / ✕) ข้าง ๆ input ระหว่าง rename

### 9. VariablePanel — onBlur with setTimeout Race Condition
- **ไฟล์**: `src/components/editor/VariablePanel.tsx` (บรรทัด 221–228)
- **ปัญหา**: `handleAddVariable` ใช้ `setTimeout(() => { ... }, 150)` ใน `onBlur` เป็น race condition ที่ไม่ reliable ถ้า browser ช้า 150ms อาจไม่พอ ทำให้ add variable หายไปกลางอากาศ
- **แนะนำ**:
  - ใช้ `mousedown` event แทน `click` เพื่อจับก่อน blur
  - หรือยกเลิก `onBlur` collapse แล้วใช้ Enter/Escape เท่านั้น

### 10. FormattingToolbar Active State ไม่ชัดเจน (Low Contrast)
- **ไฟล์**: `src/components/editor/FormattingToolbar.tsx` (บรรทัด 454–462)
- **ปัญหา**: `active` state ใช้ `bg-[color:var(--color-foreground)]` ซึ่งอาจเป็น dark gray บน light theme หรือ light gray บน dark theme ทำให้ contrast ไม่ชัดเจน ผู้ใช้ไม่รู้ว่าปุ่มไหน active อยู่
- **แนะนำ**:
  - ใช้ `bg-[color:var(--color-accent)]` สำหรับ active state (สี brand)
  - หรือเพิ่ม `ring` / `border` สำหรับ active state

---

## Medium — น่ารำคาญ แต่ยังใช้ได้

### 11. Menu i18n Naming ไม่ Consistent
- **ไฟล์หลายไฟล์ใน `src/components/editor/menu/`**
- **ปัญหา**: ชื่อ menu/item มีทั้งภาษาไทยและอังกฤษปนกัน เช่น `FileMenu.tsx` ใช้ "ไฟล์ (File)" แต่ items บางอันขาด (English) เช่น "ส่งออก HTML", "ส่งออก ZIP" ในขณะที่ "ตัวหนา (Bold)" มี (English) ทำให้ inconsistent
- **แนะนำ**:
  - สร้าง i18n dictionary ที่ consistent ทั้งไฟล์
  - ใช้ pattern: "ภาษาไทย (English)" ทุกรายการ หรือเลือกภาษาเดียวทั้งหมด

### 12. Toast ไม่มี Queue — Overwrite กัน
- **ไฟล์**: `src/components/editor/Toast.tsx` (บรรทัด 1–27)
- **ปัญหา**: Toast แสดง message เดียว ถ้ามีหลาย action ต่อเนื่อง (เช่น save snapshot + export + copy) toast หลังจะ overwrite toast แรกทันที ผู้ใช้อาจไม่เห็น feedback ของ action แรก
- **แนะนำ**:
  - Implement toast queue ด้วย `useState` array หรือ zustand store ที่เป็น array
  - แสดง toast ต่อเนื่องหรือ stack จากขวาล่าง

### 13. Search Panel ไม่มี Match Count และไม่มี Regex Toggle
- **ไฟล์**: `src/components/editor/SearchPanel.tsx` (บรรทัด 31–141)
- **ปัญหา**: SearchPanel ใช้ `@sereneinserenade/tiptap-search-and-replace` extension ซึ่งรองรับ regex (ดู `VisualEditor.tsx` บรรทัด 83–86 `disableRegex: false`) แต่ UI ไม่มี toggle สำหรับ regex mode ไม่มี match count (เช่น "3/10") ไม่มี case-sensitive toggle
- **แนะนำ**:
  - เพิ่ม match count indicator (เช่น "3/10")
  - เพิ่ม checkbox สำหรับ "Regex", "Case sensitive", "Whole word"

### 14. Drag & Drop Overlay ไม่มี Transition Animation
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 500–522)
- **ปัญหา**: `isDragging` state เปลี่ยนแล้วแสดง overlay ทันที แต่ไม่มี CSS transition หรือ animation เข้า/ออก ทำให้รู้สึกกระตุก
- **แนะนำ**:
  - เพิ่ม `transition-opacity duration-200` ให้ overlay
  - ใช้ `AnimatePresence` จาก Framer Motion หรือ `data-[state]` transition จาก Radix

### 15. StatusBar aria-live ประกาศบ่อยเกินไป
- **ไฟล์**: `src/components/editor/StatusBar.tsx` (บรรทัด 50–54)
- **ปัญหา**: `StatusBar` มี `aria-live="polite"` `aria-atomic="true"` แต่ข้อมูลเปลี่ยนทุกครั้งที่พิมพ์ (word count, char count, page count) ทำให้ screen reader ประกาศบ่อยมากและรำคาญ ไม่มี debounce
- **แนะนำ**:
  - เอา `aria-live` ออกจาก StatusBar แล้วใช้ `aria-live` เฉพาะส่วนที่ user ต้องการ feedback (เช่น export complete)
  - หรือ debounce aria-live updates (เช่น 2 วินาทีหลังหยุดพิมพ์)

### 16. BatchUploadDialog ไม่มี Drag & Drop Zone
- **ไฟล์**: `src/components/editor/BatchUploadDialog.tsx` (บรรทัด 57–169)
- **ปัญหา**: Dialog สำหรับ batch convert มีแค่ปุ่ม browse ไฟล์ ไม่มี drag & drop zone ใน dialog ทั้ง ๆ ที่ `EditorShell` มี drag & drop สำหรับ editor แต่ไม่สามารถ drop .docx หลายไฟล์ลงใน dialog นี้ได้โดยตรง
- **แนะนำ**:
  - เพิ่ม drag & drop zone ใน `BatchUploadDialog` พร้อม visual feedback

### 17. Ruler ไม่มี Touch Support และไม่มี Keyboard Support
- **ไฟล์**: `src/components/editor/Ruler.tsx` (บรรทัด 41–319)
- **ปัญหา**: Ruler รองรับ mouse drag สำหรับปรับ margin/indent แต่ไม่มี touch events (`touchstart`, `touchmove`, `touchend`) ทำให้ใช้งานบน tablet ไม่ได้ ไม่มี keyboard support (เช่น arrow keys สำหรับ fine-tune)
- **แนะนำ**:
  - เพิ่ม `tabIndex={0}` และ `onKeyDown` สำหรับ arrow keys (+/- 1mm)
  - เพิ่ม touch events สำหรับ mobile/tablet

### 18. ExportDialog ไม่มี Live Preview ของ Page Setup Changes
- **ไฟล์**: `src/components/editor/ExportDialog.tsx` (บรรทัด 136–335)
- **ปัญหา**: Export dialog แสดง HTML preview แต่ไม่มี live preview ของเอกสารที่ render จริง ผู้ใช้ต้อง download แล้วเปิดดูว่า page setup หรือ cleaning มีผลอย่างไร
- **แนะนำ**:
  - เพิ่ม iframe preview หรือ rendered preview ใน dialog
  - หรืออย่างน้อยแสดง diff view ระหว่าง raw HTML และ cleaned HTML

### 19. Landing Page Features สับสน (3 vs 4 Export Formats)
- **ไฟล์**: `src/components/landing/Features.tsx` (บรรทัด 22–26)
- **ปัญหา**: Features section บอก "ส่งออกได้ 3 รูปแบบ" แต่จริง ๆ มี 4 (HTML, ZIP, DOCX, Markdown) ทำให้สับสนและดูไม่ up-to-date
- **แนะนำ**:
  - เปลี่ยนเป็น "ส่งออกได้หลายรูปแบบ" หรือนับให้ถูกต้อง

### 20. MultiPagePreview ใช้ key={index} อาจมี Stability Problem
- **ไฟล์**: `src/components/editor/MultiPagePreview.tsx` (บรรทัด 27)
- **ปัญหา**: `pages.map((pageHtml, index) => <div key={index}>)` ใช้ index เป็น key ถ้า pages เปลี่ยนจำนวน React อาจ re-render หรือ preserve state ผิดพลาด
- **แนะนำ**:
  - ใช้ content hash หรือ stable identifier เป็น key

---

## Low — แนะนำปรับปรุงเล็กน้อย

### 21. TopBar ไม่มี Responsive Overflow Menu
- **ไฟล์**: `src/components/editor/TopBar.tsx` (บรรทัด 20–76)
- **ปัญหา**: บนหน้าจอแคบ (แต่ยัง > 768px เช่น 900px) ปุ่มต่าง ๆ ใน TopBar อาจ overlap ไม่มี hamburger menu หรือ collapsing behavior
- **แนะนำ**:
  - ใช้ `hidden md:flex` / `flex md:hidden` pattern สำหรับ compact layout

### 22. MenuBar gap-0.5 ทำให้ Click Accuracy ต่ำ
- **ไฟล์**: `src/components/editor/MenuBar.tsx` (บรรทัด 25)
- **ปัญหา**: `gap-0.5` (2px) ระหว่างเมนูทำให้พื้นที่ click target ชิดกันเกินไป อาจ misclick
- **แนะนำ**:
  - เพิ่มเป็น `gap-1` หรือ `gap-1.5` (4–6px)

### 23. PageSetupDialog ไม่มี Reset to Default
- **ไฟล์**: `src/components/editor/PageSetupDialog.tsx` (บรรทัด 16–146)
- **ปัญหา**: Dialog ไม่มีปุ่ม "รีเซ็ตเป็นค่าเริ่มต้น" ถ้า user ปรับ margin แล้วอยากกลับมา default ต้องจำค่าเดิมแล้วพิมพ์ใหม่
- **แนะนำ**:
  - เพิ่มปุ่ม "ค่าเริ่มต้น (Reset)" ใน footer

### 24. CleaningToolbar Overflow ใน ExportDialog
- **ไฟล์**: `src/components/editor/CleaningToolbar.tsx` (บรรทัด 10–43)
- **ปัญหา**: CleaningToolbar ใช้ `overflow-x-auto` แต่ไม่มี `scroll snap` หรือ visual indicator ว่ามี scrollbar
- **แนะนำ**:
  - เพิ่ม `-webkit-scrollbar` styling หรือ scroll hint
  - หรือ wrap เป็น 2 บรรทัดบนหน้าจอแคบ

### 25. ThemeToggle ไม่มี Label
- **ไฟล์**: `src/components/ThemeToggle.tsx` (inference จาก TopBar.tsx บรรทัด 41)
- **ปัญหา**: อยู่ใน TopBar แต่ไม่มี visible label หรือ tooltip (ถ้าไม่มี title attribute) ผู้ใช้ใหม่ไม่รู้ว่าปุ่มนี้ทำอะไร
- **แนะนำ**:
  - เพิ่ม `title` หรือ `aria-label` ที่ชัดเจน

### 26. VariablePanel Drag ไม่มี Visual Feedback
- **ไฟล์**: `src/components/editor/VariablePanel.tsx` (บรรทัด 125–128)
- **ปัญหา**: Variable row ใช้ `draggable` แต่ไม่มี `dragImage` หรือ visual feedback ระหว่าง drag
- **แนะนำ**:
  - ใช้ `e.dataTransfer.setDragImage()` สำหรับ custom drag preview
  - หรือเพิ่ม `dragging` class ที่เปลี่ยน opacity/border

### 27. ShortcutsPanel ไม่มี Search/Filter
- **ไฟล์**: `src/components/editor/ShortcutsPanel.tsx` (บรรทัด 38–111)
- **ปัญหา**: มี 17 shortcuts แต่ไม่มี search box หรือ filter ถ้าเพิ่ม shortcuts ในอนาคต ผู้ใช้อาจหาไม่เจอ
- **แนะนำ**:
  - เพิ่ม `input type="search"` สำหรับ filter shortcuts

### 28. MobileBlock Message ไม่มี Thai Translation
- **ไฟล์**: `src/components/MobileBlock.tsx` (บรรทัด 35–40)
- **ปัญหา**: MobileBlock แสดงข้อความภาษาอังกฤษล้วน ("wordhtml works best on desktop...") ทั้ง ๆ ที่ app ใช้ Thai เป็นหลัก
- **แนะนำ**:
  - แปลเป็นภาษาไทย: "wordhtml ใช้งานได้ดีที่สุดบนเดสก์ท็อป..."

### 29. Footer GitHub Link ไม่มี URL จริง
- **ไฟล์**: `src/components/landing/Footer.tsx` (บรรทัด 31–37)
- **ปัญหา**: Link GitHub ใช้ `href="https://github.com"` ไม่ใช่ repo จริง อาจสับสนว่าเป็น link ไป GitHub หน้าหลัก
- **แนะนำ**:
  - ใช้ URL repo จริง หรือเอาออกถ้ายังไม่มี

### 30. TemplateModeToggle ใช้ Inline Style สำหรับ Active State
- **ไฟล์**: `src/components/editor/TemplateModeToggle.tsx` (บรรทัด 25–29)
- **ปัญหา**: ใช้ `style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}` แทน CSS variable ทำให้ไม่ consistent กับ dark mode
- **แนะนำ**:
  - ใช้ CSS variable หรือ Tailwind class เช่น `bg-orange-100 text-orange-700`

---

## Bonus: Architecture / Pattern Issues ที่กระทบ UX

### A. Custom Event Bridge (`window.dispatchEvent`) ทำให้ Traceability ยาก
- **ไฟล์**: `src/components/editor/EditorShell.tsx` (บรรทัด 90–120)
- **ปัญหา**: ใช้ `window.addEventListener("wordhtml:*")` เป็น bridge ระหว่างเมนูและ shell ทำให้ data flow ไม่ชัดเจน debugging ยาก และอาจมี memory leak
- **แนะนำ**:
  - ใช้ React Context หรือ callback props สำหรับ communication ระหว่าง MenuBar ↔ EditorShell
  - หรือใช้ zustand store ที่เป็น global state สำหรับ panel visibility

### B. `useEditorState` ถูกใช้หลายที่ทำให้ Re-render บ่อย
- **ไฟล์หลายไฟล์**: `EditMenu.tsx`, `FormatMenu.tsx`, `TableMenu.tsx`
- **ปัญหา**: ทุกเมนูใช้ `useEditorState` แยกกัน ทำให้ทุกเมนู re-render เมื่อ selection เปลี่ยน
- **แนะนำ**:
  - ใช้ single `useEditorState` ใน `MenuBar` แล้ว pass ลงไป
  - หรือใช้ zustand store สำหรับ editor state ที่ memoized

### C. `lastWrittenHtml` Ref Pattern อาจ Race Condition
- **ไฟล์**: `src/components/editor/VisualEditor.tsx` (บรรทัด 48, 167–184)
- **ปัญหา**: ใช้ `lastWrittenHtml.current` เพื่อป้องกัน loop ระหว่าง store → editor → store แต่ถ้ามี async operation หรือ rapid update อาจมี race condition
- **แนะนำ**:
  - ใช้ `useRef` คู่กับ `useEffect` cleanup ที่ชัดเจน
  - หรือใช้ transaction-based update

---

## สรุป Priority Matrix

| Priority | Count | ประเด็นหลัก |
|----------|-------|------------|
| Critical | 4 | Mobile hard block, conflicting shortcuts, Search/TOC focus trap |
| High | 6 | Menu focus, Export dialog UX, window.* anti-patterns, rename onBlur, race condition, toolbar contrast |
| Medium | 10 | i18n, toast queue, search match count, DnD animation, status bar a11y, batch DnD, ruler touch, export preview, landing features, key stability |
| Low | 10 | Responsive topbar, menu gap, reset button, cleaning overflow, theme label, drag feedback, shortcut filter, mobile Thai, GitHub URL, inline style |

---

*รายงานจัดทำจากการอ่าน source code ทั้งหมดที่ระบุ โดยไม่ได้ run app จริง บางประเด็นอาจต้องทดสอบบน browser เพื่อยืนยัน*
