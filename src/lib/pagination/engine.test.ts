import { describe, it, expect, afterEach } from "vitest";
import { calculatePageMetrics, measurePageBodies } from "./engine";
import type { PageSetup } from "@/types";

const pageSetup: PageSetup = {
  size: "A4",
  orientation: "portrait",
  marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
};

function mountPageBody(html = "<p>Hello</p>") {
  const pageNode = document.createElement("div");
  pageNode.className = "page-node";
  pageNode.style.height = "1123px";
  pageNode.style.width = "794px";

  const body = document.createElement("div");
  body.className = "page-body";
  body.style.height = "100%";
  body.style.overflow = "hidden";
  body.style.paddingTop = "95px";
  body.style.paddingBottom = "95px";
  body.style.paddingLeft = "72px";
  body.style.paddingRight = "72px";
  body.innerHTML = html;

  pageNode.appendChild(body);
  document.body.appendChild(pageNode);
  return body;
}

describe("measurePageBodies", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not false-positive overflow when clientHeight exceeds content area", () => {
    mountPageBody("<p>Short text</p>");
    const metrics = calculatePageMetrics(pageSetup);
    const overflows = measurePageBodies(document, metrics.contentHeightPx);
    expect(overflows).toHaveLength(0);
  });
});
