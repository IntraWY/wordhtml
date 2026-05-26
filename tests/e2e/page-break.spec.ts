import { test, expect, type Page } from "@playwright/test";

const MULTI_PAGE_HTML = (() => {
  const paragraphs = Array.from({ length: 60 }, (_, i) => {
    const num = i + 1;
    return `<p style="margin-top:0pt;margin-bottom:0pt;line-height:1.5;">Paragraph ${num}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>`;
  });
  return paragraphs.join("\n");
})();

async function dismissOnboardingIfPresent(page: Page) {
  const closeButton = page.getByRole("button", { name: "Close" });
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click();
  }
}

async function pasteHtmlIntoEditor(page: Page, html: string) {
  const editor = page.locator("[contenteditable='true']").first();
  await editor.click();
  await page.evaluate((content) => {
    const el = document.querySelector("[contenteditable='true']");
    if (!el) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.setData("text/html", content);
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true,
      })
    );
  }, html);
}

test.describe("Multi-page pagination", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(
        "wordhtml-onboarding",
        JSON.stringify({ hasSeenTour: true })
      );
    });
  });

  test("long pasted content renders multiple page nodes", async ({ page }) => {
    await page.goto("/");
    await dismissOnboardingIfPresent(page);

    const editor = page.locator("[contenteditable='true']").first();
    await expect(editor).toBeVisible();
    await expect(page.locator(".page-node")).toHaveCount(1);

    await pasteHtmlIntoEditor(page, MULTI_PAGE_HTML);

    await expect
      .poll(async () => page.locator(".page-node").count(), { timeout: 15000 })
      .toBeGreaterThanOrEqual(2);

    const pageNodes = page.locator(".page-node");
    const count = await pageNodes.count();
    expect(count).toBeLessThanOrEqual(12);

    for (let i = 0; i < count; i++) {
      await expect(pageNodes.nth(i).locator(".page-body")).toBeVisible();
    }

    const boxShadow = await pageNodes.first().evaluate(
      (el) => window.getComputedStyle(el).boxShadow
    );
    expect(boxShadow).not.toBe("none");

    const boxes = await pageNodes.evaluateAll((els) =>
      els.map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })
    );
    for (let i = 1; i < boxes.length; i++) {
      expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }

    await pageNodes.nth(1).scrollIntoViewIfNeeded();
    const secondBox = await pageNodes.nth(1).boundingBox();
    if (secondBox && secondBox.width > 0 && secondBox.height > 0) {
      await page.screenshot({
        path: "tests/e2e/screenshots/page-break-smoke.png",
        clip: {
          x: Math.max(0, Math.round(secondBox.x - 20)),
          y: Math.max(0, Math.round(secondBox.y - 10)),
          width: Math.round(secondBox.width + 40),
          height: Math.round(secondBox.height + 20),
        },
      });
    }
  });
});
