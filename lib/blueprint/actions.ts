"use server"

import { revalidatePath } from "next/cache"

import { resolveQuestion } from "@/lib/blueprint/answers"
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
} from "@/lib/blueprint/questions"
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
    return { error: null, savedAt: Date.now() }
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
  if (t6.value === null) return { error: null, savedAt: Date.now() }

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
  if (!isQuestionKey(questionKey) || questionKey.startsWith("N")) {
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

  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprint_answers").upsert(
    {
      company_id: gate.membership.companyId,
      question_key: questionKey,
      value: parsed.value,
      state: "answered",
      question_version: question.version,
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
  if (!isQuestionKey(questionKey) || questionKey.startsWith("N")) {
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

  const supabase = await createClient()
  const { error } = await supabase.from("company_blueprint_answers").upsert(
    {
      company_id: gate.membership.companyId,
      question_key: questionKey,
      value: null,
      state: "skipped",
      question_version: question.version,
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
