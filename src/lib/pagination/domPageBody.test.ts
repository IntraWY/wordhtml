import { describe, it, expect, afterEach } from "vitest";
import { isDomPageBodyEffectivelyEmpty } from "./domPageBody";

describe("isDomPageBodyEffectivelyEmpty", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns true for whitespace-only paragraph", () => {
    const body = document.createElement("div");
    body.className = "page-body";
    body.innerHTML = '<div class="ProseMirror"><p>   </p></div>';
    document.body.appendChild(body);
    expect(isDomPageBodyEffectivelyEmpty(body)).toBe(true);
  });

  it("returns false when text is present", () => {
    const body = document.createElement("div");
    body.className = "page-body";
    body.innerHTML = '<div class="ProseMirror"><p>Hello</p></div>';
    document.body.appendChild(body);
    expect(isDomPageBodyEffectivelyEmpty(body)).toBe(false);
  });
});
