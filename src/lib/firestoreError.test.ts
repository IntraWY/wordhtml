import { describe, expect, it } from "vitest";

import { firestoreErrorMessage } from "./firestoreError";

describe("firestoreErrorMessage", () => {
  it("maps permission-denied", () => {
    expect(
      firestoreErrorMessage({ code: "permission-denied" }, "fallback")
    ).toContain("deploy Firestore rules");
  });

  it("maps unauthenticated", () => {
    expect(
      firestoreErrorMessage({ code: "unauthenticated" }, "fallback")
    ).toContain("เข้าสู่ระบบ");
  });

  it("uses error message for unknown codes", () => {
    expect(
      firestoreErrorMessage(new Error("network fail"), "ลบไม่สำเร็จ")
    ).toBe("ลบไม่สำเร็จ: network fail");
  });
});
