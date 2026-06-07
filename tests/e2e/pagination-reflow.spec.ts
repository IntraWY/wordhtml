import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test("pasting page-node html does not create ghost pages", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible();
  await editor.click();

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

test("long multi-paragraph content reflows into evenly-filled pages", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible();
  await editor.click();

  await page.evaluate(() => {
    const el = document.querySelector(".ProseMirror") as HTMLElement;
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(el);
      sel.collapseToEnd();
    }
    let html = "";
    for (let i = 1; i <= 40; i++) {
      html += `<p>ย่อหน้าที่ ${i} สำหรับทดสอบการจัดหน้าอัตโนมัติของเอกสารราชการไทย เนื้อหายาวพอสมควรเพื่อให้แต่ละย่อหน้ากินพื้นที่หลายบรรทัดและเมื่อรวมกันจะเกินหนึ่งหน้ากระดาษ</p>`;
    }
    document.execCommand("insertHTML", false, html);
  });
  await page.waitForTimeout(2800);

  const result = await page.evaluate(() => {
    const bodies = Array.from(document.querySelectorAll(".page-body"));
    const contentBox = (el: Element) => {
      const cs = getComputedStyle(el as HTMLElement);
      return (
        (el as HTMLElement).clientHeight -
        (parseFloat(cs.paddingTop) || 0) -
        (parseFloat(cs.paddingBottom) || 0)
      );
    };
    const used = (el: Element) => {
      const cs = getComputedStyle(el as HTMLElement);
      const base =
        el.getBoundingClientRect().top + (parseFloat(cs.paddingTop) || 0);
      let h = 0;
      for (const ch of Array.from(el.children)) {
        h = Math.max(h, ch.getBoundingClientRect().bottom - base);
      }
      return h;
    };
    return bodies.map((b) => ({ used: used(b), box: contentBox(b) }));
  });

  const pageCount = result.length;
  // Should be a handful of well-filled pages, not one overstuffed + many empty.
  expect(pageCount).toBeGreaterThanOrEqual(3);
  expect(pageCount).toBeLessThanOrEqual(6);

  // No page may overflow its content box (no clipping).
  for (const p of result) {
    expect(p.used).toBeLessThanOrEqual(p.box + 2);
  }

  // Every page except the last must be meaningfully filled (no near-empty
  // middle pages like the old 34/2/2/2/2/2/2 distribution).
  for (let i = 0; i < result.length - 1; i++) {
    expect(result[i].used).toBeGreaterThan(result[i].box * 0.5);
  }
});
