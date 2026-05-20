import { describe, it, expect } from "vitest";
import { evaluateCondition, evaluateConditions } from "./conditionEngine";

describe("evaluateCondition", () => {
  it("evaluates equality", () => {
    expect(evaluateCondition("{{type}} == 'จ้าง'", { type: "จ้าง" })).toBe(true);
    expect(evaluateCondition("{{type}} == 'จ้าง'", { type: "ซื้อ" })).toBe(false);
  });

  it("evaluates inequality", () => {
    expect(evaluateCondition("{{type}} != 'จ้าง'", { type: "ซื้อ" })).toBe(true);
    expect(evaluateCondition("{{type}} != 'จ้าง'", { type: "จ้าง" })).toBe(false);
  });

  it("evaluates numeric greater-than", () => {
    expect(evaluateCondition("{{amount}} > 1000", { amount: "1500" })).toBe(true);
    expect(evaluateCondition("{{amount}} > 1000", { amount: "500" })).toBe(false);
  });

  it("evaluates numeric less-than", () => {
    expect(evaluateCondition("{{amount}} < 1000", { amount: "500" })).toBe(true);
    expect(evaluateCondition("{{amount}} < 1000", { amount: "1500" })).toBe(false);
  });

  it("evaluates contains", () => {
    expect(evaluateCondition("{{name}} contains 'สมชาย'", { name: "นายสมชาย ใจดี" })).toBe(true);
    expect(evaluateCondition("{{name}} contains 'สมหญิง'", { name: "นายสมชาย ใจดี" })).toBe(false);
  });

  it("handles missing variables as empty string", () => {
    expect(evaluateCondition("{{missing}} == ''", {})).toBe(true);
    expect(evaluateCondition("{{missing}} == 'x'", {})).toBe(false);
  });

  it("returns true for invalid syntax", () => {
    expect(evaluateCondition("not a condition", { a: "1" })).toBe(true);
  });

  it("returns true for empty condition", () => {
    expect(evaluateCondition("", { a: "1" })).toBe(true);
  });

  it("handles double-quoted values", () => {
    expect(evaluateCondition('{{type}} == "จ้าง"', { type: "จ้าง" })).toBe(true);
  });

  it("handles currency values with commas", () => {
    expect(evaluateCondition("{{amount}} > 1,000", { amount: "1,500" })).toBe(true);
  });
});

describe("evaluateConditions", () => {
  it("keeps blocks with true conditions and strips attribute", () => {
    const html = `<p data-condition="{{type}} == 'จ้าง'">เงื่อนไขจ้าง</p>`;
    const result = evaluateConditions(html, { type: "จ้าง" });
    expect(result).toContain("เงื่อนไขจ้าง");
    expect(result).not.toContain("data-condition");
  });

  it("removes blocks with false conditions", () => {
    const html = `<p data-condition="{{type}} == 'จ้าง'">เงื่อนไขจ้าง</p>`;
    const result = evaluateConditions(html, { type: "ซื้อ" });
    expect(result).not.toContain("เงื่อนไขจ้าง");
  });

  it("handles multiple conditional blocks", () => {
    const html = `
      <p data-condition="{{a}} == '1'">One</p>
      <p data-condition="{{a}} == '2'">Two</p>
    `;
    const result = evaluateConditions(html, { a: "1" });
    expect(result).toContain("One");
    expect(result).not.toContain("Two");
  });
});
