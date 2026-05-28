# Ruler system — manual test matrix

Use this checklist when changing ruler, preview layout, or pagination.

## Margins (page setup)

| Step | Expected |
|------|----------|
| Drag left/right margin handles on horizontal ruler | Red guides align with `.page-body` left/right padding; StatusBar shows mm |
| Drag top/bottom on vertical ruler | Content inset matches `pageSetup.marginMm` |
| Change margins in Page Setup dialog | Ruler handles jump to new positions without reload |

## Paragraph indents (text)

| Step | Expected |
|------|----------|
| Place cursor in paragraph; drag ▽ left / △ first-line | Paragraph `margin-left` / `text-indent` update; handles match after release |
| Undo/redo indent change | Ruler handles update without moving cursor |
| Switch to another paragraph | Handles show that paragraph’s indents |
| Open doc with existing indented HTML | Handles correct on first click (initial sync) |

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
