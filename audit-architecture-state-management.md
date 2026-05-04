# Architecture & State Management Audit Report — wordhtml

**Audit Date**: Session  
**Framework Stack**: Next.js 16 (static export), Tiptap v3, Zustand, Tailwind v4  
**Audit Scope**: State management patterns, component boundaries, custom events, Tiptap extension architecture, data flow, separation of concerns

---

## Summary by Severity

| Severity | Count | Categories |
|----------|-------|------------|
| **Critical** | 6 | Store design, re-render cascade, bidirectional sync, cross-layer coupling, event type safety, SSR guards |
| **High** | 9 | God component, dialog fragmentation, derived state perf, type assertions, inconsistent state ownership |
| **Medium** | 8 | Selector patterns, barrel exports, prop drilling, useEffect reads, component decomposition |
| **Low** | 5 | Best practices, code style, memoization, hardcoded values |

---

## Critical (แก้ไขเร่งด่วน — สร้าง Bug / Performance ที่แก้ยาก)

### CR-1: EditorShell สมัครสมาน `documentHtml` ทำให้ Re-render ทั้ง Component Tree ทุกครั้งที่พิมพ์

**ไฟล์**: `src/components/editor/EditorShell.tsx` (lines 86, 275, 277–293)  
**ไฟล์**: `src/components/editor/VisualEditor.tsx` (line 40)

**ปัญหา**:  
- `EditorShell` มี `const documentHtml = useEditorStore((s) => s.documentHtml);` ที่ line 86  
- `SourcePane` (nested component ในไฟล์เดียวกัน, lines 34–35) ก็ subscribe `documentHtml` อีก  
- ทุกครั้งที่ผู้ใช้พิมพ์ตัวอักษรหนึ่งตัว Tiptap `onUpdate` → `setHtml()` → `documentHtml` เปลี่ยน → `EditorShell` re-render ทั้ง component  
- เนื่องจากไม่มี `React.memo` ใดๆ ใน component tree ลูกทั้งหมด (`TopBar`, `MenuBar`, `Ruler`, `StatusBar`, `FormattingToolbar`, dialogs ทั้งหมด) จึง re-render ตามไปด้วย

**ทำไมเป็น Anti-pattern**:  
- การ re-render component ที่เป็น layout shell (container) บ่อยๆ ทำให้ React ต้อง diff tree ใหญ่ทั้งก้อน  
- `useMemo` สำหรับ `pageCount` และ `processedHtml` ก็รันใหม่ทุก keystroke (regex + template engine)  
- `ResizeObserver` effect (line 275) มี `documentHtml` เป็น dependency → disconnect/reconnect ทุกครั้ง

**แนะนำ**:  
1. แยก `documentHtml` ออกจาก `EditorShell` — ให้ `EditorShell` subscribe เฉพาะ state ที่ไม่เปลี่ยนบ่อย (`pageSetup`, `sourceOpen`, `loadError`, `templateMode`, `previewMode`)  
2. สร้าง `DocumentContent` sub-component ที่ wrap `VisualEditor` และรับผิดชอบ `documentHtml` เพียงอย่างเดียว  
3. ใช้ `React.memo` กับ `TopBar`, `MenuBar`, `Ruler`, `StatusBar` เพราะ props ของพวกเขาเปลี่ยนน้อยมาก  
4. ย้าย `pageCount` และ `processedHtml` ไปเป็น **derived state ใน Zustand store** (หรือใช้ selector ที่ memoize) แทน compute ใน component

```tsx
// ตัวอย่าง derived state ใน store
const usePageCount = () => useEditorStore(
  useCallback((s) => {
    if (!s.documentHtml) return 1;
    const breaks = (s.documentHtml.match(/<div[^>]*\sclass=["'][^"']*\bpage-break\b[^"']*["'][^>]*>/gi) || []).length;
    return breaks + 1;
  }, [])
);
```

---

### CR-2: Store State Shape ผสม UI State + Document State + Business Logic ไว้ใน Store เดียว

**ไฟล์**: `src/store/editorStore.ts` (lines 39–98)

