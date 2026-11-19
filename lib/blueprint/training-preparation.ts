/**
 * Owner-approved training preparation. Recruitment facts can flow into a
 * training handoff, but Blueprint does not enroll, certify, invite, or
 * create trainee accounts in this stage.
 */

import { containsForbiddenEvaluationCategory } from "@/lib/blueprint/candidate-review"
import {
  currentHiredOutcome,
  parseOptionalDate,
  type ApplicantAudition,
  type EngagementModel,
  type HiringActivity,
  type HiringOutcomeRecord,
  type HiringPathKind,
} from "@/lib/blueprint/hiring-workflow"

export const TRAINING_APPROACHES = ["full", "standardization", "custom"] as const
export type TrainingApproach = (typeof TRAINING_APPROACHES)[number]

export const TRAINING_APPROACH_LABELS: Record<TrainingApproach, string> = {
  full: "Full training",
  standardization: "Experienced DJ standardization",
  custom: "Custom training",
}

export const TRAINING_EXPERIENCE_LEVELS = ["beginner", "experienced", "custom"] as const
export type TrainingExperienceLevel = (typeof TRAINING_EXPERIENCE_LEVELS)[number]

export const TRAINING_EXPERIENCE_LABELS: Record<TrainingExperienceLevel, string> = {
  beginner: "Beginner",
  experienced: "Experienced",
  custom: "Custom",
}

export const TRAINING_PREP_STATUSES = ["draft", "approved", "superseded"] as const
export type TrainingPrepStatus = (typeof TRAINING_PREP_STATUSES)[number]

export const TRAINING_PREP_STATUS_LABELS: Record<TrainingPrepStatus, string> = {
  draft: "Draft preparation",
  approved: "Ready for training",
  superseded: "Superseded",
}

export const TRAINING_READINESS = ["not_prepared", "draft", "ready"] as const
export type TrainingReadiness = (typeof TRAINING_READINESS)[number]

export const TRAINING_READINESS_LABELS: Record<TrainingReadiness, string> = {
  not_prepared: "Not prepared",
  draft: "Draft preparation",
  ready: "Ready for training",
}

export const TRAINING_PREP_TITLE = "Training preparation"
export const TRAINING_PREP_HELP =
  "Review what you already collected in hiring, then choose how this person should start training. You can correct training-specific fields here without changing the original application or hiring history."
export const TRAINING_PREP_NOT_HIRED =
  "Prepare for Training is available after you record a current Hired outcome."
export const TRAINING_PREP_REVERSED =
  "This hiring decision was reversed. You cannot approve a new training handoff. Previous preparation history is kept."
export const TRAINING_PREP_MISSING_DRAFT = "Start a training preparation first."
export const TRAINING_APPROACH_ADVISORY =
  "This suggestion is advisory. You choose the training approach. Blueprint does not certify skills, grant exemptions, or make employment decisions."
export const TRAINING_STAGE4_CLOSED =
  "Training is not enabled yet. Approving this handoff does not create a trainee account, assign a course, start lesson progress, send an invitation, or create a certification."
export const TRAINING_PREP_CONFIRM_LABEL =
  "I have reviewed this preparation and want to approve the training handoff"
export const TRAINING_PREP_CONFIRM_MESSAGE = "Confirm that you have reviewed this preparation before approving it."
export const TRAINING_PREP_SAVED = "Training preparation saved."
export const TRAINING_PREP_APPROVED = "Training handoff approved."
export const TRAINING_LIST_INVALID = "Enter up to 8 job-related items."
export const FORBIDDEN_TRAINING_ITEM_MESSAGE =
  "Use job-related skills and goals. Do not include personality, protected characteristics, or similar personal traits."
export const TRAINING_PREP_ROLE_REQUIRED = "Enter the intended training role."
export const TRAINING_ITEM_MAX = 8
export const TRAINING_ITEM_LENGTH_MAX = 80
export const TRAINING_NOTES_MAX = 400

export type SaveTrainingState = { error: string | null; savedAt: number | null }

export const FULL_TRAINING_GOALS = [
  "Start with foundational DJ training",
  "Progress through lessons and practical assignments",
  "Prepare for supervised event experience",
  "Demonstrate required skills before working unsupervised",
] as const

