import type { createClient } from "@/lib/supabase/server"
import {
  storedPlanFromRow,
  type StoredGrowthPlan,
} from "@/lib/blueprint/growth-plan"
import type { GrowthPlanContent, GrowthPlanDecisions, GrowthPlanWarning } from "@/lib/blueprint/growth-plan-engine"
import type { Json } from "@/types/database"

type JsonValue = NonNullable<Json>

type Client = Awaited<ReturnType<typeof createClient>>

const PLAN_COLUMNS =
  "id, version, status, source_fingerprint, recommended, decisions, warnings, approved_by, approved_at" as const

export async function loadGrowthPlanRows(client: Client, companyId: string): Promise<StoredGrowthPlan[]> {
  const { data, error } = await client
    .from("company_growth_plans")
    .select(PLAN_COLUMNS)
    .eq("company_id", companyId)
    .order("version", { ascending: false })

  if (error || !data) return []
  return data
    .map((row) => storedPlanFromRow(row))
    .filter((row): row is StoredGrowthPlan => row !== null)
}

export async function syncApprovedPlansToFingerprint(
  client: Client,
  companyId: string,
  fingerprint: string,
): Promise<void> {
  const rows = await loadGrowthPlanRows(client, companyId)
  const stale = rows.filter((row) => row.status === "approved" && row.sourceFingerprint !== fingerprint)
  for (const row of stale) {
    const { error } = await client
      .from("company_growth_plans")
      .update({ status: "needs_review" })
      .eq("id", row.id)
      .eq("company_id", companyId)
    if (error) console.error("growth plan validity", error.message)
  }
}

export async function upsertDraftPlan(
  client: Client,
  companyId: string,
  input: {
    fingerprint: string
    recommended: GrowthPlanContent
    decisions: GrowthPlanDecisions
    warnings: GrowthPlanWarning[]
  },
): Promise<{ error: string | null }> {
  const rows = await loadGrowthPlanRows(client, companyId)
  const draft = rows.find((row) => row.status === "draft")
  const payload = {
    company_id: companyId,
    source_fingerprint: input.fingerprint,
    recommended: input.recommended as unknown as JsonValue,
    decisions: input.decisions as unknown as JsonValue,
    warnings: input.warnings as unknown as JsonValue,
    status: "draft",
    approved_by: null,
    approved_at: null,
  }

  if (draft) {
    const { error } = await client.from("company_growth_plans").update(payload).eq("id", draft.id).eq("company_id", companyId)
    return { error: error?.message ?? null }
  }

  const version = (rows[0]?.version ?? 0) + 1
  const { error } = await client.from("company_growth_plans").insert({ ...payload, version })
  return { error: error?.message ?? null }
}

export async function supersedeOpenPlans(client: Client, companyId: string): Promise<{ error: string | null }> {
  const rows = await loadGrowthPlanRows(client, companyId)
  for (const row of rows.filter((item) => item.status === "approved" || item.status === "needs_review")) {
    const { error } = await client
      .from("company_growth_plans")
      .update({ status: "superseded" })
      .eq("id", row.id)
      .eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  const draft = rows.find((row) => row.status === "draft")
  if (draft) {
    const { error } = await client.from("company_growth_plans").delete().eq("id", draft.id).eq("company_id", companyId)
    if (error) return { error: error.message }
  }
  return { error: null }
}

export async function insertApprovedPlan(
  client: Client,
  companyId: string,
  input: {
    fingerprint: string
    recommended: GrowthPlanContent
    decisions: GrowthPlanDecisions
    warnings: GrowthPlanWarning[]
  },
): Promise<{ error: string | null }> {
  const superseded = await supersedeOpenPlans(client, companyId)
  if (superseded.error) return superseded
  const remaining = await loadGrowthPlanRows(client, companyId)
  const version = (remaining[0]?.version ?? 0) + 1
  const { error } = await client.from("company_growth_plans").insert({
    company_id: companyId,
    version,
    status: "approved",
    source_fingerprint: input.fingerprint,
    recommended: input.recommended as unknown as JsonValue,
    decisions: input.decisions as unknown as JsonValue,
    warnings: input.warnings as unknown as JsonValue,
  })
  return { error: error?.message ?? null }
}
