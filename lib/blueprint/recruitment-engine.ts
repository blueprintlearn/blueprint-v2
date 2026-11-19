/**
 * Deterministic recruitment-strategy content from Stage 1 answers, optional
 * current growth-plan handoff, and owner recruiting inputs.
 *
 * Does not invent compensation, labor classifications, staffing counts, local
 * market pricing, or applicant volume. Missing essentials stay unavailable.
 * Does not launch ads or contact candidates.
 */

import {
  ARRANGEMENT_OPTIONS,
  AVAILABILITY_OPTIONS,
  QUALITY_OPTIONS,
  SKILL_OPTIONS,
  TRAVEL_OPTIONS,
  type ArrangementCode,
  type AvailabilityCode,
  type BeginnerCode,
  type CoreValuesValue,
  type HiringWeightCode,
  type QualityCode,
  type SkillRatingsValue,
  type TravelCode,
} from "@/lib/blueprint/ideal-dj"
import type { HireProfile } from "@/lib/blueprint/growth-plan-engine"
import type { RecruitmentHandoff } from "@/lib/blueprint/recruitment-handoff"
import type { TrainingAvailability } from "@/lib/blueprint/growth-engine"

export const RECRUIT_REASONS = ["growth", "replacement", "capacity"] as const
export type RecruitReason = (typeof RECRUIT_REASONS)[number]

export const RECRUIT_PROFILES = ["beginner", "experienced", "either"] as const
export type RecruitProfile = (typeof RECRUIT_PROFILES)[number]

export const RECRUIT_URGENCIES = ["immediate", "soon", "flexible"] as const
export type RecruitUrgency = (typeof RECRUIT_URGENCIES)[number]

export const RECRUIT_EMPLOYMENT = ["w2", "1099", "either", "unsure"] as const
export type RecruitEmployment = (typeof RECRUIT_EMPLOYMENT)[number]

export const RECRUIT_TRAINING = ["yes", "limited", "no", "unsure"] as const
export type RecruitTraining = (typeof RECRUIT_TRAINING)[number]

export const RECRUIT_CHANNELS = ["referrals", "company_page", "indeed", "social"] as const
export type RecruitChannelId = (typeof RECRUIT_CHANNELS)[number]

export const RECRUIT_STANCES = ["accept", "modify"] as const
export type RecruitStance = (typeof RECRUIT_STANCES)[number]

export const RECRUIT_ROW_STATUSES = ["draft", "approved", "needs_review", "superseded"] as const
export type RecruitRowStatus = (typeof RECRUIT_ROW_STATUSES)[number]

export const RECRUIT_REASON_LABELS: Record<RecruitReason, string> = {
  growth: "Growth: we need additional DJs",
  replacement: "Replacement: someone left or is leaving",
  capacity: "Capacity or reliability: we need better coverage",
}

export const RECRUIT_PROFILE_LABELS: Record<RecruitProfile, string> = {
  beginner: "Beginner DJs you can train",
  experienced: "Experienced DJs who can lead sooner",
  either: "Beginner or experienced",
}

export const RECRUIT_URGENCY_LABELS: Record<RecruitUrgency, string> = {
  immediate: "As soon as possible",
  soon: "In the next 1–3 months",
  flexible: "Flexible timing",
}

export const RECRUIT_EMPLOYMENT_LABELS: Record<RecruitEmployment, string> = {
  w2: "W-2 employees",
  "1099": "1099 contractors",
  either: "W-2 or 1099, depending on the person",
  unsure: "Not sure yet",
}

export const RECRUIT_TRAINING_LABELS: Record<RecruitTraining, string> = {
  yes: "We can train new DJs",
  limited: "Training time or people are limited",
  no: "We cannot train in the next 12 months",
  unsure: "Not sure yet",
}

export const RECRUIT_CHANNEL_LABELS: Record<RecruitChannelId, string> = {
  referrals: "Referrals from people you already know",
  company_page: "A company recruiting page",
  indeed: "Indeed",
  social: "Social media",
}

export const NOTE_MAX = 400
export const TEXT_MAX = 400

export type CompensationInput =
  | { kind: "not_provided" }
  | { kind: "hourly"; amount: number }
  | { kind: "per_event"; amount: number }
  | { kind: "salary"; amount: number }
  | { kind: "range"; min: number; max: number }

export type BudgetInput =
  | { kind: "none" }
  | { kind: "limited" }
  | { kind: "set"; amount: number }
  | { kind: "unsure" }

