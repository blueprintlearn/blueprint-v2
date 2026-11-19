/**
 * Typed contract for a future recruitment system.
 *
 * Consume only a current approved growth plan. A plan that needs review, a
 * draft, or a superseded version is not a recruiting plan. This module does
 * not publish jobs, send messages, create applicants, or trigger external
 * actions.
 */

import type { GrowthRecommendationKind } from "@/lib/blueprint/growth-engine"
import type { GrowthPlanWarning, HireProfile } from "@/lib/blueprint/growth-plan-engine"
import { applyOwnerDecisions } from "@/lib/blueprint/growth-plan-engine"
import type { StoredGrowthPlan } from "@/lib/blueprint/growth-plan"

export type RecruitmentHiringTarget = {
  count: number | null
  status: "calculated" | "estimated" | "unavailable" | "owner_set"
  source: "recommended" | "owner"
  explanation: string
}

export type RecruitmentHandoff = {
  companyId: string
  planId: string
  version: number
  approvedAt: string
  approvedBy: string
  hiringTarget: RecruitmentHiringTarget
  hireProfile: HireProfile | null
  recruitingApproach: {
    kind: GrowthRecommendationKind | null
    summary: string
    source: "recommended" | "owner"
  }
  training: {
    canSupportBeginners: boolean | null
    limitations: string
    preparation: string
  }
  ownerDecisions: {
    acceptedRecommendations: boolean
    rejectedRecommendations: boolean
    note: string | null
    modifications: string[]
  }
  warnings: GrowthPlanWarning[]
  nextSteps: { text: string; source: "recommendation" | "owner" }[]
}

export function currentApprovedPlanForRecruitment(
  rows: StoredGrowthPlan[],
  currentFingerprint: string,
): StoredGrowthPlan | null {
  const approved = rows.find((row) => row.status === "approved") ?? null
  if (!approved) return null
  if (approved.sourceFingerprint !== currentFingerprint) return null
  return approved
}

export function recruitmentHandoffFromApproved(
  companyId: string,
  plan: StoredGrowthPlan,
  currentFingerprint: string,
): RecruitmentHandoff | null {
  if (plan.status !== "approved") return null
  if (plan.sourceFingerprint !== currentFingerprint) return null
  if (!plan.approvedAt || !plan.approvedBy) return null
  const effective = applyOwnerDecisions(plan.recommended, plan.decisions, plan.warnings)
  const ownerSetHiring =
    plan.decisions.stance === "modify" &&
    plan.decisions.hiringTarget !== null &&
    plan.decisions.hiringTarget !== plan.recommended.hiring.recommendedTarget.value
  const hiringStatus: RecruitmentHiringTarget["status"] = ownerSetHiring
    ? "owner_set"
    : effective.hiringTarget.status
  return {
    companyId,
    planId: plan.id,
    version: plan.version,
    approvedAt: plan.approvedAt,
    approvedBy: plan.approvedBy,
    hiringTarget: {
      count: effective.hiringTarget.value,
      status: hiringStatus,
      source: ownerSetHiring ? "owner" : "recommended",
      explanation: effective.hiringTarget.explanation,
    },
    hireProfile: effective.hireProfile,
    recruitingApproach: {
      kind: effective.recruitingKind,
      summary: effective.recruitingApproach,
      source:
        plan.decisions.stance === "modify" &&
        plan.decisions.recruitingKind &&
        plan.decisions.recruitingKind !== plan.recommended.recruiting.kind
          ? "owner"
          : "recommended",
    },
    training: effective.training,
    ownerDecisions: {
      acceptedRecommendations: effective.acceptedRecommendations,
      rejectedRecommendations: effective.rejectedRecommendations,
      note: plan.decisions.note,
      modifications: effective.modifications,
    },
    warnings: effective.warnings,
    nextSteps: effective.nextSteps,
  }
}
