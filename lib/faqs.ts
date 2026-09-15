import { supabase } from "@/lib/supabase";
import { isStaffRole } from "@/lib/portal";
import { uniqueFaqTags } from "@/lib/faq-tags";
import type {
  FaqPost,
  FaqPostKind,
  FaqStatus,
  FaqTag,
  FaqThread,
  FaqThreadFormData,
  UserRole,
} from "@/types/database";

export const MAX_FAQ_TITLE = 200;
export const MAX_FAQ_BODY = 20000;
export const MAX_FAQ_COMMENT = 2000;

export type FaqThreadListItem = FaqThread & {
  answer_count: number;
  last_activity_at: string;
  author_name: string | null;
};

export function emptyFaqForm(): FaqThreadFormData {
  return { title: "", body: "", tags: [] };
}

export function formFromFaqThread(thread: FaqThread): FaqThreadFormData {
  return {
    title: thread.title,
    body: thread.body,
    tags: thread.tags ?? [],
  };
}

export function normalizeFaqTitle(raw: string): string | null {
  const title = raw.trim();
  if (!title || title.length > MAX_FAQ_TITLE) return null;
  return title;
}

export function normalizeFaqBody(raw: string, max = MAX_FAQ_BODY): string | null {
  const body = raw.trim();
  if (!body || body.length > max) return null;
  return body;
}

export function isOpenFaqStatus(status: FaqStatus | null | undefined): boolean {
  return status === "open";
}

export function isClosedFaqStatus(status: FaqStatus | null | undefined): boolean {
  return status === "closed";
}

