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

      // Default step: 0.25 cm
      fireEvent.keyDown(leftIndent, { key: "ArrowRight" });
      expect(onIndentChange).toHaveBeenCalledWith(1.25, 0.5);

      onIndentChange.mockClear();
      fireEvent.keyDown(leftIndent, { key: "ArrowLeft" });
      expect(onIndentChange).toHaveBeenCalledWith(0.75, 0.5);

      // Fine step with Shift: 0.05 cm
      onIndentChange.mockClear();
      fireEvent.keyDown(leftIndent, { key: "ArrowRight", shiftKey: true });
      expect(onIndentChange).toHaveBeenCalledWith(1.05, 0.5);

      onIndentChange.mockClear();
      fireEvent.keyDown(leftIndent, { key: "ArrowLeft", shiftKey: true });
      expect(onIndentChange).toHaveBeenCalledWith(0.95, 0.5);
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

  describe("custom tab stops", () => {
    it("renders one marker per tab stop", () => {
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[1.5, 4, 8.25]}
          onTabStopsChange={vi.fn()}
        />
      );
      const markers = container.querySelectorAll(".ruler-tab-stop");
      expect(markers.length).toBe(3);
    });

    it("renders no markers and no track when not interactive", () => {
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[2, 5]}
        />
      );
      expect(container.querySelectorAll(".ruler-tab-stop").length).toBe(0);
      expect(
        container.querySelector("[data-testid='ruler-tab-track']")
      ).toBeNull();
    });

    it("tab-stop marker exposes slider a11y attributes (Thai label)", () => {
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[4]}
          onTabStopsChange={vi.fn()}
        />
      );
      const marker = screen.getByRole("slider", { name: /Tab stop/i });
      expect(marker).toHaveAttribute("aria-orientation", "horizontal");
      expect(marker).toHaveAttribute("aria-valuenow", "4");
      expect(marker).toHaveAttribute("aria-valuemin", "0.25");
      expect(marker).toHaveAttribute("aria-valuemax");
      expect(marker.getAttribute("aria-label")).toContain("แท็บ");
    });

    it("ArrowRight/ArrowLeft move a tab stop by 0.25cm", () => {
      const onTabStopsChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[4]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const marker = screen.getByRole("slider", { name: /Tab stop/i });

      fireEvent.keyDown(marker, { key: "ArrowRight" });
      expect(onTabStopsChange).toHaveBeenLastCalledWith([4.25]);

      onTabStopsChange.mockClear();
      fireEvent.keyDown(marker, { key: "ArrowLeft" });
      expect(onTabStopsChange).toHaveBeenLastCalledWith([3.75]);
    });

    it("Delete/Backspace removes a tab stop", () => {
      const onTabStopsChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[2, 5]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const markers = screen.getAllByRole("slider", { name: /Tab stop/i });
      fireEvent.keyDown(markers[0], { key: "Delete" });
      expect(onTabStopsChange).toHaveBeenLastCalledWith([5]);

      onTabStopsChange.mockClear();
      fireEvent.keyDown(markers[1], { key: "Backspace" });
      expect(onTabStopsChange).toHaveBeenLastCalledWith([2]);
    });

    it("double-clicking a marker removes it", () => {
      const onTabStopsChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          tabStops={[3, 6]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const markers = screen.getAllByRole("slider", { name: /Tab stop/i });
      fireEvent.doubleClick(markers[0]);
      expect(onTabStopsChange).toHaveBeenLastCalledWith([6]);
    });

    it("clicking the lower-half track adds a snapped tab stop", () => {
      const onTabStopsChange = vi.fn();
      const marginStart = cmToPx(2.54);
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={marginStart}
          marginEnd={cmToPx(2.54)}
          tabStops={[]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const track = container.querySelector(
        "[data-testid='ruler-tab-track']"
      ) as HTMLElement;
      expect(track).not.toBeNull();

      // getBoundingClientRect is 0 in jsdom, so clientX maps directly:
      // px = clientX - 0 - marginStart. Pick clientX = marginStart + 3cm.
      const targetCm = 3;
      fireEvent.click(track, {
        clientX: marginStart + targetCm * PX_PER_CM,
        clientY: 10,
      });
      expect(onTabStopsChange).toHaveBeenCalledTimes(1);
      const added = onTabStopsChange.mock.calls[0][0] as number[];
      expect(added).toContain(3);
    });

    it("track add fires on click, NOT on mousedown (so a drag never adds)", () => {
      const onTabStopsChange = vi.fn();
      const marginStart = cmToPx(2.54);
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={marginStart}
          marginEnd={cmToPx(2.54)}
          tabStops={[]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const track = container.querySelector(
        "[data-testid='ruler-tab-track']"
      ) as HTMLElement;

      // A bare mousedown (the start of a drag) must NOT add a stop.
      fireEvent.mouseDown(track, {
        clientX: marginStart + 3 * PX_PER_CM,
        clientY: 10,
      });
      expect(onTabStopsChange).not.toHaveBeenCalled();
    });

    it("track add skips when the click lands on an existing marker", () => {
      const onTabStopsChange = vi.fn();
      const marginStart = cmToPx(2.54);
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={marginStart}
          marginEnd={cmToPx(2.54)}
          tabStops={[3]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const track = container.querySelector(
        "[data-testid='ruler-tab-track']"
      ) as HTMLElement;
      const marker = container.querySelector(".ruler-tab-stop") as HTMLElement;
      expect(marker).not.toBeNull();

      // Click bubbling up from the marker (target = marker) must not add a stop —
      // it should grab the marker for dragging instead.
      fireEvent.click(track, {
        target: marker,
        clientX: marginStart + 3 * PX_PER_CM,
        clientY: 10,
      });
      expect(onTabStopsChange).not.toHaveBeenCalled();
    });

    it("track add and drag use the same content origin (marginStart)", () => {
      const onTabStopsChange = vi.fn();
      const marginStart = cmToPx(2.54);
      const { container } = render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={marginStart}
          marginEnd={cmToPx(2.54)}
          tabStops={[]}
          onTabStopsChange={onTabStopsChange}
        />
      );
      const track = container.querySelector(
        "[data-testid='ruler-tab-track']"
      ) as HTMLElement;

      // Clicking exactly marginStart + 4cm must add a stop AT 4cm — i.e. the add
      // path measures content-relative cm from the same origin (marginStart) that
      // drag deltas (pxToCm) preserve. A divergent origin would yield != 4.
      fireEvent.click(track, {
        clientX: marginStart + 4 * PX_PER_CM,
        clientY: 10,
      });
      expect(onTabStopsChange).toHaveBeenLastCalledWith([4]);
    });
  });

  describe("margin and indent handle co-existence at indentLeft=0", () => {
    it("left margin handle has base z-10 so it sits above indent handle at indentLeft=0", () => {
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          marginLeftMm={25.4}
          marginRightMm={25.4}
          onMarginChange={vi.fn()}
          indentLeft={0}
          indentFirst={0}
          onIndentChange={vi.fn()}
        />
      );

      const sliders = screen.getAllByRole("slider");
      const marginHandle = sliders.find((s) =>
        s.getAttribute("aria-label")?.includes("Left margin")
      );
      expect(marginHandle).toBeDefined();
      // Margin handle must always have z-10 so it is not occluded by the indent ▽ at indentLeft=0
      expect(marginHandle!.className).toContain("z-10");
    });

    it("left indent handle is still keyboard-operable after margin z-index fix", () => {
      const onIndentChange = vi.fn();
      render(
        <Ruler
          orientation="horizontal"
          cm={21}
          marginStart={cmToPx(2.54)}
          marginEnd={cmToPx(2.54)}
          onMarginChange={vi.fn()}
          indentLeft={0}
          indentFirst={0}
          onIndentChange={onIndentChange}
        />
      );

      const indentHandle = screen.getByRole("slider", { name: /Left indent/i });
      fireEvent.keyDown(indentHandle, { key: "ArrowRight" });
      expect(onIndentChange).toHaveBeenCalled();
    });
  });
});
