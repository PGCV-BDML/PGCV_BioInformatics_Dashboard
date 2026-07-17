"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft,
  Dna,
  FileText,
  ExternalLink,
  User,
  Building,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
} from "lucide-react";
import AddSampleSidebar, {
  SampleFormState,
} from "../../../components/samplemodal";

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
  status: "for_approval" | "ongoing" | "finished";
  assignee: string;
  started: string;
  completed: string;
  report_link: string;
  output_link?: string;
  samples?: SampleRow[];
}

const MOCK_SERVICES_DATA: ServiceProjectRow[] = [
  {
    id: "srv-1",
    project_name: "Tumor Exome Alignment Alpha",
    client: "Apex Oncology Lab",
    service_type: "Sequence Analysis",
    analysis_pipeline: "WES-GATK v4.2",
    status: "ongoing",
    assignee: "Dr. Alex Jones",
    started: "2026-02-10",
    completed: "—",
    report_link: "https://drive.google.com/wes-alpha",
    output_link: "https://github.com/bio-pipelines/wes-alpha-output",
    samples: [
      {
        sample_id: "SMP-001",
        sample_name: "Primary_Tumor_01",
        organism: "Homo sapiens",
        status: "Aligned",
        metadata: { "Target Coverage": "120x", Sequencer: "Illumina NovaSeq" },
      },
    ],
  },
];

const STATUS_OPTIONS = [
  { value: "for_approval", label: "For Approval" },
  { value: "ongoing", label: "On-going" },
  { value: "finished", label: "Finished" },
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

  // Synchronized state object structure matching Collaboration sidebar architecture
  const [formState, setFormState] = useState<SampleFormState>({
    sample_id: "",
    sample_name: "",
    organism: "",
    status: "Pending",
    metadata: [],
  });

  useEffect(() => {
    const targetRecord = MOCK_SERVICES_DATA.find(
      (item) => item.id === resolvedParams.id,
    );
    if (targetRecord) setRecord(targetRecord);
  }, [resolvedParams.id]);

  const handleStatusChange = (
    newStatus: "for_approval" | "ongoing" | "finished",
  ) => {
    if (!record) return;
    setIsUpdating(true);
    setTimeout(() => {
      setRecord((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: newStatus,
          completed:
            newStatus === "finished"
              ? new Date().toISOString().split("T")[0]
              : "—",
        };
      });
      setIsUpdating(false);
    }, 400);
  };

  const handleFormChange = (key: keyof SampleFormState, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;

    // Compile form-state list entries into an explicit dynamic key-value dictionary schema
    const metadataMap: Record<string, string> = {};
    formState.metadata.forEach((item) => {
      if (item.key.trim()) metadataMap[item.key.trim()] = item.value;
    });

    const newSample: SampleRow = {
      sample_id: formState.sample_id,
      sample_name: formState.sample_name,
      organism: formState.organism,
      status: formState.status,
      metadata: metadataMap,
    };

    setRecord((prev) => {
      if (!prev) return null;
      return { ...prev, samples: [...(prev.samples || []), newSample] };
    });

    // Reset FormState properties
    setFormState({
      sample_id: "",
      sample_name: "",
      organism: "",
      status: "Pending",
      metadata: [],
    });
    setIsSidebarOpen(false);
  };

  if (!record)
    return <div className="text-center py-24">Loading Workspace Record...</div>;

  const getBadgeStyle = (status: string) => {
    if (status === "finished")
      return "bg-[#eaf7ee] text-[#2e7d32] border-[#2e7d32]/20";
    if (status === "ongoing")
      return "bg-[#fffde7] text-[#f57f17] border-[#f57f17]/20";
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
            onChange={(e) => handleStatusChange(e.target.value as any)}
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
        </div>
      </div>

      {/* Redesigned Sliding Sidebar Drawer Component Wrapper */}
      <AddSampleSidebar
        isOpen={isSidebarOpen}
        formState={formState}
        pipeline={record.analysis_pipeline}
        onClose={() => setIsSidebarOpen(false)}
        onChange={handleFormChange}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
}
