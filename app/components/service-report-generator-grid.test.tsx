import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ServiceReportGeneratorGrid } from "./service-report-generator-grid";
import {
  catalogHrefById,
  saveGeneratorHrefMap,
} from "@/lib/service-report-generators";

vi.mock("./portal-context", () => ({
  usePortal: () => ({
    isStaff: true,
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
    loadGeneratorHrefMap: vi.fn(async () => actual.catalogHrefById()),
    saveGeneratorHrefMap: vi.fn(async (hrefs: Record<string, string>) => hrefs),
  };
});

describe("ServiceReportGeneratorGrid", () => {
  beforeEach(() => {
    showToast.mockClear();
    vi.mocked(saveGeneratorHrefMap).mockClear();
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
});
