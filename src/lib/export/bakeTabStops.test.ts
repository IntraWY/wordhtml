import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { bakeTabStops } from "./bakeTabStops";

// jsdom returns 0-size rects; stub getBoundingClientRect on .pm-tab spans so the
// baker can read "rendered" widths the way it would from the live editor.
function stubWidth(el: Element, width: number) {
  (el as HTMLElement).getBoundingClientRect = () =>
    ({ width, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {} }) as DOMRect;
}

describe("bakeTabStops", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("replaces each \\t with a baked spacer of the live-measured width", () => {
    // live editor DOM: a paragraph with one tab decoration (width 80px)
    document.body.innerHTML =
      '<div class="ProseMirror"><p data-tab-stops="3">A<span class="pm-tab">\t</span>B</p></div>';
    stubWidth(document.querySelector(".pm-tab")!, 80);

    const html = '<p data-tab-stops="3">A\tB</p>';
    const out = bakeTabStops(html);

    expect(out).toContain('class="tab-bake"');
    expect(out).toContain("width:80.00px");
    expect(out).not.toContain("\t");
  });

  it("is a no-op when there are no tab stops", () => {
    document.body.innerHTML = '<div class="ProseMirror"><p>plain</p></div>';
    const html = "<p>no tabs here</p>";
    expect(bakeTabStops(html)).toBe(html);
  });

  it("leaves a block untouched when tab count doesn't match measured widths", () => {
    // html has 2 tabs but the live block reports only 1 pm-tab → bail for safety
    document.body.innerHTML =
      '<div class="ProseMirror"><p data-tab-stops="3">A<span class="pm-tab">\t</span>B</p></div>';
    stubWidth(document.querySelector(".pm-tab")!, 80);

    const html = '<p data-tab-stops="3">A\tB\tC</p>';
    const out = bakeTabStops(html);
    expect(out).toContain("\t"); // unchanged — still raw tabs
    expect(out).not.toContain("tab-bake");
  });

  it("bakes only the stop-bearing block in a mixed document", () => {
    document.body.innerHTML =
      '<div class="ProseMirror">' +
      "<p>intro</p>" +
      '<p data-tab-stops="3">A<span class="pm-tab">\t</span>B</p>' +
      "</div>";
    stubWidth(document.querySelector(".pm-tab")!, 55);

    const html = '<p>intro</p><p data-tab-stops="3">A\tB</p>';
    const out = bakeTabStops(html);
    expect(out).toContain("width:55.00px");
    expect(out).toContain("<p>intro</p>");
  });
});
