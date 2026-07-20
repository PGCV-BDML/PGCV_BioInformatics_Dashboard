"use client";

import { useState } from "react";
import { supabase, saveDataToDB } from "@/lib/supabase";
import { useToast } from "./toast";

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

// ponytail: minimal type — modal only reads id + project_name.
// Upgrade: import full ServiceProjectRow if modal needs more fields.
interface ServiceReportAnalysis {
  id: string;
  project_name: string;
}

interface ServiceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ServiceReportAnalysis | null;
  currentUserId: string | null;
  /** Called after the report is saved and the list should be updated */
  onReportGenerated: (analysisId: string, reportLink: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */
export default function ServiceReportModal({
  isOpen,
  onClose,
  analysis,
  currentUserId,
  onReportGenerated,
}: ServiceReportModalProps) {
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [clientAck, setClientAck] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis || !currentUserId) return;

    try {
      await saveDataToDB("service_report", crypto.randomUUID(), {
        analysis_id: analysis.id,
        report_link: fallbackUrl,
        delivered_by: currentUserId,
        delivered_at: new Date().toISOString(),
        client_acknowledged_at: clientAck ? new Date().toISOString() : null,
      });

      onReportGenerated(analysis.id, fallbackUrl);
      showToast("Report saved successfully.", "success");
      setFallbackUrl("");
      setClientAck(false);
      onClose();

      // Audit trail for report delivery
      supabase
        .rpc("audit_data_modification", {
          target_type: "service_report",
          target_id: analysis.id,
          event_details: { action: "delivered", report_link: fallbackUrl },
        })
        .then(({ error }) => {
          if (error)
            console.error("audit_data_modification (deliver) failed:", error);
        });
    } catch (err) {
      showToast("Failed to save report. Please try again.", "error");
    }
  };

  if (!isOpen || !analysis) return null;

  const handleCancel = () => {
    setFallbackUrl("");
    setClientAck(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="mb-5">
          <h3 className="text-lg font-bold text-slate-900">
            Generate Service Report
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Project:{" "}
            <span className="font-semibold">{analysis.project_name}</span>
          </p>
        </div>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Or Fallback
          </span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
              Fallback Report URL link
            </label>
            <input
              type="url"
              required
              placeholder="e.g. https://drive.google.com/..."
              value={fallbackUrl}
              onChange={(e) => setFallbackUrl(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 rounded-lg border border-slate-200 text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/50"
            />
          </div>

          <div className="flex items-start gap-2.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
            <input
              type="checkbox"
              id="clientAck"
              checked={clientAck}
              onChange={(e) => setClientAck(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#2a7797] focus:ring-[#2a7797]"
            />
            <label
              htmlFor="clientAck"
              className="text-xs text-slate-600 cursor-pointer select-none"
            >
              <span className="font-semibold block text-slate-700">
                Client Acknowledged
              </span>
              Check this box if the client has already acknowledged receipt of
              delivery.
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all"
            >
              Save Fallback Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