**ปัญหา**:  
- `EditorState` interface รวมทั้ง: `documentHtml`, `fileName`, `enabledCleaners`, `imageMode`, `exportDialogOpen`, `history`, `pageSetup`, `lastEditAt`, `isLoadingFile`, `loadError`, `sourceOpen`, `templateMode`, `variables`, `dataSet`, `previewMode`, `autoCompressImages`  
- UI state (`exportDialogOpen`, `sourceOpen`, `historyPanelOpen`, `isLoadingFile`) อยู่ร่วมกับ document state (`documentHtml`, `fileName`) และ business logic state (`enabledCleaners`, `imageMode`, `pageSetup`)  
- การ persist ทั้งหมดด้วย `partialize` ทำให้ต้องระวังมือตกข้อไม่ให้ persist state ที่ไม่ควร persist เช่น `isLoadingFile` (ซึ่งโชคดีที่ตอนนี้ไม่ได้ persist แต่เป็น human error รอวันเกิด)

**ทำไมเป็น Anti-pattern**:  
- Single store ใหญ่เกินไปทำให้ testing ยาก, code splitting ยาก, ไม่สามารถ lazy-load feature ได้  
- ทุก feature ที่เพิ่มต้องแกะ `editorStore.ts` ทำให้ file บวมเรื่อยๆ  
- มี risk ว่า UI state ที่ควร reset ตาม session อาจถูก persist โดย accident

**แนะนำ**:  
1. **Decompose เป็น 3 stores หลัก**:
   - `documentStore`: `documentHtml`, `fileName`, `lastEditAt`, `loadError`, `lastLoadWarnings`, `isLoadingFile`
   - `uiStore`: `exportDialogOpen`, `historyPanelOpen`, `sourceOpen`, `previewMode`
   - `settingsStore`: `pageSetup`, `enabledCleaners`, `imageMode`, `autoCompressImages`, `templateMode`, `variables`, `dataSet` (persisted)
2. หรือใช้ pattern **"slices" ใน Zustand** โดยแยกเป็น multiple `create` แล้ว compose ผ่าน context หรือ hooks

---

### CR-3: Tiptap ↔ Zustand Bidirectional Sync ด้วย `lastWrittenHtml` Ref เป็น Pattern เปราะบาง

**ไฟล์**: `src/components/editor/VisualEditor.tsx` (lines 45–184)

**ปัญหา**:  
- `onUpdate` (line 167–171): เมื่อ Tiptap มีการเปลี่ยนแปลง → `setHtml(html)` → update store  
- `useEffect` (line 178–184): เมื่อ store `documentHtml` เปลี่ยน → `editor.commands.setContent(...)` → update Tiptap  
- Guard loop ใช้ `lastWrittenHtml.current` ref เปรียบเทียบ string

**ทำไมเป็น Anti-pattern**:  
- เป็น "two sources of truth" — ทั้ง Tiptap internal state และ Zustand store มี HTML string  
- การ sync ด้วย string comparison มี edge case เช่น Tiptap v3 อาจ normalize HTML ทำให้ string ไม่ตรงกับที่ส่งเข้า  
- `setContent` ด้วย `emitUpdate: false` อาจทำให้ cursor position หายหรือ history stack ผิดปกติ  
- SourcePane (textarea) แก้ `documentHtml` โดยตรง → trigger `setContent` → อาจ reset cursor ใน Tiptap

**แนะนำ**:  
1. **Single source of truth ควรเป็น Tiptap Editor instance** — store ไม่ควรเก็บ `documentHtml` แบบ reactive string  
2. แทนที่ด้วย pattern: store เก็บ `documentHtml` เฉพาะตอน `onUpdate` (one-way Tiptap → Store) และตอน load/restore snapshot  
3. SourcePane ไม่ควรแก้ store โดยตรง ควรใช้ `editor.commands.setContent()` แล้วให้ `onUpdate` propogate กลับมา  
4. หรือใช้ **Tiptap's built-in storage / collaboration patterns** ถ้าต้องการ external state sync

---

### CR-4: `lib/tiptap/` Import Component จาก `components/editor/` — Layer Violation

**ไฟล์**: `src/lib/tiptap/imageWithAlign.ts` (line 3)  
**ไฟล์**: `src/lib/tiptap/indentExtension.ts`, `src/lib/tiptap/pageBreak.ts`, `src/lib/tiptap/variableMark.ts`

