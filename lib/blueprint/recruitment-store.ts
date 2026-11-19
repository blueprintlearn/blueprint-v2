import type { createClient } from "@/lib/supabase/server"
import {
  storedStrategyFromRow,
  type RecruitDecisions,
  type RecruitInputs,
  type RecruitStrategyContent,
  type RecruitWarning,
  type StoredRecruitStrategy,
} from "@/lib/blueprint/recruitment"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>
type Client = Awaited<ReturnType<typeof createClient>>

const COLUMNS =
  "id, version, status, source_fingerprint, inputs, recommended, decisions, warnings, approved_by, approved_at" as const

export async function loadRecruitmentRows(client: Client, companyId: string): Promise<StoredRecruitStrategy[]> {
  const { data, error } = await client
    .from("company_recruitment_strategies")
    .select(COLUMNS)
    .eq("company_id", companyId)
    .order("version", { ascending: false })

  if (error || !data) return []
  return data
    .map((row) => storedStrategyFromRow(row))
    .filter((row): row is StoredRecruitStrategy => row !== null)
}

export async function syncApprovedStrategiesToFingerprint(
  client: Client,
  companyId: string,
  fingerprint: string,
): Promise<void> {
  const rows = await loadRecruitmentRows(client, companyId)
  const stale = rows.filter((row) => row.status === "approved" && row.sourceFingerprint !== fingerprint)
  for (const row of stale) {
    const { error } = await client
      .from("company_recruitment_strategies")
      .update({ status: "needs_review" })
      .eq("id", row.id)
      .eq("company_id", companyId)
    if (error) console.error("recruitment strategy validity", error.message)
  }
}

export async function upsertDraftStrategy(
  client: Client,
  companyId: string,
  input: {
    fingerprint: string
    inputs: RecruitInputs
    recommended: RecruitStrategyContent
    decisions: RecruitDecisions
    warnings: RecruitWarning[]
  },
): Promise<{ error: string | null }> {
  const rows = await loadRecruitmentRows(client, companyId)
  const draft = rows.find((row) => row.status === "draft")
  const payload = {
    company_id: companyId,
    source_fingerprint: input.fingerprint,
    inputs: input.inputs as unknown as JsonValue,
    recommended: input.recommended as unknown as JsonValue,
    decisions: input.decisions as unknown as JsonValue,
    warnings: input.warnings as unknown as JsonValue,
    status: "draft",
    approved_by: null,
    approved_at: null,
  }

  if (draft) {
    const { error } = await client
      .from("company_recruitment_strategies")
      .update(payload)
      .eq("id", draft.id)
      .eq("company_id", companyId)
    return { error: error?.message ?? null }
  }

  const version = (rows[0]?.version ?? 0) + 1
  const { error } = await client.from("company_recruitment_strategies").insert({ ...payload, version })
  return { error: error?.message ?? null }
}

export async function supersedeOpenStrategies(client: Client, companyId: string): Promise<{ error: string | null }> {
  const rows = await loadRecruitmentRows(client, companyId)
  for (const row of rows.filter((item) => item.status === "approved" || item.status === "needs_review")) {
    const { error } = await client
      .from("company_recruitment_strategies")
      .update({ status: "superseded" })
      .eq("id", row.id)
      .eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  const draft = rows.find((row) => row.status === "draft")
  if (draft) {
    const { error } = await client
      .from("company_recruitment_strategies")
      .delete()
      .eq("id", draft.id)
      .eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  return { error: null }
}

export async function insertApprovedStrategy(
  client: Client,
  companyId: string,
  input: {
    fingerprint: string
    inputs: RecruitInputs
    recommended: RecruitStrategyContent
    decisions: RecruitDecisions
    warnings: RecruitWarning[]
  },
): Promise<{ error: string | null }> {
  const superseded = await supersedeOpenStrategies(client, companyId)
  if (superseded.error) return superseded
  const remaining = await loadRecruitmentRows(client, companyId)
  const version = (remaining[0]?.version ?? 0) + 1
  const { error } = await client.from("company_recruitment_strategies").insert({
    company_id: companyId,
    version,
    status: "approved",
    source_fingerprint: input.fingerprint,
    inputs: input.inputs as unknown as JsonValue,
    recommended: input.recommended as unknown as JsonValue,
    decisions: input.decisions as unknown as JsonValue,
    warnings: input.warnings as unknown as JsonValue,
  })
  return { error: error?.message ?? null }
}
