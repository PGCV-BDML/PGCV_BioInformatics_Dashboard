import type { CSSProperties } from "react";
import type { Audience, TourContent } from "@/lib/tour";
import type { SlideMeta } from "../slide-frame";

/*
 * Every slide in this folder lays out twice from one set of classes: the base
 * classes are the phone's stacked layout, and `canvas:` classes are the layout
 * on the 1280 x 720 canvas. No other breakpoint is used here (a test checks):
 * on the canvas the window's width says nothing about the slide's.
 */

export type SlideProps = { content: TourContent; audience: Audience; meta: SlideMeta };

/** Entrance delay; `styles.enter` and friends read it as --d. */
export const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Cards come in one after another, capped so long lists don't drag. */
export const stagger = (i: number, start = 200) => delay(start + Math.min(i, 8) * 60);
