import { useEffect, useState, type CSSProperties } from "react";
import { DarkSlide } from "../slide-frame";
import { DoiQr } from "../doi-qr";
import { SocialIcon, hasSocialIcon } from "../social-icons";
import { TourCopy } from "../tour-copy";
import { TurningHelix, type HelixPlacement } from "../turning-helix";
import { useOnScreen } from "../use-reveal";
import styles from "../tour-motion.module.css";
import art from "./contact.module.css";
import { BrandLine, DARK_SLIDE_BACKGROUND, DarkSlideArt, GradientLastWord } from "./dark-parts";
import { delay, stagger, type SlideProps } from "./shared";

/** The bookend to the title slide's "Welcome to the lab tour". */
export const CONTACT_EYEBROW = "Thank you for visiting";
/** The Visual audience's title: the slide becomes its QR codes. */
export const SCAN_TITLE = "Scan to connect";

/* The content area on the canvas: 1112 x 572, 84px in from the sides and 68px down. */
const MARGIN = { x: 84, y: 68 };
const CONTENT = { width: 1112, height: 572 };

/** Where a code sits in the content area (its cell; the plate is centred in it), and when it lifts along the thread. */
export type QrSpot = { left: number; top: number; cell: number; plate: number; wave: number };

/**
 * The thread: the helix laid across the slide's lower half, crossing x 640 at
 * y 478 and rising 2.5° to the right, long enough to run off both sides of a
 * slide that Present mode has widened. contact.module.css's glow follows it.
 */
const THREAD = { y: 478, rise: Math.tan((2.5 * Math.PI) / 180) };
export const THREAD_HELIX: HelixPlacement = { x: 640, y: THREAD.y, pairs: 64, tilt: -92.5, halfWidth: 64 };
const THREAD_PLATE = 124;

/**
 * Where the codes hang on the thread: centred on it, evenly spaced between
 * x 150 and 1130 and at most 330px apart. The glow takes 5.6 seconds from
 * x -120 to 1400, so it reaches a code at x after (x + 120) / 1520 of that,
 * and the code's lift peaks 0.8 seconds into its cycle.
 */
export function threadSpots(count: number): QrSpot[] {
  const spacing = count > 1 ? Math.min(330, 980 / (count - 1)) : 0;
  const cell = spacing ? Math.min(190, spacing - 8) : 190;
  return Array.from({ length: count }, (_, i) => {
    const x = 640 + (i - (count - 1) / 2) * spacing;
    const top = THREAD.y - THREAD.rise * (x - 640) - THREAD_PLATE / 2;
    return {
      left: Math.round(x - cell / 2 - MARGIN.x),
      top: Math.round(top - MARGIN.y),
      cell: Math.round(cell),
      plate: THREAD_PLATE,
      wave: Number((((x + 120) / 1520) * 5.6 - 0.8).toFixed(2)),
    };
  });
}

/** Visual: the helix where the title slide has it, a little longer so it runs off a taller slide too. */
export const SCAN_HELIX: HelixPlacement = { x: 1000, y: 360, pairs: 36, tilt: 14 };
const SCAN = { gapX: 28, gapY: 22, maxRow: 232, labelRoom: 48 };

/**
 * Visual: the codes in two columns against the right margin, centred top to
 * bottom; as big as fits, up to 184px (two rows), with one line of label.
 */
export function scanSpots(count: number): QrSpot[] {
  const cols = count > 1 ? 2 : 1;
  const rows = Math.ceil(count / cols);
  const row = Math.min(SCAN.maxRow, Math.floor((CONTENT.height - (rows - 1) * SCAN.gapY) / rows));
  const plate = row - SCAN.labelRoom;
  const cell = plate + 12;
  const width = cols * cell + (cols - 1) * SCAN.gapX;
  const height = rows * row + (rows - 1) * SCAN.gapY;
  const left = CONTENT.width - width;
  const top = Math.round((CONTENT.height - height) / 2);
  return Array.from({ length: count }, (_, i) => ({
    left: left + (i % cols) * (cell + SCAN.gapX),
    top: top + Math.floor(i / cols) * (row + SCAN.gapY),
    cell,
    plate,
    wave: 0,
  }));
}

