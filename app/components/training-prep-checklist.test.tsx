import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrainingPrepChecklist from "./training-prep-checklist";
import {
  getTrainingPrepItems,
  insertMissingDefaultTrainingPrepItems,
} from "@/lib/training-prep-checklist";
import { saveDataToDB } from "@/lib/supabase";
import type { TrainingPrepItem } from "@/types/database";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

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

vi.mock("@/lib/training-prep-checklist", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/training-prep-checklist")>();
  return {
    ...actual,
    getTrainingPrepItems: vi.fn(),
    insertMissingDefaultTrainingPrepItems: vi.fn(),
  };
});

vi.mock("@/lib/supabase", () => ({
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
}));

function projectorItem(
  extra?: Partial<TrainingPrepItem>,
): TrainingPrepItem {
  return {
    id: "item-projector",
    program_id: "prog-1",
    item_key: "projector",
    category: "venue",
    label: "Projector / LCD",
    is_done: false,
    notes: null,
    sort_order: 20,
    ...extra,
  };
}

describe("TrainingPrepChecklist", () => {
  beforeEach(() => {
    showToast.mockClear();
    vi.mocked(getTrainingPrepItems).mockReset();
    vi.mocked(insertMissingDefaultTrainingPrepItems).mockReset();
    vi.mocked(saveDataToDB).mockReset();
  });

  it("shows venue gear and letters, and saves a check", async () => {
    const user = userEvent.setup();
    vi.mocked(getTrainingPrepItems).mockResolvedValue([
      projectorItem(),
      {
        id: "item-letter",
        program_id: "prog-1",
        item_key: "invitation_letter",
        category: "documents",
        label: "Invitation / request letter to the institution",
        is_done: false,
        notes: null,
        sort_order: 90,
      },
    ]);
    vi.mocked(saveDataToDB).mockResolvedValue({
      ...projectorItem({ is_done: true }),
    });

    render(<TrainingPrepChecklist programId="prog-1" />);

    expect(
      await screen.findByRole("checkbox", { name: "Projector / LCD" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", {
        name: "Invitation / request letter to the institution",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("0 of 2 ready")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Projector / LCD" }));

    await waitFor(() => {
      expect(saveDataToDB).toHaveBeenCalledWith(
        "training_prep_item",
        "item-projector",
        { is_done: true },
      );
    });
    expect(screen.getByText("1 of 2 ready")).toBeInTheDocument();
  });
});
