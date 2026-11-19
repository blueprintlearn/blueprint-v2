/**
 * Deterministic growth-plan content from Stage 2.3A analysis.
 *
 * This module does not invent hiring targets, advertising budgets, candidate
 * availability, market research, deadlines, or revenue projections. Missing
 * essentials stay unavailable.
 */

import {
  GROWTH_KIND_LABELS,
  type GrowthEngineResult,
  type GrowthRecommendationKind,
  type TrainingAvailability,
} from "@/lib/blueprint/growth-engine"
import type { Calculation, CalculationStatus } from "@/lib/blueprint/staffing-engine"

export const HIRE_PROFILES = ["beginner", "experienced", "unspecified"] as const
export type HireProfile = (typeof HIRE_PROFILES)[number]

export const GROWTH_PLAN_STANCES = ["accept", "modify", "reject"] as const
export type GrowthPlanStance = (typeof GROWTH_PLAN_STANCES)[number]

export const GROWTH_PLAN_ROW_STATUSES = ["draft", "approved", "needs_review", "superseded"] as const
export type GrowthPlanRowStatus = (typeof GROWTH_PLAN_ROW_STATUSES)[number]

export const HIRE_PROFILE_LABELS: Record<HireProfile, string> = {
  beginner: "Beginner DJs you can train",
  experienced: "Experienced DJs who can lead sooner",
  unspecified: "Not specified yet",
}

export type PlanFactStatus = CalculationStatus

export type PlanCount = {
  status: PlanFactStatus
  value: number | null
  explanation: string
  missing: string[]
}

export type PlanStep = {
  text: string
  source: "recommendation" | "owner"
}

export type GrowthPlanContent = {
  summary: {
    staffing: string
    demand: string
    training: string
    primaryObstacle: {
      kind: GrowthRecommendationKind | null
      label: string
      explanation: string
      status: PlanFactStatus
    }
  }
  hiring: {
    recommendedTarget: PlanCount
    recommendedProfile: HireProfile | null
    explanation: string
  }
  recruiting: {
    kind: GrowthRecommendationKind | null
    approach: string
    notes: string[]
  }
  training: {
    canSupportBeginners: boolean | null
    limitations: string
    preparation: string
  }
  nextSteps: PlanStep[]
}

export type GrowthPlanDecisions = {
  stance: GrowthPlanStance
  hiringTarget: number | null
  hireProfile: HireProfile | null
  recruitingKind: GrowthRecommendationKind | null
  note: string | null
}

export type GrowthPlanWarning = {
  title: string
  explanation: string
}

export type EffectiveGrowthPlan = {
  hiringTarget: PlanCount
  hireProfile: HireProfile | null
  recruitingKind: GrowthRecommendationKind | null
  recruitingApproach: string
  training: GrowthPlanContent["training"]
  nextSteps: PlanStep[]
  acceptedRecommendations: boolean
  rejectedRecommendations: boolean
  modifications: string[]
  warnings: GrowthPlanWarning[]
}

const missingCount = (explanation: string, gaps: string[]): PlanCount => ({
  status: "unavailable",
  value: null,
  explanation,
  missing: gaps,
})

function usableCapacity(typical: number | null): typical is number {
  return typical !== null && Number.isInteger(typical) && typical > 0
}

export function recommendedHiringTarget(
  recommendation: GrowthEngineResult["recommendation"],
  capacityGap: Calculation<number>,
  typicalLeadCapacity: number | null,
  typicalEstimated: boolean,
): PlanCount {
  if (recommendation.status === "unavailable" || recommendation.value === null) {
    return missingCount(
      "A hiring target is not available until Blueprint has enough information for a next step. Missing numbers are not filled in.",
      recommendation.missing.length > 0 ? recommendation.missing : ["A supported next step"],
    )
  }
  if (recommendation.value === "demand" || recommendation.value === "utilize" || recommendation.value === "train") {
    return {
      status: recommendation.status === "estimated" ? "estimated" : "calculated",
      value: 0,
      explanation:
        recommendation.value === "train"
          ? "Training capacity is the first constraint, so the recommended hiring target is 0 DJs until training can absorb new people."
          : "Hiring is not the first constraint, so the recommended hiring target is 0 DJs.",
      missing: [],
    }
  }
  if (capacityGap.status === "unavailable" || capacityGap.value === null) {
    return missingCount(
      "A hiring target needs the capacity gap, which is not calculated yet.",
      capacityGap.missing.length > 0 ? capacityGap.missing : ["Capacity gap"],
    )
  }
  if (capacityGap.value <= 0) {
    return {
      status: capacityGap.status === "estimated" || typicalEstimated ? "estimated" : "calculated",
      value: 0,
      explanation: "Existing lead capacity covers the booking target, so the recommended hiring target is 0 DJs.",
      missing: [],
    }
  }
  if (!usableCapacity(typicalLeadCapacity)) {
    return missingCount(
      "A hiring target needs each lead DJ’s typical annual capacity. Blueprint does not assume 20, 30, or 40 events.",
      ["Typical lead-DJ annual capacity above 0"],
    )
  }
  const value = Math.ceil(capacityGap.value / typicalLeadCapacity)
  return {
    status: capacityGap.status === "estimated" || typicalEstimated || recommendation.status === "estimated" ? "estimated" : "calculated",
    value,
    explanation: `Hiring target = ceil(capacity gap ÷ typical lead-DJ annual capacity) = ceil(${capacityGap.value} ÷ ${typicalLeadCapacity}) = ${value}. This is a planning number, not a job posting.`,
    missing: [],
  }
}

