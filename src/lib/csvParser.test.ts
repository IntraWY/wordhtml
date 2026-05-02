import { describe, it, expect } from "vitest";
import { detectDelimiter, parseCSV } from "./csvParser";

describe("detectDelimiter", () => {
  it("detects tab delimiter", () => {
    const text = "name\tage\tcity\nAlice\t30\tBKK\nBob\t25\tCNX";
    expect(detectDelimiter(text)).toBe("\t");
  });

  it("detects comma delimiter", () => {
    const text = "name,age,city\nAlice,30,BKK\nBob,25,CNX";
    expect(detectDelimiter(text)).toBe(",");
  });

  it("detects pipe delimiter", () => {
    const text = "name|age|city\nAlice|30|BKK\nBob|25|CNX";
    expect(detectDelimiter(text)).toBe("|");
  });

  it("defaults to comma when no clear delimiter", () => {
    expect(detectDelimiter("hello world")).toBe(",");
  });
});

describe("parseCSV", () => {
  it("parses tab-delimited data", () => {
    const text = "name\tage\nAlice\t30\nBob\t25";
    const result = parseCSV(text);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
    expect(result.delimiter).toBe("\t");
  });

  it("parses comma-delimited data", () => {
    const text = "name,age\nAlice,30\nBob,25";
    const result = parseCSV(text);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toEqual([
      { name: "Alice", age: "30" },
      { name: "Bob", age: "25" },
    ]);
  });

  it("parses pipe-delimited data", () => {
    const text = "name|age\nAlice|30\nBob|25";
    const result = parseCSV(text, "|");
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.delimiter).toBe("|");
  });

  it("handles empty input", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("handles headers only", () => {
    const result = parseCSV("name,age");
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toEqual([]);
  });

  it("handles quoted values with commas", () => {
    const text = 'name,description\nAlice,"Hello, world"\nBob,"Test"';
    const result = parseCSV(text);
    expect(result.rows[0].description).toBe("Hello, world");
  });
});
