import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureProgramEvaluation } from "./program-evaluation";
import { asStoredEvaluationQuestions } from "./evaluation-form";
import { getRowsFromDB, saveDataToDB } from "./supabase";

vi.mock("./supabase", () => ({
  getRowsFromDB: vi.fn(),
  saveDataToDB: vi.fn(),
}));

describe("ensureProgramEvaluation", () => {
  beforeEach(() => {
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(saveDataToDB).mockReset();
  });

  it("creates a closed evaluation for a program without one", async () => {
    vi.mocked(getRowsFromDB).mockResolvedValue([] as never);
    vi.mocked(saveDataToDB).mockImplementation(
      async (_table, id, data) => ({ id, ...data }) as never,
    );

    const created = await ensureProgramEvaluation("prog-1");

    expect(saveDataToDB).toHaveBeenCalledWith(
      "assessment",
      expect.any(String),
      expect.objectContaining({
        program_id: "prog-1",
        type: "evaluation",
        is_open: false,
      }),
    );
    expect(created).toMatchObject({ program_id: "prog-1", is_open: false });
  });

  it("returns the program's existing evaluation as is", async () => {
    const existing = {
      id: "eval-1",
      program_id: "prog-1",
      type: "evaluation",
      questions: asStoredEvaluationQuestions(),
      is_open: true,
    };
    vi.mocked(getRowsFromDB).mockResolvedValue([existing] as never);

    expect(await ensureProgramEvaluation("prog-1")).toBe(existing);
    expect(saveDataToDB).not.toHaveBeenCalled();
  });
});
