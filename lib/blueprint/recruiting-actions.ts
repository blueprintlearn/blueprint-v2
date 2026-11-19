"use server"

import { revalidatePath } from "next/cache"

import { resolveAll, type AnswerContext } from "@/lib/blueprint/answers"
import { isGuidedBlueprintEnabled } from "@/lib/blueprint/guided-switch"
import {
  RECRUITING_CONFIRM_MESSAGE,
  RECRUITING_NEED_STRATEGY,
  RECRUITING_SLUG_TAKEN,
  fingerprintOf,
  parseRecruitingEditor,
} from "@/lib/blueprint/recruiting"
import { composeRecruitingMaterials, recruitingPublicPath, suggestSlug } from "@/lib/blueprint/recruiting-engine"
import {
  insertPublishedPage,
  loadRecruitingRows,
  slugTakenByOther,
  unpublishPage,
  upsertDraftPage,
} from "@/lib/blueprint/recruiting-store"
import { composeProposedStrategy, currentGrowthForRecruitment } from "@/lib/blueprint/recruitment"
import { emptyRecruitInputs } from "@/lib/blueprint/recruitment-engine"
import {
  currentApprovedStrategyForAds,
  recruitmentStrategyHandoffFromApproved,
  type RecruitmentStrategyHandoff,
} from "@/lib/blueprint/recruitment-strategy-handoff"
import {
  loadRecruitmentRows,
  syncApprovedStrategiesToFingerprint,
} from "@/lib/blueprint/recruitment-store"
import {
  getCurrentBlueprintAnswers,
  getCurrentCompanyGoals,
  getCurrentGrowthPlanning,
  getCurrentGrowthPlans,
  getCurrentTeamToday,
} from "@/lib/blueprint/queries"
import { OWNER_ONLY_MESSAGE, SAVE_FAILED_MESSAGE } from "@/lib/blueprint/questions"
import { createClient } from "@/lib/supabase/server"
import { OWNER_ADMIN_ROLE } from "@/lib/rules/system-role"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export type SaveRecruitingState = { error: string | null; savedAt: number | null }

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

export async function loadCurrentRecruitmentHandoff(
  companyId: string,
): Promise<RecruitmentStrategyHandoff | null> {
  const [goals, teamToday, answers, planning, planRows] = await Promise.all([
    getCurrentCompanyGoals(),
    getCurrentTeamToday(),
    getCurrentBlueprintAnswers(),
    getCurrentGrowthPlanning(),
    getCurrentGrowthPlans(),
  ])
  const context: AnswerContext = { goals, teamToday, answers }
  const resolved = resolveAll(context)
  const { growth } = currentGrowthForRecruitment(companyId, context, resolved, planning, planRows)
  const supabase = await createClient()
  const previewRows = await loadRecruitmentRows(supabase, companyId)
  const source =
    previewRows.find((row) => row.status === "approved") ?? previewRows.find((row) => row.status === "draft")
  const composed = composeProposedStrategy(context, resolved, growth, source?.inputs ?? emptyRecruitInputs())
  await syncApprovedStrategiesToFingerprint(supabase, companyId, composed.fingerprint)
  const rows = await loadRecruitmentRows(supabase, companyId)
  const approved = currentApprovedStrategyForAds(rows, composed.fingerprint)
  if (!approved) return null
  return recruitmentStrategyHandoffFromApproved(companyId, approved, composed.fingerprint)
}

async function readyEditor(formData: FormData) {
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { ok: false as const, error: auth.error }
  const parsed = parseRecruitingEditor(formData)
  if (!parsed.ok) return { ok: false as const, error: parsed.error }
  const handoff = await loadCurrentRecruitmentHandoff(auth.membership.companyId)
  if (!handoff) return { ok: false as const, error: RECRUITING_NEED_STRATEGY }
  const supabase = await createClient()
  if (await slugTakenByOther(supabase, parsed.value.slug, auth.membership.companyId)) {
    return { ok: false as const, error: RECRUITING_SLUG_TAKEN }
  }
  return {
    ok: true as const,
    membership: auth.membership,
    editor: parsed.value,
    handoff,
    supabase,
  }
}

export async function saveRecruitingEditor(
  prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  if (formData.get("intent") === "publish") return publishRecruitingPage(prev, formData)
  return saveRecruitingDraft(prev, formData)
}

