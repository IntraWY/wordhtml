# Implementation Plan: Bugfix Ruler / Font / Ribbon Active-State + Unit+E2E Tests

**Date:** 2026-06-05  
**Approach:** TDD — write failing test first per bug → fix → green  
**Constraint:** suite เดิม 193 tests ต้องเขียวตลอด

---

## Phase 0 — Documentation Discovery (DONE)

### Allowed APIs (verified from source)

**VisualEditor.tsx — extensions array (lines 129-186)**
- `Color` imported from `@tiptap/extension-color` — registered at **line 152** (no config)
- `FontFamily` imported from `@tiptap/extension-font-family` — registered at **line 171** (no config)
- `TextStyle` — **NOT imported, NOT registered** (confirmed root cause of Bug ①)
- Package `@tiptap/extension-text-style` v3.22.4 IS installed (`node_modules/` present)
- Export: `import { TextStyle } from "@tiptap/extension-text-style"`

**cleaners.ts — removeInlineStyles (lines 60-79)**
- KEEP array (lines 63-67): `"margin-left", "margin-right", "margin-top", "margin-bottom", "text-indent", "width", "height", "font-size", "color", "background-color", "line-height", "text-align"`
- `"font-family"` is **MISSING** from KEEP → stripped on export

**Ruler.tsx — handle elements**
- Left margin handle: lines **311-348** — `className={cn("absolute grid cursor-ew-resize place-items-center", hovered === "marginLeft" && "z-20")}` — no base z-index
- Left indent ▽ handle: lines **525-566** — `className={cn("absolute grid cursor-ew-resize place-items-center", hovered === "left" && "z-20")}` — no base z-index
- At `indentLeft=0`: both sit at identical x pixel (`leftPx === marginStart`), same DOM depth → indent renders after margin → **indent occludes margin click target**

**RibbonTabHome.tsx — active state**
- Bold button (line 266): `active={editor?.isActive("bold")}` — **direct call, not useEditorState**
- Italic (line 269), Underline (272), Strike (275): same pattern
- useEditorState (lines 67-105): only selects color/highlight/font/imageAlign/lineHeightMode/spaceBefore/spaceAfter — **NO bold/italic/align/list/heading**

**MobileToolbar.tsx — reference implementation (lines 77-89)**
```typescript
const state = useEditorState({
  editor,
  selector: ({ editor: e }) => ({
    bold: e?.isActive("bold") ?? false,
    italic: e?.isActive("italic") ?? false,
    underline: e?.isActive("underline") ?? false,
    strike: e?.isActive("strike") ?? false,
    align: (e?.getAttributes("paragraph")?.textAlign as string | undefined) ?? "left",
    bulletList: e?.isActive("bulletList") ?? false,
    orderedList: e?.isActive("orderedList") ?? false,
  }),
});
```

### Test Patterns Available to Copy

| Pattern | File | Use for |
|---------|------|---------|
| Headless Editor roundtrip | `src/lib/tiptap/paragraphFormat.roundtrip.test.ts` | Font/color unit test |
| Cleaner unit test | `src/lib/cleaning/cleaners.test.ts:15-28` | removeInlineStyles font-family |
| Ruler render + slider | `src/components/editor/Ruler.test.tsx:1-97` | Margin+indent occlusion |
| Ribbon mock editor | `src/components/editor/ribbon/RibbonTabInsert.test.tsx:1-47` | RibbonTabHome state test |
| E2E navigation | `tests/e2e/smoke.spec.ts` | Font/ruler/ribbon E2E |
| E2E ruler interaction | `tests/e2e/ruler-regression.spec.ts:49-77` | Ruler drag E2E |

### Anti-Patterns to Avoid
- **Do NOT** use `@tiptap/extension-text-style`'s built-in `FontSize` — the codebase has a custom `FontSize` mark (`src/lib/tiptap/fontSize.ts`) that is independent and working
- **Do NOT** add `TextStyle` after `Color`/`FontFamily` — must come **before** them in the array
- **Do NOT** raise z-index of margin handle without verifying indent triangle remains clickable at `indentLeft=0`
- **Do NOT** use `editor.isActive()` directly in JSX for new active-state additions — use `useEditorState`

---

## Phase 1 — Bug ① Fix: Font Family + Text Color (TDD)

**Goal:** `setFontFamily()` and `setColor()` actually apply. Font family survives export cleaner.

### Step 1.1 — Write failing unit tests FIRST

**File to create:** `src/lib/tiptap/fontFamily.test.ts`  
**Copy pattern from:** `src/lib/tiptap/paragraphFormat.roundtrip.test.ts`

