"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  BarChart3,
  Award,
  FileText,
  Printer,
  Sparkles,
  CheckCircle,
  FileBadge,
} from "lucide-react";

const SERVICES_CONFIG = [
  {
    id: "sequence-analysis",
    title: "3.1 — Client Sequence Analysis",
    href: "/dashboard/services",
  },
  {
    id: "training",
    title: "3.2 — Training",
    href: "/dashboard/services/training",
  },
  {
    id: "internship",
    title: "3.3 — Internship",
    href: "/dashboard/services/internship",
  },
];

const WORKSPACE_TABS = [
  {
    id: "programs",
    label: "Training Programs",
    icon: GraduationCap,
    href: "/dashboard/services/training",
  },
  {
    id: "modules",
    label: "Modules",
    icon: BookOpen,
    href: "/dashboard/services/training/modules",
  },
  {
    id: "tests",
    label: "Pre/Post Tests",
    icon: ClipboardCheck,
    href: "/dashboard/services/training/assessment",
  },
  {
    id: "evaluation",
    label: "Evaluation",
    icon: BarChart3,
    href: "/dashboard/services/training/evaluation",
  },
  {
    id: "certificate",
    label: "Certificate",
    icon: Award,
    href: "/dashboard/services/training/certificate",
  },
  { id: "docs", label: "Docs & Forms", icon: FileText, href: "#" },
];

