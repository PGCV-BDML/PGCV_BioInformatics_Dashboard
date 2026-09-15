import { describe, expect, it } from "vitest";
import {
  articleMatchesSearch,
  articleMatchesTags,
  canAddFaqArticle,
  canDeleteFaqArticle,
  canUpdateFaqArticle,
  emptyFaqArticleForm,
  formFromFaqArticle,
  formatFaqLastUpdated,
} from "./faq-articles";
import type { FaqArticleListItem } from "./faq-articles";

function article(
  overrides: Partial<FaqArticleListItem> = {},
): FaqArticleListItem {
  return {
    id: "art-1",
    title: "How do I load conda on HPC?",
    body: "module load miniconda3",
    author_id: "user-1",
    updated_by: "user-2",
    created_at: "2026-09-15T02:00:00.000Z",
    updated_at: "2026-09-15T05:00:00.000Z",
    tags: ["conda", "hpc"],
    author_name: "Micah",
    updated_by_name: "Alex",
    ...overrides,
  };
}

describe("FAQ catalog permissions", () => {
  it("lets any staff add or update", () => {
    expect(canAddFaqArticle("team_member")).toBe(true);
    expect(canUpdateFaqArticle("team_lead")).toBe(true);
    expect(canAddFaqArticle("intern")).toBe(false);
    expect(canUpdateFaqArticle("trainee")).toBe(false);
  });

  it("lets the author or lead delete", () => {
    expect(canDeleteFaqArticle("team_member", "user-1", "user-1")).toBe(true);
    expect(canDeleteFaqArticle("team_member", "user-2", "user-1")).toBe(false);
    expect(canDeleteFaqArticle("team_lead", "lead", "user-1")).toBe(true);
  });
});

describe("FAQ catalog helpers", () => {
  it("starts empty with no tags", () => {
    expect(emptyFaqArticleForm()).toEqual({ title: "", body: "", tags: [] });
  });

  it("maps a stored article back into the editor", () => {
    expect(formFromFaqArticle(article()).tags).toEqual(["conda", "hpc"]);
  });

  it("matches search across title, answer, tags, and names", () => {
    expect(articleMatchesSearch(article(), "conda")).toBe(true);
    expect(articleMatchesSearch(article(), "miniconda")).toBe(true);
    expect(articleMatchesSearch(article(), "alex")).toBe(true);
    expect(articleMatchesSearch(article(), "rna-seq")).toBe(false);
  });

  it("uses OR across selected tags", () => {
    expect(articleMatchesTags(article(), ["python"])).toBe(false);
    expect(articleMatchesTags(article(), ["hpc", "python"])).toBe(true);
    expect(articleMatchesTags(article(), [])).toBe(true);
  });

  it("formats last updated with the editor name", () => {
    expect(formatFaqLastUpdated("2026-09-15T05:00:00.000Z", "Alex")).toContain(
      "by Alex",
    );
    expect(formatFaqLastUpdated(null, null)).toBe("Last updated — by Staff");
  });
});
