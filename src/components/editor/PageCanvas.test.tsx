import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import { PageCanvas } from "./PageCanvas";

describe("PageCanvas", () => {
  it("forwards ref to the inner div", () => {
    let capturedRef: HTMLDivElement | null = null;

    function TestWrapper() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <PageCanvas
          ref={(el) => {
            ref.current = el;
            capturedRef = el;
          }}
        >
          <span>content</span>
        </PageCanvas>
      );
    }

    render(<TestWrapper />);
    expect(capturedRef).toBeInstanceOf(HTMLDivElement);
    expect(capturedRef).toHaveClass("page-canvas");
  });

  it("applies id and className props", () => {
    render(
      <PageCanvas id="my-canvas" className="custom-class">
        <p>hello</p>
      </PageCanvas>
    );

    const canvas = document.getElementById("my-canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass("custom-class");
    expect(canvas).toHaveClass("page-canvas");
  });

  it("renders children", () => {
    render(
      <PageCanvas>
        <button>Click me</button>
        <span>Text</span>
      </PageCanvas>
    );

    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("has default layout classes even without extra className", () => {
    render(
      <PageCanvas>
        <div>child</div>
      </PageCanvas>
    );

    const canvas = screen.getByText("child").parentElement;
    expect(canvas).toHaveClass("page-canvas");
    expect(canvas).toHaveClass("flex");
    expect(canvas).toHaveClass("flex-col");
    expect(canvas).toHaveClass("items-center");
    expect(canvas).toHaveClass("gap-5");
    expect(canvas).toHaveClass("py-6");
  });
});
