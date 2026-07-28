"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Link2,
  ExternalLink,
  Search,
  Dna,
  FolderGit2,
  Inbox,
} from "lucide-react";
import { PageHeader } from "../../components/pageheader";
import { LoadingState, ErrorState, EmptyState } from "../../components/state-views";
import { getRowsFromDB, getNameIdFromDB } from "@/lib/supabase";
import { repositoriesBreadcrumbs } from "@/lib/breadcrumbs";
import { routes } from "@/lib/routes";
import type { Project, UserOption } from "../../../types/database";

type RepoRow = {
  id: string;
  name: string;
  client_name: string;
  repository_link: string | null;
  run_id: string | null;
};

export default function RepositoriesPage() {
  const [rows, setRows] = useState<RepoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [projects, clients] = await Promise.all([
          getRowsFromDB<Project>("project"),
          getNameIdFromDB("client"),
        ]);
        if (cancelled) return;

        const clientMap = new Map(
          (clients as UserOption[]).map((c) => [c.id, c.name]),
        );

        const mapped: RepoRow[] = projects
          .filter((p) => Boolean(p.repository_link?.trim() || p.run_id?.trim()))
          .map((p) => ({
            id: p.id,
            name: p.name,
            client_name: clientMap.get(p.client_id) ?? "—",
            repository_link: p.repository_link ?? null,
            run_id: p.run_id ?? null,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setRows(mapped);
      } catch (err) {
        console.error("Failed to load repositories:", err);
        if (!cancelled) {
          setLoadError("Couldn't load repository assets. Please refresh the page.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.client_name.toLowerCase().includes(q) ||
        (r.run_id ?? "").toLowerCase().includes(q) ||
        (r.repository_link ?? "").toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  return (
    <div className="space-y-8 max-w-[1240px] mx-auto pb-16 w-full font-aileron">
      <PageHeader
        breadcrumbTrail={repositoriesBreadcrumbs}
        title="Source Repositories"
        subtitle="Repository links and sequencer run IDs linked to the Service Report Tracker"
        actions={
          <div className="relative w-full min-[480px]:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search repositories..."
              aria-label="Search repositories"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-surface rounded-full border border-gray-200 text-xs outline-none focus:ring-2 focus:ring-[#4ec2bb] shadow-sm transition-all"
            />
          </div>
        }
      />

      <div className="bg-surface border border-slate-300/70 rounded-[24px] p-4 md:p-6 shadow-xl shadow-slate-400/20">
        <div className="flex items-center gap-2 mb-5">
          <FolderGit2 className="w-5 h-5 text-[#333333]" />
          <h2 className="text-2xl font-bold text-[#333333]">Repository Assets</h2>
          <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <p className="text-xs text-slate-500 mb-5 font-aileron">
          Add or edit a Run ID under{" "}
          <Link
            href={routes.projects.list}
            className="text-[#2a7797] font-bold underline decoration-dotted"
          >
            Projects → Repository Assets
          </Link>
          . Matching values open the Service Report Tracker filtered to that RUN ID.
        </p>

        {isLoading ? (
          <LoadingState message="Loading repository assets…" />
        ) : loadError ? (
          <ErrorState message={loadError} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No repository assets yet"
            description="Attach a repository link or run ID on a project to see it here."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col gap-3"
              >
                <div>
                  <h3 className="text-sm font-bold text-slate-800 leading-snug">
                    {row.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{row.client_name}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {row.repository_link ? (
                    <a
                      href={row.repository_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-slate-200 text-[11px] font-bold text-[#2a7797] hover:border-[#2a7797]/40 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Repo
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ) : null}

                  {row.run_id ? (
                    <Link
                      href={routes.services.trackerByRunId(row.run_id)}
                      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f8eef7] border border-[#92298d]/25 text-[11px] font-bold text-[#92298d] hover:bg-[#f1e0ef] transition-colors font-mono"
                      title="Open matching Service Report Tracker row"
                    >
                      <Dna className="w-3.5 h-3.5" />
                      {row.run_id}
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No run ID</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
