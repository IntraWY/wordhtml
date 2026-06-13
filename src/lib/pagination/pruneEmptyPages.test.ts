import { describe, it, expect } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { buildPruneEmptyPagesTransaction } from "./pruneEmptyPages";
import { isPageBodyEffectivelyEmpty } from "./pageBodyEmpty";

const schema = new Schema({
  nodes: {
    doc: { content: "pageNode+" },
    pageNode: {
      content: "pageHeader? pageBody pageFooter?",
      attrs: { pageNumber: { default: 1 } },
    },
    pageHeader: { content: "text*" },
    pageBody: { content: "paragraph+" },
    pageFooter: { content: "text*" },
    paragraph: { content: "text*" },
    text: { inline: true },
  },
});

function page(
  pageNumber: number,
  paragraphText: string,
  opts: { header?: string; footer?: string } = {}
) {
  const children = [];
  if (opts.header !== undefined) {
    children.push(
      schema.nodes.pageHeader.create(null, [schema.text(opts.header)])
    );
  }
  children.push(
    schema.nodes.pageBody.create(null, [
      schema.nodes.paragraph.create(
        null,
        paragraphText ? [schema.text(paragraphText)] : []
      ),
    ])
  );
  if (opts.footer !== undefined) {
    children.push(
      schema.nodes.pageFooter.create(null, [schema.text(opts.footer)])
    );
  }
  return schema.nodes.pageNode.create({ pageNumber }, children);
}

describe("isPageBodyEffectivelyEmpty", () => {
  it("treats whitespace-only paragraph as empty", () => {
    const body = schema.nodes.pageBody.create(null, [
      schema.nodes.paragraph.create(null, [schema.text("   ")]),
    ]);
    expect(isPageBodyEffectivelyEmpty(body)).toBe(true);
  });
});

describe("buildPruneEmptyPagesTransaction", () => {
  it("merges leading empty page into the next page with content", () => {
    const doc = schema.nodes.doc.create(null, [page(1, ""), page(2, "Hello")]);
    const state = EditorState.create({ schema, doc });
    const result = buildPruneEmptyPagesTransaction(state);
    expect(result?.removed).toBe(1);

    let pageCount = 0;
    let text = "";
    result!.tr.doc.descendants((node) => {
      if (node.type.name === "pageNode") pageCount += 1;
      if (node.isText) text += node.text;
    });
    expect(pageCount).toBe(1);
    expect(text).toContain("Hello");
  });

  it("finds the body (and merges) when a header precedes it", () => {
    // Regression: getPageBody used node.firstChild, which returns the HEADER
    // when one is present, so prune found no body and silently no-op'd.
    const doc = schema.nodes.doc.create(null, [
      page(1, "", { header: "Letterhead" }),
      page(2, "Hello", { header: "Letterhead" }),
    ]);
    const state = EditorState.create({ schema, doc });
    const result = buildPruneEmptyPagesTransaction(state);
    expect(result?.removed).toBe(1);

    let pageCount = 0;
    let text = "";
    result!.tr.doc.descendants((node) => {
      if (node.type.name === "pageNode") pageCount += 1;
      if (node.isText) text += node.text;
    });
    expect(pageCount).toBe(1);
    expect(text).toContain("Hello");
    // The surviving page kept its header.
    expect(text).toContain("Letterhead");
  });

  it("merges body content correctly when both header and footer are present", () => {
    const doc = schema.nodes.doc.create(null, [
      page(1, "", { header: "H", footer: "F" }),
      page(2, "Content", { header: "H", footer: "F" }),
    ]);
    const state = EditorState.create({ schema, doc });
    const result = buildPruneEmptyPagesTransaction(state);
    expect(result?.removed).toBe(1);

    let bodyText = "";
    result!.tr.doc.descendants((node) => {
      if (node.type.name === "pageBody") bodyText += node.textContent;
    });
    expect(bodyText).toContain("Content");
  });

  it("removes trailing empty pages but keeps one", () => {
    const doc = schema.nodes.doc.create(null, [
      page(1, "Hello"),
      page(2, ""),
      page(3, ""),
    ]);
    const state = EditorState.create({ schema, doc });
    const result = buildPruneEmptyPagesTransaction(state);
    expect(result?.removed).toBe(2);

    let pageCount = 0;
    result!.tr.doc.descendants((node) => {
      if (node.type.name === "pageNode") pageCount += 1;
    });
    expect(pageCount).toBe(1);
  });
});
