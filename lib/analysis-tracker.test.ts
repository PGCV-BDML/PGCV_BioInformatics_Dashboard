import { describe, expect, it } from "vitest";
import {
  CHANGES_REQUESTED,
  deriveLegacyStatus,
  isChangesRequestedLabel,
  MANUAL_STATUS_OF_SUBMISSION_OPTIONS,
  mapLabelToAnalysisStatus,
  needsReReviewAfterPdfReplace,
  REVISION_REQUESTED,
  REVIEWED,
  shouldAdvanceSubmissionStatus,
  STATUS_OF_SUBMISSION_OPTIONS,
  submissionStatusRank,
  analysisStatusEventLabel,
} from "./analysis-tracker";
import type { AnalysisStatusEvent } from "@/types/database";

describe("isChangesRequestedLabel", () => {
  it("matches the label in both spaced and underscored form", () => {
    expect(isChangesRequestedLabel("Changes requested")).toBe(true);
    expect(isChangesRequestedLabel("  changes_requested  ")).toBe(true);
  });

  it("does not match other submission statuses", () => {
    for (const label of ["For approval", "Under review", "Approved", "Submitted"]) {
      expect(isChangesRequestedLabel(label)).toBe(false);
    }
    expect(isChangesRequestedLabel(null)).toBe(false);
    expect(isChangesRequestedLabel("")).toBe(false);
  });
});

describe("submissionStatusRank", () => {
  it("keeps the forward-only ladder intact", () => {
    expect(submissionStatusRank("For approval")).toBe(1);
    expect(submissionStatusRank("Under review")).toBe(2);
    expect(submissionStatusRank("Approved")).toBe(3);
    expect(submissionStatusRank("Submitted")).toBe(4);
  });

  it("ranks Changes requested outside the ladder", () => {
    expect(submissionStatusRank(CHANGES_REQUESTED)).toBe(0);
  });
});

describe("shouldAdvanceSubmissionStatus", () => {
  it("lets a resubmission climb back out of Changes requested", () => {
    expect(
      shouldAdvanceSubmissionStatus(CHANGES_REQUESTED, "For approval"),
    ).toBe(true);
  });

  it("still refuses to demote an approved report", () => {
    expect(shouldAdvanceSubmissionStatus("Approved", "Under review")).toBe(
      false,
    );
    expect(shouldAdvanceSubmissionStatus("Submitted", "Approved")).toBe(false);
  });
});

describe("MANUAL_STATUS_OF_SUBMISSION_OPTIONS", () => {
  it("omits Changes requested so it can only be set with a comment", () => {
    expect(STATUS_OF_SUBMISSION_OPTIONS).toContain(CHANGES_REQUESTED);
    expect(MANUAL_STATUS_OF_SUBMISSION_OPTIONS).not.toContain(
      CHANGES_REQUESTED,
    );
  });

  it("keeps every other option selectable", () => {
    expect(MANUAL_STATUS_OF_SUBMISSION_OPTIONS).toEqual([
      "For approval",
      "Under review",
      "Approved",
      "Submitted",
    ]);
  });
});

describe("legacy status mapping", () => {
  it("treats Changes requested as awaiting approval", () => {
    expect(mapLabelToAnalysisStatus(CHANGES_REQUESTED)).toBe("for_approval");
  });

  it("still prefers the completion status when both are set", () => {
    expect(
      deriveLegacyStatus({
        status_of_completion: "Completed",
        status_of_submission: CHANGES_REQUESTED,
      }),
    ).toBe("completed");
  });
});

describe("needsReReviewAfterPdfReplace", () => {
  it("is true when approval sent the report back and review is no longer complete", () => {
    expect(
      needsReReviewAfterPdfReplace("For review", CHANGES_REQUESTED),
    ).toBe(true);
    expect(
      needsReReviewAfterPdfReplace("In review", CHANGES_REQUESTED),
    ).toBe(true);
  });

  it("is false while the original reviewed PDF is still on file", () => {
    expect(
      needsReReviewAfterPdfReplace("Reviewed", CHANGES_REQUESTED),
    ).toBe(false);
  });

  it("is false when the report is not in a change-request", () => {
    expect(needsReReviewAfterPdfReplace("For review", "For approval")).toBe(
      false,
    );
    expect(needsReReviewAfterPdfReplace("Reviewed", "For approval")).toBe(
      false,
    );
  });
});

describe("analysisStatusEventLabel", () => {
  function event(
    overrides: Partial<AnalysisStatusEvent> = {},
  ): AnalysisStatusEvent {
    return {
      id: "evt-1",
      analysis_id: "a-1",
      field: "review",
      from_value: "For review",
      to_value: REVIEWED,
      changed_by: "user-2",
      changed_at: "2026-08-28T08:12:00.000Z",
      note: null,
      ...overrides,
    };
  }

  it("names who marked the report Reviewed and when", () => {
    const label = analysisStatusEventLabel(event(), "Alex Cruz");
    expect(label.startsWith("Alex Cruz marked this Reviewed on ")).toBe(true);
    expect(label).toContain("2026");
  });

  it("describes a revision request", () => {
    const label = analysisStatusEventLabel(
      event({ to_value: REVISION_REQUESTED }),
      "Jane Doe",
    );
    expect(label.startsWith("Jane Doe requested a revision on ")).toBe(true);
  });

  it("describes a PDF replace", () => {
    const label = analysisStatusEventLabel(
      event({
        field: "file",
        from_value: "old.pdf",
        to_value: "new.pdf",
      }),
      "Micah Lojera",
    );
    expect(
      label.startsWith("Micah Lojera replaced the service report PDF on "),
    ).toBe(true);
  });

  it("uses the stored note when the actor name is missing", () => {
    const label = analysisStatusEventLabel(
      event({ changed_by: null, note: "Pat Reyes" }),
      "  ",
    );
    expect(label.startsWith("Pat Reyes marked this Reviewed on ")).toBe(true);
  });

  it("falls back when both actor and note are missing", () => {
    const label = analysisStatusEventLabel(
      event({ changed_by: null, note: null }),
      "  ",
    );
    expect(label.startsWith("Unknown marked this Reviewed on ")).toBe(true);
  });
});