**ปัญหา**:  
- `imageWithAlign.ts` import `ImageResizeView` จาก `@/components/editor/ImageResizeView`  
- นี่หมายความว่า library code (`lib/`) ขึ้นอยู่กับ presentation layer (`components/`)

**ทำไว้เป็น Anti-pattern**:  
- สร้าง **circular dependency risk** — ถ้า `components/editor/` import อะไรจาก `lib/tiptap/` จะวนกลับมา  
- `lib/` ควรเป็น pure logic / extension definitions ไม่ควรรู้จัก React components  
- ทำให้ unit test extensions ยาก (ต้อง mock React component)

**แนะนำ**:  
1. ย้าย `ImageResizeView.tsx` ไปอยู่ใน `src/lib/tiptap/node-views/` หรือ `src/components/tiptap-views/`  
2. สร้าง barrel export สำหรับ Tiptap extensions (`src/lib/tiptap/index.ts`) ที่ re-export ทั้ง extension และ node view  
3. กำหนด convention: `lib/` import ได้แค่ `lib/`, `types/`, `utils/` — ห้าม import `components/`

---

### CR-5: Custom Events (`window.dispatchEvent`) ไม่มี Type Definition  centralized

**ไฟล์**: `src/components/editor/EditorShell.tsx` (lines 106–111, 165–169)  
**ไฟล์**: `src/components/editor/menu/ToolsMenu.tsx` (lines 57–89)  
**ไฟล์**: `src/components/editor/menu/FileMenu.tsx` (lines 33–40)  
**ไฟล์**: `src/components/editor/VariablePanel.tsx` (line 96)  
**ไฟล์**: `src/components/editor/UploadButton.tsx` (line 27)  
**ไฟล์**: `src/components/editor/BatchUploadDialog.tsx` (line 24)

**ปัญหา**:  
- Events: `wordhtml:open-search`, `wordhtml:open-page-setup`, `wordhtml:open-shortcuts`, `wordhtml:open-toc`, `wordhtml:open-templates`, `wordhtml:insert-variable`, `wordhtml:open-file`, `wordhtml:open-batch-convert`  
- ไม่มี `.d.ts` หรือ centralized type definition  
- `detail` payload ของ `wordhtml:insert-variable` ถูก cast ด้วย `(e as CustomEvent).detail as string` (EditorShell.tsx line 97)  
- ถ้ามี typo ใน event name (เช่น `wordhtml:open-toc` vs `wordhtml:open-toc-panel`) compiler ไม่เตือน

**ทำไมเป็น Anti-pattern**:  
- ใช้ DOM events สำหรับ cross-component communication ใน React app เป็น pattern ที่ละทิ้ง React's declarative data flow  
- ไม่มี type safety → bug จาก typo หาได้ยาก  
- การ cleanup `removeEventListener` ต้อง reference ฟังก์ชันเดิม — ถ้ามี refactoring อาจลืม cleanup  
- ยากต่อการ test (ต้อง mock DOM events)

**แนะนำ**:  
1. **ย้าย dialog open/close state เข้า Zustand store ทั้งหมด** (see HI-1)  
2. ถ้าต้องการใช้ custom events จริงๆ ให้สร้าง typed event bus:
```ts
// src/lib/events.ts
export const WORDHTML_EVENTS = {
  OPEN_SEARCH: 'wordhtml:open-search',
  // ...
} as const;

export type WordHtmlEventMap = {
  'wordhtml:insert-variable': { detail: string };
};
```
3. หรือดีกว่า: ใช้ **callback props หรือ store actions** แทน events เสมอใน React tree

---

### CR-6: `typeof window !== "undefined"` ใช้กระจัดกระจาย ไม่มี SSR Guard Pattern สม่ำเสมอ

**ไฟล์**: `src/store/editorStore.ts` (line 166)  
**ไฟล์**: `src/components/editor/menu/ToolsMenu.tsx` (lines 57, 67, 75, 85)  
**ไฟล์**: `src/components/editor/VariablePanel.tsx` (line 95)  
**ไฟล์**: `src/components/editor/UploadButton.tsx` (line 23)

