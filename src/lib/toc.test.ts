import { describe, it, expect } from "vitest";
import {
  generateToc,
  buildTocHtml,
  buildTocBlockHtml,
  replaceTocInHtml,
  TOC_DEFAULT_MAX_LEVEL,
  TOC_DEFAULT_TITLE,
  type TocItem,
} from "@/lib/toc";

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
    // would mangle the word and break anchor↔heading id matching. Same contract
    // as assignHeadingIds, so anchors still line up with the written heading ids.
    expect(items[1].id).toBe("วัตถุประสงค์-ของโครงการ");
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
  const items: TocItem[] = [
    { level: 1, text: "บทนำ", id: "บทนำ" },
    { level: 2, text: "ที่มา", id: "ที่มา" },
    { level: 3, text: "รายละเอียด", id: "รายละเอียด" },
    { level: 1, text: "สรุป", id: "สรุป" },
  ];

  it("renders a ul.toc marked data-toc with anchors matching heading ids", () => {
    const html = buildTocHtml(items);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const top = doc.querySelector("ul.toc");
    expect(top).not.toBeNull();
    expect(top?.getAttribute("data-toc")).toBe("true");
    const hrefs = Array.from(doc.querySelectorAll("a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toEqual(["#บทนำ", "#ที่มา", "#รายละเอียด", "#สรุป"]);
  });

  it("indents by level using nested lists", () => {
    const html = buildTocHtml(items);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const depthOf = (text: string) => {
      const a = Array.from(doc.querySelectorAll("a")).find(
        (el) => el.textContent === text
      );
      let depth = 0;
      let node = a?.parentElement ?? null;
      while (node) {
        if (node.tagName === "UL") depth++;
        node = node.parentElement;
      }
      return depth;
    };
    expect(depthOf("บทนำ")).toBe(1);
    expect(depthOf("ที่มา")).toBe(2);
    expect(depthOf("รายละเอียด")).toBe(3);
    expect(depthOf("สรุป")).toBe(1); // back at top level after deep entries
  });

  it("applies the depth limit (default insert depth is H1–H3)", () => {
    const deep: TocItem[] = [
      { level: 1, text: "A", id: "a" },
      { level: 3, text: "B", id: "b" },
      { level: 4, text: "C", id: "c" },
    ];
    const html = buildTocHtml(deep, TOC_DEFAULT_MAX_LEVEL);
    expect(html).toContain("#a");
    expect(html).toContain("#b");
    expect(html).not.toContain("#c");
  });

  it("escapes heading text and ids in the output", () => {
    const html = buildTocHtml([
      { level: 1, text: '<b>x</b> & "y"', id: 'id"1' },
    ]);
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;");
    expect(html).toContain('href="#id&quot;1"');
    expect(html).not.toContain("<b>x</b>");
  });

  it("returns empty string when no items survive the depth limit", () => {
    expect(buildTocHtml([], 3)).toBe("");
    expect(buildTocHtml([{ level: 4, text: "x", id: "x" }], 3)).toBe("");
  });
});

describe("buildTocBlockHtml", () => {
  const items: TocItem[] = [
    { level: 1, text: "บทนำ", id: "บทนำ" },
    { level: 4, text: "ลึกเกินไป", id: "ลึกเกินไป" },
  ];

  it("wraps the list in a data-toc div with the Thai title สารบัญ", () => {
    const html = buildTocBlockHtml(items);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const block = doc.querySelector("div[data-toc]");
    expect(block).not.toBeNull();
    expect(block?.querySelector(".toc-title")?.textContent).toBe(
      TOC_DEFAULT_TITLE
    );
    expect(TOC_DEFAULT_TITLE).toBe("สารบัญ");
    expect(block?.querySelector("ul.toc")).not.toBeNull();
    // Title is a paragraph, not a heading — the TOC must never list itself.
    expect(block?.querySelector("h1, h2, h3, h4, h5, h6")).toBeNull();
  });

  it("defaults to depth H1–H3 and supports a custom title/depth", () => {
    expect(buildTocBlockHtml(items)).not.toContain("ลึกเกินไป");
    const custom = buildTocBlockHtml(items, { maxLevel: 6, title: "Contents" });
    expect(custom).toContain("ลึกเกินไป");
    expect(custom).toContain("Contents");
  });

  it("returns empty string when there is nothing to list", () => {
    expect(buildTocBlockHtml([])).toBe("");
    expect(buildTocBlockHtml([{ level: 5, text: "x", id: "x" }])).toBe("");
  });
});

