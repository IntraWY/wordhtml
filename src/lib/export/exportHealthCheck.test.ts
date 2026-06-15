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

  it("warns about unknown merge filters (typos)", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{งบ|commaa}} {{ราคา|baht}}</p>",
      variables: [],
      dataRow: {},
      templateMode: true,
      previewMode: "edit",
    });
    const issue = issues.find((i) => i.code === "unknown-merge-filter");
    expect(issue).toBeTruthy();
    // Only the typo'd filter is listed as unknown ("|baht" appears later in
    // the supported-filters help text, so scope the check to the list segment).
    expect(issue!.message).toContain("ไม่รู้จัก: |commaa —");
  });

  it("does not warn for valid filters or outside template mode", () => {
    const valid = checkExportHealth({
      documentHtml: "<p>{{งบ|comma}} {{ราคา|baht}} {{วันที่|date}} {{ปี|thai}}</p>",
      variables: [],
      dataRow: {},
      templateMode: true,
      previewMode: "edit",
    });
    expect(valid.some((i) => i.code === "unknown-merge-filter")).toBe(false);

    const nonTemplate = checkExportHealth({
      documentHtml: "<p>{{งบ|commaa}}</p>",
      variables: [],
      dataRow: {},
      templateMode: false,
      previewMode: "edit",
    });
    expect(nonTemplate.some((i) => i.code === "unknown-merge-filter")).toBe(false);
  });

  it("does not flag vars hidden inside a FALSE conditional branch", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{#if cond}}{{secret}}{{/if}}</p>",
      variables: [{ name: "cond", type: "text", value: "", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(false);
  });

  it("still flags vars inside a TRUE conditional branch", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{#if cond}}{{secret}}{{/if}}</p>",
      variables: [{ name: "cond", type: "text", value: "yes", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(true);
  });

  it("does not flag loop-local {{this}} tokens as unset", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{#each items}}{{this}}{{/each}}</p>",
      variables: [
        { name: "items", type: "text", value: "", isList: true, listValues: ["a", "b"] },
      ],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(false);
  });

  it("warns on a filter type mismatch (numeric filter, non-numeric value)", () => {
    const issues = checkExportHealth({
      documentHtml: "<p>{{amt|currency}}</p>",
      variables: [{ name: "amt", type: "text", value: "ไม่ใช่เลข", isList: false }],
      dataRow: {},
      templateMode: true,
      previewMode: "edit",
    });
    expect(issues.some((i) => i.code === "filter-type-mismatch")).toBe(true);
  });

  it("strict mode escalates unset-variable-defaults to error", () => {
    const issues = checkExportHealth(
      {
        documentHtml: "<p>{{name}}</p>",
        variables: [{ name: "name", type: "text", value: "", isList: false }],
        dataRow: {},
        templateMode: true,
        previewMode: "edit",
      },
      { strict: true }
    );
    const issue = issues.find((i) => i.code === "unset-variable-defaults");
    expect(issue?.severity).toBe("error");
  });
});
