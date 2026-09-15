import { describe, expect, it } from "vitest";
import { insertWrap, parseFaqMarkdown, sanitizeHref } from "./markdown";

describe("sanitizeHref", () => {
  it("keeps http(s) and upgrades www", () => {
    expect(sanitizeHref("https://qiime2.org")).toBe("https://qiime2.org");
    expect(sanitizeHref("www.example.com")).toBe("https://www.example.com");
  });

  it("drops javascript and unknown schemes", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBeNull();
    expect(sanitizeHref("mailto:lab@example.com")).toBeNull();
  });
});

describe("parseFaqMarkdown", () => {
  it("renders fenced code with a language label", () => {
    const blocks = parseFaqMarkdown("```python\nprint('ok')\n```");
    expect(blocks).toEqual([
      { type: "code", language: "python", value: "print('ok')" },
    ]);
  });

  it("parses markdown links and autolinks", () => {
    const [paragraph] = parseFaqMarkdown(
      "See [QIIME 2](https://qiime2.org) and https://docs.conda.io",
    );
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type !== "paragraph") return;
    expect(paragraph.inlines).toEqual(
      expect.arrayContaining([
        { type: "link", value: "QIIME 2", href: "https://qiime2.org" },
        {
          type: "link",
          value: "https://docs.conda.io",
          href: "https://docs.conda.io",
        },
      ]),
    );
  });

  it("keeps raw HTML as text instead of executing it", () => {
    const [paragraph] = parseFaqMarkdown("<script>alert(1)</script>");
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type !== "paragraph") return;
    expect(paragraph.inlines).toEqual([
      { type: "text", value: "<script>alert(1)</script>" },
    ]);
  });

  it("supports bold, italic, and inline code", () => {
    const [paragraph] = parseFaqMarkdown("Use **fastp** and `conda` or *mamba*.");
    expect(paragraph?.type).toBe("paragraph");
    if (paragraph?.type !== "paragraph") return;
    expect(paragraph.inlines.some((part) => part.type === "bold")).toBe(true);
    expect(paragraph.inlines.some((part) => part.type === "code")).toBe(true);
    expect(paragraph.inlines.some((part) => part.type === "italic")).toBe(true);
  });
});

describe("insertWrap", () => {
  it("wraps a selection and parks the caret for an empty insert", () => {
    const wrapped = insertWrap("hello", 0, 5, "**");
    expect(wrapped.next).toBe("**hello**");
    const empty = insertWrap("", 0, 0, "```\n", "\n```");
    expect(empty.next).toBe("```\n\n```");
    expect(empty.selectionStart).toBe(4);
  });
});
