import { describe, it, expect } from "vitest";
import {
  extractVariables,
  replaceVariables,
  expandRepeatingRows,
  processTemplate,
} from "./templateEngine";
import type { TemplateVariable } from "@/types";

describe("extractVariables", () => {
  it("finds simple variables", () => {
    const html = "Hello {{name}}, welcome to {{place}}!";
    expect(extractVariables(html)).toEqual(["name", "place"]);
  });

  it("returns unique variables in order of first appearance", () => {
    const html = "{{a}} {{b}} {{a}} {{c}} {{b}}";
    expect(extractVariables(html)).toEqual(["a", "b", "c"]);
  });

  it("supports Thai characters", () => {
    const html = "{{ชื่อ}} {{นามสกุล}}";
    expect(extractVariables(html)).toEqual(["ชื่อ", "นามสกุล"]);
  });

  it("returns empty array when no variables", () => {
    expect(extractVariables("plain text")).toEqual([]);
  });

  it("ignores variables with invalid characters", () => {
    const html = "{{valid}} {{not valid}} {{another_valid}}";
    expect(extractVariables(html)).toEqual(["valid", "another_valid"]);
  });
});

describe("replaceVariables", () => {
  it("replaces variables with data row values", () => {
    const html = "Hello {{name}}!";
    const result = replaceVariables(html, [], { name: "World" });
    expect(result).toBe("Hello World!");
  });

  it("falls back to variable default values", () => {
    const html = "{{greeting}} {{name}}";
    const vars: TemplateVariable[] = [
      { name: "greeting", value: "Hello", isList: false },
      { name: "name", value: "User", isList: false },
    ];
    const result = replaceVariables(html, vars, {});
    expect(result).toBe("Hello User");
  });

  it("shows red placeholder for missing variables", () => {
    const html = "{{missing}}";
    const result = replaceVariables(html, [], {});
    expect(result).toContain("missing");
    expect(result).toContain("dc2626"); // red color
  });

  it("escapes HTML in values", () => {
    const html = "{{content}}";
    const result = replaceVariables(html, [], { content: "<script>alert(1)</script>" });
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });
});

describe("expandRepeatingRows", () => {
  it("expands repeating table rows with list data", () => {
    const html = `
      <table>
        <tbody>
          <tr data-repeat="true"><td>{{item}}</td><td>{{qty}}</td></tr>
        </tbody>
      </table>
    `;
    const vars: TemplateVariable[] = [
      { name: "item", value: "A, B, C", isList: true, delimiter: ",", listValues: ["A", "B", "C"] },
      { name: "qty", value: "1, 2", isList: true, delimiter: ",", listValues: ["1", "2"] },
    ];
    const result = expandRepeatingRows(html, vars);
    expect(result).toContain("<td>A</td>");
    expect(result).toContain("<td>B</td>");
    expect(result).toContain("<td>C</td>");
    expect(result).toContain("<td>1</td>");
    expect(result).toContain("<td>2</td>");
    expect(result).not.toContain("data-repeat");
  });

  it("does not modify non-repeating rows", () => {
    const html = `<table><tr><td>{{name}}</td></tr></table>`;
    const vars: TemplateVariable[] = [
      { name: "name", value: "Test", isList: false },
    ];
    const result = expandRepeatingRows(html, vars);
    expect(result).toBe(html);
  });

  it("handles no list variables gracefully", () => {
    const html = `<table><tr data-repeat="true"><td>{{name}}</td></tr></table>`;
    const vars: TemplateVariable[] = [
      { name: "name", value: "Test", isList: false },
    ];
    const result = expandRepeatingRows(html, vars);
    // Should remove the repeat attribute but not expand
    expect(result).not.toContain("data-repeat");
  });
});

describe("processTemplate", () => {
  it("replaces simple variables and returns warnings for missing ones", () => {
    const html = "Hello {{name}}, your code is {{code}}";
    const vars: TemplateVariable[] = [
      { name: "name", value: "Alice", isList: false },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("Hello Alice");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("code");
  });

  it("processes template with repeating rows", () => {
    const html = `
      <p>Invoice for {{customer}}</p>
      <table>
        <tr data-repeat="true"><td>{{item}}</td></tr>
      </table>
    `;
    const vars: TemplateVariable[] = [
      { name: "customer", value: "ACME", isList: false },
      { name: "item", value: "X, Y", isList: true, delimiter: ",", listValues: ["X", "Y"] },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("Invoice for ACME");
    expect(result.html).toContain("<td>X</td>");
    expect(result.html).toContain("<td>Y</td>");
  });
});
