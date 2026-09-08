import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TaskModal from "./taskmodal";
import type { Task } from "@/types/database";

const emptyForm: Omit<Task, "id"> = {
  title: "",
  assignee_id: null,
  assignee_ids: [],
  start_date: "",
  end_date: "",
  due_date: null,
  task_time: null,
  details: null,
  status: "pending",
  priority: "medium",
  linked_project_id: null,
  linked_analysis_id: null,
  categories: [],
  is_personal: false,
  owner_id: null,
};

const users = [
  { id: "u1", name: "Ada" },
  { id: "team", name: "Bioinformatics Team" },
  { id: "u2", name: "Grace" },
];

const statusOptions = [{ value: "pending" as const, label: "Pending" }];
const priorityOptions = [{ value: "medium" as const, label: "Medium" }];

describe("TaskModal assignees", () => {
  it("does not offer Bioinformatics Team when adding a task", () => {
    render(
      <TaskModal
        isOpen
        isAdding
        formState={emptyForm}
        availableProjects={[]}
        availableUsers={users}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        onInputChange={() => undefined}
        onCategoriesChange={() => undefined}
        onAssigneesChange={() => undefined}
        onClose={() => undefined}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Ada" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grace" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Bioinformatics Team" }),
    ).not.toBeInTheDocument();
  });

  it("keeps Bioinformatics Team visible when editing an existing assignment", () => {
    render(
      <TaskModal
        isOpen
        isAdding={false}
        formState={{
          ...emptyForm,
          title: "Team standup",
          assignee_id: "team",
          assignee_ids: ["team"],
        }}
        availableProjects={[]}
        availableUsers={users}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        onInputChange={() => undefined}
        onCategoriesChange={() => undefined}
        onAssigneesChange={() => undefined}
        onClose={() => undefined}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Bioinformatics Team" }),
    ).toBeInTheDocument();
  });
});
