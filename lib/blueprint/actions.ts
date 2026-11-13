"use server"

import { revalidatePath } from "next/cache"

import { persistedAnswerKey, resolveQuestion } from "@/lib/blueprint/answers"
import {
  mapSaveCompanyGoalsError,
  parseCompanyGoals,
  SAVE_GOALS_FAILED_MESSAGE,
} from "@/lib/blueprint/company-goals"
import { OWNER_GOAL_OTHER_REQUIRED_MESSAGE, parseOwnerGoal } from "@/lib/blueprint/goals"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import type { BlueprintSectionSlug } from "@/lib/blueprint/progress"
import {
  getCurrentBlueprintAnswers,
  getCurrentCompanyGoals,
  getCurrentTeamToday,
} from "@/lib/blueprint/queries"
import {
  ALREADY_ANSWERED_MESSAGE,
  G3_CHOOSE_MESSAGE,
  G3_SCHEMA,
  OWNER_ONLY_MESSAGE,
  QUESTION_BY_KEY,
  SAVE_FAILED_MESSAGE,
  isQuestionKey,
  type QuestionKey,
} from "@/lib/blueprint/questions"
import {
  EVENT_COMMON_SUBSET_MESSAGE,
  EVENT_NEW_OVERLAP_MESSAGE,
  EVENTS_RANGE_MESSAGE,
  eventTypesFromUnknown,
  inheritOfferedOther,
  overlapsOffered,
  parseAnnualEventCount,
  parseEventTypesValue,
  parseFutureFocus,
  parseNewDjPath,
  parseOptionalAnnualEventCount,
  isSubsetOfOffered,
  type EventTypesValue,
} from "@/lib/blueprint/events"
import {
  SERVICE_NEW_OVERLAP_MESSAGE,
  SERVICE_SUBSET_MESSAGE,
  inheritOfferedOther as inheritOfferedServiceOther,
  isSubsetOfOffered as isSubsetOfOfferedServices,
  overlapsOffered as overlapsOfferedServices,
  parseCompete,
  parsePositioning,
  parseServiceGoal,
  parseServiceTypesValue,
  parseWhyChosen,
  serviceTypesFromUnknown,
  type ServiceTypesValue,
} from "@/lib/blueprint/services"
import {
  NUMBERS_AMOUNT_MESSAGE,
  NUMBERS_PERCENT_MESSAGE,
  NUMBERS_PERIOD_MESSAGE,
  compensationUnitForMethod,
  parseDirectCostTypes,
  parseDjCostValue,
  parseFinancialPriority,
  parseMoneyAmountValue,
  parseOptionalMoneyAmount,
  parseOptionalPercent,
  parsePayMethod,
  parseRevenueValue,
  type PayMethodCode,
} from "@/lib/blueprint/numbers"
import {
  TEAM_RANGE_MESSAGE,
  T0_INCLUDED,
  T0_TEAM_ONLY,
  isConfirmedCount,
  mapSaveTeamTodayError,
  parseCurrentDjCount,
  parseDesiredDjCount,
  parseOptionalDjCount,
  parseOwnerDjFrequency,
  parseT4Value,
  parseT5Value,
  parseT7Value,
  parseT8Value,
  t1BelowT3Message,
  t3AboveT1Message,
  t3RangeMessage,
  type OwnerDjFrequency,
  type TeamCountBasis,
} from "@/lib/blueprint/team-today"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveOwnerGoalState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export type SaveTeamTodayState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export type SaveDesiredDjCountState = {
  error: string | null
  /** Set only when the server confirmed the save. Lets the form tell "just saved" from "never submitted". */
  savedAt: number | null
}

export type SaveAnswerState = {
  error: string | null
  savedAt: number | null
}

type GuidedClient = Awaited<ReturnType<typeof createClient>>

async function recordProgress(
  supabase: GuidedClient,
  companyId: string,
  lastSection: BlueprintSectionSlug,
  lastQuestionKey: string,
) {
  try {
    const { error } = await supabase.from("company_blueprint_progress").upsert(
      {
        company_id: companyId,
        last_section: lastSection,
        last_question_key: lastQuestionKey,
      },
      { onConflict: "company_id" },
    )
    if (error) console.error("blueprint progress", error.message)
  } catch (error) {
    console.error("blueprint progress", error)
  }
}

