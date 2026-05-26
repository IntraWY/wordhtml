import { describe, it, expect } from "vitest";
import {
  extractMergeFieldNames,
  replaceMergeFields,
  replacePageTokens,
  getMergeFieldStatuses,
  getEmptyStateConfig,
  resolveHtmlPlaceholders,
} from "./index";

describe("mergeFields", () => {
  it("extracts unique merge field names in order", () => {
    const html = "<p>{{a}} and {{b}} and {{a}}</p>";
    expect(extractMergeFieldNames(html)).toEqual(["a", "b"]);
  });

  it("extracts names from variable-badge data attributes", () => {
    const html =
      '<p><span class="variable-badge" data-variable="customer">X</span></p>';
    expect(extractMergeFieldNames(html)).toContain("customer");
  });

  it("replaces merge fields in preview mode with missing span", () => {
    const html = "<p>Hello {{name}}</p>";
    const result = replaceMergeFields(html, [], {}, { mode: "preview" });
    expect(result).toContain("placeholder-missing");
    expect(result).toContain("[name]");
  });

  it("replaces merge fields in export mode", () => {
    const html = "<p>Hello {{name}}</p>";
    const result = replaceMergeFields(
      html,
      [{ name: "name", value: "World", isList: false }],
      {},
      { mode: "export" }
    );
    expect(result).toContain("Hello World");
    expect(result).not.toContain("{{name}}");
  });

  it("leaves tokens in edit mode", () => {
    const html = "<p>{{x}}</p>";
    const result = replaceMergeFields(html, [], {}, { mode: "edit" });
    expect(result).toBe("<p>{{x}}</p>");
  });
});

describe("pageTokens", () => {
  it("replaces page tokens", () => {
    const result = replacePageTokens("หน้า {page} จาก {total}", {
      pageNumber: 2,
      totalPages: 5,
    });
    expect(result).toBe("หน้า 2 จาก 5");
    expect(result).not.toContain("{page}");
  });
});

describe("fieldStatus", () => {
  it("marks missing in preview when no value", () => {
    const statuses = getMergeFieldStatuses(
      "<p>{{foo}}</p>",
      [],
      {},
      "preview"
    );
    expect(statuses[0].status).toBe("missing");
  });

  it("marks filled when variable has value", () => {
    const statuses = getMergeFieldStatuses(
      "<p>{{foo}}</p>",
      [{ name: "foo", value: "bar", isList: false }],
      {},
      "preview"
    );
    expect(statuses[0].status).toBe("filled");
  });
});

describe("emptyState", () => {
  it("returns template variant when template mode", () => {
    const cfg = getEmptyStateConfig({
      documentHtml: "",
      templateMode: true,
      previewMode: "edit",
      hasDataSet: false,
      lastLoadWarnings: [],
    });
    expect(cfg.variant).toBe("template");
    expect(cfg.tiptapPlaceholder).toContain("{{");
  });
});

describe("resolveHtmlPlaceholders", () => {
  it("resolves merge and page tokens for export", () => {
    const html = "<p>{{name}} — {page}/{total}</p>";
    const out = resolveHtmlPlaceholders(html, {
      mode: "export",
      variables: [{ name: "name", value: "Test", isList: false }],
      dataRow: {},
      pageNumber: 1,
      totalPages: 3,
    });
    expect(out).toContain("Test");
    expect(out).toContain("1/3");
  });
});