```typescript
// Template — do not copy verbatim, adapt for fontFamily
import { afterEach, describe, expect, it } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import FontFamily from "@tiptap/extension-font-family";
import Color from "@tiptap/extension-color";
// NOTE: TextStyle intentionally OMITTED first run → tests should FAIL

function createEditor() {
  return new Editor({
    extensions: [StarterKit, FontFamily, Color], // NO TextStyle — must fail
    content: "<p>Hello</p>",
  });
}
```

Tests to write:
1. `setFontFamily("Sarabun")` → `getAttributes("textStyle").fontFamily` equals `"Sarabun"` → **must FAIL without TextStyle**
2. `setColor("#ff0000")` → `getAttributes("textStyle").color` equals `"#ff0000"` → **must FAIL without TextStyle**
3. After adding TextStyle: getHTML() contains `font-family:Sarabun` → **must FAIL without TextStyle**

**File to extend:** `src/lib/cleaning/cleaners.test.ts`

Add case to existing `removeInlineStyles` describe block:
```
it("preserves font-family style", () => {
  const html = `<p style="font-family:Sarabun"><span style="font-size:14px;font-family:Sarabun">x</span></p>`;
  const result = removeInlineStyles(html);
  expect(result).toMatch(/font-family:\s*Sarabun/);
});
```
**Must FAIL** on current code (KEEP missing "font-family").

Run `npm test` — confirm these tests fail for the stated reason before proceeding.

### Step 1.2 — Fix VisualEditor.tsx

**File:** `src/components/editor/VisualEditor.tsx`

1. Add import (after existing tiptap imports, before Color/FontFamily):
   ```typescript
   import { TextStyle } from "@tiptap/extension-text-style";
   ```
2. In extensions array, insert `TextStyle` **before** `Color` (currently line 152):
   ```typescript
   TextStyle,   // ← insert here (line ~152)
   Color,       // was line 152
   ```

**Verification grep after change:**
```
grep -n "TextStyle" src/components/editor/VisualEditor.tsx
# Must appear in both import AND extensions array, before Color
```

### Step 1.3 — Fix cleaners.ts

**File:** `src/lib/cleaning/cleaners.ts`

Add `"font-family"` to KEEP array (line 63-67). Final KEEP:
```typescript
const KEEP = [
  "margin-left", "margin-right", "margin-top", "margin-bottom",
  "text-indent", "width", "height",
  "font-size", "font-family",   // ← add "font-family"
  "color", "background-color", "line-height", "text-align",
];
```

### Step 1.4 — Round-trip test

Add to `fontFamily.test.ts` (now WITH TextStyle registered):
1. Apply font-family → get HTML → run `removeInlineStyles(html)` → assert `font-family:Sarabun` still present
2. Apply color → same round-trip

### Step 1.5 — Verify

```bash
npm test
# fontFamily.test.ts and cleaners.test.ts must now be GREEN
# All 193 existing tests must still pass
```

---

## Phase 2 — Bug ② Fix: Ruler Left-Margin Occlusion (TDD)

**Goal:** At `indentLeft=0`, both the left-margin handle AND left-indent triangle are independently clickable.

### Step 2.1 — Write failing unit test FIRST

**File to extend:** `src/components/editor/Ruler.test.tsx`

Add a new describe block "margin and indent handles co-exist at indentLeft=0":

```typescript
it("left margin handle is not occluded by indent handle at indentLeft=0", () => {
  const { container } = render(
    <Ruler
      orientation="horizontal"
      cm={21}
      marginStart={cmToPx(2.54)}
      marginEnd={cmToPx(2.54)}
      onMarginChange={vi.fn()}
      onIndentChange={vi.fn()}
      indentLeft={0}
      indentFirst={0}
    />
  );
  const marginHandle = screen.getByRole("slider", { name: /Left margin/i });
  const indentHandle = screen.getByRole("slider", { name: /Left indent/i });
  // Both must be in DOM
  expect(marginHandle).toBeInTheDocument();
  expect(indentHandle).toBeInTheDocument();
  // Margin handle must have higher base z-index than indent handle
  // (implementation check — CSS class or inline style)
  const marginClass = marginHandle.className;
  const indentClass = indentHandle.className;
  // After fix: margin handle should have z-10 always, indent should not
  expect(marginClass).toContain("z-10"); // FAILS on current code (no base z-index)
});
```

**Must FAIL** on current code. Confirm before fixing.

