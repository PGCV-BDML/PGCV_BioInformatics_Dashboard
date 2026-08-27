"use client";

import { useRef } from "react";
import {
  clampSignatureRect,
  cssBoxToPdfRect,
  pdfRectToCss,
  resizeSignatureRect,
  type SignatureRect,
} from "@/lib/signature-placement";
import { PdfLastPageCanvas } from "./pdf-last-page-canvas";

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
  const dragRef = useRef<{
    kind: DragKind;
    pointerId: number;
    startX: number;
    startY: number;
    orig: SignatureRect;
  } | null>(null);

  const page = { width: pageWidth, height: pageHeight };

  return (
    <PdfLastPageCanvas
      pdfBytes={pdfBytes}
      pageWidth={pageWidth}
      pageHeight={pageHeight}
    >
      {(scale) => {
        const css = pdfRectToCss(rect, pageHeight, scale);

        function applyCssBox(box: {
          left: number;
          top: number;
          width: number;
          height: number;
        }) {
          onRectChange(
            clampSignatureRect(
              cssBoxToPdfRect(box, pageHeight, scale),
              page,
              aspectRatio,
            ),
          );
        }

        function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
          const drag = dragRef.current;
          if (!drag || event.pointerId !== drag.pointerId || disabled) return;
          const start = pdfRectToCss(drag.orig, pageHeight, scale);
          if (drag.kind === "move") {
            applyCssBox({
              left: start.left + (event.clientX - drag.startX),
              top: start.top + (event.clientY - drag.startY),
              width: start.width,
              height: start.height,
            });
            return;
          }
          const delta = event.clientX - drag.startX;
          onRectChange(
            resizeSignatureRect(
              drag.orig,
              drag.orig.width + delta / scale,
              page,
              aspectRatio,
            ),
          );
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

        return (
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
        );
      }}
    </PdfLastPageCanvas>
  );
}
