import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProgramModules from "./program-modules";
import { getRowsFromDB, saveDataToDB } from "@/lib/supabase";

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

const moduleRow = {
  id: "mod-1",
  program_id: "prog-1",
  title: "Linux basics",
  html_content_link: "github-module:intro-linux",
  file_path: null,
  file_name: null,
  file_size: null,
  order: 1,
  save_log_enabled: true,
  is_open: true,
};

describe("ProgramModules access", () => {
  beforeEach(() => {
    portal.isStaff = true;
    portal.isLearnerView = false;
    showToast.mockClear();
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(saveDataToDB).mockReset();
    vi.mocked(saveDataToDB).mockResolvedValue(undefined as never);
    vi.mocked(getRowsFromDB).mockResolvedValue([moduleRow] as never);
  });

  it("lets staff close a module so trainees cannot open it", async () => {
    const user = userEvent.setup();
    render(<ProgramModules programId="prog-1" programType="training" />);

    const toggle = await screen.findByRole("switch", {
      name: "Linux basics open for trainees",
    });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);

    expect(saveDataToDB).toHaveBeenCalledWith("module", "mod-1", {
      is_open: false,
    });
    await waitFor(() => {
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });
    expect(showToast).toHaveBeenCalledWith(
      "Linux basics is closed for trainees.",
      "success",
    );
  });

  it("shows a closed module as not open yet for trainees", async () => {
    portal.isStaff = false;
    vi.mocked(getRowsFromDB).mockResolvedValue([
      { ...moduleRow, is_open: false },
    ] as never);

    render(<ProgramModules programId="prog-1" programType="training" />);

    expect(await screen.findByText("Not open yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "View Materials" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark as Read" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("switch", { name: "Linux basics open for trainees" }),
    ).not.toBeInTheDocument();
  });
});