export const FULL_TRAINING_DEVELOPMENT = [
  "Foundational DJ skills",
  "Equipment setup",
  "Mixing fundamentals",
  "Event professionalism",
  "Company standards",
] as const

export const STANDARDIZATION_GOALS = [
  "Review prior experience and audition results",
  "Identify skills that may already be demonstrated",
  "Identify company-specific knowledge still required",
  "Prepare targeted lessons and practical checks",
] as const

export const STANDARDIZATION_DEVELOPMENT = ["Company-specific knowledge", "Company standards"] as const

export type TrainingActivityEvidence = {
  title: string
  status: string
  required: boolean
}

export type TrainingAuditionEvidence = {
  title: string
  status: string
  skills: string[]
  ratings: { category: string; rating: number | null }[]
  observations: string | null
}

export type TrainingEvidence = {
  hiringPath: HiringPathKind
  engagementModel: EngagementModel | null
  intendedRole: string
  completedActivities: TrainingActivityEvidence[]
  applicationExperience: string
  applicationAvailability: string
  applicationMotivation: string
  auditionObservations: TrainingAuditionEvidence[]
}

export type TrainingPreparationRecord = {
  id: string
  companyId: string
  applicationId: string
  applicantId: string
  version: number
  status: TrainingPrepStatus
  sourceOutcomeId: string | null
  intendedRole: string
  experienceLevel: TrainingExperienceLevel
  trainingApproach: TrainingApproach
  suggestedApproach: TrainingApproach
  skillsDemonstrated: string[]
  skillsNeedingDevelopment: string[]
  skillsNeedingVerification: string[]
  startingGoals: string[]
  plannedStartDate: string | null
  ownerNotes: string | null
  evidence: TrainingEvidence
  missingInformation: string[]
  createdBy: string
  updatedBy: string
  approvedBy: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TrainingPrepDraftInput = {
  intendedRole: string
  experienceLevel: TrainingExperienceLevel
  trainingApproach: TrainingApproach
  skillsDemonstrated: string[]
  skillsNeedingDevelopment: string[]
  skillsNeedingVerification: string[]
  startingGoals: string[]
  plannedStartDate: string | null
  ownerNotes: string | null
}

function asTrimmed(value: unknown, min: number, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (text.length < min || text.length > max) return null
  return text
}

export function isTrainingApproach(value: unknown): value is TrainingApproach {
  return typeof value === "string" && (TRAINING_APPROACHES as readonly string[]).includes(value)
}

export function isTrainingExperienceLevel(value: unknown): value is TrainingExperienceLevel {
  return typeof value === "string" && (TRAINING_EXPERIENCE_LEVELS as readonly string[]).includes(value)
}

export function isTrainingPrepStatus(value: unknown): value is TrainingPrepStatus {
  return typeof value === "string" && (TRAINING_PREP_STATUSES as readonly string[]).includes(value)
}

export function isTrainingReadiness(value: unknown): value is TrainingReadiness {
  return typeof value === "string" && (TRAINING_READINESS as readonly string[]).includes(value)
}

export function suggestedApproachFromHiringPath(path: HiringPathKind): TrainingApproach {
  if (path === "experienced") return "standardization"
  if (path === "custom") return "custom"
  return "full"
}

export function suggestedApproachFromExperience(level: TrainingExperienceLevel): TrainingApproach {
  return suggestedApproachFromHiringPath(level)
}

export function canPrepareTraining(outcomes: HiringOutcomeRecord[]): boolean {
  return currentHiredOutcome(outcomes) !== null
}

export function trainingReadinessFromRows(rows: Pick<TrainingPreparationRecord, "status">[]): TrainingReadiness {
  if (rows.some((row) => row.status === "approved")) return "ready"
  if (rows.some((row) => row.status === "draft")) return "draft"
  return "not_prepared"
}

export function trainingReadinessFromFacts(
  canPrepare: boolean,
  rows: Pick<TrainingPreparationRecord, "status">[],
): TrainingReadiness {
  if (!canPrepare) return "not_prepared"
  return trainingReadinessFromRows(rows)
}

export function trainingReadinessChipLabel(readiness: TrainingReadiness): string {
  return TRAINING_READINESS_LABELS[readiness]
}

export function currentDraft(rows: TrainingPreparationRecord[]): TrainingPreparationRecord | null {
  return rows.find((row) => row.status === "draft") ?? null
}

export function currentApproved(rows: TrainingPreparationRecord[]): TrainingPreparationRecord | null {
  return rows.find((row) => row.status === "approved") ?? null
}

export function nextPreparationVersion(rows: Pick<TrainingPreparationRecord, "version">[]): number {
  return rows.reduce((max, row) => Math.max(max, row.version), 0) + 1
}

export function trainingItemListFromUnknown(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > TRAINING_ITEM_MAX) return null
  const items: string[] = []
  const seen = new Set<string>()
  for (const item of value) {
    const label = asTrimmed(item, 1, TRAINING_ITEM_LENGTH_MAX)
    if (!label || containsForbiddenEvaluationCategory(label)) return null
    const key = label.toLowerCase()
    if (seen.has(key)) return null
    seen.add(key)
    items.push(label)
  }
  return items
}

