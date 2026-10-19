import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgramWorkspaceLayout from "./program-workspace-layout";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/training/prog-1",
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./portal-context", () => ({
  usePortal: () => ({ isLearnerView: false }),
}));

const program = {
  id: "prog-1",
  title: "Genome analysis",
  description: "",
  start_date: "2026-10-01",
  end_date: "2026-10-03",
  leaderName: "Ana",
  status: "ongoing" as const,
};

describe("program workspace tabs", () => {
  it("places Presentations immediately after Modules on a training", () => {
    render(
      <ProgramWorkspaceLayout programType="training" program={program}>
        <p>Body</p>
      </ProgramWorkspaceLayout>,
    );

    const tabs = screen.getAllByRole("link").map((link) => link.textContent);
    const modules = tabs.indexOf("Modules");
    const presentations = tabs.indexOf("Presentations");
    expect(modules).toBeGreaterThanOrEqual(0);
    expect(presentations).toBe(modules + 1);
    expect(screen.getByRole("link", { name: "Presentations" })).toHaveAttribute(
      "href",
      "/dashboard/training/prog-1/presentations",
    );
    expect(screen.queryByRole("link", { name: "Certificate" })).toBeNull();
  });

  it("does not show Presentations on an internship", () => {
    render(
      <ProgramWorkspaceLayout programType="internship" program={program}>
        <p>Body</p>
      </ProgramWorkspaceLayout>,
    );

    expect(screen.queryByRole("link", { name: "Presentations" })).toBeNull();
    expect(screen.getByRole("link", { name: "Modules" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Certificate" })).toHaveAttribute(
      "href",
      "/dashboard/internship/prog-1/certificate",
    );
  });
});
