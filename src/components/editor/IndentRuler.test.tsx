import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { IndentRuler } from "./IndentRuler";

function createMockEditor(
  indentRef: { marginLeft: number; textIndent: number } | null
) {
  const listeners: Record<string, Set<() => void>> = {
    selectionUpdate: new Set(),
    transaction: new Set(),
  };

  const editor = {
    state: {
      selection: {
        $from: {
          get depth() {
            return indentRef ? 2 : 1;
          },
          node: (d: number) => {
            if (d === 2 && indentRef) {
              return {
                type: { name: "paragraph" },
                attrs: {
                  marginLeft: indentRef.marginLeft,
                  textIndent: indentRef.textIndent,
                },
              };
            }
            return { type: { name: "doc" }, attrs: {} };
          },
        },
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

  return { editor, listeners };
}

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
    const { editor } = createMockEditor(indent);

    render(
      <IndentRuler
        editor={editor as never}
        {...baseProps}
      />
    );

    const leftSlider = screen.getByLabelText(/Left indent/i);
    expect(leftSlider).toHaveAttribute("aria-valuenow", "15");
  });

  it("updates indent handles on transaction", async () => {
    const paragraphAttrs = { marginLeft: 0, textIndent: 0 };
    const { editor, listeners } = createMockEditor(paragraphAttrs);

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

  it("hides indent handles when no paragraph in selection chain", () => {
    const { editor } = createMockEditor(null as { marginLeft: number; textIndent: number } | null);

    render(<IndentRuler editor={editor as never} {...baseProps} />);

    expect(screen.queryByLabelText(/Left indent/i)).toBeNull();
    expect(screen.queryByLabelText(/First line/i)).toBeNull();
  });
});
