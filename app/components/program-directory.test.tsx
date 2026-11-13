import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramDirectory from "./program-directory";
import { getRowsFromDB, getUsersFromDB, saveDataToDB } from "@/lib/supabase";

const portal = { isStaff: true, isLearnerView: false };
vi.mock("./portal-context", () => ({
  usePortal: () => portal,
}));

const showToast = vi.fn();
vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
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
    showToast.mockClear();
    vi.mocked(saveDataToDB).mockReset();
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

  describe("team-wide pins", () => {
    const cardTitles = () =>
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);

    beforeEach(() => {
      vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
        if (table === "training_program") {
          return [
            { id: "prog-old", type: "training", title: "Old Training", status: "completed", start_date: "2026-06-16" },
            { id: "prog-16s", type: "training", title: "16S Training", status: "ongoing", start_date: "2026-10-27" },
            { id: "prog-intro", type: "training", title: "Intro Training", status: "draft", start_date: "2026-11-25", pinned_at: "2026-11-13T02:00:00+00:00" },
          ] as never;
        }
        return [] as never;
      });
    });

    it("lists pinned programs first and marks them for staff", async () => {
      renderDirectory();

      expect(await screen.findByText("Intro Training")).toBeInTheDocument();
      expect(cardTitles()).toEqual(["Intro Training", "16S Training", "Old Training"]);
      expect(screen.getAllByText("Pinned")).toHaveLength(1);
      expect(screen.getAllByRole("button", { name: "Unpin" })).toHaveLength(1);
      expect(
        screen.getAllByRole("button", { name: "Pin to top for everyone" }),
      ).toHaveLength(2);
    });

    it("pins a program for everyone and moves it to the top", async () => {
      vi.mocked(saveDataToDB).mockImplementation(async (_table, id, data) => ({
        id,
        ...data,
      }) as never);
      const user = userEvent.setup();
      renderDirectory();
      await screen.findByText("Old Training");

      const pinButtons = screen.getAllByRole("button", {
        name: "Pin to top for everyone",
      });
      // Cards are Intro (pinned), 16S, Old; the last pin button is Old's.
      await user.click(pinButtons[1]!);

      await waitFor(() => {
        expect(cardTitles()).toEqual(["Old Training", "Intro Training", "16S Training"]);
      });
      expect(saveDataToDB).toHaveBeenCalledWith(
        "training_program",
        "prog-old",
        { pinned_at: expect.any(String) },
      );
      expect(showToast).toHaveBeenCalledWith(
        "Pinned to the top for everyone.",
        "success",
      );
    });

    it("unpins a program", async () => {
      vi.mocked(saveDataToDB).mockImplementation(async (_table, id, data) => ({
        id,
        ...data,
      }) as never);
      const user = userEvent.setup();
      renderDirectory();
      await screen.findByText("Intro Training");

      await user.click(screen.getByRole("button", { name: "Unpin" }));

      await waitFor(() => {
        expect(cardTitles()).toEqual(["16S Training", "Intro Training", "Old Training"]);
      });
      expect(saveDataToDB).toHaveBeenCalledWith(
        "training_program",
        "prog-intro",
        { pinned_at: null },
      );
      expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    });

    it("puts the program back when the pin cannot be saved", async () => {
      vi.mocked(saveDataToDB).mockRejectedValue(new Error("denied"));
      const user = userEvent.setup();
      renderDirectory();
      await screen.findByText("Intro Training");

      await user.click(screen.getByRole("button", { name: "Unpin" }));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          "Failed to unpin the program.",
          "error",
        );
      });
      expect(cardTitles()).toEqual(["Intro Training", "16S Training", "Old Training"]);
      expect(screen.getByText("Pinned")).toBeInTheDocument();
    });

    it("keeps the pinned order for learners without the pin controls", async () => {
      portal.isStaff = false;
      portal.isLearnerView = true;
      renderDirectory();

      expect(await screen.findByText("Intro Training")).toBeInTheDocument();
      expect(cardTitles()[0]).toBe("Intro Training");
      expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Pin|Unpin/ })).not.toBeInTheDocument();
    });
  });
});
