import { test, expect } from "@playwright/test";

const MULTI_PAGE_HTML = (() => {
  const paragraphs = Array.from({ length: 60 }, (_, i) => {
    const num = i + 1;
    return `<p style="margin-top:0pt;margin-bottom:0pt;line-height:1.5;">Paragraph ${num}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`;
  });
  return paragraphs.join("\n");
})();

test.describe("Page Break Smoke", () => {
  test("multi-page content renders page break indicators", async ({ page }) => {
    // 1. Navigate to root (editor lives at /)
    await page.goto("/", { waitUntil: "networkidle" });

    const editor = page.locator("[contenteditable='true']").first();
    await expect(editor).toBeVisible();

    // 2. Inject multi-page content via ProseMirror API
    await editor.evaluate((el, html) => {
      const view = (window as any).__PROSE_MIRROR_EDITOR_VIEW__;
      if (view) {
        const { state } = view;
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
        const content: any[] = [];
        doc.querySelectorAll("p").forEach((p) => {
          content.push({
            type: "paragraph",
            content: [{ type: "text", text: p.textContent || "" }],
          });
        });
        const tr = state.tr.replaceWith(0, state.doc.content.size, state.schema.nodeFromJSON({
          type: "doc",
          content,
        }));
        view.dispatch(tr);
      } else {
        // Fallback: set innerHTML directly on the contenteditable
        (el as HTMLElement).innerHTML = html;
        // Dispatch input event so any listeners react
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }, MULTI_PAGE_HTML);

    // 3. Wait for pagination recalculation
    await page.waitForTimeout(3000);

    // 4. Scroll to around position 850 in the editor container
    const paper = page.locator("article.paper, .paper, [contenteditable='true']").first();
    await paper.evaluate((el) => {
      el.scrollTop = 850;
    });
    await page.waitForTimeout(500);

    // Scroll the outer window so the page break area is in viewport for the screenshot
    await page.evaluate(() => {
      window.scrollTo(0, 900);
    });
    await page.waitForTimeout(300);

    // 5. Verifications
    const indicators = page.locator(".page-break-indicator");
    const count = await indicators.count();

    // Should be at least 3 page breaks for 60 paragraphs (actual count depends on font metrics)
    expect(count).toBeGreaterThanOrEqual(3);

    // Each indicator should have label text like "หน้า 2", "หน้า 3"
    for (let i = 0; i < count; i++) {
      const text = await indicators.nth(i).textContent();
      expect(text).toMatch(/หน้า\s*\d+/);
    }

    // Gap shows dot grid background (computed style background-image contains radial-gradient)
    const firstIndicator = indicators.first();
    const bgImage = await firstIndicator.evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    expect(bgImage).toContain("radial-gradient");

    // Paper has box-shadow
    const paperBoxShadow = await paper.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    expect(paperBoxShadow).not.toBe("none");

    // No visual glitches: check that indicators are not overlapping each other
    const boxes = await indicators.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
      })
    );
    for (let i = 1; i < boxes.length; i++) {
      const prev = boxes[i - 1];
      const curr = boxes[i];
      // Ensure vertical separation (non-overlapping)
      expect(curr.top).toBeGreaterThanOrEqual(prev.bottom - 1); // allow 1px rounding
    }

    // 6. Take screenshot of the page break area for visual verification
    // Scroll the first indicator into view first
    await indicators.first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const firstBox = await indicators.first().boundingBox();
    if (firstBox && firstBox.width > 0 && firstBox.height > 0) {
      const clip = {
        x: Math.max(0, Math.round(firstBox.x - 20)),
        y: Math.max(0, Math.round(firstBox.y - 10)),
        width: Math.round(firstBox.width + 40),
        height: Math.round(firstBox.height + 20),
      };
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        clip.width = Math.min(clip.width, viewportSize.width - clip.x);
        clip.height = Math.min(clip.height, viewportSize.height - clip.y);
      }
      await page.screenshot({
        path: "tests/e2e/screenshots/page-break-smoke.png",
        clip,
      });
    } else {
      await page.screenshot({ path: "tests/e2e/screenshots/page-break-smoke.png", fullPage: false });
    }
  });
});
