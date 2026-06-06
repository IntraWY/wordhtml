import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";

import { useTemplateStore, SignInRequiredError } from "./templateStore";
import { useAuthStore } from "@/store/authStore";
import * as firestore from "@/lib/templateFirestore";
import { isFirebaseConfigured } from "@/lib/firebaseConfig";

const pageSetup = {
  size: "A4" as const,
  orientation: "portrait" as const,
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

vi.mock("@/lib/templateFirestore", () => ({
  subscribeTemplates: vi.fn(() => vi.fn()),
  saveTemplate: vi.fn(() => Promise.resolve()),
  updateTemplateName: vi.fn(() => Promise.resolve()),
  deleteTemplate: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/lib/firebaseConfig", () => ({
  isFirebaseConfigured: vi.fn(() => true),
}));

const mockConfigured = vi.mocked(isFirebaseConfigured);

function signIn(uid: string) {
  useAuthStore.setState({ user: { uid } as unknown as User });
}
function signOut() {
  useAuthStore.setState({ user: null });
}

describe("templateStore cloud-write sign-in gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigured.mockReturnValue(true);
    useTemplateStore.setState({ templates: [], panelOpen: false, loading: false, error: null });
    signOut();
  });

  it("throws SignInRequiredError and does NOT write when configured but signed out", async () => {
    await expect(
      useTemplateStore.getState().saveTemplate("Doc", "<p>hi</p>", pageSetup)
    ).rejects.toBeInstanceOf(SignInRequiredError);
    expect(firestore.saveTemplate).not.toHaveBeenCalled();
  });

  it("writes with the user's uid when signed in", async () => {
    signIn("user-123");
    await useTemplateStore.getState().saveTemplate("Doc", "<p>hi</p>", pageSetup);
    expect(firestore.saveTemplate).toHaveBeenCalledTimes(1);
    const [, uidArg] = vi.mocked(firestore.saveTemplate).mock.calls[0];
    expect(uidArg).toBe("user-123");
  });

  it("gates rename and delete the same way", async () => {
    await expect(
      useTemplateStore.getState().renameTemplate("id1", "New")
    ).rejects.toBeInstanceOf(SignInRequiredError);
    await expect(
      useTemplateStore.getState().deleteTemplate("id1")
    ).rejects.toBeInstanceOf(SignInRequiredError);
    expect(firestore.updateTemplateName).not.toHaveBeenCalled();
    expect(firestore.deleteTemplate).not.toHaveBeenCalled();
  });

  it("gates importTemplates when signed out", async () => {
    await expect(
      useTemplateStore.getState().importTemplates([
        { id: "x", name: "X", html: "<p>x</p>", pageSetup, createdAt: new Date().toISOString() },
      ])
    ).rejects.toBeInstanceOf(SignInRequiredError);
    expect(firestore.saveTemplate).not.toHaveBeenCalled();
  });

  it("does NOT gate when Firebase is not configured (legacy/local path)", async () => {
    mockConfigured.mockReturnValue(false);
    await useTemplateStore.getState().saveTemplate("Doc", "<p>hi</p>", pageSetup);
    expect(firestore.saveTemplate).toHaveBeenCalledTimes(1);
    const [, uidArg] = vi.mocked(firestore.saveTemplate).mock.calls[0];
    expect(uidArg).toBeNull();
  });
});
