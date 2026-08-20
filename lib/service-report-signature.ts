import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
  type PDFPage,
} from "pdf-lib";
import { supabase, getCurrentUser } from "@/lib/supabase";
import {
  buildServiceReportPath,
  SERVICE_REPORT_BUCKET,
  stampedServiceReportFileName,
} from "@/lib/service-report-file";
import {
  downloadSignatureBytes,
  MissingSignatureError,
  requireMySignaturePath,
} from "@/lib/user-signature";
import { isReviewComplete } from "@/lib/analysis-tracker";

/**
 * Signature image placement on the last page of a PGCV service report.
 *
 * The Word template is A4. Stamps are placed from the actual
 * "Reviewed by:" / "Approved for Release:" text on the page — hung 1 cm
 * below that label, in the blank band above the printed name.
 * SIGNATURE_SLOTS is only the fallback if those labels cannot be read.
 */
export type SignatureSlot = "reviewed_by" | "approved_by";

type SlotPlacement = {
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
};

type TextRun = {
  text: string;
  x: number;
  y: number;
  height: number;
};

const LABEL_NEEDLES: Record<SignatureSlot, string[]> = {
  reviewed_by: ["reviewed by"],
  approved_by: ["approved for release"],
};

/**
 * Word encodes inter-word spacing as kerning offsets inside TJ arrays rather
 * than as space characters, so "Reviewed by:" extracts as "Reviewedby:".
 * Match on the whitespace-stripped form so both shapes hit.
 */
function squash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

/** PDF user-space points per centimetre (72 pt = 1 in = 2.54 cm). */
const PT_PER_CM = 72 / 2.54;
/** Extra drop of both officer stamps under the role label. */
const STAMP_DROP_PT = 1 * PT_PER_CM;

/**
 * Fallback if the PDF text cannot be read (scanned page, unusual encoding).
 *
 * Calibrated from PGCV-BIOINFO-SR-2026-118 (A4, 595.28 x 841.89). On that
 * template the signatory page is the last page and holds only the three
 * blocks, so these are stable: label baselines sit at y=445.1 (Reviewed by:)
 * and y=209.9 (Approved for Release:), each 87.9pt above its printed name.
 * The y values here already include STAMP_DROP_PT (1 cm below the
 * label-hug placement).
 */
export const SIGNATURE_SLOTS: Record<SignatureSlot, SlotPlacement> = {
  reviewed_by: { x: 72, y: 399 - STAMP_DROP_PT, maxWidth: 160, maxHeight: 40 },
  approved_by: { x: 72, y: 164 - STAMP_DROP_PT, maxWidth: 160, maxHeight: 40 },
};

/** Blank left under the label baseline before the top of the stamp. */
const LABEL_CLEARANCE = 6 + STAMP_DROP_PT;
/** Blank left between the bottom of the stamp and the printed name. */
const NAME_CLEARANCE = 4;
/**
 * Producers split a single visual line into several runs, so anything within
 * this much of the label baseline belongs to the label's own line — not to
 * the printed name underneath it.
 */
const SAME_LINE_TOLERANCE = 14;
/** Never shrink a stamp below this, even in a cramped band. */
const MIN_STAMP_HEIGHT = 14;

export {
  originalServiceReportBaseName,
  serviceReportDownloadFileName,
  stampedServiceReportFileName,
} from "@/lib/service-report-file";

export class MissingReportPdfError extends Error {
  readonly code = "MISSING_REPORT_PDF" as const;

  constructor(
    message = "This report has no uploaded PDF to sign. Ask the analyst to upload one.",
  ) {
    super(message);
    this.name = "MissingReportPdfError";
  }
}

export function isMissingReportPdfError(
  error: unknown,
): error is MissingReportPdfError {
  return (
    error instanceof MissingReportPdfError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "MISSING_REPORT_PDF")
  );
}

function bytesToPdfString(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i++) {
    text += String.fromCharCode(bytes[i]!);
  }
  return text;
}

