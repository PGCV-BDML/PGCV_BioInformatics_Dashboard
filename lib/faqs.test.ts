import { describe, expect, it } from "vitest";
import {
  canAcceptFaqAnswer,
  canAskFaq,
  canCloseFaqThread,
  canDeleteFaqThread,
  canEditFaqPost,
  canPostFaqAnswer,
  canPostFaqComment,
  commentsOf,
  emptyFaqForm,
  formFromFaqThread,
  normalizeFaqBody,
  normalizeFaqTitle,
  sortFaqAnswers,
  threadHasAnswers,
  threadMatchesSearch,
  threadMatchesTags,
  buildFaqThreadListItem,
  answersOf,
} from "./faqs";
import type { FaqPost, FaqThread } from "@/types/database";
import type { FaqThreadListItem } from "./faqs";
import { uniqueFaqTags } from "./faq-tags";

function thread(
  overrides: Partial<FaqThreadListItem> = {},
): FaqThreadListItem {
  return {
    id: "faq-1",
    title: "How do I install QIIME 2?",
    body: "conda env create fails on HPC.",
    status: "open",
    author_id: "user-1",
    accepted_post_id: null,
    closed_at: null,
    closed_by: null,
    created_at: "2026-09-15T02:00:00.000Z",
    tags: ["conda", "hpc"],
    answer_count: 1,
    last_activity_at: "2026-09-15T03:00:00.000Z",
    author_name: "Micah",
    ...overrides,
  };
}

describe("FAQ permissions", () => {
  it("is staff-only for asking and commenting", () => {
    expect(canAskFaq("team_member")).toBe(true);
    expect(canAskFaq("trainee")).toBe(false);
    expect(canPostFaqComment("team_lead")).toBe(true);
    expect(canPostFaqComment("intern")).toBe(false);
  });

  it("lets the author or lead close, but not other members", () => {
    expect(canCloseFaqThread("team_lead", "lead", "user-1")).toBe(true);
    expect(canCloseFaqThread("team_member", "user-1", "user-1")).toBe(true);
    expect(canCloseFaqThread("team_member", "user-2", "user-1")).toBe(false);
  });

  it("blocks new answers on closed threads, but comments stay on", () => {
    expect(canPostFaqAnswer("team_member", "open")).toBe(true);
    expect(canPostFaqAnswer("team_member", "closed")).toBe(false);
    expect(canPostFaqComment("team_member")).toBe(true);
  });

  it("lets the author delete only when there are no answers", () => {
    expect(canDeleteFaqThread("team_member", "user-1", "user-1", false)).toBe(
      true,
    );
    expect(canDeleteFaqThread("team_member", "user-1", "user-1", true)).toBe(
      false,
    );
    expect(canDeleteFaqThread("team_lead", "lead", "user-1", true)).toBe(true);
  });

  it("lets the question owner accept an answer", () => {
    expect(canAcceptFaqAnswer("team_member", "user-1", "user-1")).toBe(true);
    expect(canAcceptFaqAnswer("team_member", "user-2", "user-1")).toBe(false);
  });

  it("lets authors edit their own posts", () => {
    expect(canEditFaqPost("team_member", "user-2", "user-2")).toBe(true);
    expect(canEditFaqPost("team_member", "user-2", "user-1")).toBe(false);
  });
});

describe("FAQ form helpers", () => {
  it("starts empty with no tags", () => {
    expect(emptyFaqForm()).toEqual({ title: "", body: "", tags: [] });
  });

  it("keeps advice and drops the misspelling advise", () => {
    expect(uniqueFaqTags(["advise", "advice", "advice", "conda"])).toEqual([
      "advice",
      "conda",
    ]);
  });

  it("rejects blank titles and overlong bodies", () => {
    expect(normalizeFaqTitle("  ")).toBeNull();
    expect(normalizeFaqTitle("a".repeat(201))).toBeNull();
    expect(normalizeFaqBody("   ")).toBeNull();
  });

  it("maps a stored thread back into the editor", () => {
    const stored: FaqThread = {
      id: "faq-1",
      title: "Conda on HPC",
      body: "module load miniconda",
      status: "open",
      author_id: "user-1",
      accepted_post_id: null,
      closed_at: null,
      closed_by: null,
      created_at: "2026-09-15T02:00:00.000Z",
      tags: ["conda", "hpc"],
    };
    expect(formFromFaqThread(stored).tags).toEqual(["conda", "hpc"]);
  });
});

