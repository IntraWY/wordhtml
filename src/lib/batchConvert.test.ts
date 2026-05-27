import { describe, it, expect, vi } from "vitest";
import { batchConvert } from "./batchConvert";

vi.mock("@/lib/conversion/docxToHtml", () => ({
  docxToHtml: vi.fn(async () => ({ html: "<p>ok</p>", warnings: [] })),
}));

vi.mock("@/lib/conversion/loadHtmlFile", () => ({
  loadHtmlFile: vi.fn(async () => "<p>html</p>"),
}));

describe("batchConvert", () => {
  it("returns a zip blob for docx files", async () => {
    const file = new File(["x"], "a.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const blob = await batchConvert([file]);
    expect(blob.type).toContain("zip");
  });

  it("aborts when signal is aborted", async () => {
    const file = new File(["x"], "a.docx");
    const controller = new AbortController();
    controller.abort();
    await expect(
      batchConvert([file], { signal: controller.signal })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