function pageContentString(page: PDFPage): string {
  page.node.normalize();
  const contents = page.node.Contents();
  const chunks: string[] = [];

  const take = (obj: unknown) => {
    if (!obj || typeof obj !== "object") return;
    if (obj instanceof PDFRawStream) {
      chunks.push(bytesToPdfString(decodePDFRawStream(obj).decode()));
      return;
    }
    const stream = obj as { getContentsString?: () => string };
    if (typeof stream.getContentsString === "function") {
      try {
        chunks.push(stream.getContentsString());
      } catch {
        /* PDFStream base throws; ignore */
      }
    }
  };

  if (contents instanceof PDFArray) {
    for (let i = 0; i < contents.size(); i++) take(contents.lookup(i));
  } else {
    take(contents);
  }
  return chunks.join("\n");
}

function tokenizePdfContent(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch <= " ") {
      i += 1;
      continue;
    }
    if (ch === "%") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "(") {
      let out = "(";
      i += 1;
      let depth = 1;
      while (i < src.length && depth > 0) {
        const c = src[i]!;
        if (c === "\\") {
          out += c + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (c === "(") depth += 1;
        if (c === ")") depth -= 1;
        out += c;
        i += 1;
      }
      tokens.push(out);
      continue;
    }
    if (ch === "<") {
      if (src[i + 1] === "<") {
        tokens.push("<<");
        i += 2;
        continue;
      }
      let j = i + 1;
      while (j < src.length && src[j] !== ">") j += 1;
      tokens.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (ch === ">" && src[i + 1] === ">") {
      tokens.push(">>");
      i += 2;
      continue;
    }
    if ("[]{}".includes(ch)) {
      tokens.push(ch);
      i += 1;
      continue;
    }
    if (ch === "/") {
      let j = i + 1;
      while (j < src.length && !/[\s()<>[\]{}/%]/.test(src[j]!)) j += 1;
      tokens.push(src.slice(i, j));
      i = j;
      continue;
    }
    let j = i;
    while (j < src.length && !/[\s()<>[\]{}/%]/.test(src[j]!)) j += 1;
    tokens.push(src.slice(i, j));
    i = j;
  }
  return tokens;
}

function pdfStringToken(tok: string): string | null {
  if (tok.startsWith("(") && tok.endsWith(")")) {
    return tok
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\(\d{1,3})/g, (_, digits: string) =>
        String.fromCharCode(parseInt(digits, 8)),
      );
  }
  if (tok.startsWith("<") && tok.endsWith(">") && tok[1] !== "<") {
    const hex = tok.slice(1, -1).replace(/\s/g, "");
    let out = "";
    for (let i = 0; i < hex.length; i += 2) {
      out += String.fromCharCode(
        parseInt(hex.slice(i, i + 2).padEnd(2, "0"), 16),
      );
    }
    return out;
  }
  return null;
}

function multiplyCtm(m: number[], n: number[]): number[] {
  return [
    m[0]! * n[0]! + m[2]! * n[1]!,
    m[1]! * n[0]! + m[3]! * n[1]!,
    m[0]! * n[2]! + m[2]! * n[3]!,
    m[1]! * n[2]! + m[3]! * n[3]!,
    m[0]! * n[4]! + m[2]! * n[5]! + m[4]!,
    m[1]! * n[4]! + m[3]! * n[5]! + m[5]!,
  ];
}

function applyCtm(m: number[], x: number, y: number): { x: number; y: number } {
  return {
    x: m[0]! * x + m[2]! * y + m[4]!,
    y: m[1]! * x + m[3]! * y + m[5]!,
  };
}

/**
 * Every text fragment on the page with its position, in PDF user space
 * (points, origin bottom-left). Exported so SIGNATURE_SLOTS can be
 * recalibrated by dumping runs from a real report when the template changes.
 */
