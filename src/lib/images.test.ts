import { describe, it, expect } from "vitest";

import { extractImages } from "./images";

// Minimal 1x1 transparent PNG as base64
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

function makeImgHtml(src: string): string {
  return `<img src="${src}">`;
}

describe("extractImages", () => {
  it("returns empty result for empty input", () => {
    const result = extractImages("");
    expect(result.html).toBe("");
    expect(result.images).toHaveLength(0);
  });

  it("extracts a single base64 PNG and rewrites src", () => {
    const input = makeImgHtml(`data:image/png;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input);

    expect(result.images).toHaveLength(1);
    expect(result.images[0].filename).toBe("image1.png");
    expect(result.images[0].mimeType).toBe("image/png");
    expect(result.images[0].blob).toBeInstanceOf(Blob);
    expect(result.html).toContain('src="img/image1.png"');
    expect(result.html).not.toContain("data:image/png");
  });

  it("increments counter for multiple images", () => {
    const input =
      makeImgHtml(`data:image/png;base64,${TINY_PNG_BASE64}`) +
      makeImgHtml(`data:image/png;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input);

    expect(result.images).toHaveLength(2);
    expect(result.images[0].filename).toBe("image1.png");
    expect(result.images[1].filename).toBe("image2.png");
    expect(result.html).toContain("image1.png");
    expect(result.html).toContain("image2.png");
  });

  it("uses custom basePath when provided", () => {
    const input = makeImgHtml(`data:image/png;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input, "assets");
    expect(result.html).toContain('src="assets/image1.png"');
  });

  it("leaves non-base64 src (regular URL) untouched", () => {
    const input = makeImgHtml("https://example.com/photo.jpg");
    const result = extractImages(input);
    expect(result.images).toHaveLength(0);
    expect(result.html).toContain("https://example.com/photo.jpg");
  });

  it("leaves relative src untouched", () => {
    const input = makeImgHtml("./images/photo.jpg");
    const result = extractImages(input);
    expect(result.images).toHaveLength(0);
    expect(result.html).toContain("./images/photo.jpg");
  });

  it("skips malformed data URI without throwing", () => {
    // data: prefix but no valid base64 segment
    const input = makeImgHtml("data:image/png;notbase64,!!!invalid");
    expect(() => extractImages(input)).not.toThrow();
    // The malformed URI doesn't match the base64 regex, so no images extracted
    const result = extractImages(input);
    expect(result.images).toHaveLength(0);
  });

  it("uses .bin extension for unknown mime types", () => {
    // Use a known unsupported mime type
    const input = makeImgHtml(`data:image/unknown;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input);
    expect(result.images[0].filename).toBe("image1.bin");
  });

  it("supports jpeg mime type with jpg extension", () => {
    const input = makeImgHtml(`data:image/jpeg;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input);
    expect(result.images[0].filename).toBe("image1.jpg");
  });

  it("extracted blob has correct size (non-zero)", () => {
    const input = makeImgHtml(`data:image/png;base64,${TINY_PNG_BASE64}`);
    const result = extractImages(input);
    expect(result.images[0].blob.size).toBeGreaterThan(0);
  });

  it("returns html unchanged when no base64 images present", () => {
    const input = "<p>no images here</p>";
    const result = extractImages(input);
    expect(result.images).toHaveLength(0);
    expect(result.html).toContain("no images here");
  });
});
