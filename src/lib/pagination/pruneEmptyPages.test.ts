import { describe, it, expect } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { buildPruneEmptyPagesTransaction } from "./pruneEmptyPages";
import { isPageBodyEffectivelyEmpty } from "./pageBodyEmpty";

const schema = new Schema({
  nodes: {
    doc: { content: "pageNode+" },
    pageNode: {
      content: "pageBody",
      attrs: { pageNumber: { default: 1 } },
    },
    pageBody: { content: "paragraph+" },
    paragraph: { content: "text*" },
    text: { inline: true },
  },
});

function page(pageNumber: number, paragraphText: string) {
  return schema.nodes.pageNode.create(
    { pageNumber },
    [
      schema.nodes.pageBody.create(null, [
        schema.nodes.paragraph.create(null, paragraphText ? [schema.text(paragraphText)] : []),
      ]),
    ]
  );
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