**ปัญหา**:  
- แม้เป็น static export (`output: "export"`) Next.js ก็ยัง prerender ระหว่าง build time  
- `typeof window !== "undefined"` กระจัดกระจายใน component code หลายที่  
- `window.dispatchEvent` ใน store action (`triggerFileOpen`, line 165–169) มี guard แต่ใน component บางที่ไม่มี

**แนะนำ**:  
1. สร้าง utility `isBrowser()` หรือ `safeWindow`  
2. หรือดีกว่า: ใช้ Next.js dynamic import กับ `ssr: false` สำหรับ editor components (เพราะ editor ทำงาน client-side อยู่แล้ว)  
3. ตรวจสอบว่า `localStorage` access ใน `layout.tsx` theme script และ `storage.ts` มี guard ครบถ้วน (storage.ts มี try/catch ที่ดีแล้ว)

---

## High (State ไม่ Scalable / Component ทำหน้าที่มากเกินไป)

### HI-1: Dialog State กระจัดกระจาย — ไม่มี Centralized Dialog Manager

**ไฟล์**: `src/components/editor/EditorShell.tsx` (lines 60–63, 533–554)

**ปัญหา**:  
| Dialog | Open State | Trigger |
|--------|-----------|---------|
| `ExportDialog` | Store (`exportDialogOpen`) | Store action |
| `HistoryPanel` | Store (`historyPanelOpen`) | Store action |
| `TemplatePanel` | `templateStore.panelOpen` | Store action |
| `SearchPanel` | EditorShell local `searchOpen` | Custom event |
| `PageSetupDialog` | EditorShell local `pageSetupOpen` | Custom event |
| `ShortcutsPanel` | EditorShell local `shortcutsOpen` | Custom event |
| `TableOfContentsPanel` | EditorShell local `tocOpen` | Custom event |
| `BatchUploadDialog` | Self-contained `useState` | Custom event |

**ทำไมเป็น Anti-pattern**:  
- 8 dialogs มี 4 แบบของ state management  
- การเพิ่ม dialog ใหม่ต้องตัดสินใจว่าจะใส่ใน store / EditorShell / หรือ self-contained → inconsistency  
- ไม่มี pattern มาตรฐานสำหรับ dialog stacking, focus trap, หรือ "close all dialogs"

**แนะนำ**:  
1. สร้าง `dialogStore` แยก:
```ts
interface DialogState {
  openDialogs: Set<DialogId>;
  open: (id: DialogId) => void;
  close: (id: DialogId) => void;
  closeAll: () => void;
  isOpen: (id: DialogId) => boolean;
}
```
2. ให้ทุก dialog ใช้ `dialogStore` สำหรับ open/close state  
3. เก็บ dialog-specific data (เช่น `pendingExportFormat`) ใน dialog store slice แทน editor store

---

### HI-2: EditorShell เป็น God Component (560 lines, 10+ responsibilities)

**ไฟล์**: `src/components/editor/EditorShell.tsx`

**ปัญหา**:  
- ทำหน้าที่: layout shell, drag-drop handler, keyboard shortcuts, custom event bridge, cross-tab sync, beforeunload guard, ruler coordination, page calculation, template preview processing, fullscreen toggle, loading overlay, error/warning banners  
- 560 lines ใน component เดียว

**แนะนำ**:  
1. **Extract เป็น sub-components**:
   - `KeyboardShortcuts` (hooks-based, no UI)
   - `DragDropZone` (wrap children)
   - `BeforeUnloadGuard` (hooks-based)
   - `CrossTabSync` (hooks-based)
   - `EditorLayout` (pure layout)
2. **Extract custom hooks**:
   - `useKeyboardShortcuts(editor)`
   - `useDragDrop(handler)`
   - `useBeforeUnload()`
   - `useCrossTabRehydration()`
3. **Move dialog coordination ไป `DialogHost`** component ที่ render dialogs ทั้งหมดแยกจาก layout

---

### HI-3: Derived State (`pageCount`, `processedHtml`) คำนวณใน Component ไม่ใช่ Store

**ไฟล์**: `src/components/editor/EditorShell.tsx` (lines 277–293)

