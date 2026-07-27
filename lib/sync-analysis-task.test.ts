import { describe, expect, it } from "vitest";
import {
  deriveLegacyStatus,
  displayAnalysisLabel,
  formatServiceReportNumber,
  normalizeClassification,
} from "./analysis-tracker";
import { buildAnalysisTaskTitle } from "./sync-analysis-task";
import { TASK_CATEGORIES, TASK_CATEGORY_LABELS } from "./task-categories";

describe("normalizeClassification", () => {
  it("maps WGS Analyses to Whole Genome Assembly", () => {
    expect(normalizeClassification("WGS Analyses")).toBe("Whole Genome Assembly");
  });

  it("keeps known options", () => {
    expect(normalizeClassification("Amplicon")).toBe("Amplicon");
  });
});

describe("formatServiceReportNumber", () => {
  it("joins prefix and zero-padded suffix", () => {
    expect(formatServiceReportNumber("PGCV-BIOINFO-SR-2024", 38)).toBe(
      "PGCV-BIOINFO-SR-2024-038",
    );
  });
});

describe("displayAnalysisLabel", () => {
  it("uses application when classification is Others", () => {
    expect(displayAnalysisLabel("Others", "Pepnet")).toBe("Pepnet");
  });
});

describe("deriveLegacyStatus", () => {
  it("prefers completion status", () => {
    expect(
      deriveLegacyStatus({
        status_of_completion: "On-going",
        status_of_submission: "Submitted",
      }),
    ).toBe("ongoing");
  });
});

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
    ).toBe("WGS — Coral Project");
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

  it("prefers service report number and application specify", () => {
    expect(
      buildAnalysisTaskTitle({
        id: "1",
        project_id: null,
        pipeline: "Others",
        pipeline_version: null,
        status: "completed",
        assignee_id: null,
        started_at: null,
        completed_at: null,
        application: "ITS2 metagenomics analysis",
        serviceReportNumber: "PGCV-BIOINFO-SR-2026-230",
      }),
    ).toBe("ITS2 metagenomics analysis — PGCV-BIOINFO-SR-2026-230");
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
