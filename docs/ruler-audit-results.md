# Ruler system audit results (2026-05-28)

## Baseline (pre-fix)

| Suite | Result |
|-------|--------|
| `Ruler.test.tsx` + `IndentRuler.test.tsx` | 20/20 pass |
| `imageScale.normalize.test.ts` | 1/1 pass |
| Playwright `ruler-preview-alignment` + `smoke` | Failed: missing `cmdk`/`fuse.js` in `node_modules` (resolved via `npm install --legacy-peer-deps`) |

## Confirmed gaps (code audit vs `docs/ruler-test-matrix.md`)

| Area | Severity | Root cause |
|------|----------|------------|
| Text indent in list / on image | High | `readBlockIndent` only walked `paragraph`/`heading` ancestors; block images and list-only chains returned `null` |
| Image % width after preview | Medium | `normalizeImagePercentWidths` used theoretical `getPageContentWidthPx`, not measured `.page-body` width |
| Preview vertical reflow with H/F | Medium | Preview used fixed 35px chrome offsets and legacy paginator ignored dynamic `headerFooterReservePx` |
| Horizontal paper on preview toggle | — | Already fixed (v0.1.13); E2E asserts ≤1px |
| `marginRight` on ruler | Low | Not in scope; paragraph attr exists, no right indent handle |
| Dual pagination engines | Low | Edit ProseMirror engine vs preview DOM engine may still differ on long docs |

## Fixes applied

- **Fix A:** `IndentRuler.tsx` — listItem child paragraph + image `NodeSelection` sibling lookup
- **Fix B:** `imageScale.ts`, `pageContentWidth.ts`, `editorStore`, `EditorShell`, `ProcessedContent`, `MultiPagePreview`, `paginationEngine`, `pageChromeReserve.ts`
- **Fix C:** `tests/e2e/ruler-regression.spec.ts`

## Post-fix verification (2026-05-28)

| Suite | Result |
|-------|--------|
| `Ruler` + `IndentRuler` + `imageScale.normalize` | 24/24 pass |
| Playwright `ruler-preview-alignment` + `ruler-regression` | 3/3 pass |
| Playwright `smoke` (ruler section) | 5/6 pass (`uploads .docx` flaky — unrelated) |
| `npm run lint` | 0 errors (3 pre-existing warnings) |
| Full `npm test` | 309/312 pass (3 failures in untracked `RibbonTabInsert` / `sanitizeHtml` tests) |

## Remaining limitations

- Indent drag while image selected still calls `setIndent` on paragraph chain only (display fixed; apply may no-op until cursor is in text)
- Preview vs edit page breaks can differ on very long documents (two engines)
- E2E indent uses ruler keyboard (ArrowRight), not pointer drag on triangles
