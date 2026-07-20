"use client";

import React, { useState, use, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  Trash2,
  ExternalLink,
  X,
  FileBadge,
  Printer,
  CheckCircle,
  BarChart3,
} from "lucide-react";
import { getRowsFromDB, getUsersFromDB, deleteDataFromDB } from "@/lib/supabase";
import type { Certificate, TrainingProgram, User } from "@/types/database";

/* ================= CERTIFICATE TEMPLATE ================= */
const CERTIFICATE_TEMPLATE = {
  body: "The Philippine Genome Center awards this certificate of completion to {name} for completing {hours} hours of {trainingType} from {startDate} to {endDate} at PGC Visayas, Miagao, Iloilo.",
  signatories: [
    { name: "Victor Marco Emmanuel N. Ferriols, Ph.D.", title: "Assistant to the Executive Director, Visayas, Philippine Genome Center" },
    { name: "Albert Noblezada", title: "Science Research Specialist II, Bioinformatics" },
  ],
};

interface CertificateRecord {
  id: string;
  name: string;
  programTitle: string;
  date: string;
  participant_id: string;
}

/** Replace template placeholders with actual values. Falls back to "—" for missing data. */
function fillTemplate(
  body: string,
  data: Record<string, string | undefined>,
): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => data[key] ?? "—");
}

