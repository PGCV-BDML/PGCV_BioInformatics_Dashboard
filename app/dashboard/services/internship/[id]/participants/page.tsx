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
import { Column } from "../../../../../components/datatable"; // Adjust based on your imports pathing

interface Intern {
  id: string;
  name: string;
  email: string;
  institution: string;
  pre_test_score: number;
  post_test_score: number;
  has_certificate: boolean;
}

/* ================= INTERNSHIP COHORTS MOCK DATA ================= */
const MOCK_INTERNSHIP_PARTICIPANTS: Record<string, Intern[]> = {
  "int-1": [
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
  "int-2": [
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

export default function InternshipPerformanceTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig] = useState<{
    key: keyof Intern;
    direction: "asc" | "desc";
  } | null>(null);

  const cohortParticipants = useMemo(() => {
    return MOCK_INTERNSHIP_PARTICIPANTS[resolvedParams.id] || [];
  }, [resolvedParams.id]);

  const sortedAndFiltered = useMemo(() => {
    let result = [...cohortParticipants];
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.institution.toLowerCase().includes(q),
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [cohortParticipants, searchQuery, sortConfig]);

  const columns: Column<Intern>[] = [
    {
      key: "name",
      label: "Enrolled Intern",
      width: "40%",
      sortable: true,
      render: (p) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-slate-900">{p.name}</span>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <Mail className="w-3 h-3" /> {p.email}
          </span>
          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mt-0.5">
            <School className="w-3 h-3" /> {p.institution}
          </span>
        </div>
      ),
    },
    {
      key: "pre_test_score",
      label: "Baseline Score",
      width: "20%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-slate-600">
          {p.pre_test_score}%
        </span>
      ),
    },
    {
      key: "post_test_score",
      label: "Placement Score",
      width: "20%",
      sortable: true,
      render: (p) => (
        <span className="font-mono font-bold text-[#2a7797]">
          {p.post_test_score}%
        </span>
      ),
    },
    {
      key: "has_certificate",
      label: "Internship Certificate",
      width: "20%",
      sortable: true,
      render: (p) =>
        p.has_certificate ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-[10px] font-bold uppercase">
            <CheckCircle2 className="w-3 h-3" /> Issued
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-400 border border-slate-200 rounded-full text-[10px] font-bold uppercase">
            <XCircle className="w-3 h-3" /> Pending
          </span>
        ),
    },
  ];

  return (
    <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#2a7797]" />
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Intern Performance Index
            </h3>
            <p className="text-[11px] font-medium text-slate-400">
              Verify placement scores, operational milestones, and dynamic
              baseline records.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search interns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          <thead>
            <tr className="bg-[#f4f6f7] text-[#55656e] text-[13px] font-bold border-b border-gray-200">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{ width: col.width }}
                  className="py-3 px-4 font-bold"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13px] text-[#2c3a42]">
            {sortedAndFiltered.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-400 font-medium italic"
                >
                  No active interns mapped to this cohort track.
                </td>
              </tr>
            ) : (
              sortedAndFiltered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 hover:bg-slate-50/50"
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="py-3 px-4 align-middle">
                      {col.render
                        ? col.render(p)
                        : String(p[col.key as keyof Intern])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
