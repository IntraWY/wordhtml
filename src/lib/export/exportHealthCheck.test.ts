import { describe, it, expect } from "vitest";
import { checkExportHealth } from "./exportHealthCheck";

describe("checkExportHealth", () => {
  it("flags empty document", () => {
    const issues = checkExportHealth({
      documentHtml: "",
      variables: [],
      dataRow: {},
      templateMode: false,
      previewMode: "edit",
    });
    expect(issues.some((i) => i.code === "empty-document")).toBe(true);
  });

  it("flags missing merge fields in template preview", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>สวัสดี {{name}}</p>",
      variables: [{ name: "name", type: "text", value: "", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(true);
  });

  it("warns when a numeric filter receives a non-numeric value (GAP 01)", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{ชื่อ|baht}}</p>",
      variables: [{ name: "ชื่อ", type: "text", value: "สมชาย", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    const issue = issues.find((i) => i.code === "filter-type-mismatch");
    expect(issue).toBeDefined();
    expect(issue!.severity).toBe("warning");
  });

  it("does not warn about filters when values are numeric", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{ยอด|baht}}</p>",
      variables: [{ name: "ยอด", type: "text", value: "1250.50", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "filter-type-mismatch")).toBe(false);
  });

  it("skips the filter check outside template mode", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{ชื่อ|baht}}</p>",
      variables: [{ name: "ชื่อ", type: "text", value: "สมชาย", isList: false }],
      dataRow: {},
      templateMode: false,
      previewMode: "edit",
    });
    expect(issues.some((i) => i.code === "filter-type-mismatch")).toBe(false);
  });

  describe("strict mode (GAP 04)", () => {
    const unsetInput = {
      documentHtml: "<p>สวัสดี {{name}}</p>",
      variables: [{ name: "name", type: "text" as const, value: "", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "edit" as const,
    };

    it("keeps unset-variable findings as info by default", () => {
      const issue = checkExportHealth(unsetInput).find(
        (i) => i.code === "unset-variable-defaults"
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("info");
    });

    it("escalates unset-variable findings to error when strict", () => {
      const issue = checkExportHealth(unsetInput, { strict: true }).find(
        (i) => i.code === "unset-variable-defaults"
      );
      expect(issue).toBeDefined();
      expect(issue!.severity).toBe("error");
    });

    it("strict mode leaves other severities unchanged", () => {
      const issues = checkExportHealth(
        {
          documentHtml: "<p>{{ชื่อ|baht}}</p>",
          variables: [{ name: "ชื่อ", type: "text", value: "สมชาย", isList: false }],
          dataRow: {},
          templateMode: true,
          previewMode: "preview",
        },
        { strict: true }
      );
      const issue = issues.find((i) => i.code === "filter-type-mismatch");
      expect(issue!.severity).toBe("warning");
    });
  });

  describe("control blocks (GAP 08)", () => {
    it("does NOT flag a var hidden inside a FALSE {{#if}} branch", () => {
      const issues = checkExportHealth({
        documentHtml: "<p>{{#if show}}{{secret}}{{/if}}สวัสดี</p>",
        variables: [
          { name: "show", type: "text", value: "", isList: false },
          { name: "secret", type: "text", value: "", isList: false },
        ],
        dataRow: {},
        templateMode: true,
        previewMode: "preview",
      });
      expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(false);
    });

    it("STILL flags a var inside a TRUE {{#if}} branch", () => {
      const issues = checkExportHealth({
        documentHtml: "<p>{{#if show}}{{secret}}{{/if}}</p>",
        variables: [
          { name: "show", type: "text", value: "yes", isList: false },
          { name: "secret", type: "text", value: "", isList: false },
        ],
        dataRow: {},
        templateMode: true,
        previewMode: "preview",
      });
      expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(true);
    });

    it("does NOT flag loop-local {{this}} as an unset variable", () => {
      const issues = checkExportHealth({
        documentHtml: "<p>{{#each items}}{{this}}{{/each}}</p>",
        variables: [
          { name: "items", type: "text", value: "", isList: true, listValues: ["a", "b"] },
        ],
        dataRow: {},
        templateMode: true,
        previewMode: "edit",
      });
      expect(issues.some((i) => i.code === "unset-variable-defaults")).toBe(false);
    });

    it("does not warn about a filter mismatch hidden in a FALSE branch", () => {
      const issues = checkExportHealth({
        documentHtml: "<p>{{#if show}}{{ชื่อ|baht}}{{/if}}</p>",
        variables: [
          { name: "show", type: "text", value: "", isList: false },
          { name: "ชื่อ", type: "text", value: "สมชาย", isList: false },
        ],
        dataRow: {},
        templateMode: true,
        previewMode: "preview",
      });
      expect(issues.some((i) => i.code === "filter-type-mismatch")).toBe(false);
    });
  });
});
