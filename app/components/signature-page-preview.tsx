"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clampSignatureRect,
  cssBoxToPdfRect,
  pdfRectToCss,
  resizeSignatureRect,
  type SignatureRect,
} from "@/lib/signature-placement";

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

type DragKind = "move" | "resize";

interface SignaturePagePreviewProps {
  pdfBytes: Uint8Array;
  pageWidth: number;
  pageHeight: number;
  rect: SignatureRect;
  signatureUrl: string;
  aspectRatio: number;
  disabled?: boolean;
  onRectChange: (rect: SignatureRect) => void;
}

export function SignaturePagePreview({
  pdfBytes,
  pageWidth,
  pageHeight,
  rect,
  signatureUrl,
  aspectRatio,
  disabled = false,
  onRectChange,
}: SignaturePagePreviewProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(1);
  const [pageReady, setPageReady] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const dragRef = useRef<{
    kind: DragKind;
    pointerId: number;
    startX: number;
    startY: number;
    orig: SignatureRect;
  } | null>(null);

  const page = { width: pageWidth, height: pageHeight };

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
          setRenderError("Couldn't draw the last page. You can still place your signature on the outline.");
          setPageReady(true);
          const fallbackScale = nextScale;
          canvas.width = Math.floor(pageWidth * fallbackScale);
          canvas.height = Math.floor(pageHeight * fallbackScale);
          canvas.style.width = `${pageWidth * fallbackScale}px`;
          canvas.style.height = `${pageHeight * fallbackScale}px`;
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

  function applyCssBox(box: {
    left: number;
    top: number;
    width: number;
    height: number;
  }) {
    const next = clampSignatureRect(
      cssBoxToPdfRect(box, pageHeight, scale),
      page,
      aspectRatio,
    );
    onRectChange(next);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId || disabled) return;
    const css = pdfRectToCss(drag.orig, pageHeight, scale);
    if (drag.kind === "move") {
      applyCssBox({
        left: css.left + (event.clientX - drag.startX),
        top: css.top + (event.clientY - drag.startY),
        width: css.width,
        height: css.height,
      });
      return;
    }
    const delta = event.clientX - drag.startX;
    const nextWidth = drag.orig.width + delta / scale;
    onRectChange(resizeSignatureRect(drag.orig, nextWidth, page, aspectRatio));
  }

  function stopDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
    }
  }

  function startDrag(
    event: React.PointerEvent<HTMLDivElement>,
    kind: DragKind,
  ) {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      orig: rect,
    };
  }

  const css = pdfRectToCss(rect, pageHeight, scale);
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
          <div
            role="img"
            aria-label="Your signature. Drag to move, use the corner to resize."
            onPointerDown={(event) => startDrag(event, "move")}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            className={`absolute box-border border-2 border-dashed border-[#2a7797] bg-white/10 ${
              disabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            }`}
            style={{
              left: css.left,
              top: css.top,
              width: css.width,
              height: css.height,
              touchAction: "none",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={signatureUrl}
              alt=""
              draggable={false}
              className="pointer-events-none h-full w-full object-contain select-none"
            />
            <span className="pointer-events-none absolute -top-5 left-0 rounded-t-md bg-[#2a7797] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              Your signature
            </span>
            <div
              aria-hidden="true"
              onPointerDown={(event) => startDrag(event, "resize")}
              className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 rounded-sm border-2 border-white bg-[#2a7797] shadow-sm"
              style={{ cursor: disabled ? "default" : "nwse-resize" }}
            />
          </div>
        ) : (
          <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400 italic">
            Drawing last page…
          </p>
        )}
      </div>
    </div>
  );
}
