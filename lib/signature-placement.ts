/**
 * Geometry for officer e-signature stamps on a service-report PDF page.
 *
 * PDF user space: origin bottom-left, units in points.
 * CSS overlay space: origin top-left, units in CSS pixels.
 * `scale` is CSS pixels per PDF point (the on-screen zoom of the last page).
 */

export type SignatureRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PageSize = {
  width: number;
  height: number;
};

export type CssBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Smallest stamp width, in PDF points. */
export const MIN_SIGNATURE_WIDTH_PT = 48;
/** Largest stamp width, in PDF points. */
export const MAX_SIGNATURE_WIDTH_PT = 280;
/** Largest stamp height, in PDF points — keeps the block from covering titles. */
export const MAX_SIGNATURE_HEIGHT_PT = 90;
export const SIGNATURE_NUDGE_PT = 4;
export const SIGNATURE_FINE_NUDGE_PT = 1;

export function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Keep the stamp on the page, inside min/max size, and (when possible)
 * at the given width/height aspect ratio.
 */
export function clampSignatureRect(
  rect: SignatureRect,
  page: PageSize,
  aspectRatio?: number,
): SignatureRect {
  const ratio =
    aspectRatio && aspectRatio > 0
      ? aspectRatio
      : rect.width / Math.max(rect.height, 1);

  const maxW = Math.min(MAX_SIGNATURE_WIDTH_PT, page.width);
  const maxH = Math.min(MAX_SIGNATURE_HEIGHT_PT, page.height);

  let width = Number.isFinite(rect.width) ? rect.width : maxW;
  let height = width / ratio;

  if (width > maxW) {
    width = maxW;
    height = width / ratio;
  }
  if (height > maxH) {
    height = maxH;
    width = height * ratio;
  }
  if (width < MIN_SIGNATURE_WIDTH_PT && MIN_SIGNATURE_WIDTH_PT <= maxW) {
    width = MIN_SIGNATURE_WIDTH_PT;
    height = width / ratio;
    if (height > maxH) {
      height = maxH;
      width = height * ratio;
    }
  }

  if (width > page.width) {
    width = page.width;
    height = width / ratio;
  }
  if (height > page.height) {
    height = page.height;
    width = height * ratio;
  }

  return {
    x: clampNumber(rect.x, 0, Math.max(0, page.width - width)),
    y: clampNumber(rect.y, 0, Math.max(0, page.height - height)),
    width,
    height,
  };
}

export function nudgeSignatureRect(
  rect: SignatureRect,
  dx: number,
  dy: number,
  page: PageSize,
  aspectRatio?: number,
): SignatureRect {
  return clampSignatureRect(
    { ...rect, x: rect.x + dx, y: rect.y + dy },
    page,
    aspectRatio,
  );
}

/**
 * Resize from the current top-left in CSS (PDF x, y+height stay put when
 * possible). `nextWidth` is in PDF points.
 */
export function resizeSignatureRect(
  rect: SignatureRect,
  nextWidth: number,
  page: PageSize,
  aspectRatio: number,
): SignatureRect {
  const top = rect.y + rect.height;
  const resized = clampSignatureRect(
    { ...rect, width: nextWidth, height: nextWidth / Math.max(aspectRatio, 1e-6) },
    page,
    aspectRatio,
  );
  return clampSignatureRect(
    {
      ...resized,
      y: top - resized.height,
    },
    page,
    aspectRatio,
  );
}

export function pdfRectToCss(
  rect: SignatureRect,
  pageHeight: number,
  scale: number,
): CssBox {
  return {
    left: rect.x * scale,
    top: (pageHeight - rect.y - rect.height) * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function cssBoxToPdfRect(
  box: CssBox,
  pageHeight: number,
  scale: number,
): SignatureRect {
  const width = box.width / scale;
  const height = box.height / scale;
  return {
    x: box.left / scale,
    y: pageHeight - box.top / scale - height,
    width,
    height,
  };
}

/** PNG IHDR width/height, or null when the bytes are not a PNG. */
export function readPngSize(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < 24) return null;
  if (
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (!width || !height) return null;
  return { width, height };
}
