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
import { AnalysisStatus, Analysis, Project, Sample, ServiceReport, User } from "../../../../types/database";

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
  assignee: string;
  started: string;
  completed: string;
  report_link: string;
  output_link?: string;
  samples?: SampleRow[];
}

const STATUS_OPTIONS = [
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "on_hold", label: "On Hold" },
  { value: "submitted", label: "Submitted" },
  { value: "completed", label: "Completed" },
];

export default function AnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [record, setRecord] = useState<ServiceProjectRow | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [report, setReport] = useState<ServiceReport | null>(null);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        const [analyses, projects, clients, services, samples, serviceReports, users] =
          await Promise.all([
            getRowsFromDB<Analysis>("analysis"),
            getRowsFromDB<Project>("project"),
            getNameIdFromDB("client"),
            getNameIdFromDB("service"),
            getRowsFromDB<Sample>("sample"),
            getRowsFromDB<ServiceReport>("service_report"),
            getUsersFromDB(["team_lead", "team_member"]),
          ]);

        // Build a user id → name map for resolving delivered_by
        const userMapData = new Map<string, string>();
        (users as User[]).forEach((u) => {
          userMapData.set(u.id, u.name ?? u.email ?? u.id);
        });
        setUserMap(userMapData);

        const analysis = analyses.find(
          (a) => a.id === resolvedParams.id,
        );
        if (!analysis) {
          setRecord(null);
          return;
        }
        const project = projects.find(
          (p) => p.id === analysis.project_id,
        );
        const client = project
          ? clients.find((c) => c.id === project.client_id)
          : null;
        const service = project
          ? services.find((s) => s.id === project.service_id)
          : null;
        const analysisSamples = samples.filter(
          (s) => s.project_id === analysis.project_id,
        );
        const foundReport = serviceReports.find(
          (r) => r.analysis_id === analysis.id,
        );
        setReport(foundReport ?? null);

        setProjectId(analysis.project_id);

        const displayRecord: ServiceProjectRow = {
          id: analysis.id,
          project_name: project?.name ?? "(unknown project)",
          client: client?.name ?? "—",
          service_type: service?.name ?? "—",
          analysis_pipeline:
            `${analysis.pipeline ?? ""} ${analysis.pipeline_version ?? ""}`.trim() || "—",
          status: analysis.status as ServiceProjectRow["status"],
          assignee: userMapData.get(analysis.assignee_id) ?? "—",
          started: analysis.started_at ? analysis.started_at.split("T")[0] ?? "" : "—",
          completed: analysis.completed_at
            ? analysis.completed_at.split("T")[0] ?? ""
            : "—",
          report_link: foundReport?.report_link ?? "",
          output_link: analysis.output_link ?? "",
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
      const updated = await saveDataToDB("analysis", record.id, {
        status: newStatus,
        completed_at: completedAt,
      });
      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status as ServiceProjectRow["status"],
              completed: updated.completed_at
                ? updated.completed_at.split("T")[0] ?? ""
                : "—",
            }
          : null,
      );
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
    if (!record || !projectId) return;

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
            href="/dashboard/services"
            className="flex items-center gap-1.5 text-[10px] font-bold text-[#7a8e9b] uppercase tracking-[2px] font-quicksand hover:text-[#2a7797] transition-colors mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Services Queue
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
          </select>
        </div>
      </div>

      {/* Grid Content Panels View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
            <Dna className="w-5 h-5 text-[#2a7797]" />
            <h2 className="text-xl font-bold text-[#333333]">
              Pipeline Meta Details
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Analysis Pipeline
              </span>
              <code className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[#2a7797] font-mono font-bold">
                {record.analysis_pipeline}
              </code>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Service Category Type
              </span>
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-400" />{" "}
                {record.service_type}
              </span>
            </div>
          </div>

          {/* Connected Processing Samples Log Sub-table Array list */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 tracking-tight flex items-center gap-1.5">
                <span>Linked Biological Samples Log</span>
                <span className="bg-slate-200/60 px-1.5 py-0.5 text-[10px] font-bold rounded-md text-slate-600">
                  {record.samples?.length || 0} Artifacts
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#2a7797] hover:text-[#215d76] bg-slate-100 hover:bg-slate-200/70 py-1.5 px-3 rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Sample
              </button>
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
          <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200/60 pb-2 uppercase tracking-wide">
              Client & Lead Ownership
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Building className="w-4 h-4 text-slate-400 mt-0.5" />
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                    Client Laboratory
                  </h4>
                  <p className="text-sm font-bold text-slate-800">
                    {record.client}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Service Report Delivery Panel */}
          <div className="bg-[#fffdf8] border border-slate-300/70 rounded-[24px] p-6 shadow-xl shadow-slate-400/10 space-y-4">
            <h3 className="text-sm font-bold text-slate-700 border-b border-slate-200/60 pb-2 uppercase tracking-wide">
              Service Report Delivery
            </h3>
            {report ? (
              <div className="space-y-3">
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
                <div>
                  <h4 className="text-[10px] text-slate-400 font-bold uppercase">
                    Report Link
                  </h4>
                  {report.report_link ? (
                    <a
                      href={report.report_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#2a7797] hover:text-[#4ec2bb] font-bold underline decoration-dotted break-all"
                    >
                      {report.report_link}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-500">—</p>
                  )}
                </div>
                {!report.client_acknowledged_at && (
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
                No report delivered yet. Use the &ldquo;Generate Report&rdquo; button on the services queue
                once the analysis is marked as completed.
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
