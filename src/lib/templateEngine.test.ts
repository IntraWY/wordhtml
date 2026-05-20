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

  it("formats currency variables", () => {
    const html = "ราคา {{price}}";
    const vars: TemplateVariable[] = [
      { name: "price", value: "1234.5", isList: false, type: "currency", format: "THB" },
    ];
    const result = replaceVariables(html, vars, {});
    expect(result).toContain("1,234.50 บาท");
  });

  it("formats date variables", () => {
    const html = "วันที่ {{date}}";
    const vars: TemplateVariable[] = [
      { name: "date", value: "2026-05-20", isList: false, type: "date", format: "long" },
    ];
    const result = replaceVariables(html, vars, {});
    expect(result).toContain("20 พฤษภาคม 2569");
  });

  it("formats number variables", () => {
    const html = "จำนวน {{qty}}";
    const vars: TemplateVariable[] = [
      { name: "qty", value: "1234.5", isList: false, type: "number", format: "integer" },
    ];
    const result = replaceVariables(html, vars, {});
    expect(result).toContain("1,235");
  });

  it("formats percent variables", () => {
    const html = "ส่วนลด {{discount}}";
    const vars: TemplateVariable[] = [
      { name: "discount", value: "0.15", isList: false, type: "percent", format: "0-100" },
    ];
    const result = replaceVariables(html, vars, {});
    expect(result).toContain("15%");
  });

  it("formats data row values using variable type definition", () => {
    const html = "ราคา {{price}}";
    const vars: TemplateVariable[] = [
      { name: "price", value: "0", isList: false, type: "currency", format: "THB" },
    ];
    const result = replaceVariables(html, vars, { price: "999.5" });
    expect(result).toContain("999.50 บาท");
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

  it("evaluates computed variables in template", () => {
    const html = "ราคา {{price}} จำนวน {{qty}} รวม {{total}}";
    const vars: TemplateVariable[] = [
      { name: "price", value: "100", isList: false, type: "number" },
      { name: "qty", value: "3", isList: false, type: "number" },
      { name: "total", value: "", isList: false, isComputed: true, expression: "{{price}} * {{qty}}" },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("ราคา 100");
    expect(result.html).toContain("จำนวน 3");
    expect(result.html).toContain("รวม 300");
  });

  it("uses data row values in computed expressions", () => {
    const html = "รวม {{total}}";
    const vars: TemplateVariable[] = [
      { name: "price", value: "0", isList: false, type: "number" },
      { name: "total", value: "", isList: false, isComputed: true, expression: "{{price}} * 2" },
    ];
    const result = processTemplate(html, vars, { price: "50" });
    expect(result.html).toContain("รวม 100");
  });

  it("reports computed variable cycle errors as warnings", () => {
    const html = "{{total}}";
    const vars: TemplateVariable[] = [
      { name: "a", value: "", isList: false, isComputed: true, expression: "{{b}}" },
      { name: "b", value: "", isList: false, isComputed: true, expression: "{{a}}" },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.warnings.some((w) => w.includes("Cycle detected"))).toBe(true);
  });

  it("chains computed variables through dependencies", () => {
    const html = "{{subtotal}} {{vat}} {{grand_total}}";
    const vars: TemplateVariable[] = [
      { name: "price", value: "1000", isList: false },
      { name: "qty", value: "3", isList: false },
      { name: "subtotal", value: "", isList: false, isComputed: true, expression: "{{price}} * {{qty}}" },
      { name: "vat", value: "", isList: false, isComputed: true, expression: "{{subtotal}} * 0.07" },
      { name: "grand_total", value: "", isList: false, isComputed: true, expression: "{{subtotal}} + {{vat}}" },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("3000");
    expect(result.html).toContain("210");
    expect(result.html).toContain("3210");
  });

  it("removes conditional blocks with false conditions", () => {
    const html = `
      <p data-condition="{{type}} == 'จ้าง'">ข้อความจ้าง</p>
      <p>ข้อความทั่วไป</p>
    `;
    const vars: TemplateVariable[] = [
      { name: "type", value: "ซื้อ", isList: false },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).not.toContain("ข้อความจ้าง");
    expect(result.html).toContain("ข้อความทั่วไป");
    expect(result.html).not.toContain("data-condition");
  });

  it("keeps conditional blocks with true conditions", () => {
    const html = `<p data-condition="{{type}} == 'จ้าง'">ข้อความจ้าง</p>`;
    const vars: TemplateVariable[] = [
      { name: "type", value: "จ้าง", isList: false },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("ข้อความจ้าง");
    expect(result.html).not.toContain("data-condition");
  });

  it("evaluates conditions with computed variables", () => {
    const html = `
      <p data-condition="{{total}} > 500">ยอดสูง</p>
      <p data-condition="{{total}} <= 500">ยอดต่ำ</p>
    `;
    const vars: TemplateVariable[] = [
      { name: "price", value: "200", isList: false },
      { name: "qty", value: "3", isList: false },
      { name: "total", value: "", isList: false, isComputed: true, expression: "{{price}} * {{qty}}" },
    ];
    const result = processTemplate(html, vars, {});
    expect(result.html).toContain("ยอดสูง");
    expect(result.html).not.toContain("ยอดต่ำ");
  });
});