export function canAskFaq(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function canManageFaqThread(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
): boolean {
  if (role === "team_lead") return true;
  return role === "team_member" && Boolean(userId) && userId === authorId;
}

export function canCloseFaqThread(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
): boolean {
  return canManageFaqThread(role, userId, authorId);
}

export function canDeleteFaqThread(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
  hasAnswers: boolean,
): boolean {
  if (role === "team_lead") return true;
  if (!canManageFaqThread(role, userId, authorId)) return false;
  return !hasAnswers;
}

export function canAcceptFaqAnswer(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
): boolean {
  return canManageFaqThread(role, userId, authorId);
}

export function canPostFaqAnswer(
  role: UserRole | null | undefined,
  status: FaqStatus,
): boolean {
  return isStaffRole(role) && isOpenFaqStatus(status);
}

export function canPostFaqComment(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function canEditFaqPost(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
): boolean {
  if (role === "team_lead") return true;
  return role === "team_member" && Boolean(userId) && userId === authorId;
}

export function faqStatusLabel(status: FaqStatus): string {
  return status === "closed" ? "Closed" : "Open";
}

export function threadHasAnswers(posts: Pick<FaqPost, "kind" | "deleted_at">[]): boolean {
  return posts.some((post) => post.kind === "answer" && !post.deleted_at);
}

export function answersOf(posts: FaqPost[]): FaqPost[] {
  return posts.filter((post) => post.kind === "answer");
}

export function commentsOf(posts: FaqPost[], parentId: string): FaqPost[] {
  return posts.filter(
    (post) => post.kind === "comment" && post.parent_id === parentId,
  );
}

export function sortFaqAnswers(
  answers: FaqPost[],
  acceptedPostId: string | null,
): FaqPost[] {
  return [...answers].sort((a, b) => {
    if (acceptedPostId) {
      if (a.id === acceptedPostId) return -1;
      if (b.id === acceptedPostId) return 1;
    }
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  });
}

type FaqPostSummary = Pick<FaqPost, "kind" | "deleted_at" | "created_at">;

export function buildFaqThreadListItem(
  thread: FaqThread,
  tags: FaqTag[],
  posts: FaqPostSummary[],
  authorName: string | null,
): FaqThreadListItem {
  const liveAnswers = posts.filter(
    (post) => post.kind === "answer" && !post.deleted_at,
  );
  const lastPost = posts.reduce<string | null>((latest, post) => {
    if (!latest) return post.created_at;
    return Date.parse(post.created_at) > Date.parse(latest)
      ? post.created_at
      : latest;
  }, null);
  const last_activity_at =
    lastPost && Date.parse(lastPost) > Date.parse(thread.created_at)
      ? lastPost
      : thread.created_at;
  return {
    ...thread,
    tags,
    answer_count: liveAnswers.length,
    last_activity_at,
    author_name: authorName,
  };
}

async function namesByUserId(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase
    .from("users")
    .select("id, name")
    .in("id", unique);
  if (error) {
    console.error("Failed to load FAQ author names:", error);
    return new Map();
  }
  return new Map(
    (data ?? []).map((row) => [row.id as string, (row.name as string) ?? ""]),
  );
}

export async function replaceFaqTags(threadId: string, tags: FaqTag[]) {
  const unique = uniqueFaqTags(tags);
  const { data: currentRows, error: fetchError } = await supabase
    .from("faq_tag")
    .select("tag")
    .eq("thread_id", threadId);

  if (fetchError) {
    console.error("Error reading FAQ tags:", fetchError);
    throw fetchError;
  }

  const current = new Set((currentRows ?? []).map((row) => row.tag as FaqTag));
  const next = new Set(unique);
  const toAdd = unique.filter((tag) => !current.has(tag));
  const toRemove = [...current].filter((tag) => !next.has(tag));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("faq_tag").insert(
      toAdd.map((tag) => ({ thread_id: threadId, tag })),
    );
    if (insertError) {
      console.error("Error inserting FAQ tags:", insertError);
      throw insertError;
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("faq_tag")
      .delete()
      .eq("thread_id", threadId)
      .in("tag", toRemove);
    if (deleteError) {
      console.error("Error clearing FAQ tags:", deleteError);
      throw deleteError;
    }
  }
}

async function getFaqTagsByThreadId(
  threadIds: string[],
): Promise<Map<string, FaqTag[]>> {
  const map = new Map<string, FaqTag[]>();
  if (threadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("faq_tag")
    .select("thread_id, tag")
    .in("thread_id", threadIds);

  if (error) {
    console.error("Failed to load FAQ tags:", error);
    throw error;
  }

  for (const row of data ?? []) {
    const threadId = row.thread_id as string;
    const list = map.get(threadId) ?? [];
    if (typeof row.tag === "string") list.push(row.tag as FaqTag);
    map.set(threadId, list);
  }

  for (const [threadId, tags] of map) {
    map.set(threadId, uniqueFaqTags(tags));
  }
  return map;
}

async function getFaqPostSummariesByThreadId(
  threadIds: string[],
): Promise<Map<string, FaqPostSummary[]>> {
  const map = new Map<string, FaqPostSummary[]>();
  if (threadIds.length === 0) return map;

  const { data, error } = await supabase
    .from("faq_post")
    .select("thread_id, kind, deleted_at, created_at")
    .in("thread_id", threadIds);

  if (error) {
    console.error("Failed to load FAQ posts:", error);
    throw error;
  }

  for (const row of data ?? []) {
    const threadId = row.thread_id as string;
    const list = map.get(threadId) ?? [];
    list.push({
      kind: row.kind as FaqPostKind,
      deleted_at: (row.deleted_at as string | null) ?? null,
      created_at: row.created_at as string,
    });
    map.set(threadId, list);
  }
  return map;
}

export async function listFaqThreads(): Promise<FaqThreadListItem[]> {
  // Do not nest faq_post on faq_thread: accepted_post_id and thread_id
  // are two FKs between the same tables, so PostgREST cannot embed.
  const { data, error } = await supabase
    .from("faq_thread")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load FAQs:", error);
    throw error;
  }

  const rows = (data ?? []) as FaqThread[];
  const ids = rows.map((row) => row.id);
  const [tagMap, postMap, names] = await Promise.all([
    getFaqTagsByThreadId(ids),
    getFaqPostSummariesByThreadId(ids),
    namesByUserId(rows.map((row) => row.author_id)),
  ]);

  return rows.map((row) =>
    buildFaqThreadListItem(
      row,
      tagMap.get(row.id) ?? [],
      postMap.get(row.id) ?? [],
      names.get(row.author_id) || null,
    ),
  );
}

export async function getFaqThread(id: string): Promise<FaqThread | null> {
  const { data, error } = await supabase
    .from("faq_thread")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load FAQ:", error);
    throw error;
  }
  if (!data) return null;
  const tagMap = await getFaqTagsByThreadId([id]);
  return { ...(data as FaqThread), tags: tagMap.get(id) ?? [] };
}

export async function getFaqPosts(threadId: string): Promise<FaqPost[]> {
  const { data, error } = await supabase
    .from("faq_post")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load FAQ posts:", error);
    throw error;
  }

  const rows = (data ?? []) as FaqPost[];
  const names = await namesByUserId(rows.map((row) => row.author_id));
  return rows.map((row) => ({
    ...row,
    author_name: names.get(row.author_id) || null,
  }));
}

