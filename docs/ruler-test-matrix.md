# Ruler system — manual test matrix

Use this checklist when changing ruler, preview layout, or pagination.

## Margins (page setup)

| Step | Expected |
|------|----------|
| Drag left/right margin handles on horizontal ruler | Red guides align with `.page-body` left/right padding; StatusBar shows mm |
| Drag top/bottom on vertical ruler | Content inset matches `pageSetup.marginMm` |
| Change margins in Page Setup dialog | Ruler handles jump to new positions without reload |
| Open edit mode with default margins | Dashed `.page-node::before` rectangle visible on each page; inset matches `.page-body` padding |
| Drag margin handles | Dashed guide moves with margin; stays aligned with content inset |
| Print preview (Ctrl+P) | Margin guides hidden; page numbers hidden |

## Margin guides (Word-style)

| Step | Expected |
|------|----------|
| Single page in edit mode | Light dashed rectangle inside each `.page-node` at margin inset |
| Multi-page document | Each page has its own dashed guide; guides do not bleed between pages |
| Dark mode | Guides visible on white paper (contrast OK) |
| Click/type inside guide area | Clicks pass through to editor (`pointer-events: none`) |
| Template preview | No margin guides (preview uses ProcessedContent, not edit chrome) |

## Fixed horizontal ruler (outside scroll)

| Step | Expected |
|------|----------|
| Scroll down on multi-page doc | Corner + horizontal ruler (`EditorRulerBar`) stay fixed above scroll area; only `EditorPaperScrollBody` scrolls |
| Scroll down | Vertical ruler scrolls with paper stack (same grid row as paper) |
| Scroll down | Paper content scrolls; H-ruler does not drift horizontally |
| Resize window | H-ruler bar still aligned with paper column (widthPx) |
| F11 fullscreen | Root editor uses `overflow-hidden`; scroll only on inner `scrollContainerRef` — H-ruler does not move with page scroll |
| Multi-page stack | Page gap is `PageCanvas` `gap-5` only (20px) — matches `PAGE_STACK_GAP_PX` / vertical ruler tick segments |

## Paragraph indents (text)

| Step | Expected |
|------|----------|
| Place cursor in paragraph; drag ▽ left / △ first-line | Paragraph `margin-left` / `text-indent` update; handles match after release |
| Drag the ▽ **right-indent** triangle (near right margin) | Paragraph `margin-right` updates; text reflows; clamps so it can't cross the left indent |
| Drag the ◼ **left-indent square** (below the left triangles) | Left indent + first-line move together (Word combined marker) |
| Undo/redo indent change | Ruler handles update without moving cursor |
| Switch to another paragraph | Handles show that paragraph’s indents |
| Open doc with existing indented HTML | Handles correct on first click (initial sync) |

## Double-click affordances (Word-style)

| Step | Expected |
|------|----------|
| Double-click the ruler **body** (white content zone) | Opens the Paragraph dialog |
| Double-click a **margin zone / handle** (striped area or x outside content) | Opens Page Setup (`wordhtml:open-page-setup`) |
| Double-click the **vertical** ruler | Opens Page Setup |
| Double-click a tab-stop marker | Removes that stop (not a dialog) |

## Tab stops (per-position + types)

| Step | Expected |
|------|----------|
| Corner selector (ruler corner box) — click | Cycles type glyph L → C → R → D → \| (left/center/right/decimal/bar) |
| With a type selected, click the lower-half ruler track | Adds a stop of that type at the snapped position; marker shows the type glyph |
| Type `a⇥b⇥c` with stops at e.g. 4 / 10 cm | Each segment lands ON its stop (not a uniform tab-size); not just multiples of the first stop |
| Decimal stop + numbers of different lengths on separate lines | Decimal points line up vertically on the stop |
| Drag a stop to a new position | Its type is preserved (tracked by identity); other stops keep their types |
| Save + reload a doc with typed stops | `data-tab-stops` + `data-tab-stop-types` round-trip; stops render the same |
| Export HTML/PDF with tab stops | Tabs are baked to fixed-width spacers (`.tab-bake`) matching the on-screen layout |

## Images

| Step | Expected |
|------|----------|
| Select image in paragraph | Indent handles show wrapping paragraph (not 0,0 incorrectly) |
| 25% / 50% width presets | Width stable after Template Preview toggle (±2px) |
| Align left/center/right | Image moves; ruler margins unchanged |

## Multi-page

| Step | Expected |
|------|----------|
| 2+ pages in edit mode | Vertical ruler ticks restart per page; bottom margin handle per page |
| Scroll between pages | `PaginationManager` page index reasonable |

## Header / footer

| Step | Expected |
|------|----------|
| Enable header/footer | Pagination reserve applied; vertical ruler still aligns page 1 top margin |
| Toggle preview | No stale reserve after return to edit |

## Template preview toggle

| Step | Expected |
|------|----------|
| Edit → Preview → Edit | Paper horizontal position drift ≤ 1px (same center column) |
| Margins unchanged in store | Preview pages use same margin px as edit |
