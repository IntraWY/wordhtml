import { describe, it, expect } from "vitest";
import type { TemplateVariable } from "@/types";
import {
  resolveControlBlocks,
  stripControlBlocksForHealth,
} from "./conditionalBlocks";

const vars = (...vs: Partial<TemplateVariable>[]): TemplateVariable[] =>
  vs.map((v) => ({
    name: v.name ?? "x",
    value: v.value ?? "",
    isList: v.isList ?? false,
    listValues: v.listValues,
    delimiter: v.delimiter,
  }));

describe("resolveControlBlocks — conditionals", () => {
  it("renders the if-body when the variable is truthy", () => {
    const out = resolveControlBlocks(
      "A{{#if name}}-hello-{{/if}}B",
      vars({ name: "name", value: "Joe" }),
      {}
    );
    expect(out).toBe("A-hello-B");
  });

  it("drops the if-body when the variable is empty", () => {
    const out = resolveControlBlocks(
      "A{{#if name}}-hello-{{/if}}B",
      vars({ name: "name", value: "" }),
      {}
    );
    expect(out).toBe("AB");
  });

  it("drops the if-body when the variable is whitespace only", () => {
    const out = resolveControlBlocks(
      "A{{#if name}}X{{/if}}B",
      vars({ name: "name", value: "   " }),
      {}
    );
    expect(out).toBe("AB");
  });

  it("drops the if-body when the variable is missing entirely", () => {
    const out = resolveControlBlocks(
      "A{{#if nope}}X{{/if}}B",
      vars({ name: "name", value: "Joe" }),
      {}
    );
    expect(out).toBe("AB");
  });

  it("renders the else-branch when the variable is falsy", () => {
    const out = resolveControlBlocks(
      "{{#if name}}YES{{else}}NO{{/if}}",
      vars({ name: "name", value: "" }),
      {}
    );
    expect(out).toBe("NO");
  });

  it("renders the if-branch (not else) when truthy", () => {
    const out = resolveControlBlocks(
      "{{#if name}}YES{{else}}NO{{/if}}",
      vars({ name: "name", value: "x" }),
      {}
    );
    expect(out).toBe("YES");
  });

  it("uses dataRow value over variable default for truthiness", () => {
    const out = resolveControlBlocks(
      "{{#if name}}YES{{else}}NO{{/if}}",
      vars({ name: "name", value: "default" }),
      { name: "" }
    );
    expect(out).toBe("NO");
  });
});

describe("resolveControlBlocks — unless", () => {
  it("renders the unless-body when the variable is falsy", () => {
    const out = resolveControlBlocks(
      "{{#unless name}}EMPTY{{/unless}}",
      vars({ name: "name", value: "" }),
      {}
    );
    expect(out).toBe("EMPTY");
  });

  it("drops the unless-body when the variable is truthy", () => {
    const out = resolveControlBlocks(
      "{{#unless name}}EMPTY{{/unless}}",
      vars({ name: "name", value: "Joe" }),
      {}
    );
    expect(out).toBe("");
  });

  it("supports else inside unless", () => {
    const out = resolveControlBlocks(
      "{{#unless name}}A{{else}}B{{/unless}}",
      vars({ name: "name", value: "filled" }),
      {}
    );
    expect(out).toBe("B");
  });
});

describe("resolveControlBlocks — nesting", () => {
  it("resolves an if nested inside a truthy if", () => {
    const out = resolveControlBlocks(
      "{{#if a}}A[{{#if b}}B{{/if}}]{{/if}}",
      vars({ name: "a", value: "1" }, { name: "b", value: "1" }),
      {}
    );
    expect(out).toBe("A[B]");
  });

  it("inner falsy if drops only the inner body", () => {
    const out = resolveControlBlocks(
      "{{#if a}}A[{{#if b}}B{{/if}}]{{/if}}",
      vars({ name: "a", value: "1" }, { name: "b", value: "" }),
      {}
    );
    expect(out).toBe("A[]");
  });

  it("outer falsy if drops the whole nested block", () => {
    const out = resolveControlBlocks(
      "{{#if a}}A[{{#if b}}B{{/if}}]{{/if}}",
      vars({ name: "a", value: "" }, { name: "b", value: "1" }),
      {}
    );
    expect(out).toBe("");
  });

  it("nested if/else both branches", () => {
    const out = resolveControlBlocks(
      "{{#if a}}{{#if b}}AB{{else}}A-only{{/if}}{{else}}no-a{{/if}}",
      vars({ name: "a", value: "1" }, { name: "b", value: "" }),
      {}
    );
    expect(out).toBe("A-only");
  });
});

