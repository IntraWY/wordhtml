import { type Page, expect } from "@playwright/test";

/**
 * Init script that unblocks the editor for tests by opting out of the two
 * auto-appearing surfaces that otherwise cover/reset it:
 *  - the onboarding tour, and
 *  - the draft-recovery prompt (its z-60 backdrop intercepts all clicks/typing).
 * Must run before `goto` (call from `beforeEach`).
 */
export async function primeEditorPage(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "wordhtml-onboarding",
      JSON.stringify({ hasSeenTour: true })
    );
    localStorage.setItem("wordhtml-recovery-opt-out", "1");
  });
}

/**
 * Navigate to the editor and wait for it to SETTLE before interacting. The
 * editor runs hydration + mount-time pagination normalization in the first
 * ~1s; content injected during that window is reset. Real users never type
 * that fast, so tests must wait for the app to be ready.
 */
export async function gotoEditor(page: Page) {
  await page.goto("/");
  const editor = page.locator(".ProseMirror").first();
  await expect(editor).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  return editor;
}

/**
 * Inject plain text through the real input pipeline. ProseMirror/Tiptap ignores
 * deprecated `document.execCommand` mutations, so that no longer works.
 */
export async function typeText(page: Page, text: string) {
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.insertText(text);
}

/**
 * Paste HTML into the editor via a real paste event so ProseMirror's paste
 * handling (transformPastedHTML, page-node normalization) runs — the proper
 * replacement for `execCommand("insertHTML")`.
 */
export async function pasteHtml(page: Page, html: string) {
  await page.locator(".ProseMirror").first().click();
  await page.evaluate((h) => {
    const el = document.querySelector(".ProseMirror") as HTMLElement;
    el.focus();
    const dt = new DataTransfer();
    dt.setData("text/html", h);
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      })
    );
  }, html);
}