**ปัญหา**:  
- `pageCount` ใช้ regex `/class=["'][^"']*\bpage-break\b[^"']*["']/gi` scan ทั้ง `documentHtml` ทุก keystroke  
- `processedHtml` เรียก `processTemplate()` ทั้ง document ทุก keystroke เมื่ออยู่ preview mode  
- `StatusBar` เรียก `countWords(documentHtml)` และ `plainTextFromHtml(documentHtml)` ทุก keystroke

**แนะนำ**:  
1. ใช้ **Zustand derived state** ด้วย subscribe + selector:
```ts
// store หรือ hook
export const usePageCount = () => useEditorStore(
  (s) => {
    if (!s.documentHtml) return 1;
    const breaks = (s.documentHtml.match(/<div[^>]*\sclass=["'][^"']*\bpage-break\b[^"']*["'][^>]*>/gi) || []).length;
    return breaks + 1;
  }
);
```
2. สำหรับ `countWords` และ `plainTextFromHtml` ให้ใช้ `useMemo` ใน hook แยก หรือ compute ใน store  
3. พิจารณา **Web Worker** สำหรับ `processTemplate` ถ้า document ใหญ่

---

### HI-4: SearchPanel ใช้ `as unknown as SearchCommands` Bypass Type Safety

**ไฟล์**: `src/components/editor/SearchPanel.tsx` (lines 15–23, 40, 48, 70)

**ปัญหา**:  
```ts
type SearchCommands = {
  setSearchTerm?: (term: string) => boolean;
  // ...
};
const commands = editor.commands as unknown as SearchCommands;
commands.setSearchTerm?.(searchTerm);
```

**ทำไมเป็น Anti-pattern**:  
- `as unknown as` เป็น "type system off switch"  
- ถ้า `@sereneinserenade/tiptap-search-and-replace` เปลี่ยน API ในอนาคต compiler ไม่เตือน  
- ควร extend `Commands` interface ผ่าน module augmentation ของ Tiptap

**แนะนำ**:  
1. สร้าง type declaration file:
```ts
// src/types/tiptap-search.d.ts
import '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchAndReplace: {
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      // ...
    };
  }
}
```
2. ใช้ `editor.commands.setSearchTerm()` โดยตรงโดยไม่ต้อง cast

---

### HI-5: PageSetupDialog Draft State ไม่ Sync กับ Store เมื่อ Re-open

**ไฟล์**: `src/components/editor/PageSetupDialog.tsx` (line 23)

**ปัญหา**:  
```ts
const [draft, setDraft] = useState<PageSetup>(pageSetup);
```
- `useState`  initialize ครั้งเดียวตอน mount  
- ถ้า user เปลี่ยน page setup จากที่อื่น (เช่น ruler drag) แล้วเปิด dialog ใหม่ draft จะยังเป็นค่าเก่า

**แนะนำ**:  
```ts
useEffect(() => {
  if (open) {
    setDraft(pageSetup);
  }
}, [open, pageSetup]);
```

---

### HI-6: `SearchAndReplace` Extension Config อยู่ใน VisualEditor แต่ Commands ถูกใช้ใน SearchPanel

**ไฟล์**: `src/components/editor/VisualEditor.tsx` (lines 83–86)  
**ไฟล์**: `src/components/editor/SearchPanel.tsx` (lines 37–49)

**ปัญหา**:  
- Extension ถูก register ใน `VisualEditor` แต่การใช้ commands อยู่ใน `SearchPanel` อีก component  
- SearchPanel ต้องรู้ internal implementation detail ว่า extension มี commands อะไรบ้าง  
- ถ้า extension เปลี่ยน SearchPanel จะ broken

**แนะนำ**:  
1. สร้าง `useSearchAndReplace(editor)` hook ที่ encapsulate ทั้งการ config extension และการใช้ commands  
2. หรือสร้าง search commands ผ่าน store action ที่ proxy ไป editor

---

### HI-7: `useEditor` Extensions Array สร้าง Inline ทุก Render

**ไฟล์**: `src/components/editor/VisualEditor.tsx` (lines 51–93)

**ปัญหา**:  
- `extensions: [...]` เป็น array literal ใหม่ทุก render  
- `editorProps` เป็น object literal ใหม่ทุก render  
- `onUpdate` เป็น arrow function ใหม่ทุก render

