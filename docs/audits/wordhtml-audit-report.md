# Code Quality & Bug Hunt Audit Report — wordhtml

**Audit Date:** 2025-05-04  
**Repository:** `/mnt/agents/wordhtml`  
**Stack:** Next.js 16 + Tiptap v3 + TypeScript + Tailwind v4 (client-side only)  
**Scope:** 60+ source files across `src/store`, `src/lib`, `src/components`, `src/types`, `src/app`

---

## Executive Summary

พบปัญหาทั้งหมด **28 รายการ** แบ่งเป็น:
- **Critical** 6 รายการ — crash, data loss, security issue
- **High** 9 รายการ — functionality impact อย่างมาก
- **Medium** 9 รายการ — code smell / missing error handling / edge cases
- **Low** 4 รายการ — style / type / minor improvements

---

## 🔴 Critical

### C1. `dangerouslySetInnerHTML` รับค่าผู้ใช้โดยตรงโดยไม่ sanitize — XSS Potential
**ไฟล์:** `src/components/editor/ProcessedContent.tsx` บรรทัด 46  
**โค้ด:**
```tsx
<article dangerouslySetInnerHTML={{ __html: html }} />
```
**ปัญหา:** `html` prop มาจาก `processTemplate()` ซึ่ง `replaceVariables()` ใช้ `escapeHtml()` แต่ `expandRepeatingRows()` ใช้ DOM parsing + `.innerHTML` assignment ที่ไม่ escape ค่า variable ใน attribute context เช่น `<img src="{{url}}">` หรือ `<a href="{{link}}">`  
**ผลกระทบ:** Attacker สามารถ inject `<script>` ผ่าน variable value ที่ไม่ได้ escape ใน attribute context  
**แนะนำ:**
```tsx
// ใช้ DOMPurify หรือทำ attribute escaping ก่อน dangerouslySetInnerHTML
import DOMPurify from 'dompurify';
const safeHtml = typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html;
```

---

### C2. `triggerDownload` สร้าง `<a>` element แต่ไม่ remove จาก DOM — DOM Leak
**ไฟล์:** `src/lib/export/wrap.ts` บรรทัด 92-103  
**โค้ด:**
```ts
const a = document.createElement("a");
a.href = url;
a.download = fileName;
a.style.display = "none";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
setTimeout(() => URL.revokeObjectURL(url), 1_000);
```
**ปัญหา:** ถ้า `a.click()` เกิด error หรือ component unmount ระหว่าง `setTimeout`, `removeChild` อาจ fail และ element ค้างใน DOM แบบ hidden  
**ผลกระทบ:** Memory leak + สะสม hidden anchors ใน DOM  
**แนะนำ:**
```ts
export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  
  const cleanup = () => {
    URL.revokeObjectURL(url);
    if (a.parentNode) a.parentNode.removeChild(a);
  };
  
  a.addEventListener("click", cleanup, { once: true });
  document.body.appendChild(a);
  a.click();
  // Fallback revoke
  setTimeout(cleanup, 5_000);
}
```

---

### C3. `extractImages` — `atob()` บน base64 ที่ malformed จะ throw ทันที
**ไฟล์:** `src/lib/images.ts` บรรทัด 48-66  
**โค้ด:**
```ts
const match = src.match(/^data:([^;]+);base64,(.+)$/);
// ...
const blob = base64ToBlob(base64, mimeType); // atob inside
```
**ปัญหา:** ถ้า mammoth.js สร้าง base64 data URI ที่ไม่สมบูรณ์ หรือมี whitespace/invalid chars, `atob()` จะ throw `InvalidCharacterError` ทำให้ export ZIP ทั้งกระบวนการ crash  
**ผลกระทบ:** Export ZIP crash, user สูญเสีย progress  
**แนะนำ:**
```ts
function base64ToBlob(base64: string, mimeType: string): Blob | null {
  try {
    const binary = atob(base64);
    // ...
  } catch {
    console.error("[images] Invalid base64 data URI, skipping");
    return null;
  }
}
// ใน extractImages:
const blob = base64ToBlob(base64, mimeType);
if (!blob) return; // skip this image
```

---

