import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { RibbonTabInsert } from "./RibbonTabInsert";

type DescendantsCallback = (
  node: { type: { name: string }; attrs: Record<string, unknown>; nodeSize: number; textContent: string },
  pos: number
) => boolean | void;

function createMockEditor(options: { html?: string; descendants?: (cb: DescendantsCallback) => void } = {}) {
  const insertTable = vi.fn().mockReturnThis();
  const insertContent = vi.fn().mockReturnThis();
  const insertContentAt = vi.fn().mockReturnThis();
  const focus = vi.fn().mockReturnThis();
  const run = vi.fn();
  const chain = vi.fn(() => ({ focus, insertTable, insertContent, insertContentAt, run }));

  const editor = {
    chain,
    isActive: vi.fn(() => false),
    getAttributes: vi.fn(() => ({})),
    getHTML: vi.fn(() => options.html ?? "<p></p>"),
    isDestroyed: false,
    state: {
      tr: { setNodeMarkup: vi.fn() },
      doc: { descendants: vi.fn((cb: DescendantsCallback) => options.descendants?.(cb)) },
    },
    view: { dispatch: vi.fn() },
  } as unknown as Editor;

  return {
    editor,
    chain,
    focus,
    insertTable,
    insertContent,
    insertContentAt,
    run,
  };
}

describe("RibbonTabInsert table picker", () => {
  it("inserts a default table", () => {
    const mock = createMockEditor();
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(screen.getByRole("button", { name: "แทรกตาราง" }));

    expect(mock.chain).toHaveBeenCalled();
    expect(mock.focus).toHaveBeenCalled();
    expect(mock.insertTable).toHaveBeenCalledWith({
      rows: 3,
      cols: 3,
      withHeaderRow: true,
    });
    expect(mock.run).toHaveBeenCalled();
  });

  // NOTE: The insert ribbon uses a single-click default insert (3×3).
  // Custom table sizing is available via the menu bar table actions.
});

describe("RibbonTabInsert table of contents", () => {
  it("inserts a data-toc block with Thai title when no TOC exists", () => {
    const mock = createMockEditor({ html: "<h1>บทนำ</h1><h2>ที่มา</h2>" });
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(
      screen.getByRole("button", { name: "สารบัญ (Table of Contents)" })
    );

    expect(mock.insertContent).toHaveBeenCalledTimes(1);
    const html = mock.insertContent.mock.calls[0][0] as string;
    expect(html).toContain("data-toc");
    expect(html).toContain("สารบัญ");
    expect(html).toContain('href="#บทนำ"');
    expect(html).toContain('href="#ที่มา"');
    expect(mock.insertContentAt).not.toHaveBeenCalled();
    expect(mock.run).toHaveBeenCalled();
  });

  it("refreshes the existing TOC list in place (อัปเดตสารบัญ)", () => {
    const mock = createMockEditor({
      html: '<ul class="toc"><li><a href="#เก่า">เก่า</a></li></ul><h1>บทนำ</h1>',
      descendants: (cb) => {
        cb(
          { type: { name: "bulletList" }, attrs: { class: "toc" }, nodeSize: 12, textContent: "เก่า" },
          3
        );
      },
    });
    render(<RibbonTabInsert editor={mock.editor} />);

    fireEvent.click(
      screen.getByRole("button", { name: "สารบัญ (Table of Contents)" })
    );

    expect(mock.insertContentAt).toHaveBeenCalledTimes(1);
    const [range, html] = mock.insertContentAt.mock.calls[0] as [
      { from: number; to: number },
      string,
    ];
    expect(range).toEqual({ from: 3, to: 15 });
    expect(html).toContain('href="#บทนำ"');
    expect(html).not.toContain("#เก่า");
    expect(mock.insertContent).not.toHaveBeenCalled();
  });
});