**ทำไมเป็น Anti-pattern**:  
- `@tiptap/react` `useEditor` อาจ recreate editor ถ้า options reference เปลี่ยน (ขึ้นกับ internal implementation)  
- แม้ไม่ recreate ก็มี risk ของ stale closures

**แนะนำ**:  
```ts
const EXTENSIONS = [
  StarterKit.configure({ ... }),
  // ...
];

const EDITOR_PROPS = {
  attributes: { ... },
  transformPastedHTML: cleanPastedHtml,
  // ...
};

export function VisualEditor({ onEditorReady }: VisualEditorProps) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    editorProps: EDITOR_PROPS,
    // ...
  });
}
```

---

### HI-8: `VariablePanel` `useEffect` อ่าน Store ด้วย `getState()` แทน Selector

**ไฟล์**: `src/components/editor/VariablePanel.tsx` (lines 51–64)

**ปัญหา**:  
```ts
useEffect(() => {
  if (!templateMode) return;
  const detected = extractVariables(documentHtml);
  const currentVars = useEditorStore.getState().variables; // ← bypass subscription
  // ...
}, [documentHtml, templateMode, setVariables]);
```

**ทำไมเป็น Anti-pattern**:  
- `getState()` เป็น imperative read ที่ไม่ผูกกับ React lifecycle  
- ถ้า `variables` เปลี่ยนระหว่างที่ effect กำลังทำงาน (เช่น rapid typing) อาจได้ stale data  
- การใช้ `getState()` ใน event handler โอเค แต่ใน `useEffect` ที่ depend on state ควรใช้ selector hook แทน

**แนะนำ**:  
- ใช้ `const variables = useEditorStore((s) => s.variables);` แล้ว include `variables` ใน dependency array  
- หรือใช้ `subscribeWithSelector` middleware ถ้าต้องการ listen เฉพาะ state ที่ต้องการ

---

### HI-9: `MenuBar` Pass `editor` Prop ทุก Menu แม้บางตัวไม่ใช้

**ไฟล์**: `src/components/editor/MenuBar.tsx` (lines 19–37)  
**ไฟล์**: `src/components/editor/menu/FileMenu.tsx` (lines 12–13)  
**ไฟล์**: `src/components/editor/menu/ToolsMenu.tsx` (lines 12–13)

**ปัญหา**:  
- `FileMenu` ประกาศ `void _props` เพื่อ avoid unused variable error แต่ยังรับ `editor` prop  
- `ToolsMenu` ทำเหมือนกัน  
- นี่คือ **prop drilling** ที่ไม่จำเป็น

**แนะนำ**:  
1. ใช้ React Context สำหรับ `editor` instance:
```tsx
const EditorContext = createContext<Editor | null>(null);
export const useEditorInstance = () => useContext(EditorContext);
```
2. ให้ menu ที่ต้องการ `editor` ใช้ `useEditorInstance()` แทนรับ prop

---

## Medium (ควร Refactor แต่ยังไม่กระทบมาก)

### MD-1: ไม่มี Barrel Exports (`index.ts`) สำหรับ Component Groups

**ปัญหา**:  
- ทุก component import ด้วย path เต็ม เช่น `import { FileMenu } from "./menu/FileMenu"`  
- ไม่มี `src/components/editor/index.ts` หรือ `src/components/editor/menu/index.ts`

**แนะนำ**:  
```ts
// src/components/editor/menu/index.ts
export { FileMenu } from './FileMenu';
export { EditMenu } from './EditMenu';
// ...
```

---

### MD-2: `FormattingToolbar` ผสม `useEditorState` กับ Direct `editor.isActive()` Calls

**ไฟล์**: `src/components/editor/FormattingToolbar.tsx`

**ปัญหา**:  
- บาง state ใช้ `useEditorState` (lines 49–57): `textColor`, `highlightColor`, `isImage`, `imageAlign`  
- บาง state เรียก `editor.isActive(...)` ตรงๆ ใน JSX (เช่น line 99, 105, 126)  
- ทำให้ render behavior ไม่ consistent — `useEditorState` จะ batch updates แต่ direct calls รันทุก render

