import { describe, it, expect } from "vitest";
import { collectComments, stripCommentsForExport } from "./commentMark";

/** Minimal text-node stub matching collectComments' structural type. */
function textNode(text: string, commentId?: string, resolved = false) {
  return {
    isText: true,
    text,
    marks: commentId
      ? [{ type: { name: "comment" }, attrs: { commentId, text: "note", resolved } }]
      : [],
  };
}

function fakeDoc(nodes: ReturnType<typeof textNode>[]) {
  return {
    descendants: (cb: (n: ReturnType<typeof textNode>) => void) =>
      nodes.forEach(cb),
  };
}

describe("collectComments", () => {
  it("collects one entry per comment id, concatenating quotes", () => {
    const doc = fakeDoc([
      textNode("Hello "),
      textNode("wor", "c1"),
      textNode("ld", "c1"),
      textNode(" plain"),
    ]);
    const out = collectComments(doc);
    expect(out).toHaveLength(1);
    expect(out[0].commentId).toBe("c1");
    expect(out[0].quote).toBe("world");
    expect(out[0].text).toBe("note");
  });

  it("returns [] when no comment marks", () => {
    expect(collectComments(fakeDoc([textNode("x")]))).toEqual([]);
  });
});

describe("stripCommentsForExport", () => {
  it("unwraps comment spans, keeping inner text", () => {
    const html = `<p>Hi <span class="wh-comment" data-comment-id="c1" data-comment-text="note">there</span>!</p>`;
    const out = stripCommentsForExport(html);
    expect(out).toContain("Hi there!");
    expect(out).not.toContain("data-comment-id");
    expect(out).not.toContain("wh-comment");
  });

  it("returns html unchanged when no comments", () => {
    expect(stripCommentsForExport("<p>x</p>")).toBe("<p>x</p>");
  });
});
