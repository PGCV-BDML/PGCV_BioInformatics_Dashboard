import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IncidentReportModal from "./incident-report-modal";
import { emptyIncidentForm } from "@/lib/incident-reports";

const staffUsers = [
  { id: "lead-1", name: "Taylor Lead" },
  { id: "admin-1", name: "Alex Admin" },
];

describe("IncidentReportModal", () => {
  it("lets staff pick an optional point person", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <IncidentReportModal
        isOpen
        isAdding
        isSaving={false}
        initialData={{
          ...emptyIncidentForm(new Date(2026, 7, 26)),
          title: "Lab wifi is down",
          description: "Cannot reach the sequencer share.",
        }}
        staffUsers={staffUsers}
        userNames={{}}
        canEditDetails
        canChangeStatus
        canAssignPointPerson
        statusEvents={[]}
        onClose={() => undefined}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByText("Point person")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Alex Admin" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      title: "Lab wifi is down",
      point_person_id: "admin-1",
    });
  });
});
