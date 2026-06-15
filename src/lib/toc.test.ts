import { describe, it, expect } from "vitest";
import { generateToc, buildTocHtml } from "@/lib/toc";

describe("generateToc", () => {
  it("extracts headings with level, text, and slug id", () => {
    const html = "<h1>Intro</h1><h2>Details</h2><h3>Notes</h3>";
    expect(generateToc(html)).toEqual([
      { level: 1, text: "Intro", id: "intro" },
      { level: 2, text: "Details", id: "details" },
      { level: 3, text: "Notes", id: "notes" },
    ]);
  });

  it("extracts Thai headings and preserves Thai vowels/tone marks in ids", () => {
    const html = "<h1>บทนำ</h1><h2>วัตถุประสงค์ ของโครงการ</h2>";
    const items = generateToc(html);
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ level: 1, text: "บทนำ", id: "บทนำ" });
    // slugify keeps Thai combining vowels/tone marks (ั ุ ์) — stripping them
    // would mangle the word and break anchor↔heading id matching.
    expect(items[1].id).toBe("วัตถุประสงค์-ของโครงการ");
  });

  it("preserves Thai vowels in สรุป (regression: NFD + \\p{L} stripped them to สรป)", () => {
    const items = generateToc("<h1>สรุป</h1>");
    expect(items[0].id).toBe("สรุป");
  });

  it("de-duplicates repeated heading texts with numeric suffixes", () => {
    const html = "<h1>บทนำ</h1><h2>บทนำ</h2><h2>บทนำ</h2>";
    const ids = generateToc(html).map((i) => i.id);
    expect(ids).toEqual(["บทนำ", "บทนำ-2", "บทนำ-3"]);
  });

  it("falls back to heading-N for empty/symbol-only headings", () => {
    const html = "<h1></h1><h2>!!!</h2>";
    const ids = generateToc(html).map((i) => i.id);
    expect(ids).toEqual(["heading-1", "heading-2"]);
  });

  it("returns an empty array for empty or non-string html", () => {
    expect(generateToc("")).toEqual([]);
    expect(generateToc("<p>no headings</p>")).toEqual([]);
  });
});

describe("buildTocHtml", () => {
  it("renders a ul.toc with anchors matching Thai heading ids", () => {
    const html = buildTocHtml([
      { level: 1, text: "บทนำ", id: "บทนำ" },
      { level: 2, text: "สรุป", id: "สรุป" },
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelector("ul.toc")).not.toBeNull();
    const hrefs = Array.from(doc.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toEqual(["#บทนำ", "#สรุป"]);
  });

  it("returns empty string for no items", () => {
    expect(buildTocHtml([])).toBe("");
  });

  it("escapes heading text and ids in the output", () => {
    const html = buildTocHtml([{ level: 1, text: '<b>x</b> & "y"', id: 'id"1' }]);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;");
    expect(html).toContain('href="#id&quot;1"');
    expect(html).not.toContain("<b>x</b>");
  });
});
