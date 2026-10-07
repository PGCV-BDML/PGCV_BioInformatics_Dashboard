"use client";

import { useEffect, useRef, useState } from "react";
import type { GLViewer } from "3dmol";
import type { TourVirusMutation, VirusShape } from "@/lib/tour-virus";
import { CHAIN_COLORS, MARKER, ROLE_COLORS } from "./virus-colors";
import { VirusStill } from "./virus-still";

export type VirusView = "virus" | "spike";

/**
 * "3d" once the WebGL viewer is up; "still" draws a flat picture instead when
 * the browser has no WebGL; "failed" when a file or the 3D library didn't load.
 */
type Mode = "loading" | "3d" | "still" | "failed";


type Vec = { x: number; y: number; z: number };

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Interactive SARS-CoV-2 model (3Dmol.js): the schematic whole virus, or the
 * experimental spike (PDB 7KJ2) with mutation sites marked. Focusing a site
 * turns the spike so the site faces the viewer. Loads only once the slide is
 * near the screen, and stops spinning while it is off screen.
 */
export function VirusViewer({
  view,
  site,
  mutations,
  spinning,
  onOpenSpike,
  onInteractiveChange,
}: {
  view: VirusView;
  site: TourVirusMutation | null;
  mutations: TourVirusMutation[];
  spinning: boolean;
  onOpenSpike: () => void;
  /** Whether the model can be turned (false for the still picture). */
  onInteractiveChange?: (interactive: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const paintedRef = useRef<VirusView | null>(null);
  const homeRef = useRef<Partial<Record<VirusView, number[]>>>({});
  const centerRef = useRef<Vec | null>(null);
  const frameRef = useRef<number | null>(null);
  const openSpikeRef = useRef(onOpenSpike);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [scene, setScene] = useState<VirusShape[] | null>(null);
  const [pdb, setPdb] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("loading");
  const [pdbFailed, setPdbFailed] = useState(false);
  // Bumped by "Try again": the viewer and the structure retry separately.
  const [viewerAttempt, setViewerAttempt] = useState(0);
  const [pdbAttempt, setPdbAttempt] = useState(0);
  const ready = mode === "3d";

  useEffect(() => {
    openSpikeRef.current = onOpenSpike;
  }, [onOpenSpike]);

  // Start loading a screen ahead; spin only while actually visible.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      setOnScreen(true);
      return;
    }
    const nearObserver = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setNear(true),
      { rootMargin: "100% 0px" },
    );
    const screenObserver = new IntersectionObserver((entries) => {
      const last = entries.at(-1);
      if (last) setOnScreen(last.isIntersecting);
    });
    nearObserver.observe(el);
    screenObserver.observe(el);
    return () => {
      nearObserver.disconnect();
      screenObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (mode === "3d" || mode === "still") onInteractiveChange?.(mode === "3d");
  }, [mode, onInteractiveChange]);

  // The virus recipe, then 3Dmol, or the still picture without WebGL.
  useEffect(() => {
    const host = hostRef.current;
    if (!near || !host) return;
    let cancelled = false;
    (async () => {
      let shapes: VirusShape[];
      try {
        const response = await fetch("/api/tour/virus/scene");
        if (!response.ok) throw new Error(`scene ${response.status}`);
        shapes = ((await response.json()) as { shapes: VirusShape[] }).shapes;
      } catch (e) {
        console.error("Lab tour: virus model didn't load.", e);
        if (!cancelled) setMode("failed");
        return;
      }
      if (cancelled) return;
      setScene(shapes);
      if (!hasWebGL()) {
        console.warn("Lab tour: no WebGL, showing a still picture of the virus.");
        setMode("still");
        return;
      }

      let $3Dmol: typeof import("3dmol");
      try {
        $3Dmol = await import("3dmol");
      } catch (e) {
        // Usually a network hiccup, or a page left open across a deploy.
        console.error("Lab tour: 3D viewer didn't load.", e);
        if (!cancelled) setMode("failed");
        return;
      }
      if (cancelled) return;
      try {
        const viewer = $3Dmol.createViewer(host, {
          backgroundColor: "#1c2152",
          backgroundAlpha: 0,
          antialias: true,
          cartoonQuality: 3,
        } as never);
        if (!viewer) throw new Error("createViewer returned nothing");
        fixPickingUnderZoom(viewer, host);
        viewerRef.current = viewer;
        setMode("3d");
      } catch (e) {
        console.error("Lab tour: WebGL viewer failed, showing a still picture.", e);
        host.replaceChildren();
        setMode("still");
      }
    })();
    return () => {
      cancelled = true;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      viewerRef.current?.spin(false);
      viewerRef.current?.clear();
      viewerRef.current = null;
      paintedRef.current = null;
      // 3Dmol leaves its canvas behind.
      host.replaceChildren();
    };
  }, [near, viewerAttempt]);

  // The spike structure, the first time it is asked for.
  useEffect(() => {
    if (view !== "spike" || pdb || (mode !== "3d" && mode !== "still")) return;
    let cancelled = false;
    fetch("/api/tour/virus/structure")
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`structure ${r.status}`))))
      .then((text) => !cancelled && setPdb(text))
      .catch((e) => {
        console.error("Lab tour: spike structure didn't load.", e);
        if (!cancelled) setPdbFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [view, pdb, mode, pdbAttempt]);

  // Keep the canvas sized to its card (Present mode changes it).
  useEffect(() => {
    const el = hostRef.current;
    if (!el || !ready || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => viewerRef.current?.resize().render());
    observer.observe(el);
    return () => observer.disconnect();
  }, [ready]);

  // Paint the current view, then focus the selected site.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !scene || mode !== "3d") return;
    if (view === "spike" && !pdb) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const changed = paintedRef.current !== view;
    if (changed) {
      viewer.removeAllModels();
      viewer.removeAllShapes();
      paintedRef.current = view;
      if (view === "virus") {
        for (const shape of scene) {
          const highlighted = shape.role === "highlightLobe" || shape.role === "highlightStem";
          const spec = {
            radius: shape.radius,
            color: ROLE_COLORS[shape.role],
            ...(highlighted ? { clickable: true, callback: () => openSpikeRef.current() } : {}),
          };
          if (shape.kind === "sphere") viewer.addSphere({ ...spec, center: point(shape.center) } as never);
          else
            viewer.addCylinder({
              ...spec,
              start: point(shape.start),
              end: point(shape.end),
              fromCap: 1,
              toCap: 1,
            } as never);
        }
      } else {
        viewer.addModel(pdb, "pdb", { keepH: false });
        for (const [chain, color] of CHAIN_COLORS) {
          viewer.setStyle({ chain }, { cartoon: { color, thickness: 0.4 } });
        }
        const atoms = viewer.selectedAtoms({ atom: "CA" });
        centerRef.current = atoms.length
          ? atoms.reduce<Vec>(
              (sum, a) => ({
                x: sum.x + (a.x ?? 0) / atoms.length,
                y: sum.y + (a.y ?? 0) / atoms.length,
                z: sum.z + (a.z ?? 0) / atoms.length,
              }),
              { x: 0, y: 0, z: 0 },
            )
          : null;
      }
      viewer.setView([0, 0, 0, 0, 0, 0, 0, 1]);
      viewer.zoomTo();
      if (view === "spike") {
        viewer.rotate(95, "x");
        viewer.rotate(-20, "y");
        viewer.zoom(0.95);
      } else {
        viewer.zoom(1.1);
      }
      homeRef.current[view] = viewer.getView();
    }

    if (view === "spike") {
      // Every featured site small, or the selected one large.
      viewer.removeAllShapes();
      const marked = site ? [site] : mutations;
      for (const m of marked) {
        for (const atom of viewer.selectedAtoms({ resi: m.position, atom: "CA" })) {
          viewer.addSphere({
            center: { x: atom.x, y: atom.y, z: atom.z },
            radius: site ? 3 : 1.6,
            color: MARKER,
          } as never);
        }
      }
    }

    if (view === "spike" && site?.chains.length) {
      focusSite(viewer, site, centerRef.current, (id) => (frameRef.current = id));
    } else if (!changed && homeRef.current[view]) {
      animateView(viewer, homeRef.current[view]!, prefersReducedMotion() ? 0 : 500, (id) => (frameRef.current = id));
    }
    viewer.render();
  }, [view, site, mutations, scene, pdb, mode]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    viewer.spin(spinning && onScreen && !prefersReducedMotion() ? "y" : false, 0.35);
  }, [spinning, onScreen, ready, view]);

  const failed = mode === "failed" || (view === "spike" && pdbFailed);
  const loading = !failed && (mode === "loading" || (view === "spike" && !pdb));
  const retry = () => {
    if (mode === "failed") {
      setMode("loading");
      setViewerAttempt((n) => n + 1);
    } else {
      setPdbFailed(false);
      setPdbAttempt((n) => n + 1);
    }
  };
  const subject =
    view === "virus"
      ? "the SARS-CoV-2 virus, with spikes on its surface"
      : `the spike protein${site ? `, with ${site.name} marked` : ", with mutation sites marked"}`;
  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        role="img"
        aria-label={`3D model of ${subject}. Drag to turn it.`}
        hidden={mode === "still"}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />
      {mode === "still" && scene && (view === "virus" || pdb) && (
        <VirusStill
          view={view}
          scene={scene}
          pdb={pdb}
          marked={site ? [site] : mutations}
          large={!!site}
          label={`Picture of ${subject}.`}
          onOpenSpike={onOpenSpike}
        />
      )}
      {mode === "still" && (
        <p className="pointer-events-none absolute right-4 top-16 max-w-[15rem] rounded-2xl bg-[#1c2152]/70 px-3 py-1.5 text-right text-xs font-medium text-white/70 backdrop-blur sm:top-4 md:right-5 md:top-5">
          Still picture: this browser has 3D graphics (WebGL) turned off.
        </p>
      )}
      {(loading || failed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm font-medium text-white/70">
          {failed ? (
            <>
              <span>The 3D model didn&apos;t load.</span>
              <button
                type="button"
                onClick={retry}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                Try again
              </button>
            </>
          ) : (
            <span className="pointer-events-none inline-flex items-center gap-3">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#12ca99]/30 border-t-[#12ca99]" aria-hidden="true" />
              Preparing the 3D model…
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const point = ([x, y, z]: [number, number, number]): Vec => ({ x, y, z });

/**
 * Present mode shrinks slides with CSS zoom, but 3Dmol (2.5.5) maps a click
 * to the canvas using its unzoomed size, so the orange spike couldn't be
 * clicked. Map it with the canvas's on-screen rectangle instead.
 */
function fixPickingUnderZoom(viewer: GLViewer, host: HTMLElement) {
  const v = viewer as unknown as { mouseXY?: (x: number, y: number) => { x: number; y: number } };
  if (typeof v.mouseXY !== "function") return;
  v.mouseXY = (pageX, pageY) => {
    const rect = (host.querySelector("canvas") ?? host).getBoundingClientRect();
    return {
      x: ((pageX - window.scrollX - rect.left) / rect.width) * 2 - 1,
      y: -((pageY - window.scrollY - rect.top) / rect.height) * 2 + 1,
    };
  };
}

/** Zooms towards ±20 residues around the site and turns it to face the camera. */
function focusSite(viewer: GLViewer, site: TourVirusMutation, center: Vec | null, onFrame: (id: number | null) => void) {
  const chain = site.chains.includes("B") ? "B" : site.chains[0];
  const from = viewer.getView();
  viewer.zoomTo({ chain, resi: Array.from({ length: 41 }, (_, i) => site.position - 20 + i) });
  // Step back so the rest of the spike stays in frame around the site.
  viewer.zoom(0.45);
  const target = viewer.getView();
  const atom = viewer.selectedAtoms({ chain, resi: site.position, atom: "CA" })[0];
  if (atom && center) {
    const dx = (atom.x ?? 0) - center.x;
    const dy = (atom.y ?? 0) - center.y;
    const dz = (atom.z ?? 0) - center.z;
    const length = Math.hypot(dx, dy, dz);
    if (length > 1e-8) {
      const [x, y, z] = [dx / length, dy / length, dz / length];
      // Unit quaternion taking the site's outward direction onto the camera's +Z.
      const q = z < -0.999999 ? [1, 0, 0, 0] : [y, -x, 0, 1 + z];
      const norm = Math.hypot(...q);
      target.splice(4, 4, ...q.map((v) => v / norm));
    }
  }
  viewer.setView(from);
  animateView(viewer, target, prefersReducedMotion() ? 0 : 1100, onFrame);
}

/** Eases position/zoom and slerps rotation from the current view to `target`. */
function animateView(viewer: GLViewer, target: number[], duration: number, onFrame: (id: number | null) => void) {
  if (!duration) {
    viewer.setView(target).render();
    return;
  }
  const from: number[] = viewer.getView();
  const at = (list: number[], i: number) => list[i] ?? 0;
  const a = from.slice(4, 8);
  const b = target.slice(4, 8);
  let dot = a.reduce((sum, v, i) => sum + v * at(b, i), 0);
  if (dot < 0) {
    for (let i = 0; i < 4; i++) b[i] = -at(b, i);
    dot = -dot;
  }
  dot = Math.min(1, dot);
  const theta = Math.acos(dot);
  const sine = Math.sin(theta);
  const started = performance.now();
  const frame = (now: number) => {
    const progress = Math.min(1, (now - started) / duration);
    const t = progress * progress * (3 - 2 * progress);
    const next = from.slice(0, 4).map((v, i) => v + (at(target, i) - v) * t);
    const wa = dot > 0.9995 ? 1 - t : Math.sin((1 - t) * theta) / sine;
    const wb = dot > 0.9995 ? t : Math.sin(t * theta) / sine;
    const q = a.map((v, i) => v * wa + at(b, i) * wb);
    const length = Math.hypot(...q);
    viewer.setView([...next, ...q.map((v) => v / length)]).render();
    onFrame(progress < 1 ? requestAnimationFrame(frame) : null);
  };
  onFrame(requestAnimationFrame(frame));
}
