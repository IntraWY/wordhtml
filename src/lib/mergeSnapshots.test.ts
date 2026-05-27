import { describe, expect, it } from "vitest";

import { mergeSnapshots } from "./mergeSnapshots";
import type { DocumentSnapshot } from "@/types";

function snap(
  id: string,
  savedAt: string,
  html = "<p>x</p>"
): DocumentSnapshot {
  return {
    id,
    fileName: null,
    savedAt,
    html,
    wordCount: 1,
  };
}

describe("mergeSnapshots", () => {
  it("merges by id keeping newer savedAt", () => {
    const local = [snap("a", "2026-01-01T00:00:00.000Z", "<p>old</p>")];
    const remote = [snap("a", "2026-01-02T00:00:00.000Z", "<p>new</p>")];
    const merged = mergeSnapshots(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].html).toBe("<p>new</p>");
  });

  it("sorts newest first and caps at max", () => {
    const items = Array.from({ length: 25 }, (_, i) =>
      snap(`id-${i}`, new Date(2026, 0, i + 1).toISOString())
    );
    const merged = mergeSnapshots(items, [], 20);
    expect(merged).toHaveLength(20);
    expect(Date.parse(merged[0].savedAt)).toBeGreaterThan(Date.parse(merged[1].savedAt));
  });

  it("includes unique ids from both sources", () => {
    const local = [snap("local", "2026-01-01T00:00:00.000Z")];
    const remote = [snap("remote", "2026-01-02T00:00:00.000Z")];
    const merged = mergeSnapshots(local, remote);
    expect(merged.map((s) => s.id).sort()).toEqual(["local", "remote"]);
  });
});
