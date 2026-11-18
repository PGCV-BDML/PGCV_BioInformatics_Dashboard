import type { TourProject } from "@/lib/tour";
import { ProjectJourney, ProjectStory } from "../project-feature";
import { LightSlide } from "../slide-frame";
import type { SlideProps } from "./shared";

type ProjectSlideProps = Omit<SlideProps, "content"> & { project: TourProject; heading: string };

/** A project's first slide: its photo, story and numbers. */
export function ProjectStorySlide({ project, heading, audience, meta }: ProjectSlideProps) {
  return (
    <LightSlide meta={meta} eyebrow="Research highlights" title={heading} source={project.imageCredit ? `Photo: ${project.imageCredit}` : undefined}>
      <ProjectStory project={project} audience={audience} />
    </LightSlide>
  );
}

/** A project's second slide: from sample to genome, and where to read more. */
export function ProjectJourneySlide({ project, audience, meta }: Omit<ProjectSlideProps, "heading">) {
  const name = project.commonName ?? project.species ?? project.title;
  const citation = project.citation;
  return (
    <LightSlide
      meta={meta}
      eyebrow={`Research highlights · ${name}`}
      title="From sample to genome"
      source={citation ? `${citation.text} · ${citation.url.replace(/^https?:\/\//, "")}` : undefined}
    >
      <ProjectJourney project={project} audience={audience} />
    </LightSlide>
  );
}