export type RecruitInputs = {
  reason: RecruitReason | null
  useGrowthPlan: boolean
  hiringTarget: number | null
  hireProfile: RecruitProfile | null
  responsibilities: string | null
  availability: AvailabilityCode[] | null
  travel: TravelCode | null
  employment: RecruitEmployment | null
  compensation: CompensationInput
  urgency: RecruitUrgency | null
  training: RecruitTraining | null
  budget: BudgetInput
  note: string | null
}

export type RecruitDecisions = {
  stance: RecruitStance
  hiringTarget: number | null
  hireProfile: RecruitProfile | null
  channels: RecruitChannelId[] | null
  note: string | null
}

export type RecruitWarning = {
  title: string
  explanation: string
}

export type ProfileItem = {
  text: string
  source: "stage1" | "owner" | "recommendation"
  required: boolean
}

export type ValueInterview = {
  value: string
  behavior: string
  interviewQuestion: string
}

export type ChannelAdvice = {
  id: RecruitChannelId
  label: string
  recommended: boolean
  why: string
}

export type RecruitStrategyContent = {
  why: { reason: RecruitReason | null; explanation: string }
  hiring: {
    target: number | null
    profile: RecruitProfile | null
    status: "from_growth_plan" | "owner" | "unavailable"
    explanation: string
  }
  profile: {
    required: ProfileItem[]
    preferred: ProfileItem[]
    values: ValueInterview[]
  }
  employment: {
    arrangement: RecruitEmployment | null
    compensation: string
    explanation: string
  }
  channels: ChannelAdvice[]
  budget: { approach: string; estimated: boolean }
  nextSteps: { text: string; source: "recommendation" | "owner" }[]
}

export type EffectiveRecruitStrategy = {
  hiringTarget: number | null
  hireProfile: RecruitProfile | null
  channels: ChannelAdvice[]
  profile: RecruitStrategyContent["profile"]
  employment: RecruitStrategyContent["employment"]
  budget: RecruitStrategyContent["budget"]
  nextSteps: { text: string; source: "recommendation" | "owner" }[]
  modifications: string[]
  warnings: RecruitWarning[]
}

export type Stage1RecruitFacts = {
  priorities: QualityCode[] | null
  values: CoreValuesValue | null
  skills: SkillRatingsValue | null
  beginner: BeginnerCode | null
  hiringWeight: HiringWeightCode | null
  availability: AvailabilityCode[] | null
  travel: TravelCode | null
  arrangement: ArrangementCode | null
}

export function emptyRecruitInputs(): RecruitInputs {
  return {
    reason: null,
    useGrowthPlan: false,
    hiringTarget: null,
    hireProfile: null,
    responsibilities: null,
    availability: null,
    travel: null,
    employment: null,
    compensation: { kind: "not_provided" },
    urgency: null,
    training: null,
    budget: { kind: "unsure" },
    note: null,
  }
}

export function emptyRecruitDecisions(): RecruitDecisions {
  return { stance: "accept", hiringTarget: null, hireProfile: null, channels: null, note: null }
}

export function profileFromGrowth(profile: HireProfile | null): RecruitProfile | null {
  if (profile === "beginner") return "beginner"
  if (profile === "experienced") return "experienced"
  if (profile === "unspecified") return "either"
  return null
}

export function employmentFromArrangement(code: ArrangementCode | null): RecruitEmployment | null {
  if (code === "employees") return "w2"
  if (code === "contractors") return "1099"
  if (code === "both") return "either"
  if (code === "not_sure") return "unsure"
  return null
}

export function trainingFromGrowth(value: TrainingAvailability | null): RecruitTraining | null {
  if (value === "yes" || value === "limited" || value === "no") return value
  return null
}

function compensationCopy(compensation: CompensationInput): string {
  if (compensation.kind === "hourly") return `$${compensation.amount} per hour (owner-provided)`
  if (compensation.kind === "per_event") return `$${compensation.amount} per event (owner-provided)`
  if (compensation.kind === "salary") return `$${compensation.amount} per year (owner-provided)`
  if (compensation.kind === "range") return `$${compensation.min}–$${compensation.max} (owner-provided range)`
  return "Not provided. Blueprint will not invent a rate or local market price."
}

function reasonCopy(reason: RecruitReason | null): string {
  if (reason === "growth") return "You are recruiting because the company needs additional DJs."
  if (reason === "replacement") return "You are recruiting to replace someone who left or is leaving."
  if (reason === "capacity") return "You are recruiting for better coverage or more dependable staffing."
  return "Choose why you are recruiting before Blueprint recommends a hiring number."
}

