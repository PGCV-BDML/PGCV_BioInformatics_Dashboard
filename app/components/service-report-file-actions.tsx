"use client";

import { useState } from "react";
import { Download, Eye } from "lucide-react";
import { getServiceReportSignedUrl } from "@/lib/service-report-file";
import { useToast } from "./toast";

interface ServiceReportFileActionsProps {
  filePath: string;
  fileName?: string | null;
  onPreview: () => void;
  disabled?: boolean;
  /** Icon-only for table cells; labeled for detail panels. */
  variant?: "icon" | "labeled";
}

const ICON_BUTTON =
  "inline-flex items-center justify-center rounded-lg p-1.5 text-[#2a7797] transition-colors hover:bg-[#e6f4f8] disabled:cursor-not-allowed disabled:opacity-50";

const LABELED_BUTTON =
  "inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-[#2a7797] shadow-sm ring-1 ring-[#2a7797]/20 transition-colors hover:bg-[#e6f4f8] disabled:cursor-not-allowed disabled:opacity-50";

export async function downloadServiceReportFile(
  filePath: string,
  fileName?: string | null,
): Promise<boolean> {
  const url = await getServiceReportSignedUrl(filePath, fileName);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export function ServiceReportFileActions({
  filePath,
  fileName,
  onPreview,
  disabled = false,
  variant = "icon",
}: ServiceReportFileActionsProps) {
  const { showToast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const buttonClass = variant === "labeled" ? LABELED_BUTTON : ICON_BUTTON;
  const fileLabel = fileName?.trim() || "service report PDF";

  async function handleDownload() {
    if (disabled || isDownloading) return;
    setIsDownloading(true);
    try {
      const opened = await downloadServiceReportFile(filePath, fileName);
      if (!opened) {
        showToast("Couldn't download that PDF. Try again in a moment.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Couldn't download that PDF. Try again in a moment.", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={onPreview}
        disabled={disabled}
        title={`Preview ${fileLabel}`}
        aria-label={`Preview ${fileLabel}`}
        className={buttonClass}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        {variant === "labeled" ? "Preview" : null}
      </button>
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={disabled || isDownloading}
        title={`Download ${fileLabel}`}
        aria-label={
          isDownloading ? `Downloading ${fileLabel}` : `Download ${fileLabel}`
        }
        className={buttonClass}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {variant === "labeled"
          ? isDownloading
            ? "Downloading…"
            : "Download"
          : null}
      </button>
    </div>
  );
}
