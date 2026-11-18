import type { TourProject } from "@/lib/tour";
import { ProjectFeature, ProjectPaper } from "../project-feature";
import { LightSlide } from "../slide-frame";
import type { SlideProps } from "./shared";

type ProjectSlideProps = Omit<SlideProps, "content"> & { project: TourProject; heading: string };

/**
 * A project's slide: its photo, story and numbers, and its journey from sample
 * to genome, with the paper's QR code beside the title. The source line credits
 * the photo, then the paper's note (its other partners and data), except for
 * Visual, which leaves the note out.
 */
export function ProjectSlide({ project, heading, audience, meta }: ProjectSlideProps) {
  const note = audience === "visual" ? null : project.citation?.note;
  const source = [project.imageCredit ? `Photo: ${project.imageCredit}` : null, note].filter(Boolean).join(" · ");
  return (
    <LightSlide
      meta={meta}
      eyebrow="Research highlights"
      title={heading}
      source={source || undefined}
      aside={project.citation ? <ProjectPaper project={project} /> : undefined}
    >
      <ProjectFeature project={project} audience={audience} />
    </LightSlide>
  );
}
