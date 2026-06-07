import { describe, it, expect } from "vitest";
import { normalizeIncomingHtml } from "./normalizeIncomingHtml";

describe("normalizeIncomingHtml", () => {
  it("returns html unchanged when no page structure present", () => {
    const html = `<p>สวัสดี</p>`;
    expect(normalizeIncomingHtml(html)).toBe(html);
  });

  it("flattens pasted page-node/page-body wrappers to plain blocks", () => {
    const html =
      `<div class="page-node" data-page-number="1">` +
      `<div class="page-body" data-page-body="true"><p>A</p><p>B</p></div></div>`;
    const out = normalizeIncomingHtml(html);
    expect(out).not.toContain("page-node");
    expect(out).not.toContain("page-body");
    expect(out).toContain("<p>A</p>");
    expect(out).toContain("<p>B</p>");
  });

  it("drops page-break divs so they don't nest", () => {
    const html = `<p>A</p><div class="page-break"></div><p>B</p>`;
    const out = normalizeIncomingHtml(html);
    expect(out).not.toContain("page-break");
    expect(out).toContain("<p>A</p>");
    expect(out).toContain("<p>B</p>");
  });

  it("preserves block order across multiple pasted pages", () => {
    const html =
      `<div class="page-node"><div class="page-body"><p>1</p><p>2</p></div></div>` +
      `<div class="page-node"><div class="page-body"><p>3</p></div></div>`;
    const out = normalizeIncomingHtml(html);
    const order = [out.indexOf(">1<"), out.indexOf(">2<"), out.indexOf(">3<")];
    expect(order[0]).toBeGreaterThanOrEqual(0);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
  });
});
