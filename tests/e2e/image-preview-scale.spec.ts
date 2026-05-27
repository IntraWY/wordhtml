import { test, expect } from "@playwright/test";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

async function submitPrompt(page: import("@playwright/test").Page, value: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("input[type='text']").fill(value);
  await dialog.getByRole("button", { name: "ตกลง (OK)" }).click();
}

async function insertImageAndSet25(page: import("@playwright/test").Page) {
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: PNG_BYTES,
  });
  await submitPrompt(page, "test");
  await expect(page.locator(".ProseMirror img")).toHaveCount(1, {
    timeout: 10_000,
  });
  await page.locator(".ProseMirror img").click();
  await page.locator(".ProseMirror").getByRole("button", { name: "50%" }).click();
  await page.locator(".ProseMirror").getByRole("button", { name: "25%" }).click();
}

async function measureImage(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const img = document.querySelector(".page-body img") as HTMLImageElement | null;
    const body = document.querySelector(".page-body");
    if (!img || !body) return null;
    const imgRect = img.getBoundingClientRect();
    const bodyRect = body.getBoundingClientRect();
    return {
      imgWidthPx: Math.round(imgRect.width),
      bodyWidthPx: Math.round(bodyRect.width),
      pct: Math.round((imgRect.width / bodyRect.width) * 1000) / 10,
      style: img.getAttribute("style"),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

test.describe("Image preview scale", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[contenteditable='true']").first()).toBeVisible();
    await page.getByRole("button", { name: "แทรก (Insert)" }).click();
    await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
    await expect(page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" })).toBeVisible();
  });

  test("25% preset matches edit and preview via PreviewToggle", async ({ page }) => {
    await insertImageAndSet25(page);

    const editMeasure = await measureImage(page);
    expect(editMeasure).not.toBeNull();
    expect(editMeasure!.style ?? "").toMatch(/width:\s*\d+px/);
    expect(editMeasure!.pct).toBeGreaterThan(20);
    expect(editMeasure!.pct).toBeLessThan(30);

    await page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" }).click();
    await expect(page.locator(".page-body img")).toHaveCount(1);

    const previewMeasure = await measureImage(page);
    expect(previewMeasure).not.toBeNull();
    expect(Math.abs(previewMeasure!.imgWidthPx - editMeasure!.imgWidthPx)).toBeLessThanOrEqual(2);
    expect(Math.abs(previewMeasure!.pct - editMeasure!.pct)).toBeLessThanOrEqual(2);
  });

  test("25% preset matches edit and preview via VariablePanel", async ({ page }) => {
    await insertImageAndSet25(page);

    await page.getByRole("button", { name: "เพิ่มตัวแปร (Add Variable)" }).click();
    await page.getByPlaceholder("ชื่อตัวแปร").fill("name");
    await page.getByPlaceholder("ชื่อตัวแปร").press("Enter");
    await expect(page.getByRole("button", { name: "Preview", exact: true })).toBeEnabled();

    const editMeasure = await measureImage(page);
    expect(editMeasure).not.toBeNull();

    await page.getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.locator(".page-body img")).toHaveCount(1);

    const previewMeasure = await measureImage(page);
    expect(previewMeasure).not.toBeNull();
    expect(Math.abs(previewMeasure!.imgWidthPx - editMeasure!.imgWidthPx)).toBeLessThanOrEqual(2);
    expect(Math.abs(previewMeasure!.pct - editMeasure!.pct)).toBeLessThanOrEqual(2);
  });
});
