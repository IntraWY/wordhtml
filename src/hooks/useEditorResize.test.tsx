import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useEditorResize } from "./useEditorResize";
import type { ReactNode } from "react";

describe("useEditorResize", () => {
  let observeSpy: ReturnType<typeof vi.fn>;
  let disconnectSpy: ReturnType<typeof vi.fn>;
  let callbackRef: ResizeObserverCallback | null = null;

  class MockResizeObserver implements ResizeObserver {
    observe = (...args: Parameters<ResizeObserver["observe"]>) => {
      observeSpy(...args);
    };
    unobserve = vi.fn();
    disconnect = () => {
      disconnectSpy();
    };

    constructor(callback: ResizeObserverCallback) {
      callbackRef = callback;
    }
  }

  beforeEach(() => {
    observeSpy = vi.fn();
    disconnectSpy = vi.fn();
    global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    callbackRef = null;
    vi.restoreAllMocks();
  });

  it("returns initial contentHeight of 0", () => {
    const { result } = renderHook(() => useEditorResize());
    expect(result.current.contentHeight).toBe(0);
    expect(result.current.articleRef.current).toBeNull();
  });

  it("calls ResizeObserver.observe on the ref element", () => {
    function Wrapper({ children }: { children?: ReactNode }) {
      const { articleRef } = useEditorResize();
      return (
        <article ref={articleRef as any} data-testid="article">
          {children}
        </article>
      );
    }

    render(<Wrapper />);

    const article = screen.getByTestId("article");
    expect(observeSpy).toHaveBeenCalledTimes(1);
    expect(observeSpy).toHaveBeenCalledWith(article);
  });

  it("updates contentHeight when ResizeObserver fires with borderBoxSize", () => {
    function Wrapper({ children }: { children?: ReactNode }) {
      const { articleRef, contentHeight } = useEditorResize();
      return (
        <article ref={articleRef as any} data-testid="article" data-height={contentHeight}>
          {children}
        </article>
      );
    }

    render(<Wrapper />);

    const article = screen.getByTestId("article");
    expect(callbackRef).not.toBeNull();

    act(() => {
      callbackRef!(
        [
          {
            target: article,
            borderBoxSize: [{ blockSize: 1234, inlineSize: 800 }] as unknown as ResizeObserverEntry["borderBoxSize"],
            contentBoxSize: [] as unknown as ResizeObserverEntry["contentBoxSize"],
            contentRect: {} as DOMRectReadOnly,
          },
        ],
        {} as ResizeObserver
      );
    });

    expect(article.getAttribute("data-height")).toBe("1234");
  });

  it("falls back to clientHeight when borderBoxSize is absent", () => {
    function Wrapper({ children }: { children?: ReactNode }) {
      const { articleRef, contentHeight } = useEditorResize();
      return (
        <article ref={articleRef as any} data-testid="article" data-height={contentHeight}>
          {children}
        </article>
      );
    }

    render(<Wrapper />);

    const article = screen.getByTestId("article");
    Object.defineProperty(article, "clientHeight", { value: 567, configurable: true });

    act(() => {
      callbackRef!(
        [
          {
            target: article,
            borderBoxSize: undefined as unknown as ResizeObserverEntry["borderBoxSize"],
            contentBoxSize: [] as unknown as ResizeObserverEntry["contentBoxSize"],
            contentRect: {} as DOMRectReadOnly,
          },
        ],
        {} as ResizeObserver
      );
    });

    expect(article.getAttribute("data-height")).toBe("567");
  });

  it("disconnects ResizeObserver on unmount", () => {
    function Wrapper({ children }: { children?: ReactNode }) {
      const { articleRef } = useEditorResize();
      return (
        <article ref={articleRef as any} data-testid="article">
          {children}
        </article>
      );
    }

    const { unmount } = render(<Wrapper />);

    expect(disconnectSpy).not.toHaveBeenCalled();
    unmount();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});

// Helper since @testing-library/react's renderHook isn't available in this version
function renderHook<T>(callback: () => T) {
  let result = { current: null as T | null };

  function Wrapper() {
    result.current = callback();
    return null;
  }

  const { unmount, rerender } = render(<Wrapper />);

  return {
    get result() {
      return result as { current: T };
    },
    rerender,
    unmount,
  };
}