### C4. `batchConvert` — ไม่มี try/catch รอบ `docxToHtml` ทำให้ไฟล์เดียวพัง = ทั้ง batch พัง
**ไฟล์:** `src/lib/batchConvert.ts` บรรทัด 22-27  
**โค้ด:**
```ts
for (let i = 0; i < docxFiles.length; i++) {
  const file = docxFiles[i];
  const result = await docxToHtml(file);
  // ...
}
```
**ปัญหา:** ถ้าไฟล์ใดไฟล์หนึ่ง corrupted หรือ mammoth.js throw, Promise chain ทั้งหมด reject ทั้งๆ ที่ไฟล์อื่นอาจ convert ได้  
**ผลกระทบ:** User อัปโหลด 50 ไฟล์ แต่ไฟล์ที่ 3 พัง = ไม่ได้ไฟล์ใดเลย  
**แนะนำ:**
```ts
for (const file of docxFiles) {
  try {
    const result = await docxToHtml(file);
    const html = wrapAsDocument(result.html, file.name.replace(/\.docx$/i, ""));
    zip.file(deriveSafeFileName(file.name), html);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    zip.file(`${deriveSafeFileName(file.name)}.ERROR.txt`, `Conversion failed: ${msg}`);
  }
}
```

---

### C5. `templateEngine.ts` — module-level `VAR_REGEX` ใช้ `.lastIndex = 0` แก้ปัญหา regex state แต่ยังมี race condition risk
**ไฟล์:** `src/lib/templateEngine.ts` บรรทัด 3  
**โค้ด:**
```ts
const VAR_REGEX = /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/g;
```
**ปัญหา:** ถ้า `VAR_REGEX` ถูกใช้ concurrently (web worker, async iteration, หรือ re-entrant call) โดยที่ flag `g` มี global state (`lastIndex`) การ reset ด้วย `.lastIndex = 0` หลังใช้งานอาจไม่ทัน  
**ผลกระทบ:** Variable บางตัวอาจไม่ถูก detect/replace ใน async context  
**แนะนำ:** สร้าง regex instance ใหม่ทุกครั้ง:
```ts
function getVarRegex(): RegExp {
  return /\{\{([A-Za-z_\u0E00-\u0E7F][\w\u0E00-\u0E7F_]*)\}\}/g;
}
```

---

### C6. `EditorShell.tsx` onDrop handler — `loadFile()` ใน branch "others" ไม่มี try/catch
**ไฟล์:** `src/components/editor/EditorShell.tsx` บรรทัด 372-376  
**โค้ด:**
```tsx
if (others.length > 0) {
  const file = others[0];
  await loadFile(file);
  useToastStore.getState().show(`โหลดไฟล์ ${file.name} แล้ว`, "success");
}
```
**ปัญหา:** `loadFile` อาจ throw (เช่น file ไม่รองรับ, mammoth error) และ exception จะ bubble ออกจาก event handler ทำให้ drag-overlay ค้าง (`setIsDragging(false)` อาจไม่ถูกเรียกถ้า throw ก่อน)  
**ผลกระทบ:** UI ค้างใน dragging state, overlay ไม่หาย  
**แนะนำ:**
```tsx
if (others.length > 0) {
  const file = others[0];
  try {
    await loadFile(file);
    useToastStore.getState().show(`โหลดไฟล์ ${file.name} แล้ว`, "success");
  } catch {
    useToastStore.getState().show(`ไม่สามารถโหลด ${file.name}`, "error");
  }
}
```

---

## 🟠 High

### H1. `pasteCleanup.ts` — regex หลายตัวบน HTML ขนาดใหญ่อาจ cause ReDoS / catastrophic backtracking
**ไฟล์:** `src/lib/conversion/pasteCleanup.ts` บรรทัด 16, 19, 22, 25, 28, 31, 41, 45  
**โค้ดที่เสี่ยง:**
```ts
html = html.replace(/<!--\[if[\s\S]*?<!\[endif\]-->/g, "");        // บรรทัด 16
html = html.replace(/<style[\s\S]*?<\/style>/gi, "");             // บรรทัด 19
html = html.replace(/<\/?(o|w|m|v):[^>]*>/gi, "");                 // บรรทัด 25
html = html.replace(/\sstyle=["']([^"']*)["']/gi, (_, styles) => { // บรรทัด 31
```
**ปัญหา:** Word อาจส่ง HTML ขนาดหลาย MB พร้อม `<style>` block ยาวมาก หรือ conditional comments ซ้อนกันลึก `([\s\S]*?)` lazy quantifier อาจทำให้ regex engine backtrack จำนวนมาก  
**ผลกระทบ:** Browser tab freeze หรือ crash ระหว่าง paste  
**แนะนำ:** ใช้ DOMParser-based cleanup เป็นหลักสำหรับ input ขนาด > 100KB:
```ts
export function cleanPastedHtml(input: string): string {
  if (!input) return "";
  if (input.length > 100_000) {
    // DOM-based path for large input
    const doc = new DOMParser().parseFromString(input, "text/html");
    // ... remove elements by tag/querySelector
    return doc.body.innerHTML;
  }
  // regex path for small input (fast)
  // ...
}
```

