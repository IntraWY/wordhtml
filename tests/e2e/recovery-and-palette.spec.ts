import { test, expect } from "@playwright/test";

test.describe("Recovery and command palette", () => {
  test("shows recovery dialog when draft exists in sessionStorage", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForSelector(".ProseMirror", { timeout: 30_000 });

    await page.evaluate(() => {
      sessionStorage.setItem(
        "wordhtml-recovery-session",
        JSON.stringify({
          html: '<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p>Recovered draft</p></div></div>',
          fileName: "draft.html",
          savedAt: new Date().toISOString(),
        })
      );
    });

    await page.reload();
    await expect(
      page.getByRole("dialog", { name: /กู้เอกสาร/i })
    ).toBeVisible({ timeout: 15_000 });
  });

  test("opens command palette with Ctrl+K", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".ProseMirror", { timeout: 30_000 });
    await page.keyboard.press("Control+k");
    await expect(
      page.getByPlaceholder(/ค้นหาคำสั่ง/i)
    ).toBeVisible({ timeout: 5_000 });
  });
});
