import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test("VariablePanel remove button deletes variable from panel and document", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".ProseMirror").first()).toBeVisible();

  await page.getByRole("button", { name: "แทรก (Insert)" }).click();
  await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
  await page.getByRole("button", { name: "เพิ่มตัวแปร (Add Variable)" }).click();
  await page.getByPlaceholder("ชื่อตัวแปร").fill("customer");
  await page.getByPlaceholder("ชื่อตัวแปร").press("Enter");

  await page
    .getByRole("button", { name: /คลิกเพื่อแทรกที่ cursor/ })
    .click();

  await expect(page.locator('.variable-badge[data-variable="customer"]')).toHaveCount(1);
  await expect(page.getByPlaceholder("ค่า (value)")).toHaveCount(1);

  await page.getByRole("button", { name: "ลบตัวแปร (Remove variable)" }).click();
  await expect(
    page.getByRole("dialog").getByText("ลบตัวแปร (Remove Variable)")
  ).toBeVisible();
  await page.getByRole("button", { name: "ยืนยัน (Confirm)" }).click();

  await expect(page.locator('.variable-badge[data-variable="customer"]')).toHaveCount(0);
  await expect(page.getByPlaceholder("ค่า (value)")).toHaveCount(0);
  await expect(page.getByText("ตัวแปร (0)")).toBeVisible();
});
