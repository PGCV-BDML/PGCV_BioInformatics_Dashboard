import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramDirectory from "./program-directory";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";

const portal = { isStaff: true, isLearnerView: false };
vi.mock("./portal-context", () => ({
  usePortal: () => portal,
}));

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("./dashboard-ui-context", () => ({
  useDashboardUI: () => ({ toggleSidebar: vi.fn() }),
}));

vi.mock("./program-modal", () => ({ default: () => null }));

vi.mock("@/lib/user-names", () => ({
  loadUserNameMap: vi.fn(async () => new Map()),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getUsersFromDB: vi.fn(),
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
}));

function renderDirectory() {
  return render(
    <ProgramDirectory
      programType="training"
      breadcrumbTrail={[]}
      title="Training"
      subtitle="Manage training cohorts"
      addButtonLabel="Add Training"
    />,
  );
}

describe("ProgramDirectory", () => {
  beforeEach(() => {
    portal.isStaff = true;
    portal.isLearnerView = false;
    vi.mocked(getUsersFromDB).mockImplementation(async (roles) => {
      if (roles.includes("trainee")) {
        return [
          { id: "u1", role: "trainee", name: "Ada" },
          { id: "u2", role: "trainee", name: "Grace" },
        ] as never;
      }
      return [] as never;
    });
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "training_program") {
        return [
          { id: "prog-16s", type: "training", title: "16S Training", status: "ongoing" },
          { id: "prog-intro", type: "training", title: "Intro Training", status: "ongoing" },
        ] as never;
      }
      if (table === "program_enrollment") {
        return [
          { id: "e1", program_id: "prog-16s", user_id: "u1", status: "enrolled" },
          { id: "e2", program_id: "prog-16s", user_id: "u2", status: "completed" },
          { id: "e3", program_id: "prog-16s", user_id: "u3", status: "dropped" },
          { id: "e4", program_id: "prog-16s", user_id: "staff-1", status: "enrolled" },
        ] as never;
      }
      return [] as never;
    });
  });

  it("counts listed trainees and interns, not dropped or former learners", async () => {
    renderDirectory();

    expect(await screen.findByText("2 Active Enrolled")).toBeInTheDocument();
    expect(screen.getByText("0 Active Enrolled")).toBeInTheDocument();
  });

  it("hides the count in learner view", async () => {
    portal.isStaff = false;
    portal.isLearnerView = true;
    renderDirectory();

    expect(await screen.findByText("16S Training")).toBeInTheDocument();
    expect(screen.queryByText(/Active Enrolled/)).not.toBeInTheDocument();
  });
});
