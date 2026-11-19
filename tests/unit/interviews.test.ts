import { describe, expect, it } from "vitest"

import { applicantInterviewHandoffFromReview } from "@/lib/blueprint/interview-handoff"
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  INTERVIEW_STATUS_LABELS,
  containsForbiddenEvaluation,
  displayInterviewStatus,
  freezeInterviewQuestions,
  hasCompleteAnswers,
  interviewStoragePath,
  parseInterviewTemplateForm,
  questionsFromUnknown,
} from "@/lib/blueprint/interviews"
import { processInterviewAnswers } from "@/lib/blueprint/interview-process"

function form(fields: Record<string, string>) {
  const data = new FormData()
  for (const [name, value] of Object.entries(fields)) data.set(name, value)
  return data
}

const templateFields = {
  slug: "company-c",
  "prompt-0": "Why this company?",
  "timeLimit-0": "60",
  "prompt-1": "Tell us about a recent event.",
  "timeLimit-1": "90",
  "prompt-2": "What if you were late?",
  "timeLimit-2": "45",
  deadlineDays: "7",
  retentionDays: "365",
}

describe("interview questions", () => {
  it("parses three questions and freezes a snapshot that later edits do not change", () => {
    const parsed = parseInterviewTemplateForm(form(templateFields))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const frozen = freezeInterviewQuestions(parsed.template.questions)
    const edited = parseInterviewTemplateForm(form({ ...templateFields, "prompt-0": "A different question?" }))
    expect(edited.ok).toBe(true)
    if (!edited.ok) return
    expect(frozen[0]?.prompt).toBe("Why this company?")
    expect(edited.template.questions[0]?.prompt).toBe("A different question?")
    expect(DEFAULT_INTERVIEW_QUESTIONS).toHaveLength(3)
    expect(DEFAULT_INTERVIEW_QUESTIONS.map((row) => row.prompt).join(" ")).not.toMatch(/Show up prepared|core value/i)
  })

  it("rejects incomplete templates and invalid storage paths", () => {
    expect(parseInterviewTemplateForm(form({ ...templateFields, "prompt-2": "" })).ok).toBe(false)
    expect(questionsFromUnknown([{ prompt: "Only one", timeLimitSeconds: 60 }])).toBeNull()
    expect(interviewStoragePath("aa", "11111111-1111-4111-8111-111111111111", "video/webm")).toBeNull()
    expect(
      interviewStoragePath("a".repeat(64), "11111111-1111-4111-8111-111111111111", "video/webm"),
    ).toBe(`invites/${"a".repeat(64)}/11111111-1111-4111-8111-111111111111.webm`)
  })
})

describe("interview status", () => {
  it("treats a missed deadline as expired without changing Kanban stages", () => {
    expect(displayInterviewStatus(null, null)).toBe("not_sent")
    expect(displayInterviewStatus("invited", "2020-01-01T00:00:00.000Z", new Date("2026-01-01"))).toBe("expired")
    expect(displayInterviewStatus("submitted", "2020-01-01T00:00:00.000Z", new Date("2026-01-01"))).toBe("submitted")
    expect(INTERVIEW_STATUS_LABELS.not_sent).toBe("Interview Not Sent")
    expect(INTERVIEW_STATUS_LABELS.ready).toBe("Ready for Review")
    expect(hasCompleteAnswers([0, 1])).toBe(false)
    expect(hasCompleteAnswers([0, 1, 2])).toBe(true)
  })
})

describe("interview processing", () => {
  const answers = [
    { questionIndex: 0, prompt: "Why?", playbackUrl: "https://example.test/a" },
    { questionIndex: 1, prompt: "Event?", playbackUrl: "https://example.test/b" },
    { questionIndex: 2, prompt: "Late?", playbackUrl: "https://example.test/c" },
  ]

  it("fails closed without a provider and never invents speech", async () => {
    const none = await processInterviewAnswers(answers, "none")
    expect(none.ok).toBe(false)
    if (none.ok) return
    expect(none.answers).toEqual([])
    expect(none.error).toMatch(/not configured/i)
  })

  it("labels stub output as not a speech transcript and rejects evaluation language", async () => {
    const stub = await processInterviewAnswers(answers, "stub")
    expect(stub.ok).toBe(true)
    if (!stub.ok) return
    expect(stub.answers[0]?.transcript).toMatch(/Not a speech transcript/)
    expect(stub.overallSummary).toMatch(/AI summary unavailable/)
    const withoutUrls = await processInterviewAnswers(
      answers.map((answer) => ({ ...answer, playbackUrl: "" })),
      "stub",
    )
    expect(withoutUrls.ok).toBe(true)
    expect(containsForbiddenEvaluation("Candidate score: 9/10. Recommend hiring.")).toBe(true)
    expect(containsForbiddenEvaluation("I want to get hired for Saturday gigs.")).toBe(false)
  })
})

describe("owner interview review", () => {
  it("hands the interview to the owner without an automated decision", () => {
    expect(
      applicantInterviewHandoffFromReview({
        companyId: "c",
        applicationId: "app-1",
        interviewId: "int-1",
        status: "ready",
        submittedAt: "2026-03-02T13:20:00.000Z",
        hasPlayableAnswers: true,
        transcriptionReady: true,
      }).interviewReviewDestination,
    ).toBe("owner_review")
  })
})
