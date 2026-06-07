import { describe, it, expect } from "vitest";
import {
  buildDistributionDocuments,
  parseRecipientList,
} from "./distributionList";

describe("buildDistributionDocuments", () => {
  it("replaces {{เรียน}} per recipient — 2 recipients yield 2 isolated docs", () => {
    const templateHtml = "<p>เรียน {{เรียน}}</p>";
    const results = buildDistributionDocuments({
      templateHtml,
      recipients: ["ผู้อำนวยการกองคลัง", "หัวหน้าฝ่ายพัสดุ"],
    });

    expect(results).toHaveLength(2);

    expect(results[0].recipient).toBe("ผู้อำนวยการกองคลัง");
    expect(results[0].html).toContain("ผู้อำนวยการกองคลัง");
    expect(results[0].html).not.toContain("หัวหน้าฝ่ายพัสดุ");
    expect(results[0].html).not.toContain("{{เรียน}}");

    expect(results[1].recipient).toBe("หัวหน้าฝ่ายพัสดุ");
    expect(results[1].html).toContain("หัวหน้าฝ่ายพัสดุ");
    expect(results[1].html).not.toContain("ผู้อำนวยการกองคลัง");
    expect(results[1].html).not.toContain("{{เรียน}}");
  });

  it("replaces ALL occurrences of the placeholder in a single document", () => {
    const templateHtml = "<p>{{เรียน}}</p><footer>สำเนา: {{เรียน}}</footer>";
    const [result] = buildDistributionDocuments({
      templateHtml,
      recipients: ["นายทดสอบ"],
    });

    expect(result.html).toBe("<p>นายทดสอบ</p><footer>สำเนา: นายทดสอบ</footer>");
    expect(result.html).not.toContain("{{เรียน}}");
  });

  it("supports a custom fieldName", () => {
    const templateHtml = "<p>To {{to}}</p>";
    const results = buildDistributionDocuments({
      templateHtml,
      recipients: ["Alice", "Bob"],
      fieldName: "to",
    });

    expect(results).toHaveLength(2);
    expect(results[0].html).toBe("<p>To Alice</p>");
    expect(results[1].html).toBe("<p>To Bob</p>");
  });

  it("skips blank recipients and de-duplicates while preserving order", () => {
    const results = buildDistributionDocuments({
      templateHtml: "<p>{{เรียน}}</p>",
      recipients: ["  Alice  ", "", "   ", "Bob", "Alice"],
    });

    expect(results.map((r) => r.recipient)).toEqual(["Alice", "Bob"]);
  });

  it("HTML-escapes a recipient containing dangerous characters", () => {
    const [result] = buildDistributionDocuments({
      templateHtml: "<p>{{เรียน}}</p>",
      recipients: ['<script>alert("x")</script>'],
    });

    expect(result.recipient).toBe('<script>alert("x")</script>');
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&quot;");
  });
});

describe("parseRecipientList", () => {
  it("splits on newlines and commas, trims, drops blanks, de-dupes", () => {
    const raw = "Alice, Bob\nCarol\n\n  Alice  ,\nBob, Dave";
    expect(parseRecipientList(raw)).toEqual(["Alice", "Bob", "Carol", "Dave"]);
  });

  it("returns an empty array for blank input", () => {
    expect(parseRecipientList("")).toEqual([]);
    expect(parseRecipientList("  ,\n , ")).toEqual([]);
  });
});
