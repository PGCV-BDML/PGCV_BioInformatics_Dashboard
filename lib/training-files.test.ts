import { describe, expect, it } from "vitest";
import {
  groupTrainingFilesByPerson,
  trainingFileAttribution,
  visibleTrainingFiles,
  type TrainingFileRecord,
} from "@/lib/training-files";

const ana = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const luis = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function file(
  partial: Partial<TrainingFileRecord> & Pick<TrainingFileRecord, "id">,
): TrainingFileRecord {
  return {
    title: partial.id,
    created_by: ana,
    created_at: "2026-10-19T00:00:00.000Z",
    ...partial,
  };
}

describe("trainingFileAttribution", () => {
  it("names a team member and a trainee", () => {
    expect(
      trainingFileAttribution({
        name: "Ana Cruz",
        role: "team_member",
        createdAt: "2026-10-19T12:00:00.000Z",
      }),
    ).toMatch(/^Ana Cruz · Team · 19 Oct 2026/);
    expect(
      trainingFileAttribution({
        name: "Luis Reyes",
        role: "trainee",
        createdAt: "2026-10-18T12:00:00.000Z",
      }),
    ).toMatch(/^Luis Reyes · Trainee · 18 Oct 2026/);
  });

  it("labels rows saved before authors were recorded", () => {
    expect(
      trainingFileAttribution({
        name: null,
        role: null,
        createdAt: "2026-08-01T12:00:00.000Z",
      }),
    ).toMatch(/^Added earlier · 1 Aug 2026/);
  });
});

describe("visibleTrainingFiles", () => {
  const files = [
    file({ id: "old", created_at: "2026-10-01T00:00:00.000Z", created_by: ana }),
    file({ id: "new", created_at: "2026-10-19T00:00:00.000Z", created_by: luis }),
    file({ id: "blank", created_by: null, created_at: null, title: "Handbook" }),
  ];

  it("puts the newest file first and undated files last", () => {
    expect(visibleTrainingFiles(files, "newest", ana).map((item) => item.id)).toEqual([
      "new",
      "old",
      "blank",
    ]);
  });

  it("reverses dated files for oldest", () => {
    expect(visibleTrainingFiles(files, "oldest", ana).map((item) => item.id)).toEqual([
      "old",
      "new",
      "blank",
    ]);
  });

  it("keeps only the signed-in person's files for mine", () => {
    expect(visibleTrainingFiles(files, "mine", ana).map((item) => item.id)).toEqual([
      "old",
    ]);
    expect(visibleTrainingFiles(files, "mine", null)).toEqual([]);
  });
});

describe("groupTrainingFilesByPerson", () => {
  it("groups under each person and leaves unauthored files last", () => {
    const files = [
      file({ id: "luis-new", created_by: luis, created_at: "2026-10-19T00:00:00.000Z" }),
      file({ id: "ana", created_by: ana, created_at: "2026-10-02T00:00:00.000Z" }),
      file({ id: "luis-old", created_by: luis, created_at: "2026-10-01T00:00:00.000Z" }),
      file({ id: "legacy", created_by: null, created_at: "2026-08-01T00:00:00.000Z" }),
    ];
    const groups = groupTrainingFilesByPerson(files, (item) =>
      item.created_by === ana ? "Ana Cruz" : "Luis Reyes",
    );
    expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
      ["Ana Cruz", ["ana"]],
      ["Luis Reyes", ["luis-new", "luis-old"]],
      ["Added earlier", ["legacy"]],
    ]);
  });
});
