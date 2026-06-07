# Feature Implementation Plan — A/B/C from the proposal

**Goal:** Implement the proposed features (A finish-half-built · B Word-parity · C Thai-gov), priority order, each as a complete TESTED, committed unit. Deployed app — no stubs, no regressions.

**Strategy:** Pure, file-isolated modules are built in parallel by subagents (new file + colocated vitest test, zero edits to shared files). All shared-file wiring (`VisualEditor.tsx` extensions, ribbon tabs, `globals.css`, `editorStore`, `types/index.ts`, export) is done sequentially by the main agent to avoid merge conflicts. `npm test` + `lint` + `build` after each batch; commit per feature.

## Integration points (confirmed)
- Tiptap extension registration: `src/components/editor/VisualEditor.tsx` `extensions` useMemo (line ~129)
- `PageSetup` / `HeaderFooterConfig` types: `src/types/index.ts:70-87`
- Page render (CSS vars, classes, data-attrs): `src/lib/tiptap/pageNode.ts` renderHTML
- Page-setup state + merge: `src/store/editorStore.ts` (`pageSetup` default ~120, `setPageSetup` merge ~340)
- HTML export wrapper + CSS: `src/lib/export/wrap.ts`; PDF: `src/lib/export/exportPdf.ts`; strip: `stripPaginationWrappers.ts`
- Ribbon tabs: `src/components/editor/ribbon/RibbonTab{Home,Insert,Layout}.tsx`
- Paragraph commands: `src/lib/tiptap/paragraphFormat.ts` (`ParagraphFormatValues`, `setParagraphFormat`)
- Thai helpers (exist): `src/lib/thai/{bahtText,thaiFormat}.ts`
- Templates: `src/lib/templateGallery.ts`, merge fields `src/lib/placeholders/mergeFields.ts`

## Batch 1 — P1 quick wins (this batch)
- **B4 Watermark** (main agent): `Watermark` type + `watermark?` on `PageSetup`; `pageNode.ts` renders `data-watermark` + class; `globals.css` `.page-node[data-watermark]::before` diagonal text; `PageSetupDialog` UI; export (`wrap.ts` + `exportPdf.ts`) print overlay. Test: pure `buildWatermarkCss`/attrs helper.
- **C4 Thai page number** (subagent → `src/lib/thai/thaiPageNumber.ts` + test): `formatThaiPageNumber(cur,total,{digits})` → "หน้า ๑/๕". Main agent wires into header/footer token resolve later.
- **B3 Style presets** (subagent → `src/lib/styles/paragraphStylePresets.ts` + test): named presets (ปกติ/หัวข้อ ๑-๓/ชื่อเรื่อง/ยกข้อความ) → `{headingLevel?, format: ParagraphFormatValues, bold?}`. Main agent builds the gallery dropdown in RibbonTabHome.
- **C1 official-letter builder** (subagent → `src/lib/officialLetter/buildLetterHtml.ts` + test): pure `buildOfficialLetterHtml(fields)` → สารบรรณ HTML (หนังสือภายนอก/บันทึกข้อความ). Main agent builds the wizard dialog + ribbon entry later.

## Batch 2 — P1 nodes (next)
- **B1 Footnotes** (new node `src/lib/tiptap/footnote.ts` + test), **B2 Captions** (`src/lib/tiptap/caption.ts` + test), **C2 signature block** (insert helper + token). Register + ribbon + export.

## Batch 3 — P2
- A1 header/footer rich editing, A2 first/odd-even layout, B5 comments (project json), B6 multi-column, B7 bookmarks/cross-ref, C3 distribution list.

## Batch 4 — P3 (big/risky, scoped separately)
- A3 table/image split, B8 track changes, B9 citations/text boxes. Each gets its own spec before implementation.

## Verification per batch
`npm test -- --run` · `npm run lint` · `npm run build` · live Chrome smoke for UI features · commit.
