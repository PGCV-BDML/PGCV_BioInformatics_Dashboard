"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Dna,
  Building,
  Activity,
  Plus,
  ExternalLink,
} from "lucide-react";
import AddSampleSidebar, {
  SampleFormState,
} from "../../../components/samplemodal";
import {
  getRowsFromDB,
  getNameIdFromDB,
  getUsersFromDB,
  saveDataToDB,
  getCurrentUser,
  supabase,
} from "@/lib/supabase";
import { syncAnalysisToTaskSafe } from "@/lib/sync-analysis-task";
import { useToast } from "../../../components/toast";
import {
  displayAnalysisLabel,
  labelFromAnalysisStatus,
  mapLabelToAnalysisStatus,
  STATUS_OF_COMPLETION_OPTIONS,
} from "@/lib/analysis-tracker";
import {
  buildClientIdLookup,
  mapClientRowToRecord,
  matchClientByExternalId,
  type ClientMatchStatus,
  type MatchedClientSummary,
  type SupabaseClientRow,
} from "@/lib/clients";
import { routes } from "@/lib/routes";
import { AnalysisStatus, Analysis, Project, Sample, ServiceReport, User, Repository } from "../../../../types/database";

interface SampleRow {
  sample_id: string;
  sample_name: string;
  organism: string;
  status: string;
  metadata?: Record<string, string>;
}

interface ServiceProjectRow {
  id: string;
  project_name: string;
  client: string;
  service_type: string;
  analysis_pipeline: string;
  status: "for_approval" | "ongoing" | "on_hold" | "submitted" | "completed";
  status_of_completion: string;
  status_of_submission: string;
  sample_type: string;
  run_id: string;
  external_client_id: string;
  external_project_id: string;
  client_match: ClientMatchStatus;
  matched_client: MatchedClientSummary | null;
  assignee: string;
  started: string;
  completed: string;
  report_link: string;
  output_link?: string;
  notes: string;
  samples?: SampleRow[];
}

