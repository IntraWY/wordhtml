import { test, expect } from "@playwright/test";
import path from "path";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test.describe("Smoke", () => {
  test("app loads and editor is visible", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await expect(editor).toBeVisible();
    await expect(page.locator(".page-node")).toHaveCount(1);
    await expect(page.locator(".page-body")).toHaveCount(1);
  });

  test("vertical ruler aligns with single page paper", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".page-node")).toBeVisible();
    await expect(page.locator(".ruler-v")).toBeVisible();

    const alignment = await page.evaluate(() => {
      const page = document.querySelector(".page-node");
      const ruler = document.querySelector(".ruler-v");
      if (!page || !ruler) return null;
      const pageRect = page.getBoundingClientRect();
      const rulerRect = ruler.getBoundingClientRect();
      return {
        topDeltaPx: Math.round(pageRect.top - rulerRect.top),
        bottomDeltaPx: Math.round(
          rulerRect.bottom - (pageRect.top + pageRect.height)
        ),
        rulerHeight: Math.round(rulerRect.height),
        pageHeight: Math.round(pageRect.height),
      };
    });

    expect(alignment).not.toBeNull();
    expect(alignment!.topDeltaPx).toBeGreaterThanOrEqual(20);
    expect(alignment!.topDeltaPx).toBeLessThanOrEqual(28);
    expect(alignment!.bottomDeltaPx).toBeGreaterThanOrEqual(-2);
    expect(alignment!.bottomDeltaPx).toBeLessThanOrEqual(2);
    expect(alignment!.rulerHeight - alignment!.pageHeight).toBe(
      alignment!.topDeltaPx
    );
  });

  test("can type into the editor", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await editor.fill("Hello World");
    await expect(editor).toContainText("Hello World");
  });

  test("export dialog opens with Ctrl+S", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await editor.fill("Test document");
    await page.keyboard.press("Control+s");
    await expect(page.locator("text=ส่งออก").first()).toBeVisible();
  });

  test("uploads a .docx file and content loads", async ({ page }) => {
    await page.goto("/");

    const editor = page.locator("[contenteditable='true']").first();
    await expect(editor).toBeVisible();

    // Intercept file chooser via the hidden input
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeHidden();

    const fixturePath = path.resolve(__dirname, "../fixtures/sample.docx");
    await fileInput.setInputFiles(fixturePath);

    // Wait for the upload button to become disabled (loading) then re-enabled (done)
    const uploadButton = page.locator("button[aria-label*='อัปโหลด' i]").first();
    await expect(uploadButton).toHaveAttribute("disabled", "", { timeout: 5000 });
    await expect(uploadButton).not.toHaveAttribute("disabled", "");

    // Assert converted content appears in the editor
    await expect(editor).toContainText("Hello from docx", { timeout: 10000 });
    await expect(page.locator(".page-node").first()).toBeVisible();
  });
});