---

### H2. `loadHtmlFile.ts` — `extractBody` regex บน HTML ขนาดใหญ่อาจ catastrophic backtracking
**ไฟล์:** `src/lib/conversion/loadHtmlFile.ts` บรรทัด 17  
**โค้ด:**
```ts
const match = input.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
```
**ปัญหา:** ถ้า HTML ไม่มี `</body>` ปิดท้าย (malformed) regex engine จะ scan จนถึงท้าย string แล้ว backtrack ทั้ง string ยาวๆ  
**ผลกระทบ:** Browser freeze on large malformed HTML  
**แนะนำ:** ใช้ DOMParser:
```ts
function extractBody(input: string): string {
  const doc = new DOMParser().parseFromString(input, "text/html");
  return doc.body.innerHTML;
}
```

---

### H3. `VisualEditor.tsx` `handlePaste` — ไม่ await async image operations, `editorRef.current` อาจ null
**ไฟล์:** `src/components/editor/VisualEditor.tsx` บรรทัด 134-165  
**โค้ด:**
```ts
for (const file of imageFiles) {
  compressImageIfEnabled(file, autoCompress)
    .then((finalFile) => readFileAsDataURL(finalFile))
    .then((src) => {
      const ed = editorRef.current;
      if (ed) ed.chain().focus().setImage({ src, alt: file.name }).run();
    })
    .catch(() => { /* fallback */ });
}
```
**ปัญหา:**
1. Loop ไม่ await — ถ้า user วาง 10 รูปพร้อมกัน จะ trigger 10 concurrent compression tasks
2. `editorRef.current` อาจเป็น null ถ้า component unmount ระหว่าง compression (แม้จะ check แต่เป็น fire-and-forget)
3. `file.name` ใน closure ของ `.catch()` อาจ reference ตัวสุดท้ายของ loop ถ้า var hoisting (แต่ `for...of` ไม่มีปัญหานี้)
4. ไม่มี cleanup/abort ถ้า component unmount  
**ผลกระทบ:** Memory pressure, potential crash บนอุปกรณ์ low-end  
**แนะนำ:**
```ts
handlePaste: async (_view, event) => {
  const files = event.clipboardData?.files;
  if (!files?.length) return false;
  const imageFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
  if (!imageFiles.length) return false;
  event.preventDefault();
  const autoCompress = useEditorStore.getState().autoCompressImages;
  
  for (const file of imageFiles) {
    try {
      const finalFile = await compressImageIfEnabled(file, autoCompress);
      const src = await readFileAsDataURL(finalFile);
      editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run();
    } catch {
      try {
        const src = await readFileAsDataURL(file);
        editorRef.current?.chain().focus().setImage({ src, alt: file.name }).run();
      } catch {
        useToastStore.getState().show(`ไม่สามารถแทรกรูป ${file.name}`, "error");
      }
    }
  }
  return true;
}
```

---

### H4. `downloadDocx` — `asBlob` จาก `html-docx-js` อาจ throw แต่ไม่มี try/catch
**ไฟล์:** `src/lib/export/exportDocx.ts` บรรทัด 14-25  
**โค้ด:**
```ts
const { asBlob } = await import("html-docx-js/dist/html-docx");
const document = wrapAsDocument(html, title);
const blob = asBlob(document);
triggerDownload(blob, deriveFileName(sourceName, "docx"));
```
**ปัญหา:** `html-docx-js` อาจ throw ถ้า HTML มี table ที่ซับซ้อน, image ที่ไม่รองรับ, หรือ malformed  
**ผลกระทบ:** Export dialog spinner ค้าง (`busy` ไม่ถูก reset เพราะ `finally` อยู่ใน caller `ExportDialog.tsx` — แต่ถ้า throw ก่อน `triggerDownload` จริงๆ ก็ถูก caught ใน `handleDownload` แล้ว)  
**แนะนำ:** ตรวจสอบว่า `ExportDialog.tsx` `handleDownload` catch ครอบคลุมแล้ว แต่ควร throw error ที่มีประโยชน์:
```ts
export async function downloadDocx(html: string, options: DownloadDocxOptions = {}): Promise<void> {
  const { sourceName = null, title = "Document" } = options;
  try {
    const { asBlob } = await import("html-docx-js/dist/html-docx");
    const document = wrapAsDocument(html, title);
    const blob = asBlob(document);
    if (!(blob instanceof Blob)) {
      throw new Error("html-docx-js did not return a valid Blob");
    }
    triggerDownload(blob, deriveFileName(sourceName, "docx"));
  } catch (e) {
    throw new Error(`DOCX export failed: ${e instanceof Error ? e.message : 'unknown'}`);
  }
}
```

