"use client";

import { useEffect, useRef, useState } from "react";
import { loadPdfjs } from "./pdf-last-page-canvas";

type PdfjsModule = typeof import("pdfjs-dist");

interface PdfDocumentPagesProps {
  pdfBytes: Uint8Array;
}

/**
 * Scrollable in-app rendering of every page. Used instead of an iframe
 * because Chrome often shows a blank frame for blob: and cross-origin
 * PDF URLs.
 */
export function PdfDocumentPages({ pdfBytes }: PdfDocumentPagesProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(true);

  useEffect(() => {
    const frame = frameRef.current;
    const stack = stackRef.current;
    if (!frame || !stack) return;

    let cancelled = false;
    let loadingTask: ReturnType<PdfjsModule["getDocument"]> | null = null;

    async function releasePdf() {
      const task = loadingTask;
      loadingTask = null;
      try {
        await task?.destroy();
      } catch {
        /* already torn down */
      }
    }

    async function paint() {
      setIsDrawing(true);
      setError(null);
      stack.replaceChildren();

      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;
        loadingTask = pdfjs.getDocument({ data: pdfBytes.slice() });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await releasePdf();
          return;
        }

        const availableW = Math.max(frame.clientWidth - 24, 160);

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) break;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(availableW / base.width, 1.5);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.className = "block max-w-full bg-white shadow-md";
          const outputScale = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable.");
          ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);
          stack.append(canvas);
          await page.render({ canvas, viewport }).promise;
        }

        if (!cancelled) setIsDrawing(false);
        await releasePdf();
      } catch (err) {
        console.error(err);
        await releasePdf();
        if (!cancelled) {
          setError("Couldn't draw this PDF in the preview.");
          setIsDrawing(false);
        }
      }
    }

    void paint();

    return () => {
      cancelled = true;
      void releasePdf();
    };
  }, [pdfBytes]);

  return (
    <div
      ref={frameRef}
      className="min-h-[360px] w-full flex-1 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-200/80 p-3"
    >
      {error ? (
        <p className="px-2 py-8 text-center text-xs font-semibold text-amber-900">
          {error} Use Open in new tab if you still need to read it.
        </p>
      ) : null}
      <div className="relative">
        {isDrawing ? (
          <p className="absolute inset-x-0 top-8 z-10 text-center text-xs italic text-slate-500">
            Drawing pages…
          </p>
        ) : null}
        <div ref={stackRef} className="flex flex-col items-center gap-3" />
      </div>
    </div>
  );
}