export function recommendedHireProfile(kind: GrowthRecommendationKind | null): HireProfile | null {
  if (kind === "beginner") return "beginner"
  if (kind === "experienced") return "experienced"
  if (kind === "recruit") return "unspecified"
  if (kind === "demand" || kind === "utilize" || kind === "train") return "unspecified"
  return null
}

function recruitingCopy(
  kind: GrowthRecommendationKind | null,
  training: TrainingAvailability | null,
  urgent: boolean,
): { approach: string; notes: string[] } {
  if (kind === null) {
    return {
      approach: "A recruiting direction is not available until the next step is known. Blueprint will not invent where to advertise, what to spend, or who is available to hire.",
      notes: ["No advertising budget, candidate-availability, or market research was used."],
    }
  }
  const notes = ["No advertising budget, candidate-availability, or market research was used."]
  if (urgent) notes.push("Onboarding recorded a timeline of within 6 months.")
  if (training === "yes") notes.push("You said you can train new DJs in the next 12 months.")
  if (training === "limited") notes.push("You said training capacity is limited in the next 12 months.")
  if (training === "no") notes.push("You said you cannot train new DJs in the next 12 months.")

  if (kind === "demand") {
    return {
      approach: "Focus on booking demand before recruiting. A job post would add people the current target does not yet need.",
      notes,
    }
  }
  if (kind === "utilize") {
    return {
      approach: "Fill the calendars of DJs you already have before recruiting. Spare lead capacity can cover the target.",
      notes,
    }
  }
  if (kind === "train") {
    return {
      approach: "Build training capacity before recruiting beginners. Posting jobs now would put new people into a training system that cannot absorb them.",
      notes,
    }
  }
  if (kind === "beginner") {
    return {
      approach: "Recruit people you can train. Training is available in the next 12 months, so beginners can be the hiring path.",
      notes,
    }
  }
  if (kind === "experienced") {
    return {
      approach: urgent
        ? "Recruit experienced DJs who can lead sooner. The timeline is short, and training is not enough to take beginners first."
        : "Recruit experienced DJs who can lead sooner, rather than building a beginner pipeline first.",
      notes,
    }
  }
  return {
    approach: "Recruit additional DJs to cover the capacity gap. Beginner versus experienced is not chosen yet.",
    notes,
  }
}

function trainingCopy(training: TrainingAvailability | null): GrowthPlanContent["training"] {
  if (training === "yes") {
    return {
      canSupportBeginners: true,
      limitations: "You said you can train new DJs in the next 12 months. That is a forward-looking answer, not a course catalog.",
      preparation: "Keep a trainer and a first-event path ready before beginners start. Blueprint has not generated training courses.",
    }
  }
  if (training === "limited") {
    return {
      canSupportBeginners: false,
      limitations: "Training time or people are limited in the next 12 months, so beginners would compete for scarce trainer attention.",
      preparation: "Increase training capacity, or hire people who already lead, before recruiting beginners.",
    }
  }
  if (training === "no") {
    return {
      canSupportBeginners: false,
      limitations: "You said you cannot train new DJs in the next 12 months.",
      preparation: "Do not recruit beginners until training exists, or hire experienced DJs if you still need capacity.",
    }
  }
  return {
    canSupportBeginners: null,
    limitations: "Forward-looking training availability was not provided, so Blueprint will not say you can support beginners.",
    preparation: "Answer whether you can train in the next 12 months before treating beginners as a hiring path.",
  }
}

