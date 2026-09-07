import { describe, expect, it } from "vitest";
import { configurePdfjsWorker, PDFJS_WORKER_SRC } from "./pdfjs-worker";

describe("configurePdfjsWorker", () => {
  it("points pdf.js at the locally served worker", () => {
    expect(PDFJS_WORKER_SRC).toBe("/pdf.worker.min.mjs");
    const pdfjs = { GlobalWorkerOptions: { workerSrc: "" } };
    configurePdfjsWorker(pdfjs);
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe("/pdf.worker.min.mjs");
  });
});
