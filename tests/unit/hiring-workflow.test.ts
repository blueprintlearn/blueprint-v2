import { describe, expect, it } from "vitest"

import { hiringWorkflowHandoffFromProfile } from "@/lib/blueprint/hiring-workflow-handoff"
import {
  DEFAULT_AUDITION_SKILLS,
  DEFAULT_HIRING_PATH,
  FORBIDDEN_AUDITION_SKILL_MESSAGE,
  HIRING_OUTCOME_HELP,
  checklistProgress,
  defaultHiringActivities,
  mergeHiringActivities,
  nextHiringActivity,
  nextHiringOutcomeCode,
  parseAuditionForm,
  parseConversationForm,
  parseCustomHiringActivityForm,
  parseHiringActivityActionForm,
  parseHiringOutcomeFields,
  parseHiringPathForm,
} from "@/lib/blueprint/hiring-workflow"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

describe("hiring paths", () => {
  it("defaults beginner without an audition and experienced with an optional audition", () => {
    const beginner = defaultHiringActivities("beginner")
    const experienced = defaultHiringActivities("experienced")
    expect(beginner.map((row) => row.activityKey)).toEqual([
      "review_application",
      "video_interview",
      "owner_conversation",
      "hiring_decision",
      "training_handoff",
    ])
    expect(beginner.find((row) => row.activityKey === "video_interview")?.required).toBe(false)
    expect(experienced.map((row) => row.activityKey)).toContain("practical_audition")
    expect(experienced.find((row) => row.activityKey === "practical_audition")?.required).toBe(false)
    expect(DEFAULT_HIRING_PATH).toBe("beginner")
  })

  it("keeps completed history when the owner changes path", () => {
    const beginner = defaultHiringActivities("beginner").map((row) =>
      row.activityKey === "review_application"
        ? { ...row, id: "act-1", status: "complete" as const, completedAt: "2026-04-01T12:00:00.000Z" }
        : row,
    )
    const merged = mergeHiringActivities(beginner, "experienced")
    expect(merged.find((row) => row.activityKey === "review_application")).toMatchObject({
      id: "act-1",
      status: "complete",
    })
    expect(merged.some((row) => row.activityKey === "practical_audition")).toBe(true)
    expect(parseHiringPathForm(form({ path: "custom" }))).toEqual({ ok: true, path: "custom" })
  })
})

describe("hiring checklist", () => {
  it("completes, skips, and reopens without forcing a sequence", () => {
    const complete = parseHiringActivityActionForm(
      form({
        activityId: "virtual:review_application",
        activityKey: "review_application",
        title: "Review application",
        intent: "complete",
      }),
    )
    expect(complete).toMatchObject({ ok: true, intent: "complete" })
    const skip = parseHiringActivityActionForm(
      form({
        activityId: "virtual:video_interview",
        activityKey: "video_interview",
        title: "Video interview",
        intent: "skip",
        skipReason: "We already spoke in person.",
      }),
    )
    expect(skip).toMatchObject({ ok: true, intent: "skip", skipReason: "We already spoke in person." })
    const reopen = parseHiringActivityActionForm(
      form({
        activityId: "act-1",
        activityKey: "hiring_decision",
        title: "Hiring decision",
        intent: "reopen",
      }),
    )
    expect(reopen).toMatchObject({ ok: true, intent: "reopen" })
    expect(parseCustomHiringActivityForm(form({ title: "Shadow a wedding" }))).toEqual({
      ok: true,
      title: "Shadow a wedding",
    })
    const activities = defaultHiringActivities("beginner")
    activities[0] = { ...activities[0]!, status: "complete" }
    expect(checklistProgress(activities)).toMatchObject({ complete: 1, pending: 4, total: 5 })
    expect(nextHiringActivity(activities)?.activityKey).toBe("owner_conversation")
  })
})