---

### H5. `EditorShell.tsx` `processedHtml` useMemo — `processTemplate` อาจ throw ทำให้ component crash
**ไฟล์:** `src/components/editor/EditorShell.tsx` บรรทัด 277-285  
**โค้ด:**
```ts
const processedHtml = useMemo(() => {
  if (previewMode !== "preview" || !templateMode) return "";
  // ...
  return processTemplate(documentHtml, variables, mergedRow).html;
}, [previewMode, templateMode, documentHtml, variables, dataSet]);
```
**ปัญหา:** `processTemplate` ใช้ DOMParser + DOM manipulation ที่อาจ throw ถ้า `documentHtml` มี HTML ที่ทำให้ parser ทำงานผิดปกติ หรือ `expandRepeatingRows` มี bug  
**ผลกระทบ:** Template preview tab ทั้งหน้า crash (white screen)  
**แนะนำ:**
```ts
const processedHtml = useMemo(() => {
  if (previewMode !== "preview" || !templateMode) return "";
  try {
    const dataRow = dataSet?.rows[dataSet.currentRowIndex] ?? {};
    const variableFallback = Object.fromEntries(
      variables.map((v) => [v.name, v.isList ? (v.listValues ?? []).join(", ") : v.value])
    );
    const mergedRow = { ...variableFallback, ...dataRow };
    return processTemplate(documentHtml, variables, mergedRow).html;
  } catch (e) {
    console.error("Template preview error:", e);
    return `<p style="color:#dc2626">Template preview error: ${e instanceof Error ? e.message : 'unknown'}</p>`;
  }
}, [previewMode, templateMode, documentHtml, variables, dataSet]);
```

---

### H6. `SearchPanel.tsx` — type assertion `editor.commands as unknown as SearchCommands` อันตราย
**ไฟล์:** `src/components/editor/SearchPanel.tsx` บรรทัด 39-40, 47-48, 70-71  
**โค้ด:**
```ts
const commands = editor.commands as unknown as SearchCommands;
commands.setSearchTerm?.(searchTerm);
```
**ปัญหา:** ถ้า Tiptap version เปลี่ยน หรือ `SearchAndReplace` extension ไม่ loaded (เช่น dynamic import ในอนาคต) commands อาจไม่มี method ที่ต้องการ แต่ type assertion ซ่อนปัญหาไว้  
**ผลกระทบ:** Runtime error `commands.setSearchTerm is not a function`  
**แนะนำ:** Runtime check แทน assertion:
```ts
function getSearchCommands(editor: Editor | null): SearchCommands | null {
  if (!editor) return null;
  const cmds = editor.commands as Record<string, unknown>;
  if (typeof cmds.setSearchTerm === 'function') return cmds as SearchCommands;
  return null;
}
```

---

### H7. `exportMarkdown.ts` — TurndownService table rule ใช้ `node as HTMLTableElement` ไม่ปลอดภัย
**ไฟล์:** `src/lib/export/exportMarkdown.ts` บรรทัด 30  
**โค้ด:**
```ts
const table = node as HTMLTableElement;
const rows = Array.from(table.rows);
```
**ปัญหา:** ใน jsdom test environment หรือ SSR context, `node` อาจไม่ใช่ `HTMLTableElement` จริงๆ แม้จะ match filter "table"  
**ผลกระทบ:** Test อาจ fail หรือ runtime crash ใน non-browser environment  
**แนะนำ:**
```ts
if (!(node instanceof HTMLTableElement)) return "";
const rows = Array.from(node.rows);
```

---