export async function saveRecruitingDraft(
  _prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  const ready = await readyEditor(formData)
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const saved = await upsertDraftPage(ready.supabase, ready.membership.companyId, {
    ...ready.editor,
    fingerprint: fingerprintOf(ready.handoff),
    strategyId: ready.handoff.strategyId,
    strategyVersion: ready.handoff.version,
  })
  if (saved.error) {
    console.error("recruiting draft", saved.error)
    return { error: saved.error.includes("company_recruiting_pages_reserved_slug") ? RECRUITING_SLUG_TAKEN : SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruiting")
  revalidatePath(`/join/${ready.editor.slug}`)
  return { error: null, savedAt: Date.now() }
}

export async function publishRecruitingPage(
  _prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  if (formData.get("confirmPublish") !== "1") {
    return { error: RECRUITING_CONFIRM_MESSAGE, savedAt: null }
  }
  const ready = await readyEditor(formData)
  if (!ready.ok) return { error: ready.error, savedAt: null }
  const saved = await insertPublishedPage(ready.supabase, ready.membership.companyId, {
    ...ready.editor,
    fingerprint: fingerprintOf(ready.handoff),
    strategyId: ready.handoff.strategyId,
    strategyVersion: ready.handoff.version,
  })
  if (saved.error) {
    console.error("recruiting publish", saved.error)
    return { error: saved.error.includes("company_recruiting_pages_reserved_slug") ? RECRUITING_SLUG_TAKEN : SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/", "layout")
  revalidatePath("/blueprint/recruiting")
  revalidatePath(`/join/${ready.editor.slug}`)
  return { error: null, savedAt: Date.now() }
}

export async function unpublishRecruitingPage(
  _prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  void formData
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, auth.membership.companyId)
  const published = rows.find((row) => row.status === "published")
  const saved = await unpublishPage(supabase, auth.membership.companyId)
  if (saved.error) {
    console.error("recruiting unpublish", saved.error)
    return { error: saved.error === "No published recruiting page to unpublish." ? saved.error : SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/", "layout")
  revalidatePath("/blueprint/recruiting")
  if (published) revalidatePath(`/join/${published.slug}`)
  return { error: null, savedAt: Date.now() }
}

export async function startRecruitingRevision(
  _prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  void formData
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, auth.membership.companyId)
  const source = rows.find((row) => row.status === "published") ?? rows.find((row) => row.status === "unpublished")
  if (!source) return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  if (rows.some((row) => row.status === "draft")) {
    revalidatePath("/blueprint/recruiting")
    return { error: null, savedAt: Date.now() }
  }
  const saved = await upsertDraftPage(supabase, auth.membership.companyId, {
    slug: source.slug,
    page: source.page,
    ads: source.ads,
    fingerprint: source.sourceFingerprint,
    strategyId: source.sourceStrategyId,
    strategyVersion: source.sourceStrategyVersion,
  })
  if (saved.error) {
    console.error("recruiting revise", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruiting")
  return { error: null, savedAt: Date.now() }
}

export async function rebuildRecruitingDraft(
  _prev: SaveRecruitingState,
  formData: FormData,
): Promise<SaveRecruitingState> {
  void formData
  const auth = await requireGuidedOwnerMembership()
  if (!auth.ok) return { error: auth.error, savedAt: null }
  const handoff = await loadCurrentRecruitmentHandoff(auth.membership.companyId)
  if (!handoff) return { error: RECRUITING_NEED_STRATEGY, savedAt: null }
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, auth.membership.companyId)
  const live =
    rows.find((row) => row.status === "draft") ??
    rows.find((row) => row.status === "published") ??
    rows.find((row) => row.status === "unpublished")
  const slug = live?.slug ?? suggestSlug(auth.membership.companyName)
  const joinPath = recruitingPublicPath(slug)
  const materials = composeRecruitingMaterials(auth.membership.companyName, handoff, joinPath)
  const saved = await upsertDraftPage(supabase, auth.membership.companyId, {
    slug,
    page: {
      ...materials.page,
      companyName: live?.page.companyName ?? materials.page.companyName,
      primaryColor: live?.page.primaryColor ?? null,
      accentColor: live?.page.accentColor ?? null,
    },
    ads: materials.ads,
    fingerprint: fingerprintOf(handoff),
    strategyId: handoff.strategyId,
    strategyVersion: handoff.version,
  })
  if (saved.error) {
    console.error("recruiting rebuild", saved.error)
    return { error: SAVE_FAILED_MESSAGE, savedAt: null }
  }
  revalidatePath("/blueprint/recruiting")
  return { error: null, savedAt: Date.now() }
}
