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
import type {
  Assessment,
  AssessmentResponse,
  Certificate,
  User,
} from "@/types/database";

interface Trainee {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  pre_test_score: number | null;
  post_test_score: number | null;
  has_certificate: boolean;
}

export default function TrainingPerformanceTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [participantsList, setParticipantsList] = useState<Trainee[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Trainee;
    direction: "asc" | "desc";
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [assessments, responses, certificates, users] = await Promise.all([
        getRowsFromDB<Assessment>("assessment"),
        getRowsFromDB<AssessmentResponse>("assessment_response"),
        getRowsFromDB<Certificate>("certificate"),
        getUsersFromDB(["trainee", "intern", "team_lead", "team_member"]),
      ]);
      const programAssessmentIds = assessments
        .filter((a) => a.program_id === resolvedParams.id)
        .map((a) => a.id);
      const programResponses = responses.filter((r) =>
        programAssessmentIds.includes(r.assessment_id),
      );
      const programCertificates = certificates.filter(
        (c) => c.program_id === resolvedParams.id,
      );
      // Build assessment type map for score disambiguation
      const assessmentTypeMap = new Map<string, string>();
      for (const a of assessments) {
        if (a.program_id === resolvedParams.id) {
          assessmentTypeMap.set(a.id, a.type);
        }
      }
      const userMap = new Map<string, User>();
      for (const u of users) userMap.set(u.id, u);
      // ponytail: shows only users with responses/certificates for this program
      // (institution now comes from users.institution — added 2026-07-21)
      const seen = new Set<string>();
      const rows: Trainee[] = [];
      for (const r of programResponses) {
        const u = userMap.get(r.participant_id);
        if (u && !seen.has(u.id)) {
          seen.add(u.id);
          const assessmentType = assessmentTypeMap.get(r.assessment_id);
          rows.push({
            id: u.id,
            name: u.name,
            email: u.email,
            institution: u.institution ?? null, // ponytail: institution now comes from users.institution (added 2026-07-21)
            pre_test_score: assessmentType === "pre_test" ? r.score : null,
            post_test_score: assessmentType === "post_test" ? r.score : null,
            has_certificate: false,
          });
        }
      }
      for (const c of programCertificates) {
        const existing = rows.find((r) => r.id === c.participant_id);
        if (existing) existing.has_certificate = true;
        else {
          const u = userMap.get(c.participant_id);
          if (u) {
            rows.push({
              id: u.id, name: u.name, email: u.email,
              institution: u.institution ?? null,
              pre_test_score: null, post_test_score: null,
              has_certificate: true,
            });
          }
        }
      }
      setParticipantsList(rows);
    };
    load();
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
    let result = [...participantsList];
    const q = searchQuery.toLowerCase().trim();

    // 1. Filter matches
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.institution ?? "").toLowerCase().includes(q) ||
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
        } else if (valA != null && valB != null) {
          if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
          if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return result;
  }, [participantsList, searchQuery, sortConfig]);

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
    <div className="font-aileron bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20 space-y-6">
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
            aria-label="Search participants"
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
