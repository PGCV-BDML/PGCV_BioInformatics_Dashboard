import { supabase } from "@/lib/supabase";
import { isStaffRole } from "@/lib/portal";
import { uniqueFaqTags } from "@/lib/faq-tags";
import { formatFaqTime, normalizeFaqBody, normalizeFaqTitle } from "@/lib/faqs";
import type {
  FaqArticle,
  FaqArticleFormData,
  FaqTag,
  UserRole,
} from "@/types/database";

export type FaqArticleListItem = FaqArticle & {
  tags: FaqTag[];
  author_name: string | null;
  updated_by_name: string | null;
};

export function emptyFaqArticleForm(): FaqArticleFormData {
  return { title: "", body: "", tags: [] };
}

export function formFromFaqArticle(article: FaqArticle): FaqArticleFormData {
  return {
    title: article.title,
    body: article.body,
    tags: article.tags ?? [],
  };
}

export function canAddFaqArticle(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function canUpdateFaqArticle(role: UserRole | null | undefined): boolean {
  return isStaffRole(role);
}

export function canDeleteFaqArticle(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  authorId: string,
): boolean {
  if (role === "team_lead") return true;
  return role === "team_member" && Boolean(userId) && userId === authorId;
}

export function articleMatchesSearch(
  article: Pick<FaqArticleListItem, "title" | "body" | "author_name" | "updated_by_name" | "tags">,
  query: string,
): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const pool = [
    article.title,
    article.body,
    article.author_name ?? "",
    article.updated_by_name ?? "",
    ...(article.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return pool.includes(q);
}

export function articleMatchesTags(
  article: Pick<FaqArticleListItem, "tags">,
  selected: FaqTag[],
): boolean {
  if (selected.length === 0) return true;
  const tags = new Set(article.tags ?? []);
  return selected.some((tag) => tags.has(tag));
}

export function formatFaqLastUpdated(
  iso: string | null | undefined,
  name: string | null | undefined,
): string {
  const when = formatFaqTime(iso);
  const who = name?.trim() || "Staff";
  return `Last updated ${when} by ${who}`;
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

async function getArticleTagsByArticleId(
  articleIds: string[],
): Promise<Map<string, FaqTag[]>> {
  const map = new Map<string, FaqTag[]>();
  if (articleIds.length === 0) return map;

  const { data, error } = await supabase
    .from("faq_article_tag")
    .select("article_id, tag")
    .in("article_id", articleIds);

  if (error) {
    console.error("Failed to load FAQ tags:", error);
    throw error;
  }

  for (const row of data ?? []) {
    const articleId = row.article_id as string;
    const list = map.get(articleId) ?? [];
    if (typeof row.tag === "string") list.push(row.tag as FaqTag);
    map.set(articleId, list);
  }

  for (const [articleId, tags] of map) {
    map.set(articleId, uniqueFaqTags(tags));
  }
  return map;
}

export async function replaceFaqArticleTags(articleId: string, tags: FaqTag[]) {
  const unique = uniqueFaqTags(tags);
  const { data: currentRows, error: fetchError } = await supabase
    .from("faq_article_tag")
    .select("tag")
    .eq("article_id", articleId);

  if (fetchError) {
    console.error("Error reading FAQ tags:", fetchError);
    throw fetchError;
  }

  const current = new Set(
    (currentRows ?? []).map((row) => row.tag as FaqTag),
  );
  const next = new Set(unique);
  const toAdd = unique.filter((tag) => !current.has(tag));
  const toRemove = [...current].filter((tag) => !next.has(tag));

  if (toAdd.length > 0) {
    const { error: insertError } = await supabase.from("faq_article_tag").insert(
      toAdd.map((tag) => ({ article_id: articleId, tag })),
    );
    if (insertError) {
      console.error("Error inserting FAQ tags:", insertError);
      throw insertError;
    }
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("faq_article_tag")
      .delete()
      .eq("article_id", articleId)
      .in("tag", toRemove);
    if (deleteError) {
      console.error("Error clearing FAQ tags:", deleteError);
      throw deleteError;
    }
  }
}

export async function listFaqArticles(): Promise<FaqArticleListItem[]> {
  const { data, error } = await supabase
    .from("faq_article")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Failed to load FAQs:", error);
    throw error;
  }

  const rows = (data ?? []) as FaqArticle[];
  const ids = rows.map((row) => row.id);
  const [tagsById, names] = await Promise.all([
    getArticleTagsByArticleId(ids),
    namesByUserId(rows.flatMap((row) => [row.author_id, row.updated_by])),
  ]);

  return rows.map((row) => ({
    ...row,
    tags: tagsById.get(row.id) ?? [],
    author_name: names.get(row.author_id) || null,
    updated_by_name: names.get(row.updated_by) || null,
  }));
}

export async function createFaqArticle(
  authorId: string,
  form: FaqArticleFormData,
): Promise<FaqArticleListItem> {
  const title = normalizeFaqTitle(form.title);
  const body = normalizeFaqBody(form.body);
  const tags = uniqueFaqTags(form.tags);
  if (!title) throw new Error("A question title is required.");
  if (!body) throw new Error("Write an answer.");
  if (tags.length === 0) throw new Error("Choose at least one tag.");

  const { data, error } = await supabase
    .from("faq_article")
    .insert({
      title,
      body,
      author_id: authorId,
      updated_by: authorId,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to create FAQ:", error);
    throw error;
  }

  const article = data as FaqArticle;
  await replaceFaqArticleTags(article.id, tags);
  return {
    ...article,
    tags,
    author_name: null,
    updated_by_name: null,
  };
}

export async function updateFaqArticle(
  id: string,
  editorId: string,
  form: FaqArticleFormData,
): Promise<void> {
  const title = normalizeFaqTitle(form.title);
  const body = normalizeFaqBody(form.body);
  const tags = uniqueFaqTags(form.tags);
  if (!title) throw new Error("A question title is required.");
  if (!body) throw new Error("Write an answer.");
  if (tags.length === 0) throw new Error("Choose at least one tag.");

  const { error } = await supabase
    .from("faq_article")
    .update({
      title,
      body,
      updated_by: editorId,
    })
    .eq("id", id);

  if (error) {
    console.error("Failed to update FAQ:", error);
    throw error;
  }

  await replaceFaqArticleTags(id, tags);
}

export async function deleteFaqArticle(id: string): Promise<void> {
  const { error } = await supabase.from("faq_article").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete FAQ:", error);
    throw error;
  }
}
