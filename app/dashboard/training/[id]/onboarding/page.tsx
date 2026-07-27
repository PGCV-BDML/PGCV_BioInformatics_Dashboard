"use client";

import React, { useEffect, use, useState } from "react";
import { FileText, AlertCircle, Download } from "lucide-react";
import { getRowsFromDB } from "@/lib/supabase";

// ponytail: matches DB schema exactly; if additional display fields are needed later, extend via `OnboardingDocument & { extra: string }`
interface OnboardingDocument {
  id: string;
  program_id: string;
  title: string | null;
  link: string | null;
  is_required: boolean;
}

export default function TrainingOnboardingTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [documents, setDocuments] = useState<OnboardingDocument[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const docs = await getRowsFromDB<OnboardingDocument>("onboarding_document");
        const filtered = docs.filter(
          (d) => d.program_id === resolvedParams.id,
        );
        setDocuments(filtered);
      } catch (err) {
        console.error("Error loading onboarding documents:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  return (
    <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
        <FileText className="w-5 h-5 text-[#4ec2bb]" />
        <div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">
            Onboarding Documents
          </h3>
          <p className="text-[11px] font-medium text-slate-400">
            Compliance records and onboarding materials linked to this training
            cohort.
          </p>
        </div>
      </div>

      {documents.length === 0 ? (
        <p className="text-xs text-slate-400 italic py-2">
          No active compliance parameters mapped to this training cohort track.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-start justify-between p-4 bg-surface border border-slate-200 rounded-[20px] transition-all shadow-sm cursor-default"
            >
              <div className="space-y-1 max-w-[80%]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {doc.title ?? "Untitled"}
                  </span>
                  {doc.is_required && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-bold rounded-md">
                      <AlertCircle className="w-2.5 h-2.5" /> Required
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  {doc.title ?? "Unnamed document"}
                </p>
              </div>
              {doc.link ? (
                <a
                  href={doc.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-white bg-surface hover:bg-[#4ec2bb] border border-slate-200 hover:border-[#4ec2bb] rounded-xl shrink-0 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" />
                </a>
              ) : (
                <span className="p-2 text-slate-300 bg-slate-50 border border-slate-100 rounded-xl shrink-0 cursor-not-allowed" title="No file uploaded">
                  <Download className="w-4 h-4" />
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
