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

test("VariablePanel clear button removes all variables after confirm", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".ProseMirror").first()).toBeVisible();
  await page.getByRole("button", { name: "แทรก (Insert)" }).click();
  await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
  await page.getByRole("button", { name: "เพิ่มตัวแปร (Add Variable)" }).click();
  await page.getByPlaceholder("ชื่อตัวแปร").fill("customer");
  await page.getByPlaceholder("ชื่อตัวแปร").press("Enter");

  const valueInput = page.getByPlaceholder("ค่า (value)");
  await valueInput.fill("ACME");
  await expect(valueInput).toHaveValue("ACME");

  await page.getByRole("button", { name: "ลบตัวแปรทั้งหมด" }).click();
  await expect(
    page.getByRole("dialog").getByText("ลบตัวแปรทั้งหมด (Clear All Variables)")
  ).toBeVisible();
  await page.getByRole("button", { name: "ยืนยัน (Confirm)" }).click();

  await expect(valueInput).toHaveCount(0);
  await expect(page.getByText("ตัวแปร (0/0)")).toBeVisible();
});
