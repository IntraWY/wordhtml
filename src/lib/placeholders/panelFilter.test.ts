import { describe, it, expect } from "vitest";
import {
  filterPanelVariables,
  staleVariableNames,
  nextEmptyVariableName,
  isVariableFilled,
} from "./panelFilter";
import type { TemplateVariable } from "@/types";

const vars: TemplateVariable[] = [
  { name: "สถานี", value: "โซ่พิสัย", isList: false },
  { name: "ฟีดเดอร์", value: "", isList: false },
  { name: "พิกัด", value: "17.98, 103.48", isList: true, listValues: ["17.98", "103.48"] },
  { name: "ตัวเก่า", value: "x", isList: false },
];

const docNames = new Set(["สถานี", "ฟีดเดอร์", "พิกัด"]);

describe("isVariableFilled", () => {
  it("checks value for plain variables and listValues for lists", () => {
    expect(isVariableFilled(vars[0])).toBe(true);
    expect(isVariableFilled(vars[1])).toBe(false);
    expect(isVariableFilled(vars[2])).toBe(true);
    expect(isVariableFilled({ name: "ล", value: "x", isList: true, listValues: [] })).toBe(false);
  });
});

describe("filterPanelVariables", () => {
  it("returns everything in 'all' mode without a query", () => {
    expect(filterPanelVariables(vars, docNames, "", "all")).toHaveLength(4);
  });

  it("matches Thai substrings case-insensitively", () => {
    const out = filterPanelVariables(vars, docNames, "ฟีด", "all");
    expect(out.map((v) => v.name)).toEqual(["ฟีดเดอร์"]);
  });

  it("'inDocument' hides variables not present in the document", () => {
    const out = filterPanelVariables(vars, docNames, "", "inDocument");
    expect(out.map((v) => v.name)).toEqual(["สถานี", "ฟีดเดอร์", "พิกัด"]);
  });

  it("'unfilled' shows only in-document variables without values", () => {
    const out = filterPanelVariables(vars, docNames, "", "unfilled");
    expect(out.map((v) => v.name)).toEqual(["ฟีดเดอร์"]);
  });

  it("combines query with filter mode", () => {
    expect(filterPanelVariables(vars, docNames, "สถานี", "unfilled")).toHaveLength(0);
  });
});

describe("staleVariableNames", () => {
  it("lists panel variables that vanished from the document", () => {
    expect(staleVariableNames(vars, docNames)).toEqual(["ตัวเก่า"]);
  });

  it("is empty when everything is in use", () => {
    expect(staleVariableNames(vars.slice(0, 3), docNames)).toEqual([]);
  });
});

describe("nextEmptyVariableName", () => {
  it("returns the first unfilled in-document variable", () => {
    expect(nextEmptyVariableName(vars, docNames)).toBe("ฟีดเดอร์");
  });

  it("returns null when all in-document variables are filled", () => {
    const filled = vars.map((v) => ({ ...v, value: v.value || "ok" }));
    expect(nextEmptyVariableName(filled, docNames)).toBeNull();
  });
});
