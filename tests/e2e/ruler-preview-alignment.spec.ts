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

async function measurePaperLeft(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const body =
      document.querySelector(".page-body") ??
      document.querySelector(".page-node");
    if (!body) return null;
    return Math.round(body.getBoundingClientRect().left);
  });
}

test.describe("Ruler / preview paper alignment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[contenteditable='true']").first()).toBeVisible();
    await page.getByRole("button", { name: "แทรก (Insert)" }).click();
    await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
    await expect(
      page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" })
    ).toBeVisible();
    await page.locator("[contenteditable='true']").first().click();
    await page.keyboard.type("Alignment check paragraph.");
  });

  test("paper horizontal position stable across preview toggle", async ({
    page,
  }) => {
    const editLeft = await measurePaperLeft(page);
    expect(editLeft).not.toBeNull();

    await page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" }).click();
    await expect(page.locator(".page-node, .page-body").first()).toBeVisible();

    const previewLeft = await measurePaperLeft(page);
    expect(previewLeft).not.toBeNull();
    expect(Math.abs(previewLeft! - editLeft!)).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "แก้ไข (Edit)" }).click();
    await expect(page.locator(".page-body").first()).toBeVisible();

    const editAgainLeft = await measurePaperLeft(page);
    expect(editAgainLeft).not.toBeNull();
    expect(Math.abs(editAgainLeft! - editLeft!)).toBeLessThanOrEqual(1);
  });
});