export function extractTextRuns(page: PDFPage): TextRun[] {
  const tokens = tokenizePdfContent(pageContentString(page));
  const runs: TextRun[] = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const ctmStack: number[][] = [];
  let textX = 0;
  let textY = 0;
  let fontSize = 12;
  let inText = false;

  const pushRun = (text: string) => {
    const trimmed = text.replace(/\0/g, "").trim();
    if (!trimmed) return;
    const pt = applyCtm(ctm, textX, textY);
    runs.push({ text: trimmed, x: pt.x, y: pt.y, height: fontSize });
  };

  for (let i = 0; i < tokens.length; i++) {
    const op = tokens[i]!;
    if (op === "q") {
      ctmStack.push(ctm.slice());
      continue;
    }
    if (op === "Q") {
      ctm = ctmStack.pop() ?? [1, 0, 0, 1, 0, 0];
      continue;
    }
    if (op === "cm" && i >= 6) {
      ctm = multiplyCtm(ctm, [
        Number(tokens[i - 6]),
        Number(tokens[i - 5]),
        Number(tokens[i - 4]),
        Number(tokens[i - 3]),
        Number(tokens[i - 2]),
        Number(tokens[i - 1]),
      ]);
      continue;
    }
    if (op === "BT") {
      inText = true;
      textX = 0;
      textY = 0;
      continue;
    }
    if (op === "ET") {
      inText = false;
      continue;
    }
    if (op === "Tm" && i >= 6) {
      textX = Number(tokens[i - 2]);
      textY = Number(tokens[i - 1]);
      continue;
    }
    if ((op === "Td" || op === "TD") && i >= 2) {
      textX += Number(tokens[i - 2]);
      textY += Number(tokens[i - 1]);
      continue;
    }
    if (op === "Tf" && i >= 1) {
      const size = Number(tokens[i - 1]);
      if (Number.isFinite(size) && size > 0) fontSize = size;
      continue;
    }
    if (!inText) continue;
    if (op === "Tj" && i >= 1) {
      const str = pdfStringToken(tokens[i - 1]!);
      if (str) pushRun(str);
      continue;
    }
    if (op === "TJ") {
      let j = i - 1;
      const parts: string[] = [];
      while (j >= 0 && tokens[j] !== "[") {
        const str = pdfStringToken(tokens[j]!);
        if (str) parts.unshift(str);
        j -= 1;
      }
      if (parts.length) pushRun(parts.join(""));
    }
  }
  return runs;
}

function findLabelRun(runs: TextRun[], slot: SignatureSlot): TextRun | undefined {
  const needles = LABEL_NEEDLES[slot].map(squash);
  return runs.find((run) => {
    const squashed = squash(run.text);
    return needles.some((needle) => squashed.includes(needle));
  });
}

function findNameBelow(runs: TextRun[], label: TextRun): TextRun | undefined {
  return runs
    .filter(
      (run) =>
        label.y - run.y >= SAME_LINE_TOLERANCE &&
        Math.abs(run.x - label.x) < 240,
    )
    .sort((a, b) => b.y - a.y)[0];
}

/**
 * Bottom-left of the stamp on this page. The stamp hangs from just below the
 * role label and is shrunk to clear the printed name under it; falls back to
 * SIGNATURE_SLOTS when the label cannot be read.
 */
export function resolveSignatureRect(
  page: PDFPage,
  slot: SignatureSlot,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const fallback = SIGNATURE_SLOTS[slot];
  const runs = extractTextRuns(page);
  const label = findLabelRun(runs, slot);
  if (!label) {
    const size = fitSignatureSize(imageWidth, imageHeight, fallback);
    return { x: fallback.x, y: fallback.y, ...size };
  }

  // Top of the stamp, always under the label's baseline so the signature
  // reads as belonging to "Reviewed by:" / "Approved for Release:".
  const top = label.y - LABEL_CLEARANCE;
  const name = findNameBelow(runs, label);
  const floor = name
    ? name.y + name.height * 0.8 + NAME_CLEARANCE
    : top - fallback.maxHeight;

  const size = fitSignatureSize(imageWidth, imageHeight, {
    ...fallback,
    maxHeight: Math.min(
      fallback.maxHeight,
      Math.max(MIN_STAMP_HEIGHT, top - floor),
    ),
  });

  return { x: label.x, y: top - size.height, ...size };
}

