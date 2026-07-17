"use client";

import React, { use, useMemo, useState } from "react";
import {
  Users,
  Search,
  Mail,
  School,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import DataTable, { Column } from "../../../../../components/datatable"; // Adjust based on your imports pathing

interface Trainee {
  id: string;
  name: string;
  email: string;
  institution: string;
  pre_test_score: number;
  post_test_score: number;
  has_certificate: boolean;
}

/* ================= TRAINING COHORTS MOCK DATA ================= */
const MOCK_TRAINING_PARTICIPANTS: Record<string, Trainee[]> = {
  "trn-1": [
    {
      id: "p-1",
      name: "Marcus Vance",
      email: "m.vance@berkeley.edu",
      institution: "UC Berkeley Genomics Lab",
      pre_test_score: 74,
      post_test_score: 96,
      has_certificate: true,
    },
    {
      id: "p-2",
      name: "Claire Redfield",
      email: "credfield@northwestern.edu",
      institution: "Northwestern Medicine",
      pre_test_score: 70,
      post_test_score: 95,
      has_certificate: true,
    },
    {
      id: "p-3",
      name: "Leon S. Kennedy",
      email: "lkennedy@upm.edu.ph",
      institution: "UP National Institutes of Health",
      pre_test_score: 60,
      post_test_score: 85,
      has_certificate: false,
    },
  ],
  "trn-2": [
    {
      id: "p-4",
      name: "Ada Wong",
      email: "awong@singapore-genome.org",
      institution: "Genome Institute of Singapore",
      pre_test_score: 89,
      post_test_score: 99,
      has_certificate: true,
    },
  ],
};

export default function TrainingPerformanceTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Trainee;
    direction: "asc" | "desc";
  } | null>(null);

  const cohortParticipants = useMemo(() => {
    return MOCK_TRAINING_PARTICIPANTS[resolvedParams.id] || [];
  }, [resolvedParams.id]);

  const handleSort = (key: keyof Trainee) => {
    let direction: "asc" | "desc" = "asc";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...cohortParticipants];
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter matches
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      );
    }

    // 2. Sort matches
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "string" && typeof valB === "string") {
          const stringA = valA.toLowerCase();
          const stringB = valB.toLowerCase();
          if (stringA < stringB) return sortConfig.direction === "asc" ? -1 : 1;
          if (stringA > stringB) return sortConfig.direction === "asc" ? 1 : -1;
        } else {
          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [cohortParticipants, searchQuery, sortConfig]);

  const columns: Column<Trainee>[] = [
    {
      key: "name",
      label: "Enrolled Trainee",
      width: "40%",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5 py-1">
          <span className="font-bold text-slate-900 leading-snug">
            {p.name}
          </span>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" /> {p.email}
          </span>
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
            <School className="w-3.5 h-3.5 text-slate-400" /> {p.institution}
          </span>
        </div>
      ),
    },
    {
      key: "pre_test_score",
      label: "Pre-Test Score",
      width: "20%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-slate-600 block pl-1">
          {p.pre_test_score}
        </span>
      ),
    },
    {
      key: "post_test_score",
      label: "Post-Test Score",
      width: "20%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-[#2a7797] block pl-1">
          {p.post_test_score}
        </span>
      ),
    },
    {
      key: "has_certificate",
      label: "Training Certificate",
      width: "20%",
      sortable: true,
      render: (p) =>
        p.has_certificate ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold uppercase tracking-wider font-quicksand">
            <CheckCircle2 className="w-3 h-3" /> Issued
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[10px] font-bold uppercase tracking-wider font-quicksand">
            <XCircle className="w-3 h-3" /> Pending
          </span>
        ),
    },
  ];

  return (
    <div className="font-aileron bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
      {/* Table Action Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2a7797]" />
          <div>
            <h3 className="text-xl font-bold text-slate-800 tracking-tight">
              Training Performance Index
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Verify pre-test scores, post-test scores, and certification status
              across dynamic baseline records.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search trainees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Shared DataTable System Wrapper */}
      <div className="w-full overflow-x-auto [&&_table]:table-fixed [&&_table]:min-w-[800px]">
        <DataTable
          columns={columns}
          data={filteredAndSorted}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyMessage="No active trainees mapped to this cohort track."
        />
      </div>
    </div>
  );
}
