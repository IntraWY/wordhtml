import { describe, it, expect } from "vitest";
import { bahtText } from "./bahtText";

describe("bahtText", () => {
  it("reads zero", () => {
    expect(bahtText(0)).toBe("ศูนย์บาทถ้วน");
  });

  it("reads single units", () => {
    expect(bahtText(1)).toBe("หนึ่งบาทถ้วน");
    expect(bahtText(5)).toBe("ห้าบาทถ้วน");
  });

  it("uses สิบ / เอ็ด / ยี่ rules", () => {
    expect(bahtText(10)).toBe("สิบบาทถ้วน");
    expect(bahtText(11)).toBe("สิบเอ็ดบาทถ้วน");
    expect(bahtText(20)).toBe("ยี่สิบบาทถ้วน");
    expect(bahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
  });

  it("reads hundreds / thousands with เอ็ด", () => {
    expect(bahtText(100)).toBe("หนึ่งร้อยบาทถ้วน");
    expect(bahtText(101)).toBe("หนึ่งร้อยเอ็ดบาทถ้วน");
    expect(bahtText(1000)).toBe("หนึ่งพันบาทถ้วน");
    expect(bahtText(2500)).toBe("สองพันห้าร้อยบาทถ้วน");
  });

  it("reads millions", () => {
    expect(bahtText(1000000)).toBe("หนึ่งล้านบาทถ้วน");
    expect(bahtText(1234567)).toBe(
      "หนึ่งล้านสองแสนสามหมื่นสี่พันห้าร้อยหกสิบเจ็ดบาทถ้วน"
    );
  });

  it("reads satang", () => {
    expect(bahtText(25.75)).toBe("ยี่สิบห้าบาทเจ็ดสิบห้าสตางค์");
    expect(bahtText(0.5)).toBe("ห้าสิบสตางค์");
    expect(bahtText(1.01)).toBe("หนึ่งบาทหนึ่งสตางค์");
  });

  it("rounds satang to two decimals (with carry)", () => {
    expect(bahtText(99.999)).toBe("หนึ่งร้อยบาทถ้วน"); // satang carries to baht
    expect(bahtText(12.346)).toBe("สิบสองบาทสามสิบห้าสตางค์");
  });

  it("handles negative amounts", () => {
    expect(bahtText(-5)).toBe("ลบห้าบาทถ้วน");
  });

  it("accepts numeric strings", () => {
    expect(bahtText("1,234.50")).toBe(
      "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"
    );
  });
});