async function downloadReportPdfBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .download(path);

  if (error || !data) {
    console.error("Failed to download service report PDF:", error);
    throw new Error("Couldn't open the service report PDF for signing.");
  }

  return new Uint8Array(await data.arrayBuffer());
}

function fitSignatureSize(
  imageWidth: number,
  imageHeight: number,
  slot: SlotPlacement,
): { width: number; height: number } {
  const ratio = imageWidth / Math.max(imageHeight, 1);
  let width = slot.maxWidth;
  let height = width / ratio;
  if (height > slot.maxHeight) {
    height = slot.maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

/**
 * Draw the current user's e-signature into the named slot on the last
 * page of the analysis PDF, upload a new version, and point the analysis
 * row at it. Does not change review/approval status — callers do that.
 */
export async function stampServiceReportSignature(
  analysisId: string,
  slot: SignatureSlot,
): Promise<{ filePath: string; fileName: string; fileSize: number }> {
  const signaturePath = await requireMySignaturePath();

  const { data: analysis, error } = await supabase
    .from("analysis")
    .select(
      "id, service_report_file_path, service_report_file_name, reviewer_user_id, approver_user_id, status_of_review",
    )
    .eq("id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load analysis for signing:", error);
    throw error;
  }
  if (!analysis) {
    throw new Error("Analysis not found for signing.");
  }

  const user = await getCurrentUser();
  if (!user) {
    throw new MissingSignatureError("You must be signed in to sign a report.");
  }

  if (slot === "reviewed_by" && analysis.reviewer_user_id !== user.id) {
    throw new Error("Only the assigned reviewing officer can sign this report.");
  }
  if (slot === "approved_by" && analysis.approver_user_id !== user.id) {
    throw new Error("Only the assigned approving officer can sign this report.");
  }
  if (slot === "approved_by" && !isReviewComplete(analysis.status_of_review)) {
    throw new Error(
      "This report must be peer-reviewed before it can be approved.",
    );
  }

  const reportPath = analysis.service_report_file_path?.trim();
  if (!reportPath) {
    throw new MissingReportPdfError();
  }

  const [pdfBytes, signatureBytes] = await Promise.all([
    downloadReportPdfBytes(reportPath),
    downloadSignatureBytes(signaturePath),
  ]);

  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  if (pages.length === 0) {
    throw new Error("That PDF has no pages to sign.");
  }
  const page = pages[pages.length - 1]!;

  // Prefer PNG; fall back to embedding as is (webp may fail — callers upload PNG).
  let embedded;
  try {
    embedded = await pdf.embedPng(signatureBytes);
  } catch {
    try {
      embedded = await pdf.embedJpg(signatureBytes);
    } catch {
      throw new Error(
        "Couldn't read your signature image. Re-upload it as a PNG.",
      );
    }
  }

  const rect = resolveSignatureRect(
    page,
    slot,
    embedded.width,
    embedded.height,
  );

  page.drawImage(embedded, rect);

  const stamped = await pdf.save();
  const stampedBytes = new Uint8Array(stamped);
  const stampedName = stampedServiceReportFileName(
    analysis.service_report_file_name,
    slot,
  );
  const newPath = buildServiceReportPath(analysisId, stampedName);

  const { error: uploadError } = await supabase.storage
    .from(SERVICE_REPORT_BUCKET)
    .upload(newPath, stampedBytes, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload stamped PDF:", uploadError);
    throw new Error("Couldn't save the signed PDF. Please try again.");
  }

  const { error: setFileError } = await supabase.rpc("set_analysis_report_file", {
    p_analysis_id: analysisId,
    p_file_path: newPath,
    p_file_name: stampedName,
    p_file_size: stampedBytes.byteLength,
  });

  if (setFileError) {
    console.error("Failed to update analysis report file:", setFileError);
    throw new Error("Couldn't save the signed PDF. Please try again.");
  }

  return {
    filePath: newPath,
    fileName: stampedName,
    fileSize: stampedBytes.byteLength,
  };
}