function valueInterviews(values: CoreValuesValue | null): ValueInterview[] {
  if (!values || !values.defined) return []
  return values.values.map((value) => ({
    value,
    behavior: `Show “${value}” in how you prepare, communicate, and run events.`,
    interviewQuestion: `Tell me about a time you demonstrated “${value}” at a gig or similar job.`,
  }))
}

function profileFromFacts(
  facts: Stage1RecruitFacts,
  inputs: RecruitInputs,
): RecruitStrategyContent["profile"] {
  const required: ProfileItem[] = []
  const preferred: ProfileItem[] = []
  const availability = inputs.availability ?? facts.availability
  if (availability && availability.length > 0) {
    const labels = availability
      .map((code) => AVAILABILITY_OPTIONS.find((row) => row.value === code)?.label)
      .filter((label): label is string => Boolean(label))
    if (labels.length > 0) {
      required.push({
        text: `Available for typical event times: ${labels.join(", ")}.`,
        source: inputs.availability ? "owner" : "stage1",
        required: true,
      })
    }
  }
  const travel = inputs.travel ?? facts.travel
  if (travel) {
    const label = TRAVEL_OPTIONS.find((row) => row.value === travel)?.label
    if (label) {
      required.push({
        text: `Able to reach event locations: ${label}.`,
        source: inputs.travel ? "owner" : "stage1",
        required: true,
      })
    }
  }
  if (inputs.responsibilities) {
    required.push({
      text: inputs.responsibilities,
      source: "owner",
      required: true,
    })
  } else {
    required.push({
      text: "Run events to the company’s standard. Specific duties were not provided yet.",
      source: "recommendation",
      required: true,
    })
  }
  if (facts.skills) {
    for (const skill of SKILL_OPTIONS) {
      const rating = facts.skills[skill.value]
      if (rating === "must_have") {
        required.push({
          text: `${skill.label} is required for this role.`,
          source: "stage1",
          required: true,
        })
      } else if (rating === "can_teach") {
        preferred.push({
          text: `${skill.label} can be taught.`,
          source: "stage1",
          required: false,
        })
      }
    }
  }
  if (facts.priorities) {
    for (const code of facts.priorities) {
      const label = QUALITY_OPTIONS.find((row) => row.value === code)?.label
      if (label) {
        preferred.push({
          text: `${label} is a hiring priority.`,
          source: "stage1",
          required: false,
        })
      }
    }
  }
  return {
    required,
    preferred,
    values: valueInterviews(facts.values),
  }
}

function channelAdvice(input: {
  reason: RecruitReason | null
  target: number | null
  profile: RecruitProfile | null
  urgency: RecruitUrgency | null
  budget: BudgetInput
  training: RecruitTraining | null
}): ChannelAdvice[] {
  const paidOk = input.budget.kind === "set"
  const needVolume = (input.target ?? 0) >= 2 || input.urgency === "immediate" || input.profile === "experienced"
  const characterFirst = input.profile === "beginner" || input.training === "yes"
  return [
    {
      id: "referrals",
      label: RECRUIT_CHANNEL_LABELS.referrals,
      recommended: true,
      why: "People you already trust can vouch for reliability. This does not require an advertising budget.",
    },
    {
      id: "company_page",
      label: RECRUIT_CHANNEL_LABELS.company_page,
      recommended: true,
      why: "A company page you control can state the role clearly. Stage 3.1 does not publish that page.",
    },
    {
      id: "indeed",
      label: RECRUIT_CHANNEL_LABELS.indeed,
      recommended: needVolume,
      why: needVolume
        ? "A public listing can reach people you do not already know when the need is larger, sooner, or for experienced DJs. Blueprint does not launch the listing."
        : "A paid listing is optional while referrals and a company page can cover a small, flexible search.",
    },
    {
      id: "social",
      label: RECRUIT_CHANNEL_LABELS.social,
      recommended: characterFirst || !paidOk,
      why: characterFirst
        ? "Social posts can describe the culture and training path without claiming a paid campaign will fill seats."
        : "Social posts are a low-cost way to share the role. They are not launched from this page.",
    },
  ]
}

function budgetCopy(budget: BudgetInput): { approach: string; estimated: boolean } {
  if (budget.kind === "none") {
    return {
      approach:
        "No advertising spend. Start with referrals and a company page. Blueprint will not invent a local ad price.",
      estimated: false,
    }
  }
  if (budget.kind === "limited") {
    return {
      approach:
        "Keep spend limited. Use unpaid channels first. Blueprint does not claim a specific budget will produce applicants.",
      estimated: false,
    }
  }
  if (budget.kind === "set") {
    return {
      approach: `You set $${budget.amount} as a recruiting budget. That is your number, not a market quote, and it does not guarantee applicants.`,
      estimated: false,
    }
  }
  return {
    approach: "A recruiting budget was not provided. Unpaid channels come first. No local market price was invented.",
    estimated: false,
  }
}

