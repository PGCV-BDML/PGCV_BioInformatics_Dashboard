import { HardDrive } from "lucide-react";
import { JOURNEY_INTRO, JOURNEY_TITLE } from "@/lib/tour-journey";
import type { TourContent } from "@/lib/tour";
import { LightSlide } from "../slide-frame";
import { SampleJourney } from "../sample-journey";
import { specIcon } from "../spec-icon";
import { TourCopy } from "../tour-copy";
import styles from "../tour-motion.module.css";
import { delay, type SlideProps } from "./shared";

function hpcItem(content: TourContent) {
  return content.infrastructure.items.find((item) => item.id === "hpc" || /\bHPC\b/.test(item.name));
}

/** The HPC server's specs as one line ("120 cores · 640 GB · 360 TB"), or null without one. */
function serverSpecs(content: TourContent): string | null {
  const hpc = hpcItem(content);
  if (!hpc?.specs.length) return null;
  return hpc.specs.map((spec) => `${spec.value} ${spec.unit}`.trim()).join(" · ");
}

/** The HPC's storage spec ("360 TB of storage"), or null without one. */
function storageSpecs(content: TourContent): string | null {
  const spec = hpcItem(content)?.specs.find((s) => specIcon(s) === HardDrive);
  return spec ? `${spec.value} ${spec.unit} of ${spec.label}` : null;
}

/** The decks' `steps`: the stage on the left, the step's words on the right, the steps underneath. */
export function JourneySlide({
  content,
  audience,
  meta,
  active,
  step,
  onStepChange,
}: SlideProps & {
  active: boolean;
  step: number | null;
  onStepChange: (step: number) => void;
}) {
  return (
    <LightSlide
      meta={meta}
      eyebrow="How it works"
      title={JOURNEY_TITLE}
      intro={audience !== "visual" && <TourCopy text={JOURNEY_INTRO} audience={audience} />}
    >
      <div className={styles.enter} style={delay(240)}>
        <SampleJourney
          audience={audience}
          active={active}
          step={step}
          onStepChange={onStepChange}
          serverSpecs={serverSpecs(content)}
          storageSpecs={storageSpecs(content)}
        />
      </div>
    </LightSlide>
  );
}
