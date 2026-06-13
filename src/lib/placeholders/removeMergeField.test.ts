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

  it("removes multiple occurrences of the same name", () => {
    const html =
      '<p>{{dup}} <span class="variable-badge" data-variable="dup">{{dup}}</span> and {{dup}} again</p>';
    const result = removeMergeFieldFromHtml(html, "dup");
    expect(result).not.toContain("{{dup}}");
    expect(result).not.toContain("data-variable");
    expect(result).toBe("<p>  and  again</p>");
  });

  it("handles Thai variable names in badge and plain text", () => {
    const html =
      '<p><span class="variable-badge" data-variable="รหัส">{{รหัส}}</span>{{รหัส}}</p>';
    const result = removeMergeFieldFromHtml(html, "รหัส");
    expect(result).toBe("<p></p>");
  });

  it("leaves document unchanged when name is not present", () => {
    const html = "<p>{{only}}</p>";
    expect(removeMergeFieldFromHtml(html, "missing")).toBe(html);
  });

  it("removes filtered tokens {{name|baht}} / {{name|thai}} / {{name|date}}", () => {
    const html =
      "<p>{{amount|baht}} and {{amount|thai}} and {{amount|date}} and {{amount}}</p>";
    const result = removeMergeFieldFromHtml(html, "amount");
    expect(result).toBe("<p> and  and  and </p>");
  });

  it("keeps filtered tokens of other variable names", () => {
    const html = "<p>{{keep|baht}} {{remove|baht}} {{remove}}</p>";
    expect(removeMergeFieldFromHtml(html, "remove")).toBe("<p>{{keep|baht}}  </p>");
  });

  it("removes Thai-named filtered tokens", () => {
    const html = "<p>{{จำนวนเงิน|baht}}</p>";
    expect(removeMergeFieldFromHtml(html, "จำนวนเงิน")).toBe("<p></p>");
  });

  it("removes badge even when inner text does not match data-variable", () => {
    const html =
      '<p><span class="variable-badge" data-variable="a">{{wrong}}</span></p>';
    const result = removeMergeFieldFromHtml(html, "a");
    expect(result).toBe("<p></p>");
    expect(result).not.toContain("data-variable");
  });
});
