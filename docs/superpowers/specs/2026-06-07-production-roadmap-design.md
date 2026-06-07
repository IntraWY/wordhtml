# Production Roadmap Design — wordhtml (2026-06-07)

> Status: **approved direction** (user chose full Word-style reflow; authorized autonomous execution).
> Scope: three sequenced sub-projects. This doc is the umbrella design + detailed design for **Sub-project A**. B and C get their own specs when reached.

## Context

`wordhtml` is a mature static client-side Word↔HTML editor (Next.js 16 + Tiptap, 271 source files, 396 unit + 15 E2E tests, lint/build clean). It is in real daily use as a **Thai official / procurement document tool** — confirmed by the undocumented `/procurement` route (3-stage จัดซื้อจัดจ้าง builder) and the variable/mail-merge + GAS-export stack.

The user's goal: make it **genuinely production-usable, easy, and comprehensive for their work**. They confirmed all three use-cases matter (mail-merge, Word↔HTML cleaning, long-document editing) and flagged four frictions: **pagination glitches, mail-merge flakiness, fear of losing work, export not matching the screen.**

### Live findings (Chrome DevTools, against the running app)

The editor now lives at `/` (not `/app` as CLAUDE.md claims); version is v0.1.25 (CLAUDE.md says v0.1.5). No console errors on load. Three **reproduced, quantified** pagination defects:

| Case | Input | Result | Verdict |
|---|---|---|---|
| Single long paragraph | 8,956 chars in one `<p>` (typical Word paste) | `pageCount=1`, content height 2,857px **spills off the bottom of the A4 page** onto the canvas; no page 2 created | **No reflow** — `findSplitPosition` only breaks *between* block children, never *within* a paragraph |
| Many paragraphs | 40 `<p>`, 8,791 chars | `pageCount=7`: page 1 = 34 paras / 1,012px (**overflowing the ~935px limit**), pages 2–7 = 2 paras / ~193px each (**~20% full**) | **Mis-distribution** — greedy first-page stuffing then near-empty trailing pages; over-creates pages |
| Paste page-node HTML | copy-all + paste inside editor | **blank ghost page 1**, content shoved to bottom of page 2, status "3/3 หน้า" | **No normalize-on-input** — pasted `.page-node` wrappers nest and create empty pages |

### What already exists (do not rebuild)

- `src/lib/pagination/engine.ts` — `PaginationEngine`: ResizeObserver + `measurePageBodies` + `findSplitPosition`. Measures and emits `SplitCandidate`; never mutates the doc.
- `src/lib/pagination/splitter.ts` — `buildSplitTransaction` + `splitNodeAtOffset` (intra-node split helpers already present).
- `src/lib/pagination/paginationMaintenance.ts` + `pruneEmptyPages.ts` — prunes empty pages.
- `src/hooks/usePagination.ts` — wires engine→splits→maintenance, idle-gated (450ms typing, 150ms stable, `MAX_PENDING_SPLITS=5`).
- `src/lib/paginationEngine.ts` (top-level, **separate**) — `splitHtmlIntoPages` + `calculatePageBreaks`, used only by `MultiPagePreview.tsx` for read-only template preview. This is a **second, independent** paginator → editor and preview can disagree.

The architecture is sound (engine measures, hook applies — avoids infinite loops). The **defect is the split orchestration**, not the scaffolding.

---

## Sub-project A — Pagination Correctness + True Reflow *(do first; everything depends on it)*

**Goal:** content flows across real A4 pages like Word — each page filled to the margin limit, no overflow off-page, no near-empty pages, no ghost pages, and the on-screen layout equals the export.

### A.1 Normalize-on-input (kills ghost pages)
- Add `normalizeIncomingHtml(html)` in `src/lib/pagination/` that strips `.page-node` / `.page-body` / `.page-break` wrappers and flattens to plain block content (reuse `stripPaginationWrappers` logic, currently export-only).
- Hook into Tiptap `editorProps.transformPastedHTML` (in `VisualEditor.tsx`) and the `loadFile` / `setHtml` paths so pasted or opened content never injects page structure.
- Test: paste page-node HTML → exactly one logical content stream, no empty pages.

