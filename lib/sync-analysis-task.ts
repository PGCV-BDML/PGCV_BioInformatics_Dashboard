import {
  replaceTaskCategories,
  saveDataToDB,
  supabase,
} from "@/lib/supabase";
import { toDateKey } from "@/lib/calendar-tasks";
import { displayAnalysisLabel } from "@/lib/analysis-tracker";
import type {
  Analysis,
  AnalysisStatus,
  Task,
  TaskCategory,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from "@/types/database";

export type AnalysisSyncInput = {
  id: string;
  project_id: string | null;
  pipeline: string | null;
  pipeline_version: string | null;
  status: AnalysisStatus;
  assignee_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  /** Optional display name for the project (used in task title). */
  projectName?: string | null;
  serviceReportNumber?: string | null;
  application?: string | null;
};

function mapAnalysisStatusToTask(status: AnalysisStatus): TaskStatus {
  switch (status) {
    case "on_hold":
      return "on_hold";
    case "completed":
      return "completed";
    case "ongoing":
    case "submitted":
    case "for_approval":
      return "in_progress";
    default:
      return "pending";
  }
}

function dueDateFromAnalysis(analysis: AnalysisSyncInput): string {
  const raw = analysis.started_at ?? analysis.completed_at;
  if (raw) {
    return raw.includes("T") ? raw.split("T")[0]! : raw.slice(0, 10);
  }
  return toDateKey(new Date());
}

export function buildAnalysisTaskTitle(analysis: AnalysisSyncInput): string {
  const pipeline = displayAnalysisLabel(
    analysis.pipeline,
    analysis.application,
  );
  const pipelineBit = pipeline === "—" ? "" : pipeline;
  const projectBit =
    analysis.serviceReportNumber?.trim() ||
    analysis.projectName?.trim() ||
    "";
  if (pipelineBit && projectBit) return `${pipelineBit} — ${projectBit}`;
  if (pipelineBit) return `Sequence Analysis: ${pipelineBit}`;
  if (projectBit) return `Sequence Analysis — ${projectBit}`;
  return "Sequence Analysis";
}

async function findTaskByAnalysisId(analysisId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .eq("linked_analysis_id", analysisId)
    .maybeSingle();

  if (error) {
    console.error("Error finding task by analysis id:", error);
    throw error;
  }
  return (data as Task | null) ?? null;
}

/**
 * Upsert a task linked to a sequence analysis so it appears on Tasks + Calendar.
 * Skips when assignee is blank (task.assignee_id is required).
 * Always tags with `sequence_analysis`; preserves any extra categories on update.
 */
export async function syncAnalysisToTask(
  analysis: AnalysisSyncInput,
  options?: { priority?: TaskPriority },
): Promise<Task | null> {
  if (!analysis.assignee_id) {
    return null;
  }

  const existing = await findTaskByAnalysisId(analysis.id);
  const payload: Omit<TaskRecord, "id"> = {
    title: buildAnalysisTaskTitle(analysis),
    assignee_id: analysis.assignee_id,
    due_date: existing?.due_date ?? dueDateFromAnalysis(analysis),
    status: mapAnalysisStatusToTask(analysis.status),
    priority: options?.priority ?? existing?.priority ?? "medium",
    linked_project_id: analysis.project_id,
    linked_analysis_id: analysis.id,
    updated_at: new Date().toISOString(),
  };

  const taskId = existing?.id ?? crypto.randomUUID();
  await saveDataToDB("task", taskId, payload);

  const existingCategories = existing?.categories;
  if (existing) {
    const { data: tags } = await supabase
      .from("task_tag")
      .select("category")
      .eq("task_id", taskId);
    const current = (tags ?? []).map((t) => t.category as TaskCategory);
    const next = current.includes("sequence_analysis")
      ? current
      : [...current, "sequence_analysis" as const];
    await replaceTaskCategories(taskId, next.length ? next : ["sequence_analysis"]);
  } else {
    await replaceTaskCategories(taskId, ["sequence_analysis"]);
  }

  return { id: taskId, ...payload, categories: existingCategories ?? ["sequence_analysis"] };
}

/** Best-effort sync used from UI write paths; logs but does not rethrow by default. */
export async function syncAnalysisToTaskSafe(
  analysis: AnalysisSyncInput,
): Promise<void> {
  try {
    await syncAnalysisToTask(analysis);
  } catch (err) {
    console.error("Failed to sync analysis → task:", err);
  }
}

/** Backfill: create tasks for analyses that do not yet have a linked task. */
export async function backfillAnalysisTasks(
  analyses: Analysis[],
  projectNameById: Map<string, string>,
): Promise<number> {
  let created = 0;
  for (const analysis of analyses) {
    if (!analysis.assignee_id) continue;
    const existing = await findTaskByAnalysisId(analysis.id);
    if (existing) continue;
    const result = await syncAnalysisToTask({
      ...analysis,
      projectName: analysis.project_id
        ? (projectNameById.get(analysis.project_id) ?? null)
        : (analysis.client_name ?? null),
      serviceReportNumber: analysis.service_report_number,
      application: analysis.application,
    });
    if (result) created += 1;
  }
  return created;
}