export function evidenceFromUnknown(value: unknown): TrainingEvidence | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const hiringPath = record.hiringPath
  if (hiringPath !== "beginner" && hiringPath !== "experienced" && hiringPath !== "custom") return null
  const engagementModel = record.engagementModel
  if (
    engagementModel != null &&
    engagementModel !== "w2" &&
    engagementModel !== "1099" &&
    engagementModel !== "not_specified"
  ) {
    return null
  }
  const intendedRole = asTrimmed(record.intendedRole, 1, TRAINING_ITEM_LENGTH_MAX)
  const applicationExperience = asTrimmed(record.applicationExperience, 1, 2000)
  const applicationAvailability = asTrimmed(record.applicationAvailability, 1, 2000)
  const applicationMotivation = asTrimmed(record.applicationMotivation, 1, 2000)
  if (!intendedRole || !applicationExperience || !applicationAvailability || !applicationMotivation) return null
  if (!Array.isArray(record.completedActivities) || !Array.isArray(record.auditionObservations)) return null
  const completedActivities: TrainingActivityEvidence[] = []
  for (const item of record.completedActivities) {
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    const title = asTrimmed(row.title, 1, TRAINING_ITEM_LENGTH_MAX)
    const status = asTrimmed(row.status, 1, 40)
    if (!title || !status || typeof row.required !== "boolean") return null
    completedActivities.push({ title, status, required: row.required })
  }
  const auditionObservations: TrainingAuditionEvidence[] = []
  for (const item of record.auditionObservations) {
    if (!item || typeof item !== "object") return null
    const row = item as Record<string, unknown>
    const title = asTrimmed(row.title, 1, TRAINING_ITEM_LENGTH_MAX)
    const status = asTrimmed(row.status, 1, 40)
    const skills = trainingItemListFromUnknown(row.skills)
    if (!title || !status || !skills || !Array.isArray(row.ratings)) return null
    const ratings: TrainingAuditionEvidence["ratings"] = []
    for (const rating of row.ratings) {
      if (!rating || typeof rating !== "object") return null
      const ratingRow = rating as Record<string, unknown>
      const category = asTrimmed(ratingRow.category, 1, TRAINING_ITEM_LENGTH_MAX)
      const score = ratingRow.rating
      if (!category || (score != null && (typeof score !== "number" || score < 1 || score > 5))) return null
      ratings.push({ category, rating: score ?? null })
    }
    const observationsRaw = row.observations
    const observations =
      observationsRaw == null || observationsRaw === ""
        ? null
        : asTrimmed(observationsRaw, 1, 4000)
    if (observationsRaw && !observations) return null
    auditionObservations.push({ title, status, skills, ratings, observations })
  }
  return {
    hiringPath,
    engagementModel: engagementModel ?? null,
    intendedRole,
    completedActivities,
    applicationExperience,
    applicationAvailability,
    applicationMotivation,
    auditionObservations,
  }
}

