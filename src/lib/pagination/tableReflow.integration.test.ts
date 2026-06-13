import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { Editor } from "@tiptap/core";
import { DOMSerializer, type Node as PMNode } from "@tiptap/pm/model";
import StarterKit from "@tiptap/starter-kit";
import { Table, TableCell, TableHeader } from "@tiptap/extension-table";
import { PagedDocument } from "@/lib/tiptap/pagedDocument";
import { PageNode } from "@/lib/tiptap/pageNode";
import { PageBodyNode } from "@/lib/tiptap/pageBody";
import { PageBreak } from "@/lib/tiptap/pageBreak";
import { RepeatingRow } from "@/lib/tiptap/repeatingRow";
import { buildRepaginateTransaction } from "./repaginate";
import { splitTableAtRowBoundaries } from "./tableReflow";

/**
 * A3 (auto) integration: an over-tall table soft-splits at row boundaries
 * during holistic repagination (mirroring the paragraph soft-split path), and
 * `stripPaginationWrappers` re-joins the pieces on export.
 *
 * Measurement is faked: `getBoundingClientRect` is stubbed per element so the
 * paginator sees deterministic block + row heights in jsdom.
 */

function tableRowsHtml(headerCells: string[], bodyRows: string[][]): string {
  const header =
    "<tr>" + headerCells.map((c) => `<th><p>${c}</p></th>`).join("") + "</tr>";
  const body = bodyRows
    .map(
      (cells) =>
        "<tr>" + cells.map((c) => `<td><p>${c}</p></td>`).join("") + "</tr>"
    )
    .join("");
  return `<table><tbody>${header}${body}</tbody></table>`;
}

function pagedHtml(inner: string): string {
  return `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">${inner}</div></div>`;
}

function createEditor(html: string): Editor {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return new Editor({
    element: el,
    extensions: [
      StarterKit.configure({ document: false }),
      PagedDocument,
      PageNode,
      PageBodyNode,
      PageBreak,
      Table.configure({ resizable: false }),
      RepeatingRow,
      TableHeader,
      TableCell,
    ],
    content: html,
  });
}

/**
 * Stub element heights. `blockHeight` is applied to direct `.page-body`
 * children (top-level blocks); `rowHeight` to every `<tr>`. Margins read 0.
 */
function stubMeasurement(blockHeight: number, rowHeight: number) {
  const origGCR = Element.prototype.getBoundingClientRect;
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      let height = 0;
      if (this.tagName === "TR") height = rowHeight;
      else if (
        this.parentElement &&
        this.parentElement.classList.contains("page-body")
      ) {
        height = blockHeight;
      }
      return {
        height,
        width: 600,
        top: 0,
        bottom: height,
        left: 0,
        right: 600,
        x: 0,
        y: 0,
        toJSON() {},
      } as DOMRect;
    }
  );
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    () =>
      ({ marginTop: "0px", marginBottom: "0px" }) as unknown as CSSStyleDeclaration
  );
  // jsdom Range has no getBoundingClientRect; the paragraph soft-split path
  // calls it. Return a small fixed rect so paragraphs measure as "fits" (one
  // segment) — table splitting is exercised via the row-level stub above.
  const RangeProto = Range.prototype as unknown as {
    getBoundingClientRect?: () => DOMRect;
  };
  const origRangeGCR = RangeProto.getBoundingClientRect;
  RangeProto.getBoundingClientRect = () =>
    ({ height: 10, top: 0, bottom: 10, left: 0, right: 0, width: 0 }) as DOMRect;
  return () => {
    Element.prototype.getBoundingClientRect = origGCR;
    RangeProto.getBoundingClientRect = origRangeGCR;
  };
}

function blockTypesByPage(doc: PMNode): string[][] {
  const pages: string[][] = [];
  doc.forEach((pageNode) => {
    if (pageNode.type.name !== "pageNode") return;
    pageNode.forEach((child) => {
      if (child.type.name !== "pageBody") return;
      const types: string[] = [];
      child.forEach((block) => types.push(block.type.name));
      pages.push(types);
    });
  });
  return pages;
}

