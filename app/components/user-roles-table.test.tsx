import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "./toast";
import UserRolesTable, { type RoleTableUser } from "./user-roles-table";
import type { TrainingProgram } from "@/types/database";

const { selectResult, saveDataToDB } = vi.hoisted(() => ({
  selectResult: vi.fn(),
  saveDataToDB: vi.fn(),
}));

vi.mock("@/lib/supabase", () => {
  const chain = {
    update: () => chain,
    eq: () => chain,
    select: selectResult,
  };
  return { supabase: { from: () => chain }, saveDataToDB };
});

function user(
  id: string,
  name: string,
  role: RoleTableUser["role"],
  inTeamDirectory = false,
): RoleTableUser {
  return {
    id,
    name,
    email: `${id}@example.com`,
    role,
    created_at: "2026-07-01T00:00:00.000Z",
    in_team_directory: inTeamDirectory,
  };
}

const users = [
  user("me", "Dana Cruz", "team_lead", true),
  user("lead2", "Paolo Reyes", "team_lead", true),
  user("t1", "Leo Garcia", "trainee"),
  user("w1", "Ken Ramos", "none"),
];

const programs: TrainingProgram[] = [
  {
    id: "p1",
    title: "Summer Internship",
    type: "internship",
    status: "ongoing",
    start_date: null,
    end_date: null,
    instructor_id: "me",
    description: null,
    requesting_institution: null,
    training_code: null,
  },
];

function renderTable(overrides: Partial<Parameters<typeof UserRolesTable>[0]> = {}) {
  const props = {
    users,
    programs,
    enrollmentsByUser: {},
    currentUserId: "me",
    onRoleChanged: vi.fn(),
    onEnrolled: vi.fn(),
    onStale: vi.fn(),
    ...overrides,
  };
  render(
    <ToastProvider>
      <UserRolesTable {...props} />
    </ToastProvider>,
  );
  return { props, table: screen.getByRole("table") };
}

describe("UserRolesTable", () => {
  beforeEach(() => {
    selectResult.mockReset();
    saveDataToDB.mockReset();
  });

  it("locks your own role and leaves others editable", () => {
    const { table } = renderTable();
    expect(
      within(table).getByRole("combobox", { name: "Role for Dana Cruz" }),
    ).toBeDisabled();
    expect(
      within(table).getByText("Another team lead must change your role"),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("combobox", { name: "Role for Paolo Reyes" }),
    ).toBeEnabled();
  });

  it("locks the only other team lead when you aren't one", () => {
    const { table } = renderTable({
      users: [user("lead", "Paolo Reyes", "team_lead"), user("t1", "Leo Garcia", "trainee")],
      currentUserId: "someone-else",
    });
    expect(
      within(table).getByRole("combobox", { name: "Role for Paolo Reyes" }),
    ).toBeDisabled();
    expect(
      within(table).getByText("At least one team lead is required"),
    ).toBeInTheDocument();
  });

  it("filters by role and search", async () => {
    const ui = userEvent.setup();
    const { table } = renderTable();
    await ui.click(screen.getByRole("button", { name: /^Trainee/ }));
    expect(within(table).getByText("Leo Garcia")).toBeInTheDocument();
    expect(within(table).queryByText("Paolo Reyes")).not.toBeInTheDocument();

    await ui.click(screen.getByRole("button", { name: /^All/ }));
    await ui.type(screen.getByRole("searchbox", { name: "Search users" }), "ken");
    expect(within(table).getByText("Ken Ramos")).toBeInTheDocument();
    expect(within(table).queryByText("Leo Garcia")).not.toBeInTheDocument();
  });

  it("confirms a change, saves it, and enrolls the new intern", async () => {
    const ui = userEvent.setup();
    selectResult.mockResolvedValue({ data: [{ id: "t1" }], error: null });
    saveDataToDB.mockResolvedValue({});
    const { props, table } = renderTable();

    await ui.selectOptions(
      within(table).getByRole("combobox", { name: "Role for Leo Garcia" }),
      "intern",
    );
    expect(within(table).getByText("→ Intern", { exact: false })).toBeInTheDocument();
    await ui.click(
      within(table).getByRole("button", { name: "Save role for Leo Garcia" }),
    );

    expect(screen.getByRole("heading", { name: "Change role" })).toBeInTheDocument();
    expect(
      screen.getByText("Only sees the internships they're enrolled in."),
    ).toBeInTheDocument();
    await ui.selectOptions(screen.getByRole("combobox", { name: "Enroll in" }), "p1");
    await ui.click(screen.getByRole("button", { name: "Change role" }));

    await waitFor(() => {
      expect(props.onRoleChanged).toHaveBeenCalledWith("t1", "intern");
    });
    expect(saveDataToDB).toHaveBeenCalledWith(
      "program_enrollment",
      expect.any(String),
      expect.objectContaining({ program_id: "p1", user_id: "t1", status: "enrolled" }),
    );
    expect(props.onEnrolled).toHaveBeenCalled();
    expect(
      await screen.findByText("Leo Garcia's role is now Intern."),
    ).toBeInTheDocument();
  });

  it("uses the red confirm to remove access", async () => {
    const ui = userEvent.setup();
    const { table } = renderTable();
    await ui.selectOptions(
      within(table).getByRole("combobox", { name: "Role for Paolo Reyes" }),
      "none",
    );
    await ui.click(
      within(table).getByRole("button", { name: "Save role for Paolo Reyes" }),
    );
    expect(screen.getByRole("heading", { name: "Remove access" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove access" })).toHaveClass(
      "bg-rose-700",
    );
  });

  it("reloads instead of overwriting when someone else changed the role", async () => {
    const ui = userEvent.setup();
    selectResult.mockResolvedValue({ data: [], error: null });
    const { props, table } = renderTable();

    await ui.selectOptions(
      within(table).getByRole("combobox", { name: "Role for Leo Garcia" }),
      "team_member",
    );
    await ui.click(
      within(table).getByRole("button", { name: "Save role for Leo Garcia" }),
    );
    await ui.click(screen.getByRole("button", { name: "Change role" }));

    await waitFor(() => expect(props.onStale).toHaveBeenCalled());
    expect(props.onRoleChanged).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/already changed by someone else/),
    ).toBeInTheDocument();
  });

  it("shows the database's reason when the guard blocks a change", async () => {
    const ui = userEvent.setup();
    selectResult.mockResolvedValue({
      data: null,
      error: {
        message:
          "At least one team lead is required. Make someone else a team lead first.",
      },
    });
    const { props, table } = renderTable();

    await ui.selectOptions(
      within(table).getByRole("combobox", { name: "Role for Paolo Reyes" }),
      "team_member",
    );
    await ui.click(
      within(table).getByRole("button", { name: "Save role for Paolo Reyes" }),
    );
    await ui.click(screen.getByRole("button", { name: "Change role" }));

    expect(
      await screen.findByText(
        "At least one team lead is required. Make someone else a team lead first.",
      ),
    ).toBeInTheDocument();
    expect(props.onRoleChanged).not.toHaveBeenCalled();
  });
});
