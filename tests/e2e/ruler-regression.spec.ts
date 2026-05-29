import { test, expect } from "@playwright/test";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
  });
});

async function enableTemplatePreview(page: import("@playwright/test").Page) {
  await page.goto("/");
  await expect(page.locator("[contenteditable='true']").first()).toBeVisible();
  await page.getByRole("button", { name: "แทรก (Insert)" }).click();
  await page.getByRole("button", { name: "แทรกตัวแปร" }).click();
  await expect(
    page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" })
  ).toBeVisible();
}

async function submitPrompt(page: import("@playwright/test").Page, value: string) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("input[type='text']").fill(value);
  await dialog.getByRole("button", { name: "ตกลง (OK)" }).click();
}

async function insertImageAt50(page: import("@playwright/test").Page) {
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
}

test.describe("Ruler regression", () => {
  test("indent ruler reflects paragraph margin-left after ruler keyboard", async ({
    page,
  }) => {
    await enableTemplatePreview(page);
    const editor = page.locator("[contenteditable='true']").first();
    await editor.click();
    await page.keyboard.type("Indent test line.");

    const leftSlider = page.getByRole("slider", { name: /Left indent/i });
    await expect(leftSlider).toBeVisible();
    await leftSlider.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");

    const rulerTenths = parseInt(
      (await leftSlider.getAttribute("aria-valuenow")) ?? "0",
      10
    );
    expect(rulerTenths).toBeGreaterThan(0);

    const marginLeftCm = await page.evaluate(() => {
      const p = document.querySelector(".page-body p");
      if (!p) return 0;
      const ml = (p as HTMLElement).style.marginLeft;
      const match = ml.match(/([\d.]+)cm/);
      return match ? parseFloat(match[1]) : 0;
    });
    expect(marginLeftCm).toBeGreaterThan(0);
  });

  test("image 50% width stable within 2px across preview toggle", async ({
    page,
  }) => {
    await enableTemplatePreview(page);
    await insertImageAt50(page);

    const widthBefore = await page.evaluate(() => {
      const img = document.querySelector(".page-body img");
      return img ? img.getBoundingClientRect().width : null;
    });
    expect(widthBefore).not.toBeNull();

    await page.getByRole("button", { name: "ดูตัวอย่าง (Preview)" }).click();
    await expect(page.locator(".page-body img, .page-node img").first()).toBeVisible();

    const widthPreview = await page.evaluate(() => {
      const img = document.querySelector(".page-body img, .page-node img");
      return img ? img.getBoundingClientRect().width : null;
    });
    expect(widthPreview).not.toBeNull();
    expect(Math.abs(widthPreview! - widthBefore!)).toBeLessThanOrEqual(2);

    await page.getByRole("button", { name: "แก้ไข (Edit)" }).click();
    await expect(page.locator(".page-body img").first()).toBeVisible();

    const widthAfter = await page.evaluate(() => {
      const img = document.querySelector(".page-body img");
      return img ? img.getBoundingClientRect().width : null;
    });
    expect(widthAfter).not.toBeNull();
    expect(Math.abs(widthAfter! - widthBefore!)).toBeLessThanOrEqual(2);
  });
});