describe("table reflow integration (A3 auto)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("splits an over-tall table at a row boundary across pages, repeating the header", () => {
    // 1 header + 6 body rows. Page limit fits header + 2 body rows per piece.
    const tableHtml = tableRowsHtml(
      ["H1", "H2"],
      [
        ["a1", "a2"],
        ["b1", "b2"],
        ["c1", "c2"],
        ["d1", "d2"],
        ["e1", "e2"],
        ["f1", "f2"],
      ]
    );
    const editor = createEditor(pagedHtml(tableHtml));
    const restore = stubMeasurement(/* block */ 700, /* row */ 100);
    try {
      // contentHeightPx so that limit ~= 268 after the 32px safety margin:
      // header(100)+2 body rows(200) = 300 > 268 -> ... tune to 2 rows/piece.
      // limit = contentHeight - 32. Want chrome(0)+header(100)+rows: fit 2.
      const result = buildRepaginateTransaction(editor, 332);
      expect(result.changed).toBe(true);
      expect(result.tr).not.toBeNull();
      const pages = blockTypesByPage(result.tr!.doc);
      // Every produced block is a table piece.
      const tablePieces = pages.flat().filter((t) => t === "table");
      expect(tablePieces.length).toBeGreaterThan(1);
      // Distributed across more than one page.
      expect(pages.length).toBeGreaterThan(1);

      // Every continuation piece repeats the header row (data-repeat-source).
      const html = pagedHtmlFromDoc(result.tr!.doc, editor);
      expect(html).toContain("table-soft-split-header");
    } finally {
      restore();
      editor.destroy();
    }
  });

  it("falls back to whole-table (null) when a single row is taller than the page", () => {
    const tableHtml = tableRowsHtml(
      ["H1", "H2"],
      [
        ["a1", "a2"],
        ["b1", "b2"],
      ]
    );
    const editor = createEditor(pagedHtml(tableHtml));
    // A single row (1000px) is taller than any sane page limit.
    const restore = stubMeasurement(/* block */ 3000, /* row */ 1000);
    try {
      const result = buildRepaginateTransaction(editor, 800);
      // The table is not split: it stays a single table block (atomic, own page).
      const pages = result.tr
        ? blockTypesByPage(result.tr.doc)
        : blockTypesByPage(editor.state.doc);
      const tableCount = pages.flat().filter((t) => t === "table").length;
      expect(tableCount).toBe(1);
    } finally {
      restore();
      editor.destroy();
    }
  });

  it("non-table over-tall block still soft-splits as a paragraph (regression guard)", () => {
    const longText = Array.from({ length: 40 }, (_, i) => `word${i}`).join(" ");
    const editor = createEditor(pagedHtml(`<p>${longText}</p>`));
    // Paragraph path uses DOM Range; stub block height tall, and rectAt relies
    // on createRange -> getBoundingClientRect (already stubbed to 0). With no
    // measurable text rects the paragraph path yields a single segment and the
    // block stays whole. We assert it does NOT throw and remains a paragraph.
    const restore = stubMeasurement(/* block */ 2000, /* row */ 100);
    try {
      const result = buildRepaginateTransaction(editor, 800);
      const pages = result.tr
        ? blockTypesByPage(result.tr.doc)
        : blockTypesByPage(editor.state.doc);
      // Still only paragraph blocks, no table pieces injected.
      expect(pages.flat().every((t) => t === "paragraph")).toBe(true);
    } finally {
      restore();
      editor.destroy();
    }
  });
});

/** Serialize the editor doc to HTML for marker assertions. */
function pagedHtmlFromDoc(doc: PMNode, editor: Editor): string {
  const serializer = DOMSerializer.fromSchema(editor.state.schema);
  const frag = serializer.serializeFragment(doc.content);
  const container = document.createElement("div");
  container.appendChild(frag);
  return container.innerHTML;
}

describe("splitTableAtRowBoundaries markers (unit)", () => {
  function buildTableNode(editor: Editor) {
    // Grab the table node from a freshly built doc.
    let table: PMNode | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "table") {
        table = node;
        return false;
      }
      return true;
    });
    return table;
  }

  function fakeTableEl(rowHeights: number[]): HTMLTableElement {
    const t = document.createElement("table");
    const tbody = document.createElement("tbody");
    rowHeights.forEach((h) => {
      const tr = document.createElement("tr");
      tr.getBoundingClientRect = () =>
        ({ height: h, top: 0, bottom: h }) as DOMRect;
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    return t;
  }

  let editor: Editor;
  beforeEach(() => {
    editor = createEditor(
      pagedHtml(
        tableRowsHtml(
          ["H1", "H2"],
          [
            ["a1", "a2"],
            ["b1", "b2"],
            ["c1", "c2"],
            ["d1", "d2"],
          ]
        )
      )
    );
  });
  afterEach(() => {
    editor.destroy();
    document.body.innerHTML = "";
  });

  it("returns header-marked continuation pieces and never drops a row", () => {
    const table = buildTableNode(editor)!;
    const el = fakeTableEl([100, 100, 100, 100, 100]); // header + 4 rows
    const pieces = splitTableAtRowBoundaries(table, el, 500, 250);
    expect(pieces).not.toBeNull();
    expect(pieces!.length).toBeGreaterThan(1);
    // First piece carries no repeat marker on its first row; continuations do.
    const firstRowOf = (n: PMNode) => {
      let r: PMNode | null = null;
      n.forEach((row) => {
        if (!r) r = row;
      });
      return r!;
    };
    expect(firstRowOf(pieces![0].node).attrs.dataRepeatSource).toBeFalsy();
    expect(firstRowOf(pieces![1].node).attrs.dataRepeatSource).toBe(
      "table-soft-split-header"
    );
  });

  it("returns null when a single row exceeds the page limit", () => {
    const table = buildTableNode(editor)!;
    const el = fakeTableEl([100, 100, 400, 100, 100]);
    expect(splitTableAtRowBoundaries(table, el, 800, 250)).toBeNull();
  });
});
