"use server"

import { revalidatePath } from "next/cache"

import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import {
  GROWTH_COUNT_MESSAGE,
  GROWTH_MODIFY_KIND_MESSAGE,
  GROWTH_NOTE_MAX,
  GROWTH_RATE_MESSAGE,
  GROWTH_RESPONSE_MESSAGE,
  GROWTH_TRAINING_MESSAGE,
  emptyPlanningInputs,
  parseClosingRate,
  parseGrowthKind,
  parseOwnerResponseStatus,
  parseTrainingAvailability,
  parseWholeCount,
  type GrowthOwnerResponse,
  type GrowthPlanningInputs,
  type PlanningFieldState,
  type PlanningNumericField,
} from "@/lib/blueprint/growth"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveGrowthState = { error: string | null; savedAt: number | null }

const initialInputs = emptyPlanningInputs()

async function requireGuidedOwnerMembership() {
  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { ok: false as const, error: OWNER_ONLY_MESSAGE }
  }
  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { ok: false as const, error: SAVE_FAILED_MESSAGE }
  }
  return { ok: true as const, membership }
}

function numericField(
  raw: unknown,
  skipped: boolean,
  estimated: boolean,
  parse: (value: unknown) => { ok: true; value: number | null } | { ok: false },
  errorMessage: string,
): { ok: true; field: PlanningNumericField } | { ok: false; error: string } {
  if (skipped) return { ok: true, field: { value: null, state: "skipped" } }
  const parsed = parse(raw)
  if (!parsed.ok) return { ok: false, error: errorMessage }
  if (parsed.value === null) return { ok: true, field: { value: null, state: "missing" } }
  const state: PlanningFieldState = estimated ? "estimated" : "answered"
  return { ok: true, field: { value: parsed.value, state } }
}

export async function saveGrowthInputs(
  _prev: SaveGrowthState,
  formData: FormData,
): Promise<SaveGrowthState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }

  const typical = numericField(
    formData.get("typicalLeadCapacity"),
    formData.get("typicalLeadCapacitySkip") === "1",
    formData.get("typicalLeadCapacityEstimated") === "1",
    parseWholeCount,
    GROWTH_COUNT_MESSAGE,
  )
  if (!typical.ok) return { error: typical.error, savedAt: null }
  const target = numericField(
    formData.get("targetAnnualBookings"),
    formData.get("targetAnnualBookingsSkip") === "1",
    formData.get("targetAnnualBookingsEstimated") === "1",
    parseWholeCount,
    GROWTH_COUNT_MESSAGE,
  )
  if (!target.ok) return { error: target.error, savedAt: null }
  const baseline = numericField(
    formData.get("expectedBookingsWithoutExpansion"),
    formData.get("expectedBookingsWithoutExpansionSkip") === "1",
    formData.get("expectedBookingsWithoutExpansionEstimated") === "1",
    parseWholeCount,
    GROWTH_COUNT_MESSAGE,
  )
  if (!baseline.ok) return { error: baseline.error, savedAt: null }
  const closing = numericField(
    formData.get("closingRatePercent"),
    formData.get("closingRatePercentSkip") === "1",
    formData.get("closingRatePercentEstimated") === "1",
    parseClosingRate,
    GROWTH_RATE_MESSAGE,
  )
  if (!closing.ok) return { error: closing.error, savedAt: null }

  const trainingSkipped = formData.get("trainingAvailabilitySkip") === "1"
  const trainingRaw = formData.get("trainingAvailability")
  let training: GrowthPlanningInputs["trainingAvailability"]
  if (trainingSkipped) {
    training = { value: null, state: "skipped" }
  } else if (!trainingRaw || String(trainingRaw).trim() === "") {
    training = { value: null, state: "missing" }
  } else {
    const parsed = parseTrainingAvailability(trainingRaw)
    if (!parsed) return { error: GROWTH_TRAINING_MESSAGE, savedAt: null }
    training = { value: parsed, state: "answered" }
  }

  const inputs: GrowthPlanningInputs = {
    typicalLeadCapacity: typical.field,
    targetAnnualBookings: target.field,
    expectedBookingsWithoutExpansion: baseline.field,
    closingRatePercent: closing.field,
    trainingAvailability: training,
  }

  const supabase = await createClient()
  const existing = await supabase
    .from("company_growth_planning")
    .select("recommendation_response")
    .eq("company_id", auth.membership.companyId)
    .maybeSingle()

  const { error } = await supabase.from("company_growth_planning").upsert(
    {
      company_id: auth.membership.companyId,
      inputs,
      recommendation_response: existing.data?.recommendation_response ?? null,
    },
    { onConflict: "company_id" },
  )
  if (error) {
    console.error("growth inputs", error.message)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  revalidatePath("/blueprint/growth")
  return { error: null, savedAt: Date.now() }
}

export async function saveGrowthResponse(
  _prev: SaveGrowthState,
  formData: FormData,
): Promise<SaveGrowthState> {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }

  const status = parseOwnerResponseStatus(formData.get("responseStatus"))
  if (!status) return { error: GROWTH_RESPONSE_MESSAGE, savedAt: null }

  let selectedKind = parseGrowthKind(formData.get("selectedKind"))
  if (status === "modified" && !selectedKind) {
    return { error: GROWTH_MODIFY_KIND_MESSAGE, savedAt: null }
  }
  if (status !== "modified") selectedKind = null

  const noteRaw = String(formData.get("responseNote") ?? "").trim()
  if (noteRaw.length > GROWTH_NOTE_MAX) {
    return { error: `Keep notes to ${GROWTH_NOTE_MAX} characters.`, savedAt: null }
  }

  const response: GrowthOwnerResponse = {
    status,
    selectedKind,
    note: noteRaw.length > 0 ? noteRaw : null,
  }

  const supabase = await createClient()
  const existing = await supabase
    .from("company_growth_planning")
    .select("inputs")
    .eq("company_id", auth.membership.companyId)
    .maybeSingle()

  const { error } = await supabase.from("company_growth_planning").upsert(
    {
      company_id: auth.membership.companyId,
      inputs: existing.data?.inputs ?? initialInputs,
      recommendation_response: response,
    },
    { onConflict: "company_id" },
  )
  if (error) {
    console.error("growth response", error.message)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  revalidatePath("/blueprint/growth")
  return { error: null, savedAt: Date.now() }
}
