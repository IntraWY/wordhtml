import { describe, it, expect } from "vitest";
import { removeMergeFieldFromHtml } from "./removeMergeField";

describe("removeMergeFieldFromHtml", () => {
  it("removes variable badge spans by data-variable", () => {
    const html =
      '<p>Hello <span class="variable-badge" data-variable="customer">{{customer}}</span> world</p>';
    expect(removeMergeFieldFromHtml(html, "customer")).toBe("<p>Hello  world</p>");
  });

  it("removes plain {{name}} tokens without badge markup", () => {
    const html = "<p>Dear {{customer}}, welcome {{other}}</p>";
    expect(removeMergeFieldFromHtml(html, "customer")).toBe(
      "<p>Dear , welcome {{other}}</p>"
    );
  });

  it("removes both badge and plain tokens for the same name", () => {
    const html =
      '<p><span class="variable-badge" data-variable="ลูกค้า">{{ลูกค้า}}</span> and {{ลูกค้า}}</p>';
    const result = removeMergeFieldFromHtml(html, "ลูกค้า");
    expect(result).not.toContain("{{ลูกค้า}}");
    expect(result).not.toContain("data-variable");
    expect(result).toBe("<p> and </p>");
  });

  it("does not remove other variable names", () => {
    const html =
      '<p><span class="variable-badge" data-variable="keep">{{keep}}</span> {{remove}}</p>';
    expect(removeMergeFieldFromHtml(html, "remove")).toBe(
      '<p><span class="variable-badge" data-variable="keep">{{keep}}</span> </p>'
    );
  });
});