describe("resolveControlBlocks — each loops", () => {
  const listVar = vars({
    name: "items",
    isList: true,
    listValues: ["Apple", "Banana", "Cherry"],
  });

  it("repeats the body once per list item with {{this}}", () => {
    const out = resolveControlBlocks(
      "{{#each items}}[{{this}}]{{/each}}",
      listVar,
      {}
    );
    expect(out).toBe("[Apple][Banana][Cherry]");
  });

  it("renders nothing for an empty list", () => {
    const out = resolveControlBlocks(
      "X{{#each items}}[{{this}}]{{/each}}Y",
      vars({ name: "items", isList: true, listValues: [] }),
      {}
    );
    expect(out).toBe("XY");
  });

  it("renders nothing for a missing list variable", () => {
    const out = resolveControlBlocks(
      "X{{#each nope}}[{{this}}]{{/each}}Y",
      listVar,
      {}
    );
    expect(out).toBe("XY");
  });

  it("renders a single-item list once", () => {
    const out = resolveControlBlocks(
      "{{#each items}}{{this}}{{/each}}",
      vars({ name: "items", isList: true, listValues: ["Solo"] }),
      {}
    );
    expect(out).toBe("Solo");
  });

  it("applies a filter to {{this|upper}} inside the loop", () => {
    const out = resolveControlBlocks(
      "{{#each items}}{{this|upper}} {{/each}}",
      vars({ name: "items", isList: true, listValues: ["a", "b"] }),
      {}
    );
    expect(out).toBe("A B ");
  });

  it("falls back to splitting a comma-delimited non-list value", () => {
    const out = resolveControlBlocks(
      "{{#each items}}[{{this}}]{{/each}}",
      vars({ name: "items", value: "x, y, z", delimiter: "," }),
      {}
    );
    expect(out).toBe("[x][y][z]");
  });

  it("supports {{this.field}} for object-style dataRow JSON lists", () => {
    const out = resolveControlBlocks(
      "{{#each people}}{{this.name}}={{this.age}};{{/each}}",
      vars({
        name: "people",
        isList: true,
        listValues: [
          JSON.stringify({ name: "Ann", age: "30" }),
          JSON.stringify({ name: "Bob", age: "25" }),
        ],
      }),
      {}
    );
    expect(out).toBe("Ann=30;Bob=25;");
  });
});

describe("resolveControlBlocks — safety / malformed tags", () => {
  it("leaves an unbalanced {{#if}} without {{/if}} as-is and does not throw", () => {
    const src = "before {{#if a}} dangling";
    expect(() => resolveControlBlocks(src, vars({ name: "a", value: "1" }), {})).not.toThrow();
    expect(resolveControlBlocks(src, vars({ name: "a", value: "1" }), {})).toBe(src);
  });

  it("leaves a stray {{/if}} as-is", () => {
    const src = "x {{/if}} y";
    expect(resolveControlBlocks(src, vars(), {})).toBe(src);
  });

  it("does not throw on an unclosed {{#each}}", () => {
    const src = "{{#each items}} no end";
    expect(() =>
      resolveControlBlocks(src, vars({ name: "items", isList: true, listValues: ["a"] }), {})
    ).not.toThrow();
    expect(
      resolveControlBlocks(src, vars({ name: "items", isList: true, listValues: ["a"] }), {})
    ).toBe(src);
  });

  it("leaves plain {{var}} fields untouched (resolved by later pass)", () => {
    const out = resolveControlBlocks(
      "{{#if a}}Hi {{name}}{{/if}}",
      vars({ name: "a", value: "1" }, { name: "name", value: "Joe" }),
      {}
    );
    expect(out).toBe("Hi {{name}}");
  });

  it("handles empty input", () => {
    expect(resolveControlBlocks("", vars(), {})).toBe("");
  });
});

