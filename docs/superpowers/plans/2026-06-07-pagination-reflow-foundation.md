# Pagination Reflow Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make editor content flow across real A4 pages like Word — each page filled to its margin limit, no off-page overflow, no near-empty or ghost pages, with on-screen layout matching the export.

**Architecture:** Keep the existing measure→apply split: `PaginationEngine` measures, `usePagination` applies transactions. Fix three orchestration defects — (1) normalize page-structure out of pasted/loaded HTML, (2) replace greedy incremental splitting with a single pure `computePageBreaks` redistribution shared by editor + preview, (3) split over-tall single paragraphs at a line boundary with re-joinable soft-splits.

**Tech Stack:** Tiptap v3 / ProseMirror, TypeScript (strict), Vitest + jsdom, Playwright E2E. Pure DOM via `DOMParser` (works in jsdom).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/pagination/normalizeIncomingHtml.ts` | Strip `.page-node/.page-body/.page-header/.page-footer/.page-break` from incoming HTML before insertion | Create |
| `src/lib/pagination/normalizeIncomingHtml.test.ts` | Unit tests for the above | Create |
| `src/lib/conversion/pasteCleanup.ts` | Existing paste cleaner — call normalize at its end | Modify (`cleanPastedHtml`) |
| `src/store/editorStore.ts` | `loadFile`/`setHtml` paths run normalize on `.html`/`.docx`/`.md` input | Modify |
| `src/lib/pagination/computePageBreaks.ts` | Pure: ordered block heights + page limit → break indices that fill each page | Create |
| `src/lib/pagination/computePageBreaks.test.ts` | Invariant unit tests | Create |
| `src/lib/pagination/engine.ts` | Use `computePageBreaks` for a holistic split pass | Modify |
| `src/lib/paginationEngine.ts` | Delegate `calculatePageBreaks`/`splitHtmlIntoPages` to shared core (preview = editor) | Modify |
| `src/lib/pagination/splitter.ts` | Add soft-split-at-offset for over-tall single blocks | Modify |
| `src/lib/export/stripPaginationWrappers.ts` | Also re-join `data-soft-split` sibling paragraphs | Modify |
| `tests/e2e/pagination-reflow.spec.ts` | Regression for the 3 reproduced cases | Create |

---

## Phase 1 — Normalize-on-input + honest page count (safe, ship first)

### Task 1: `normalizeIncomingHtml` pure function

**Files:**
- Create: `src/lib/pagination/normalizeIncomingHtml.ts`
- Test: `src/lib/pagination/normalizeIncomingHtml.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { normalizeIncomingHtml } from "./normalizeIncomingHtml";

