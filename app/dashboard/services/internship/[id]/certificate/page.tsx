"use client";

import React, { use, useState, useEffect } from "react";
import DataTable, { Column } from "../../../../../components/datatable";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";
import {
  Award,
  Trash2,
  ExternalLink,
  X,
  FileBadge,
  Printer,
  CheckCircle,
} from "lucide-react";

interface CertificateRecord {
  id: string;
  name: string;
  programTitle: string;
  date: string;
}

export default function CertificateRegistryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  // Simulated Certificate Registry Database
  const [certificates, setCertificates] = useState<CertificateRecord[]>([
    {
      id: "CERT-DF83KS9A",
      name: "Dr. Elena Rostova",
      programTitle: "16S Metagenomics Analysis Framework",
      date: "2026-06-12",
    },
    {
      id: "CERT-JK92LA7B",
      name: "Alex Mercer, Ph.D.",
      programTitle: "Advanced Bioinformatics Sequencing & GATK Architecture",
      date: "2026-07-15",
    },
  ]);

  const [viewingCertificate, setViewingCertificate] =
    useState<CertificateRecord | null>(null);

  // Sorting State configuration required by your custom DataTable component
  const [sortConfig, setSortConfig] = useState<{
    key: keyof CertificateRecord;
    direction: "asc" | "desc";
  } | null>(null);

  const handleDeleteCertificate = (id: string) => {
    setCertificates((prev) => prev.filter((cert) => cert.id !== id));
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [certs, users] = await Promise.all([
          getRowsFromDB("certificate"),
          getUsersFromDB(["trainee", "intern", "team_lead", "team_member"]),
        ]);
        const userMap = new Map<string, any>();
        for (const u of users as any[]) userMap.set(u.id, u);
        const programCerts = (certs as any[]).filter(
          (c) => c.program_id === resolvedParams.id,
        );
        if (programCerts.length > 0) {
          setCertificates(
            programCerts.map((c) => {
              const u = userMap.get(c.participant_id);
              return {
                id: c.id,
                name: u?.name ?? "—",
                programTitle: "—",
                date: c.issued_at ? c.issued_at.split("T")[0] : "—",
              };
            }),
          );
        }
      } catch (err) {
        console.error("Error loading certificates:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  const handleSort = (key: keyof CertificateRecord) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });

    setCertificates((prev) =>
      [...prev].sort((a, b) => {
        if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
        if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
        return 0;
      }),
    );
  };

  // Structured Columns layout definitions mapped to your reusable DataTable definitions
  const columns: Column<CertificateRecord>[] = [
    {
      key: "id",
      label: "Certificate ID",
      width: "18%",
      sortable: true,
      render: (item) => (
        <span className="font-mono font-bold text-[#2a7797] text-[11px]">
          {item.id}
        </span>
      ),
    },
    {
      key: "name",
      label: "Participant Name",
      width: "25%",
      sortable: true,
      render: (item) => (
        <span className="font-bold text-slate-900">{item.name}</span>
      ),
    },
    {
      key: "programTitle",
      label: "Program Track Title",
      width: "37%",
      sortable: true,
      render: (item) => (
        <span className="font-medium block truncate" title={item.programTitle}>
          {item.programTitle}
        </span>
      ),
    },
    {
      key: "date",
      label: "Verification Date",
      width: "18%",
      sortable: true,
      render: (item) => (
        <span className="text-slate-500 font-semibold font-mono">
          {item.date}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      width: "14%",
      render: (item) => (
        <div className="flex items-center justify-start gap-2">
          <button
            onClick={() => setViewingCertificate(item)}
            className="px-2.5 py-1.5 bg-[#eaf7f6] hover:bg-[#deefed] text-[#247974] font-bold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
            title="View & Print Certificate HTML Layout"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View</span>
          </button>
          <button
            onClick={() => handleDeleteCertificate(item.id)}
            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
            title="Delete Row Log Entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Workspace Card Area */}
      <div className="print:hidden bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10">
        <div className="space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#f57f17]" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                Certificates Database Log Registry
              </h2>
            </div>
          </div>

          {/* Render target mapped explicitly to DataTable component template metrics */}
          <DataTable
            columns={columns}
            data={certificates}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage="No verification rows found inside table schema parameters."
          />
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
                  for successfully validating all advanced computation
                  parameters, pipelines architectures, and quality controls
                  under the specialized tracking course curriculum of
                </p>

                <h3 className="text-sm sm:text-base font-bold text-[#2a7797] max-w-xl mx-auto tracking-tight">
                  {viewingCertificate.programTitle}
                </h3>
              </div>

              <div className="mt-auto grid grid-cols-3 items-end gap-6 pt-4">
                <div className="text-left">
                  <div className="border-b border-slate-300 pb-0.5">
                    <p className="font-serif italic text-xs text-slate-800">
                      Elena Rostova
                    </p>
                  </div>
                  <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                    Lead Academic Coordinator
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
          .print\:hidden {
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