### H8. `MultiPagePreview.tsx` — `PAGE_BREAK_REGEX` อาจ ReDoS บน HTML ขนาดใหญ่
**ไฟล์:** `src/components/editor/MultiPagePreview.tsx` บรรทัด 14  
**โค้ด:**
```ts
const PAGE_BREAK_REGEX = /<div[^>]*\bpage-break\b[^>]*>\s*<\/div>/gi;
```
**ปัญหา:** Regex นี้มี `[^>]*` ซึ่งต้อง backtrack ถ้า HTML มี `>` จำนวนมากหรือ div ที่ซ้อนกันลึก บน HTML ขนาดหลาย MB อาจ freeze  
**ผลกระทบ:** Browser freeze ระหว่าง preview เอกสารยาว  
**แนะนำ:** ใช้ DOMParser:
```ts
function splitByPageBreaks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const pages: string[] = [];
  let current = "";
  doc.body.childNodes.forEach((node) => {
    if (node instanceof HTMLElement && node.classList.contains("page-break")) {
      pages.push(current);
      current = "";
    } else {
      current += (node as Element).outerHTML ?? (node as Text).textContent ?? "";
    }
  });
  if (current || pages.length === 0) pages.push(current);
  return pages;
}
```

---

### H9. `plainTextFromHtml` — regex อาจ slow บน pathological input
**ไฟล์:** `src/lib/text.ts` บรรทัด 14  
**โค้ด:**
```ts
export function plainTextFromHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
```
**ปัญหา:** `/<[^>]+>/g` บน string ที่มี `<` จำนวนมากแต่ไม่มี `>` (เช่น HTML comment ยาว หรือ text ที่มี `<` ติดกันมากๆ) จะทำให้ regex engine scan ไปจนถึงท้าย string ทุกครั้ง  
**ผลกระทบ:** StatusBar เรียก `countWords` -> `plainTextFromHtml` ทุกครั้งที่ documentHtml เปลี่ยน บน HTML 10MB+ จะ freeze  
**แนะนำ:** ใช้ DOMParser path สำหรับ input ใหญ่:
```ts
export function plainTextFromHtml(html: string): string {
  if (html.length > 50_000) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return (doc.body.textContent ?? "").replace(/\s+/g, " ").trim();
  }
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
```

---

## 🟡 Medium

### M1. `PageSetupDialog.tsx` — `Number.parseInt` กับ `|| 0` ทำให้ margin ติดลบ = 0 โดยไม่ตั้งใจ
**ไฟล์:** `src/components/editor/PageSetupDialog.tsx` บรรทัด 120  
**โค้ด:**
```ts
const v = Number.parseInt(e.target.value, 10) || 0;
```
**ปัญหา:** User ต้องการพิมพ์ `-5` เพื่อลอง test แต่ `parseInt("-5") || 0` ได้ `-5` (truthy) ซึ่ง OK แต่ถ้าพิมพ์ช้าๆ เริ่มจาก `-` ตัวเดียว → `parseInt("-")` = `NaN` → `NaN || 0` = `0`  
**ผลกระทบ:** UX แปลกๆ ตอนพิมพ์ค่าติดลบ  
**แนะนำ:**
```ts
const v = Number.parseInt(e.target.value, 10);
const clamped = Number.isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
```

---

### M2. `indentExtension.ts` — `parseFloat(el.style.marginLeft) || 0` ไม่ handle "auto" / "inherit"
**ไฟล์:** `src/lib/tiptap/indentExtension.ts` บรรทัด 30  
**โค้ด:**
```ts
return parseFloat(el.style.marginLeft) || 0;
```
**ปัญหา:** `parseFloat("auto")` = `NaN` → `NaN || 0` = `0` ทำให้ paragraph ที่มี `style="margin-left: auto"` จาก Word ถูก reset เป็น 0 โดยไม่ตั้งใจ  
**ผลกระทบ:** Formatting loss บางกรณี  
**แนะนำ:**
```ts
const val = el.style.marginLeft;
if (!val || val === "auto" || val === "inherit") return 0;
const num = parseFloat(val);
return Number.isNaN(num) ? 0 : num;
```

---

### M3. `imageWithAlign.ts` — `parseHTML` อ่าน `el.style.width` โดยไม่ check HTMLElement
**ไฟล์:** `src/lib/tiptap/imageWithAlign.ts` บรรทัด 21-23  
**โค้ด:**
```ts
parseHTML: (el) => {
  const attr = el.getAttribute("width");
  if (attr) return attr;
  const styleW = el.style.width; // el อาจไม่ใช่ HTMLElement
```
**ปัญหา:** ใน jsdom หรือบาง parser, `el` อาจเป็น `Element` แต่ไม่ใช่ `HTMLElement` ทำให้ `style` property อาจไม่มี  
**ผลกระทบ:** Runtime error `Cannot read property 'width' of undefined`  
**แนะนำ:**
```ts
const styleW = el instanceof HTMLElement ? el.style.width : undefined;
```

