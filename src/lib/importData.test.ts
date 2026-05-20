import { describe, it, expect } from "vitest";
import { parseCsv, inferType, inferFormat, buildDataSet } from "./importData";

describe("parseCsv", () => {
  it("parses simple comma-delimited CSV", () => {
    const text = "name,age\nAlice,30\nBob,25";
    const result = parseCsv(text);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: "Alice", age: "30" });
    expect(result.rows[1]).toEqual({ name: "Bob", age: "25" });
  });

  it("parses tab-delimited text", () => {
    const text = "name\tage\nAlice\t30";
    const result = parseCsv(text);
    expect(result.headers).toEqual(["name", "age"]);
    expect(result.rows[0]).toEqual({ name: "Alice", age: "30" });
  });

  it("returns empty dataset for empty text", () => {
    const result = parseCsv("");
    expect(result.headers).toEqual([]);
    expect(result.rows).toEqual([]);
  });
});

describe("inferType", () => {
  it("infers date from ISO format", () => {
    expect(inferType("2026-05-20")).toBe("date");
  });

  it("infers date from Thai locale format", () => {
    expect(inferType("20/05/2569")).toBe("date");
  });

  it("infers percent from % suffix", () => {
    expect(inferType("15%")).toBe("percent");
  });

  it("infers currency from baht text", () => {
    expect(inferType("1,234 บาท")).toBe("currency");
  });

  it("infers currency from $ symbol", () => {
    expect(inferType("$123.45")).toBe("currency");
  });

  it("infers number from plain numeric", () => {
    expect(inferType("1234.5")).toBe("number");
    expect(inferType("1,234")).toBe("number");
  });

  it("defaults to text for non-numeric", () => {
    expect(inferType("hello")).toBe("text");
    expect(inferType("")).toBe("text");
  });
});

describe("inferFormat", () => {
  it("returns THB for currency", () => {
    expect(inferFormat("currency", [])).toBe("THB");
  });

  it("returns short for date", () => {
    expect(inferFormat("date", [])).toBe("short");
  });

  it("returns decimal(2) for number", () => {
    expect(inferFormat("number", [])).toBe("decimal(2)");
  });

  it("returns 0-100 for percent", () => {
    expect(inferFormat("percent", [])).toBe("0-100");
  });

  it("returns undefined for text", () => {
    expect(inferFormat("text", [])).toBeUndefined();
  });
});

describe("buildDataSet", () => {
  it("builds basic dataset without inference", () => {
    const result = buildDataSet(
      ["name", "amount"],
      [{ name: "Alice", amount: "100" }]
    );
    expect(result.headers).toEqual(["name", "amount"]);
    expect(result.columnTypes).toBeUndefined();
  });

  it("infers column types when inferTypes is true", () => {
    const result = buildDataSet(
      ["name", "amount", "date"],
      [
        { name: "Alice", amount: "100", date: "2026-05-20" },
        { name: "Bob", amount: "200", date: "2026-05-21" },
      ],
      { inferTypes: true }
    );
    expect(result.columnTypes).toBeDefined();
    expect(result.columnTypes?.name).toBe("text");
    expect(result.columnTypes?.amount).toBe("number");
    expect(result.columnTypes?.date).toBe("date");
    expect(result.columnFormats?.amount).toBe("decimal(2)");
    expect(result.columnFormats?.date).toBe("short");
  });
});
