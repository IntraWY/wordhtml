import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
    localStorage.setItem("wordhtml-recovery-opt-out", "1");
    const editorState = {
      state: {
        templateMode: true,
        enabledCleaners: [],
        imageMode: "inline",
        history: [],
        pageSetup: {
          size: "A4",
          orientation: "portrait",
          marginMm: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
        },
      },
      version: 0,
    };
    localStorage.setItem("wordhtml-editor", JSON.stringify(editorState));
  });
});

test("typing after variable badge does not corrupt {{name}}", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible({ timeout: 15_000 });

  await editor.click();

  await page.getByRole("button", { name: "แทรก (Insert)" }).click();
  await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
  await page.getByRole("button", { name: "เพิ่มตัวแปร (Add Variable)" }).click();
  await page.getByPlaceholder("ชื่อตัวแปร").fill("customer");
  await page.getByPlaceholder("ชื่อตัวแปร").press("Enter");

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("wordhtml:insert-variable", { detail: "customer" })
    );
  });

  const badge = editor.locator('.variable-badge[data-variable="customer"]');
  await expect(badge).toHaveCount(1);
  await expect(badge).toHaveText("{{customer}}");

  await editor.click();
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press("ArrowRight");
  }
  await page.keyboard.type(" hello");

  await expect(badge).toHaveText("{{customer}}");
  await expect(editor).toContainText("hello");
});