---

### M4. `docxToHtml.ts` — ไม่ validate file size / type ก่อนอ่าน
**ไฟล์:** `src/lib/conversion/docxToHtml.ts` บรรทัด 22  
**โค้ด:**
```ts
export async function docxToHtml(file: File): Promise<ConvertResult> {
  const arrayBuffer = await file.arrayBuffer();
```
**ปัญหา:** ไม่มี file size cap ถ้า user อัปโหลด .docx ขนาด 500MB จะ allocate ArrayBuffer ขนาดใหญ่ทำให้ browser crash (OOM)  
**ผลกระทบ:** Browser tab crash  
**แนะนำ:**
```ts
const MAX_DOCX_SIZE = 50 * 1024 * 1024; // 50MB
export async function docxToHtml(file: File): Promise<ConvertResult> {
  if (file.size > MAX_DOCX_SIZE) {
    throw new Error(`ไฟล์ใหญ่เกินไป (ขีดจำกัด ${MAX_DOCX_SIZE / 1024 / 1024}MB)`);
  }
  // ...
}
```

---

### M5. `exportZip.ts` — `folder?.file()` อาจ silently fail ถ้า `folder` เป็น undefined (แม้จะเป็น edge case)
**ไฟล์:** `src/lib/export/exportZip.ts` บรรทัด 26-29  
**โค้ด:**
```ts
if (images.length > 0) {
  const folder = zip.folder("img");
  for (const image of images) {
    folder?.file(image.filename, image.blob);
  }
}
```
**ปัญหา:** `JSZip.folder()` อาจ return null ถ้า path ไม่ถูกต้อง แต่ "img" ควร OK เสมอ อย่างไรก็ตาม ถ้า `folder` เป็น null รูปภาพจะถูก silently skip โดยไม่แจ้ง user  
**แนะนำ:**
```ts
const folder = zip.folder("img");
if (!folder) throw new Error("Failed to create img folder in ZIP");
for (const image of images) {
  folder.file(image.filename, image.blob);
}
```

---

### M6. `UploadButton.tsx` — `accept` attribute เป็น hints เท่านั้น ไม่มี validation รอง
**ไฟล์:** `src/components/editor/UploadButton.tsx` บรรทัด 52  
**โค้ด:**
```tsx
<input type="file" accept=".docx,.html,.htm,.md" />
```
**ปัญหา:** User สามารถ bypass `accept` ได้ง่าย (เลือก All Files ใน file picker) หรือ rename extension แต่ `loadFile` ใน store มี check `.toLowerCase().endsWith()` อยู่แล้ว แต่ถ้า rename `.exe` เป็น `.docx` แล้วส่งให้ mammoth.js อ่าน อาจมี security concern  
**ผลกระทบ:** Low — mammoth.js จะ reject ถ้าไม่ใช่ valid docx แต่ควรมี MIME type validation รอง  
**แนะนำ:** ใน `loadFile` ของ store เพิ่ม MIME check:
```ts
if (lower.endsWith(".docx") && file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
  // warn or reject
}
```

---

### M7. `templateStore.ts` `parseTemplateExport` — type assertion ไม่ validate nested `pageSetup`
**ไฟล์:** `src/store/templateStore.ts` บรรทัด 56  
**โค้ด:**
```ts
return items as DocumentTemplate[];
```
**ปัญหา:** `pageSetup` ถูก check แค่ว่า truthy แต่ไม่ validate ว่าเป็น object ที่มี `size`, `orientation`, `marginMm` จริง ถ้า import ไฟล์ที่ `pageSetup` เป็น string หรือ array จะ crash ตอนใช้งาน  
**แนะนำ:**
```ts
function isValidPageSetup(v: unknown): v is PageSetup {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    (p.size === "A4" || p.size === "Letter") &&
    (p.orientation === "portrait" || p.orientation === "landscape") &&
    typeof p.marginMm === "object" && p.marginMm !== null &&
    typeof (p.marginMm as Record<string, unknown>).top === "number"
  );
}
```

---

