import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramParticipants from "./program-participants";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    canEnroll: false,
    isLearnerView: false,
    refreshEnrollments: vi.fn(),
  }),
}));

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getUsersFromDB: vi.fn(),
  getCurrentUser: vi.fn(),
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
}));

const trainee = {
  id: "u-ada",
  name: "Ada Lovelace",
  email: "ada@example.com",
  institution: "PGCV",
  role: "trainee",
};

function mockParticipantRows() {
  vi.mocked(getUsersFromDB).mockResolvedValue([trainee] as never);
  vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
    if (table === "program_enrollment") {
      return [
        {
          id: "enr-1",
          program_id: "prog-1",
          user_id: "u-ada",
          status: "enrolled",
        },
      ] as never;
    }
    return [] as never;
  });
}

describe("ProgramParticipants certificate column", () => {
  beforeEach(() => {
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(getUsersFromDB).mockReset();
    mockParticipantRows();
  });

  it("hides the certificate column on a training", async () => {
    render(
      <ProgramParticipants programId="prog-1" programType="training" />,
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Certificate" }),
    ).toBeNull();
    expect(screen.queryByText("Pending")).toBeNull();
    expect(screen.getByText(/Scores appear once submitted/)).toBeInTheDocument();
  });

  it("keeps the certificate column on an internship", async () => {
    vi.mocked(getUsersFromDB).mockResolvedValue([
      { ...trainee, role: "intern" },
    ] as never);

    render(
      <ProgramParticipants programId="prog-1" programType="internship" />,
    );

    expect(
      await screen.findByRole("columnheader", { name: "Certificate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });
});
