import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingPrepLinks from "./training-prep-links";
import { getTrainingPrepLinks } from "@/lib/training-prep-links";
import { saveDataToDB } from "@/lib/supabase";
import type { TrainingPrepLink } from "@/types/database";

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    isStaff: true,
    isLearnerView: false,
    loading: false,
  }),
}));

const showToast = vi.fn();
vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/lib/training-prep-links", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/training-prep-links")>();
  return {
    ...actual,
    getTrainingPrepLinks: vi.fn(),
  };
});

vi.mock("@/lib/supabase", () => ({
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
}));

function letterLink(extra?: Partial<TrainingPrepLink>): TrainingPrepLink {
  return {
    id: "link-letter",
    program_id: "prog-1",
    title: "Invitation letter",
    url: "https://drive.google.com/file/d/abc",
    sort_order: 10,
    ...extra,
  };
}

describe("TrainingPrepLinks", () => {
  beforeEach(() => {
    showToast.mockClear();
    vi.mocked(getTrainingPrepLinks).mockReset();
    vi.mocked(saveDataToDB).mockReset();
  });

  it("lists saved links and adds another", async () => {
    const user = userEvent.setup();
    vi.mocked(getTrainingPrepLinks).mockResolvedValue([letterLink()]);
    vi.mocked(saveDataToDB).mockResolvedValue({
      id: "link-folder",
      program_id: "prog-1",
      title: "Shared folder",
      url: "https://drive.google.com/drive/folders/xyz",
      sort_order: 20,
    });

    render(<TrainingPrepLinks programId="prog-1" />);

    expect(await screen.findByText("Invitation letter")).toBeInTheDocument();
    expect(
      screen.getByText("https://drive.google.com/file/d/abc"),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add link" }));
    await user.type(screen.getByLabelText("Title"), "Shared folder");
    await user.type(
      screen.getByLabelText("Link"),
      "https://drive.google.com/drive/folders/xyz",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => {
      expect(saveDataToDB).toHaveBeenCalledWith(
        "training_prep_link",
        expect.any(String),
        expect.objectContaining({
          program_id: "prog-1",
          title: "Shared folder",
          url: "https://drive.google.com/drive/folders/xyz",
          sort_order: 20,
        }),
      );
    });
    expect(await screen.findByText("Shared folder")).toBeInTheDocument();
  });
});