### M8. `FormattingToolbar.tsx` — `window.prompt` รับ URL โดยไม่ validate
**ไฟล์:** `src/components/editor/FormattingToolbar.tsx` บรรทัด 293-306  
**โค้ด:**
```ts
const url = window.prompt("URL ของลิงก์", previous ?? "https://");
if (url === null) return;
if (url === "") { /* unset */ }
editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
```
**ปัญหา:** User สามารถใส่ `javascript:alert(1)` หรือ `data:text/html,<script>...` เป็น href ได้ ซึ่งเป็น potential XSS vector ถ้า exported HTML ถูกเปิดโดย browser อื่น  
**ผลกระทบ:** XSS ผ่าน malicious link (lower severity เพราะต้อง user action)  
**แนะนำ:**
```ts
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    return !["javascript:", "data:", "vbscript:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
// ใน toolbar:
if (!isSafeUrl(url)) {
  window.alert("URL ไม่ถูกต้อง");
  return;
}
```

---

### M9. `cleaners.ts` — `unwrapDeprecatedTags` ใช้ `.trim()` แต่ cleaner อื่นใช้ `!html` — ไม่ consistent
**ไฟล์:** `src/lib/cleaning/cleaners.ts` บรรทัด 160 vs 46  
**โค้ด:**
```ts
// removeInlineStyles
if (!html) return html;
// unwrapDeprecatedTags
if (!html.trim()) return html;
```
**ปัญหา:** `unwrapDeprecatedTags` จะ skip ถ้า html เป็น `"   "` (whitespace) แต่ `removeInlineStyles` จะ process `"   "` ผลลัพธ์ไม่ consistent ระหว่าง cleaners  
**แนะนำ:** ใช้ guard function ส่วนกลาง:
```ts
function shouldSkip(html: string): boolean {
  return !html || !html.trim();
}
```

---

## 🟢 Low

### L1. `editorStorage` `partialize` ใช้ key `_v` แต่ migration อ่าน `version`
**ไฟล์:** `src/lib/storage.ts` บรรทัด 20, `src/store/editorStore.ts` บรรทัด 296  
**โค้ด:**
```ts
// editorStore.ts partialize
partialize: (state) => ({ _v: 1, ... })
// storage.ts migrate
const version = (data["version"] as number) ?? 0;
```
**ปัญหา:** `partialize` ใช้ `_v` แต่ migration อ่าน `version` ทำให้ migration ไม่เคย trigger (version = 0 เสมอ)  
**ผลกระทบ:** Future migration จะไม่ทำงาน  
**แนะนำ:** ให้ตรงกัน:
```ts
partialize: (state) => ({ version: 1, ... })
```

---

### L2. `HeadingWithId`, `BulletListWithClass`, `imageWithAlign` — ใช้ `as string` type assertion หลายจุด
**ไฟล์:**
- `src/lib/tiptap/headingWithId.ts` บรรทัด 16
- `src/lib/tiptap/bulletListWithClass.ts` บรรทัด 15
- `src/lib/tiptap/imageWithAlign.ts` บรรทัด 14, 27, 44

**ปัญหา:** Type assertion ซ่อนความจริงว่า value อาจไม่ใช่ string จริงๆ (เช่น number จาก parseInt)  
**แนะนำ:** ใช้ runtime check:
```ts
renderHTML: (attrs) => {
  const className = typeof attrs.class === "string" ? attrs.class : "";
  if (!className) return {};
  return { class: className };
}
```

---

### L3. `TopBar.tsx` — `historyCount` เป็น number แต่ render ใน string context
**ไฟล์:** `src/components/editor/TopBar.tsx` บรรทัด 52  
**โค้ด:**
```tsx
{historyCount > 9 ? "9+" : historyCount}
```
**ปัญหา:** React จะ render number เป็น string อยู่แล้ว แต่ถ้า `historyCount` เป็น `0` จะ render "0" ซึ่ง truthy ใน JSX แต่ถ้าเกิดเป็น `NaN` หรือ `undefined` จะ crash  
**แนะนำ:**
```tsx
{historyCount > 9 ? "9+" : String(historyCount)}
```

---

