export type DiffToken = {
  type: "equal" | "add" | "remove";
  value: string;
};

export type FaqTagDiff<T extends string = string> = {
  added: T[];
  removed: T[];
  unchanged: T[];
};

function lcsDiff(before: string[], after: string[]): DiffToken[] {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i]![j] =
        before[i] === after[j]
          ? (dp[i + 1]![j + 1] ?? 0) + 1
          : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      tokens.push({ type: "equal", value: before[i]! });
      i += 1;
      j += 1;
    } else if ((dp[i + 1]![j] ?? 0) >= (dp[i]![j + 1] ?? 0)) {
      tokens.push({ type: "remove", value: before[i]! });
      i += 1;
    } else {
      tokens.push({ type: "add", value: after[j]! });
      j += 1;
    }
  }
  while (i < n) {
    tokens.push({ type: "remove", value: before[i]! });
    i += 1;
  }
  while (j < m) {
    tokens.push({ type: "add", value: after[j]! });
    j += 1;
  }
  return tokens;
}

export function tokenizeFaqTitle(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? [];
}

export function diffFaqTitle(previous: string, current: string): DiffToken[] {
  return lcsDiff(tokenizeFaqTitle(previous), tokenizeFaqTitle(current));
}

export function diffFaqBodyLines(previous: string, current: string): DiffToken[] {
  return lcsDiff(previous.split("\n"), current.split("\n"));
}

export function diffFaqTags<T extends string>(
  previous: readonly T[],
  current: readonly T[],
): FaqTagDiff<T> {
  const prev = new Set(previous);
  const next = new Set(current);
  const unchanged = [...next].filter((tag) => prev.has(tag));
  const added = [...next].filter((tag) => !prev.has(tag));
  const removed = [...prev].filter((tag) => !next.has(tag));
  return { added, removed, unchanged };
}

export function faqDiffHasChanges(tokens: DiffToken[]): boolean {
  return tokens.some((token) => token.type !== "equal");
}
