import type {
  Repository,
  SequencingRun,
  SequencingRunChecklistItem,
  SequencingRunChecklistItemFormData,
  SequencingRunFormData,
  SequencingRunWithRepository,
  UserOption,
} from "@/types/database";

export const EMPTY_SEQUENCING_RUN_FORM: SequencingRunFormData = {
  repository_id: "",
  date_received: "",
  notes: "",
};

export const EMPTY_CHECKLIST_ITEM_FORM: SequencingRunChecklistItemFormData = {
  client_name: "",
  analysis_type: "",
  sample_count: "",
  analyst_ids: [],
  is_complete: false,
};

export function repositoryHasRunId(repo: Pick<Repository, "run_id">): boolean {
  return Boolean(repo.run_id?.trim());
}

/** Repositories eligible for a new checklist run (has run_id, not already used). */
export function eligibleRepositoriesForNewRun(
  repositories: Repository[],
  usedRepositoryIds: Set<string>,
): Repository[] {
  return repositories.filter(
    (repo) => repositoryHasRunId(repo) && !usedRepositoryIds.has(repo.id),
  );
}

export function repositoriesMissingRunId(
  repositories: Repository[],
): Repository[] {
  return repositories.filter((repo) => !repositoryHasRunId(repo));
}

export function runFormToPayload(form: SequencingRunFormData) {
  return {
    repository_id: form.repository_id.trim(),
    date_received: form.date_received.trim(),
    notes: form.notes.trim() || null,
  };
}

export function checklistItemFormToPayload(
  form: SequencingRunChecklistItemFormData,
  sequencingRunId: string,
  sortOrder: number,
) {
  const sampleRaw = form.sample_count.trim();
  return {
    sequencing_run_id: sequencingRunId,
    client_name: form.client_name.trim(),
    analysis_type: form.analysis_type.trim(),
    sample_count: sampleRaw === "" ? 0 : Number(sampleRaw),
    is_complete: form.is_complete,
    sort_order: sortOrder,
  };
}

export function toChecklistItemFormData(
  item: SequencingRunChecklistItem,
): SequencingRunChecklistItemFormData {
  return {
    client_name: item.client_name,
    analysis_type: item.analysis_type,
    sample_count: String(item.sample_count),
    analyst_ids: item.analyst_ids ?? [],
    is_complete: item.is_complete,
  };
}

export function sortRunsNewestFirst(
  runs: SequencingRunWithRepository[],
): SequencingRunWithRepository[] {
  return [...runs].sort((a, b) => {
    const dateCmp = b.date_received.localeCompare(a.date_received);
    if (dateCmp !== 0) return dateCmp;
    return (b.run_id ?? "").localeCompare(a.run_id ?? "");
  });
}

export function formatAnalystNames(
  analystIds: string[],
  usersById: Map<string, UserOption>,
): string {
  if (analystIds.length === 0) return "—";
  const names = analystIds
    .map((id) => usersById.get(id)?.name)
    .filter((name): name is string => Boolean(name?.trim()));
  return names.length > 0 ? names.join(", ") : "—";
}

export function buildRunsWithRepository(
  runs: SequencingRun[],
  repositories: Repository[],
  items: SequencingRunChecklistItem[],
  analystsByItemId: Map<string, string[]>,
): SequencingRunWithRepository[] {
  const repoById = new Map(repositories.map((repo) => [repo.id, repo]));
  const itemsByRunId = new Map<string, SequencingRunChecklistItem[]>();

  for (const item of items) {
    const enriched: SequencingRunChecklistItem = {
      ...item,
      analyst_ids: analystsByItemId.get(item.id) ?? [],
    };
    const list = itemsByRunId.get(item.sequencing_run_id) ?? [];
    list.push(enriched);
    itemsByRunId.set(item.sequencing_run_id, list);
  }

  return runs.map((run) => {
    const repo = repoById.get(run.repository_id);
    const runItems = (itemsByRunId.get(run.id) ?? []).sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        (a.created_at ?? "").localeCompare(b.created_at ?? ""),
    );
    return {
      ...run,
      repository_title: repo?.title ?? "Unknown repository",
      repository_url: repo?.url ?? "",
      run_id: repo?.run_id ?? null,
      items: runItems,
    };
  });
}

export function nextChecklistSortOrder(items: SequencingRunChecklistItem[]): number {
  if (items.length === 0) return 10;
  return Math.max(...items.map((item) => item.sort_order)) + 10;
}

export function validateChecklistItemForm(
  form: SequencingRunChecklistItemFormData,
): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!form.client_name.trim()) {
    errs.client_name = "Client name is required";
  }
  if (!form.analysis_type.trim()) {
    errs.analysis_type = "Analysis type is required";
  }
  const sampleRaw = form.sample_count.trim();
  if (sampleRaw === "") {
    errs.sample_count = "Sample count is required";
  } else {
    const count = Number(sampleRaw);
    if (!Number.isInteger(count) || count < 0) {
      errs.sample_count = "Enter a non-negative whole number";
    }
  }
  return errs;
}

export function validateRunForm(
  form: SequencingRunFormData,
  repositories: Repository[],
): Record<string, string> {
  const errs: Record<string, string> = {};
  const repoId = form.repository_id.trim();
  if (!repoId) {
    errs.repository_id = "Select a repository link";
  } else {
    const repo = repositories.find((row) => row.id === repoId);
    if (!repo) {
      errs.repository_id = "Repository link not found";
    } else if (!repositoryHasRunId(repo)) {
      errs.repository_id = "Add run ID on Repository first.";
    }
  }
  if (!form.date_received.trim()) {
    errs.date_received = "Date received is required";
  }
  return errs;
}
