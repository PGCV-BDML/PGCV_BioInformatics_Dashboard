import { describe, expect, it } from "vitest";
import {
  buildModuleFilePath,
  contentTypeForModuleFile,
  MAX_MODULE_FILE_BYTES,
  titleFromModuleFileName,
  validateModuleFile,
} from "@/lib/module-file";

describe("validateModuleFile", () => {
  it("accepts allowed course materials", () => {
    const pdf = new File(["slides"], "lecture.pdf", { type: "application/pdf" });
    expect(validateModuleFile(pdf)).toBeNull();

    const html = new File(["<html></html>"], "custom-module.html", {
      type: "text/html",
    });
    expect(validateModuleFile(html)).toBeNull();

    const pptx = new File(["deck"], "intro.pptx", { type: "" });
    expect(validateModuleFile(pptx)).toBeNull();
  });

  it("rejects empty or unsupported files", () => {
    const empty = new File([], "empty.pdf", { type: "application/pdf" });
    expect(validateModuleFile(empty)).toMatch(/empty/);

    const bad = new File(["x"], "notes.exe", {
      type: "application/octet-stream",
    });
    expect(validateModuleFile(bad)).toMatch(/HTML, PDF/);
  });

  it("rejects files over the limit", () => {
    const file = new File(["x"], "huge.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: MAX_MODULE_FILE_BYTES + 1 });
    expect(validateModuleFile(file)).toMatch(/limit/i);
  });
});

describe("buildModuleFilePath", () => {
  it("nests the object under the program id", () => {
    const path = buildModuleFilePath(
      "11111111-1111-1111-1111-111111111111",
      "Custom Lecture.pptx",
    );
    expect(path.startsWith("11111111-1111-1111-1111-111111111111/")).toBe(
      true,
    );
    expect(path.endsWith(".pptx")).toBe(true);
    expect(path).toMatch(/custom-lecture/);
  });
});

describe("contentTypeForModuleFile", () => {
  it("maps from the file extension when the browser omits a type", () => {
    const file = new File(["<p>hi</p>"], "notes.html", { type: "" });
    expect(contentTypeForModuleFile(file)).toBe("text/html");
  });
});

describe("titleFromModuleFileName", () => {
  it("turns a filename into a readable default title", () => {
    expect(titleFromModuleFileName("primer-design-handout.pdf")).toBe(
      "primer design handout",
    );
  });
});
