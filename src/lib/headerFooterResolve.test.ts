import { describe, it, expect } from "vitest";
import { resolveHeaderFooter } from "./headerFooterResolve";

describe("resolveHeaderFooter", () => {
  it("uses first page header when differentFirstPage and page 1", () => {
    const { header } = resolveHeaderFooter(
      1,
      "H",
      "F",
      true,
      false,
      "FIRST-H",
      "FIRST-F"
    );
    expect(header).toBe("FIRST-H");
  });

  it("uses even header on page 2 when differentOddEven", () => {
    const { header } = resolveHeaderFooter(
      2,
      "H",
      "F",
      false,
      true,
      undefined,
      undefined,
      "EVEN-H",
      "EVEN-F"
    );
    expect(header).toBe("EVEN-H");
  });
});
