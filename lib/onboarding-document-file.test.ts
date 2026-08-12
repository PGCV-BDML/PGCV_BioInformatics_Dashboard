import { describe, expect, it } from "vitest";
import {
  buildOnboardingDocumentPath,
  validateExternalDocumentLink,
  validateOnboardingDocumentFile,
} from "@/lib/onboarding-document-file";

describe("validateExternalDocumentLink", () => {
  it("accepts http(s) URLs", () => {
    expect(validateExternalDocumentLink("https://example.com/doc.pdf")).toBeNull();
    expect(validateExternalDocumentLink(" http://files.example/a ")).toBeNull();
  });

  it("rejects empty or non-http URLs", () => {
    expect(validateExternalDocumentLink("")).toMatch(/Paste/);
    expect(validateExternalDocumentLink("ftp://example.com")).toMatch(/http/);
    expect(validateExternalDocumentLink("not-a-url")).toMatch(/valid/);
  });
});

describe("validateOnboardingDocumentFile", () => {
  it("accepts allowed documents", () => {
    const file = new File(["hello"], "handbook.pdf", {
      type: "application/pdf",
    });
    expect(validateOnboardingDocumentFile(file)).toBeNull();
  });

  it("rejects empty or unsupported files", () => {
    const empty = new File([], "empty.pdf", { type: "application/pdf" });
    expect(validateOnboardingDocumentFile(empty)).toMatch(/empty/);

    const bad = new File(["x"], "notes.exe", { type: "application/octet-stream" });
    expect(validateOnboardingDocumentFile(bad)).toMatch(/PDF/);
  });
});

describe("buildOnboardingDocumentPath", () => {
  it("nests the object under the program id", () => {
    const path = buildOnboardingDocumentPath(
      "11111111-1111-1111-1111-111111111111",
      "Code of Conduct.pdf",
    );
    expect(path.startsWith("11111111-1111-1111-1111-111111111111/")).toBe(
      true,
    );
    expect(path.endsWith(".pdf")).toBe(true);
    expect(path).toMatch(/code-of-conduct/);
  });
});