### L4. `batchConvert.ts` — non-docx files ถูก silently skip โดยไม่ notify user
**ไฟล์:** `src/lib/batchConvert.ts` บรรทัด 19  
**โค้ด:**
```ts
const docxFiles = files.filter((f) => f.name.toLowerCase().endsWith(".docx"));
```
**ปัญหา:** ถ้า user อัปโหลด 5 ไฟล์ (3 docx + 2 pdf) จะ convert แค่ 3 ไฟล์โดยไม่บอกว่า 2 ไฟล์ถูก skip  
**ผลกระทบ:** User งงว่าทำไมไฟล์หาย  
**แนะนำ:** Return รายการไฟล์ที่ถูก skip:
```ts
export interface BatchConvertResult {
  blob: Blob;
  skipped: string[];
}
export async function batchConvert(files: File[]): Promise<BatchConvertResult> {
  const docxFiles = files.filter(f => f.name.toLowerCase().endsWith(".docx"));
  const skipped = files
    .filter(f => !f.name.toLowerCase().endsWith(".docx"))
    .map(f => f.name);
  // ...
  return { blob, skipped };
}
```

---

## 🔬 Additional Observations (Tests)

### T1. `cleaners.test.ts` — ไม่มี test สำหรับ malformed / edge-case HTML
**ไฟล์:** `src/lib/cleaning/cleaners.test.ts`  
**ขาด:**
- Test กับ HTML ที่มี nested tags ลึกมาก (>1000 levels)
- Test กับ HTML ที่มี `<script>` / `<style>` / event handlers
- Test กับ empty/whitespace-only input สำหรับทุก cleaner
- Test กับ Unicode/Thai characters

### T2. `pipeline.test.ts` — ไม่มี test สำหรับ invalid `CleanerKey`
**ไฟล์:** `src/lib/cleaning/pipeline.test.ts`  
**ขาด:**
- Test กับ enabled array ที่มี key ที่ไม่มีใน ORDER (เช่น `["unknownKey"]`)

---

## 📝 Summary Table

| ID | Severity | File | Line | Category |
|----|----------|------|------|----------|
| C1 | Critical | ProcessedContent.tsx | 46 | XSS (dangerouslySetInnerHTML) |
| C2 | Critical | wrap.ts | 92-103 | DOM leak (triggerDownload) |
| C3 | Critical | images.ts | 48-66 | Crash (atob on malformed base64) |
| C4 | Critical | batchConvert.ts | 22-27 | Data loss (batch without error isolation) |
| C5 | Critical | templateEngine.ts | 3 | Race condition (global regex with g flag) |
| C6 | Critical | EditorShell.tsx | 372-376 | UI freeze (uncaught async in drop) |
| H1 | High | pasteCleanup.ts | 16,19,25,31 | ReDoS (regex on large input) |
| H2 | High | loadHtmlFile.ts | 17 | ReDoS (body regex) |
| H3 | High | VisualEditor.tsx | 134-165 | Race/memory (fire-and-forget paste) |
| H4 | High | exportDocx.ts | 14-25 | Error handling (html-docx-js) |
| H5 | High | EditorShell.tsx | 277-285 | Component crash (unmemoized throw) |
| H6 | High | SearchPanel.tsx | 39-71 | Fragile type assertion |
| H7 | High | exportMarkdown.ts | 30 | Unsafe type cast |
| H8 | High | MultiPagePreview.tsx | 14 | ReDoS (page break regex) |
| H9 | High | text.ts | 14 | Performance (regex on large HTML) |
| M1 | Medium | PageSetupDialog.tsx | 120 | Logic (negative parseInt) |
| M2 | Medium | indentExtension.ts | 30 | Logic (auto/inherit margin) |
| M3 | Medium | imageWithAlign.ts | 21 | Runtime safety (HTMLElement check) |
| M4 | Medium | docxToHtml.ts | 22 | Validation (missing file size cap) |
| M5 | Medium | exportZip.ts | 26-29 | Silent failure (folder null) |
| M6 | Medium | UploadButton.tsx | 52 | Validation (accept bypass) |
| M7 | Medium | templateStore.ts | 56 | Validation (pageSetup structure) |
| M8 | Medium | FormattingToolbar.tsx | 293 | Security (unvalidated URL) |
| M9 | Medium | cleaners.ts | 160 | Consistency (empty check mismatch) |
| L1 | Low | storage.ts / editorStore.ts | 20, 296 | Migration key mismatch |
| L2 | Low | headingWithId.ts, bulletListWithClass.ts, imageWithAlign.ts | various | Type assertions |
| L3 | Low | TopBar.tsx | 52 | Rendering (number in JSX) |
| L4 | Low | batchConvert.ts | 19 | UX (silent skip) |

---

*End of Audit Report*
