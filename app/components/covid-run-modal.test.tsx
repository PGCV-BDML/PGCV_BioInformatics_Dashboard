import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CovidRunModal, { EMPTY_COVID_RUN_FORM } from "./covid-run-modal";

describe("CovidRunModal", () => {
  it("locks all fields in view-only mode and has no Save action", () => {
    const onSubmit = vi.fn();

    render(
      <CovidRunModal
        isOpen
        isAdding={false}
        isSaving={false}
        initialData={{
          ...EMPTY_COVID_RUN_FORM,
          run_number: "76",
          run_id: "NS_0061",
          comments: "Check coverage",
        }}
        onClose={() => undefined}
        onSubmit={onSubmit}
        readOnly
      />,
    );

    expect(screen.getByRole("heading", { name: "Sequencing Run" })).toBeInTheDocument();
    expect(screen.getByText("COVID-19 Sample Tracker — view only.")).toBeInTheDocument();
    expect(screen.getByLabelText("Run number")).toBeDisabled();
    expect(screen.getByLabelText("Run ID")).toBeDisabled();
    expect(screen.getByLabelText("Comments")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
