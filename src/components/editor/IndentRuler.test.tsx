import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { IndentRuler } from "./IndentRuler";

type MockNode = {
  type: { name: string };
  attrs: Record<string, unknown>;
  childCount?: number;
  child?: (i: number) => MockNode;
};

type MockSelection =
  | {
      kind: "text";
      depth: number;
      nodeAtDepth: (d: number) => MockNode | null;
    }
  | {
      kind: "node";
      nodeName: string;
      parent: MockNode;
      index: number;
    };

function createMockEditor(selection: MockSelection) {
  const listeners: Record<string, Set<() => void>> = {
    selectionUpdate: new Set(),
    transaction: new Set(),
  };

  const editor = {
    state: {
      selection:
        selection.kind === "text"
          ? {
              $from: {
                get depth() {
                  return selection.depth;
                },
                node: (d: number) => selection.nodeAtDepth(d),
              },
            }
          : {
              node: {
                type: { name: selection.nodeName },
              },
              from: 10,
            },
      doc: {
        resolve: () => ({
          parent: selection.kind === "node" ? selection.parent : { childCount: 0 },
          index: () => (selection.kind === "node" ? selection.index : 0),
        }),
      },
    },
    commands: {
      setIndent: vi.fn(),
    },
    on: vi.fn((event: string, fn: () => void) => {
      listeners[event]?.add(fn);
    }),
    off: vi.fn((event: string, fn: () => void) => {
      listeners[event]?.delete(fn);
    }),
    getAttributes: vi.fn(),
  };

  if (selection.kind === "node") {
    (editor.state.selection as { __nodeSel?: boolean }).__nodeSel = true;
  }

  return { editor, listeners };
}

// Spread the real module so PluginKey/Plugin (pulled in transitively via
// Ruler → paragraphFormat → tabStopPlugin) stay real; only NodeSelection is
// overridden with a tagging-based instanceof for the test's fake selections.
vi.mock("@tiptap/pm/state", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/pm/state")>();
  return {
    ...actual,
    NodeSelection: class NodeSelection {
      static [Symbol.hasInstance](obj: unknown) {
        return Boolean(
          obj &&
            typeof obj === "object" &&
            (obj as { __nodeSel?: boolean }).__nodeSel
        );
      }
    },
  };
});

vi.mock("@/lib/editorLive", () => ({
  isLiveEditor: (ed: unknown) => Boolean(ed),
}));

describe("IndentRuler", () => {
  const baseProps = {
    cm: 21,
    marginStart: 72,
    marginEnd: 72,
    marginLeftMm: 19,
    marginRightMm: 19,
    onMarginChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs indent handles on mount from paragraph attrs", () => {
    const indent = { marginLeft: 1.5, textIndent: 0.5 };
    const { editor } = createMockEditor({
      kind: "text",
      depth: 2,
      nodeAtDepth: (d) => {
        if (d === 2) {
          return {
            type: { name: "paragraph" },
            attrs: {
              marginLeft: indent.marginLeft,
              textIndent: indent.textIndent,
            },
          };
        }
        return { type: { name: "doc" }, attrs: {} };
      },
    });

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    const leftSlider = screen.getByLabelText(/Left indent/i);
    expect(leftSlider).toHaveAttribute("aria-valuenow", "15");
  });

  it("updates indent handles on transaction", async () => {
    const paragraphAttrs = { marginLeft: 0, textIndent: 0 };
    const { editor, listeners } = createMockEditor({
      kind: "text",
      depth: 2,
      nodeAtDepth: (d) => {
        if (d === 2) {
          return {
            type: { name: "paragraph" },
            attrs: paragraphAttrs,
          };
        }
        return { type: { name: "doc" }, attrs: {} };
      },
    });

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    const leftSlider = screen.getByLabelText(/Left indent/i);
    expect(leftSlider).toHaveAttribute("aria-valuenow", "0");

    paragraphAttrs.marginLeft = 2;
    await act(async () => {
      listeners.transaction.forEach((fn) => fn());
    });

    await waitFor(() => {
      expect(leftSlider).toHaveAttribute("aria-valuenow", "20");
    });
  });

  it("reads indent from listItem via first paragraph child", () => {
    const listParagraph = { marginLeft: 1.2, textIndent: 0.3 };
    const listItem: MockNode = {
      type: { name: "listItem" },
      attrs: {},
      childCount: 1,
      child: () => ({
        type: { name: "paragraph" },
        attrs: {
          marginLeft: listParagraph.marginLeft,
          textIndent: listParagraph.textIndent,
        },
      }),
    };

    const { editor } = createMockEditor({
      kind: "text",
      depth: 3,
      nodeAtDepth: (d) => {
        if (d === 3) return listItem;
        if (d === 2) return { type: { name: "bulletList" }, attrs: {} };
        return { type: { name: "doc" }, attrs: {} };
      },
    });

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    const leftSlider = screen.getByLabelText(/Left indent/i);
    expect(leftSlider).toHaveAttribute("aria-valuenow", "12");
  });

  it("reads indent from nearest paragraph when image is NodeSelection", () => {
    const paragraphBefore = {
      type: { name: "paragraph" },
      attrs: { marginLeft: 0.8, textIndent: 0 },
    };
    const parent: MockNode = {
      type: { name: "pageBody" },
      attrs: {},
      childCount: 2,
      child: (i) => (i === 0 ? paragraphBefore : { type: { name: "image" }, attrs: {} }),
    };

    const { editor } = createMockEditor({
      kind: "node",
      nodeName: "image",
      parent,
      index: 1,
    });

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    const leftSlider = screen.getByLabelText(/Left indent/i);
    expect(leftSlider).toHaveAttribute("aria-valuenow", "8");
  });

  it("hides indent handles when no paragraph in selection chain", () => {
    const { editor } = createMockEditor({
      kind: "text",
      depth: 1,
      nodeAtDepth: () => ({ type: { name: "doc" }, attrs: {} }),
    });

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    expect(screen.queryByLabelText(/Left indent/i)).toBeNull();
    expect(screen.queryByLabelText(/First line/i)).toBeNull();
  });
});
