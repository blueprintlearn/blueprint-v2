/**
 * Typed contract for Stage 3.2 job ads and recruiting landing pages.
 *
 * Consume only a current approved recruitment strategy. A draft, a strategy
 * that needs review, or a superseded version is not a source for ads.
 * This module does not publish jobs, send messages, create applicants, or
 * trigger external actions.
 */

import { applyRecruitDecisions, type RecruitChannelId, type RecruitProfile, type RecruitReason } from "@/lib/blueprint/recruitment-engine"
import type { StoredRecruitStrategy } from "@/lib/blueprint/recruitment"

export type RecruitmentStrategyHandoff = {
  companyId: string
  strategyId: string
  version: number
  approvedAt: string
  approvedBy: string
  reason: RecruitReason | null
  hiringTarget: number | null
  hireProfile: RecruitProfile | null
  candidate: {
    required: string[]
    preferred: string[]
    values: { value: string; behavior: string; interviewQuestion: string }[]
  }
  employment: {
    arrangement: string | null
    compensation: string
  }
  channels: RecruitChannelId[]
  budgetApproach: string
  nextSteps: string[]
  ownerNote: string | null
}

export function currentApprovedStrategyForAds(
  rows: StoredRecruitStrategy[],
  currentFingerprint: string,
): StoredRecruitStrategy | null {
  const approved = rows.find((row) => row.status === "approved") ?? null
  if (!approved) return null
  if (approved.sourceFingerprint !== currentFingerprint) return null
  return approved
}

export function recruitmentStrategyHandoffFromApproved(
  companyId: string,
  strategy: StoredRecruitStrategy,
  currentFingerprint: string,
): RecruitmentStrategyHandoff | null {
  if (strategy.status !== "approved") return null
  if (strategy.sourceFingerprint !== currentFingerprint) return null
  if (!strategy.approvedAt || !strategy.approvedBy) return null
  const effective = applyRecruitDecisions(strategy.recommended, strategy.decisions, strategy.warnings)
  return {
    companyId,
    strategyId: strategy.id,
    version: strategy.version,
    approvedAt: strategy.approvedAt,
    approvedBy: strategy.approvedBy,
    reason: strategy.recommended.why.reason,
    hiringTarget: effective.hiringTarget,
    hireProfile: effective.hireProfile,
    candidate: {
      required: effective.profile.required.map((item) => item.text),
      preferred: effective.profile.preferred.map((item) => item.text),
      values: effective.profile.values,
    },
    employment: {
      arrangement: effective.employment.arrangement,
      compensation: effective.employment.compensation,
    },
    channels: effective.channels.filter((row) => row.recommended).map((row) => row.id),
    budgetApproach: effective.budget.approach,
    nextSteps: effective.nextSteps.map((step) => step.text),
    ownerNote: strategy.decisions.note ?? strategy.inputs.note,
  }
}
