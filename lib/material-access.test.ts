import { describe, expect, it } from "vitest";
import {
  canOpenAssignedMaterial,
  moduleRowMatchesTarget,
} from "@/lib/material-access";

describe("canOpenAssignedMaterial", () => {
  it("lets staff open a closed material", () => {
    expect(canOpenAssignedMaterial("team_lead", false)).toBe(true);
    expect(canOpenAssignedMaterial("team_member", false)).toBe(true);
  });

  it("lets trainees open a material only while it is open", () => {
    expect(canOpenAssignedMaterial("trainee", true)).toBe(true);
    expect(canOpenAssignedMaterial("intern", undefined)).toBe(true);
    expect(canOpenAssignedMaterial("trainee", false)).toBe(false);
  });

  it("refuses roles that are not staff or learners", () => {
    expect(canOpenAssignedMaterial("reviewing_officer", true)).toBe(false);
    expect(canOpenAssignedMaterial(null, true)).toBe(false);
  });
});

describe("moduleRowMatchesTarget", () => {
  it("matches a library id or a legacy repo path", () => {
    expect(
      moduleRowMatchesTarget("github-module:intro-linux", { id: "intro-linux" }),
    ).toBe(true);
    expect(
      moduleRowMatchesTarget("github:tracks/intro.html", {
        path: "tracks/intro.html",
      }),
    ).toBe(true);
  });

  it("rejects a request for a different module", () => {
    expect(
      moduleRowMatchesTarget("github-module:intro-linux", { id: "blast" }),
    ).toBe(false);
    expect(moduleRowMatchesTarget("github-module:intro-linux", {})).toBe(false);
  });
});