/** Removes a skip row only. Answered T4/T5/G3 rows live in this table and must stay. */
async function clearSkip(supabase: GuidedClient, companyId: string, questionKey: string) {
  try {
    const { error } = await supabase
      .from("company_blueprint_answers")
      .delete()
      .eq("company_id", companyId)
      .eq("question_key", questionKey)
      .eq("state", "skipped")
    if (error) console.error("blueprint skip cleanup", error.message)
  } catch (error) {
    console.error("blueprint skip cleanup", error)
  }
}

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

export async function saveTeamToday(
  _prevState: SaveTeamTodayState,
  formData: FormData,
): Promise<SaveTeamTodayState> {
  const currentDjCount = parseCurrentDjCount(formData.get("currentDjCount"))

  if (currentDjCount === null) {
    return { error: "Enter a whole number from 0 to 999.", savedAt: null }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("company_team_today").upsert(
    {
      company_id: membership.companyId,
      current_dj_count: currentDjCount,
    },
    { onConflict: "company_id" },
  )

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  if (isGuidedBlueprintEnabled(membership.companyId)) {
    await recordProgress(supabase, membership.companyId, "team", "T1")
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveDesiredDjCount(
  _prevState: SaveDesiredDjCountState,
  formData: FormData,
): Promise<SaveDesiredDjCountState> {
  const desiredDjCount = parseDesiredDjCount(formData.get("desiredDjCount"))

  if (desiredDjCount === null) {
    return { error: "Enter a whole number from 0 to 999.", savedAt: null }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("company_team_today")
    .update({ desired_dj_count: desiredDjCount })
    .eq("company_id", membership.companyId)
    .select("company_id")

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  if (!data || data.length === 0) {
    return { error: "Save your current DJ count first.", savedAt: null }
  }

  if (isGuidedBlueprintEnabled(membership.companyId)) {
    await recordProgress(supabase, membership.companyId, "team", "T6")
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

/**
 * Guided Team today v2 write path (S2-7).
 * The server action checks the env switch and the owner role before calling
 * save_team_today_v2. The RPC itself cannot see the switch: an authenticated
 * owner can call it directly. That bypass is a production-release blocker.
 */
export async function saveTeamTodayCard(
  _prevState: SaveTeamTodayState,
  formData: FormData,
): Promise<SaveTeamTodayState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const t0 = String(formData.get("t0") ?? "")
  const t1 = parseOptionalDjCount(formData.get("t1"))
  const t1b = parseOptionalDjCount(formData.get("t1b"))
  const t2 = parseOwnerDjFrequency(formData.get("t2"))
  const t3 = parseOptionalDjCount(formData.get("t3"))
  const t2Raw = formData.get("t2")

  if (!t1.ok || !t1b.ok || !t3.ok) {
    return { error: TEAM_RANGE_MESSAGE, savedAt: null }
  }
  if (t2Raw && t2 === null) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  if (t0 && t0 !== T0_INCLUDED && t0 !== T0_TEAM_ONLY) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const teamToday = await getCurrentTeamToday()
  const confirmedT1 = teamToday && isConfirmedCount(teamToday.currentDjCount, teamToday.countBasis)
    ? teamToday.currentDjCount
    : null
  const savedT3 = teamToday?.leadCapableCount ?? null
  const effectiveT1 = t1.value ?? confirmedT1

  if (t1.value !== null && t3.value === null && savedT3 !== null && t1.value < savedT3 && t1.value !== 0) {
    return { error: t1BelowT3Message(savedT3), savedAt: null }
  }
  if (t3.value !== null) {
    if (effectiveT1 === null) {
      return { error: SAVE_FAILED_MESSAGE, savedAt: null }
    }
    if (t3.value > effectiveT1) {
      return {
        error: savedT3 !== null && t1.value !== null ? t3AboveT1Message(effectiveT1) : t3RangeMessage(effectiveT1),
        savedAt: null,
      }
    }
  }

  const args: SaveTeamTodayV2Args = { p_company_id: gate.membership.companyId }
  const answered: string[] = []

  if (t1.value !== null) {
    args.p_current_dj_count = t1.value
    args.p_count_basis = "excludes_owner"
    if (t1.value === 0) args.p_lead_capable_count = 0
    answered.push("T1")
  } else if (t0 === T0_TEAM_ONLY) {
    args.p_count_basis = "excludes_owner"
    answered.push("T0")
  } else if (t0 === T0_INCLUDED) {
    args.p_count_basis = "includes_owner"
    answered.push("T0")
  }

  if (t1b.value !== null) {
    args.p_assistant_only_count = t1b.value
    answered.push("T1b")
  }
  if (t2) {
    args.p_owner_dj_frequency = t2
    answered.push("T2")
  }
  if (t3.value !== null && t1.value !== 0) {
    args.p_lead_capable_count = t3.value
    answered.push("T3")
  }

  if (answered.length === 0) {
    return { error: null, savedAt: null }
  }

  const supabase = await createClient()
  const { error } = await saveTeamTodayV2(supabase, args)
  if (error) {
    return { error: mapSaveTeamTodayError(error.code), savedAt: null }
  }

  for (const key of answered) {
    await clearSkip(supabase, gate.membership.companyId, key)
  }
  await recordProgress(supabase, gate.membership.companyId, "team", lastAnsweredKey(answered))
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveTeamRunsCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const t4Selected = formData.getAll("t4").map(String)
  const t5Selected = formData.getAll("t5").map(String)
  const t5OtherRaw = formData.get("t5Other")
  const t5Other = typeof t5OtherRaw === "string" && t5OtherRaw.trim() ? t5OtherRaw.trim() : null

  const writes: { key: "T4" | "T5"; value: unknown }[] = []
  if (t4Selected.length > 0) {
    const parsed = parseT4Value(t4Selected)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "T4", value: parsed.value })
  }
  if (t5Selected.length > 0) {
    const parsed = parseT5Value({ codes: t5Selected, other: t5Other })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "T5", value: parsed.value })
  }

  if (writes.length === 0) {
    return { error: null, savedAt: null }
  }

  const supabase = await createClient()
  for (const write of writes) {
    const question = QUESTION_BY_KEY[write.key]
    const { error } = await supabase.from("company_blueprint_answers").upsert(
      {
        company_id: gate.membership.companyId,
        question_key: write.key,
        value: write.value as Json,
        state: "answered",
        question_version: question.version,
      },
      { onConflict: "company_id,question_key" },
    )
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
    await clearSkip(supabase, gate.membership.companyId, write.key)
  }

  await recordProgress(supabase, gate.membership.companyId, "team", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveTeamWantedCard(
  _prevState: SaveTeamTodayState,
  formData: FormData,
): Promise<SaveTeamTodayState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const t6 = parseOptionalDjCount(formData.get("t6"))
  if (!t6.ok) return { error: TEAM_RANGE_MESSAGE, savedAt: null }
  if (t6.value === null) return { error: null, savedAt: null }

  const supabase = await createClient()
  const { error } = await saveTeamTodayV2(supabase, {
    p_company_id: gate.membership.companyId,
    p_desired_dj_count: t6.value,
    p_desired_count_basis: "excludes_owner",
  })
  if (error) return { error: mapSaveTeamTodayError(error.code), savedAt: null }

  await clearSkip(supabase, gate.membership.companyId, "T6")
  await recordProgress(supabase, gate.membership.companyId, "team", "T6")
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

function formEventTypes(formData: FormData, name: string, otherName: string) {
  const codes = formData.getAll(name).map(String)
  const otherRaw = formData.get(otherName)
  const other = typeof otherRaw === "string" && otherRaw.trim() ? otherRaw.trim() : null
  return { codes, other, present: codes.length > 0 }
}

function offeredFromAnswers(
  answers: Awaited<ReturnType<typeof getCurrentBlueprintAnswers>>,
): EventTypesValue | null {
  const stored = answers.find((row) => row.questionKey === "E1")
  if (!stored || stored.state === "skipped") return null
  return eventTypesFromUnknown(stored.value)
}

async function upsertAnswer(
  supabase: GuidedClient,
  companyId: string,
  questionKey: QuestionKey,
  value: unknown,
  state: "answered" | "estimated" = "answered",
) {
  const storedKey = persistedAnswerKey(questionKey)
  const question = QUESTION_BY_KEY[storedKey]
  const { error } = await supabase.from("company_blueprint_answers").upsert(
    {
      company_id: companyId,
      question_key: storedKey,
      value: value as Json,
      state,
      question_version: question.version,
    },
    { onConflict: "company_id,question_key" },
  )
  if (error) return error
  await clearSkip(supabase, companyId, storedKey)
  return null
}

/**
 * Guided Your events write path. Uses company_blueprint_answers (S2-7).
 * No new RPC. The same owner-direct-write bypass already tracked for answers.
 */
export async function saveEventsTodayCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const e1 = formEventTypes(formData, "e1", "e1Other")
  const e2Raw = formData.get("e2")
  const e2 = parseOptionalAnnualEventCount(e2Raw)
  if (!e2.ok) return { error: EVENTS_RANGE_MESSAGE, savedAt: null }
  const e3 = formEventTypes(formData, "e3", "e3Other")
  const estimated = String(formData.get("e2Estimated") ?? "") === "1"

  const writes: { key: "E1" | "E2" | "E3"; value: unknown; state: "answered" | "estimated" }[] = []
  let offered: EventTypesValue | null = null

  if (e1.present) {
    const parsed = parseEventTypesValue({ codes: e1.codes, other: e1.other })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "E1", value: parsed.value, state: "answered" })
    offered = parsed.value
  }
  if (e2.value !== null) {
    writes.push({ key: "E2", value: e2.value, state: estimated ? "estimated" : "answered" })
  }
  if (e3.present) {
    if (!offered) offered = offeredFromAnswers(await getCurrentBlueprintAnswers())
    const parsed = parseEventTypesValue({
      codes: e3.codes,
      other: inheritOfferedOther(e3.codes, e3.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && !isSubsetOfOffered(parsed.value.codes, offered.codes)) {
      return { error: EVENT_COMMON_SUBSET_MESSAGE, savedAt: null }
    }
    writes.push({ key: "E3", value: parsed.value, state: "answered" })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value, write.state)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "events", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveEventsStaffCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const e4 = formEventTypes(formData, "e4", "e4Other")
  const e5 = formEventTypes(formData, "e5", "e5Other")
  const e6Raw = formData.get("e6")
  const offered = offeredFromAnswers(await getCurrentBlueprintAnswers())

  const writes: { key: "E4" | "E5" | "E6"; value: unknown }[] = []
  if (e4.present) {
    const parsed = parseEventTypesValue({
      codes: e4.codes,
      other: inheritOfferedOther(e4.codes, e4.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "E4", value: parsed.value })
  }
  if (e5.present) {
    const parsed = parseEventTypesValue({
      codes: e5.codes,
      other: inheritOfferedOther(e5.codes, e5.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "E5", value: parsed.value })
  }
  if (e6Raw) {
    const parsed = parseNewDjPath(e6Raw)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "E6", value: parsed.value })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "events", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveEventsFutureCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const e7 = formEventTypes(formData, "e7", "e7Other")
  const e8 = formEventTypes(formData, "e8", "e8Other")
  const e9Raw = formData.get("e9")
  const offered = offeredFromAnswers(await getCurrentBlueprintAnswers())

  const writes: { key: "E7" | "E8" | "E9"; value: unknown }[] = []
  if (e7.present) {
    const parsed = parseEventTypesValue({
      codes: e7.codes,
      other: inheritOfferedOther(e7.codes, e7.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && !isSubsetOfOffered(parsed.value.codes, offered.codes)) {
      return { error: EVENT_COMMON_SUBSET_MESSAGE, savedAt: null }
    }
    writes.push({ key: "E7", value: parsed.value })
  }
  if (e8.present) {
    const parsed = parseEventTypesValue({ codes: e8.codes, other: e8.other })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && overlapsOffered(parsed.value.codes, offered.codes)) {
      return { error: EVENT_NEW_OVERLAP_MESSAGE, savedAt: null }
    }
    writes.push({ key: "E8", value: parsed.value })
  }
  if (e9Raw) {
    const parsed = parseFutureFocus(e9Raw)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "E9", value: parsed.value })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "events", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

function offeredServicesFromAnswers(
  answers: Awaited<ReturnType<typeof getCurrentBlueprintAnswers>>,
): ServiceTypesValue | null {
  const stored = answers.find((row) => row.questionKey === "S1")
  if (!stored || stored.state === "skipped") return null
  return serviceTypesFromUnknown(stored.value)
}

function formCodes(formData: FormData, name: string) {
  const codes = formData.getAll(name).map(String)
  return { codes, present: codes.length > 0 }
}

/**
 * Guided Your services and market write path. Uses company_blueprint_answers (S2-7).
 * No new RPC. The same owner-direct-write bypass already tracked for answers.
 */
export async function saveServicesTodayCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const s1 = formEventTypes(formData, "s1", "s1Other")
  const s2 = formEventTypes(formData, "s2", "s2Other")
  const s3 = formEventTypes(formData, "s3", "s3Other")
  const writes: { key: "S1" | "S2" | "S3"; value: unknown }[] = []
  let offered: ServiceTypesValue | null = null

  if (s1.present) {
    const parsed = parseServiceTypesValue({ codes: s1.codes, other: s1.other })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "S1", value: parsed.value })
    offered = parsed.value
  }
  if (s2.present) {
    if (!offered) offered = offeredServicesFromAnswers(await getCurrentBlueprintAnswers())
    const parsed = parseServiceTypesValue({
      codes: s2.codes,
      other: inheritOfferedServiceOther(s2.codes, s2.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && !isSubsetOfOfferedServices(parsed.value.codes, offered.codes)) {
      return { error: SERVICE_SUBSET_MESSAGE, savedAt: null }
    }
    writes.push({ key: "S2", value: parsed.value })
  }
  if (s3.present) {
    if (!offered) offered = offeredServicesFromAnswers(await getCurrentBlueprintAnswers())
    const parsed = parseServiceTypesValue({
      codes: s3.codes,
      other: inheritOfferedServiceOther(s3.codes, s3.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && !isSubsetOfOfferedServices(parsed.value.codes, offered.codes)) {
      return { error: SERVICE_SUBSET_MESSAGE, savedAt: null }
    }
    writes.push({ key: "S3", value: parsed.value })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "services", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveServicesMarketCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const s4Raw = formData.get("s4")
  const s5 = formCodes(formData, "s5")
  const s6 = formCodes(formData, "s6")
  const writes: { key: "S4" | "S5" | "S6"; value: unknown }[] = []

  if (s4Raw) {
    const parsed = parsePositioning(s4Raw)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "S4", value: parsed.value })
  }
  if (s5.present) {
    const parsed = parseWhyChosen(s5.codes)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "S5", value: parsed.value })
  }
  if (s6.present) {
    const parsed = parseCompete(s6.codes)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "S6", value: parsed.value })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "services", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveServicesGrowCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const s7 = formEventTypes(formData, "s7", "s7Other")
  const s8 = formEventTypes(formData, "s8", "s8Other")
  const s9Raw = formData.get("s9")
  const offered = offeredServicesFromAnswers(await getCurrentBlueprintAnswers())
  const writes: { key: "S7" | "S8" | "S9"; value: unknown }[] = []

  if (s7.present) {
    const parsed = parseServiceTypesValue({ codes: s7.codes, other: s7.other })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && overlapsOfferedServices(parsed.value.codes, offered.codes)) {
      return { error: SERVICE_NEW_OVERLAP_MESSAGE, savedAt: null }
    }
    writes.push({ key: "S7", value: parsed.value })
  }
  if (s8.present) {
    const parsed = parseServiceTypesValue({
      codes: s8.codes,
      other: inheritOfferedServiceOther(s8.codes, s8.other, offered),
    })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    if (offered && !isSubsetOfOfferedServices(parsed.value.codes, offered.codes)) {
      return { error: SERVICE_SUBSET_MESSAGE, savedAt: null }
    }
    writes.push({ key: "S8", value: parsed.value })
  }
  if (s9Raw) {
    const parsed = parseServiceGoal(s9Raw)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "S9", value: parsed.value })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "services", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