/** How long the viewfinder stays on each code. */
const FINDER_MS = 2500;

/** Steps through 0 … count - 1 every `ms` while `active`; holds still for reduced motion. */
function useTakingTurns(count: number, ms: number, active: boolean): number {
  const [turn, setTurn] = useState(0);
  useEffect(() => {
    if (!active || count < 2 || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setTurn((t) => (t + 1) % count), ms);
    return () => window.clearInterval(timer);
  }, [active, count, ms]);
  return count ? turn % count : 0;
}

const vars = (values: Record<string, string>) => values as CSSProperties;

/**
 * The tour's last slide, the bookend to the title slide: the same background,
 * logo line and gradient title, and the same turning helix, laid across the
 * slide with the QR codes hanging on it. The words and the social accounts sit
 * top left, the emails top right. For the Visual audience the slide becomes
 * its QR codes, in front of the helix where the title slide has it.
 */
export function ContactSlide({ content, audience }: Omit<SlideProps, "meta">) {
  const { contact } = content;
  // Visual turns the slide into its QR codes: scan and go, nothing to copy down.
  const scanOnly = audience === "visual" && contact.qrCodes.length > 0;
  const [screenRef, onScreen] = useOnScreen<HTMLSpanElement>();
  const paused = onScreen === false ? (art.paused ?? "") : "";
  const spots = scanOnly ? scanSpots(contact.qrCodes.length) : threadSpots(contact.qrCodes.length);
  const locked = useTakingTurns(scanOnly ? contact.qrCodes.length : 0, FINDER_MS, onScreen === true);
  const framed = scanOnly ? spots[locked] : undefined;
  return (
    <DarkSlide
      background={DARK_SLIDE_BACKGROUND}
      innerClassName={scanOnly ? "canvas:flex canvas:flex-col canvas:justify-center" : ""}
      art={
        <DarkSlideArt screenRef={screenRef}>
          <div className={`${art.art} ${paused}`} aria-hidden="true">
            {scanOnly ? (
              <TurningHelix placement={SCAN_HELIX} />
            ) : (
              <>
                <TurningHelix placement={THREAD_HELIX} />
                {contact.qrCodes.length > 0 && <span className={art.pulse} />}
              </>
            )}
          </div>
        </DarkSlideArt>
      }
    >
      <div className="canvas:w-[640px]">
        <BrandLine eyebrow={CONTACT_EYEBROW} />
        <h2
          className={`mt-5 max-w-3xl text-3xl font-black leading-[1.1] tracking-tight text-balance canvas:mt-4 canvas:max-w-[640px] canvas:leading-[1.05] ${scanOnly ? "canvas:text-[80px]" : "canvas:text-[60px]"} ${styles.enter}`}
          style={delay(250)}
        >
          <GradientLastWord text={scanOnly ? SCAN_TITLE : contact.title} />
        </h2>
        {audience !== "visual" && (
          <p className={`mt-4 text-lg text-white/85 canvas:mt-3.5 canvas:text-[22px] canvas:leading-[1.45] ${styles.enter}`} style={delay(400)}>
            <TourCopy text={contact.intro} audience={audience} />
          </p>
        )}
        {contact.social && (
          <div className={`mt-6 flex flex-wrap items-center gap-x-2 gap-y-3 canvas:mt-5 ${styles.enter}`} style={delay(550)}>
            <p className="mr-1.5 text-sm text-white/80 canvas:text-[18px]">
              Follow <span className="font-bold text-white">{contact.social.handle}</span>
            </p>
            {contact.social.platforms.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Find us on">
                {contact.social.platforms.map((platform) => (
                  <li
                    key={platform}
                    title={platform}
                    className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white/[0.1] px-2.5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_6px_14px_-6px_rgba(10,12,40,0.6)]"
                  >
                    {hasSocialIcon(platform) ? (
                      <>
                        <SocialIcon platform={platform} className="h-[18px] w-[18px]" />
                        <span className="sr-only">{platform}</span>
                      </>
                    ) : (
                      <span className="text-xs font-bold canvas:text-[14px]">{platform}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {!scanOnly && contact.emails.length > 0 && (
        <ul className="mt-8 space-y-2 canvas:absolute canvas:right-0 canvas:top-4 canvas:mt-0 canvas:w-[400px]">
          {contact.emails.map((email, i) => (
            <li key={email.address} className={styles.enter} style={stagger(i, 400)}>
              <a
                href={`mailto:${email.address}`}
                className="block rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-3 backdrop-blur-sm transition-colors hover:border-[#12ca99]/60 hover:bg-white/[0.14] canvas:px-[18px] canvas:py-[9px]"
              >
                <span className="block font-quicksand text-xs font-bold uppercase tracking-[0.1em] text-[#9ff0d8] canvas:text-[14px] canvas:leading-[1.3]">
                  {email.label}
                </span>
                <span className="mt-0.5 block break-all font-bold canvas:text-[19px] canvas:leading-[1.35]">{email.address}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {contact.qrCodes.length > 0 && (
        <ul className={`mt-10 grid grid-cols-2 gap-x-6 gap-y-8 canvas:mt-0 canvas:block ${paused}`} aria-label="Scan with your phone">
          {contact.qrCodes.map((qr, i) => {
            const spot = spots[i]!;
            return (
              <li
                key={qr.url}
                data-locked={scanOnly && i === locked ? "" : undefined}
                className={`canvas:absolute canvas:left-[var(--qx)] canvas:top-[var(--qy)] canvas:w-[var(--cell)] ${styles.enter}`}
                style={{
                  ...stagger(i, 550),
                  ...vars({ "--qx": `${spot.left}px`, "--qy": `${spot.top}px`, "--cell": `${spot.cell}px`, "--plate": `${spot.plate}px`, "--wave": `${spot.wave}s` }),
                }}
              >
                <EmbossedQr label={qr.label} url={qr.url} plateClassName={`${art.plate} ${scanOnly ? art.lockable : art.wave}`} />
              </li>
            );
          })}
        </ul>
      )}
      {framed && (
        <span
          className={art.finder}
          style={vars({
            "--fx": `${framed.left + (framed.cell - framed.plate) / 2 - 10}px`,
            "--fy": `${framed.top - 10}px`,
            "--fs": `${framed.plate + 20}px`,
          })}
          aria-hidden="true"
        />
      )}
    </DarkSlide>
  );
}

/**
 * A QR code pressed into a raised plate: the plate catches light on its top
 * edge and casts a shadow below, and the code sits in a sunken well. On the
 * canvas the plate is --plate wide.
 */
function EmbossedQr({ label, url, plateClassName }: { label: string; url: string; plateClassName: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group/qr flex flex-col items-center text-center">
      <span
        className={`block w-full max-w-[200px] rounded-[22px] bg-[linear-gradient(145deg,#ffffff_0%,#e9e7f1_100%)] p-3.5 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.95),inset_0_-2px_0_rgba(43,50,120,0.12),0_2px_0_rgba(20,22,60,0.35),0_14px_28px_-10px_rgba(10,12,40,0.6),-6px_-6px_18px_-8px_rgba(255,255,255,0.18)] canvas:w-[var(--plate)] canvas:max-w-none canvas:rounded-[20px] canvas:p-2.5 ${plateClassName}`}
      >
        <span className="block rounded-[14px] bg-white p-2 shadow-[inset_2px_3px_6px_rgba(43,50,120,0.22),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] canvas:rounded-[12px] canvas:p-1.5">
          <DoiQr url={url} label={`QR code for the PGC Visayas ${label}`} className="block h-auto w-full rounded-md" />
        </span>
      </span>
      <span className="mt-4 text-xs font-medium uppercase tracking-[0.14em] text-white/70 [text-shadow:0_1px_2px_rgba(18,21,46,0.9),0_0_10px_rgba(18,21,46,0.85)] canvas:mt-2.5 canvas:text-[14px] canvas:leading-tight">
        PGC Visayas
      </span>
      <span className="mt-0.5 font-quicksand text-lg font-bold leading-tight text-white [text-shadow:0_1px_2px_rgba(18,21,46,0.9),0_0_10px_rgba(18,21,46,0.85)] canvas:text-[17px]">
        {label}
      </span>
    </a>
  );
}