describe("resolveControlBlocks — security / injection", () => {
  it("HTML-escapes a loop item containing markup ({{this}})", () => {
    const out = resolveControlBlocks(
      "{{#each items}}[{{this}}]{{/each}}",
      vars({
        name: "items",
        isList: true,
        listValues: ['<img src=x onerror=alert(1)>'],
      }),
      {}
    );
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
    expect(out).toContain("onerror"); // present but neutralized as text
    expect(out).toBe("[&lt;img src=x onerror=alert(1)&gt;]");
  });

  it("HTML-escapes object fields ({{this.field}})", () => {
    const out = resolveControlBlocks(
      "{{#each people}}{{this.name}}{{/each}}",
      vars({
        name: "people",
        isList: true,
        listValues: [JSON.stringify({ name: "<b>x</b>" })],
      }),
      {}
    );
    expect(out).toBe("&lt;b&gt;x&lt;/b&gt;");
  });

  it("does NOT re-parse control directives embedded in loop data (second-order injection)", () => {
    const out = resolveControlBlocks(
      "{{#each items}}{{this}}{{/each}}",
      vars({
        name: "items",
        isList: true,
        listValues: ["{{#if secret}}LEAK{{/if}}"],
      }),
      {}
    );
    // The injected directive must be escaped as literal text, never interpreted.
    expect(out).not.toContain("LEAK at the wrong place");
    expect(out).toContain("{{#if secret}}");
    expect(out).toBe("{{#if secret}}LEAK{{/if}}");
  });

  it("does NOT let a {{this}} value inject a plain merge field that a later pass resolves", () => {
    const out = resolveControlBlocks(
      "{{#each items}}{{this}}{{/each}}",
      vars({ name: "items", isList: true, listValues: ["{{name}}"] }),
      {}
    );
    // Curly braces survive (data is opaque), so the downstream merge pass cannot
    // expand attacker-supplied {{name}}. (Braces are not HTML-escaped, but the
    // value is not re-parsed by resolveControlBlocks.)
    expect(out).toBe("{{name}}");
  });

  it("applies the filter THEN escapes the result on loop items", () => {
    const out = resolveControlBlocks(
      "{{#each items}}{{this|upper}}{{/each}}",
      vars({ name: "items", isList: true, listValues: ["<a>"] }),
      {}
    );
    // upper applied, then escaped
    expect(out).toBe("&lt;A&gt;");
  });
});

describe("resolveControlBlocks — prototype-chain variable names", () => {
  const protoNames = ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty"];

  for (const name of protoNames) {
    it(`treats {{#if ${name}}} as unset (no throw)`, () => {
      const src = `A{{#if ${name}}}X{{/if}}B`;
      expect(() => resolveControlBlocks(src, vars(), {})).not.toThrow();
      expect(resolveControlBlocks(src, vars(), {})).toBe("AB");
    });

    it(`treats {{#each ${name}}} as an empty list (no throw)`, () => {
      const src = `A{{#each ${name}}}[{{this}}]{{/each}}B`;
      expect(() => resolveControlBlocks(src, vars(), {})).not.toThrow();
      expect(resolveControlBlocks(src, vars(), {})).toBe("AB");
    });
  }

  it("treats a prototype-chain name in dataRow as unset", () => {
    const src = "{{#if toString}}X{{else}}Y{{/if}}";
    expect(resolveControlBlocks(src, vars(), {})).toBe("Y");
  });
});

describe("resolveControlBlocks — deep nesting (no stack overflow)", () => {
  it("does not throw on 1000+ levels of well-formed nesting", () => {
    const depth = 1500;
    const src = "{{#if a}}".repeat(depth) + "core" + "{{/if}}".repeat(depth);
    const v = vars({ name: "a", value: "1" });
    expect(() => resolveControlBlocks(src, v, {})).not.toThrow();
    // With a depth cap, leftover inner text is left as-is rather than throwing.
    expect(resolveControlBlocks(src, v, {})).toContain("core");
  });

  it("stripControlBlocksForHealth does not throw on deep nesting", () => {
    const depth = 1500;
    const src = "{{#if a}}".repeat(depth) + "core" + "{{/if}}".repeat(depth);
    const v = vars({ name: "a", value: "1" });
    expect(() => stripControlBlocksForHealth(src, v, {})).not.toThrow();
  });
});

describe("stripControlBlocksForHealth", () => {
  it("removes a false branch's body so its vars aren't health-flagged", () => {
    const out = stripControlBlocksForHealth(
      "Hi{{#if cond}}{{secret}}{{/if}}",
      vars({ name: "cond", value: "" }),
      {}
    );
    expect(out).not.toContain("secret");
    expect(out).toBe("Hi");
  });

  it("keeps a true branch's body so its vars are still checked", () => {
    const out = stripControlBlocksForHealth(
      "{{#if cond}}{{shown}}{{/if}}",
      vars({ name: "cond", value: "yes" }),
      {}
    );
    expect(out).toContain("{{shown}}");
  });

  it("removes each-loop bodies (loop vars are not unset-flagged)", () => {
    const out = stripControlBlocksForHealth(
      "{{#each items}}{{this}}{{/each}}tail",
      vars({ name: "items", isList: true, listValues: ["a", "b"] }),
      {}
    );
    expect(out).not.toContain("{{this}}");
    expect(out).toContain("tail");
  });
});