**แนะนำ**:  
- รวมทั้งหมดใน `useEditorState` selector เดียว หรือใช้ `useEditorInstance` + `useEditorState` อย่างสม่ำเสมอ

---

### MD-3: `TopBar` Render `HistoryPanel` เป็น Side Effect

**ไฟล์**: `src/components/editor/TopBar.tsx` (lines 12, 73)

**ปัญหา**:  
- `TopBar` import และ render `<HistoryPanel />` ภายใน return  
- `HistoryPanel` เป็น dialog ที่ควร render ที่ root level (เช่น `DialogHost`) ไม่ใช่ภายใน `TopBar`  
- ทำให้ `TopBar` มี hidden responsibility

**แนะนำ**:  
- ย้าย `HistoryPanel` ไป render ใน `EditorShell` ร่วมกับ dialogs อื่น หรือใน `DialogHost`

---

### MD-4: `templateStore.ts` Import Type จาก `editorStore.ts`

**ไฟล์**: `src/store/templateStore.ts` (line 3)

**ปัญหา**:  
```ts
import type { PageSetup } from "./editorStore";
```
- `templateStore` ขึ้นอยู่กับ type definition ของ `editorStore`

**แนะนำ**:  
- ย้าย `PageSetup` interface ไป `src/types/index.ts` ให้เป็น shared domain type  
- Store files ควร import types จาก `types/` ไม่ใช่จาก store อื่น

---

### MD-5: `ExportDialog` `cleanedHtml` Re-compute เมื่อ Dialog Open

**ไฟล์**: `src/components/editor/ExportDialog.tsx` (lines 56–59)

**ปัญหา**:  
```ts
const cleanedHtml = useMemo(() => {
  if (!open) return "";
  return applyCleaners(documentHtml, enabledCleaners);
}, [open, documentHtml, enabledCleaners]);
```
- `useMemo` return empty string เมื่อ dialog ปิด แต่ยัง subscribe `documentHtml` อยู่
- ทุกครั้งที่ `documentHtml` เปลี่ยน (ทุก keystroke) `useMemo` จะเปรียบเทียบ dependencies แม้ dialog ปิดอยู่

**แนะนำ**:  
- ใช้ pattern "compute on demand" หรือ compute ใน store action ตอนกด download แทน useMemo

---

### MD-6: `Ruler.tsx` มี Duplicate PX_PER_CM Constant

**ไฟล์**: `src/components/editor/Ruler.tsx` (line 6)  
**ไฟล์**: `src/lib/page.ts` (line 1)

**ปัญหา**:  
```ts
const PX_PER_CM = 794 / 21; // ~37.81  // ใน Ruler.tsx
export const PX_PER_CM = 794 / 21;     // ใน page.ts
```

**แนะนำ**:  
- Ruler import จาก `lib/page.ts` แทน duplicate

---

### MD-7: `StatusBar` Computations ไม่ Memoized

**ไฟล์**: `src/components/editor/StatusBar.tsx` (lines 18–19)

**ปัญหา**:  
```ts
const words = countWords(documentHtml);
const chars = plainTextFromHtml(documentHtml).length;
```
- เรียกทุก render แม้ `documentHtml` ไม่เปลี่ยน (ซึ่งมันเปลี่ยนบ่อยมาก)

**แนะนำ**:  
- ใช้ `useMemo` หรือย้ายไปเป็น derived state ใน store

---

### MD-8: `imageWithAlign.ts` `width`/`height` Parse Logic ซับซ้อน

**ไฟล์**: `src/lib/tiptap/imageWithAlign.ts` (lines 16–47)

**ปัญหา**:  
- `parseHTML` ตรวจสอบทั้ง `width` attribute, `style.width`, แล้ว normalize `px`  
- `renderHTML` แยก path ระหว่าง `%` width และ `px` width  
- Logic นี้ควรเป็น pure function ที่ testable แยกจาก extension definition

**แนะนำ**:  
- Extract helper functions `parseImageWidth(el)`, `renderImageWidth(width)` ไปไฟล์แยก

---

## Low (Best Practices แนะนำ)

### LO-1: ไม่มี `React.memo` ใช้ Anywhere ใน Editor Components