export default function CertificateRegistryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);

  // Certificate Registry
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [program, setProgram] = useState<TrainingProgram | null>(null);

  const [viewingCertificate, setViewingCertificate] =
    useState<CertificateRecord | null>(null);
  const programTitle = resolvedParams.id; // fallback label

  useEffect(() => {
    const load = async () => {
      try {
        const [certs, users, programs] = await Promise.all([
          getRowsFromDB<Certificate>("certificate"),
          getUsersFromDB(["trainee", "intern", "team_lead", "team_member"]),
          getRowsFromDB<TrainingProgram>("training_program"),
        ]);
        const prog = programs.find((p) => p.id === resolvedParams.id);
        setProgram(prog ?? null);

        const userMap = new Map<string, User>();
        for (const u of (users as User[])) userMap.set(u.id, u);
        const programCerts = certs.filter(
          (c) => c.program_id === resolvedParams.id,
        );
        const rows: CertificateRecord[] = programCerts.map((c) => {
          const u = userMap.get(c.participant_id);
          return {
            id: c.id,
            name: u?.name ?? "—",
            programTitle: prog?.title ?? programTitle,
            date: c.issued_at ? c.issued_at.split("T")[0] ?? "—" : "—",
            participant_id: c.participant_id,
          };
        });
        setCertificates(rows);
      } catch (err) {
        console.error("Error loading certificates:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  const handleDeleteCertificate = async (id: string) => {
    try {
      await deleteDataFromDB("certificate", id);
      setCertificates((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Error deleting certificate:", err);
    }
  };

  /** Resolve user name for a given participant_id */
  const resolveName = (participantId: string): string => {
    // fall back to the name in the certificate record if available, else placeholder
    const cert = certificates.find((c) => c.participant_id === participantId);
    return cert?.name ?? "—";
  };

  /** Compute filled certificate body for a given cert */
  const getCertificateBody = (cert: CertificateRecord): string => {
    return fillTemplate(CERTIFICATE_TEMPLATE.body, {
      name: cert.name,
      hours: "—", // ponytail: hours not yet available in training_program schema
      trainingType: program?.type ?? "training",
      startDate: program?.start_date ? program.start_date.split("T")[0] ?? "—" : "—",
      endDate: program?.end_date ? program.end_date.split("T")[0] ?? "—" : "—",
    });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="print:hidden flex items-center gap-2 border-b border-slate-100 pb-3">
        <Link
          href={`/dashboard/services/training/${resolvedParams.id}/evaluation`}
          className="px-4 py-2 text-xs font-bold rounded-lg text-slate-500 hover:bg-slate-50 transition-all flex items-center gap-1.5"
        >
          1. Submit Evaluation{" "}
          <BarChart3 className="w-3.5 h-3.5 text-[#2a7797]" />
        </Link>
        <span className="px-4 py-2 text-xs font-bold rounded-lg bg-[#2a7797]/10 text-[#2a7797]">
          2. Certificate Registry ({certificates.length})
        </span>
      </div>

      {/* Main Workspace Card Area */}
      <div className="print:hidden bg-surface border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#f57f17]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Certificates Database Log Registry
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="p-4">Certificate ID</th>
                  <th className="p-4">Participant Name</th>
                  <th className="p-4">Program Track Title</th>
                  <th className="p-4">Verification Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {certificates.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-8 text-center text-slate-400 font-medium italic"
                    >
                      No verification rows found inside table schema parameters.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="hover:bg-slate-50/40 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-[#2a7797] text-[11px] whitespace-nowrap">
                        {cert.id}
                      </td>
                      <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                        {cert.name}
                      </td>
                      <td className="p-4 font-medium max-w-[260px] truncate">
                        {cert.programTitle}
                      </td>
                      <td className="p-4 text-slate-500 font-semibold font-mono whitespace-nowrap">
                        {cert.date}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setViewingCertificate(cert)}
                            className="px-3 py-1.5 bg-[#eaf7f6] hover:bg-[#deefed] text-[#247974] font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                            title="View & Print Certificate HTML Layout"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Certificate</span>
                          </button>
                          <button
                            onClick={() => handleDeleteCertificate(cert.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Row Log Entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* HTML Printable Certificate Overlay Modal Layer */}
      {viewingCertificate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 print:absolute print:inset-0 print:bg-white print:p-0">
          <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-[840px] p-6 space-y-4 relative print:rounded-none print:shadow-none print:p-0">
            <div className="print:hidden flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-[#2a7797]" />
                <span className="text-xs font-bold text-slate-700 font-mono tracking-wide">
                  {viewingCertificate.id}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-[#4ec2bb] text-white hover:bg-[#3db0a9] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setViewingCertificate(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Certificate Design Grid */}
            <div className="w-full border border-slate-300 rounded-lg bg-white aspect-[1.414/1] flex flex-col p-8 sm:p-12 relative print:border-none print:m-0 print:p-6 print:w-full">
              <div className="absolute inset-4 border-[3px] border-[#2a7797]/60 rounded-[4px] pointer-events-none" />
              <div className="absolute inset-5 border border-[#2a7797]/20 rounded-[2px] pointer-events-none" />

              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#2a7797]/80 rounded-tl" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#2a7797]/80 rounded-tr" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#2a7797]/80 rounded-bl" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#2a7797]/80 rounded-br" />

              <div className="text-center space-y-4 my-auto">
                <div className="flex justify-center">
                  <Award className="w-10 h-10 text-[#2a7797] opacity-80" />
                </div>

                <div className="space-y-1">
                  <span className="font-quicksand text-[10px] font-extrabold uppercase tracking-[3px] text-[#7a8e9b]">
                    Certificate of Completion
                  </span>
                  <p className="text-[9px] italic text-slate-400 font-serif">
                    this is proudly awarded to
                  </p>
                </div>

                <h2 className="text-xl sm:text-2xl font-serif font-semibold tracking-wide text-slate-800 border-b border-slate-100 max-w-md mx-auto pb-1 uppercase">
                  {viewingCertificate.name}
                </h2>

                <p className="text-[11px] text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                  {getCertificateBody(viewingCertificate)}
                </p>

                <h3 className="text-sm sm:text-base font-bold text-[#2a7797] max-w-xl mx-auto tracking-tight">
                  {viewingCertificate.programTitle}
                </h3>
              </div>

              <div className="mt-auto grid grid-cols-3 items-end gap-6 pt-4">
                <div className="text-left">
                  <div className="border-b border-slate-300 pb-0.5">
                    <p className="font-serif italic text-xs text-slate-800">
                    {CERTIFICATE_TEMPLATE.signatories[0]!.name}
                     </p>
                   </div>
                   <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                    {CERTIFICATE_TEMPLATE.signatories[0]!.title}
                  </span>
                </div>

                <div className="text-center flex justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-[#f57f17]/20 bg-amber-50/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-[#f57f17]" />
                  </div>
                </div>

                <div className="text-right">
                  <div className="border-b border-slate-300 pb-0.5">
                    <span className="font-mono text-[10px] font-bold text-slate-700">
                      {viewingCertificate.date}
                    </span>
                  </div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                    Verification Date
                  </span>
                </div>
              </div>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-[7px] font-mono text-slate-400">
                System Verification Key:{" "}
                <span className="font-bold text-slate-500">
                  {viewingCertificate.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX Custom Global CSS Override Layer for Clean Print Outcomes */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .fixed,
          .fixed * {
            visibility: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .aspect-\\[1\\.414\\/1\\] {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            border: none !important;
            margin: 0 !important;
            padding: 2rem !important;
          }
        }
      `}</style>
    </div>
  );
}
