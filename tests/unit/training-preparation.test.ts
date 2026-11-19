import { describe, expect, it } from "vitest"

import { currentHiredOutcome, defaultHiringActivities } from "@/lib/blueprint/hiring-workflow"
import {
  STAGE4_TRAINING_DESTINATION,
  trainingPreparationHandoffFromApproved,
} from "@/lib/blueprint/training-preparation-handoff"
import {
  FORBIDDEN_TRAINING_ITEM_MESSAGE,
  FULL_TRAINING_GOALS,
  STANDARDIZATION_GOALS,
  TRAINING_PREP_NOT_HIRED,
  TRAINING_STAGE4_CLOSED,
  canPrepareTraining,
  captureTrainingEvidence,
  currentApproved,
  currentDraft,
  defaultsForNewDraft,
  nextPreparationVersion,
  parseTrainingApprovalForm,
  parseTrainingPrepForm,
  suggestedApproachFromHiringPath,
  suggestedSkillsFromEvidence,
  trainingReadinessFromFacts,
  trainingReadinessFromRows,
  type TrainingPreparationRecord,
} from "@/lib/blueprint/training-preparation"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const hired = {
  id: "outcome-1",
  decisionId: "decision-1",
  outcome: "hired" as const,
  intendedRole: "Wedding DJ",
  plannedStartDate: "2026-05-01",
  engagementModel: "w2" as const,
  notes: "Owner-provided W-2 intention.",
  createdBy: "owner-a",
  createdAt: "2026-04-01T12:00:00.000Z",
}

const answers = {
  experience: "I have DJed friends' parties.",
  availability: "Most Saturday nights.",
  motivation: "I want to learn weddings.",
}

const completedAudition = {
  id: "aud-1",
  title: "Saturday setup check",
  description: "Set up two speakers.",
  skills: ["Equipment setup", "Mixing fundamentals"],
  scheduledAt: null,
  locationOrFormat: "Studio",
  evaluatorName: "Alex",
  status: "completed" as const,
  notes: "Clear setup. Mixing still developing.",
  skillRatings: [
    { category: "Equipment setup", rating: 4 as const, notes: null },
    { category: "Mixing fundamentals", rating: 2 as const, notes: null },
  ],
  completedAt: "2026-04-10T18:00:00.000Z",
  createdBy: "owner-a",
  updatedBy: "owner-a",
  createdAt: "2026-04-10T18:00:00.000Z",
  updatedAt: "2026-04-10T18:00:00.000Z",
}

function record(overrides: Partial<TrainingPreparationRecord> = {}): TrainingPreparationRecord {
  const defaults = defaultsForNewDraft({
    hiringPath: "beginner",
    hired,
    answers,
    activities: defaultHiringActivities("beginner").map((row) =>
      row.activityKey === "review_application" ? { ...row, status: "complete" } : row,
    ),
    auditions: [completedAudition],
  })
  return {
    id: "prep-1",
    companyId: "company-a",
    applicationId: "app-1",
    applicantId: "person-1",
    version: 1,
    status: "draft",
    sourceOutcomeId: hired.id,
    intendedRole: defaults.intendedRole,
    experienceLevel: defaults.experienceLevel,
    trainingApproach: defaults.trainingApproach,
    suggestedApproach: defaults.suggestedApproach,
    skillsDemonstrated: defaults.skillsDemonstrated,
    skillsNeedingDevelopment: defaults.skillsNeedingDevelopment,
    skillsNeedingVerification: defaults.skillsNeedingVerification,
    startingGoals: defaults.startingGoals,
    plannedStartDate: defaults.plannedStartDate,
    ownerNotes: defaults.ownerNotes,
    evidence: defaults.evidence,
    missingInformation: defaults.missingInformation,
    createdBy: "owner-a",
    updatedBy: "owner-a",
    approvedBy: null,
    approvedAt: null,
    createdAt: "2026-04-12T12:00:00.000Z",
    updatedAt: "2026-04-12T12:00:00.000Z",
    ...overrides,
  }
}