export default function CertificatePage() {
  const activeServiceTab = "training";
  const activeWorkspaceTab = "certificate";

  // State mimicking simulated inputs or fetched database logs
  const [participantName, setParticipantName] = useState("Alex Mercer, Ph.D.");
  const [programTitle, setProgramTitle] = useState(
    "Advanced Bioinformatics Sequencing & GATK Architecture",
  );
  const [issueDate, setIssueDate] = useState("2026-07-14");
  const [certificateId, setCertificateId] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  // Simulating the API route saving record to certificates database table
  const handleGenerateAndSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantName || !programTitle) return;

    // Generate a simulated cryptographic Certificate Unique Hash/ID
    const randomHash =
      "CERT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    setCertificateId(randomHash);
    setIsSaved(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 mx-auto font-aileron w-full max-w-[1240px] px-4 py-6">
      {/* Printable Wrapper (Hides general UI blocks during printing using print-hide CSS) */}
      <div className="print:hidden space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand">
              Dashboard - Bioinformation Services
            </span>
            <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
              Bioinformatics Services
            </h1>
          </div>
        </div>

        {/* Persistent Top Service Capsule Row */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {SERVICES_CONFIG.map((service) => (
            <Link
              key={service.id}
              href={service.href}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide border transition-all duration-200 ${
                activeServiceTab === service.id
                  ? "bg-[#2a7797] text-white border-[#2a7797]"
                  : "bg-white text-slate-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {service.title}
            </Link>
          ))}
        </div>

        {/* Workspace Inner Navigation Bar */}
        <div className="bg-[#fffdf8] border border-slate-200 rounded-[24px] p-1.5 shadow-sm overflow-x-auto whitespace-nowrap flex items-center gap-1">
          {WORKSPACE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeWorkspaceTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[18px] text-xs font-bold transition-all ${
                  isActive
                    ? "bg-[#4ec2bb] text-white shadow-md shadow-[#4ec2bb]/10"
                    : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Workspace Configuration Grid & Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel: Form Inputs & DB Log Tracker (HIDDEN IN PRINT) */}
        <div className="print:hidden lg:col-span-4 bg-[#fffdf8] border border-slate-300/60 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Award className="w-5 h-5 text-[#f57f17]" />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Flow Generator
            </h2>
          </div>

          <form onSubmit={handleGenerateAndSave} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Participant Full Name
              </label>
              <input
                type="text"
                value={participantName}
                onChange={(e) => {
                  setParticipantName(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-3 text-slate-700 bg-white"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Selected Training Track
              </label>
              <select
                value={programTitle}
                onChange={(e) => {
                  setProgramTitle(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-3 text-slate-700 bg-white"
              >
                <option value="Advanced Bioinformatics Sequencing & GATK Architecture">
                  Advanced Bioinformatics Sequencing & GATK Architecture
                </option>
                <option value="16S Metagenomics Analysis Framework">
                  16S Metagenomics Analysis Framework
                </option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Completion Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => {
                  setIssueDate(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full text-xs rounded-xl border-slate-200 focus:border-[#4ec2bb] focus:ring-[#4ec2bb] p-3 text-slate-700 bg-white"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#4ec2bb] hover:bg-[#3db0a9] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Run Certificate Flow
            </button>
          </form>

          {/* Database Log Simulation Box */}
          {isSaved && (
            <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-2.5 transition-all">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle className="w-4.5 h-4.5 shrink-0" />
                <span className="text-xs font-bold">
                  SQL Database Record Inserted
                </span>
              </div>
              <div className="font-mono text-[9.5px] text-emerald-800/90 leading-relaxed bg-white/70 border border-emerald-100 rounded-lg p-2.5 space-y-1">
                <div>
                  <span className="text-emerald-500 font-bold">
                    INSERT INTO
                  </span>{" "}
                  certificates (id, user, track, date)
                </div>
                <div>
                  <span className="text-emerald-500 font-bold">VALUES</span> (
                </div>
                <div className="pl-4">'{certificateId}',</div>
                <div className="pl-4">'{participantName}',</div>
                <div className="pl-4">
                  '{programTitle.substring(0, 20)}...',
                </div>
                <div className="pl-4">'{issueDate}'</div>
                <div>
                  );{" "}
                  <span className="text-emerald-500 font-bold">
                    -- 1 row affected
                  </span>
                </div>
              </div>
              <button
                onClick={handlePrint}
                className="w-full py-2 bg-[#2a7797] hover:bg-[#1f5a73] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Certification View
              </button>
            </div>
          )}
        </div>

        {/* Right Preview Certificate Panel */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Certificate Structure Box */}
          <div className="w-full max-w-[800px] border border-slate-300 shadow-2xl rounded-lg overflow-hidden bg-white aspect-[1.414/1] flex flex-col p-8 sm:p-12 relative print:shadow-none print:border-none print:m-0 print:p-8">
            {/* Elegant Certificate Border lines */}
            <div className="absolute inset-4 border-[3px] border-[#2a7797]/60 rounded-[4px] pointer-events-none" />
            <div className="absolute inset-5 border border-[#2a7797]/20 rounded-[2px] pointer-events-none" />

            {/* Elegant Corner Motifs */}
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#2a7797]/80 rounded-tl" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#2a7797]/80 rounded-tr" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#2a7797]/80 rounded-bl" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#2a7797]/80 rounded-br" />

            {/* Certificate Header Content */}
            <div className="text-center space-y-4 my-auto">
              <div className="flex justify-center">
                <FileBadge className="w-12 h-12 text-[#2a7797] opacity-90" />
              </div>

              <div className="space-y-1">
                <span className="font-quicksand text-[11px] font-extrabold uppercase tracking-[4px] text-[#7a8e9b]">
                  Certificate of Completion
                </span>
                <p className="text-[10px] italic text-slate-400 font-serif">
                  this is proudly awarded to
                </p>
              </div>

              {/* Participant Name */}
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold tracking-wide text-slate-800 border-b border-slate-100 max-w-lg mx-auto pb-1.5 uppercase">
                {participantName || "Participant Name"}
              </h2>

              {/* Narrative of completion */}
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                for successfully completing all advanced coursework parameters,
                assessment protocols, and pipelines criteria under the
                curriculum framework of
              </p>

              {/* Program Track */}
              <h3 className="text-md sm:text-lg font-bold text-[#2a7797] max-w-xl mx-auto tracking-tight font-sans">
                {programTitle || "Program Track Course Name"}
              </h3>
            </div>

            {/* Signature Area & Dynamic Record Hash footer */}
            <div className="mt-auto grid grid-cols-3 items-end gap-6 pt-6">
              <div className="text-left">
                <div className="border-b border-slate-300 pb-1">
                  <p className="font-serif italic text-xs text-slate-800">
                    Elena Rostova
                  </p>
                </div>
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                  Lead Academic Coordinator
                </span>
              </div>

              <div className="text-center flex justify-center">
                {/* Central Certificate Seal Illustration */}
                <div className="w-14 h-14 rounded-full border-4 border-[#f57f17]/30 bg-amber-50/20 flex items-center justify-center relative">
                  <Award className="w-6 h-6 text-[#f57f17]" />
                  <div className="absolute inset-0 border border-dashed border-[#f57f17]/30 rounded-full animate-spin-[20s]" />
                </div>
              </div>

              <div className="text-right">
                <div className="border-b border-slate-300 pb-1">
                  <span className="font-mono text-[10px] font-bold text-slate-800">
                    {issueDate}
                  </span>
                </div>
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 block pt-1">
                  Verification Date
                </span>
              </div>
            </div>

            {/* Dynamic DB Hash Footer */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-[7.5px] font-mono text-slate-400">
              System Verification Record:{" "}
              <span className="font-bold text-slate-500">
                {certificateId || "CERT-PENDING-UNSAVED"}
              </span>
            </div>
          </div>

          {/* Quick Informational Notice */}
          <div className="print:hidden text-center text-xs text-slate-400 font-medium mt-4 max-w-md">
            💡 This certificate template uses custom Tailwind CSS optimized with{" "}
            <strong>print styles</strong>. Printing or saving to PDF from your
            browser renders only the certificate container.
          </div>
        </div>
      </div>

      {/* Global CSS Inject to support perfect print alignment mapping */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          /* Target exactly our certificate container and force it visible */
          .aspect-\\[1\\.414\\/1\\] {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 2.5rem !important;
          }
          .aspect-\\[1\\.414\\/1\\] * {
            visibility: visible !important;
          }
        }
      `}</style>
    </div>
  );
}