**ปัญหา**:  
- ไม่มี component ใดถูก wrap ด้วย `React.memo`  
- แม้จะใช้ Zustand selectors อย่างถูกต้อง แต่ parent re-render จะยังพา children re-render เสมอ

**แนะนำ**:  
- Wrap `MenuBar`, `TopBar`, `Ruler`, `StatusBar`, `CleaningToolbar` ด้วย `React.memo` เพราะ props stable  
- ใช้ `memo` กับ `FormattingToolbar` (prop `editor` อาจเปลี่ยน reference)

---

### LO-2: `next.config.ts` Hardcoded Build ID

**ไฟล์**: `next.config.ts` (lines 8–11)

**ปัญหา**:  
```ts
env: {
  BUILD_ID: "v20260504-001",
},
```
- ต้อง manual update ทุกครั้งที่ deploy

**แนะนำ**:  
- ใช้ `process.env.VERCEL_GIT_COMMIT_SHA` หรือ generate timestamp ตอน build

---

### LO-3: `EditorShell` Duplicate Store Subscriptions

**ไฟล์**: `src/components/editor/EditorShell.tsx`

**ปัญหา**:  
- `documentHtml` subscribe 2 ครั้ง (lines 34, 86)  
- `isLoadingFile` subscribe 2 ครั้ง (lines 35, 87)  
- Zustand handle ได้ แต่เป็น code smell

**แนะนำ**:  
- ลบ duplicate หรือ refactor `SourcePane` เป็น component แยก file

---

### LO-4: `PageBreak` NodeView สร้าง DOM ด้วย Imperative API

**ไฟล์**: `src/lib/tiptap/pageBreak.ts` (lines 47–86)

**ปัญหา**:  
```ts
addNodeView() {
  return () => {
    const dom = document.createElement("div");
    // imperative DOM construction
  };
}
```
- ทำงานได้ดี แต่ไม่ใช้ Tiptap React NodeView renderer (ที่มีอยู่แล้วใน `ImageWithAlign`)

**แนะนำ**:  
- พิจารณาใช้ `ReactNodeViewRenderer` สำหรับ consistency (ถ้าต้องการ complex UI) หรือทิ้งไว้ถ้า simple

---

### LO-5: `Tiptap` Extensions ไม่มี Centralized Registration / Configuration

**ไฟล์**: `src/components/editor/VisualEditor.tsx` (lines 51–93)

**ปัญหา**:  
- Extensions ถูก list เป็น array literal ใน component  
- ไม่มี extension discovery, plugin system, หรือ feature flags

**แนะนำ**:  
- สร้าง `src/lib/tiptap/extensions.ts`:
```ts
export function createExtensions(options: { enableSearch?: boolean }) {
  return [
    StarterKit.configure({ ... }),
    // ...
    options.enableSearch && SearchAndReplace.configure({ ... }),
  ].filter(Boolean);
}
```

---

## Appendix: Architecture Recommendations Summary

### 1. Store Refactor Priority
```
editorStore.ts          → แยกเป็น 3 stores (document, ui, settings)
templateStore.ts        → แยกออกมาเป็นส่วนหนึ่งของ settingsStore (หรือ standalone)
toastStore.ts           → ✅ OK (simple, focused)
dialogStore.ts          → สร้างใหม่ (centralized dialog state)
```

### 2. Component Decomposition Priority
```
EditorShell.tsx         → แยกเป็น 6+ sub-components/hooks
VisualEditor.tsx        → แยก extensions array, editor props ออกไป
ExportDialog.tsx        → แยก tab content เป็น sub-components
TopBar.tsx              → ย้าย HistoryPanel ออก
```

### 3. Data Flow Fix Priority
```
1. ย้าย derived state (pageCount, wordCount) เข้า store หรือ memoized hooks
2. แก้ bidirectional sync (lastWrittenHtml pattern)
3. รวม dialog state ให้ consistent
4. แทน custom events ด้วย store actions / callback props
```

### 4. Layer Boundary Fix
```
lib/tiptap/             → ห้าม import components/  (ย้าย ImageResizeView)
store/                  → ห้าม import components/  (ตรวจสอบ toastStore → OK)
components/editor/      → ควร import จาก lib/, types/, store/
```
