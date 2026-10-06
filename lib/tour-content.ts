import { FALLBACK_TOUR, parseTourContent, type TourContent } from "@/lib/tour";

/**
 * Server-only access to the private pgcv-tour-content repo.
 *
 * GITHUB_TOUR_TOKEN is a fine-grained PAT with read-only Contents access to
 * that repo. If it is unset we try GITHUB_MODULES_TOKEN, so one PAT granted
 * access to both repos is enough. The token never reaches the browser:
 * images are proxied through /api/tour/asset/<path>.
 */

const DEFAULT_REPO = "bioinfopgcupvisayas/pgcv-tour-content";
const DEFAULT_REF = "main";
const MANIFEST_PATH = "tour.json";

/** Seconds a fetched tour.json is reused before GitHub is asked again. */
export const TOUR_CONTENT_REVALIDATE_SECONDS = 300;

function githubToken(): string {
  return (
    process.env.GITHUB_TOUR_TOKEN?.trim() ||
    process.env.GITHUB_MODULES_TOKEN?.trim() ||
    ""
  );
}

function repo(): string {
  return process.env.GITHUB_TOUR_REPO?.trim() || DEFAULT_REPO;
}

function ref(): string {
  return process.env.GITHUB_TOUR_REF?.trim() || DEFAULT_REF;
}

export function isTourContentConfigured(): boolean {
  return Boolean(githubToken());
}

function contentsUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${repo()}/contents/${encoded}?ref=${encodeURIComponent(ref())}`;
}

/** Raw file from the content repo. Callers pass their own cache options. */
export function fetchTourRepoFile(
  path: string,
  init: { next?: { revalidate: number }; cache?: RequestCache } = {},
): Promise<Response> {
  return fetch(contentsUrl(path), {
    ...init,
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${githubToken()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pgcv-bioinformatics-dashboard",
    },
  });
}

export type TourContentResult = {
  content: TourContent;
  source: "github" | "fallback";
};

export async function getTourContent(): Promise<TourContentResult> {
  if (!isTourContentConfigured()) {
    return { content: FALLBACK_TOUR, source: "fallback" };
  }
  try {
    const response = await fetchTourRepoFile(MANIFEST_PATH, {
      next: { revalidate: TOUR_CONTENT_REVALIDATE_SECONDS },
    });
    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status} for ${MANIFEST_PATH}`);
    }
    return { content: parseTourContent(await response.json()), source: "github" };
  } catch (error) {
    console.error("Lab tour: using built-in content.", error);
    return { content: FALLBACK_TOUR, source: "fallback" };
  }
}
