import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  scheduleRecoveryDraft,
  clearRecoveryDraft,
  loadRecoveryDraft,
  shouldOfferRecovery,
  setRecoveryOptOut,
  RECOVERY_OPT_OUT_KEY,
} from "./draftRecovery";

describe("draftRecovery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
    clearRecoveryDraft();
    setRecoveryOptOut(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    clearRecoveryDraft();
  });

  it("persists draft to sessionStorage after debounce", async () => {
    scheduleRecoveryDraft("<p>hello</p>", "test.docx");
    vi.advanceTimersByTime(8000);
    await vi.runAllTimersAsync();

    const draft = await loadRecoveryDraft();
    expect(draft?.html).toBe("<p>hello</p>");
    expect(draft?.fileName).toBe("test.docx");
  });

  it("clears draft when html is empty", async () => {
    scheduleRecoveryDraft("<p>x</p>", null);
    vi.advanceTimersByTime(8000);
    await vi.runAllTimersAsync();

    clearRecoveryDraft();
    const draft = await loadRecoveryDraft();
    expect(draft).toBeNull();
  });

  it("shouldOfferRecovery when draft differs from current", () => {
    const draft = {
      html: "<p>a</p>",
      fileName: null,
      savedAt: new Date().toISOString(),
    };
    expect(shouldOfferRecovery(draft, "", undefined)).toBe(true);
    expect(shouldOfferRecovery(draft, "<p>a</p>", undefined)).toBe(false);
    expect(shouldOfferRecovery(draft, "", "<p>a</p>")).toBe(false);
  });

  it("skips when user opted out", async () => {
    localStorage.setItem(RECOVERY_OPT_OUT_KEY, "1");
    scheduleRecoveryDraft("<p>x</p>", null);
    vi.advanceTimersByTime(8000);
    await vi.runAllTimersAsync();
    const draft = await loadRecoveryDraft();
    expect(draft).toBeNull();
  });
});