const STATUS_OPTIONS = STATUS_OF_COMPLETION_OPTIONS.map((label) => ({
  value: mapLabelToAnalysisStatus(label)!,
  label,
}));

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { showToast } = useToast();
  const [record, setRecord] = useState<ServiceProjectRow | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runIdRepoUrl, setRunIdRepoUrl] = useState<string | null>(null);

  // Synchronized state object structure matching Collaboration sidebar architecture
  const [formState, setFormState] = useState<SampleFormState>({
    sample_id: "",
    sample_name: "",
    organism: "",
    status: "Pending",
    metadata: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoadError(null);
      try {
        const [analyses, projects, clientRows, services, samples, serviceReports, users, repositories] =
          await Promise.all([
            getRowsFromDB<Analysis>("analysis"),
            getRowsFromDB<Project>("project"),
            getRowsFromDB<SupabaseClientRow>("client"),
            getNameIdFromDB("service"),
            getRowsFromDB<Sample>("sample"),
            getRowsFromDB<ServiceReport>("service_report"),
            getUsersFromDB(["team_lead", "team_member"]),
            getRowsFromDB<Repository>("repository"),
          ]);

        // Build a user id → name map for resolving delivered_by
        const userMapData = new Map<string, string>();
        (users as User[]).forEach((u) => {
          userMapData.set(u.id, u.name ?? u.email ?? u.id);
        });
        setUserMap(userMapData);

        const clients = clientRows.map(mapClientRowToRecord);
        const clientByExternalId = buildClientIdLookup(clients);

        const analysis = analyses.find(
          (a) => a.id === resolvedParams.id,
        );
        if (!analysis) {
          setRecord(null);
          setRunIdRepoUrl(null);
          return;
        }

        const runKey = (analysis.run_id ?? "").trim().toLowerCase();
        const matchedRepo = runKey
          ? repositories.find(
              (r) => (r.run_id ?? "").trim().toLowerCase() === runKey && r.url?.trim(),
            )
          : undefined;
        setRunIdRepoUrl(matchedRepo?.url?.trim() || null);
        const project = analysis.project_id
          ? projects.find((p) => p.id === analysis.project_id)
          : undefined;
        const projectClient = project
          ? clients.find((c) => c.id === project.client_id)
          : null;
        const softMatch = matchClientByExternalId(
          analysis.external_client_id,
          clientByExternalId,
        );
        const service = project
          ? services.find((s) => s.id === project.service_id)
          : null;
        const analysisSamples = analysis.project_id
          ? samples.filter((s) => s.project_id === analysis.project_id)
          : [];
        const foundReport = serviceReports.find(
          (r) => r.analysis_id === analysis.id,
        );
        setReport(foundReport ?? null);

        setProjectId(analysis.project_id);

        const displayRecord: ServiceProjectRow = {
          id: analysis.id,
          project_name:
            analysis.service_report_number ||
            analysis.external_project_id ||
            project?.name ||
            "Untitled analysis",
          client:
            analysis.client_name ||
            softMatch.client?.name ||
            projectClient?.clientName ||
            "—",
          service_type: service?.name ?? analysis.client_type ?? "—",
          analysis_pipeline: displayAnalysisLabel(
            analysis.pipeline,
            analysis.application,
          ),
          status: analysis.status as ServiceProjectRow["status"],
          status_of_completion: analysis.status_of_completion ?? "",
          status_of_submission: analysis.status_of_submission ?? "",
          sample_type: analysis.sample_type ?? "",
          run_id: analysis.run_id ?? "",
          external_client_id: analysis.external_client_id ?? "",
          external_project_id: analysis.external_project_id ?? "",
          client_match: softMatch.status,
          matched_client: softMatch.client,
          assignee: analysis.assignee_id
            ? (userMapData.get(analysis.assignee_id) ?? "—")
            : "Unassigned",
          started: analysis.service_report_date
            ? analysis.service_report_date
            : analysis.started_at
              ? (analysis.started_at.split("T")[0] ?? "")
              : "—",
          completed: analysis.completed_at
            ? (analysis.completed_at.split("T")[0] ?? "")
            : "—",
          report_link:
            analysis.service_report_link || foundReport?.report_link || "",
          output_link:
            analysis.client_sequences_link || analysis.output_link || "",
          notes: analysis.notes ?? "",
          samples: analysisSamples.map((s) => {
            const m = (s.metadata ?? {}) as Record<string, unknown>;
            return {
              sample_id: s.identifier,
              sample_name: (m.sample_name as string) ?? "",
              organism: (m.organism as string) ?? "",
              status: (m.status as string) ?? "Pending",
              metadata: (m.metadata as Record<string, string>) ?? {},
            };
          }),
        };
        setRecord(displayRecord);
      } catch (err) {
        console.error("Error loading analysis detail:", err);
        setLoadError("Failed to load analysis details. Please try again.");
      }
    };
    loadData();
  }, [resolvedParams.id]);

  const handleStatusChange = async (
    newStatus: "for_approval" | "ongoing" | "on_hold" | "submitted" | "completed",
  ) => {
    if (!record) return;
    setIsUpdating(true);
    try {
      const completedAt =
        newStatus === "completed" ? new Date().toISOString() : null;
      const completionLabel = labelFromAnalysisStatus(newStatus);
      const updated = await saveDataToDB("analysis", record.id, {
        status: newStatus,
        status_of_completion: completionLabel,
        completed_at: completedAt,
      });
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status as ServiceProjectRow["status"],
              status_of_completion:
                updated.status_of_completion ?? completionLabel,
              completed: updated.completed_at
                ? (updated.completed_at.split("T")[0] ?? "")
                : "—",
            }
          : null,
      );
      const syncResult = await syncAnalysisToTaskSafe({
        id: updated.id,
        project_id: updated.project_id,
        pipeline: updated.pipeline,
        pipeline_version: updated.pipeline_version,
        status: updated.status as AnalysisStatus,
        assignee_id: updated.assignee_id,
        started_at: updated.started_at,
        completed_at: updated.completed_at,
        projectName: record.project_name,
        serviceReportNumber: updated.service_report_number,
        application: updated.application,
        statusOfCompletion: updated.status_of_completion ?? completionLabel,
      });
      if (syncResult === "error") {
        showToast("Status updated, but the linked task could not be synced.", "error");
      }
    } catch (err) {
      console.error("Error updating analysis status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFormChange = (key: keyof SampleFormState, value: string | number | string[] | boolean | { key: string; value: string }[]) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!record || !projectId) {
      console.error("Cannot add sample without a linked project");
      return;
    }

    setIsSubmitting(true);

    // Compile form-state list entries into an explicit dynamic key-value dictionary schema
    const metadataMap: Record<string, string> = {};
    formState.metadata.forEach((item) => {
      if (item.key.trim()) metadataMap[item.key.trim()] = item.value;
    });

    try {
      await saveDataToDB("sample", crypto.randomUUID(), {
        project_id: projectId,
        identifier: formState.sample_id,
        metadata: {
          sample_name: formState.sample_name,
          organism: formState.organism,
          status: formState.status,
          ...(Object.keys(metadataMap).length > 0 ? { metadata: metadataMap } : {}),
        },
      });
      const newSample: SampleRow = {
        sample_id: formState.sample_id,
        sample_name: formState.sample_name,
        organism: formState.organism,
        status: formState.status,
        metadata: metadataMap,
      };
      setRecord((prev) =>
        prev ? { ...prev, samples: [...(prev.samples || []), newSample] } : null,
      );

      // Reset FormState properties
      setFormState({
        sample_id: "",
        sample_name: "",
        organism: "",
        status: "Pending",
        metadata: [],
      });
      setIsSidebarOpen(false);
    } catch (err) {
      console.error("Error saving sample:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!report?.id) return;
    try {
      const now = new Date().toISOString();
      await saveDataToDB("service_report", report.id, {
        client_acknowledged_at: now,
      });
      setReport((prev) => (prev ? { ...prev, client_acknowledged_at: now } : prev));

      // Audit trail for acknowledgment
      supabase.rpc("audit_data_modification", {
        target_type: "service_report",
        target_id: report.id,
        event_details: { action: "acknowledged" },
      }).then(({ error }) => {
        if (error) console.error("audit_data_modification (acknowledge) failed:", error);
      });
    } catch (err) {
      console.error("Error acknowledging report:", err);
    }
  };

  if (loadError)
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center bg-red-50/50 rounded-2xl border border-dashed border-red-200 p-6 max-w-[600px] mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
        <span className="text-sm font-medium text-red-600">{loadError}</span>
      </div>
    );

  if (!record)
    return <div className="text-center py-24">Loading Workspace Record...</div>;

  const getBadgeStyle = (status: string) => {
    if (status === "completed")
      return "bg-[#eaf7ee] text-[#2e7d32] border-[#2e7d32]/20";
    if (status === "ongoing")
      return "bg-[#fffde7] text-[#f57f17] border-[#f57f17]/20";
    if (status === "on_hold")
      return "bg-slate-100 text-slate-600 border-slate-300/40";
    if (status === "submitted")
      return "bg-[#f3e8ff] text-[#6b21a8] border-[#6b21a8]/20";
    return "bg-blue-50 text-blue-700 border-blue-200/50";
  };

  return (
    <div
      className={`mx-auto font-aileron w-full px-4 py-6 transition-all duration-300 ease-in-out ${
        isSidebarOpen
          ? "max-w-[1140px] pr-[24rem] xl:pr-[28rem]"
          : "max-w-[1240px]"
      }`}
    >
      {/* Top Details Block Banner Content */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/services/tracker"
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand hover:text-[#2a7797] transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Service Report Tracker
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#2a7797] tracking-tight">
              {record.project_name}
            </h1>
            <span
              className={`px-3 py-0.5 rounded-full text-[10px] border uppercase font-bold tracking-wider ${getBadgeStyle(record.status)}`}
            >
              {record.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 shadow-sm rounded-xl">
          <div className="flex flex-col text-right pr-2">
            <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider font-quicksand">
              Assignee Control
            </span>
            <span className="text-xs font-bold text-slate-700">
              {record.assignee}
            </span>
          </div>
          <div className="h-6 w-[1px] bg-slate-200 mx-1" />
          <select
            value={record.status}
            disabled={isUpdating}
            onChange={(e) => handleStatusChange(e.target.value as AnalysisStatus)}
            className="bg-[#f8fafc] text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Move to: {opt.label}
              </option>
            ))}
            {!STATUS_OPTIONS.some((opt) => opt.value === record.status) ? (
              <option value={record.status}>
                Move to: {labelFromAnalysisStatus(record.status)}
              </option>
            ) : null}
          </select>
        </div>
      </div>

      {/* Grid Content Panels View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
            <Dna className="w-5 h-5 text-[#2a7797]" />
            <h2 className="text-xl font-bold text-[#333333]">
              Pipeline Meta Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Analysis Classification
              </span>
              <code className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[#2a7797] font-mono font-bold">
                {record.analysis_pipeline}
              </code>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Sample Type
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {record.sample_type || "—"}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                RUN ID
              </span>
              {record.run_id && runIdRepoUrl ? (
                <a
                  href={runIdRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2a7797] hover:text-[#1f5c76] font-mono underline decoration-dotted"
                  title={runIdRepoUrl}
                >
                  {record.run_id}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              ) : (
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  {record.run_id || "—"}
                </span>
              )}
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Status of Completion
              </span>
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />
                {record.status_of_completion || record.status.replace("_", " ")}
              </span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Status of Submission
              </span>
              <span className="text-xs font-semibold text-slate-700">
                {record.status_of_submission || "—"}
              </span>
            </div>
          </div>

          {record.notes ? (
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Notes / Remarks
              </span>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.notes}</p>
            </div>
          ) : null}

          {/* Connected Processing Samples Log Sub-table Array list */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                <span>Linked Biological Samples Log</span>
                <span className="bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-bold rounded-md text-slate-600">
                  {record.samples?.length || 0} Artifacts
                </span>
              </h3>
              {projectId ? (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#2a7797] hover:text-[#215d76] bg-slate-100 hover:bg-slate-200/70 py-1.5 px-3 rounded-lg transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Sample
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Link a project to add samples
                </span>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left border-collapse table-fixed text-xs">
                <thead>
                  <tr className="bg-slate-50 text-[#55656e] font-bold border-b border-slate-200">
                    <th className="py-2.5 px-4 w-[20%]">Sample ID</th>
                    <th className="py-2.5 px-4 w-[25%]">Target Identifier</th>
                    <th className="py-2.5 px-4 w-[20%]">Organism Host</th>
                    <th className="py-2.5 px-4 w-[25%]">Expected Metadata</th>
                    <th className="py-2.5 px-4 w-[10%] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                  {record.samples?.map((sample, i) => (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-500">
                        {sample.sample_id}
                      </td>
                      <td className="py-2.5 px-4 text-[#11161a] truncate font-bold">
                        {sample.sample_name}
                      </td>
                      <td className="py-2.5 px-4 italic">{sample.organism}</td>
                      <td className="py-2.5 px-4">
                        {sample.metadata &&
                        Object.keys(sample.metadata).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(sample.metadata).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-block text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/50"
                              >
                                <strong className="text-slate-700">{k}:</strong>{" "}
                                {v}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            No metadata linked
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-slate-50 border-slate-200 text-slate-500">
                          {sample.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Deliverables Right Block */}
        <div className="space-y-6">
          <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200/60 pb-2 uppercase tracking-wide">
              Client & Lead Ownership
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                    Client
                  </h4>
                  <p className="text-sm font-bold text-slate-800">
                    {record.client}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                  Client ID
                </h4>
                {record.external_client_id ? (
                  record.client_match === "matched" ? (
                    <Link
                      href={routes.clients.byQuery(record.external_client_id)}
                      className="text-sm font-bold text-[#1b5e20] hover:underline font-mono"
                    >
                      {record.external_client_id}
                    </Link>
                  ) : (
                    <p
                      className="text-sm font-bold text-amber-800/90 font-mono"
                      title="No matching client in Clients module"
                    >
                      {record.external_client_id}
                    </p>
                  )
                ) : (
                  <p className="text-sm font-bold text-slate-800">—</p>
                )}
                {record.client_match === "matched" && record.matched_client ? (
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#2e7d32]">
                      Linked in Clients
                    </p>
                    {record.matched_client.affiliation ? (
                      <p>{record.matched_client.affiliation}</p>
                    ) : null}
                    {record.matched_client.emailAddress ? (
                      <p>{record.matched_client.emailAddress}</p>
                    ) : null}
                    {record.matched_client.designation ? (
                      <p className="text-slate-500">
                        {record.matched_client.designation}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                {record.client_match === "unmatched" ? (
                  <p className="mt-1.5 text-[11px] text-amber-700">
                    No Clients module record matches this ID yet.
                  </p>
                ) : null}
              </div>
              <div>
                <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                  Project ID
                </h4>
                <p className="text-sm font-bold text-slate-800">
                  {record.external_project_id || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Service Report Delivery Panel */}
          <div className="bg-surface border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200/60 pb-2 uppercase tracking-wide">
              Service Report Delivery
            </h3>
            {(record.report_link || report) ? (
              <div className="space-y-3">
                {report ? (
                  <>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                        Delivered By
                      </h4>
                      <p className="text-sm font-bold text-slate-800">
                        {userMap.get(report.delivered_by) ?? report.delivered_by ?? "—"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                        Delivered At
                      </h4>
                      <p className="text-sm font-bold text-slate-800">
                        {report.delivered_at
                          ? new Date(report.delivered_at).toLocaleString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                        Client Acknowledged
                      </h4>
                      <p
                        className={`text-sm font-bold ${report.client_acknowledged_at ? "text-[#2e7d32]" : "text-slate-500"}`}
                      >
                        {report.client_acknowledged_at
                          ? new Date(report.client_acknowledged_at).toLocaleString()
                          : "Pending"}
                      </p>
                    </div>
                  </>
                ) : null}
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                    Report Link
                  </h4>
                  {(record.report_link || report?.report_link) ? (
                    <a
                      href={record.report_link || report?.report_link || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted break-all"
                    >
                      {record.report_link || report?.report_link}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                </div>
                {record.output_link ? (
                  <div>
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                      Client Sequences Link
                    </h4>
                    <a
                      href={record.output_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted break-all"
                    >
                      {record.output_link}
                    </a>
                  </div>
                ) : null}
                {report && !report.client_acknowledged_at && (
                  <button
                    type="button"
                    onClick={handleAcknowledge}
                    className="w-full mt-2 py-2 bg-[#2a7797] hover:bg-[#1f5c76] text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                  >
                    Mark as Acknowledged
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">
                No report link yet. Paste one when creating the record, or use
                &ldquo;Generate Report&rdquo; once completion status is Completed.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Redesigned Sliding Sidebar Drawer Component Wrapper */}
      <AddSampleSidebar
        isOpen={isSidebarOpen}
        isSaving={isSubmitting}
        formState={formState}
        pipeline={record.analysis_pipeline}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
