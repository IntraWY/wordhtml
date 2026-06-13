import { describe, it, expect } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { buildPageNodes } from "./repaginate";

/**
 * Regression coverage for the A1 silent-data-loss bug: the holistic reflow
 * rebuild (`buildPageNodes`) must carry each source page's editable
 * `pageHeader` / `pageFooter` onto the rebuilt pages. The DOM-measurement parts
 * of `buildRepaginateTransaction` are exercised by the Playwright pagination
 * regression suite; here we unit-test the pure page-construction contract.
 */

const schema = new Schema({
  nodes: {
    doc: { content: "pageNode+" },
    pageNode: {
      content: "pageHeader? pageBody pageFooter?",
      attrs: { pageNumber: { default: 1 }, pageSetup: { default: null } },
    },
    pageHeader: { content: "text*" },
    pageBody: { content: "paragraph+" },
    pageFooter: { content: "text*" },
    paragraph: { content: "text*" },
    text: { inline: true },
  },
});

const types = {
  pageNodeType: schema.nodes.pageNode,
  pageBodyType: schema.nodes.pageBody,
  paragraphType: schema.nodes.paragraph,
};

function para(text: string) {
  return schema.nodes.paragraph.create(null, [schema.text(text)]);
}
function header(text: string) {
  return schema.nodes.pageHeader.create(null, [schema.text(text)]);
}
function footer(text: string) {
  return schema.nodes.pageFooter.create(null, [schema.text(text)]);
}

function headerTextOf(page: ReturnType<typeof schema.nodes.pageNode.create>) {
  let h = "";
  page.forEach((c) => {
    if (c.type.name === "pageHeader") h = c.textContent;
  });
  return h;
}
function footerTextOf(page: ReturnType<typeof schema.nodes.pageNode.create>) {
  let f = "";
  page.forEach((c) => {
    if (c.type.name === "pageFooter") f = c.textContent;
  });
  return f;
}

describe("buildPageNodes — header/footer preservation across reflow", () => {
  it("keeps headers when a multi-page doc is rebuilt at the same page count", () => {
    const flow = {
      pageHeaders: [header("Letterhead"), header("Letterhead")],
      pageFooters: [null, null],
      pageSetup: null,
    };
    const segments = [[para("Page one body")], [para("Page two body")]];

    const pages = buildPageNodes(segments, flow, types);
    expect(pages).toHaveLength(2);
    expect(headerTextOf(pages[0])).toBe("Letterhead");
    expect(headerTextOf(pages[1])).toBe("Letterhead");
    expect(pages[0].textContent).toContain("Page one body");
  });

  it("keeps both header and footer on every rebuilt page", () => {
    const flow = {
      pageHeaders: [header("H1"), header("H2")],
      pageFooters: [footer("F1"), footer("F2")],
      pageSetup: null,
    };
    const segments = [[para("A")], [para("B")]];

    const pages = buildPageNodes(segments, flow, types);
    expect(headerTextOf(pages[0])).toBe("H1");
    expect(footerTextOf(pages[0])).toBe("F1");
    expect(headerTextOf(pages[1])).toBe("H2");
    expect(footerTextOf(pages[1])).toBe("F2");
  });

  it("carries page-1 header onto a newly-created page when the doc grows", () => {
    // One source page had a header; reflow split content onto a second page.
    const flow = {
      pageHeaders: [header("Doc header")],
      pageFooters: [footer("Doc footer")],
      pageSetup: null,
    };
    const segments = [[para("first")], [para("second")]];

    const pages = buildPageNodes(segments, flow, types);
    expect(pages).toHaveLength(2);
    // New page inherits the document's header/footer rather than losing it.
    expect(headerTextOf(pages[0])).toBe("Doc header");
    expect(headerTextOf(pages[1])).toBe("Doc header");
    expect(footerTextOf(pages[1])).toBe("Doc footer");
  });

  it("preserves the surviving page's header when the doc shrinks to one page", () => {
    const flow = {
      pageHeaders: [header("Keep me"), header("Keep me")],
      pageFooters: [null, null],
      pageSetup: null,
    };
    // Two source pages collapse into one.
    const segments = [[para("merged a"), para("merged b")]];

    const pages = buildPageNodes(segments, flow, types);
    expect(pages).toHaveLength(1);
    expect(headerTextOf(pages[0])).toBe("Keep me");
    expect(pages[0].textContent).toContain("merged a");
    expect(pages[0].textContent).toContain("merged b");
  });

  it("produces no header/footer children for a doc that never had them", () => {
    const flow = {
      pageHeaders: [null, null],
      pageFooters: [null, null],
      pageSetup: null,
    };
    const segments = [[para("x")], [para("y")]];

    const pages = buildPageNodes(segments, flow, types);
    expect(headerTextOf(pages[0])).toBe("");
    expect(footerTextOf(pages[0])).toBe("");
    // Body is the only child.
    expect(pages[0].childCount).toBe(1);
    expect(pages[0].firstChild?.type.name).toBe("pageBody");
  });
});