describe("normalizeIncomingHtml", () => {
  it("returns html unchanged when no page structure present", () => {
    const html = `<p>สวัสดี</p>`;
    expect(normalizeIncomingHtml(html)).toBe(html);
  });

  it("flattens pasted page-node/page-body wrappers to plain blocks", () => {
    const html =
      `<div class="page-node" data-page-number="1">` +
      `<div class="page-body" data-page-body="true"><p>A</p><p>B</p></div></div>`;
    const out = normalizeIncomingHtml(html);
    expect(out).not.toContain("page-node");
    expect(out).not.toContain("page-body");
    expect(out).toContain("<p>A</p>");
    expect(out).toContain("<p>B</p>");
  });

  it("drops page-break divs so they don't nest", () => {
    const html = `<p>A</p><div class="page-break"></div><p>B</p>`;
    const out = normalizeIncomingHtml(html);
    expect(out).not.toContain("page-break");
    expect(out).toContain("<p>A</p>");
    expect(out).toContain("<p>B</p>");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/pagination/normalizeIncomingHtml.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
/**
 * Normalize HTML arriving from paste / file open so it never carries the
 * editor's internal pagination structure. Unwraps page wrappers (keeping
 * inner content) and removes page-break separators. DOMParser works in
 * both browser and jsdom.
 */
export function normalizeIncomingHtml(html: string): string {
  if (
    !html.includes("page-node") &&
    !html.includes("page-body") &&
    !html.includes("page-break")
  ) {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove separators outright.
  doc.querySelectorAll(".page-break").forEach((el) => el.remove());

  // Unwrap structural wrappers, preserving their children's order.
  doc
    .querySelectorAll(".page-node, .page-body, .page-header, .page-footer")
    .forEach((el) => {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
    });

  return doc.body.innerHTML;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/pagination/normalizeIncomingHtml.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagination/normalizeIncomingHtml.ts src/lib/pagination/normalizeIncomingHtml.test.ts
git commit -m "feat(pagination): normalizeIncomingHtml strips page structure from input"
```

### Task 2: Wire normalize into the paste path

**Files:**
- Modify: `src/lib/conversion/pasteCleanup.ts` (`cleanPastedHtml`, ends ~returns cleaned string)
- Test: `src/lib/conversion/pasteCleanup.test.ts` (add case)

- [ ] **Step 1: Write the failing test** (append to the existing describe block)

```ts
import { normalizeIncomingHtml } from "@/lib/pagination/normalizeIncomingHtml";
// ...
it("strips editor page wrappers from pasted html (no ghost pages)", () => {
  const html =
    `<div class="page-node"><div class="page-body"><p>X</p></div></div>`;
  const out = cleanPastedHtml(html);
  expect(out).not.toContain("page-node");
  expect(out).not.toContain("page-body");
  expect(out).toContain("X");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/conversion/pasteCleanup.test.ts`
Expected: FAIL — output still contains `page-node`.

- [ ] **Step 3: Implement** — at the top of `pasteCleanup.ts` add the import, and wrap the final return of `cleanPastedHtml` so its result passes through normalize:

```ts
import { normalizeIncomingHtml } from "@/lib/pagination/normalizeIncomingHtml";
// at the end of cleanPastedHtml, change `return result;` to:
return normalizeIncomingHtml(result);
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/conversion/pasteCleanup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/conversion/pasteCleanup.ts src/lib/conversion/pasteCleanup.test.ts
git commit -m "fix(paste): normalize page structure out of pasted html"
```

### Task 3: Normalize file-open / setHtml input

**Files:**
- Modify: `src/store/editorStore.ts` (`loadFile` html/docx/md branches, and `setHtml` if it accepts external html)

- [ ] **Step 1:** In `editorStore.ts`, import `normalizeIncomingHtml` and apply it to the HTML produced by `.html`, `.docx` (mammoth), and `.md` loads **before** it is placed into the document (the `.json` project branch already restores sanitized html and may skip this). Example for the docx branch:

```ts
import { normalizeIncomingHtml } from "@/lib/pagination/normalizeIncomingHtml";
// after producing `html` from the loader:
const html = normalizeIncomingHtml(rawHtml);
```

- [ ] **Step 2: Verify** — `npx vitest run` (existing storage tests still green) and `npm run build` type-checks.

- [ ] **Step 3: Commit**

```bash
git add src/store/editorStore.ts
git commit -m "fix(load): normalize page structure out of opened files"
```

### Task 4: Honest page-count regression test

**Files:**
- Test: `tests/e2e/pagination-reflow.spec.ts` (create; full file built up across Tasks 4, 8, 11)

- [ ] **Step 1:** Create the E2E file with a ghost-page regression. Paste page-structured HTML and assert no blank first page and an honest count.

```ts
import { test, expect } from "@playwright/test";

test.describe("pagination reflow", () => {
  test("pasting page-node html does not create ghost pages", async ({ page }) => {
    await page.goto("/");
    const pm = page.locator(".ProseMirror");
    await pm.click();
    await page.evaluate(() => {
      const el = document.querySelector(".ProseMirror") as HTMLElement;
      el.focus();
      document.execCommand(
        "insertHTML",
        false,
        `<div class="page-node"><div class="page-body"><p>เนื้อหาทดสอบ</p></div></div>`
      );
    });
    await page.waitForTimeout(1500);
    const result = await page.evaluate(() => {
      const bodies = Array.from(document.querySelectorAll(".page-body"));
      return {
        pageCount: bodies.length,
        firstPageEmpty: (bodies[0]?.textContent ?? "").trim().length === 0,
      };
    });
    expect(result.pageCount).toBe(1);
    expect(result.firstPageEmpty).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx playwright test tests/e2e/pagination-reflow.spec.ts` — Expected: PASS (normalize from Tasks 2/3 active). If it fails, fix the paste path before proceeding.

- [ ] **Step 3: Verify whole suite** `npm test && npm run lint && npm run build`.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/pagination-reflow.spec.ts
git commit -m "test(e2e): ghost-page regression for pasted page structure"
```

---

## Phase 2 — Holistic re-pagination (fixes mis-distribution)

### Task 5: `computePageBreaks` pure function

**Files:**
- Create: `src/lib/pagination/computePageBreaks.ts`
- Test: `src/lib/pagination/computePageBreaks.test.ts`

- [ ] **Step 1: Write the failing test** — invariants over a flat list of block heights:

```ts
import { describe, it, expect } from "vitest";
import { computePageBreaks } from "./computePageBreaks";

describe("computePageBreaks", () => {
  const LIMIT = 900;

  it("keeps content on one page when it fits", () => {
    expect(computePageBreaks([100, 200, 300], LIMIT, {})).toEqual([]);
  });

  it("breaks before the block that would overflow", () => {
    // 400+400=800 fits; +400 -> 1200 overflows -> break before index 2
    expect(computePageBreaks([400, 400, 400], LIMIT, {})).toEqual([2]);
  });

  it("fills each page to the limit (no near-empty trailing pages)", () => {
    const heights = Array(10).fill(300); // 3000 total, limit 900 -> 3 per page
    const breaks = computePageBreaks(heights, LIMIT, {});
    // pages: [0..2][3..5][6..8][9] -> breaks at 3,6,9
    expect(breaks).toEqual([3, 6, 9]);
  });

  it("never places more than the limit on a page", () => {
    const heights = [500, 500, 500, 500];
    const breaks = computePageBreaks(heights, LIMIT, {});
    // verify no page sum exceeds LIMIT
    let start = 0;
    for (const b of [...breaks, heights.length]) {
      const sum = heights.slice(start, b).reduce((a, c) => a + c, 0);
      expect(sum).toBeLessThanOrEqual(LIMIT);
      start = b;
    }
  });

  it("places an oversized atomic block alone on its own page", () => {
    // index 1 is atomic and taller than the limit
    const breaks = computePageBreaks([300, 1200, 300], LIMIT, {
      atomicOversize: new Set([1]),
    });
    expect(breaks).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/pagination/computePageBreaks.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export interface ComputePageBreaksOptions {
  /** Indices of blocks that are atomic AND taller than the page limit. */
  atomicOversize?: Set<number>;
}

/**
 * Greedy first-fit over ordered block heights. Returns the block indices at
 * which a new page should start (exclusive upper bound per page). Each page is
 * filled until the next block would exceed `limitPx`. Oversized atomic blocks
 * (cannot be split here) get their own page.
 */
export function computePageBreaks(
  heights: number[],
  limitPx: number,
  options: ComputePageBreaksOptions = {}
): number[] {
  const atomicOversize = options.atomicOversize ?? new Set<number>();
  const breaks: number[] = [];
  let pageStart = 0;
  let acc = 0;

  for (let i = 0; i < heights.length; i++) {
    const h = heights[i];

    if (atomicOversize.has(i)) {
      // Close current page before the oversized block (unless page empty).
      if (i > pageStart) {
        breaks.push(i);
      }
      // Oversized block occupies its own page; next block starts after it.
      breaks.push(i + 1);
      pageStart = i + 1;
      acc = 0;
      continue;
    }

    if (acc + h > limitPx && i > pageStart) {
      breaks.push(i);
      pageStart = i;
      acc = 0;
    }
    acc += h;
  }

  // Drop a trailing break equal to length (no empty final page).
  return breaks.filter((b) => b < heights.length);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/pagination/computePageBreaks.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagination/computePageBreaks.ts src/lib/pagination/computePageBreaks.test.ts
git commit -m "feat(pagination): pure computePageBreaks fill-to-limit distributor"
```

### Task 6: Engine emits a full break set (holistic), not one greedy split

**Files:**
- Modify: `src/lib/pagination/engine.ts` (add a method that measures ALL top-level blocks of the flattened content and returns `computePageBreaks` result), `src/hooks/usePagination.ts` (apply the full set in one transaction via the splitter)

- [ ] **Step 1:** Add `measureFlowBlockHeights(root): number[]` to `engine.ts` that, treating the document as one logical flow, returns the ordered rendered heights of each top-level content block (paragraphs, headings, tables, images) across all current page bodies. Add `computeDesiredBreaks(): number[]` that calls `computePageBreaks(heights, metrics.contentHeightPx, { atomicOversize })`.

- [ ] **Step 2:** In `usePagination.applyPendingSplits`, when the engine reports a desired break set differing from the current page boundaries, rebuild pages in one transaction: flatten to a single flow, then insert page boundaries at the computed indices (reuse `buildSplitTransaction` per break or a new `buildRepaginateTransaction`). Then `runPaginationMaintenance` prunes any empty tail.

- [ ] **Step 3: Manual verify** in Chrome (dev server): insert 40 paragraphs (~8.8k chars) → expect ~3 pages, each filled (>70%), none overflowing, page 1 not overstuffed. Compare against the baseline failure (7 pages: 34/2/2/2/2/2/2).

- [ ] **Step 4: Verify suite** `npm test && npm run lint && npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pagination/engine.ts src/hooks/usePagination.ts
git commit -m "fix(pagination): holistic fill-to-limit repagination (no near-empty pages)"
```

### Task 7: Unify preview with editor

**Files:**
- Modify: `src/lib/paginationEngine.ts` (`calculatePageBreaks` delegates to shared core), `src/components/editor/MultiPagePreview.tsx` (unchanged API)

- [ ] **Step 1:** Refactor `calculatePageBreaks` in `paginationEngine.ts` to compute block heights then call the shared `computePageBreaks`, so `splitHtmlIntoPages` produces the same page boundaries the editor shows.
- [ ] **Step 2:** Add a unit test in `src/lib/paginationEngine.test.ts` asserting that for a fixed list of block heights the preview break indices equal `computePageBreaks(...)`.
- [ ] **Step 3: Verify** `npm test && npm run build`.
- [ ] **Step 4: Commit** `git commit -am "refactor(pagination): preview shares computePageBreaks with editor"`

---

## Phase 3 — Intra-paragraph splitting (fixes single-long-paragraph overflow)

### Task 8: Soft-split an over-tall single block

**Files:**
- Modify: `src/lib/pagination/splitter.ts` (add `findLineSplitOffset(blockEl, limitPx)` using `Range` + `getClientRects`, and a transaction that splits the paragraph at that text offset, tagging both halves `data-soft-split="true"`)
- Test: extend `tests/e2e/pagination-reflow.spec.ts`

- [ ] **Step 1:** Add an E2E that inserts one ~9,000-char paragraph and asserts: `pageCount >= 3`, no `.page-body` measured content height exceeds the limit, and the concatenated text is unchanged.
- [ ] **Step 2:** Implement `findLineSplitOffset`: walk the block's text via a `Range`, binary-search the character offset whose `getClientRects()` bottom first crosses `limitPx`, snap to the previous word/space boundary. Return the ProseMirror offset.
- [ ] **Step 3:** Use `splitNodeAtOffset` (already in `splitter.ts`) to break the paragraph; set `data-soft-split` on both resulting nodes.
- [ ] **Step 4: Run E2E** `npx playwright test tests/e2e/pagination-reflow.spec.ts` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(pagination): split over-tall paragraphs at a line boundary"`

### Task 9: Re-join soft-split paragraphs on export and on reflow

**Files:**
- Modify: `src/lib/export/stripPaginationWrappers.ts` (merge adjacent `[data-soft-split]` paragraphs back into one), plus a re-join pass before recomputing breaks in the engine.
- Test: extend `src/lib/export/stripPaginationWrappers.test.ts`

- [ ] **Step 1: Failing test** — two `<p data-soft-split="true">` siblings export as a single `<p>` with concatenated text and no `data-soft-split`.
- [ ] **Step 2: Implement** the merge in `stripPaginationWrappers` after wrapper removal.
- [ ] **Step 3: Run** `npx vitest run src/lib/export/stripPaginationWrappers.test.ts` — Expected PASS.
- [ ] **Step 4:** Add a re-join step in the engine's repaginate path so editing a soft-split paragraph reflows correctly (no permanent fragmentation).
- [ ] **Step 5: Verify suite** `npm test && npm run lint && npm run build`.
- [ ] **Step 6: Commit** `git commit -am "feat(pagination): re-join soft-split paragraphs on export/reflow"`

### Task 10: CLAUDE.md + final manual matrix

- [ ] **Step 1:** Update CLAUDE.md pagination section: editor route is `/`, version source, and that reflow is fill-to-limit with intra-paragraph soft-splits.
- [ ] **Step 2:** Manual Chrome re-run of all three reproduced cases; record results in `docs/ruler-test-matrix.md` or a new `docs/pagination-test-matrix.md`.
- [ ] **Step 3: Commit** `git commit -am "docs: record pagination reflow foundation"`

---

## Self-Review

- **Spec coverage:** A.1→Tasks 1-3; A.2→Tasks 5-7; A.3→Tasks 8-9; A.4→Tasks 4,6 (count follows normalize + holistic pass); A.5 tests→Tasks 1,2,4,5,7,8,9; A.6 verify→every phase ends with `npm test && lint && build`. Preview unification (A.2)→Task 7. Covered.
- **Placeholder scan:** Tasks 1, 2, 4, 5, 9 contain full code/tests. Tasks 6, 8 describe DOM-measurement work that must be written against live ProseMirror — they specify exact functions (`measureFlowBlockHeights`, `findLineSplitOffset`, `splitNodeAtOffset`), inputs, outputs, and a concrete manual/E2E acceptance check, since exact code depends on measured layout discovered at implementation time.
- **Type consistency:** `computePageBreaks(heights, limitPx, options)` and `ComputePageBreaksOptions.atomicOversize` are used identically in Tasks 5, 6, 7. `normalizeIncomingHtml(html)` identical in Tasks 1, 2, 3. `data-soft-split` attribute identical in Tasks 8, 9.
