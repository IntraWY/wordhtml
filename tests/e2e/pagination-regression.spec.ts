import { test, expect } from "@playwright/test";
import { gotoEditor, typeText, pasteHtml } from "./helpers";

/**
 * E2E regression specs for three previously-fixed pagination bugs:
 *
 * 1. A single very long paragraph (~8,956 chars) must soft-split across pages
 *    (data-soft-split pieces) without visual overflow, and re-join to a single
 *    paragraph when pagination wrappers are stripped (export path).
 *    Fix lives in src/lib/pagination/repaginate.ts (expandTallBlocks +
 *    findParagraphSegments) and src/lib/export/stripPaginationWrappers.ts.
 *
 * 2. Many medium paragraphs must paginate into multiple pages with no empty
 *    "ghost" page at the end (fill-to-limit in computePageBreaks).
 *
 * 3. Pasting HTML that already contains page-node/page-body wrappers (e.g. a
 *    previous wordhtml export) must not nest page structure or create ghost
 *    pages. Fix lives in src/lib/pagination/normalizeIncomingHtml.ts and the
 *    paste normalization path.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
    localStorage.setItem("wordhtml-recovery-opt-out", "1");
  });
});

/** Serialized into page.evaluate — measures whether every .page-body's
 *  children fit inside its content box (no visual overflow). */
const pagesFitSnapshot = () => {
  const bodies = Array.from(document.querySelectorAll(".page-body"));
  const fits = bodies.every((b) => {
    const el = b as HTMLElement;
    const cs = getComputedStyle(el);
    const box =
      el.clientHeight -
      (parseFloat(cs.paddingTop) || 0) -
      (parseFloat(cs.paddingBottom) || 0);
    const base =
      el.getBoundingClientRect().top + (parseFloat(cs.paddingTop) || 0);
    let used = 0;
    for (const ch of Array.from(el.children)) {
      used = Math.max(used, ch.getBoundingClientRect().bottom - base);
    }
    return used <= box + 2;
  });
  return { pageCount: bodies.length, fits };
};

test("single ~8,956-char paragraph soft-splits across pages and re-joins to one paragraph", async ({
  page,
}) => {
  await gotoEditor(page);

  const block =
    "ทดสอบการแบ่งย่อหน้าเดียวที่ยาวมากให้ไหลข้ามหน้ากระดาษโดยอัตโนมัติของระบบจัดหน้าเอกสารราชการไทย เพื่อยืนยันว่าการตัดแบบซอฟต์สปลิตไม่ทำให้เนื้อหาสูญหายแม้แต่ตัวอักษรเดียว ";
  const text = block.repeat(Math.ceil(8956 / block.length)).slice(0, 8956);
  const expected = text.replace(/\s/g, "");
  await typeText(page, text);

  // Deterministic wait: repagination is debounced — poll until the paragraph
  // has been split onto more than one page AND nothing overflows a page body.
  await expect
    .poll(
      () =>
        page.evaluate(`(${pagesFitSnapshot.toString()})()`) as Promise<{
          pageCount: number;
          fits: boolean;
        }>,
      { timeout: 30_000 }
    )
    .toMatchObject({ fits: true });
  await expect
    .poll(
      async () =>
        (
          (await page.evaluate(
            `(${pagesFitSnapshot.toString()})()`
          )) as { pageCount: number }
        ).pageCount,
      { timeout: 30_000 }
    )
    .toBeGreaterThan(1);

  const result = await page.evaluate(() => {
    const pm = document.querySelector(".ProseMirror") as HTMLElement;
    const bodies = Array.from(document.querySelectorAll(".page-body"));

    // Re-join exactly like stripPaginationWrappers (the export path): unwrap
    // page wrappers, then merge adjacent p[data-soft-split="true"] runs.
    const clone = document.createElement("div");
    clone.innerHTML = pm.innerHTML;
    let wrappers = clone.querySelectorAll(
      ".page-node, .page-body, .page-header, .page-footer"
    );
    while (wrappers.length > 0) {
      wrappers.forEach((el) => {
        const parent = el.parentNode;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        parent.removeChild(el);
      });
      wrappers = clone.querySelectorAll(
        ".page-node, .page-body, .page-header, .page-footer"
      );
    }
    const pieces = Array.from(
      clone.querySelectorAll('p[data-soft-split="true"]')
    );
    for (const piece of pieces) {
      if (!piece.parentNode) continue;
      let next = piece.nextElementSibling;
      while (
        next &&
        next.tagName === "P" &&
        next.getAttribute("data-soft-split") === "true"
      ) {
        while (next.firstChild) piece.appendChild(next.firstChild);
        const absorbed = next;
        next = next.nextElementSibling;
        absorbed.remove();
      }
      piece.removeAttribute("data-soft-split");
    }
    const joinedParagraphs = Array.from(clone.querySelectorAll("p")).filter(
      (p) => (p.textContent ?? "").trim().length > 0
    );

    return {
      pageCount: bodies.length,
      softSplitPieces: document.querySelectorAll(
        '.page-body p[data-soft-split="true"]'
      ).length,
      joinedParagraphCount: joinedParagraphs.length,
      text: pm.textContent?.replace(/\s/g, "") ?? "",
    };
  });

  expect(result.pageCount).toBeGreaterThan(1);
  // The paginator marks every piece with data-soft-split; > 1 page implies
  // at least two pieces in the live DOM.
  expect(result.softSplitPieces).toBeGreaterThanOrEqual(2);
  // After export-style joining the document is a single paragraph again.
  expect(result.joinedParagraphCount).toBe(1);
  // Not a single character lost.
  expect(result.text).toBe(expected);
});

