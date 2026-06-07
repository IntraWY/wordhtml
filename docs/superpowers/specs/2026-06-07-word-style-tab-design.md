# Word-style Tab Behavior — Design

> Status: **implemented & verified** (2026-06-07). 560 unit tests pass, lint + build clean, live tab-stop snapping confirmed.

## Problem

Pressing Tab in a normal paragraph felt "weird" compared to Microsoft Word.

Root cause (confirmed in code): the only live Tab handler — `ParagraphFormatExtension`
(`src/lib/tiptap/paragraphFormat.ts`) — **always indented the whole block by 0.5cm**,
regardless of caret position. Word instead behaves by position:

- caret at the very start of a paragraph → indent the block
- caret mid/end of text → insert a real **tab character** that snaps to the next **tab stop**

There was also stale documentation/dead code: CLAUDE.md claimed `VisualEditor.tsx`
inserted "4 spaces" on Tab, but no such handler existed — only a now-orphaned Backspace
branch that deleted a 4-space run.

A second, hidden breakage: the export cleaner `collapseSpaces` collapsed `\t` into a
single space (`/[ \t]+/g → " "`), so even if a tab were inserted it would not survive export.

## Approach (chosen: A — real tab char + CSS `tab-size`)

Insert a genuine `\t` character and let CSS `tab-size: 1.27cm` (Word default 0.5") snap it
to absolute tab stops measured from the line's content start. Most Word-accurate; minimal
code. Accepted side effect: paragraphs in exported HTML use `white-space: pre-wrap`, so
multiple spaces no longer collapse — which actually matches Word fidelity better.

Rejected: B (fixed-width inline-block tab node — no true stop snapping, more code),
C (bare `\t` with no tab-size grid — does not fix the feel).

## Changes

### 1. Position-aware Tab — `src/lib/tiptap/paragraphFormat.ts`
`addKeyboardShortcuts()` Tab / Shift-Tab rewritten:

| Condition | Action |
|---|---|
| code block | insert `\t` (was 4 spaces) |
| list item | `sinkListItem` (unchanged) |
| empty selection at `parentOffset === 0` of paragraph/heading | block indent +0.5cm (Word indents here) |
| selection spanning multiple blocks (`!$from.sameParent($to)`) | block indent all +0.5cm |
| otherwise (mid/end of text) | insert real `\t` |

Shift-Tab: list lift · if char before caret is `\t` delete it · else block outdent −0.5cm.

Removed dead "delete 4-space block" Backspace branch in `src/components/editor/VisualEditor.tsx`
(kept Case 1: outdent at start of indented paragraph).

### 2. CSS — `src/app/globals.css`
Shared `.prose-editor, .paper` typography rule gains `tab-size: 1.27cm; -moz-tab-size: 1.27cm;`.
`white-space: pre-wrap` added to the shared `p`, `h1`–`h3`, and `li` rules (no effect in the
editor, which is already `break-spaces`; needed for `.paper` preview + export to preserve tabs).

### 3. Export — `src/lib/export/wrap.ts` + `src/lib/export/exportPdf.ts`
Standalone HTML and PDF CSS gain the same `tab-size: 1.27cm` + `white-space: pre-wrap`
(p/h1–h3/li), so downloaded HTML and generated PDFs render tab stops like Word.

### 4. Cleaner — `src/lib/cleaning/cleaners.ts`
`collapseSpaces` now collapses only runs of regular spaces (`/ {2,}/g → " "`) and **preserves
tab characters**, so Word-style tabs survive the export cleaning pipeline.

## Testing

- `src/lib/tiptap/tabBehavior.test.ts` — Tab at start indents; Tab mid inserts `\t`; Shift-Tab removes `\t` (drives the real keymap via `someProp("handleKeyDown")`).
- `src/lib/export/wrap.test.ts` — output contains `tab-size: 1.27cm` + `white-space: pre-wrap`; literal `\t` preserved.
- `src/lib/cleaning/cleaners.test.ts` — single tab, double tab, and tab-between-spaces all preserved; existing space-collapse tests unchanged.
- Live verification (chrome-devtools): computed `tab-size` = 48px (=1.27cm), `white-space: pre-wrap`; `a⇥`→48px, `abcdef⇥`→96px (next stop), `a⇥⇥`→96px — true grid snapping.

## Out of scope (future)

Custom click-to-set tab stops on the ruler (left/right/center/decimal), like Word's ruler.
This phase uses a uniform 1.27cm grid, covering the common case.
