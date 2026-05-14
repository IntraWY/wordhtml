import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Ruler } from "./Ruler";
import { PX_PER_CM } from "@/lib/page";

const A4_HEIGHT_MM = 297;
const A4_HEIGHT_PX = (A4_HEIGHT_MM / 10) * PX_PER_CM;

function cmToPx(cm: number) {
  return cm * PX_PER_CM;
}

describe("Ruler", () => {
  describe("horizontal", () => {
    it("renders horizontal ruler with ticks and margin guides", () => {
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
        />
      );

      const ruler = container.querySelector(".ruler-h");
      expect(ruler).not.toBeNull();

      // Ticks should be present (major + minor)
      const ticks = container.querySelectorAll(".ruler-tick");
      expect(ticks.length).toBeGreaterThan(0);

      // Margin guides: exactly 2 for horizontal
      const guides = container.querySelectorAll<HTMLElement>(
        ".absolute[style*='oklch']"
      );
      expect(guides.length).toBe(2);
    });

    it("renders margin handles with correct ARIA attributes", () => {
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginLeftMm={25.4}
          marginRightMm={25.4}
          onMarginChange={vi.fn()}
        />
      );

      const sliders = screen.getAllByRole("slider");
      expect(sliders.length).toBeGreaterThanOrEqual(2);

      const leftSlider = sliders.find((s) =>
        s.getAttribute("aria-label")?.includes("Left margin")
      );
      expect(leftSlider).toBeDefined();
      expect(leftSlider!).toHaveAttribute("aria-orientation", "horizontal");
      expect(leftSlider!).toHaveAttribute("aria-valuemin", "0");
      expect(leftSlider!).toHaveAttribute("aria-valuenow", "25");
      expect(leftSlider!).toHaveAttribute("aria-valuemax");

      const rightSlider = sliders.find((s) =>
        s.getAttribute("aria-label")?.includes("Right margin")
      );
      expect(rightSlider).toBeDefined();
      expect(rightSlider!).toHaveAttribute("aria-orientation", "horizontal");
    });

    it("renders indent handles on interactive horizontal ruler", () => {
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          indentLeft={1}
          indentFirst={0.5}
          onIndentChange={vi.fn()}
        />
      );

      const leftIndent = screen.getByRole("slider", {
        name: /Left indent/i,
      });
      const firstLine = screen.getByRole("slider", {
        name: /First-line indent/i,
      });

      expect(leftIndent).not.toBeNull();
      expect(firstLine).not.toBeNull();
    });

    it("keyboard arrow keys on margin handle call onMarginChange with correct values", () => {
      const onMarginChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginLeftMm={25}
          marginRightMm={25}
          onMarginChange={onMarginChange}
        />
      );

      const leftSlider = screen.getByRole("slider", {
        name: /Left margin/i,
      });

      fireEvent.keyDown(leftSlider, { key: "ArrowRight" });
      expect(onMarginChange).toHaveBeenCalledWith(26, 25);

      onMarginChange.mockClear();
      fireEvent.keyDown(leftSlider, { key: "ArrowLeft" });
      expect(onMarginChange).toHaveBeenCalledWith(24, 25);
    });

    it("keyboard arrow keys on indent handle call onIndentChange with correct values", () => {
      const onIndentChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          indentLeft={1}
          indentFirst={0.5}
          onIndentChange={onIndentChange}
        />
      );

      const leftIndent = screen.getByRole("slider", {
        name: /Left indent/i,
      });

      fireEvent.keyDown(leftIndent, { key: "ArrowRight" });
      expect(onIndentChange).toHaveBeenCalledWith(1.1, 0.5);

      onIndentChange.mockClear();
      fireEvent.keyDown(leftIndent, { key: "ArrowLeft" });
      expect(onIndentChange).toHaveBeenCalledWith(0.9, 0.5);
    });
  });

  describe("vertical", () => {
    it("renders vertical ruler with ticks and margin guides", () => {
      const { container } = render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
        />
      );

      const ruler = container.querySelector(".ruler-v");
      expect(ruler).not.toBeNull();

      const ticks = container.querySelectorAll(".ruler-tick");
      expect(ticks.length).toBeGreaterThan(0);

      // Vertical margin guides: start guide + at least one end guide
      const guides = container.querySelectorAll<HTMLElement>(
        ".absolute[style*='oklch']"
      );
      expect(guides.length).toBeGreaterThanOrEqual(2);
    });

    it("renders margin handles with correct ARIA attributes", () => {
      render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginTopMm={25.4}
          marginBottomMm={25.4}
          onMarginChange={vi.fn()}
        />
      );

      const sliders = screen.getAllByRole("slider");
      expect(sliders.length).toBeGreaterThanOrEqual(2);

      const topSlider = sliders.find((s) =>
        s.getAttribute("aria-label")?.includes("Top margin")
      );
      expect(topSlider).toBeDefined();
      expect(topSlider!).toHaveAttribute("aria-orientation", "vertical");
      expect(topSlider!).toHaveAttribute("aria-valuemin", "0");
      expect(topSlider!).toHaveAttribute("aria-valuenow", "25");
      expect(topSlider!).toHaveAttribute("aria-valuemax");

      const bottomSlider = sliders.find((s) =>
        s.getAttribute("aria-label")?.includes("Bottom margin")
      );
      expect(bottomSlider).toBeDefined();
      expect(bottomSlider!).toHaveAttribute("aria-orientation", "vertical");
    });

    it("multi-page vertical ruler renders multiple bottom margin guides", () => {
      const contentHeight = A4_HEIGHT_PX * 3; // 3 pages
      const { container } = render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginTopMm={25.4}
          marginBottomMm={25.4}
          contentHeight={contentHeight}
          onMarginChange={vi.fn()}
        />
      );

      // Each page gets a bottom margin guide, so 3 pages = 3 bottom guides
      // plus 1 top guide = 4 total
      const guides = container.querySelectorAll<HTMLElement>(
        ".absolute[style*='oklch']"
      );
      expect(guides.length).toBe(4);
    });

    it("keyboard arrow keys on vertical margin handle call onMarginChange with correct values", () => {
      const onMarginChange = vi.fn();
      render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginTopMm={25}
          marginBottomMm={25}
          onMarginChange={onMarginChange}
        />
      );

      const topSlider = screen.getByRole("slider", {
        name: /Top margin/i,
      });

      fireEvent.keyDown(topSlider, { key: "ArrowDown" });
      expect(onMarginChange).toHaveBeenCalledWith(26, 25);

      onMarginChange.mockClear();
      fireEvent.keyDown(topSlider, { key: "ArrowUp" });
      expect(onMarginChange).toHaveBeenCalledWith(24, 25);
    });
  });
});
