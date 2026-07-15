"use client";

import React, { use, useMemo } from "react";
import { FileText, AlertCircle, Download } from "lucide-react";

/* ================= INTERNSHIP DOCUMENTS MOCK DATA ================= */
const MOCK_INTERNSHIP_ONBOARDING_DOCUMENTS = [
  {
    id: "doc-1",
    program_id: "int-1",
    title: "Clinical Data Protection & Confidentiality NDA Agreement",
    file_name: "Clinical_Data_Confidentiality_NDA.pdf",
    file_size: "1.2 MB",
    is_required: true,
  },
  {
    id: "doc-2",
    program_id: "int-1",
    title: "RNA-Seq HPC Cluster Protocol & Environment Guidelines",
    file_name: "RNA_Seq_Cluster_Guidelines_v1.0.pdf",
    file_size: "2.5 MB",
    is_required: false,
  },
];

export default function InternshipOnboardingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  const cohortDocuments = useMemo(() => {
    return MOCK_INTERNSHIP_ONBOARDING_DOCUMENTS.filter(
      (doc) => doc.program_id === resolvedParams.id,
    );
  }, [resolvedParams.id]);

  return (
    <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <FileText className="w-5 h-5 text-[#4ec2bb]" />
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
            Onboarding Documents
          </h3>
          <p className="text-[11px] font-medium text-slate-400">
            Compliance records and onboarding materials linked to this
            internship cohort.
          </p>
        </div>
      </div>

      {cohortDocuments.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          No active compliance parameters mapped to this internship cohort
          track.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cohortDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all shadow-sm"
            >
              <div className="space-y-1 max-w-[80%]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {doc.title}
                  </span>
                  {doc.is_required && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-bold rounded-md">
                      <AlertCircle className="w-2.5 h-2.5" /> Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  {doc.file_name}{" "}
                  <span className="text-slate-300 font-sans">
                    ({doc.file_size})
                  </span>
                </p>
              </div>
              <a
                href="#"
                className="p-2 text-slate-400 hover:text-[#2a7797] bg-slate-50 border border-slate-100 rounded-lg shrink-0"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
