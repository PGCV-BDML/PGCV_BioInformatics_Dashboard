import { describe, expect, it } from "vitest";
import {
  canEditSequenceAnalysis,
  canViewSequenceAnalysis,
  isPathAllowedForRole,
  isSequenceAnalysisReadPath,
} from "./portal";

describe("canViewSequenceAnalysis / canEditSequenceAnalysis", () => {
  it("lets staff view and edit", () => {
    expect(canViewSequenceAnalysis("team_lead")).toBe(true);
    expect(canViewSequenceAnalysis("team_member")).toBe(true);
    expect(canEditSequenceAnalysis("team_lead")).toBe(true);
    expect(canEditSequenceAnalysis("team_member")).toBe(true);
  });

  it("lets reviewing officers view but not edit", () => {
    expect(canViewSequenceAnalysis("reviewing_officer")).toBe(true);
    expect(canEditSequenceAnalysis("reviewing_officer")).toBe(false);
  });

  it("does not let approving officers into Sequence Analysis", () => {
    expect(canViewSequenceAnalysis("approving_officer")).toBe(false);
    expect(canEditSequenceAnalysis("approving_officer")).toBe(false);
  });
});

describe("isSequenceAnalysisReadPath", () => {
  it("allows the dashboard, tracker, and analysis detail", () => {
    expect(isSequenceAnalysisReadPath("/dashboard/services")).toBe(true);
    expect(isSequenceAnalysisReadPath("/dashboard/services/tracker")).toBe(true);
    expect(
      isSequenceAnalysisReadPath(
        "/dashboard/services/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      ),
    ).toBe(true);
  });

  it("blocks generator, COVID tracker, and sequencing run checklist", () => {
    expect(
      isSequenceAnalysisReadPath("/dashboard/services/report-generator"),
    ).toBe(false);
    expect(
      isSequenceAnalysisReadPath("/dashboard/services/covid-sample-tracker"),
    ).toBe(false);
    expect(
      isSequenceAnalysisReadPath("/dashboard/services/sequencing-run-checklist"),
    ).toBe(false);
  });
});

describe("isPathAllowedForRole", () => {
  it("lets reviewing officers open Sequence Analysis plus Notifications", () => {
    expect(
      isPathAllowedForRole("/dashboard/notifications", "reviewing_officer"),
    ).toBe(true);
    expect(
      isPathAllowedForRole("/dashboard/services", "reviewing_officer"),
    ).toBe(true);
    expect(
      isPathAllowedForRole("/dashboard/services/tracker", "reviewing_officer"),
    ).toBe(true);
    expect(
      isPathAllowedForRole(
        "/dashboard/services/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "reviewing_officer",
      ),
    ).toBe(true);
  });

  it("keeps reviewing officers off other modules", () => {
    expect(isPathAllowedForRole("/dashboard", "reviewing_officer")).toBe(false);
    expect(
      isPathAllowedForRole("/dashboard/clients", "reviewing_officer"),
    ).toBe(false);
    expect(
      isPathAllowedForRole(
        "/dashboard/services/report-generator",
        "reviewing_officer",
      ),
    ).toBe(false);
    expect(
      isPathAllowedForRole(
        "/dashboard/services/covid-sample-tracker",
        "reviewing_officer",
      ),
    ).toBe(false);
  });

  it("keeps approving officers on Notifications only", () => {
    expect(
      isPathAllowedForRole("/dashboard/notifications", "approving_officer"),
    ).toBe(true);
    expect(
      isPathAllowedForRole("/dashboard/services", "approving_officer"),
    ).toBe(false);
    expect(
      isPathAllowedForRole("/dashboard/services/tracker", "approving_officer"),
    ).toBe(false);
  });
});
