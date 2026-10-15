import { buildAnswerSheet } from "@/lib/assessment-answers";
import {
  hasAnswerPayload,
  latestResponsesByParticipant,
  type AssessmentResponseRow,
} from "@/lib/assessment-summary";
import type { Question } from "@/types/database";

export type ResponseExportUser = {
  name: string;
  email?: string | null;
  institution?: string | null;
};

export type ResponseExportRow = {
  name: string;
  email: string;
  institution: string;
  test: "pre_test" | "post_test";
  section: string;
  number: number;
  question: string;
  type: Question["type"];
  answer: string;
  correct_answer: string;
  status: string;
  score: string;
  submitted_at: string;
};

const COLUMNS = [
  "name",
  "email",
  "institution",
  "test",
  "section",
  "number",
  "question",
  "type",
  "answer",
  "correct_answer",
  "status",
  "score",
  "submitted_at",
] as const satisfies ReadonlyArray<keyof ResponseExportRow>;

function displayName(user: ResponseExportUser | undefined): string {
  return user?.name?.trim() || "Participant";
}

/**
 * One row per submitted question. Unsubmitted tests are left out. Blank
 * questions on a submitted test stay in the file so a missing answer is visible.
 */
export function buildResponseExportRows(input: {
  preId: string | null;
  postId: string | null;
  preQuestions: Question[];
  postQuestions: Question[];
  responses: AssessmentResponseRow[];
  usersById: Record<string, ResponseExportUser>;
  participantId?: string | null;
}): ResponseExportRow[] {
  const latest = latestResponsesByParticipant(
    input.responses.filter((row) => hasAnswerPayload(row.answers)),
  );
  const tests = [
    {
      id: input.preId,
      kind: "pre_test" as const,
      questions: input.preQuestions,
    },
    {
      id: input.postId,
      kind: "post_test" as const,
      questions: input.postQuestions,
    },
  ];

  const participantIds = new Set<string>();
  for (const row of latest) {
    if (input.participantId && row.participant_id !== input.participantId) {
      continue;
    }
    if (tests.some((test) => test.id && row.assessment_id === test.id)) {
      participantIds.add(row.participant_id);
    }
  }

  const orderedIds = [...participantIds].sort((a, b) => {
    const byName = displayName(input.usersById[a]).localeCompare(
      displayName(input.usersById[b]),
    );
    return byName || a.localeCompare(b);
  });

  const rows: ResponseExportRow[] = [];
  for (const participantId of orderedIds) {
    const user = input.usersById[participantId];
    for (const test of tests) {
      if (!test.id) continue;
      const response = latest.find(
        (row) =>
          row.participant_id === participantId &&
          row.assessment_id === test.id,
      );
      if (!response) continue;
      const sheet = buildAnswerSheet(test.questions, response);
      for (const item of sheet.items) {
        rows.push({
          name: displayName(user),
          email: user?.email?.trim() ?? "",
          institution: user?.institution?.trim() ?? "",
          test: test.kind,
          section: item.section ?? "",
          number: item.number,
          question: item.question,
          type: item.type,
          answer: item.answer ?? "",
          correct_answer: item.correctAnswer ?? "",
          status: item.status,
          score: sheet.score == null ? "" : String(sheet.score),
          submitted_at: sheet.submittedAt ?? "",
        });
      }
    }
  }
  return rows;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv(rows: ResponseExportRow[]): string {
  const header = COLUMNS.join(",");
  const body = rows.map((row) =>
    COLUMNS.map((column) => csvCell(row[column])).join(","),
  );
  return [header, ...body].join("\r\n");
}

function fileDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fileSlug(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "learner";
}

export function responseExportFileName(input?: {
  participantName?: string | null;
  date?: Date;
}): string {
  const stamp = fileDate(input?.date ?? new Date());
  const name = input?.participantName?.trim();
  if (!name) return `pre-post-responses-${stamp}.csv`;
  return `pre-post-responses-${fileSlug(name)}-${stamp}.csv`;
}

/** Saves a CSV in the browser. A leading BOM lets Excel read accents. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
