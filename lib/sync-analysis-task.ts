import {
  replaceTaskAssignees,
  replaceTaskCategories,
  saveDataToDB,
  supabase,
} from "@/lib/supabase";
import { resolveTaskStartDate, toDateKey } from "@/lib/calendar-tasks";
import {
  displayAnalysisLabel,
  isCancelledCompletionLabel,
} from "@/lib/analysis-tracker";
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
  /**
   * Raw tracker completion label. Needed because "Cancelled" has no
   * `analysis_status` enum value and so cannot be read off `status`.
   */
  statusOfCompletion?: string | null;
};

/**
 * Roll the analysis status up to the coarse task status used by filters, the
 * calendar, and dashboard counts. The tracker label remains the thing users
 * read on a linked task — see `analysisStatusLabel`.
 *
 * Note `pending` is intentionally unreachable: an analysis that has not started
 * does not get a task at all.
 */
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
  }
}

/** Remove a linked task and its tags/assignees (CASCADE also covers junction rows). */
async function deleteLinkedTask(taskId: string): Promise<void> {
  const { error: tagError } = await supabase
    .from("task_tag")
    .delete()
    .eq("task_id", taskId);
  if (tagError) {
    console.error("Error clearing tags for linked task:", tagError);
    throw tagError;
  }

  const { error: assigneeError } = await supabase
    .from("task_assignee")
    .delete()
    .eq("task_id", taskId);
  if (assigneeError) {
    console.error("Error clearing assignees for linked task:", assigneeError);
    throw assigneeError;
  }

  const { error } = await supabase.from("task").delete().eq("id", taskId);
  if (error) {
    console.error("Error deleting linked task:", error);
    throw error;
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

export type AnalysisSyncOutcome =
  | "created"
  | "updated"
  | "deleted"
  | "skipped_no_assignee"
  | "skipped";

/**
 * Upsert a task linked to a sequence analysis so it appears on Tasks + Calendar.
 * Skips when assignee is blank (a new analysis task needs someone to own it).
 * Creates a new task only when analysis status is `ongoing`; existing linked
 * tasks are still updated on later status changes (e.g. completed / on hold).
 * A cancelled analysis has its linked task removed.
 * Always tags with `sequence_analysis`; preserves any extra categories on update.
 */
async function runAnalysisSync(
  analysis: AnalysisSyncInput,
  options?: { priority?: TaskPriority },
): Promise<{ outcome: AnalysisSyncOutcome; task: Task | null }> {
  // Cancelled work carries no task. Checked before the assignee guard so that
  // cancelling always cleans up, even if the assignee was cleared in the same edit.
  if (isCancelledCompletionLabel(analysis.statusOfCompletion)) {
    const existing = await findTaskByAnalysisId(analysis.id);
    if (!existing) return { outcome: "skipped", task: null };
    await deleteLinkedTask(existing.id);
    return { outcome: "deleted", task: null };
  }

  if (!analysis.assignee_id) {
    return {
      outcome: analysis.status === "ongoing" ? "skipped_no_assignee" : "skipped",
      task: null,
    };
  }

  const existing = await findTaskByAnalysisId(analysis.id);

  // New tasks are only created for on-going sequence analyses.
  if (!existing && analysis.status !== "ongoing") {
    return { outcome: "skipped", task: null };
  }

  const day =
    (existing ? resolveTaskStartDate(existing) : null) ??
    dueDateFromAnalysis(analysis);

  const payload: Omit<TaskRecord, "id"> = {
    title: buildAnalysisTaskTitle(analysis),
    assignee_id: analysis.assignee_id,
    start_date: day,
    end_date: day,
    due_date: day,
    task_time: existing?.task_time ?? null,
    details: existing?.details ?? null,
    status: mapAnalysisStatusToTask(analysis.status),
    priority: options?.priority ?? existing?.priority ?? "medium",
    linked_project_id: analysis.project_id,
    linked_analysis_id: analysis.id,
    is_personal: false,
    updated_at: new Date().toISOString(),
  };

  const taskId = existing?.id ?? crypto.randomUUID();
  await saveDataToDB("task", taskId, payload);
  await replaceTaskAssignees(taskId, [analysis.assignee_id]);

  let categories: TaskCategory[] = ["sequence_analysis"];
  if (existing) {
    const { data: tags, error: tagError } = await supabase
      .from("task_tag")
      .select("category")
      .eq("task_id", taskId);
    if (tagError) {
      console.error("Error reading tags for linked task:", tagError);
      throw tagError;
    }
    const current = (tags ?? []).map((t) => t.category as TaskCategory);
    categories = current.includes("sequence_analysis")
      ? current
      : [...current, "sequence_analysis"];
  }
  await replaceTaskCategories(taskId, categories);

  return {
    outcome: existing ? "updated" : "created",
    task: {
      id: taskId,
      ...payload,
      categories,
      assignee_ids: [analysis.assignee_id],
    },
  };
}

export async function syncAnalysisToTask(
  analysis: AnalysisSyncInput,
  options?: { priority?: TaskPriority },
): Promise<Task | null> {
  const { task } = await runAnalysisSync(analysis, options);
  return task;
}

/** Best-effort sync used from UI write paths; logs but does not rethrow by default. */
export async function syncAnalysisToTaskSafe(
  analysis: AnalysisSyncInput,
): Promise<AnalysisSyncOutcome | "error"> {
  try {
    const { outcome } = await runAnalysisSync(analysis);
    return outcome;
  } catch (err) {
    console.error("Failed to sync analysis → task:", err);
    return "error";
  }
}

/** Backfill: create tasks for ongoing analyses that do not yet have a linked task. */
export async function backfillAnalysisTasks(
  analyses: Analysis[],
  projectNameById: Map<string, string>,
): Promise<number> {
  let created = 0;
  for (const analysis of analyses) {
    if (!analysis.assignee_id) continue;
    if (analysis.status !== "ongoing") continue;
    const existing = await findTaskByAnalysisId(analysis.id);
    if (existing) continue;
    const result = await syncAnalysisToTask({
      ...analysis,
      projectName: analysis.project_id
        ? (projectNameById.get(analysis.project_id) ?? null)
        : (analysis.client_name ?? null),
      serviceReportNumber: analysis.service_report_number,
      application: analysis.application,
      statusOfCompletion: analysis.status_of_completion,
    });
    if (result) created += 1;
  }
  return created;
}
