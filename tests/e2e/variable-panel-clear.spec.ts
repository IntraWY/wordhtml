import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test("VariablePanel clear button empties variable values", async ({ page }) => {
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

  const clearBtn = page.getByRole("button", { name: "ล้างค่าตัวแปร" });
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();
  await expect(valueInput).toHaveValue("");
});
