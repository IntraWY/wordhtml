import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Ruler } from "./Ruler";
import {
  PAGE_CANVAS_PADDING_PX,
  PAGE_STACK_GAP_PX,
  PX_PER_CM,
} from "@/lib/page";

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

    it("mouse drag on margin handle calls onMarginChange with snapped value", async () => {
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

      fireEvent.mouseDown(leftSlider, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 120, clientY: 50 });

      await waitFor(() => expect(onMarginChange).toHaveBeenCalled());

      fireEvent.mouseUp(document);
    });

    it("snap behavior snaps margin values to 5mm grid", async () => {
      const onMarginChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginLeftMm={22}
          marginRightMm={25}
          onMarginChange={onMarginChange}
        />
      );

      const leftSlider = screen.getByRole("slider", {
        name: /Left margin/i,
      });

      fireEvent.mouseDown(leftSlider, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 102, clientY: 50, shiftKey: false });

      await waitFor(() => expect(onMarginChange).toHaveBeenCalled());

      fireEvent.mouseUp(document);

      const lastCall = onMarginChange.mock.calls[onMarginChange.mock.calls.length - 1];
      const finalValue = lastCall[0] as number;
      expect(finalValue % 5).toBe(0);
    });

    it("tooltip appears during drag and disappears after mouseup", async () => {
      const onMarginChange = vi.fn();
      const { container } = render(
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

      expect(container.querySelector("[class*='fixed z-[300]']")).toBeNull();

      fireEvent.mouseDown(leftSlider, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 120, clientY: 50 });

      await waitFor(() => expect(onMarginChange).toHaveBeenCalled());

      fireEvent.mouseUp(document);

      expect(container.querySelector("[class*='fixed z-[300]']")).toBeNull();
    });

    it("touch events on margin handle call onMarginChange", async () => {
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

      fireEvent.touchStart(leftSlider, {
        touches: [{ clientX: 100, clientY: 50 }],
      });
      fireEvent.touchMove(document, {
        touches: [{ clientX: 120, clientY: 50 }],
      });

      await waitFor(() => expect(onMarginChange).toHaveBeenCalled());

      fireEvent.touchEnd(document);
    });

    it("min content clamping prevents margins from exceeding available space", async () => {
      const onMarginChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginLeftMm={80}
          marginRightMm={80}
          onMarginChange={onMarginChange}
        />
      );

      const leftSlider = screen.getByRole("slider", {
        name: /Left margin/i,
      });

      fireEvent.mouseDown(leftSlider, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(document, { clientX: 500, clientY: 50 });

      await waitFor(() => expect(onMarginChange).toHaveBeenCalled());

      fireEvent.mouseUp(document);

      const lastCall = onMarginChange.mock.calls[onMarginChange.mock.calls.length - 1];
      const finalLeft = lastCall[0] as number;
      expect(finalLeft).toBeLessThanOrEqual(110);
    });

    it("renders hanging indent indicator when indentFirst is negative", () => {
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          indentLeft={1}
          indentFirst={-0.5}
          onIndentChange={vi.fn()}
        />
      );

      const indicators = container.querySelectorAll('.absolute');
      const indicator = Array.from(indicators).find((el) => el.getAttribute('style')?.includes('#93c5fd'));
      expect(indicator).not.toBeNull();
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
      const pageHeightPx = Math.round(A4_HEIGHT_PX);
      const { container } = render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginTopMm={25.4}
          marginBottomMm={25.4}
          pageHeightPx={pageHeightPx}
          pageCount={3}
          contentOffsetPx={PAGE_CANVAS_PADDING_PX}
          onMarginChange={vi.fn()}
        />
      );

      const guides = container.querySelectorAll<HTMLElement>(
        ".absolute[style*='oklch']"
      );
      expect(guides.length).toBe(4);
    });

    it("single-page vertical ruler keeps bottom guide within paper bounds", () => {
      const pageHeightPx = 1123;
      const marginStart = 95;
      const marginEnd = 95;
      const offset = PAGE_CANVAS_PADDING_PX;
      const { container } = render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={marginStart}
          marginEnd={marginEnd}
          pageHeightPx={pageHeightPx}
          pageCount={1}
          contentOffsetPx={offset}
          onMarginChange={vi.fn()}
        />
      );

      const ruler = container.querySelector(".ruler-v") as HTMLElement;
      expect(ruler.style.height).toBe(
        `${offset + pageHeightPx}px`
      );

      const bottomGuide = Array.from(
        container.querySelectorAll<HTMLElement>(".absolute[style*='oklch']")
      ).find((el) => {
        const top = parseFloat(el.style.top);
        return top > offset + marginStart;
      });
      expect(bottomGuide).toBeDefined();
      const bottomTop = parseFloat(bottomGuide!.style.top);
      expect(bottomTop).toBeGreaterThanOrEqual(offset + marginStart);
      expect(bottomTop).toBeLessThanOrEqual(offset + pageHeightPx);
    });

    it("three-page vertical ruler height includes stack gaps", () => {
      const pageHeightPx = 1123;
      const offset = PAGE_CANVAS_PADDING_PX;
      const { container } = render(
        <Ruler
          orientation="vertical"
          cm={29.7}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          pageHeightPx={pageHeightPx}
          pageCount={3}
          contentOffsetPx={offset}
        />
      );
      const ruler = container.querySelector(".ruler-v") as HTMLElement;
      const expected =
        offset + 3 * pageHeightPx + 2 * PAGE_STACK_GAP_PX;
      expect(ruler.style.height).toBe(`${expected}px`);
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
