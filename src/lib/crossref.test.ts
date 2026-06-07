import { describe, it, expect } from "vitest";
import {
  listCrossRefTargets,
  buildCrossRefHtml,
  defaultCrossRefLabel,
  type CrossRefTarget,
} from "@/lib/crossref";

describe("listCrossRefTargets", () => {
  it("returns headings with their ids, text, and level", () => {
    // generateToc derives stable slug ids from heading text.
    const html = '<h1 id="a">Intro</h1><h2 id="b">Details</h2>';
    const targets = listCrossRefTargets(html);
    expect(targets).toEqual([
      { id: "intro", text: "Intro", level: 1 },
      { id: "details", text: "Details", level: 2 },
    ]);
  });

  it("includes generated ids for headings (toc never emits empty id)", () => {
    const html = "<h1>No explicit id</h1>";
    const targets = listCrossRefTargets(html);
    expect(targets).toHaveLength(1);
    expect(targets[0].id.trim()).not.toBe("");
  });

  it("filters out entries with empty id", () => {
    // Simulate by checking the filter directly via a target lacking text/id is
    // impossible from generateToc, so assert the contract: no empty ids remain.
    const html = "<h1>Heading</h1>";
    const targets = listCrossRefTargets(html);
    expect(targets.every((t) => t.id.trim() !== "")).toBe(true);
  });

  it("returns empty array for empty html", () => {
    expect(listCrossRefTargets("")).toEqual([]);
  });
});

describe("buildCrossRefHtml", () => {
  it("builds an internal anchor link", () => {
    expect(buildCrossRefHtml("a", "See intro")).toBe(
      '<a href="#a">See intro</a>'
    );
  });

  it("escapes < and & in the label", () => {
    expect(buildCrossRefHtml("a", "Tom & <b>bold</b>")).toBe(
      '<a href="#a">Tom &amp; &lt;b&gt;bold&lt;/b&gt;</a>'
    );
  });

  it("falls back to targetId when label is blank", () => {
    expect(buildCrossRefHtml("a", "")).toBe('<a href="#a">a</a>');
    expect(buildCrossRefHtml("a", "   ")).toBe('<a href="#a">a</a>');
  });

  it("escapes the targetId in the href", () => {
    expect(buildCrossRefHtml('a"b', "label")).toBe(
      '<a href="#a&quot;b">label</a>'
    );
  });

  it("returns escaped plain text (no link) when targetId is blank", () => {
    expect(buildCrossRefHtml("", "Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(buildCrossRefHtml("   ", "<x>")).toBe("&lt;x&gt;");
  });
});

describe("defaultCrossRefLabel", () => {
  it("returns the Thai see-heading format", () => {
    const target: CrossRefTarget = { id: "a", text: "บทนำ", level: 1 };
    expect(defaultCrossRefLabel(target)).toBe('ดูหัวข้อ "บทนำ"');
  });
});
