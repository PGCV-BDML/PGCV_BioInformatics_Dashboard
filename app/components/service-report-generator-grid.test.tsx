import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceReportGeneratorGrid } from "./service-report-generator-grid";
import {
  catalogHrefById,
  createGeneratorTemplate,
  deleteGeneratorTemplate,
  generatorsWithHrefs,
  loadGenerators,
  saveGeneratorHrefMap,
  type ServiceReportGenerator,
} from "@/lib/service-report-generators";

const portal = vi.hoisted(() => ({ isStaff: true }));

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    isStaff: portal.isStaff,
    profile: { id: "user-1" },
  }),
}));

const showToast = vi.fn();
vi.mock("./toast", () => ({
  useToast: () => ({ showToast }),
}));

vi.mock("@/lib/service-report-generators", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/service-report-generators")>();
  return {
    ...actual,
    loadGenerators: vi.fn(async () =>
      actual.generatorsWithHrefs(actual.catalogHrefById()),
    ),
    saveGeneratorHrefMap: vi.fn(async (hrefs: Record<string, string>) => hrefs),
    createGeneratorTemplate: vi.fn(),
    updateGeneratorTemplate: vi.fn(),
    deleteGeneratorTemplate: vi.fn(async () => undefined),
  };
});

const viralTemplate: ServiceReportGenerator = {
  id: "viral-metagenomics",
  title: "Viral Metagenomics",
  description: "Open the Viral Metagenomics report generator.",
  href: "10.49.42.113:5080",
  icon: "biohazard",
  accent: "#d4537e",
  tint: "#fbeef2",
  custom: true,
  shareHost: true,
};

describe("ServiceReportGeneratorGrid", () => {
  beforeEach(() => {
    portal.isStaff = true;
    showToast.mockClear();
    vi.mocked(saveGeneratorHrefMap).mockClear();
    vi.mocked(createGeneratorTemplate).mockReset();
    vi.mocked(deleteGeneratorTemplate).mockClear();
    vi.mocked(loadGenerators).mockImplementation(async () =>
      generatorsWithHrefs(catalogHrefById()),
    );
  });

  it("lets staff edit and save generator addresses", async () => {
    const user = userEvent.setup();
    render(<ServiceReportGeneratorGrid />);

    expect(await screen.findByRole("button", { name: "Edit addresses" })).toBeInTheDocument();
    expect(screen.getByText("10.49.42.113:5050")).toBeInTheDocument();
    expect(screen.getByText("Custom Service Report Generator")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:8000")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit addresses" }));

    const labHost = screen.getByLabelText("Lab host");
    await user.clear(labHost);
    await user.type(labHost, "10.49.42.200");
    await user.click(screen.getByRole("button", { name: "Apply to all" }));

    await user.click(screen.getByRole("button", { name: "Save addresses" }));

    await waitFor(() => {
      expect(saveGeneratorHrefMap).toHaveBeenCalledWith(
        {
          "amplicon-assembly": "http://10.49.42.200:5050",
          "whole-genome-assembly": "http://10.49.42.200:5051",
          "16s-metabarcoding": "http://10.49.42.200:5070",
          "custom-service-report": "http://127.0.0.1:8000",
        },
        "user-1",
        expect.any(Array),
      );
    });
    expect(showToast).toHaveBeenCalledWith(
      "Generator addresses updated.",
      "success",
    );
    expect(catalogHrefById()["amplicon-assembly"]).toBe(
      "http://10.49.42.113:5050",
    );
  });

  it("adds a new template from the dialog", async () => {
    vi.mocked(createGeneratorTemplate).mockResolvedValue(viralTemplate);
    const user = userEvent.setup();
    render(<ServiceReportGeneratorGrid />);

    await user.click(await screen.findByRole("button", { name: "Add template" }));
    const dialog = screen.getByRole("dialog", { name: "Add report template" });

    await user.click(within(dialog).getByRole("button", { name: "Add template" }));
    expect(within(dialog).getByText("Enter a title.")).toBeInTheDocument();
    expect(
      within(dialog).getByText("Enter the generator's address."),
    ).toBeInTheDocument();
    expect(createGeneratorTemplate).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText("Title"), "Viral Metagenomics");
    await user.type(within(dialog).getByLabelText("Address"), "10.49.42.113:5080");
    await user.click(within(dialog).getByRole("button", { name: "Biohazard" }));
    await user.click(within(dialog).getByRole("button", { name: "Add template" }));

    await waitFor(() => {
      expect(createGeneratorTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Viral Metagenomics",
          href: "10.49.42.113:5080",
          icon: "biohazard",
          shareHost: true,
        }),
        expect.objectContaining({ updatedBy: "user-1" }),
      );
    });
    expect(
      screen.queryByRole("dialog", { name: "Add report template" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Viral Metagenomics")).toBeInTheDocument();
    expect(showToast).toHaveBeenCalledWith(
      'Added "Viral Metagenomics".',
      "success",
    );
  });

  it("removes a custom template but not built-in cards", async () => {
    vi.mocked(loadGenerators).mockResolvedValue([
      ...generatorsWithHrefs(catalogHrefById()),
      viralTemplate,
    ]);
    const user = userEvent.setup();
    render(<ServiceReportGeneratorGrid />);

    expect(await screen.findByText("Viral Metagenomics")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit addresses" }));

    expect(
      screen.queryByRole("button", { name: "Remove Amplicon Assembly" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Remove Viral Metagenomics" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm Delete" }));

    await waitFor(() => {
      expect(deleteGeneratorTemplate).toHaveBeenCalledWith("viral-metagenomics");
    });
    await waitFor(() => {
      expect(screen.queryByText("Viral Metagenomics")).not.toBeInTheDocument();
    });
  });

  it("hides template controls from non-staff", async () => {
    portal.isStaff = false;
    render(<ServiceReportGeneratorGrid />);

    expect(await screen.findByText("Amplicon Assembly")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add template" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /New template/ }),
    ).not.toBeInTheDocument();
  });
});
