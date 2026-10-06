import { useEffect, useMemo, useState } from "react";
import { useReveal } from "./use-reveal";
import styles from "./tour-motion.module.css";

const DURATION_MS = 1100;

type ParsedCount = { prefix: string; target: number; decimals: number; grouped: boolean; suffix: string };

/** Split "7,412", "360 TB" or "93.6%" into a number and the text around it. */
export function parseCount(value: string): ParsedCount | null {
  const match = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)([^]*)$/);
  if (!match) return null;
  const [, prefix = "", digits = "", suffix = ""] = match;
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return {
    prefix,
    target,
    decimals: digits.split(".")[1]?.length ?? 0,
    grouped: digits.includes(","),
    suffix,
  };
}

export function formatCount(parsed: ParsedCount, n: number): string {
  const number = parsed.grouped
    ? n.toLocaleString("en-PH", { minimumFractionDigits: parsed.decimals, maximumFractionDigits: parsed.decimals })
    : n.toFixed(parsed.decimals);
  return `${parsed.prefix}${number}${parsed.suffix}`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * A figure that counts up from zero the first time it scrolls into view.
 * The markup always carries the final value: without JavaScript, or with
 * reduced motion, that is simply what shows. Values that don't start with a
 * number are rendered as they are.
 */
export function CountUp({ value }: { value: string }) {
  const parsed = useMemo(() => parseCount(value), [value]);
  const [ref, reveal] = useReveal<HTMLSpanElement>();
  const [progress, setProgress] = useState(0);
  // `reveal` only becomes "visible" after hydration, so reading the media
  // query here never makes the server and client disagree.
  const animate = parsed !== null && reveal === "visible" && !prefersReducedMotion();

  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const shown = parsed && animate && progress < 1 ? formatCount(parsed, parsed.target * progress) : value;
  return (
    <span ref={ref} data-reveal={parsed ? reveal : undefined} data-final={value} className={styles.count}>
      <span className={styles.countValue}>{shown}</span>
    </span>
  );
}