describe("conversations and auditions", () => {
  it("records multiple conversations without a calendar or conference tool", () => {
    const first = parseConversationForm(
      form({
        conversationType: "phone",
        plannedAt: "2026-04-02T15:00",
        status: "planned",
        notes: "Ask about weekend availability.",
        nextAction: "Offer an audition if the call goes well.",
        personResponsible: "Alex",
      }),
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(first.conversationType).toBe("phone")
    expect(first.personResponsible).toBe("Alex")
    const second = parseConversationForm(
      form({
        conversationId: "conv-1",
        conversationType: "in_person",
        status: "completed",
        notes: "Met at the studio.",
      }),
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(second.conversationId).toBe("conv-1")
    expect(JSON.stringify(first)).not.toMatch(/zoom|calendly|google meet/i)
  })

  it("saves optional human-entered audition observations and rejects protected skills", () => {
    const fields: Record<string, string> = {
      title: "Saturday setup check",
      description: "Set up two speakers and a microphone.",
      scheduledAt: "2026-04-10T18:00",
      locationOrFormat: "Studio, or remote if traveling",
      evaluatorName: "Alex",
      status: "completed",
      notes: "Clear setup, mixing still developing.",
    }
    DEFAULT_AUDITION_SKILLS.forEach((skill, index) => {
      fields[`skill-${index}`] = skill
      fields[`rating-${index}`] = index === 1 ? "" : "4"
    })
    const parsed = parseAuditionForm(form(fields))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.skills).toEqual([...DEFAULT_AUDITION_SKILLS])
    expect(parsed.skillRatings[1]?.rating).toBeNull()
    expect(JSON.stringify(parsed)).not.toMatch(/overall|auto.?grade|pass\/fail/i)
    const forbidden = parseAuditionForm(
      form({
        title: "Audition",
        status: "planned",
        "skill-0": "Personality type",
      }),
    )
    expect(forbidden).toEqual({ ok: false, error: FORBIDDEN_AUDITION_SKILL_MESSAGE })
  })
})

describe("hiring outcome", () => {
  it("records hired details without creating employment records, and supports reversal", () => {
    expect(
      parseHiringOutcomeFields(
        form({
          intendedRole: "Wedding DJ",
          plannedStartDate: "2026-05-01",
          engagementModel: "1099",
          outcomeNotes: "Start after the May wedding.",
        }),
        "DJ",
      ),
    ).toEqual({
      ok: true,
      intendedRole: "Wedding DJ",
      plannedStartDate: "2026-05-01",
      engagementModel: "1099",
      notes: "Start after the May wedding.",
    })
    expect(nextHiringOutcomeCode("hired", null)).toBe("hired")
    expect(nextHiringOutcomeCode("hired", "hired")).toBe("corrected")
    expect(nextHiringOutcomeCode("hold", "hired")).toBe("reversed")
    expect(nextHiringOutcomeCode("advance", null)).toBeNull()
    expect(HIRING_OUTCOME_HELP).toMatch(/does not create an employee account/i)
    expect(HIRING_OUTCOME_HELP).toMatch(/payroll|training enrollment/i)
  })

  it("keeps Stage 3.7 training closed", () => {
    const handoff = hiringWorkflowHandoffFromProfile({
      companyId: "company-a",
      applicantId: "person-1",
      applicationId: "app-1",
      recruitingPageId: "page-1",
      slug: "company-a",
      roleTitle: "DJ",
      hiringPath: "beginner",
      activities: defaultHiringActivities("beginner").map((row) =>
        row.activityKey === "hiring_decision" ? { ...row, status: "complete" } : row,
      ),
      auditionResults: [],
      hiringOutcome: {
        outcome: "hired",
        intendedRole: "DJ",
        plannedStartDate: "2026-05-01",
        engagementModel: "w2",
      },
    })
    expect(handoff.nextStepDestination).toBe("not_enabled")
    expect(handoff.engagementModel).toBe("w2")
    expect(handoff.plannedStartDate).toBe("2026-05-01")
    expect(handoff.completedActivities.some((row) => row.activityKey === "hiring_decision" && row.status === "complete")).toBe(
      true,
    )
  })
})