function nextSteps(content: {
  reason: RecruitReason | null
  target: number | null
  profile: RecruitProfile | null
  channels: ChannelAdvice[]
  compensationMissing: boolean
}): { text: string; source: "recommendation" | "owner" }[] {
  const steps: { text: string; source: "recommendation" | "owner" }[] = []
  if (!content.reason) {
    steps.push({ text: "Choose why you are recruiting.", source: "recommendation" })
  }
  if (content.target === null) {
    steps.push({ text: "Enter a whole number of people to recruit. Blueprint will not invent a headcount.", source: "recommendation" })
  } else {
    steps.push({
      text: `Recruit ${content.target} ${content.target === 1 ? "person" : "people"}${
        content.profile ? ` (${RECRUIT_PROFILE_LABELS[content.profile]})` : ""
      }.`,
      source: "recommendation",
    })
  }
  if (content.compensationMissing) {
    steps.push({
      text: "Add compensation when you know it. Blueprint will not invent a rate.",
      source: "recommendation",
    })
  }
  const recommended = content.channels.filter((row) => row.recommended)
  if (recommended.length > 0) {
    steps.push({
      text: `Start with ${recommended.map((row) => row.label).join(", ")}. Nothing is posted from this page.`,
      source: "recommendation",
    })
  }
  steps.push({
    text: "Approve this strategy before Stage 3.2 can turn it into job ads or a landing page.",
    source: "recommendation",
  })
  return steps
}

export function composeRecruitStrategy(input: {
  facts: Stage1RecruitFacts
  growth: RecruitmentHandoff | null
  inputs: RecruitInputs
}): { recommended: RecruitStrategyContent; warnings: RecruitWarning[] } {
  const { facts, growth, inputs } = input
  const warnings: RecruitWarning[] = []
  const usedGrowth = Boolean(inputs.useGrowthPlan && growth)
  if (inputs.useGrowthPlan && !growth) {
    warnings.push({
      title: "The approved growth plan is not current",
      explanation:
        "A stale or missing growth plan is not used as a recruiting recommendation. Continue with the numbers you enter here.",
    })
  }
  if (inputs.reason === "replacement" && usedGrowth) {
    warnings.push({
      title: "Growth-plan hiring is for additional DJs",
      explanation:
        "Replacement hiring may not match the growth-plan number. Enter how many people you need to replace.",
    })
  }

  let target = inputs.hiringTarget
  let profile = inputs.hireProfile
  let status: RecruitStrategyContent["hiring"]["status"] = "owner"
  let hiringExplanation = "You set the hiring need for this recruiting effort."

  if (usedGrowth && growth) {
    if (target === null) target = growth.hiringTarget.count
    if (!profile) profile = profileFromGrowth(growth.hireProfile)
    status = inputs.hiringTarget !== null ? "owner" : "from_growth_plan"
    hiringExplanation =
      status === "from_growth_plan"
        ? `From approved growth plan version ${growth.version}. ${growth.hiringTarget.explanation}`
        : `You set the hiring number. The current growth plan recommended ${
            growth.hiringTarget.count === null ? "no number" : String(growth.hiringTarget.count)
          }.`
  }

  if (target === null) {
    status = "unavailable"
    hiringExplanation = usedGrowth
      ? "The growth plan did not include a hiring number, and you have not entered one. Blueprint will not invent a headcount."
      : "Enter how many people to recruit. Blueprint will not invent a staffing requirement."
  }

  const training: RecruitTraining | null =
    inputs.training ??
    (usedGrowth && growth
      ? growth.training.canSupportBeginners === true
        ? "yes"
        : growth.training.canSupportBeginners === false
          ? "no"
          : null
      : null)

  if (!profile && facts.beginner === "no") profile = "experienced"
  if (!profile && (facts.beginner === "yes" || facts.beginner === "yes_personality")) profile = "beginner"

  if (profile === "beginner" && (training === "no" || facts.beginner === "no")) {
    warnings.push({
      title: "Beginners may not match training or experience rules",
      explanation:
        "You selected beginners, and either training is unavailable or onboarding said you would not hire people with no DJ experience. This warning does not block you.",
    })
  }

  if (!inputs.employment && !facts.arrangement) {
    warnings.push({
      title: "Employment arrangement is not set",
      explanation:
        "Choose W-2 or 1099 when you know it. This page does not classify anyone as an employee or contractor.",
    })
  }

  const employment = inputs.employment ?? employmentFromArrangement(facts.arrangement)
  const arrangementLabel = facts.arrangement
    ? ARRANGEMENT_OPTIONS.find((row) => row.value === facts.arrangement)?.label
    : null
  const employmentExplanation = inputs.employment
    ? `${RECRUIT_EMPLOYMENT_LABELS[inputs.employment]}. This is your recruiting preference, not a legal classification.`
    : arrangementLabel
      ? `Onboarding recorded a working-arrangement preference of ${arrangementLabel}. Confirm W-2 or 1099 before treating it as the job offer. This is not legal advice.`
      : "Employment arrangement is not set. Blueprint will not invent a labor classification."

  const channels = channelAdvice({
    reason: inputs.reason,
    target,
    profile,
    urgency: inputs.urgency,
    budget: inputs.budget,
    training,
  })
  const recommended: RecruitStrategyContent = {
    why: { reason: inputs.reason, explanation: reasonCopy(inputs.reason) },
    hiring: {
      target,
      profile,
      status,
      explanation: hiringExplanation,
    },
    profile: profileFromFacts(facts, inputs),
    employment: {
      arrangement: employment,
      compensation: compensationCopy(inputs.compensation),
      explanation: employmentExplanation,
    },
    channels,
    budget: budgetCopy(inputs.budget),
    nextSteps: nextSteps({
      reason: inputs.reason,
      target,
      profile,
      channels,
      compensationMissing: inputs.compensation.kind === "not_provided",
    }),
  }
  return { recommended, warnings }
}