export function captureTrainingEvidence(input: {
  hiringPath: HiringPathKind
  intendedRole: string
  engagementModel: EngagementModel | null
  answers: { experience: string; availability: string; motivation: string }
  activities: HiringActivity[]
  auditions: ApplicantAudition[]
}): TrainingEvidence {
  return {
    hiringPath: input.hiringPath,
    engagementModel: input.engagementModel,
    intendedRole: input.intendedRole,
    completedActivities: input.activities
      .filter((row) => row.status === "complete" || row.status === "skipped")
      .map((row) => ({ title: row.title, status: row.status, required: row.required })),
    applicationExperience: input.answers.experience,
    applicationAvailability: input.answers.availability,
    applicationMotivation: input.answers.motivation,
    auditionObservations: input.auditions
      .filter((row) => row.status === "completed")
      .map((row) => ({
        title: row.title,
        status: row.status,
        skills: row.skills,
        ratings: row.skillRatings.map((rating) => ({ category: rating.category, rating: rating.rating })),
        observations: row.notes,
      })),
  }
}

function uniqueItems(items: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (seen.has(key) || result.length >= TRAINING_ITEM_MAX) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

export function suggestedSkillsFromEvidence(
  approach: TrainingApproach,
  evidence: TrainingEvidence,
): {
  demonstrated: string[]
  development: string[]
  verification: string[]
} {
  const auditionSkills = evidence.auditionObservations.flatMap((row) => row.skills)
  const highRated = evidence.auditionObservations.flatMap((row) =>
    row.ratings.filter((rating) => rating.rating != null && rating.rating >= 4).map((rating) => rating.category),
  )
  const remaining = auditionSkills.filter(
    (skill) => !highRated.some((item) => item.toLowerCase() === skill.toLowerCase()),
  )
  if (approach === "full") {
    return {
      demonstrated: uniqueItems(highRated),
      development: [...FULL_TRAINING_DEVELOPMENT],
      verification: uniqueItems(auditionSkills),
    }
  }
  if (approach === "standardization") {
    return {
      demonstrated: uniqueItems(highRated),
      development: [...STANDARDIZATION_DEVELOPMENT],
      verification: uniqueItems([...remaining, "Company-specific knowledge"]),
    }
  }
  return {
    demonstrated: uniqueItems(highRated),
    development: [],
    verification: uniqueItems(auditionSkills),
  }
}

export function defaultGoalsForApproach(approach: TrainingApproach): string[] {
  if (approach === "full") return [...FULL_TRAINING_GOALS]
  if (approach === "standardization") return [...STANDARDIZATION_GOALS]
  return []
}

export function missingTrainingInformation(input: {
  intendedRole: string
  trainingApproach: TrainingApproach
  startingGoals: string[]
  plannedStartDate: string | null
  evidence: TrainingEvidence
}): string[] {
  const missing: string[] = []
  if (!input.intendedRole.trim()) missing.push("Intended training role")
  if (input.trainingApproach === "custom" && input.startingGoals.length === 0) {
    missing.push("Custom training goals")
  }
  if (!input.plannedStartDate) missing.push("Planned training start date")
  if (input.evidence.hiringPath === "experienced" && input.evidence.auditionObservations.length === 0) {
    missing.push("Audition evidence for an experienced path")
  }
  return missing
}

export function suggestedStartingFocus(input: {
  trainingApproach: TrainingApproach
  startingGoals: string[]
  skillsNeedingDevelopment: string[]
  skillsNeedingVerification: string[]
}): string {
  if (input.startingGoals[0]) return input.startingGoals[0]
  if (input.trainingApproach === "full") return FULL_TRAINING_GOALS[0]
  if (input.trainingApproach === "standardization") return STANDARDIZATION_GOALS[0]
  return input.skillsNeedingDevelopment[0] ?? input.skillsNeedingVerification[0] ?? "Owner-defined custom training"
}

export function defaultsForNewDraft(input: {
  hiringPath: HiringPathKind
  hired: HiringOutcomeRecord
  answers: { experience: string; availability: string; motivation: string }
  activities: HiringActivity[]
  auditions: ApplicantAudition[]
}): TrainingPrepDraftInput & { suggestedApproach: TrainingApproach; evidence: TrainingEvidence; missingInformation: string[] } {
  const suggestedApproach = suggestedApproachFromHiringPath(input.hiringPath)
  const evidence = captureTrainingEvidence({
    hiringPath: input.hiringPath,
    intendedRole: input.hired.intendedRole,
    engagementModel: input.hired.engagementModel,
    answers: input.answers,
    activities: input.activities,
    auditions: input.auditions,
  })
  const skills = suggestedSkillsFromEvidence(suggestedApproach, evidence)
  const startingGoals = defaultGoalsForApproach(suggestedApproach)
  const draft: TrainingPrepDraftInput = {
    intendedRole: input.hired.intendedRole,
    experienceLevel: input.hiringPath,
    trainingApproach: suggestedApproach,
    skillsDemonstrated: skills.demonstrated,
    skillsNeedingDevelopment: skills.development,
    skillsNeedingVerification: skills.verification,
    startingGoals,
    plannedStartDate: input.hired.plannedStartDate,
    ownerNotes: null,
  }
  return {
    ...draft,
    suggestedApproach,
    evidence,
    missingInformation: missingTrainingInformation({
      intendedRole: draft.intendedRole,
      trainingApproach: draft.trainingApproach,
      startingGoals: draft.startingGoals,
      plannedStartDate: draft.plannedStartDate,
      evidence,
    }),
  }
}

export function parseTrainingItemFields(formData: FormData, prefix: string): { ok: true; items: string[] } | { ok: false; error: string } {
  const items: string[] = []
  for (let index = 0; index < TRAINING_ITEM_MAX; index += 1) {
    const raw = String(formData.get(`${prefix}-${index}`) ?? "").trim()
    if (!raw) continue
    const label = asTrimmed(raw, 1, TRAINING_ITEM_LENGTH_MAX)
    if (!label) return { ok: false, error: TRAINING_LIST_INVALID }
    if (containsForbiddenEvaluationCategory(label)) return { ok: false, error: FORBIDDEN_TRAINING_ITEM_MESSAGE }
    items.push(label)
  }
  const parsed = trainingItemListFromUnknown(items)
  if (!parsed) return { ok: false, error: TRAINING_LIST_INVALID }
  return { ok: true, items: parsed }
}

export function parseTrainingPrepForm(formData: FormData):
  | { ok: true; value: TrainingPrepDraftInput }
  | { ok: false; error: string } {
  const intendedRole = asTrimmed(formData.get("intendedRole"), 1, TRAINING_ITEM_LENGTH_MAX)
  if (!intendedRole) return { ok: false, error: TRAINING_PREP_ROLE_REQUIRED }
  const experienceLevel = formData.get("experienceLevel")
  if (!isTrainingExperienceLevel(experienceLevel)) return { ok: false, error: "Choose beginner, experienced, or custom." }
  const trainingApproach = formData.get("trainingApproach")
  if (!isTrainingApproach(trainingApproach)) return { ok: false, error: "Choose a training approach." }
  const demonstrated = parseTrainingItemFields(formData, "demonstrated")
  if (!demonstrated.ok) return demonstrated
  const development = parseTrainingItemFields(formData, "development")
  if (!development.ok) return development
  const verification = parseTrainingItemFields(formData, "verification")
  if (!verification.ok) return verification
  const goals = parseTrainingItemFields(formData, "goal")
  if (!goals.ok) return goals
  const plannedStartDate = parseOptionalDate(formData.get("plannedStartDate"))
  if (plannedStartDate === undefined) return { ok: false, error: "Enter a planned start date, or leave it blank." }
  const notesRaw = String(formData.get("ownerNotes") ?? "").trim()
  let ownerNotes: string | null = null
  if (notesRaw) {
    ownerNotes = asTrimmed(notesRaw, 1, TRAINING_NOTES_MAX)
    if (!ownerNotes) return { ok: false, error: "Shorten the owner notes." }
  }
  return {
    ok: true,
    value: {
      intendedRole,
      experienceLevel,
      trainingApproach,
      skillsDemonstrated: demonstrated.items,
      skillsNeedingDevelopment: development.items,
      skillsNeedingVerification: verification.items,
      startingGoals: goals.items,
      plannedStartDate,
      ownerNotes,
    },
  }
}

export function parseTrainingApprovalForm(
  formData: FormData,
): { ok: true; value: TrainingPrepDraftInput } | { ok: false; error: string } {
  if (formData.get("confirmApproval") !== "1") return { ok: false, error: TRAINING_PREP_CONFIRM_MESSAGE }
  return parseTrainingPrepForm(formData)
}

export function padTrainingItems(items: string[]): string[] {
  return Array.from({ length: TRAINING_ITEM_MAX }, (_, index) => items[index] ?? "")
}
