export type MarkdownInline =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string }
  | { type: "bold"; inlines: MarkdownInline[] }
  | { type: "italic"; inlines: MarkdownInline[] };

export type MarkdownBlock =
  | { type: "paragraph"; inlines: MarkdownInline[] }
  | { type: "code"; language: string | null; value: string };

const TRAILING_SOFT_PUNCTUATION = new Set([
  ".",
  ",",
  ";",
  ":",
  "!",
  "?",
  "'",
  '"',
]);

function unmatchedCloser(url: string, open: string, close: string): boolean {
  let depth = 0;
  for (const char of url) {
    if (char === open) depth += 1;
    else if (char === close) depth -= 1;
  }
  return depth < 0;
}

function trimUrlMatch(raw: string): string {
  let url = raw;
  while (url.length > 0) {
    const last = url.at(-1);
    if (!last) break;
    if (TRAILING_SOFT_PUNCTUATION.has(last)) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === ")" && unmatchedCloser(url, "(", ")")) {
      url = url.slice(0, -1);
      continue;
    }
    if (last === "]" && unmatchedCloser(url, "[", "]")) {
      url = url.slice(0, -1);
      continue;
    }
    break;
  }
  return url;
}

/** Only http(s) links — javascript: and relative schemes are dropped. */
export function sanitizeHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^www\./i.test(trimmed) ? `https://${trimmed}` : trimmed;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return candidate;
  } catch {
    return null;
  }
}

function urlAt(text: string, index: number): { value: string; href: string } | null {
  const slice = text.slice(index);
  const match = /^(?:https?:\/\/|www\.)[^\s<>"'`]+/i.exec(slice);
  if (!match) return null;
  const value = trimUrlMatch(match[0]);
  const href = sanitizeHref(value);
  if (!href) return null;
  return { value, href };
}

function parseInlines(text: string): MarkdownInline[] {
  const out: MarkdownInline[] = [];
  let i = 0;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    out.push({ type: "text", value: buffer });
    buffer = "";
  };

  while (i < text.length) {
    const char = text[i];

    if (char === "`") {
      const close = text.indexOf("`", i + 1);
      if (close > i) {
        flush();
        out.push({ type: "code", value: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    if (char === "[" ) {
      const closeLabel = text.indexOf("](", i + 1);
      if (closeLabel > i) {
        const closeUrl = text.indexOf(")", closeLabel + 2);
        if (closeUrl > closeLabel) {
          const label = text.slice(i + 1, closeLabel);
          const href = sanitizeHref(text.slice(closeLabel + 2, closeUrl));
          if (href && label.length > 0) {
            flush();
            out.push({ type: "link", value: label, href });
            i = closeUrl + 1;
            continue;
          }
        }
      }
    }

    if (text.startsWith("**", i)) {
      const close = text.indexOf("**", i + 2);
      if (close > i + 1) {
        flush();
        out.push({
          type: "bold",
          inlines: parseInlines(text.slice(i + 2, close)),
        });
        i = close + 2;
        continue;
      }
    }

    if (char === "*" && text[i + 1] !== "*") {
      const close = text.indexOf("*", i + 1);
      if (close > i) {
        flush();
        out.push({
          type: "italic",
          inlines: parseInlines(text.slice(i + 1, close)),
        });
        i = close + 1;
        continue;
      }
    }

    const autolink = urlAt(text, i);
    if (autolink) {
      flush();
      out.push({ type: "link", value: autolink.value, href: autolink.href });
      i += autolink.value.length;
      continue;
    }

    buffer += char;
    i += 1;
  }

  flush();
  return out.length > 0 ? out : [{ type: "text", value: text }];
}

const OPEN_FENCE = /^```([a-zA-Z0-9_+-]*)[ \t]*$/;
const CLOSE_FENCE = /^```[ \t]*$/;

/**
 * Small markdown subset for FAQ bodies: fenced code, inline code,
 * markdown links, autolinked http(s) URLs, **bold**, and *italic*.
 * No raw HTML — callers must render the AST as React text nodes.
 */
export function parseFaqMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  const para: string[] = [];
  let i = 0;

  const flushParagraph = () => {
    const text = para.join("\n").trim();
    para.length = 0;
    if (!text) return;
    blocks.push({ type: "paragraph", inlines: parseInlines(text) });
  };

  while (i < lines.length) {
    const open = OPEN_FENCE.exec(lines[i] ?? "");
    if (open) {
      flushParagraph();
      const language = open[1] ? open[1] : null;
      i += 1;
      const code: string[] = [];
      while (i < lines.length && !CLOSE_FENCE.test(lines[i] ?? "")) {
        code.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ type: "code", language, value: code.join("\n") });
      continue;
    }

    para.push(lines[i] ?? "");
    i += 1;
  }

  flushParagraph();
  return blocks;
}

export function insertWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string = before,
): { next: string; selectionStart: number; selectionEnd: number } {
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  if (selected) {
    return {
      next,
      selectionStart: start,
      selectionEnd: start + before.length + selected.length + after.length,
    };
  }
  return {
    next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length,
  };
}
