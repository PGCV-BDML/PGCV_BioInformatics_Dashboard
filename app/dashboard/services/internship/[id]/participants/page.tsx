"use client";

import React, { use, useMemo, useState, useEffect } from "react";
import {
  Users,
  Search,
  Mail,
  School,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import DataTable, { Column } from "../../../../../components/datatable";
import { getRowsFromDB, getUsersFromDB } from "../../../../../../lib/supabase";

interface Intern {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  pre_test_score: number | null;
  post_test_score: number | null;
  has_certificate: boolean;
}

export default function InternshipPerformanceTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [participantsList, setParticipantsList] = useState<Intern[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Intern;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [responses, certificates, users] = await Promise.all([
          getRowsFromDB("assessment_response"),
          getRowsFromDB("certificate"),
          getUsersFromDB(["trainee", "intern", "team_lead", "team_member"]),
        ]);
        const userMap = new Map<string, any>();
        for (const u of users as any[]) userMap.set(u.id, u);
        // ponytail: shows only users with responses/certificates for this program
        // (institution is not in users table — will show null/—)
        const seen = new Set<string>();
        const rows: Intern[] = [];
        for (const r of responses as any[]) {
          const u = userMap.get(r.participant_id);
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            rows.push({
              id: u.id,
              name: u.name,
              email: u.email,
              institution: null as any,
              pre_test_score: null,
              post_test_score: r.score,
              has_certificate: false,
            });
          }
        }
        for (const c of certificates as any[]) {
          const existing = rows.find((r) => r.id === c.participant_id);
          if (existing) existing.has_certificate = true;
          else {
            const u = userMap.get(c.participant_id);
            if (u) {
              rows.push({
                id: u.id, name: u.name, email: u.email,
                institution: null as any,
                pre_test_score: null, post_test_score: null,
                has_certificate: true,
              });
            }
          }
        }
        setParticipantsList(rows);
      } catch (err) {
        console.error("Error loading interns:", err);
      }
    };
    load();
  }, [resolvedParams.id]);

  const handleSort = (key: keyof Intern) => {
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
    let result = [...participantsList];
    const q = searchQuery.toLowerCase().trim();

    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.institution ?? "").toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "string" && typeof valB === "string") {
          const stringA = valA.toLowerCase();
          const stringB = valB.toLowerCase();
          if (stringA < stringB) return sortConfig.direction === "asc" ? -1 : 1;
          if (stringA > stringB) return sortConfig.direction === "asc" ? 1 : -1;
        } else if (valA != null && valB != null) {
          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [participantsList, searchQuery, sortConfig]);

  const columns: Column<Intern>[] = [
    {
      key: "name",
      label: "Enrolled Intern",
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
            <School className="w-3.5 h-3.5 text-slate-400" /> {p.institution ?? "—"}
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
          {p.pre_test_score ?? "—"}
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
          {p.post_test_score ?? "—"}
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
              Intern Performance Index
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
            placeholder="Search interns..."
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
          emptyMessage="No active interns mapped to this cohort track."
        />
      </div>
    </div>
  );
}
