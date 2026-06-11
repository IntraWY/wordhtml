import { describe, it, expect } from "vitest";
import {
  compactVariables,
  variablesUsedIn,
  mergeRestoredVariables,
  shouldPersistDataSet,
  DATASET_PERSIST_LIMIT,
} from "./variableStorage";
import type { TemplateVariable, DataSet } from "@/types";

describe("compactVariables", () => {
  it("drops undefined fields (Firestore rejects undefined)", () => {
    const vars: TemplateVariable[] = [
      { name: "ก", value: "1", isList: false, delimiter: undefined, listValues: undefined },
    ];
    const out = compactVariables(vars);
    expect("delimiter" in out[0]).toBe(false);
    expect("listValues" in out[0]).toBe(false);
    expect(out[0]).toEqual({ name: "ก", value: "1", isList: false });
  });
});

describe("variablesUsedIn", () => {
  it("keeps only variables whose names appear in the HTML", () => {
    const vars: TemplateVariable[] = [
      { name: "สถานี", value: "", isList: false },
      { name: "เก่า", value: "x", isList: false },
    ];
    const out = variablesUsedIn("<p>{{สถานี}} และ {{อื่น|comma}}</p>", vars);
    expect(out.map((v) => v.name)).toEqual(["สถานี"]);
  });
});

describe("mergeRestoredVariables", () => {
  const incoming: TemplateVariable[] = [
    { name: "สถานี", value: "โซ่พิสัย", isList: false },
    { name: "ใหม่", value: "ค่า", isList: false },
  ];

  it("fills empty slots and adds missing names", () => {
    const current: TemplateVariable[] = [{ name: "สถานี", value: "", isList: false }];
    const out = mergeRestoredVariables(current, incoming);
    expect(out.find((v) => v.name === "สถานี")?.value).toBe("โซ่พิสัย");
    expect(out.find((v) => v.name === "ใหม่")?.value).toBe("ค่า");
  });

  it("never clobbers a value the user already typed", () => {
    const current: TemplateVariable[] = [
      { name: "สถานี", value: "เซกา", isList: false },
    ];
    const out = mergeRestoredVariables(current, incoming);
    expect(out.find((v) => v.name === "สถานี")?.value).toBe("เซกา");
  });
});

describe("shouldPersistDataSet", () => {
  const small: DataSet = {
    headers: ["a"],
    rows: [{ a: "1" }],
    currentRowIndex: 0,
  };

  it("persists small data sets and rejects null", () => {
    expect(shouldPersistDataSet(small)).toBe(true);
    expect(shouldPersistDataSet(null)).toBe(false);
  });

  it("rejects data sets over the persist limit", () => {
    const big: DataSet = {
      headers: ["a"],
      rows: [{ a: "x".repeat(DATASET_PERSIST_LIMIT + 10) }],
      currentRowIndex: 0,
    };
    expect(shouldPersistDataSet(big)).toBe(false);
  });
});
