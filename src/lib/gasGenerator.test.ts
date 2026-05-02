import { describe, it, expect } from "vitest";
import { generateGASFunction } from "./gasGenerator";
import type { TemplateVariable } from "@/types";

describe("generateGASFunction", () => {
  it("generates a basic function with variable replacement", () => {
    const html = "<p>Hello {{name}}</p>";
    const vars: TemplateVariable[] = [
      { name: "name", value: "World", isList: false },
    ];
    const result = generateGASFunction(html, vars, {
      functionName: "generateDoc",
      includeGenerateFunction: true,
      includeSheetIntegration: false,
    });

    expect(result.code).toContain("function generateDoc(data)");
    expect(result.code).toContain("var templateHtml");
    expect(result.code).toContain("name");
    expect(result.code).toContain("escapeHtml");
  });

  it("includes Sheet integration when requested", () => {
    const html = "<p>{{name}}</p>";
    const vars: TemplateVariable[] = [
      { name: "name", value: "", isList: false },
    ];
    const result = generateGASFunction(html, vars, {
      functionName: "myFunc",
      includeGenerateFunction: true,
      includeSheetIntegration: true,
    });

    expect(result.code).toContain("function generateFromSheet()");
    expect(result.code).toContain("SpreadsheetApp");
    expect(result.code).toContain("getActiveSheet");
  });

  it("escapes the template HTML properly", () => {
    const html = '<p class="test">Hello</p>';
    const result = generateGASFunction(html, [], {
      functionName: "test",
      includeGenerateFunction: true,
      includeSheetIntegration: false,
    });

    expect(result.code).toContain('var templateHtml =');
    // Should be a JSON string, not raw HTML
    expect(result.code).not.toContain('var templateHtml = <p');
  });

  it("documents list variables", () => {
    const html = "<p>{{items}}</p>";
    const vars: TemplateVariable[] = [
      { name: "items", value: "A, B", isList: true, delimiter: ",", listValues: ["A", "B"] },
    ];
    const result = generateGASFunction(html, vars, {
      functionName: "test",
      includeGenerateFunction: true,
      includeSheetIntegration: false,
    });

    expect(result.code).toContain("string[]");
    expect(result.code).toContain("items");
  });
});
