"use client";

import React, { use, useMemo, useState } from "react";
import {
  Users,
  Search,
  Mail,
  School,
  CheckCircle2,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import DataTable, { Column } from "../../../../../components/datatable"; // Or import from your components library

interface Participant {
  id: string;
  name: string;
  email: string;
  institution: string;
  pre_test_score: number;
  post_test_score: number;
  has_certificate: boolean;
}

const MOCK_COHORTS_PARTICIPANTS: Record<string, Participant[]> = {
  "tp-1": [
    {
      id: "p-1",
      name: "Dr. Alex Mercer",
      email: "a.mercer@mit.edu",
      institution: "MIT Broad Institute",
      pre_test_score: 72,
      post_test_score: 94,
      has_certificate: true,
    },
    {
      id: "p-2",
      name: "Sarah Chen",
      email: "schen@stanford.edu",
      institution: "Stanford Medicine",
      pre_test_score: 68,
      post_test_score: 98,
      has_certificate: true,
    },
    {
      id: "p-3",
      name: "Michael Abad",
      email: "msabad@up.edu.ph",
      institution: "UP Manila",
      pre_test_score: 55,
      post_test_score: 82,
      has_certificate: false,
    },
  ],
  "tp-2": [
    {
      id: "p-4",
      name: "Dr. Elena Rostova",
      email: "e.rostova@lab.org",
      institution: "BioBiome Labs",
      pre_test_score: 88,
      post_test_score: 100,
      has_certificate: true,
    },
  ],
};

export default function PerformanceTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Participant;
    direction: "asc" | "desc";
  } | null>(null);

  const cohortParticipants = useMemo(() => {
    return MOCK_COHORTS_PARTICIPANTS[resolvedParams.id] || [];
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

  const columns: Column<Participant>[] = [
    {
      key: "name",
      label: "Enrolled Participant",
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
      label: "Pre-Test Score",
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
      label: "Post-Test Score",
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
      label: "Certificate",
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
              Performance Index
            </h3>
            <p className="text-[11px] font-medium text-slate-400">
              Verify scores, progression metrics, and baseline assessments.
            </p>
          </div>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 bg-white border border-gray-200 rounded-full text-xs outline-none focus:ring-2 focus:ring-[#2a7797]/30"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {/* Render standard Table structure with Columns configuration */}
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
            {sortedAndFiltered.map((p) => (
              <tr
                key={p.id}
                className="border-b border-gray-100 hover:bg-slate-50/50"
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className="py-3 px-4 align-middle">
                    {col.render
                      ? col.render(p)
                      : String(p[col.key as keyof Participant])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