### Step 2.2 — Fix Ruler.tsx

**File:** `src/components/editor/Ruler.tsx`

**Left margin handle** (lines 327-329): Add `z-10` as base z-index (always applied), keep `z-20` on hover:
```typescript
className={cn(
  "absolute z-10 grid cursor-ew-resize place-items-center",  // ← add z-10
  hovered === "marginLeft" && "z-20"
)}
```

Apply same to right margin handle for consistency.

**Left indent ▽ handle** (lines 541-543): No base z-index change (stays at z-auto/z-0):
```typescript
className={cn(
  "absolute grid cursor-ew-resize place-items-center",  // no z-10
  hovered === "left" && "z-20"
)}
```

**Result:** Margin handles always sit above indent handles at default state. On hover, either can rise to z-20 (hover takes priority). Since user can only hover one at a time, no conflict.

### Step 2.3 — Anti-collision test (advisor requirement)

Add second test in same describe block:
```typescript
it("left indent handle is still clickable at indentLeft=0", () => {
  const onIndentChange = vi.fn();
  render(
    <Ruler ... onIndentChange={onIndentChange} indentLeft={0} indentFirst={0} />
  );
  const indentHandle = screen.getByRole("slider", { name: /Left indent/i });
  fireEvent.keyDown(indentHandle, { key: "ArrowRight" });
  expect(onIndentChange).toHaveBeenCalled(); // Both must work
});
```

### Step 2.4 — E2E: Ruler Drag Test

**File to create:** `tests/e2e/ruler-margin-drag.spec.ts`  
**Copy pattern from:** `tests/e2e/ruler-regression.spec.ts:49-77`

```typescript
test("can drag left margin handle independently of indent handle", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[contenteditable='true']").first()).toBeVisible();
  
  // Get left margin handle position
  const marginHandle = page.getByRole("slider", { name: /Left margin/i }).first();
  const box = await marginHandle.boundingBox();
  
  // Confirm elementFromPoint at handle center hits the margin handle, not indent
  const hitElement = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el?.getAttribute("aria-label") ?? "";
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
  
  expect(hitElement).toMatch(/Left margin/i);
});
```

### Step 2.5 — Verify

```bash
npm test
# Ruler.test.tsx new cases must be GREEN
# Existing 25 ruler tests must still pass
```

---

## Phase 3 — Bug ③ Fix: Ribbon Home Active-State (TDD)

**Goal:** Bold/Italic/Underline/Strike/Align/List/Heading highlight updates as cursor moves.

### Step 3.1 — Write failing unit test FIRST

**File to create:** `src/components/editor/ribbon/RibbonTabHome.state.test.tsx`  
**Copy mock pattern from:** `src/components/editor/ribbon/RibbonTabInsert.test.tsx`

```typescript
function createMockEditor(overrides = {}) {
  const isActive = vi.fn((name: string) => name === "bold"); // bold=true for test
  const editor = {
    chain: vi.fn(() => ({ focus: vi.fn().mockReturnThis(), run: vi.fn() })),
    isActive,
    getAttributes: vi.fn(() => ({})),
    can: vi.fn(() => ({ undo: () => false, redo: () => false })),
    ...overrides,
  } as unknown as Editor;
  return editor;
}

it("Bold button has active class when cursor is in bold text", () => {
  const editor = createMockEditor();
  render(<RibbonTabHome editor={editor} />);
  const boldBtn = screen.getByRole("button", { name: /ตัวหนา/i });
  // On current code: active state reads editor.isActive() at render only
  // After fix with useEditorState: must derive from reactive selector
  // This test verifies the button has the active visual class
  expect(boldBtn).toHaveClass("active"); // or check aria-pressed / bg class
  // NOTE: actual class name depends on RibbonButton implementation
});
```

**Inspect RibbonButton component** to find the exact `active` className pattern before writing assertion.

### Step 3.2 — Fix RibbonTabHome.tsx

**File:** `src/components/editor/ribbon/RibbonTabHome.tsx`

