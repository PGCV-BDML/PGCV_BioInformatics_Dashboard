import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardUIProvider } from "../../components/dashboard-ui-context";
import { ToastProvider } from "../../components/toast";
import ClientsPage from "./page";

const { getRowsFromDB, insertMaybeSingle, updateMaybeSingle } = vi.hoisted(
  () => ({
    getRowsFromDB: vi.fn(),
    insertMaybeSingle: vi.fn(),
    updateMaybeSingle: vi.fn(),
  }),
);

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB,
  supabase: {
    from: () => ({
      insert: () => ({
        select: () => ({ maybeSingle: insertMaybeSingle }),
      }),
      update: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: updateMaybeSingle }),
        }),
      }),
    }),
  },
}));

const existingRow = {
  id: "uuid-1",
  client_id: "CL-2026-001",
  name: "Ada Lovelace",
  project_id: "P-1",
  email_address: "ada@example.org",
  affiliation: "PGCV",
  designation: "PI",
  created_at: "2026-01-01T00:00:00.000Z",
};

function renderPage() {
  return render(
    <DashboardUIProvider>
      <ToastProvider>
        <ClientsPage />
      </ToastProvider>
    </DashboardUIProvider>,
  );
}

describe("ClientsPage edit", () => {
  beforeEach(() => {
    getRowsFromDB.mockReset();
    insertMaybeSingle.mockReset();
    updateMaybeSingle.mockReset();
    getRowsFromDB.mockResolvedValue([existingRow]);
  });

  it("opens the slide-over with the selected client's details", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit client" }));

    expect(screen.getByRole("heading", { name: "Edit Client" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Project ID" })).toHaveValue("P-1");
    expect(screen.getByRole("textbox", { name: /Client Name/ })).toHaveValue(
      "Ada Lovelace",
    );
    expect(screen.getByRole("button", { name: /Save Changes/ })).toBeInTheDocument();
  });

  it("writes edited fields back onto the table", async () => {
    const user = userEvent.setup();
    updateMaybeSingle.mockResolvedValue({
      data: {
        ...existingRow,
        project_id: "PRJ-204",
        designation: "Lead PI",
        notes: "Project ID: PRJ-204",
      },
      error: null,
    });

    renderPage();
    expect(await screen.findByText("P-1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit client" }));
    await user.clear(screen.getByRole("textbox", { name: "Project ID" }));
    await user.type(screen.getByRole("textbox", { name: "Project ID" }), "PRJ-204");
    await user.clear(screen.getByRole("textbox", { name: "Designation" }));
    await user.type(screen.getByRole("textbox", { name: "Designation" }), "Lead PI");
    await user.click(screen.getByRole("button", { name: /Save Changes/ }));

    await waitFor(() => {
      expect(screen.getByText("PRJ-204")).toBeInTheDocument();
    });
    expect(screen.getByText("Lead PI")).toBeInTheDocument();
    expect(screen.getByText("Client updated successfully.")).toBeInTheDocument();
  });
});