function nextStepsFor(kind: GrowthRecommendationKind | null, hiring: PlanCount, training: TrainingAvailability | null): PlanStep[] {
  if (kind === null) {
    return [
      { text: "Finish the growth-planning questions that are still missing.", source: "recommendation" },
      { text: "Do not treat an unknown as a hiring target.", source: "recommendation" },
    ]
  }
  if (kind === "demand") {
    return [
      { text: "Increase booking demand before hiring.", source: "recommendation" },
      { text: "Keep the recommended hiring target at 0 DJs until the target needs more people.", source: "recommendation" },
      { text: "Revisit this plan after demand is confirmed. Recruiting is not started from this page.", source: "recommendation" },
    ]
  }
  if (kind === "utilize") {
    return [
      { text: "Use existing lead DJs more fully before recruiting.", source: "recommendation" },
      { text: "Keep the recommended hiring target at 0 DJs while spare capacity covers the target.", source: "recommendation" },
    ]
  }
  if (kind === "train") {
    return [
      { text: "Build training capacity before recruiting beginners.", source: "recommendation" },
      { text: "Do not post jobs for beginners until training can absorb them.", source: "recommendation" },
    ]
  }
  const hireText =
    hiring.value === null
      ? "A hiring number is not available yet, so do not invent one."
      : hiring.value === 0
        ? "The recommended hiring target is 0 DJs."
        : `Plan for ${hiring.value} additional ${hiring.value === 1 ? "DJ" : "DJs"} if you accept this recommendation.`
  if (kind === "beginner") {
    return [
      { text: hireText, source: "recommendation" },
      { text: "Recruit beginners you can train, not only experienced leads.", source: "recommendation" },
      { text: training === "yes" ? "Confirm who will train them before recruiting starts." : "Confirm training capacity before recruiting beginners.", source: "recommendation" },
    ]
  }
  if (kind === "experienced") {
    return [
      { text: hireText, source: "recommendation" },
      { text: "Recruit experienced DJs who can lead sooner.", source: "recommendation" },
      { text: "Do not wait on a beginner training program for this capacity gap.", source: "recommendation" },
    ]
  }
  return [
    { text: hireText, source: "recommendation" },
    { text: "Recruit additional DJs to cover the capacity gap.", source: "recommendation" },
    { text: "Choose beginners versus experienced DJs once training availability is known.", source: "recommendation" },
  ]
}

export function composeRecommendedGrowthPlan(input: {
  analysis: GrowthEngineResult
  capacityGap: Calculation<number>
  typicalLeadCapacity: number | null
  typicalEstimated: boolean
  training: TrainingAvailability | null
  urgent: boolean
}): GrowthPlanContent {
  const { analysis, capacityGap, typicalLeadCapacity, typicalEstimated, training, urgent } = input
  const kind = analysis.recommendation.value
  const hiring = recommendedHiringTarget(analysis.recommendation, capacityGap, typicalLeadCapacity, typicalEstimated)
  const recruiting = recruitingCopy(kind, training, urgent)
  const trainingSection = trainingCopy(training)
  return {
    summary: {
      staffing: analysis.areas.staffing,
      demand: analysis.areas.demand,
      training: analysis.areas.training,
      primaryObstacle: {
        kind,
        label: kind ? GROWTH_KIND_LABELS[kind] : "Not available yet",
        explanation: analysis.recommendation.explanation,
        status: analysis.recommendation.status,
      },
    },
    hiring: {
      recommendedTarget: hiring,
      recommendedProfile: recommendedHireProfile(kind),
      explanation: analysis.recommendation.explanation,
    },
    recruiting: {
      kind,
      approach: recruiting.approach,
      notes: recruiting.notes,
    },
    training: trainingSection,
    nextSteps: nextStepsFor(kind, hiring, training),
  }
}

export function emptyDecisions(): GrowthPlanDecisions {
  return {
    stance: "accept",
    hiringTarget: null,
    hireProfile: null,
    recruitingKind: null,
    note: null,
  }
}

