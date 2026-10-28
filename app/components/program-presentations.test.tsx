import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramPresentations from "./program-presentations";
import { saveMaterialOrder } from "@/lib/material-order";
import {
  deleteDataFromDB,
  getRowsFromDB,
  saveDataToDB,
} from "@/lib/supabase";

const portal = { isStaff: true, isLearnerView: false };
const showToast = vi.fn();

vi.mock("./portal-context", () => ({
  usePortal: () => portal,
}));

vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
  supabase: {},
}));

vi.mock("@/lib/material-order", () => ({
  saveMaterialOrder: vi.fn(),
}));

const deck = {
  id: "deck-1",
  program_id: "prog-1",
  title: "Basic coding",
  content_link: "github-presentation:basic-coding",
  order: 1,
  is_open: true,
};

describe("ProgramPresentations access", () => {
  beforeEach(() => {
    portal.isStaff = true;
    portal.isLearnerView = false;
    showToast.mockClear();
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(saveDataToDB).mockReset();
    vi.mocked(saveDataToDB).mockResolvedValue(undefined as never);
    vi.mocked(getRowsFromDB).mockResolvedValue([deck] as never);
  });

  it("lets staff close a presentation so trainees cannot open it", async () => {
    const user = userEvent.setup();
    render(<ProgramPresentations programId="prog-1" />);

    const toggle = await screen.findByRole("switch", {
      name: "Basic coding open for trainees",
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);

    expect(saveDataToDB).toHaveBeenCalledWith("presentation", "deck-1", {
      is_open: false,
    });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
    expect(showToast).toHaveBeenCalledWith(
      "Basic coding is closed for trainees.",
      "success",
    );
  });

  it("shows a closed presentation as not open yet for trainees", async () => {
    portal.isStaff = false;
    vi.mocked(getRowsFromDB).mockResolvedValue([
      { ...deck, is_open: false },
    ] as never);

    render(<ProgramPresentations programId="prog-1" />);

    expect(await screen.findByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Basic coding open for trainees" }),
    ).not.toBeInTheDocument();
  });
});

describe("ProgramPresentations builder", () => {
  const second = {
    ...deck,
    id: "deck-2",
    title: "Phylogenetics",
    content_link: "github-presentation:phylogenetics",
    order: 2,
  };

  beforeEach(() => {
    portal.isStaff = true;
    portal.isLearnerView = false;
    showToast.mockClear();
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(getRowsFromDB).mockResolvedValue([deck, second] as never);
    vi.mocked(deleteDataFromDB).mockReset();
    vi.mocked(deleteDataFromDB).mockResolvedValue(undefined);
    vi.mocked(saveMaterialOrder).mockReset();
    vi.mocked(saveMaterialOrder).mockResolvedValue(undefined);
  });

  it("saves the new order when staff move a presentation", async () => {
    const user = userEvent.setup();
    render(<ProgramPresentations programId="prog-1" />);

    await screen.findByText("Phylogenetics");
    const [, moveSecondUp] = screen.getAllByRole("button", {
      name: "Move presentation up",
    });
    await user.click(moveSecondUp!);

    expect(saveMaterialOrder).toHaveBeenCalledWith("presentation", "prog-1", [
      "deck-2",
      "deck-1",
    ]);
    expect(showToast).not.toHaveBeenCalled();
  });

  it("removes a presentation without saving the order again", async () => {
    const user = userEvent.setup();
    render(<ProgramPresentations programId="prog-1" />);

    await user.click(
      await screen.findByRole("button", { name: "Remove Basic coding" }),
    );
    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(deleteDataFromDB).toHaveBeenCalledWith("presentation", "deck-1");
    await waitFor(() => {
      expect(screen.queryByText("Basic coding")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Phylogenetics")).toBeInTheDocument();
    expect(saveMaterialOrder).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      "Presentation removed from this training.",
      "success",
    );
  });
});