### A.2 Holistic re-pagination (fixes mis-distribution)
- Replace greedy one-split-per-cycle with a **single measurement-driven redistribution**:
  1. Measure the ordered block heights of the full content flow.
  2. Pure function `computePageBreaks(blockHeights, contentHeightPx)` → break indices that fill each page up to the limit (with atomic-block and orphan/widow awareness).
  3. Apply all breaks in **one** transaction; let maintenance prune leftovers.
- Pure-function core is unit-testable with invariants: no page exceeds `contentHeightPx`; every non-final page is filled ≥ a threshold (e.g. 70%) unless the next block is atomic and oversized; total pages = ceil-ish of content/limit.
- Unify with preview: `MultiPagePreview` and the editor consume the **same** `computePageBreaks`. Retire the divergent logic in top-level `paginationEngine.ts` (keep a thin `splitHtmlIntoPages` wrapper that delegates to the shared core), so editor = preview = export.

### A.3 Intra-paragraph splitting (fixes single-long-paragraph overflow)
- When one block exceeds `contentHeightPx`, split the paragraph at the nearest **line boundary** at/under the limit: use DOM `Range` + `getClientRects()` to find the text offset whose bottom crosses the page limit, then `splitNodeAtOffset` (already in `splitter.ts`) at that offset.
- Tag both halves with `data-soft-split="true"` so they **re-join** on the next reflow/edit (no permanent fragmentation) and on export (`stripPaginationWrappers` re-joins soft-split siblings).
- Test: 9,000-char single paragraph → ≥3 pages, none overflowing, text contiguous, export round-trips to one paragraph.

### A.4 Honest page count + status
- Page count derives from the stable post-reflow `.page-node` count; status bar + `PaginationManager` reflect it. Add a guard so transient mid-reflow counts don't flash.

### A.5 Tests
- Unit: `computePageBreaks` invariants; `normalizeIncomingHtml`; soft-split round-trip.
- E2E (`tests/e2e/`): the three reproduced cases above become regression specs (single long para, 40 paras, paste page-node), asserting page count is reasonable, no body's measured content height exceeds the limit, and page 1 is not blank.

### A.6 Verification
`npm test` green (incl. new tests), `npm run lint` 0 warnings, `npm run build` type-checks, and manual Chrome re-run of the three cases shows filled, non-overflowing pages.

---

## Sub-project B — Thai Official Documents + Mail-merge *(domain value; after A is stable)*

- **Built-in templates** per ระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๒๖: หนังสือภายนอก / หนังสือภายใน / บันทึกข้อความ / ประกาศ — correct margins, TH Sarabun 16pt, ครุฑ slot, structured เลขที่/ลงวันที่/เรื่อง/เรียน/อ้างถึง/สิ่งที่ส่งมาด้วย.
- **Upgrade `/procurement`**: replace the raw `<p>/<ul>` form output with these real templates flowing into the editor (editable + correctly formatted on export); carry data across the 3 stages.
- **Mail-merge hardening**: fix the open variable bugs (typing after a badge, panel clear/remove — matching the existing remote branches) and add **batch export** (one document per data row → ZIP).
- **Thai helpers** as merge functions: เลขไทย, Buddhist-era dates, amount-to-Thai-text ("บาทถ้วน").

## Sub-project C — Never-lose-work + Deploy *(low risk; interleave)*

- **Crash-safe draft recovery**: autosave the current document to IndexedDB on idle (separate from privacy-preserving history); on reload, offer "กู้คืนงานที่ค้างไว้?". Keeps the privacy story (no server) while removing the "งานหาย" fear.
- **Cloud history sync** + fix delete (matches open `firebase-history` branches): sync snapshots to `users/{uid}/snapshots`.
- **Housekeeping**: merge the pending Phase 7 branch → deploy (user decision); fix Ctrl+Shift+N reset confirm; **sync CLAUDE.md to reality** (route `/`, v0.1.25, `/procurement`, pagination state).

---

## Sequencing & risk

1. **A** first — foundation; unblocks export trust and the "เพี้ยน" complaint. Land safe wins (A.1 normalize, A.4 honest count) before the hard parts (A.2 redistribution, A.3 intra-paragraph).
2. **C** can interleave (draft recovery is high-value/low-risk and independent of A).
3. **B** sits on top of a stable A.

Constraints unchanged: **no server code, no telemetry/trackers, no API routes**; static export only; document never persists server-side (draft recovery is local IndexedDB, opt-in restore).
