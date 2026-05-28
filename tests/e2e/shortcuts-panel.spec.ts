import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test("shortcuts panel lists accurate Ctrl+K and Ctrl+Shift+K", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("F1");
  await expect(
    page.getByRole("dialog", { name: /คีย์ลัด/i })
  ).toBeVisible();
  await expect(page.getByText("Ctrl+K").first()).toBeVisible();
  await expect(page.getByText("พาเลตคำสั่ง")).toBeVisible();
  await expect(page.getByText("Ctrl+Shift+K")).toBeVisible();
  await expect(page.getByText("แทรกลิงก์").first()).toBeVisible();
});

test("Ctrl+K opens command palette while editing", async ({ page }) => {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await editor.click();
  await editor.fill("test");
  await page.keyboard.press("Control+k");
  await expect(page.getByPlaceholder(/ค้นหาคำสั่ง/i)).toBeVisible({
    timeout: 5000,
  });
});
