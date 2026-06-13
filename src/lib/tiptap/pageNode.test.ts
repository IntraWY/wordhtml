import { describe, it, expect, afterEach } from "vitest";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { PageNode, type PageNodeAttributes } from "./pageNode";
import { PageBodyNode } from "./pageBody";
import { PagedDocument } from "./pagedDocument";
import { PageBreak } from "./pageBreak";
import { A4, LETTER, mmToPx } from "@/lib/page";
import type { PageSetup } from "@/types";

/**
 * Editor harness with the page schema. PageNode bundles PageHeaderNode +
 * PageFooterNode via addExtensions(), so registering PageNode + PageBodyNode is
 * enough for the `pageHeader? pageBody pageFooter?` content expression.
 */
function createPageEditor(html: string) {
  return new Editor({
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
    ],
    content: html,
  });
}

// Tiptap v3 types config methods with a strict `this` context that cannot be
// satisfied in unit tests without a full Editor instance. Cast to `any` so we
// can invoke the functions directly and keep tests fast and isolated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c = PageNode.config as any;

describe("PageNode", () => {
  describe("renderHTML", () => {
    it("renders div.page-node with A4 portrait dimensions and CSS variables", () => {
      const setup: PageSetup = {
        size: "A4",
        orientation: "portrait",
        marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
      };
      const attrs: PageNodeAttributes = { pageNumber: 1, pageSetup: setup };

      const result = c.renderHTML({
        HTMLAttributes: {},
        node: { attrs } as never,
      });

      expect(result[0]).toBe("div");
      const props = result[1] as Record<string, string>;
      expect(props.class).toBe("page-node");

      const widthPx = Math.round(mmToPx(A4.wMm));
      const heightPx = Math.round(mmToPx(A4.hMm));
      const marginTopPx = Math.round(mmToPx(25));
      const marginRightPx = Math.round(mmToPx(19));
      const marginBottomPx = Math.round(mmToPx(25));
      const marginLeftPx = Math.round(mmToPx(19));

      expect(props.style).toContain(`width:${widthPx}px`);
      expect(props.style).toContain(`height:${heightPx}px`);
      expect(props.style).toContain(`--page-margin-top:${marginTopPx}px`);
      expect(props.style).toContain(`--page-margin-right:${marginRightPx}px`);
      expect(props.style).toContain(`--page-margin-bottom:${marginBottomPx}px`);
      expect(props.style).toContain(`--page-margin-left:${marginLeftPx}px`);
    });

    it("renders Letter landscape dimensions correctly", () => {
      const setup: PageSetup = {
        size: "Letter",
        orientation: "landscape",
        marginMm: { top: 20, right: 20, bottom: 20, left: 20 },
      };
      const attrs: PageNodeAttributes = { pageNumber: 2, pageSetup: setup };

      const result = c.renderHTML({
        HTMLAttributes: {},
        node: { attrs } as never,
      });

      const props = result[1] as Record<string, string>;
      const widthPx = Math.round(mmToPx(LETTER.hMm));
      const heightPx = Math.round(mmToPx(LETTER.wMm));

      expect(props.style).toContain(`width:${widthPx}px`);
      expect(props.style).toContain(`height:${heightPx}px`);
    });

    it("includes data-page-number and data-page-setup from HTMLAttributes", () => {
      const setup: PageSetup = {
        size: "A4",
        orientation: "portrait",
        marginMm: { top: 10, right: 10, bottom: 10, left: 10 },
      };
      const attrs: PageNodeAttributes = { pageNumber: 3, pageSetup: setup };

      const result = c.renderHTML({
        HTMLAttributes: {
          "data-page-number": "3",
          "data-page-setup": JSON.stringify(setup),
        },
        node: { attrs } as never,
      });

      const props = result[1] as Record<string, string>;
      expect(props["data-page-number"]).toBe("3");
      expect(props["data-page-setup"]).toBe(JSON.stringify(setup));
    });

    it("places child content marker at index 2", () => {
      const result = c.renderHTML({
        HTMLAttributes: {},
        node: { attrs: { pageNumber: 1, pageSetup: { size: "A4", orientation: "portrait", marginMm: { top: 0, right: 0, bottom: 0, left: 0 } } } } as never,
      });

      expect(result[2]).toBe(0);
    });
  });

  describe("parseHTML", () => {
    it("matches div.page-node tag", () => {
      const rules = c.parseHTML();
      expect(rules).toHaveLength(1);
      expect(rules[0].tag).toBe("div.page-node");
    });
  });

  describe("attributes", () => {
    it("defaults pageNumber to 1", () => {
      const defs = c.addAttributes();
      expect(defs.pageNumber.default).toBe(1);
    });

    it("defaults pageSetup to A4 portrait with standard margins", () => {
      const defs = c.addAttributes();
      const defaultSetup = defs.pageSetup.default as PageSetup;
      expect(defaultSetup.size).toBe("A4");
      expect(defaultSetup.orientation).toBe("portrait");
      expect(defaultSetup.marginMm).toEqual({ top: 25, right: 19, bottom: 25, left: 19 });
    });

    it("parseHTML pageNumber returns 1 for missing attribute", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      expect(defs.pageNumber.parseHTML!(el)).toBe(1);
    });

    it("parseHTML pageNumber parses valid integer", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      el.setAttribute("data-page-number", "5");
      expect(defs.pageNumber.parseHTML!(el)).toBe(5);
    });

    it("parseHTML pageNumber falls back to 1 for NaN", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      el.setAttribute("data-page-number", "abc");
      expect(defs.pageNumber.parseHTML!(el)).toBe(1);
    });

    it("parseHTML pageSetup returns default for missing attribute", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      expect(defs.pageSetup.parseHTML!(el)).toEqual(defs.pageSetup.default);
    });

    it("parseHTML pageSetup merges parsed JSON over defaults", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      el.setAttribute("data-page-setup", JSON.stringify({ size: "Letter" }));
      const parsed = defs.pageSetup.parseHTML!(el) as PageSetup;
      expect(parsed.size).toBe("Letter");
      expect(parsed.orientation).toBe("portrait");
    });

    it("parseHTML pageSetup returns default for malformed JSON", () => {
      const defs = c.addAttributes();
      const el = document.createElement("div");
      el.setAttribute("data-page-setup", "not-json");
      expect(defs.pageSetup.parseHTML!(el)).toEqual(defs.pageSetup.default);
    });

    it("renderHTML pageNumber emits string attribute", () => {
      const defs = c.addAttributes();
      const result = defs.pageNumber.renderHTML!({ pageNumber: 7 });
      expect(result).toEqual({ "data-page-number": "7" });
    });

    it("renderHTML pageSetup emits JSON string", () => {
      const defs = c.addAttributes();
      const setup: PageSetup = { size: "A4", orientation: "landscape", marginMm: { top: 10, right: 10, bottom: 10, left: 10 } };
      const result = defs.pageSetup.renderHTML!({ pageSetup: setup });
      expect(result).toEqual({ "data-page-setup": JSON.stringify(setup) });
    });

    it("renderHTML pageSetup returns empty object when undefined", () => {
      const defs = c.addAttributes();
      const result = defs.pageSetup.renderHTML!({ pageSetup: undefined });
      expect(result).toEqual({});
    });
  });

  describe("schema round-trip (header/footer bundled)", () => {
    let editor: Editor | null = null;

    afterEach(() => {
      editor?.destroy();
      editor = null;
    });

    it("parses and serializes a page with both header and footer", () => {
      editor = createPageEditor(
        '<div class="page-node"><div data-page-header>Top</div>' +
          "<div data-page-body><p>Body</p></div>" +
          "<div data-page-footer>Bottom</div></div>"
      );
      const html = editor.getHTML();
      expect(html).toContain('data-page-header="true"');
      expect(html).toContain('data-page-body="true"');
      expect(html).toContain('data-page-footer="true"');
      expect(html).toContain("Top");
      expect(html).toContain("Bottom");
      expect(html).toContain("Body");
    });

    it("parses a page with only a header", () => {
      editor = createPageEditor(
        '<div class="page-node"><div data-page-header>Just header</div>' +
          "<div data-page-body><p>Body</p></div></div>"
      );
      const html = editor.getHTML();
      expect(html).toContain('data-page-header="true"');
      expect(html).not.toContain('data-page-footer="true"');
      expect(html).toContain("Just header");
    });

    it("parses a page with only a footer", () => {
      editor = createPageEditor(
        '<div class="page-node"><div data-page-body><p>Body</p></div>' +
          "<div data-page-footer>Just footer</div></div>"
      );
      const html = editor.getHTML();
      expect(html).toContain('data-page-footer="true"');
      expect(html).not.toContain('data-page-header="true"');
      expect(html).toContain("Just footer");
    });

    it("registers pageHeader and pageFooter node types in the schema", () => {
      editor = createPageEditor(
        '<div class="page-node"><div data-page-body><p>Body</p></div></div>'
      );
      expect(editor.schema.nodes.pageHeader).toBeTruthy();
      expect(editor.schema.nodes.pageFooter).toBeTruthy();
    });
  });
});