describe("training approaches", () => {
  it("suggests full, standardization, and custom from the hiring path", () => {
    expect(suggestedApproachFromHiringPath("beginner")).toBe("full")
    expect(suggestedApproachFromHiringPath("experienced")).toBe("standardization")
    expect(suggestedApproachFromHiringPath("custom")).toBe("custom")
    expect(defaultsForNewDraft({
      hiringPath: "beginner",
      hired,
      answers,
      activities: defaultHiringActivities("beginner"),
      auditions: [],
    }).startingGoals).toEqual([...FULL_TRAINING_GOALS])
    expect(defaultsForNewDraft({
      hiringPath: "experienced",
      hired,
      answers,
      activities: defaultHiringActivities("experienced"),
      auditions: [],
    }).startingGoals).toEqual([...STANDARDIZATION_GOALS])
    expect(defaultsForNewDraft({
      hiringPath: "custom",
      hired,
      answers,
      activities: defaultHiringActivities("custom"),
      auditions: [],
    }).startingGoals).toEqual([])
  })

  it("treats audition ratings as evidence and does not auto-certify self-reported experience", () => {
    const evidence = captureTrainingEvidence({
      hiringPath: "experienced",
      intendedRole: "Wedding DJ",
      engagementModel: "w2",
      answers,
      activities: defaultHiringActivities("experienced").map((row) =>
        row.activityKey === "review_application" ? { ...row, status: "complete" } : row,
      ),
      auditions: [completedAudition],
    })
    const skills = suggestedSkillsFromEvidence("standardization", evidence)
    expect(skills.demonstrated).toEqual(["Equipment setup"])
    expect(skills.verification).toContain("Mixing fundamentals")
    expect(skills.development).toContain("Company-specific knowledge")
    expect(JSON.stringify(skills.demonstrated)).not.toMatch(/friends' parties/i)
    expect(evidence.applicationExperience).toBe(answers.experience)
    expect(JSON.stringify(evidence)).not.toMatch(/scorecard|personality|conversation notes|private note/i)
  })
})

describe("hired gate and versioning", () => {
  it("lets a current hired outcome start preparation and blocks a reversed outcome", () => {
    expect(canPrepareTraining([hired])).toBe(true)
    expect(currentHiredOutcome([hired, { ...hired, id: "outcome-2", outcome: "reversed" }])).toBeNull()
    expect(canPrepareTraining([hired, { ...hired, id: "outcome-2", outcome: "reversed" }])).toBe(false)
    expect(TRAINING_PREP_NOT_HIRED).toMatch(/current Hired outcome/i)
  })

  it("keeps one draft, versions approved snapshots, and does not rewrite application answers", () => {
    const draft = record()
    const approved = record({ id: "prep-2", version: 1, status: "approved", approvedBy: "owner-a", approvedAt: "2026-04-13T12:00:00.000Z" })
    expect(currentDraft([approved, draft])).toEqual(draft)
    expect(currentApproved([approved, draft])).toEqual(approved)
    expect(nextPreparationVersion([approved])).toBe(2)
    expect(trainingReadinessFromRows([])).toBe("not_prepared")
    expect(trainingReadinessFromRows([draft])).toBe("draft")
    expect(trainingReadinessFromRows([approved])).toBe("ready")
    expect(trainingReadinessFromFacts(false, [approved])).toBe("not_prepared")
    expect(trainingReadinessFromFacts(true, [approved])).toBe("ready")
    const parsed = parseTrainingPrepForm(
      form({
        intendedRole: "Lead wedding DJ",
        experienceLevel: "beginner",
        trainingApproach: "full",
        plannedStartDate: "2026-06-01",
        "goal-0": "Start with foundational DJ training",
        ownerNotes: "Keep weekends light at first.",
      }),
    )
    expect(parsed).toMatchObject({
      ok: true,
      value: { intendedRole: "Lead wedding DJ", plannedStartDate: "2026-06-01" },
    })
    expect(draft.evidence.applicationExperience).toBe(answers.experience)
  })

  it("requires explicit confirmation and rejects protected training items", () => {
    const fields = {
      intendedRole: "Wedding DJ",
      experienceLevel: "custom",
      trainingApproach: "custom",
      "goal-0": "Shadow two weddings",
    }
    expect(parseTrainingApprovalForm(form(fields))).toEqual({
      ok: false,
      error: "Confirm that you have reviewed this preparation before approving it.",
    })
    expect(parseTrainingApprovalForm(form({ ...fields, confirmApproval: "1" }))).toMatchObject({
      ok: true,
      value: { trainingApproach: "custom", startingGoals: ["Shadow two weddings"] },
    })
    expect(
      parseTrainingPrepForm(
        form({
          intendedRole: "Wedding DJ",
          experienceLevel: "beginner",
          trainingApproach: "full",
          "demonstrated-0": "Personality type",
        }),
      ),
    ).toEqual({ ok: false, error: FORBIDDEN_TRAINING_ITEM_MESSAGE })
  })
})

describe("Stage 4 handoff", () => {
  it("emits a typed contract that stays not_enabled and creates no trainee records", () => {
    const approved = record({
      status: "approved",
      approvedBy: "owner-a",
      approvedAt: "2026-04-13T12:00:00.000Z",
      skillsDemonstrated: ["Equipment setup"],
    })
    const handoff = trainingPreparationHandoffFromApproved(approved)
    expect(handoff).toMatchObject({
      contractVersion: 1,
      companyId: "company-a",
      applicantId: "person-1",
      applicationId: "app-1",
      approvedVersion: 1,
      intendedRole: "Wedding DJ",
      trainingApproach: "full",
      nextStepDestination: "not_enabled",
    })
    expect(handoff?.demonstratedSkills[0]).toEqual({
      skill: "Equipment setup",
      evidenceRefs: ["audition:Saturday setup check"],
    })
    expect(trainingPreparationHandoffFromApproved(record())).toBeNull()
    expect(TRAINING_STAGE4_CLOSED).toMatch(/does not create a trainee account/i)
    expect(JSON.stringify(handoff)).not.toMatch(/createUser|enroll|invitation|certification record|lesson progress/i)
    expect(STAGE4_TRAINING_DESTINATION).toBe("not_enabled")
  })
})