export function applyRecruitDecisions(
  recommended: RecruitStrategyContent,
  decisions: RecruitDecisions,
  analysisWarnings: RecruitWarning[],
): EffectiveRecruitStrategy {
  const warnings: RecruitWarning[] = []
  const addWarning = (warning: RecruitWarning) => {
    if (warnings.some((row) => row.title === warning.title)) return
    warnings.push(warning)
  }
  for (const warning of analysisWarnings) addWarning(warning)

  const modifications: string[] = []
  let hiringTarget = recommended.hiring.target
  let hireProfile = recommended.hiring.profile
  let channels = recommended.channels.map((row) => ({ ...row }))

  if (decisions.stance === "modify") {
    if (decisions.hiringTarget !== null && decisions.hiringTarget !== recommended.hiring.target) {
      modifications.push(
        `Hiring target changed from ${
          recommended.hiring.target === null ? "unavailable" : String(recommended.hiring.target)
        } to ${decisions.hiringTarget}.`,
      )
      hiringTarget = decisions.hiringTarget
    } else if (decisions.hiringTarget !== null) {
      hiringTarget = decisions.hiringTarget
    }
    if (decisions.hireProfile && decisions.hireProfile !== recommended.hiring.profile) {
      modifications.push(
        `Hire profile changed from ${
          recommended.hiring.profile ? RECRUIT_PROFILE_LABELS[recommended.hiring.profile] : "unavailable"
        } to ${RECRUIT_PROFILE_LABELS[decisions.hireProfile]}.`,
      )
      hireProfile = decisions.hireProfile
    } else if (decisions.hireProfile) {
      hireProfile = decisions.hireProfile
    }
    if (decisions.channels) {
      const selected = new Set(decisions.channels)
      const changed = RECRUIT_CHANNELS.some(
        (id) => Boolean(channels.find((row) => row.id === id)?.recommended) !== selected.has(id),
      )
      channels = channels.map((row) => ({
        ...row,
        recommended: selected.has(row.id),
      }))
      if (changed) modifications.push("Recommended recruiting channels were changed.")
    }
  }

  const rebuiltSteps = nextSteps({
    reason: recommended.why.reason,
    target: hiringTarget,
    profile: hireProfile,
    channels,
    compensationMissing: recommended.employment.compensation.startsWith("Not provided"),
  })
  if (decisions.stance === "modify" && decisions.note) {
    rebuiltSteps.push({ text: `Your note: ${decisions.note}`, source: "owner" })
  }

  return {
    hiringTarget,
    hireProfile,
    channels,
    profile: recommended.profile,
    employment: recommended.employment,
    budget: recommended.budget,
    nextSteps: rebuiltSteps,
    modifications,
    warnings,
  }
}