export function applyOwnerDecisions(
  recommended: GrowthPlanContent,
  decisions: GrowthPlanDecisions,
  analysisWarnings: GrowthPlanWarning[],
): EffectiveGrowthPlan {
  const rejected = decisions.stance === "reject"
  const modified = decisions.stance === "modify"
  const accepted = decisions.stance === "accept"
  const modifications: string[] = []
  const warnings: GrowthPlanWarning[] = []
  const addWarning = (warning: GrowthPlanWarning) => {
    if (warnings.some((row) => row.title === warning.title)) return
    warnings.push(warning)
  }
  for (const warning of analysisWarnings) addWarning(warning)

  let hiringTarget = recommended.hiring.recommendedTarget
  let hireProfile = recommended.hiring.recommendedProfile
  let recruitingKind = recommended.recruiting.kind
  let recruitingApproach = recommended.recruiting.approach
  let nextSteps = recommended.nextSteps.map((step) => ({ ...step }))

  if (modified) {
    if (decisions.hiringTarget !== null && decisions.hiringTarget !== recommended.hiring.recommendedTarget.value) {
      hiringTarget = {
        status: recommended.hiring.recommendedTarget.status === "unavailable" ? "unavailable" : recommended.hiring.recommendedTarget.status,
        value: decisions.hiringTarget,
        explanation: `You set the hiring target to ${decisions.hiringTarget}. The recommended number was ${
          recommended.hiring.recommendedTarget.value === null
            ? "not available"
            : String(recommended.hiring.recommendedTarget.value)
        }.`,
        missing: recommended.hiring.recommendedTarget.missing,
      }
      if (recommended.hiring.recommendedTarget.status === "unavailable") {
        hiringTarget = {
          status: "unavailable",
          value: decisions.hiringTarget,
          explanation: `You set the hiring target to ${decisions.hiringTarget}. Blueprint still does not have enough information to recommend a number, so this remains an owner decision, not a calculated target.`,
          missing: recommended.hiring.recommendedTarget.missing,
        }
      }
      modifications.push(
        `Hiring target changed from ${
          recommended.hiring.recommendedTarget.value === null ? "unavailable" : String(recommended.hiring.recommendedTarget.value)
        } to ${decisions.hiringTarget}.`,
      )
    } else if (decisions.hiringTarget !== null) {
      hiringTarget = {
        ...recommended.hiring.recommendedTarget,
        value: decisions.hiringTarget,
      }
    }
    if (decisions.hireProfile && decisions.hireProfile !== recommended.hiring.recommendedProfile) {
      hireProfile = decisions.hireProfile
      modifications.push(
        `Hire profile changed from ${
          recommended.hiring.recommendedProfile ? HIRE_PROFILE_LABELS[recommended.hiring.recommendedProfile] : "unavailable"
        } to ${HIRE_PROFILE_LABELS[decisions.hireProfile]}.`,
      )
    } else if (decisions.hireProfile) {
      hireProfile = decisions.hireProfile
    }
    if (decisions.recruitingKind && decisions.recruitingKind !== recommended.recruiting.kind) {
      recruitingKind = decisions.recruitingKind
      recruitingApproach = recruitingCopy(decisions.recruitingKind, null, false).approach
      modifications.push(
        `Recruiting direction changed from ${
          recommended.recruiting.kind ? GROWTH_KIND_LABELS[recommended.recruiting.kind] : "unavailable"
        } to ${GROWTH_KIND_LABELS[decisions.recruitingKind]}.`,
      )
    } else if (decisions.recruitingKind) {
      recruitingKind = decisions.recruitingKind
    }
    if (decisions.note) {
      nextSteps = [...nextSteps, { text: `Your note: ${decisions.note}`, source: "owner" }]
    }
  }

  if (rejected) {
    modifications.push("You rejected Blueprint’s recommendation. Saved goals were not changed.")
    nextSteps = [
      { text: "You rejected this recommendation. Blueprint will not treat it as the current recruiting plan.", source: "owner" },
      ...(decisions.note ? [{ text: `Your note: ${decisions.note}`, source: "owner" as const }] : []),
    ]
  }

  if (modified && hiringTarget.value !== null && hiringTarget.value > 0) {
    const rec = recommended.summary.primaryObstacle.kind
    if (rec === "demand" || rec === "utilize" || rec === "train") {
      addWarning({
        title: "Your hiring target conflicts with the analysis",
        explanation:
          rec === "train"
            ? "You want to hire, and the analysis says training capacity is the first constraint. This warning does not block you, and it does not change saved goals."
            : "You want to hire, and the analysis says demand or utilization is the first constraint. This warning does not block you, and it does not change saved goals.",
      })
    }
    if (recommended.hiring.recommendedTarget.status === "unavailable") {
      addWarning({
        title: "The hiring number is an owner decision, not a calculated target",
        explanation:
          "Essential planning numbers are still missing, so Blueprint cannot confirm this hiring target. This warning does not block approval.",
      })
    }
  }

  if (modified && hireProfile === "beginner" && recommended.training.canSupportBeginners === false) {
    addWarning({
      title: "Beginners may not have enough training support",
      explanation: recommended.training.limitations,
    })
  }

  return {
    hiringTarget,
    hireProfile,
    recruitingKind,
    recruitingApproach,
    training: recommended.training,
    nextSteps,
    acceptedRecommendations: accepted,
    rejectedRecommendations: rejected,
    modifications,
    warnings,
  }
}
