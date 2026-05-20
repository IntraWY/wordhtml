import { describe, it, expect } from "vitest";
import {
  evaluateExpression,
  extractReferences,
  detectCycle,
  evaluateComputeds,
} from "./expressionEngine";
import type { TemplateVariable } from "@/types";

describe("evaluateExpression", () => {
  it("evaluates simple arithmetic", () => {
    expect(evaluateExpression("1 + 2", {})).toBe(3);
    expect(evaluateExpression("10 - 3", {})).toBe(7);
    expect(evaluateExpression("4 * 5", {})).toBe(20);
    expect(evaluateExpression("20 / 4", {})).toBe(5);
  });

  it("respects operator precedence", () => {
    expect(evaluateExpression("2 + 3 * 4", {})).toBe(14);
    expect(evaluateExpression("10 - 6 / 2", {})).toBe(7);
  });

  it("handles parentheses", () => {
    expect(evaluateExpression("(2 + 3) * 4", {})).toBe(20);
  });

  it("resolves variable references", () => {
    expect(
      evaluateExpression("{{amount}} * {{qty}}", { amount: "100", qty: "3" })
    ).toBe(300);
  });

  it("handles division by zero gracefully", () => {
    expect(evaluateExpression("10 / 0", {})).toBe(0);
  });

  it("evaluates functions", () => {
    expect(evaluateExpression("sum(1, 2, 3)", {})).toBe(6);
    expect(evaluateExpression("count(1, 2, 3)", {})).toBe(3);
    expect(evaluateExpression("avg(2, 4, 6)", {})).toBe(4);
    expect(evaluateExpression("min(5, 2, 8)", {})).toBe(2);
    expect(evaluateExpression("max(5, 2, 8)", {})).toBe(8);
  });

  it("evaluates nested expressions with functions", () => {
    expect(evaluateExpression("sum(1, 2) * 3", {})).toBe(9);
  });
});

describe("extractReferences", () => {
  it("extracts variable names from expression", () => {
    expect(extractReferences("{{a}} + {{b}}")).toEqual(["a", "b"]);
  });

  it("returns unique references in order of appearance", () => {
    expect(extractReferences("{{x}} + {{y}} + {{x}}")).toEqual(["x", "y"]);
  });

  it("supports Thai variable names", () => {
    expect(extractReferences("{{จำนวน}} * {{ราคา}}")).toEqual(["จำนวน", "ราคา"]);
  });
});

describe("detectCycle", () => {
  it("returns null when no cycle", () => {
    const vars: TemplateVariable[] = [
      { name: "a", value: "10", isList: false },
      { name: "b", value: "{{a}} + 1", isList: false, isComputed: true, expression: "{{a}} + 1" },
    ];
    expect(detectCycle(vars)).toBeNull();
  });

  it("detects simple cycle", () => {
    const vars: TemplateVariable[] = [
      { name: "a", value: "{{b}} + 1", isList: false, isComputed: true, expression: "{{b}} + 1" },
      { name: "b", value: "{{a}} + 1", isList: false, isComputed: true, expression: "{{a}} + 1" },
    ];
    const cycle = detectCycle(vars);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain("a");
    expect(cycle).toContain("b");
  });

  it("detects self-reference cycle", () => {
    const vars: TemplateVariable[] = [
      { name: "a", value: "{{a}} + 1", isList: false, isComputed: true, expression: "{{a}} + 1" },
    ];
    const cycle = detectCycle(vars);
    expect(cycle).not.toBeNull();
    expect(cycle).toContain("a");
  });
});

describe("evaluateComputeds", () => {
  it("evaluates computed variables in dependency order", () => {
    const vars: TemplateVariable[] = [
      { name: "amount", value: "1000", isList: false },
      { name: "qty", value: "3", isList: false },
      { name: "subtotal", value: "", isList: false, isComputed: true, expression: "{{amount}} * {{qty}}" },
      { name: "vat", value: "", isList: false, isComputed: true, expression: "{{subtotal}} * 0.07" },
      { name: "total", value: "", isList: false, isComputed: true, expression: "{{subtotal}} + {{vat}}" },
    ];
    const result = evaluateComputeds(vars);
    expect(result.values.subtotal).toBe("3000");
    expect(result.values.vat).toBe("210");
    expect(result.values.total).toBe("3210");
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("reports cycle errors", () => {
    const vars: TemplateVariable[] = [
      { name: "a", value: "{{b}}", isList: false, isComputed: true, expression: "{{b}}" },
      { name: "b", value: "{{a}}", isList: false, isComputed: true, expression: "{{a}}" },
    ];
    const result = evaluateComputeds(vars);
    expect(result.errors.a).toContain("Cycle detected");
    expect(result.errors.b).toContain("Cycle detected");
  });

  it("handles missing references as 0", () => {
    const vars: TemplateVariable[] = [
      { name: "x", value: "", isList: false, isComputed: true, expression: "{{missing}} + 5" },
    ];
    const result = evaluateComputeds(vars);
    expect(result.values.x).toBe("5");
  });
});
