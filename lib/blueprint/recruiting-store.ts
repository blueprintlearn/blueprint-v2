import type { createClient } from "@/lib/supabase/server"
import {
  storedPageFromRow,
  type RecruitingEditorInput,
  type StoredRecruitingPage,
} from "@/lib/blueprint/recruiting"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

const COLUMNS =
  "id, version, status, slug, source_fingerprint, source_strategy_id, source_strategy_version, page_content, ads_content, published_by, published_at" as const

export async function loadRecruitingRows(client: Client, companyId: string): Promise<StoredRecruitingPage[]> {
  const { data, error } = await client
    .from("company_recruiting_pages")
    .select(COLUMNS)
    .eq("company_id", companyId)
    .order("version", { ascending: false })

  if (error || !data) return []
  return data
    .map((row) => storedPageFromRow(row))
    .filter((row): row is StoredRecruitingPage => row !== null)
}

export async function slugTakenByOther(client: Client, slug: string, companyId: string): Promise<boolean> {
  const { data, error } = await client.rpc("recruiting_slug_taken", { p_slug: slug, p_company_id: companyId })
  if (error) return true
  return Boolean(data)
}

export async function upsertDraftPage(
  client: Client,
  companyId: string,
  input: RecruitingEditorInput & {
    fingerprint: string
    strategyId: string | null
    strategyVersion: number | null
  },
): Promise<{ error: string | null }> {
  const rows = await loadRecruitingRows(client, companyId)
  const draft = rows.find((row) => row.status === "draft")
  const payload = {
    company_id: companyId,
    slug: input.slug,
    source_fingerprint: input.fingerprint,
    source_strategy_id: input.strategyId,
    source_strategy_version: input.strategyVersion,
    page_content: input.page as unknown as JsonValue,
    ads_content: input.ads as unknown as JsonValue,
    status: "draft",
    published_by: null,
    published_at: null,
  }

  if (draft) {
    const { error } = await client.from("company_recruiting_pages").update(payload).eq("id", draft.id).eq("company_id", companyId)
    return { error: error?.message ?? null }
  }

  const version = (rows[0]?.version ?? 0) + 1
  const { error } = await client.from("company_recruiting_pages").insert({ ...payload, version })
  return { error: error?.message ?? null }
}

export async function supersedeOpenPages(client: Client, companyId: string): Promise<{ error: string | null }> {
  const rows = await loadRecruitingRows(client, companyId)
  for (const row of rows.filter((item) => item.status === "published" || item.status === "unpublished")) {
    const { error } = await client
      .from("company_recruiting_pages")
      .update({ status: "superseded" })
      .eq("id", row.id)
      .eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  const draft = rows.find((item) => item.status === "draft")
  if (draft) {
    const { error } = await client.from("company_recruiting_pages").delete().eq("id", draft.id).eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  return { error: null }
}

export async function insertPublishedPage(
  client: Client,
  companyId: string,
  input: RecruitingEditorInput & {
    fingerprint: string
    strategyId: string | null
    strategyVersion: number | null
  },
): Promise<{ error: string | null }> {
  const superseded = await supersedeOpenPages(client, companyId)
  if (superseded.error) return superseded
  const remaining = await loadRecruitingRows(client, companyId)
  const version = (remaining[0]?.version ?? 0) + 1
  const { error } = await client.from("company_recruiting_pages").insert({
    company_id: companyId,
    version,
    status: "published",
    slug: input.slug,
    source_fingerprint: input.fingerprint,
    source_strategy_id: input.strategyId,
    source_strategy_version: input.strategyVersion,
    page_content: input.page as unknown as JsonValue,
    ads_content: input.ads as unknown as JsonValue,
  })
  return { error: error?.message ?? null }
}

export async function unpublishPage(client: Client, companyId: string): Promise<{ error: string | null }> {
  const rows = await loadRecruitingRows(client, companyId)
  const published = rows.find((row) => row.status === "published")
  if (!published) return { error: "No published recruiting page to unpublish." }
  const { error } = await client
    .from("company_recruiting_pages")
    .update({ status: "unpublished" })
    .eq("id", published.id)
    .eq("company_id", companyId)
  return { error: error?.message ?? null }
}

export async function loadPublishedPageBySlug(
  client: Client,
  slug: string,
): Promise<{
  id: string
  company_id: string
  version: number
  slug: string
  page_content: unknown
  published_at: string | null
} | null> {
  const { data, error } = await client.rpc("get_published_recruiting_page", { p_slug: slug })
  if (error || !data || typeof data !== "object") return null
  const record = data as {
    id?: unknown
    company_id?: unknown
    version?: unknown
    slug?: unknown
    page_content?: unknown
    published_at?: unknown
  }
  if (typeof record.id !== "string" || typeof record.company_id !== "string") return null
  if (typeof record.version !== "number" || typeof record.slug !== "string") return null
  return {
    id: record.id,
    company_id: record.company_id,
    version: record.version,
    slug: record.slug,
    page_content: record.page_content,
    published_at: typeof record.published_at === "string" ? record.published_at : null,
  }
}
