import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useRulerDrag,
  makeTooltipText,
  snapTabStop,
  TAB_STOP_REMOVE_THRESHOLD_PX,
} from "./useRulerDrag";
import { PX_PER_CM } from "@/lib/page";

const baseOptions = {
  maxIndentCm: 16,
  pageWidthMm: 210,
  pageHeightMm: 297,
  minContentMm: 20,
  indentLeft: 0,
  indentFirst: 0,
  marginLeftMm: 25,
  marginRightMm: 25,
  marginTopMm: 25,
  marginBottomMm: 25,
};

// jsdom doesn't run rAF on its own; emulate it synchronously.
function withRaf<T>(fn: () => T): T {
  const orig = global.requestAnimationFrame;
  global.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  }) as typeof requestAnimationFrame;
  try {
    return fn();
  } finally {
    global.requestAnimationFrame = orig;
  }
}

describe("useRulerDrag — tab stops", () => {
  it("snapTabStop snaps to the 0.25cm grid", () => {
    expect(snapTabStop(1.6)).toBe(1.5);
    expect(snapTabStop(1.62)).toBe(1.5);
    expect(snapTabStop(1.13)).toBeCloseTo(1.25, 5);
    expect(snapTabStop(0.3)).toBe(0.25);
  });

  it("makeTooltipText formats tab stops in Thai with 2 decimals", () => {
    expect(makeTooltipText("tabStop", 4)).toBe("แท็บ (Tab stop): 4.00 ซม.");
    expect(makeTooltipText("tabStop", 8.25)).toBe("แท็บ (Tab stop): 8.25 ซม.");
  });

  it("dragging a tab marker horizontally updates that stop (snapped)", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2, 5],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 0)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Move +1cm worth of px to the right → stop 2 → 3
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100 + PX_PER_CM,
            clientY: 50,
          })
        );
      });
    });

    expect(onTabStopsChange).toHaveBeenCalled();
    const midCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    // Mid-drag the dragged stop (now 3) is carried by identity (un-normalized):
    // the untouched neighbor 5 survives and the dragged value 3 is present.
    expect(midCall).toContain(3);
    expect(midCall).toContain(5);
    expect(midCall.length).toBe(2);

    // On release the list is normalized (sorted/deduped) exactly once.
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
    const finalCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(finalCall).toEqual([3, 5]);
  });

  it("dragging a tab marker off the ruler vertically removes it", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2, 5],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 1)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100,
            clientY: 50 + TAB_STOP_REMOVE_THRESHOLD_PX + 10,
          })
        );
      });
    });

    const lastCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    // stop at index 1 (the "5") removed
    expect(lastCall).toEqual([2]);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("a small vertical wiggle does NOT remove the stop", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [3],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 0)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100,
            clientY: 50 + 5, // under threshold
          })
        );
      });
    });

    const lastCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    // still one stop (unchanged position since dx=0)
    expect(lastCall).toEqual([3]);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("dragging clamps to the minimum tab stop", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [1],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 0)({
          preventDefault: () => {},
          clientX: 200,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Drag far to the left (would go negative)
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 0, clientY: 50 })
        );
      });
    });

    const lastCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(lastCall[0]).toBeGreaterThanOrEqual(0.25);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("dragging a stop ACROSS a neighbor does not delete it (both survive, normalized on release)", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2, 5],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        // Grab the LEFT stop (value 2, index 0).
        result.current.startDrag("tabStop", 0)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Drag it +4cm to the right → 6, crossing past the neighbor at 5.
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100 + 4 * PX_PER_CM,
            clientY: 50,
          })
        );
      });
    });

    // Mid-drag: the dragged stop is carried by identity, so the neighbor (5)
    // still exists AND the dragged value (6) is present — nothing collapsed.
    const midCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(midCall).toContain(5);
    expect(midCall).toContain(6);
    expect(midCall.length).toBe(2);

    // Release → normalized (sorted, deduped) exactly once.
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
    const finalCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(finalCall).toEqual([5, 6]);
  });

  it("off-ruler remove only COMMITS on release", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2, 5],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 1)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Drag off the ruler — live preview shows it gone but it is NOT yet final.
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100,
            clientY: 50 + TAB_STOP_REMOVE_THRESHOLD_PX + 10,
          })
        );
      });
    });

    // The commit happens on mouseup.
    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
    const finalCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(finalCall).toEqual([2]);
  });

  it("off-ruler remove is REVERSIBLE if dragged back onto the ruler before release", () => {
    const onTabStopsChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2, 5],
        onTabStopsChange,
      })
    );

    withRaf(() => {
      act(() => {
        // Grab the stop at 5 (index 1).
        result.current.startDrag("tabStop", 1)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // 1) Waver off the ruler (would remove if released here)…
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100,
            clientY: 50 + TAB_STOP_REMOVE_THRESHOLD_PX + 10,
          })
        );
      });
      // 2) …then come back ON the ruler, nudged +1cm to the right.
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", {
            clientX: 100 + PX_PER_CM,
            clientY: 50,
          })
        );
      });
    });

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });

    // Released back on the ruler → the stop survives at its new position (6),
    // the other stop (2) is untouched. Nothing was permanently removed.
    const finalCall =
      onTabStopsChange.mock.calls[onTabStopsChange.mock.calls.length - 1][0];
    expect(finalCall).toEqual([2, 6]);
  });

  it("makeTooltipText formats the right indent in Thai", () => {
    expect(makeTooltipText("right", 2)).toBe("ย่อหน้าขวา (Right indent): 2.0 ซม.");
  });

  it("does not start tab drag math when onTabStopsChange is absent", () => {
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        tabStops: [2],
      })
    );
    // No throw, dragRef stays null (no global listeners attached)
    withRaf(() => {
      act(() => {
        result.current.startDrag("tabStop", 0)({
          preventDefault: () => {},
          clientX: 100,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 150, clientY: 50 })
        );
      });
    });
    // Nothing to assert beyond "no crash" — dragRef may be set but no callback fires.
    expect(result.current.tooltip).toBeNull();
  });
});

