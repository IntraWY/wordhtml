import { describe, it, expect } from "vitest";
import { resolveTrackChangesForExport } from "./trackChange";

describe("resolveTrackChangesForExport", () => {
  it("keeps insertion text (unwrap) and drops deletion text", () => {
    const html =
      `<p>A <span data-track="insertion" class="wh-track-ins">added</span> ` +
      `<span data-track="deletion" class="wh-track-del">removed</span> B</p>`;
    const out = resolveTrackChangesForExport(html);
    expect(out).toContain("added");
    expect(out).not.toContain("removed");
    expect(out).not.toContain("data-track");
  });

  it("returns html unchanged when there are no track changes", () => {
    expect(resolveTrackChangesForExport("<p>x</p>")).toBe("<p>x</p>");
  });
});
