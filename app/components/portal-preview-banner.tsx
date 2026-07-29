"use client";

import { Eye, X } from "lucide-react";
import { usePortal } from "@/app/components/portal-context";

export default function PortalPreviewBanner() {
  const { isStaff, previewMode, setPreviewMode } = usePortal();

  if (!isStaff || !previewMode) return null;

  const label = previewMode === "trainee" ? "trainee" : "intern";

  return (
    <div className="sticky top-0 z-[80] flex items-center justify-between gap-3 bg-[#2a7797] text-white px-4 py-2.5 text-xs font-bold font-aileron">
      <div className="flex items-center gap-2 min-w-0">
        <Eye className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Previewing {label} view — staff data access still applies
        </span>
      </div>
      <button
        type="button"
        onClick={() => setPreviewMode(null)}
        className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
        Exit preview
      </button>
    </div>
  );
}