describe("useRulerDrag — right indent", () => {
  it("dragging the right marker LEFT increases the right indent (snapped 0.5cm)", () => {
    const onIndentRightChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        indentRight: 0,
        onIndentRightChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("right")({
          preventDefault: () => {},
          clientX: 300,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Drag 1cm to the LEFT → +1cm right indent.
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 300 - PX_PER_CM, clientY: 50 })
        );
      });
    });

    const last =
      onIndentRightChange.mock.calls[onIndentRightChange.mock.calls.length - 1][0];
    expect(last).toBe(1);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("right indent clamps so it cannot cross the left indent (keeps ≥1cm content)", () => {
    const onIndentRightChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        maxIndentCm: 16,
        indentLeft: 14, // only 16 - 14 - 1 = 1cm of right-indent headroom
        indentRight: 0,
        onIndentRightChange,
      })
    );

    withRaf(() => {
      act(() => {
        result.current.startDrag("right")({
          preventDefault: () => {},
          clientX: 300,
          clientY: 50,
        } as unknown as React.MouseEvent);
      });
      // Yank far left — would be ~8cm but must clamp to the 1cm headroom.
      act(() => {
        document.dispatchEvent(
          new MouseEvent("mousemove", { clientX: 0, clientY: 50 })
        );
      });
    });

    const last =
      onIndentRightChange.mock.calls[onIndentRightChange.mock.calls.length - 1][0];
    expect(last).toBe(1);

    act(() => {
      document.dispatchEvent(new MouseEvent("mouseup"));
    });
  });

  it("ArrowLeft on the right marker nudges the indent inward by 0.25cm", () => {
    const onIndentRightChange = vi.fn();
    const { result } = renderHook(() =>
      useRulerDrag({
        ...baseOptions,
        indentRight: 0,
        onIndentRightChange,
      })
    );

    act(() => {
      result.current.handleKeyDown("right")({
        key: "ArrowLeft",
        preventDefault: () => {},
        shiftKey: false,
      } as unknown as React.KeyboardEvent);
    });

    expect(onIndentRightChange).toHaveBeenCalledWith(0.25);
  });
});