describe("replaceTocInHtml (อัปเดตสารบัญ)", () => {
  it("returns null when the document has no TOC yet", () => {
    expect(replaceTocInHtml("<h1>บทนำ</h1>", [{ level: 1, text: "บทนำ", id: "บทนำ" }])).toBeNull();
    expect(replaceTocInHtml("", [])).toBeNull();
  });

  it("replaces an existing data-toc block instead of adding a second one", () => {
    const docHtml = "<h1>บทนำ</h1>" + buildTocBlockHtml([{ level: 1, text: "บทนำ", id: "บทนำ" }]) + "<h1>สรุป</h1>";
    const refreshed = replaceTocInHtml(docHtml, [
      { level: 1, text: "บทนำ", id: "บทนำ" },
      { level: 1, text: "สรุป", id: "สรุป" },
    ]);
    expect(refreshed).not.toBeNull();
    const doc = new DOMParser().parseFromString(refreshed!, "text/html");
    expect(doc.querySelectorAll("div[data-toc]")).toHaveLength(1);
    expect(doc.querySelectorAll("ul.toc")).toHaveLength(1);
    const hrefs = Array.from(doc.querySelectorAll("ul.toc a")).map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toEqual(["#บทนำ", "#สรุป"]);
  });

  it("falls back to a bare ul.toc (editor-normalized HTML, div unwrapped)", () => {
    // Tiptap unwraps the data-toc div but BulletListWithClass keeps class="toc".
    const docHtml =
      '<p><strong>สารบัญ</strong></p><ul class="toc"><li><p><a href="#เก่า">เก่า</a></p></li></ul><h1>ใหม่</h1>';
    const refreshed = replaceTocInHtml(docHtml, [
      { level: 1, text: "ใหม่", id: "ใหม่" },
    ]);
    expect(refreshed).not.toBeNull();
    const doc = new DOMParser().parseFromString(refreshed!, "text/html");
    expect(doc.querySelectorAll("ul.toc")).toHaveLength(1);
    expect(refreshed).not.toContain("#เก่า");
    expect(refreshed).toContain("#ใหม่");
    // Only the list is swapped — the surviving title paragraph is not duplicated.
    expect(refreshed!.match(/สารบัญ/g)).toHaveLength(1);
  });

  it("anchor hrefs in a refreshed TOC match the heading ids of the document", () => {
    // ids match what assignHeadingIds would write (slugify of the text)
    const body =
      '<h1 id="บทนำ">บทนำ</h1><h2 id="ขอบเขต">ขอบเขต</h2><h1 id="สรุป">สรุป</h1>';
    const withToc = body + buildTocBlockHtml(generateToc(body));
    // Document changed: extract again and refresh.
    const newBody = body + '<h1 id="ภาคผนวก">ภาคผนวก</h1>';
    const refreshed = replaceTocInHtml(newBody + withToc.slice(body.length), generateToc(newBody));
    expect(refreshed).not.toBeNull();
    const doc = new DOMParser().parseFromString(refreshed!, "text/html");
    const headingIds = Array.from(
      doc.querySelectorAll("h1, h2, h3")
    ).map((h) => h.id);
    const hrefs = Array.from(doc.querySelectorAll("ul.toc a")).map((a) =>
      (a.getAttribute("href") ?? "").replace(/^#/, "")
    );
    for (const href of hrefs) {
      expect(headingIds).toContain(href);
    }
    expect(hrefs).toEqual(["บทนำ", "ขอบเขต", "สรุป", "ภาคผนวก"]);
  });
});
