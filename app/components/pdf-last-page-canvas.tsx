"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsWorkerReady = false;

async function loadPdfjs(): Promise<PdfjsModule> {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjsWorkerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    pdfjsWorkerReady = true;
  }
  return pdfjs;
}

interface PdfLastPageCanvasProps {
  pdfBytes: Uint8Array;
  pageWidth: number;
  pageHeight: number;
  children?: (scale: number) => React.ReactNode;
}

/**
 * Draws the last page of `pdfBytes` (or the only page when the bytes are
 * already a last-page extract). Overlay children are positioned in CSS
 * pixels over that page box.
 */
export function PdfLastPageCanvas({
  pdfBytes,
  pageWidth,
  pageHeight,
  children,
}: PdfLastPageCanvasProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [pageReady, setPageReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  const fit = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return 1;
    const availableW = Math.max(frame.clientWidth - 24, 160);
    const availableH = Math.max(frame.clientHeight - 24, 160);
    return Math.min(availableW / pageWidth, availableH / pageHeight, 1.75);
  }, [pageWidth, pageHeight]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    let cancelled = false;
    let generation = 0;
    let renderTask: { cancel: () => void } | null = null;

    async function paint() {
      const myGen = ++generation;
      const nextScale = fit();
      if (!cancelled && myGen === generation) setScale(nextScale);
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        const pdfjs = await loadPdfjs();
        if (cancelled || myGen !== generation) return;
        const task = pdfjs.getDocument({ data: pdfBytes.slice() });
        const pdf = await task.promise;
        if (cancelled || myGen !== generation) {
          void pdf.destroy();
          return;
        }
        const pdfPage = await pdf.getPage(pdf.numPages);
        const viewport = pdfPage.getViewport({ scale: nextScale });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable.");
        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
        renderTask?.cancel();
        renderTask = pdfPage.render({ canvas, viewport });
        await renderTask.promise;
        await pdf.destroy();
        if (!cancelled && myGen === generation) {
          setRenderError(null);
          setPageReady(true);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled && myGen === generation) {
          setRenderError(
            "Couldn't draw the last page. You can still place your signature on the outline.",
          );
          setPageReady(true);
          canvas.width = Math.floor(pageWidth * nextScale);
          canvas.height = Math.floor(pageHeight * nextScale);
          canvas.style.width = `${pageWidth * nextScale}px`;
          canvas.style.height = `${pageHeight * nextScale}px`;
        }
      }
    }

    void paint();

    const observer = new ResizeObserver(() => {
      void paint();
    });
    observer.observe(frame);

    return () => {
      cancelled = true;
      renderTask?.cancel();
      observer.disconnect();
    };
  }, [fit, pageHeight, pageWidth, pdfBytes]);

  const canvasWidth = pageWidth * scale;
  const canvasHeight = pageHeight * scale;

  return (
    <div
      ref={frameRef}
      className="relative flex min-h-[280px] h-[min(58vh,640px)] w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-200/80"
    >
      <div
        className="relative bg-white shadow-md"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <canvas ref={canvasRef} className="block" />
        {renderError ? (
          <div className="pointer-events-none absolute inset-0 flex items-start justify-center p-3">
            <p className="rounded-lg bg-amber-50/95 px-2 py-1.5 text-[11px] font-semibold text-amber-900 shadow-sm">
              {renderError}
            </p>
          </div>
        ) : null}
        {pageReady ? (
          children?.(scale)
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">
            Drawing last page…
          </p>
        )}
      </div>
    </div>
  );
}
