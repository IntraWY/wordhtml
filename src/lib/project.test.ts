import { describe, expect, it } from "vitest";
import {
  buildProjectBlob,
  parseProjectFile,
  projectFileName,
  PROJECT_VERSION,
  type ProjectDocument,
} from "./project";

const sampleDoc: ProjectDocument = {
  html: "<p>สวัสดี {{name}}</p>",
  fileName: "จดหมาย.docx",
  pageSetup: {
    size: "A4",
    orientation: "portrait",
    marginMm: { top: 25, right: 19, bottom: 25, left: 19 },
  },
  templateMode: true,
  variables: [{ name: "name", value: "โลก", isList: false }],
  dataSet: { headers: ["name"], rows: [{ name: "โลก" }], currentRowIndex: 0 },
};

async function blobText(blob: Blob): Promise<string> {
  // jsdom Blob lacks .text() in some versions — read via FileReader fallback.
  if (typeof blob.text === "function") return blob.text();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(blob);
  });
}

describe("project file serialization", () => {
  it("round-trips a full document through build → parse", async () => {
    const text = await blobText(buildProjectBlob(sampleDoc));
    const parsed = parseProjectFile(text);
    expect(parsed).toEqual(sampleDoc);
  });

  it("stamps the current schema version and app/kind metadata", async () => {
    const text = await blobText(buildProjectBlob(sampleDoc));
    const raw = JSON.parse(text);
    expect(raw.meta.app).toBe("wordhtml");
    expect(raw.meta.kind).toBe("project");
    expect(raw.meta.version).toBe(PROJECT_VERSION);
  });

  it("derives a .wordhtml.json filename, stripping the source extension", () => {
    expect(projectFileName("report.docx")).toBe("report.wordhtml.json");
    expect(projectFileName(null)).toBe("wordhtml-document.wordhtml.json");
  });

  it("rejects non-JSON input", () => {
    expect(() => parseProjectFile("not json {")).toThrow();
  });

  it("rejects JSON that is not a wordhtml project", () => {
    expect(() => parseProjectFile(JSON.stringify({ foo: "bar" }))).toThrow(
      /ไม่ใช่ไฟล์โปรเจค/
    );
  });

  it("rejects a project with a corrupt pageSetup", () => {
    const bad = JSON.stringify({
      meta: { app: "wordhtml", kind: "project", version: 1 },
      document: { html: "<p>x</p>", pageSetup: { size: "Foolscap" } },
    });
    expect(() => parseProjectFile(bad)).toThrow(/หน้ากระดาษ/);
  });

  it("rejects a project authored by a newer app version", () => {
    const future = JSON.stringify({
      meta: { app: "wordhtml", kind: "project", version: PROJECT_VERSION + 1 },
      document: sampleDoc,
    });
    expect(() => parseProjectFile(future)).toThrow(/เวอร์ชันใหม่กว่า/);
  });

  it("tolerates missing optional fields (variables / dataSet)", () => {
    const minimal = JSON.stringify({
      meta: { app: "wordhtml", kind: "project", version: 1 },
      document: {
        html: "<p>hi</p>",
        pageSetup: sampleDoc.pageSetup,
      },
    });
    const parsed = parseProjectFile(minimal);
    expect(parsed.variables).toEqual([]);
    expect(parsed.dataSet).toBeNull();
    expect(parsed.templateMode).toBe(false);
    expect(parsed.fileName).toBeNull();
  });
});