describe("FAQ list filters", () => {
  it("matches search across title, tags, and author", () => {
    expect(threadMatchesSearch(thread(), "qiime")).toBe(true);
    expect(threadMatchesSearch(thread(), "conda")).toBe(true);
    expect(threadMatchesSearch(thread(), "micah")).toBe(true);
    expect(threadMatchesSearch(thread(), "rna-seq")).toBe(false);
  });

  it("uses OR across selected tags", () => {
    expect(threadMatchesTags(thread(), ["python"])).toBe(false);
    expect(threadMatchesTags(thread(), ["hpc", "python"])).toBe(true);
    expect(threadMatchesTags(thread(), [])).toBe(true);
  });

  it("counts live answers and uses the latest post as activity", () => {
    const item = buildFaqThreadListItem(
      {
        id: "faq-1",
        title: "How do I install QIIME 2?",
        body: "conda env create fails on HPC.",
        status: "open",
        author_id: "user-1",
        accepted_post_id: null,
        closed_at: null,
        closed_by: null,
        created_at: "2026-09-15T02:00:00.000Z",
      },
      ["conda"],
      [
        {
          kind: "answer",
          deleted_at: null,
          created_at: "2026-09-15T03:00:00.000Z",
        },
        {
          kind: "answer",
          deleted_at: "2026-09-15T04:00:00.000Z",
          created_at: "2026-09-15T04:00:00.000Z",
        },
        {
          kind: "comment",
          deleted_at: null,
          created_at: "2026-09-15T05:00:00.000Z",
        },
      ],
      "Micah",
    );
    expect(item.answer_count).toBe(1);
    expect(item.last_activity_at).toBe("2026-09-15T05:00:00.000Z");
    expect(item.author_name).toBe("Micah");
  });
});

describe("FAQ thread layout helpers", () => {
  const posts: FaqPost[] = [
    {
      id: "a-1",
      thread_id: "faq-1",
      parent_id: null,
      author_id: "u-2",
      kind: "answer",
      body: "Use mamba.",
      deleted_at: null,
      created_at: "2026-09-15T03:00:00.000Z",
    },
    {
      id: "c-q",
      thread_id: "faq-1",
      parent_id: null,
      author_id: "u-1",
      kind: "comment",
      body: "Clarifying the question.",
      deleted_at: null,
      created_at: "2026-09-15T03:01:00.000Z",
    },
    {
      id: "c-1",
      thread_id: "faq-1",
      parent_id: "a-1",
      author_id: "u-1",
      kind: "comment",
      body: "Thanks.",
      deleted_at: null,
      created_at: "2026-09-15T03:05:00.000Z",
    },
    {
      id: "a-2",
      thread_id: "faq-1",
      parent_id: null,
      author_id: "u-3",
      kind: "answer",
      body: "Or micromamba.",
      deleted_at: null,
      created_at: "2026-09-15T03:10:00.000Z",
    },
  ];

  it("puts the accepted answer first", () => {
    const sorted = sortFaqAnswers(
      posts.filter((post) => post.kind === "answer"),
      "a-2",
    );
    expect(sorted[0]?.id).toBe("a-2");
  });

  it("groups comments under the parent answer, not the question", () => {
    expect(answersOf(posts).map((post) => post.id)).toEqual(["a-1", "a-2"]);
    expect(commentsOf(posts, "a-1").map((post) => post.id)).toEqual(["c-1"]);
    expect(commentsOf(posts, "a-2")).toEqual([]);
  });

  it("ignores deleted answers when counting", () => {
    expect(threadHasAnswers(posts)).toBe(true);
    expect(
      threadHasAnswers([{ ...posts[0]!, deleted_at: "2026-09-15T04:00:00.000Z" }]),
    ).toBe(false);
  });
});