export async function createFaqThread(
  authorId: string,
  form: FaqThreadFormData,
): Promise<FaqThread> {
  const title = normalizeFaqTitle(form.title);
  const body = normalizeFaqBody(form.body);
  const tags = uniqueFaqTags(form.tags);
  if (!title) throw new Error("A question title is required.");
  if (!body) throw new Error("Write a question body.");
  if (tags.length === 0) throw new Error("Choose at least one tag.");

  const id = crypto.randomUUID();
  const { data, error } = await supabase
    .from("faq_thread")
    .insert({
      id,
      title,
      body,
      status: "open",
      author_id: authorId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create FAQ:", error);
    throw error;
  }

  await replaceFaqTags(id, tags);
  return { ...(data as FaqThread), tags };
}

export async function updateFaqThread(
  id: string,
  form: FaqThreadFormData,
): Promise<void> {
  const title = normalizeFaqTitle(form.title);
  const body = normalizeFaqBody(form.body);
  const tags = uniqueFaqTags(form.tags);
  if (!title) throw new Error("A question title is required.");
  if (!body) throw new Error("Write a question body.");
  if (tags.length === 0) throw new Error("Choose at least one tag.");

  const { error } = await supabase
    .from("faq_thread")
    .update({ title, body })
    .eq("id", id);

  if (error) {
    console.error("Failed to update FAQ:", error);
    throw error;
  }

  await replaceFaqTags(id, tags);
}

export async function setFaqThreadStatus(
  id: string,
  status: FaqStatus,
): Promise<void> {
  const { error } = await supabase
    .from("faq_thread")
    .update({ status })
    .eq("id", id);
  if (error) {
    console.error("Failed to update FAQ status:", error);
    throw error;
  }
}

export async function setFaqAcceptedAnswer(
  threadId: string,
  postId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("faq_thread")
    .update({ accepted_post_id: postId })
    .eq("id", threadId);
  if (error) {
    console.error("Failed to update accepted answer:", error);
    throw error;
  }
}

export async function deleteFaqThread(id: string): Promise<void> {
  const { error } = await supabase.from("faq_thread").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete FAQ:", error);
    throw error;
  }
}

export async function createFaqPost(input: {
  threadId: string;
  authorId: string;
  kind: FaqPostKind;
  body: string;
  parentId?: string | null;
}): Promise<FaqPost> {
  if (input.kind === "comment" && !input.parentId) {
    throw new Error("Comments may only reply to an answer.");
  }

  const max = input.kind === "comment" ? MAX_FAQ_COMMENT : MAX_FAQ_BODY;
  const body = normalizeFaqBody(input.body, max);
  if (!body) {
    throw new Error(
      input.kind === "comment" ? "Write a comment." : "Write an answer.",
    );
  }

  const { data, error } = await supabase
    .from("faq_post")
    .insert({
      thread_id: input.threadId,
      author_id: input.authorId,
      kind: input.kind,
      body,
      parent_id: input.parentId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to post FAQ reply:", error);
    throw error;
  }

  return data as FaqPost;
}

export async function softDeleteFaqPost(id: string): Promise<void> {
  const { error } = await supabase
    .from("faq_post")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Failed to delete FAQ reply:", error);
    throw error;
  }
}

export function threadMatchesSearch(
  thread: FaqThreadListItem,
  query: string,
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const pool = [
    thread.title,
    thread.body,
    thread.author_name ?? "",
    thread.status,
    ...(thread.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return pool.includes(q);
}

export function threadMatchesTags(
  thread: FaqThreadListItem,
  selected: FaqTag[],
): boolean {
  if (selected.length === 0) return true;
  const tags = new Set(thread.tags ?? []);
  return selected.some((tag) => tags.has(tag));
}

export function formatFaqTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
