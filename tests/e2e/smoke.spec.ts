import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Smoke", () => {
  test("app loads and editor is visible", async ({ page }) => {
    await page.goto("/");
    const editor = page.locator("[contenteditable='true']").first();
    await expect(editor).toBeVisible();
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
  });
});