Add to existing `useEditorState` or consolidate into one call. Add these slices:
```typescript
const formatState = useEditorState({
  editor,
  selector: ({ editor: e }) => ({
    bold: e?.isActive("bold") ?? false,
    italic: e?.isActive("italic") ?? false,
    underline: e?.isActive("underline") ?? false,
    strike: e?.isActive("strike") ?? false,
    subscript: e?.isActive("subscript") ?? false,
    superscript: e?.isActive("superscript") ?? false,
    bulletList: e?.isActive("bulletList") ?? false,
    orderedList: e?.isActive("orderedList") ?? false,
    blockquote: e?.isActive("blockquote") ?? false,
    codeBlock: e?.isActive("codeBlock") ?? false,
    code: e?.isActive("code") ?? false,
    alignLeft: e?.isActive({ textAlign: "left" }) ?? false,
    alignCenter: e?.isActive({ textAlign: "center" }) ?? false,
    alignRight: e?.isActive({ textAlign: "right" }) ?? false,
    alignJustify: e?.isActive({ textAlign: "justify" }) ?? false,
    canUndo: e?.can().undo() ?? false,
    canRedo: e?.can().redo() ?? false,
    h1: e?.isActive("heading", { level: 1 }) ?? false,
    h2: e?.isActive("heading", { level: 2 }) ?? false,
    h3: e?.isActive("heading", { level: 3 }) ?? false,
  }),
});
```

Replace direct `editor?.isActive("bold")` calls with `formatState?.bold`, etc.

**Reference:** MobileToolbar.tsx lines 77-89 (exact same pattern).

### Step 3.3 — E2E: Active-State Test

**File to create:** `tests/e2e/ribbon-active-state.spec.ts`

```typescript
test("Bold button active state updates as cursor moves", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator("[contenteditable='true']").first();
  await editor.click();
  
  // Type bold text
  await page.keyboard.press("Control+b");
  await page.keyboard.type("bold text");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" normal text");
  
  // Click into bold text
  // ... (select bold portion)
  // Assert Bold button is active
  const boldBtn = page.getByRole("button", { name: /ตัวหนา/i });
  await expect(boldBtn).toHaveAttribute("data-active", "true"); // or aria-pressed
});
```

**NOTE:** Before writing this test, inspect RibbonButton's actual active indicator (aria-pressed / data-active / className) in the component source.

### Step 3.4 — Verify

```bash
npm test
# New ribbon state tests must be GREEN
# All existing tests still pass
```

---

## Phase 4 — Doc Drift Cleanup (non-code)

**File:** `CLAUDE.md`

Find and update the **File structure** section and **Design system** section that reference:
- `FontSelector.tsx` → now `src/components/editor/ribbon/RibbonTabHome.tsx` (font family in ribbon)
- `FontSizeSelector.tsx` → still exists at same path ✓
- `FormattingToolbar.tsx` → replaced by Ribbon system
- `MenuBar.tsx` and `menu/*.tsx` → replaced by `src/components/editor/ribbon/`
- `CleaningToolbar.tsx` → now `src/components/editor/ribbon/RibbonTabClean.tsx`

Also update the **Design system** section ruler description to match current architecture (no longer uses `EditorRulerBar` as mentioned; uses sticky ruler inside scroll container per Phase 5 changes).

**Do NOT rewrite the whole document** — surgical updates to specific mentions only.

---

## Phase 5 — Final Verification

```bash
# 1. Full unit test suite
npm test
# Expect: 193+ tests pass (new tests added, none removed)

# 2. TypeScript + lint
npm run lint
npm run build
# Expect: 0 errors, successful build

# 3. E2E suite
npx playwright test
# Expect: all existing E2E pass + new specs pass

# 4. Manual smoke (in browser)
# - Navigate to /app
# - Select text → pick font from Ribbon → verify applied
# - Select text → pick color → verify applied
# - Drag left margin handle on ruler → verify margin moves (not indent)
# - Type bold text → move cursor → verify Bold button highlights/unhighlights
```

---

## Summary Table

| Phase | Bug | Files Changed | Test Files Added/Modified |
|-------|-----|---------------|--------------------------|
| 1 | Font family + text color | `VisualEditor.tsx`, `cleaners.ts` | `fontFamily.test.ts` (new), `cleaners.test.ts` (extend) |
| 2 | Ruler left margin occluded | `Ruler.tsx` | `Ruler.test.tsx` (extend), `ruler-margin-drag.spec.ts` (new E2E) |
| 3 | Ribbon active-state stale | `RibbonTabHome.tsx` | `RibbonTabHome.state.test.tsx` (new), `ribbon-active-state.spec.ts` (new E2E) |
| 4 | Doc drift | `CLAUDE.md` | — |
| 5 | Verification | — | — |

---

## Session Handoff Notes

Each phase is self-contained. Start a new session with:
> "Execute Phase N of `docs/superpowers/plans/2026-06-05-bugfix-ruler-font-ribbon.md`"

The plan includes all file paths, line numbers, and exact API names found from source inspection. No assumptions — all facts verified from live code.
