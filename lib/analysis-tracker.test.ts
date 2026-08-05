import { describe, expect, it } from "vitest";
import {
  CHANGES_REQUESTED,
  deriveLegacyStatus,
  isChangesRequestedLabel,
  MANUAL_STATUS_OF_SUBMISSION_OPTIONS,
  mapLabelToAnalysisStatus,
  shouldAdvanceSubmissionStatus,
  STATUS_OF_SUBMISSION_OPTIONS,
  submissionStatusRank,
} from "./analysis-tracker";

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
