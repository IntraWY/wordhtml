# wordhtml System Audit — Design Spec

> Audit date: 2026-05-07
> Scope: UX/UI friction, technical debt, and bugs/edge cases in the wordhtml static editor.

## Executive Summary

wordhtml is a mature static Next.js 16 app with 140 passing tests, successful builds, and a rich feature set (cleaners, rulers, template system, pagination, batch convert, dark mode, history, multi-format export). However, a systematic audit revealed **23 actionable issues** across three categories. This spec prioritizes them into quick wins, high-impact improvements, and strategic work.

---

## 1. UX/UI Issues (8 items)

### 1.1 README Out of Sync
**Finding:** README says "Tiptap v2" but the app uses v3. It lists only 3 export formats but the app supports HTML, ZIP, DOCX, Markdown, and GAS export.
**Impact:** Medium — confuses new contributors and users reading docs.
**Effort:** Low — update README.md.

### 1.2 Error Boundary Lacks Recovery
**Finding:** `ErrorBoundary.tsx` only offers a "Reload" button. No "Try Again", no state preservation, no error reporting.
**Impact:** Medium — users lose unsaved work on any crash.
**Effort:** Low — add retry/reset props and improve copy.

### 1.3 Inconsistent Loading States
**Finding:** Only `UploadButton` and `ExportDialog` show clear loading spinners. Paste, file open, template apply, and batch convert lack visual feedback.
**Impact:** High — users think the app is frozen during slow operations.
**Effort:** Medium — wire `isLoadingFile` or similar flags to UI.

### 1.4 Missing Skip-to-Content Link
**Finding:** No `sr-only` skip link exists. Keyboard users must tab through the entire toolbar before reaching the editor.
**Impact:** Medium — accessibility violation.
**Effort:** Low — add a single skip link in `layout.tsx` or `EditorShell.tsx`.

### 1.5 MobileBlock Too Aggressive
**Finding:** `MobileBlock.tsx` blocks all viewports below 768px. Tablets in landscape (e.g., iPad Mini 744px) are completely locked out even though they could handle read-only or limited editing.
**Impact:** Medium — loses tablet users.
**Effort:** Medium — allow read-only preview or raise threshold.

### 1.6 Export Dialog Lacks Cleaner Preview
**Finding:** Users toggle cleaners but cannot see the effect before exporting. They must download the file to verify.
**Impact:** Medium — trial-and-error export loop.
**Effort:** Medium — add a live preview pane in `ExportDialog.tsx`.

### 1.7 Vertical Ruler Missing Tooltips
**Finding:** Horizontal ruler shows tooltip labels when dragging margin handles. Vertical ruler has no equivalent.
**Impact:** Low — minor inconsistency.
**Effort:** Low — replicate tooltip pattern from horizontal to vertical.

### 1.8 LocalStorage Quota Errors Are Silent
**Finding:** `storage.ts` logs quota-exceeded errors to `console.error`. Users never see a toast or banner explaining why their snapshot was not saved.
**Impact:** Medium — data loss without explanation.
**Effort:** Low — emit a toast via `useToastStore` when quota is exceeded.

---

## 2. Technical Debt (9 items)

### 2.1 ESLint: 58 Problems
**Finding:** `npx eslint src` reports 35 errors and 23 warnings.
- `src/lib/tiptap/imageWithAlign.ts:6` — `ComponentType<any>`
- `src/hooks/useAutoPagination.ts:55` — `metrics` assigned but never used
- `src/hooks/useAutoPagination.ts:57` — missing `pageSetup` in `useMemo` deps
- `src/hooks/useKeyboardShortcuts.ts:18` — `openPageSetup` unused
- `src/lib/tiptap/paginationAware.ts:31,39` — `editor` defined but never used
- `src/lib/imageCompression.ts:32` — unused eslint-disable directive
**Impact:** High — blocks CI if strict, reduces code confidence.
**Effort:** Low — mechanical fixes.

### 2.2 Files Exceed 500 Lines
**Finding:**
- `Ruler.tsx` — 695 lines (complex interactive SVG + drag logic)
- `FormattingToolbar.tsx` — 518 lines (toolbar buttons + image handling)
- `EditorShell.tsx` — 493 lines (shell composition + event handling)
**Impact:** Medium — hard to review, test, and reason about.
**Effort:** High — requires careful extraction without breaking behavior.

### 2.3 Missing Component Tests
**Finding:** Only 12 test files exist. 48+ components and 13 library modules have zero tests.
**Untested critical paths:**
- `docxToHtml.ts`, `exportDocx.ts`, `exportZip.ts`, `exportHtml.ts`
- `paginationEngine.ts`, `batchConvert.ts`
- All menu components, dialogs, and panels
**Impact:** High — regressions go undetected.
**Effort:** High — large surface area.

### 2.4 `any` in Production Code
**Finding:**
- `imageWithAlign.ts:6` — `NodeViewComponent: ComponentType<any>`
- `VisualEditor.tsx:138` — `handleDrop(view: any, event: DragEvent)`
**Impact:** Medium — type safety holes.
**Effort:** Low — replace with `NodeViewProps` or `EditorView` types.

