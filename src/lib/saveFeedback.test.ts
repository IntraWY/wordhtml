import { describe, it, expect } from "vitest";
import { saveFeedbackLabel } from "./saveFeedback";

describe("saveFeedbackLabel", () => {
  it("returns the auto-save label regardless of cloud state", () => {
    expect(
      saveFeedbackLabel("auto", { signedIn: true, firebaseConfigured: true })
    ).toBe("บันทึกอัตโนมัติแล้ว");
    expect(
      saveFeedbackLabel("auto", { signedIn: false, firebaseConfigured: false })
    ).toBe("บันทึกอัตโนมัติแล้ว");
  });

  it("announces cloud sync when signed in", () => {
    expect(
      saveFeedbackLabel("manual", { signedIn: true, firebaseConfigured: true })
    ).toBe("บันทึกแล้ว • ซิงก์ขึ้นคลาวด์");
  });

  it("nudges sign-in when Firebase is configured but signed out", () => {
    expect(
      saveFeedbackLabel("manual", { signedIn: false, firebaseConfigured: true })
    ).toBe("บันทึกในเครื่องแล้ว — ลงชื่อเข้าใช้เพื่อซิงก์คลาวด์");
  });

  it("uses the plain label when Firebase is not configured", () => {
    expect(
      saveFeedbackLabel("manual", { signedIn: false, firebaseConfigured: false })
    ).toBe("บันทึกแล้ว");
  });
});
