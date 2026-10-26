import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import ProgramParticipants from "./program-participants";
import { getRowsFromDB, getUsersFromDB } from "@/lib/supabase";
import { fetchModuleCatalog } from "@/lib/module-library-client";
import { moduleLinkForId } from "@/lib/module-library";

// Like Next.js, re-render when the page calls history.replaceState.
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const listeners = new Set<() => void>();
  const replaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args) => {
    replaceState(...args);
    listeners.forEach((listener) => listener());
  };
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  return {
    useRouter: () => ({ replace: vi.fn() }),
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});

vi.mock("@/lib/module-library-client", () => ({
  fetchModuleCatalog: vi.fn(),
}));

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    canEnroll: false,
    isLearnerView: false,
    refreshEnrollments: vi.fn(),
  }),
}));

vi.mock("./toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock("@/lib/supabase", () => ({
  getRowsFromDB: vi.fn(),
  getUsersFromDB: vi.fn(),
  getCurrentUser: vi.fn(),
  saveDataToDB: vi.fn(),
  deleteDataFromDB: vi.fn(),
}));

const trainee = {
  id: "u-ada",
  name: "Ada Lovelace",
  email: "ada@example.com",
  institution: "PGCV",
  role: "trainee",
};

function mockParticipantRows() {
  vi.mocked(getUsersFromDB).mockResolvedValue([trainee] as never);
  vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
    if (table === "program_enrollment") {
      return [
        {
          id: "enr-1",
          program_id: "prog-1",
          user_id: "u-ada",
          status: "enrolled",
        },
      ] as never;
    }
    return [] as never;
  });
}

describe("ProgramParticipants certificate column", () => {
  beforeEach(() => {
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(getUsersFromDB).mockReset();
    mockParticipantRows();
  });

  it("hides the certificate column on a training", async () => {
    render(
      <ProgramParticipants programId="prog-1" programType="training" />,
    );

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Certificate" }),
    ).toBeNull();
    expect(screen.queryByText("Pending")).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "Pre-Test Score" }),
    ).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "Post-Test Score" }),
    ).toBeNull();
  });

  it("keeps the certificate column on an internship", async () => {
    vi.mocked(getUsersFromDB).mockResolvedValue([
      { ...trainee, role: "intern" },
    ] as never);

    render(
      <ProgramParticipants programId="prog-1" programType="internship" />,
    );

    expect(
      await screen.findByRole("columnheader", { name: "Certificate" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Pre-Test Score" }),
    ).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "Post-Test Score" }),
    ).toBeNull();
  });
});

describe("ProgramParticipants module progress", () => {
  const modules = [
    { id: "nfdi-software-setup", title: "Software Setup", checklist: [{ id: "a", label: "A" }, { id: "b", label: "B" }] },
    { id: "nfdi-pre-test", title: "NFDI Pre-test", checklist: [{ id: "q1", label: "Q1" }, { id: "q2", label: "Q2" }] },
    { id: "nfdi-16s", title: "16S rRNA Preprocessing", checklist: [{ id: "s1", label: "S1" }] },
  ];

  beforeEach(() => {
    window.history.replaceState(null, "", "/");
    vi.mocked(getRowsFromDB).mockReset();
    vi.mocked(getUsersFromDB).mockReset();
    vi.mocked(getUsersFromDB).mockResolvedValue([
      trainee,
      { ...trainee, id: "u-bob", name: "Bob Builder", email: "bob@example.com" },
    ] as never);
    vi.mocked(fetchModuleCatalog).mockResolvedValue({
      configured: true,
      modules,
    } as never);
    vi.mocked(getRowsFromDB).mockImplementation(async (table) => {
      if (table === "program_enrollment") {
        return [
          { id: "enr-1", program_id: "prog-1", user_id: "u-ada", status: "enrolled" },
          { id: "enr-2", program_id: "prog-1", user_id: "u-bob", status: "enrolled" },
        ] as never;
      }
      if (table === "module") {
        return modules.map((m) => ({
          id: `mod-${m.id}`,
          program_id: "prog-1",
          html_content_link: moduleLinkForId(m.id),
        })) as never;
      }
      if (table === "module_progress") {
        return [
          { user_id: "u-ada", module_id: "nfdi-software-setup", item_id: "a", done: true },
          { user_id: "u-ada", module_id: "nfdi-software-setup", item_id: "b", done: true },
          { user_id: "u-ada", module_id: "nfdi-pre-test", item_id: "q1", done: false, evidence: "Answer: C" },
          { user_id: "u-bob", module_id: "nfdi-software-setup", item_id: "a", done: true },
        ] as never;
      }
      return [] as never;
    });
  });

  it("shows one Progress column instead of a column per module", async () => {
    render(<ProgramParticipants programId="prog-1" programType="training" />);

    expect(await screen.findByRole("columnheader", { name: "Progress" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Software Setup" })).toBeNull();
    expect(screen.getByText("2 of 3 modules")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 modules")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Software Setup · In progress · 1 / 2" }),
    ).toBeInTheDocument();
  });

  it("adds a sortable column for a focused module and filters by its status", async () => {
    render(<ProgramParticipants programId="prog-1" programType="training" />);

    const chips = await screen.findByRole("group", { name: "Focus on a module" });
    fireEvent.click(within(chips).getByRole("button", { name: /Pre-test/ }));

    expect(screen.getByRole("columnheader", { name: "Pre-test" })).toBeInTheDocument();
    expect(window.location.search).toBe("?module=nfdi-pre-test");

    const filters = screen.getByRole("group", { name: "Filter by status" });
    fireEvent.click(within(filters).getByRole("button", { name: "Not started" }));
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
    expect(screen.getByText("Bob Builder")).toBeInTheDocument();
  });

  it("opens a drawer with every module when a name is clicked", async () => {
    render(<ProgramParticipants programId="prog-1" programType="training" />);

    fireEvent.click(await screen.findByRole("button", { name: "Ada Lovelace" }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("2 of 3 modules finished")).toBeInTheDocument();
    expect(within(drawer).getByText("16S rRNA Preprocessing")).toBeInTheDocument();
  });
});
