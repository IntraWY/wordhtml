import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
    localStorage.setItem("wordhtml-recovery-opt-out", "1");
  });
});

test.describe("Cloud sync UX (M1 / D1)", () => {
  test("status bar shows local-only hint when Firebase not configured", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByLabel(/เครื่องนี้เท่านั้น|Local only|ยังไม่ซิงก์/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("history panel explains local vs cloud storage paths", async ({ page }) => {
    await page.goto("/");
    // History now lives inside the "เอกสาร (Documents)" dropdown in the TopBar.
    await page.getByRole("button", { name: "เอกสาร (Documents)" }).click();
    await page.getByRole("menuitem", { name: /ประวัติ/i }).click();
    await expect(page.getByText("ที่เก็บข้อมูล (Storage)")).toBeVisible();
    await expect(page.getByText(/localStorage → wordhtml-editor/)).toBeVisible();
    await expect(page.getByText(/users\/\{uid\}\/snapshots/)).toBeVisible();
  });
});
