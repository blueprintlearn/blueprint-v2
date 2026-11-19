import { describe, expect, it } from "vitest"

import { candidateReviewHandoffFromProfile } from "@/lib/blueprint/candidate-review-handoff"
import {
  DEFAULT_EVALUATION_CATEGORIES,
  FORBIDDEN_CATEGORY_MESSAGE,
  HUMAN_EVALUATION_HELP,
  categoriesFromUnknown,
  containsForbiddenEvaluationCategory,
  evaluationStatusFromRatings,
  parseDecisionForm,
  parseEvaluationForm,
  parseEvaluationTemplateForm,
  parseFollowUpForm,
  reviewStatusFromFacts,
  stageAfterDecision,
} from "@/lib/blueprint/candidate-review"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const defaultFields = {
  slug: "company-default",
  "category-0": "Communication",
  "category-1": "Relevant experience",
  "category-2": "Availability",
  "category-3": "Job-related skills",
  "category-4": "Evidence from application and interview",
}

describe("evaluation categories", () => {
  it("accepts the default job-related list and freezes later edits out of existing snapshots", () => {
    const parsed = parseEvaluationTemplateForm(form(defaultFields))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.template.categories).toEqual([...DEFAULT_EVALUATION_CATEGORIES])
    const frozen = categoriesFromUnknown(parsed.template.categories)
    const edited = parseEvaluationTemplateForm(
      form({ ...defaultFields, "category-0": "Weekend communication" }),
    )
    expect(edited.ok).toBe(true)
    if (!edited.ok) return
    expect(frozen?.[0]).toBe("Communication")
    expect(edited.template.categories[0]).toBe("Weekend communication")
  })

  it("rejects protected-characteristic and personality labels", () => {
    expect(containsForbiddenEvaluationCategory("Personality type")).toBe(true)
    expect(containsForbiddenEvaluationCategory("Age")).toBe(true)
    expect(containsForbiddenEvaluationCategory("Communication")).toBe(false)
    const forbidden = parseEvaluationTemplateForm(
      form({
        slug: "company-default",
        "category-0": "Communication",
        "category-1": "Personality type",
        "category-2": "Availability",
      }),
    )
    expect(forbidden).toEqual({ ok: false, error: FORBIDDEN_CATEGORY_MESSAGE })
  })
})

describe("human evaluation ratings", () => {
  it("saves 1–5 ratings and not-evaluated without inventing an overall score", () => {
    const parsed = parseEvaluationForm(
      form({
        "rating-0": "4",
        "notes-0": "Clear answers.",
        "rating-1": "",
        "rating-2": "5",
        "rating-3": "3",
        "rating-4": "4",
      }),
      [...DEFAULT_EVALUATION_CATEGORIES],
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.ratings[0]).toEqual({
      category: "Communication",
      rating: 4,
      notes: "Clear answers.",
    })
    expect(parsed.ratings[1]?.rating).toBeNull()
    expect(evaluationStatusFromRatings(parsed.ratings)).toBe("incomplete")
    expect(JSON.stringify(parsed)).not.toMatch(/overall|composite|rank|recommend/i)
    expect(HUMAN_EVALUATION_HELP).toMatch(/does not add them up/i)
    const complete = parseEvaluationForm(
      form({
        "rating-0": "4",
        "rating-1": "4",
        "rating-2": "5",
        "rating-3": "3",
        "rating-4": "4",
      }),
      [...DEFAULT_EVALUATION_CATEGORIES],
    )
    expect(complete.ok).toBe(true)
    if (!complete.ok) return
    expect(evaluationStatusFromRatings(complete.ratings)).toBe("complete")
    const total = complete.ratings.reduce((sum, row) => sum + (row.rating ?? 0), 0)
    expect(JSON.stringify(complete)).not.toContain(String(total))
  })
})

describe("owner decisions and follow-ups", () => {
  it("maps decisions without auto-messaging or hiring, and keeps history reversible", () => {
    expect(parseDecisionForm(form({ decision: "hold", reason: "Call after Friday." }))).toEqual({
      ok: true,
      decision: "hold",
      reason: "Call after Friday.",
    })
    expect(stageAfterDecision("new_application", "advance")).toBe("screening")
    expect(stageAfterDecision("screening", "advance")).toBe("interview")
    expect(stageAfterDecision("interview", "advance")).toBe("decision")
    expect(stageAfterDecision("decision", "advance")).toBe("decision")
    expect(stageAfterDecision("interview", "hold")).toBe("interview")
    expect(stageAfterDecision("interview", "reject")).toBe("rejected")
    expect(stageAfterDecision("rejected", "hired")).toBe("hired")
    expect(stageAfterDecision("hired", "advance")).toBe("decision")
    expect(reviewStatusFromFacts({
      stage: "new_application",
      evaluationStatus: "not_started",
      latestDecision: null,
    })).toBe("needs_review")
    expect(reviewStatusFromFacts({
      stage: "new_application",
      evaluationStatus: "complete",
      latestDecision: null,
    })).toBe("reviewed")
    expect(
      parseFollowUpForm(form({ action: "review_video", dueOn: "2026-04-01", status: "pending" })),
    ).toEqual({
      ok: true,
      action: "review_video",
      dueOn: "2026-04-01",
      status: "pending",
    })
  })

  it("keeps Stage 3.6 closed", () => {
    expect(
      candidateReviewHandoffFromProfile({
        companyId: "company-a",
        applicantId: "person-1",
        applicationId: "app-1",
        recruitingPageId: "page-1",
        slug: "company-a",
        roleTitle: "DJ",
        stage: "decision",
        decision: "advance",
        followUp: {
          action: "make_decision",
          dueOn: null,
          status: "pending",
          updatedAt: "2026-03-02T12:00:00.000Z",
          updatedBy: "user-a",
        },
        evaluationStatus: "complete",
        interviewStatus: "ready",
        interviewSubmittedAt: "2026-03-02T12:00:00.000Z",
      }).nextStepDestination,
    ).toBe("not_enabled")
  })
})
