import { describe, expect, it } from "vitest";
import {
  eligibleRepositoriesForNewRun,
  formatAnalystNames,
  repositoryHasRunId,
  validateRunForm,
} from "./sequencing-run-checklist";
import type { Repository, UserOption } from "@/types/database";

const repoWithRun: Repository = {
  id: "repo-1",
  kind: "drive",
  title: "Client sequences — UPV",
  url: "https://drive.example/run",
  description: null,
  category: "client_sequences",
  run_id: "NS_0073",
};

const repoWithoutRun: Repository = {
  ...repoWithRun,
  id: "repo-2",
  title: "Missing run ID",
  run_id: null,
};

describe("repositoryHasRunId", () => {
  it("returns true when run_id is set", () => {
    expect(repositoryHasRunId(repoWithRun)).toBe(true);
  });

  it("returns false for blank run_id", () => {
    expect(repositoryHasRunId(repoWithoutRun)).toBe(false);
  });
});

describe("eligibleRepositoriesForNewRun", () => {
  it("includes repos with run_id that are not already used", () => {
    const eligible = eligibleRepositoriesForNewRun(
      [repoWithRun, repoWithoutRun],
      new Set(),
    );
    expect(eligible).toEqual([repoWithRun]);
  });

  it("excludes repos already tied to a checklist", () => {
    const eligible = eligibleRepositoriesForNewRun(
      [repoWithRun],
      new Set(["repo-1"]),
    );
    expect(eligible).toEqual([]);
  });
});

describe("validateRunForm", () => {
  it("requires a repository with a run ID", () => {
    const errs = validateRunForm(
      {
        repository_id: "repo-2",
        date_received: "2026-02-02",
        notes: "",
      },
      [repoWithoutRun],
    );
    expect(errs.repository_id).toBe("Add run ID on Repository first.");
  });
});

describe("formatAnalystNames", () => {
  it("joins analyst names with commas", () => {
    const users = new Map<string, UserOption>([
      ["u1", { id: "u1", name: "Maria" }],
      ["u2", { id: "u2", name: "Juan" }],
    ]);
    expect(formatAnalystNames(["u1", "u2"], users)).toBe("Maria, Juan");
  });

  it("returns em dash when unassigned", () => {
    expect(formatAnalystNames([], new Map())).toBe("—");
  });
});