function estimatedFlag(formData: FormData, name: string) {
  return String(formData.get(name) ?? "") === "1" || String(formData.get(name) ?? "") === "estimated"
}

/**
 * Guided Your numbers write path. Uses company_blueprint_answers (S2-7).
 * N2 persists as E2 so yearly volume has one underlying value.
 * No new RPC. Do not calculate profit, margins, or booking price from company revenue.
 */
export async function saveNumbersTodayCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const n1Amount = parseOptionalMoneyAmount(formData.get("n1"))
  if (!n1Amount.ok) return { error: NUMBERS_AMOUNT_MESSAGE, savedAt: null }
  const n1Period = formData.get("n1Period")
  const n2Raw = formData.get("n2")
  const n2 = parseOptionalAnnualEventCount(n2Raw)
  if (!n2.ok) return { error: EVENTS_RANGE_MESSAGE, savedAt: null }
  const n3Amount = parseOptionalMoneyAmount(formData.get("n3"))
  if (!n3Amount.ok) return { error: NUMBERS_AMOUNT_MESSAGE, savedAt: null }

  const writes: { key: "N1" | "N2" | "N3"; value: unknown; state: "answered" | "estimated" }[] = []
  if (n1Amount.value !== null) {
    const parsed = parseRevenueValue({ amount: n1Amount.value, period: n1Period })
    if (!parsed.ok) {
      return { error: n1Period ? parsed.error : NUMBERS_PERIOD_MESSAGE, savedAt: null }
    }
    writes.push({
      key: "N1",
      value: parsed.value,
      state: estimatedFlag(formData, "n1Estimated") ? "estimated" : "answered",
    })
  }
  if (n2.value !== null) {
    writes.push({
      key: "N2",
      value: n2.value,
      state: estimatedFlag(formData, "n2Estimated") ? "estimated" : "answered",
    })
  }
  if (n3Amount.value !== null) {
    writes.push({
      key: "N3",
      value: { amount: n3Amount.value },
      state: estimatedFlag(formData, "n3Estimated") ? "estimated" : "answered",
    })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value, write.state)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "numbers", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveNumbersCostsCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const n4Raw = formData.get("n4")
  const n6Codes = formData.getAll("n6").map(String)
  const answers = await getCurrentBlueprintAnswers()
  const storedMethod = payMethodFromAnswers(answers)
  const method = n4Raw ? parsePayMethod(n4Raw) : storedMethod ? { ok: true as const, value: storedMethod } : null
  if (n4Raw && method && !method.ok) return { error: method.error, savedAt: null }

  const writes: { key: "N4" | "N5" | "N6" | "N7"; value: unknown; state: "answered" | "estimated" }[] = []
  if (method?.ok) {
    writes.push({ key: "N4", value: method.value, state: "answered" })
  }

  const unit = compensationUnitForMethod(method?.ok ? method.value : storedMethod)
  const n5Raw = unit === "percent" ? formData.get("n5Percent") : formData.get("n5")
  const n5Amount =
    unit === "percent" ? parseOptionalPercent(n5Raw) : parseOptionalMoneyAmount(n5Raw)
  if (!n5Amount.ok) {
    return { error: unit === "percent" ? NUMBERS_PERCENT_MESSAGE : NUMBERS_AMOUNT_MESSAGE, savedAt: null }
  }
  if (n5Amount.value !== null) {
    const parsed = parseDjCostValue(
      { amount: n5Amount.value, unit: unit ?? (formData.get("n5Unit") === "percent" ? "percent" : "usd") },
      method?.ok ? method.value : storedMethod,
    )
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({
      key: "N5",
      value: parsed.value,
      state: estimatedFlag(formData, "n5Estimated") ? "estimated" : "answered",
    })
  }

  if (n6Codes.length > 0) {
    const parsed = parseDirectCostTypes({ codes: n6Codes })
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "N6", value: parsed.value, state: "answered" })
    if (parsed.value.codes[0] === "none") {
      // N7 is not applicable when there are no other direct costs.
    } else {
      const n7Amount = parseOptionalMoneyAmount(formData.get("n7"))
      if (!n7Amount.ok) return { error: NUMBERS_AMOUNT_MESSAGE, savedAt: null }
      if (n7Amount.value !== null) {
        writes.push({
          key: "N7",
          value: { amount: n7Amount.value },
          state: estimatedFlag(formData, "n7Estimated") ? "estimated" : "answered",
        })
      }
    }
  } else {
    const n7Amount = parseOptionalMoneyAmount(formData.get("n7"))
    if (!n7Amount.ok) return { error: NUMBERS_AMOUNT_MESSAGE, savedAt: null }
    if (n7Amount.value !== null) {
      writes.push({
        key: "N7",
        value: { amount: n7Amount.value },
        state: estimatedFlag(formData, "n7Estimated") ? "estimated" : "answered",
      })
    }
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value, write.state)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "numbers", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function saveNumbersGoalsCard(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) return { error: gate.error, savedAt: null }

  const n8Raw = formData.get("n8")
  const n9Amount = parseOptionalMoneyAmount(formData.get("n9"))
  if (!n9Amount.ok) return { error: NUMBERS_AMOUNT_MESSAGE, savedAt: null }

  const writes: { key: "N8" | "N9"; value: unknown; state: "answered" | "estimated" }[] = []
  if (n8Raw) {
    const parsed = parseFinancialPriority(n8Raw)
    if (!parsed.ok) return { error: parsed.error, savedAt: null }
    writes.push({ key: "N8", value: parsed.value, state: "answered" })
  }
  if (n9Amount.value !== null) {
    writes.push({
      key: "N9",
      value: { amount: n9Amount.value },
      state: estimatedFlag(formData, "n9Estimated") ? "estimated" : "answered",
    })
  }

  if (writes.length === 0) return { error: null, savedAt: null }

  const supabase = await createClient()
  for (const write of writes) {
    const error = await upsertAnswer(supabase, gate.membership.companyId, write.key, write.value, write.state)
    if (error) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  await recordProgress(supabase, gate.membership.companyId, "numbers", writes[writes.length - 1].key)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

function payMethodFromAnswers(
  answers: Awaited<ReturnType<typeof getCurrentBlueprintAnswers>>,
): PayMethodCode | null {
  const stored = answers.find((row) => row.questionKey === "N4")
  if (!stored || stored.state === "skipped") return null
  const parsed = parsePayMethod(stored.value)
  return parsed.ok ? parsed.value : null
}

export async function saveOwnerGoal(
  _prevState: SaveOwnerGoalState,
  formData: FormData,
): Promise<SaveOwnerGoalState> {
  const parsed = parseOwnerGoal({
    ownerGoal: formData.get("ownerGoal"),
    ownerGoalOther: formData.get("ownerGoalOther"),
  })

  if (!parsed) {
    const otherText = formData.get("ownerGoalOther")
    const otherIsEmpty = typeof otherText !== "string" || otherText.trim().length === 0
    return {
      error:
        formData.get("ownerGoal") === "other" && otherIsEmpty
          ? OWNER_GOAL_OTHER_REQUIRED_MESSAGE
          : "Choose a goal from the list.",
      savedAt: null,
    }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprints").upsert(
    {
      company_id: membership.companyId,
      owner_goal: parsed.ownerGoal,
      owner_goal_other: parsed.ownerGoalOther,
    },
    { onConflict: "company_id" },
  )

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export type SaveCompanyGoalsState = {
  error: string | null
  savedAt: number | null
}

/**
 * Guided multiple-goals write path (S2-7 option A).
 * The server action checks the env switch and the owner role before calling
 * save_company_goals. The RPC itself cannot see the switch: an authenticated
 * owner can call it directly. That direct-RPC bypass is a production-release
 * blocker and is not accepted as a permanent security design. The same class
 * of bypass applies to company_blueprint_answers, company_blueprint_progress,
 * and save_team_today_v2.
 */
export async function saveCompanyGoals(
  _prevState: SaveCompanyGoalsState,
  formData: FormData,
): Promise<SaveCompanyGoalsState> {
  const parsed = parseCompanyGoals({
    goals: formData.getAll("goals"),
    primary: formData.get("primary"),
    otherText: formData.get("otherText"),
  })

  if (!parsed.ok) {
    return { error: parsed.error, savedAt: null }
  }

  const membership = await getCurrentMembership()
  if (!membership || membership.role !== OWNER_ADMIN_ROLE) {
    return { error: OWNER_ONLY_MESSAGE, savedAt: null }
  }

  if (!isGuidedBlueprintEnabled(membership.companyId)) {
    return { error: SAVE_GOALS_FAILED_MESSAGE, savedAt: null }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("save_company_goals", {
    p_company_id: membership.companyId,
    p_goals: parsed.value.goals,
    p_primary: parsed.value.primary,
    p_other_text: parsed.value.otherText ?? "",
  })

  if (error) {
    return { error: mapSaveCompanyGoalsError(error.code), savedAt: null }
  }

  await clearSkip(supabase, membership.companyId, "G1")
  await recordProgress(supabase, membership.companyId, "goals", "G1")

  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

function parseJsonish(raw: unknown) {
  if (typeof raw !== "string") return raw
  const trimmed = raw.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return raw
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return raw
  }
}

function parseAnswerValue(questionKey: string, raw: unknown) {
  if (questionKey === "G3") {
    const parsed = G3_SCHEMA.safeParse(raw)
    return parsed.success ? { ok: true as const, value: parsed.data } : { ok: false as const, error: G3_CHOOSE_MESSAGE }
  }
  const value = parseJsonish(raw)
  if (questionKey === "T4") return parseT4Value(value)
  if (questionKey === "T5") return parseT5Value(value)
  if (questionKey === "T7") return parseT7Value(value)
  if (questionKey === "T8") return parseT8Value(value)
  if (questionKey === "E1" || questionKey === "E3" || questionKey === "E4" || questionKey === "E5" || questionKey === "E7" || questionKey === "E8") {
    return parseEventTypesValue(value)
  }
  if (questionKey === "E2") {
    const parsed = parseAnnualEventCount(value)
    return parsed === null ? { ok: false as const, error: EVENTS_RANGE_MESSAGE } : { ok: true as const, value: parsed }
  }
  if (questionKey === "E6") return parseNewDjPath(value)
  if (questionKey === "E9") return parseFutureFocus(value)
  if (questionKey === "S1" || questionKey === "S2" || questionKey === "S3" || questionKey === "S7" || questionKey === "S8") {
    return parseServiceTypesValue(value)
  }
  if (questionKey === "S4") return parsePositioning(value)
  if (questionKey === "S5") return parseWhyChosen(value)
  if (questionKey === "S6") return parseCompete(value)
  if (questionKey === "S9") return parseServiceGoal(value)
  if (questionKey === "N1") return parseRevenueValue(value)
  if (questionKey === "N2") {
    const parsed = parseAnnualEventCount(value)
    return parsed === null ? { ok: false as const, error: EVENTS_RANGE_MESSAGE } : { ok: true as const, value: parsed }
  }
  if (questionKey === "N3" || questionKey === "N7" || questionKey === "N9") return parseMoneyAmountValue(value)
  if (questionKey === "N4") return parsePayMethod(value)
  if (questionKey === "N5") return parseDjCostValue(value, null)
  if (questionKey === "N6") return parseDirectCostTypes(value)
  if (questionKey === "N8") return parseFinancialPriority(value)
  return { ok: false as const, error: SAVE_FAILED_MESSAGE }
}

type SaveTeamTodayV2Args = {
  p_company_id: string
  p_current_dj_count?: number
  p_desired_dj_count?: number
  p_assistant_only_count?: number
  p_owner_dj_frequency?: OwnerDjFrequency
  p_lead_capable_count?: number
  p_count_basis?: TeamCountBasis
  p_desired_count_basis?: TeamCountBasis
}

async function saveTeamTodayV2(supabase: GuidedClient, args: SaveTeamTodayV2Args) {
  return supabase.rpc("save_team_today_v2", args)
}

function lastAnsweredKey(keys: readonly string[]) {
  return keys[keys.length - 1] ?? "T1"
}

export async function saveAnswer(
  _prevState: SaveAnswerState,
  formData: FormData,
): Promise<SaveAnswerState> {
  const questionKey = String(formData.get("questionKey") ?? "")
  if (!isQuestionKey(questionKey)) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const question = QUESTION_BY_KEY[questionKey]
  if (question.storage !== "answers") {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const parsed = parseAnswerValue(questionKey, formData.get("value"))
  if (!parsed.ok) {
    return { error: parsed.error, savedAt: null }
  }

  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) {
    return { error: gate.error, savedAt: null }
  }

  const [goals, teamToday, answers] = await Promise.all([
    getCurrentCompanyGoals(),
    getCurrentTeamToday(),
    getCurrentBlueprintAnswers(),
  ])
  const resolved = resolveQuestion(question, { goals, teamToday, answers })
  if (resolved.state === "not_applicable") {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const storedKey = persistedAnswerKey(questionKey)
  const storedQuestion = QUESTION_BY_KEY[storedKey]
  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprint_answers").upsert(
    {
      company_id: gate.membership.companyId,
      question_key: storedKey,
      value: parsed.value,
      state: "answered",
      question_version: storedQuestion.version,
    },
    { onConflict: "company_id,question_key" },
  )

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  await recordProgress(supabase, gate.membership.companyId, question.section, questionKey)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}

export async function skipQuestion(questionKey: string): Promise<SaveAnswerState> {
  if (!isQuestionKey(questionKey)) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const question = QUESTION_BY_KEY[questionKey]
  if (!question.skipAllowed) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  const gate = await requireGuidedOwnerMembership()
  if (!gate.ok) {
    return { error: gate.error, savedAt: null }
  }

  const [goals, teamToday, answers] = await Promise.all([
    getCurrentCompanyGoals(),
    getCurrentTeamToday(),
    getCurrentBlueprintAnswers(),
  ])
  const resolved = resolveQuestion(question, { goals, teamToday, answers })
  if (resolved.state === "not_applicable") {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  if (resolved.state !== "unanswered") {
    return { error: ALREADY_ANSWERED_MESSAGE, savedAt: null }
  }

  const storedKey = persistedAnswerKey(questionKey)
  const storedQuestion = QUESTION_BY_KEY[storedKey]
  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprint_answers").upsert(
    {
      company_id: gate.membership.companyId,
      question_key: storedKey,
      value: null,
      state: "skipped",
      question_version: storedQuestion.version,
    },
    { onConflict: "company_id,question_key" },
  )

  if (error) {
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }

  await recordProgress(supabase, gate.membership.companyId, question.section, questionKey)
  revalidatePath("/", "layout")
  return { error: null, savedAt: Date.now() }
}
