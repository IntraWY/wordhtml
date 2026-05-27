import { beforeEach, describe, expect, it } from "vitest";

import {
  hasUploadedHistoryThisSession,
  markHistoryUploadedThisSession,
  clearHistoryUploadSession,
  isCloudHistoryMergePaused,
  setPauseCloudHistoryMerge,
} from "./cloudHistoryBridge";

describe("cloudHistoryBridge session upload", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setPauseCloudHistoryMerge(false);
  });

  it("tracks upload session per uid", () => {
    expect(hasUploadedHistoryThisSession("user-a")).toBe(false);
    markHistoryUploadedThisSession("user-a");
    expect(hasUploadedHistoryThisSession("user-a")).toBe(true);
    expect(hasUploadedHistoryThisSession("user-b")).toBe(false);
    clearHistoryUploadSession("user-a");
    expect(hasUploadedHistoryThisSession("user-a")).toBe(false);
  });

  it("pause flag blocks merge reads", () => {
    expect(isCloudHistoryMergePaused()).toBe(false);
    setPauseCloudHistoryMerge(true);
    expect(isCloudHistoryMergePaused()).toBe(true);
  });
});