test("40 medium paragraphs paginate into multiple pages with no empty ghost page", async ({
  page,
}) => {
  await gotoEditor(page);

  let html = "";
  for (let i = 1; i <= 40; i++) {
    html += `<p>ย่อหน้าที่ ${i} สำหรับทดสอบการจัดหน้าอัตโนมัติของเอกสารราชการไทย เนื้อหายาวพอสมควรเพื่อให้แต่ละย่อหน้ากินพื้นที่หลายบรรทัด และเมื่อนำมารวมกันทั้งสี่สิบย่อหน้าจะเกินความสูงของหน้ากระดาษหนึ่งหน้าอย่างแน่นอน</p>`;
  }
  await pasteHtml(page, html);

  // Poll until reflow settles: multiple pages, none overflowing.
  await expect
    .poll(
      async () => {
        const snap = (await page.evaluate(
          `(${pagesFitSnapshot.toString()})()`
        )) as { pageCount: number; fits: boolean };
        return snap.pageCount >= 2 && snap.fits;
      },
      { timeout: 30_000 }
    )
    .toBe(true);
  // Brief settle so a late repaginate cycle can't add a ghost page after the
  // assertion ran (the bug under regression was a trailing empty page).
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const bodies = Array.from(document.querySelectorAll(".page-body"));
    return {
      pageCount: bodies.length,
      emptyPageIndexes: bodies
        .map((b, i) => ({ i, empty: (b.textContent ?? "").trim().length === 0 }))
        .filter((x) => x.empty)
        .map((x) => x.i),
      lastPageText: (bodies[bodies.length - 1]?.textContent ?? "").trim(),
      hasLastParagraph: !!document.querySelector(".page-body p:last-child"),
      fullText: (
        document.querySelector(".ProseMirror") as HTMLElement
      ).textContent?.includes("ย่อหน้าที่ 40"),
    };
  });

  expect(result.pageCount).toBeGreaterThanOrEqual(2);
  // No ghost page anywhere — in particular not a trailing empty one.
  expect(result.emptyPageIndexes).toEqual([]);
  expect(result.lastPageText.length).toBeGreaterThan(0);
  // Content intact through the final paragraph.
  expect(result.fullText).toBe(true);
});

test("pasting exported page-node markup strips ghost pages and keeps content intact", async ({
  page,
}) => {
  const editor = await gotoEditor(page);

  // Simulate pasting a previous wordhtml export: two pages with content plus
  // an empty trailing ghost page, delivered through the real clipboard paste
  // pipeline (transformPastedHTML → cleanPastedHtml → schema parse).
  await pasteHtml(
    page,
    `<div class="page-node" data-page-number="1"><div class="page-body">` +
      `<p>เนื้อหาหน้าแรกจากการส่งออกครั้งก่อน</p></div></div>` +
      `<div class="page-node" data-page-number="2"><div class="page-body">` +
      `<p>เนื้อหาหน้าที่สองจากการส่งออกครั้งก่อน</p></div></div>` +
      `<div class="page-node" data-page-number="3"><div class="page-body">` +
      `<p></p></div></div>`
  );

  // Content from both source pages must survive the paste.
  await expect(editor).toContainText("เนื้อหาหน้าแรกจากการส่งออกครั้งก่อน");
  await expect(editor).toContainText("เนื้อหาหน้าที่สองจากการส่งออกครั้งก่อน");

  // Let any debounced repaginate cycle run before checking for ghost pages.
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const bodies = Array.from(document.querySelectorAll(".page-body"));
    return {
      pageCount: bodies.length,
      emptyPages: bodies.filter(
        (b) => (b.textContent ?? "").trim().length === 0
      ).length,
      // Pasted wrappers must never nest inside an existing page.
      nestedWrappers: document.querySelectorAll(
        ".page-body .page-node, .page-body .page-body"
      ).length,
    };
  });

  // Two short paragraphs fit on a single page — the three pasted page shells
  // (incl. the empty ghost) must collapse into the existing page.
  expect(result.pageCount).toBe(1);
  expect(result.emptyPages).toBe(0);
  expect(result.nestedWrappers).toBe(0);
});
