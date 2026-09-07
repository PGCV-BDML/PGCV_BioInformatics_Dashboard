/**
 * Served from /public after next.config copies the matching pdfjs-dist worker.
 * `new URL("pdfjs-dist/...", import.meta.url)` does not resolve to a real
 * asset in the Next.js client bundle, so the last-page canvas stayed blank.
 */
export const PDFJS_WORKER_SRC = "/pdf.worker.min.mjs";

export function configurePdfjsWorker(pdfjs: {
  GlobalWorkerOptions: { workerSrc: string };
}): void {
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;
}
