import { describe, it, expect } from "vitest";
import {
  replacePageTokens,
  listPageTokensIn,
  PAGE_TOKEN_HELP,
} from "./pageTokens";
import { PAGE_TOKEN_REGEX } from "./constants";

const NOW = new Date(2026, 5, 7, 14, 5); // 7 มิ.ย. 2569, 14:05

describe("page tokens — {time} / {time_th}", () => {
  const ctx = { pageNumber: 1, totalPages: 1, now: NOW };

  it("{time} renders current time as HH:mm", () => {
    expect(replacePageTokens("{time}", ctx)).toBe("14:05");
  });

  it("{time} zero-pads hours and minutes", () => {
    const c = { ...ctx, now: new Date(2026, 5, 7, 8, 3) };
    expect(replacePageTokens("{time}", c)).toBe("08:03");
  });

  it("{time_th} renders time in Thai numerals", () => {
    expect(replacePageTokens("{time_th}", ctx)).toBe("๑๔:๐๕");
  });
});

describe("page tokens — unknown tokens pass through unchanged", () => {
  const ctx = { pageNumber: 3, totalPages: 9, now: NOW };

  it("keeps unrecognized {xyz} literally in the output", () => {
    expect(replacePageTokens("{xyz}", ctx)).toBe("{xyz}");
  });

  it("replaces known tokens while keeping unknown ones intact", () => {
    expect(replacePageTokens("หน้า {page} {unknown_token} จาก {total}", ctx)).toBe(
      "หน้า 3 {unknown_token} จาก 9"
    );
  });

  it("does not disturb non-token braces (e.g. CSS-like text)", () => {
    expect(replacePageTokens("p {color: red}", ctx)).toBe("p {color: red}");
    expect(replacePageTokens("{not a token}", ctx)).toBe("{not a token}");
  });

  it("does not disturb merge-field syntax {{name}}", () => {
    expect(replacePageTokens("{{customer}}", ctx)).toBe("{{customer}}");
  });
});

describe("page tokens — help list & regex stay in sync", () => {
  it("PAGE_TOKEN_HELP covers every token in PAGE_TOKEN_REGEX", () => {
    const src = PAGE_TOKEN_REGEX.source; // "\\{(a|b|…)\\}"
    const regexTokens = src
      .slice(src.indexOf("(") + 1, src.lastIndexOf(")"))
      .split("|");
    const helpTokens = PAGE_TOKEN_HELP.map((h) =>
      h.token.replace(/[{}]/g, "")
    );
    expect(regexTokens.length).toBeGreaterThan(0);
    for (const token of regexTokens) {
      expect(helpTokens).toContain(token);
    }
    expect(helpTokens).toHaveLength(regexTokens.length);
  });

  it("every help token resolves to a non-empty value (no silent blanks)", () => {
    const ctx = { pageNumber: 1, totalPages: 2, now: NOW };
    for (const { token } of PAGE_TOKEN_HELP) {
      const out = replacePageTokens(token, ctx);
      expect(out, token).not.toBe("");
      expect(out, token).not.toBe(token);
    }
  });

  it("listPageTokensIn detects the new tokens", () => {
    const found = listPageTokensIn("<p>{time} {time_th} {xyz}</p>");
    expect(found).toContain("time");
    expect(found).toContain("time_th");
    expect(found).not.toContain("xyz");
  });
});
