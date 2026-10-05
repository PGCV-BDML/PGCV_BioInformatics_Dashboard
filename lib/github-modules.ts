import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import {
  parseModuleManifest,
  type ModuleLibraryItem,
} from "@/lib/module-library";

/**
 * Server-only access to the private bioinfo-modules repo.
 *
 * GITHUB_MODULES_TOKEN is a fine-grained PAT with read-only Contents access to
 * that one repo. It never leaves the server: the browser gets short-lived
 * signed viewer URLs (/api/training-modules/f/<token>/<path>) instead.
 */

const DEFAULT_REPO = "bioinfopgcupvisayas/bioinfo-modules";
const DEFAULT_REF = "main";
const MANIFEST_PATH = "modules.json";
const MANIFEST_TTL_MS = 5 * 60 * 1000;

/**
 * Long enough for a full training day in one tab: links inside a module
 * (dataset pages, downloads) reuse the token from the URL it was opened with.
 */
export const VIEW_TOKEN_TTL_SECONDS = 12 * 60 * 60;

export const VIEW_ROUTE_PREFIX = "/api/training-modules/f";

function githubToken(): string {
  return process.env.GITHUB_MODULES_TOKEN?.trim() ?? "";
}

export function isGithubModulesConfigured(): boolean {
  return Boolean(githubToken());
}

function repo(): string {
  return process.env.GITHUB_MODULES_REPO?.trim() || DEFAULT_REPO;
}

function ref(): string {
  return process.env.GITHUB_MODULES_REF?.trim() || DEFAULT_REF;
}

function contentsUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${repo()}/contents/${encoded}?ref=${encodeURIComponent(ref())}`;
}

function githubHeaders(accept: string): HeadersInit {
  return {
    Accept: accept,
    Authorization: `Bearer ${githubToken()}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pgcv-bioinformatics-dashboard",
  };
}

export class GithubModulesError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Raw file body from the repo (contents API, raw media type, ≤ 100 MB). */
export async function fetchRepoFileRaw(path: string): Promise<Response> {
  const response = await fetch(contentsUrl(path), {
    headers: githubHeaders("application/vnd.github.raw+json"),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GithubModulesError(
      `GitHub returned ${response.status} for ${path}`,
      response.status === 404 ? 404 : 502,
    );
  }
  return response;
}

/**
 * GitHub's own download URL for a file. For a private repo it carries a
 * short-lived token, so large datasets download straight from GitHub instead
 * of streaming through a Vercel function.
 */
export async function fetchRepoDownloadUrl(path: string): Promise<string> {
  const response = await fetch(contentsUrl(path), {
    headers: githubHeaders("application/vnd.github+json"),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new GithubModulesError(
      `GitHub returned ${response.status} for ${path}`,
      response.status === 404 ? 404 : 502,
    );
  }
  const body = (await response.json()) as { download_url?: unknown };
  if (Array.isArray(body) || typeof body.download_url !== "string") {
    // A directory listing, or a submodule/symlink without a download URL.
    throw new GithubModulesError(`${path} is not a file`, 404);
  }
  return body.download_url;
}

let manifestCache: { items: ModuleLibraryItem[]; fetchedAt: number } | null =
  null;

export async function getModuleCatalog(): Promise<ModuleLibraryItem[]> {
  if (manifestCache && Date.now() - manifestCache.fetchedAt < MANIFEST_TTL_MS) {
    return manifestCache.items;
  }
  const response = await fetchRepoFileRaw(MANIFEST_PATH);
  const items = parseModuleManifest(await response.json());
  manifestCache = { items, fetchedAt: Date.now() };
  return items;
}

// --- Signed viewer tokens ----------------------------------------------------
// Format: <expiresAtUnixSeconds>.<base64url HMAC-SHA256>. The key is derived
// from the GitHub token, so rotating the PAT also revokes outstanding links.

function signingKey(): Buffer {
  return createHash("sha256")
    .update(`training-module-view:${githubToken()}`)
    .digest();
}

function sign(expiresAt: number): string {
  return createHmac("sha256", signingKey())
    .update(String(expiresAt))
    .digest("base64url");
}

export function createViewToken(nowMs = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + VIEW_TOKEN_TTL_SECONDS;
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifyViewToken(token: string, nowMs = Date.now()): boolean {
  const match = /^(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match || !isGithubModulesConfigured()) return false;
  const [, expiresAtRaw, signature] = match;
  const expiresAt = Number(expiresAtRaw);
  if (expiresAt * 1000 < nowMs) return false;
  const expected = Buffer.from(sign(expiresAt));
  const actual = Buffer.from(signature ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function viewUrlForPath(path: string, token: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${VIEW_ROUTE_PREFIX}/${token}/${encoded}`;
}
