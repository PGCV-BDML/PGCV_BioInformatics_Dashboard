"use client";

import { useEffect, useState } from "react";
import { ExternalLink, History } from "lucide-react";
import { getServiceReportSignedUrl } from "@/lib/service-report-file";
import {
  getServiceReportVersions,
  previousServiceReportVersions,
  serviceReportVersionLabel,
  type ServiceReportVersion,
} from "@/lib/service-report-versions";
import { useToast } from "./toast";

interface ServiceReportVersionsProps {
  analysisId: string;
  currentPath: string | null | undefined;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function ServiceReportVersions({
  analysisId,
  currentPath,
}: ServiceReportVersionsProps) {
  const { showToast } = useToast();
  const [versions, setVersions] = useState<ServiceReportVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const rows = await getServiceReportVersions(analysisId);
      if (cancelled) return;
      setVersions(rows);
      setIsLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisId, currentPath]);

  const previous = previousServiceReportVersions(versions, currentPath);

  async function openVersion(version: ServiceReportVersion) {
    const url = await getServiceReportSignedUrl(
      version.file_path,
      version.file_name,
    );
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      showToast("Couldn't open that PDF.", "error");
    }
  }

  if (isLoading || previous.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wide flex items-center gap-1.5">
        <History className="w-3 h-3" aria-hidden="true" />
        Previous versions
      </h4>
      <ul className="space-y-1.5">
        {previous.map((version) => (
          <li
            key={version.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5"
          >
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold text-slate-700">
                {version.file_name || "Service report.pdf"}
              </p>
              <p className="text-[10px] text-slate-400">
                <span className="font-semibold text-slate-500">
                  {serviceReportVersionLabel(version.kind)}
                </span>
                {" · "}
                {formatDate(version.uploaded_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void openVersion(version)}
              className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-[#2a7797] hover:text-[#1f5c76] underline decoration-dotted"
            >
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
