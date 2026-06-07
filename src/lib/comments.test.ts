import { describe, it, expect } from "vitest";
import {
  type DocComment,
  makeCommentId,
  createComment,
  upsertComment,
  removeComment,
  toggleResolved,
  serializeComments,
  parseComments,
} from "./comments";

function mk(over: Partial<DocComment> = {}): DocComment {
  return {
    id: "c1",
    text: "a note",
    quote: "anchored text",
    resolved: false,
    createdAt: 1000,
    ...over,
  };
}

describe("makeCommentId", () => {
  it("returns c1 for an empty list", () => {
    expect(makeCommentId([])).toBe("c1");
  });

  it("increments past the highest used id", () => {
    const list = [mk({ id: "c1" }), mk({ id: "c2" })];
    expect(makeCommentId(list)).toBe("c3");
  });

  it("reuses the first free gap: [c1, c3] → c2", () => {
    const list = [mk({ id: "c1" }), mk({ id: "c3" })];
    expect(makeCommentId(list)).toBe("c2");
  });

  it("avoids collisions regardless of array order", () => {
    const list = [mk({ id: "c2" }), mk({ id: "c1" })];
    expect(makeCommentId(list)).toBe("c3");
  });
});

describe("createComment", () => {
  it("builds a comment with a fresh id, resolved false, and createdAt = now", () => {
    const existing = [mk({ id: "c1" })];
    const c = createComment({
      text: "hello",
      quote: "world",
      now: 42,
      existing,
    });
    expect(c.id).toBe("c2");
    expect(c.text).toBe("hello");
    expect(c.quote).toBe("world");
    expect(c.resolved).toBe(false);
    expect(c.createdAt).toBe(42);
  });

  it("trims text and quote", () => {
    const c = createComment({
      text: "  spaced note  ",
      quote: "\t quoted \n",
      now: 0,
      existing: [],
    });
    expect(c.text).toBe("spaced note");
    expect(c.quote).toBe("quoted");
    expect(c.id).toBe("c1");
  });
});

describe("upsertComment", () => {
  it("appends a new comment", () => {
    const list = [mk({ id: "c1" })];
    const next = upsertComment(list, mk({ id: "c2", text: "second" }));
    expect(next).toHaveLength(2);
    expect(next[1].id).toBe("c2");
    expect(next).not.toBe(list); // new array
  });

  it("replaces an existing comment by id, preserving position", () => {
    const list = [mk({ id: "c1" }), mk({ id: "c2", text: "old" })];
    const next = upsertComment(list, mk({ id: "c2", text: "new" }));
    expect(next).toHaveLength(2);
    expect(next[1].text).toBe("new");
    expect(next).not.toBe(list);
  });
});

describe("removeComment", () => {
  it("removes the matching comment", () => {
    const list = [mk({ id: "c1" }), mk({ id: "c2" })];
    const next = removeComment(list, "c1");
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("c2");
  });

  it("is a no-op (new array) when id is absent", () => {
    const list = [mk({ id: "c1" })];
    const next = removeComment(list, "c9");
    expect(next).toHaveLength(1);
  });
});

describe("toggleResolved", () => {
  it("flips resolved for the matching id only", () => {
    const list = [
      mk({ id: "c1", resolved: false }),
      mk({ id: "c2", resolved: false }),
    ];
    const next = toggleResolved(list, "c1");
    expect(next[0].resolved).toBe(true);
    expect(next[1].resolved).toBe(false);
  });

  it("flips back when called twice", () => {
    const list = [mk({ id: "c1", resolved: true })];
    const next = toggleResolved(list, "c1");
    expect(next[0].resolved).toBe(false);
  });
});

describe("serialize / parse round-trip", () => {
  it("round-trips a list", () => {
    const list = [mk({ id: "c1" }), mk({ id: "c2", resolved: true })];
    const json = serializeComments(list);
    expect(parseComments(json)).toEqual(list);
  });
});

describe("parseComments", () => {
  it("returns [] for null and undefined", () => {
    expect(parseComments(null)).toEqual([]);
    expect(parseComments(undefined)).toEqual([]);
  });

  it("returns [] for invalid JSON", () => {
    expect(parseComments("garbage")).toEqual([]);
  });

  it("returns [] for a non-array payload like {}", () => {
    expect(parseComments("{}")).toEqual([]);
  });

  it("filters out malformed entries (missing string id/text)", () => {
    const json = JSON.stringify([
      mk({ id: "c1", text: "ok" }),
      { id: 5, text: "bad id" },
      { id: "c2" }, // missing text
      { text: "no id" },
      null,
      "string entry",
    ]);
    const parsed = parseComments(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("c1");
  });
});
