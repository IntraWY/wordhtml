import { describe, it, expect } from "vitest";

import { sanitizeHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("removes scripts and event handlers", () => {
    const input =
      '<p onclick="alert(1)">x</p><script>alert(2)</script><a href="javascript:alert(3)">y</a>';
    const out = sanitizeHtml(input);
    expect(out).toContain("<p>x</p>");
    expect(out).not.toContain("onclick=");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("javascript:");
  });

  it("returns empty string on parser failure by default", () => {
    const original = globalThis.DOMParser;
    try {
      // Simulate a DOMParser crash
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMParser = class {
        parseFromString() {
          throw new Error("boom");
        }
      };
      expect(sanitizeHtml("<p>ok</p>")).toBe("");
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMParser = original;
    }
  });

  it("throws on parser failure when configured", () => {
    const original = globalThis.DOMParser;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMParser = class {
        parseFromString() {
          throw new Error("boom");
        }
      };
      expect(() => sanitizeHtml("<p>ok</p>", { onError: "throw" })).toThrow(
        /Sanitize failed/i
      );
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).DOMParser = original;
    }
  });
});

