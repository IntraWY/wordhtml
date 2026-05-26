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
      variables: [{ name: "name", type: "text", value: "" }],
      dataRow: {},
      templateMode: true,
      previewMode: "preview",
    });
    expect(issues.some((i) => i.code === "missing-merge-fields")).toBe(true);
  });
});
