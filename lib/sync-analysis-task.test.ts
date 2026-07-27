import { describe, expect, it } from "vitest";
import { buildAnalysisTaskTitle } from "./sync-analysis-task";
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from "./task-categories";

describe("buildAnalysisTaskTitle", () => {
  it("combines pipeline and project name", () => {
    expect(
      buildAnalysisTaskTitle({
        id: "1",
        project_id: "p",
        pipeline: "WGS",
        pipeline_version: "v1.0",
        status: "ongoing",
        assignee_id: "u",
        started_at: null,
        completed_at: null,
        projectName: "Coral Project",
      }),
    ).toBe("WGS v1.0 — Coral Project");
  });

  it("falls back when project name is missing", () => {
    expect(
      buildAnalysisTaskTitle({
        id: "1",
        project_id: "p",
        pipeline: "RNA-seq",
        pipeline_version: null,
        status: "ongoing",
        assignee_id: "u",
        started_at: null,
        completed_at: null,
      }),
    ).toBe("Sequence Analysis: RNA-seq");
  });
});

describe("TASK_CATEGORIES", () => {
  it("includes the twelve planned category tags", () => {
    expect(TASK_CATEGORIES).toHaveLength(12);
    expect(TASK_CATEGORY_LABELS.sequence_analysis).toBe("Sequence Analysis");
    expect(TASK_CATEGORY_LABELS.client_communication).toBe(
      "Client Communication",
    );
  });
});
