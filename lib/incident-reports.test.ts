import { describe, expect, it } from "vitest";
import {
  buildIncidentReportPayload,
  canManageIncident,
  emptyIncidentForm,
  formFromIncident,
  formatIncidentTimeForInput,
  formatIncidentWhen,
  incidentCategoryLabel,
  localDateToday,
  normalizeIncidentTime,
} from "./incident-reports";
import type { IncidentReport } from "@/types/database";

function row(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    id: "inc-1",
    title: "Sample mix-up",
    incident_date: "2026-08-17",
    incident_time: "14:30:00",
    location: "lab",
    location_detail: "Bench 2",
    category: "sample_data_handling",
    severity: "high",
    description: "Two tubes swapped during extraction.",
    immediate_action: "Quarantined the batch.",
    people_involved: "Alex, Sam",
    related_run_id: "PGCV_NS_0059",
    follow_up: "Retrain on labeling.",
    reporter_id: "user-1",
    status: "open",
    ...overrides,
  };
}

describe("localDateToday", () => {
  it("formats the local calendar date as YYYY-MM-DD", () => {
    expect(localDateToday(new Date(2026, 7, 17, 22, 15))).toBe("2026-08-17");
  });
});

describe("incident time helpers", () => {
  it("strips seconds for the time input", () => {
    expect(formatIncidentTimeForInput("14:30:00")).toBe("14:30");
    expect(formatIncidentTimeForInput("09:05:00.123")).toBe("09:05");
    expect(formatIncidentTimeForInput("")).toBe("");
    expect(formatIncidentTimeForInput(null)).toBe("");
  });

  it("normalizes optional time for Postgres", () => {
    expect(normalizeIncidentTime("14:30")).toBe("14:30:00");
    expect(normalizeIncidentTime(" 09:05:00 ")).toBe("09:05:00");
    expect(normalizeIncidentTime("")).toBeNull();
    expect(normalizeIncidentTime("  ")).toBeNull();
  });

  it("formats date and optional time together", () => {
    expect(formatIncidentWhen("2026-08-17", "14:30:00")).toBe(
      "08/17/2026 · 14:30",
    );
    expect(formatIncidentWhen("2026-08-17", null)).toBe("08/17/2026");
    expect(formatIncidentWhen(null, null)).toBe("—");
  });
});

describe("incident form payload", () => {
  it("prefills today's date and open status", () => {
    const form = emptyIncidentForm(new Date(2026, 7, 17));
    expect(form.incident_date).toBe("2026-08-17");
    expect(form.status).toBe("open");
    expect(form.severity).toBe("medium");
  });

  it("maps a stored row back into form fields", () => {
    const form = formFromIncident(row());
    expect(form.incident_time).toBe("14:30");
    expect(form.location_detail).toBe("Bench 2");
    expect(form.related_run_id).toBe("PGCV_NS_0059");
  });

  it("trims text and nulls empty optional fields", () => {
    const payload = buildIncidentReportPayload({
      ...emptyIncidentForm(new Date(2026, 7, 17)),
      title: "  Freezer alarm  ",
      description: "  Temperature spike  ",
      location_detail: "  ",
      immediate_action: "Moved samples",
      people_involved: "",
      related_run_id: " NS_001 ",
      follow_up: "   ",
      incident_time: "08:15",
    });

    expect(payload.title).toBe("Freezer alarm");
    expect(payload.description).toBe("Temperature spike");
    expect(payload.location_detail).toBeNull();
    expect(payload.immediate_action).toBe("Moved samples");
    expect(payload.people_involved).toBeNull();
    expect(payload.related_run_id).toBe("NS_001");
    expect(payload.follow_up).toBeNull();
    expect(payload.incident_time).toBe("08:15:00");
  });
});

describe("canManageIncident", () => {
  it("lets a team lead manage any report", () => {
    expect(canManageIncident("team_lead", "user-2", "user-1")).toBe(true);
  });

  it("lets a member manage only their own report", () => {
    expect(canManageIncident("team_member", "user-1", "user-1")).toBe(true);
    expect(canManageIncident("team_member", "user-2", "user-1")).toBe(false);
  });

  it("denies learners and missing identities", () => {
    expect(canManageIncident("trainee", "user-1", "user-1")).toBe(false);
    expect(canManageIncident("team_member", null, "user-1")).toBe(false);
  });
});

describe("incidentCategoryLabel", () => {
  it("returns the display label", () => {
    expect(incidentCategoryLabel("data_privacy")).toBe(
      "Data privacy / client data",
    );
  });
});
