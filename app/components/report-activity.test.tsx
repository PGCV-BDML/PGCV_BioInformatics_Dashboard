import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportActivitySection } from "./report-activity";
import type { AnalysisStatusEvent } from "@/types/database";

const event: AnalysisStatusEvent = {
  id: "evt-1",
  analysis_id: "a-1",
  field: "review",
  from_value: "For review",
  to_value: "Reviewed",
  changed_by: "user-2",
  changed_at: "2026-08-28T08:12:00.000Z",
  note: null,
};

describe("ReportActivitySection", () => {
  it("shows an empty state when there is no history", () => {
    render(
      <ReportActivitySection events={[]} userNames={{}} />,
    );
    expect(screen.getByText("Report activity")).toBeInTheDocument();
    expect(screen.getByText("No status history yet.")).toBeInTheDocument();
  });

  it("names who marked the report Reviewed", () => {
    render(
      <ReportActivitySection
        events={[event]}
        userNames={{ "user-2": "Alex Cruz" }}
      />,
    );
    expect(
      screen.getByText(/Alex Cruz marked this Reviewed on /),
    ).toBeInTheDocument();
  });
});