### 2.5 TODO in gasGenerator.ts
**Finding:** Line 139 contains: `// TODO: send email, create PDF, or save to Drive`
**Impact:** Low — dead comment.
**Effort:** Low — either implement or remove.

### 2.6 Dead Code / Unused Imports
**Finding:**
- `useAutoPagination.ts` — `metrics` variable computed but never read
- `useKeyboardShortcuts.ts` — `openPageSetup` imported but never wired
- `paginationAware.ts` — `editor` parameter in two methods is ignored
**Impact:** Low — clutter.
**Effort:** Low — delete.

### 2.7 Store Proliferation
**Finding:** Six separate Zustand stores: `editorStore`, `uiStore`, `toastStore`, `dialogStore`, `paginationStore`, `templateStore`. Some have tight coupling (e.g., `EditorShell` imports 5 stores).
**Impact:** Medium — harder to trace state changes.
**Effort:** Medium — could merge `uiStore` + `dialogStore` + `toastStore` into one surface store.

### 2.8 Missing Public API Types
**Finding:** Many exported functions in `lib/` lack explicit return types and JSDoc (e.g., `batchConvert.ts`, `exportZip.ts`, `toc.ts`).
**Impact:** Low — reduces IDE autocomplete quality.
**Effort:** Low — add return types.

### 2.9 console.error Without User Feedback
**Finding:** `storage.ts`, `batchConvert.ts`, `useDragAndDrop.ts`, `imageCompression.ts` all log errors to console but do not surface them in UI.
**Impact:** Medium — users never know something failed.
**Effort:** Medium — wire toasts or inline error states.

---

## 3. Bugs & Edge Cases (6 items)

### 3.1 useAutoPagination Missing Dependency
**Finding:** `useMemo` at line 55 depends on individual `pageSetup.marginMm.*` fields but omits `pageSetup` itself. If the object reference changes while field values stay the same, the memo could stale.
**Impact:** Medium — incorrect pagination metrics.
**Effort:** Low — add `pageSetup` to deps or destructure fully.

### 3.2 Keyboard Shortcut for Page Setup Is Dead
**Finding:** `useKeyboardShortcuts.ts` creates `openPageSetup` but never binds it to a key. The menu shows the shortcut text but no handler exists.
**Impact:** Low — broken shortcut promise.
**Effort:** Low — wire to a key (e.g., `Ctrl+Shift+P` if not conflicting).

### 3.3 Batch Convert Race Condition
**Finding:** `BatchUploadDialog.tsx` initiates conversions but does not cancel in-flight work if the dialog is closed mid-operation.
**Impact:** Medium — memory/CPU waste and potential state updates on unmounted component.
**Effort:** Medium — add `AbortController` or cleanup flag.

### 3.4 Image Compression Fails Silently
**Finding:** `imageCompression.ts` catches compression errors and falls back to the original image without notifying the user.
**Impact:** Low — unexpected file sizes.
**Effort:** Low — add a toast: "Compression failed; using original image."

### 3.5 Drag-and-Drop Error Is Invisible
**Finding:** `useDragAndDrop.ts:73` catches drop errors and logs to console. The user sees nothing if a dropped file is corrupted or oversized.
**Impact:** Low — confused users.
**Effort:** Low — surface via toast.

### 3.6 EditorShell Prop Drilling for Ruler Active State
**Finding:** `onRulerActive` is passed through `EditorShell` → `IndentRuler` → `Ruler`. This creates tight coupling for a purely UI concern.
**Impact:** Low — maintainability.
**Effort:** Medium — replace with a small context or event bus.

---

## Recommended Implementation Order

### Phase 1: Quick Wins (1-2 hours)
1. Fix all ESLint errors and warnings (2.1)
2. Remove dead code / unused imports (2.6)
3. Fix `useAutoPagination` missing dependency (3.1)
4. Update README (1.1)
5. Remove TODO comment or create issue (2.5)
6. Add return types to public `lib/` functions (2.8)

### Phase 2: UX Polish (2-4 hours)
7. Add skip-to-content link (1.4)
8. Improve Error Boundary with retry (1.2)
9. Add loading states to paste, open, template apply (1.3)
10. Surface LocalStorage quota errors via toast (1.8)
11. Surface drag-and-drop and compression errors (3.5, 3.4)
12. Add vertical ruler tooltips (1.7)

### Phase 3: Structural Improvements (4-8 hours)
13. Refactor `Ruler.tsx` into smaller modules (2.2)
14. Refactor `EditorShell.tsx` shell composition (2.2)
15. Add tests for critical untested modules (2.3)
16. Add cleaner preview to Export Dialog (1.6)
17. Wire dead keyboard shortcut for Page Setup (3.2)
18. Fix batch convert race condition (3.3)

### Phase 4: Strategic (future sprints)
19. Merge related stores (2.7)
20. Improve MobileBlock behavior (1.5)
21. Replace ruler prop drilling with context (3.6)

---

## Acceptance Criteria

- `npm run lint` passes with zero errors and zero warnings.
- `npm test` still passes (140+ tests).
- `npm run build` succeeds.
- All Phase 1 and Phase 2 items have observable UI or code improvements.
- No `any` types remain in `src/lib/tiptap/` or `src/components/editor/`.
- No unused variables or imports remain in `src/hooks/`.
