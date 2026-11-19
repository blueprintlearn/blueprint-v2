/**
 * Transcription and summaries run in the owner session after submit.
 * Fail closed when no provider is configured. Never invent speech.
 */

import { containsForbiddenEvaluation } from "@/lib/blueprint/interviews"

export const TRANSCRIBE_NOT_CONFIGURED =
  "Transcription is not configured. The video is saved. Retry after a provider is approved."
export const TRANSCRIBE_FAILED = "Transcription failed. The video is saved. You can retry."
export const SUMMARY_FAILED = "A summary could not be written from this transcript."
export const FORBIDDEN_EVALUATION = "The generated text included an evaluation. It was discarded."

export const STUB_TRANSCRIPT =
  "[Not a speech transcript] This local test environment stored the video and did not send audio to a model."
export const STUB_SUMMARY = "[AI summary unavailable] No model ran. Watch the original video."

export type TranscribeMode = "none" | "stub"

export type InterviewAnswerInput = {
  questionIndex: number
  prompt: string
  playbackUrl: string
}

export type ProcessedAnswer = {
  questionIndex: number
  transcript: string
  summary: string
}

export type ProcessResult =
  | { ok: true; answers: ProcessedAnswer[]; overallSummary: string }
  | { ok: false; error: string; answers: ProcessedAnswer[] }

export function interviewTranscribeMode(source?: Record<string, string | undefined>): TranscribeMode {
  const value = source?.BLUEPRINT_INTERVIEW_TRANSCRIBE ?? process.env.BLUEPRINT_INTERVIEW_TRANSCRIBE
  return value === "stub" ? "stub" : "none"
}

function wrapUntrusted(label: string, text: string): string {
  return `${label}:\n<<<\n${text}\n>>>`
}

export async function transcribeAnswer(
  input: InterviewAnswerInput,
  mode: TranscribeMode = interviewTranscribeMode(),
): Promise<{ ok: true; transcript: string } | { ok: false; error: string }> {
  if (mode === "stub") return { ok: true, transcript: STUB_TRANSCRIPT }
  if (!input.playbackUrl) return { ok: false, error: TRANSCRIBE_FAILED }
  return { ok: false, error: TRANSCRIBE_NOT_CONFIGURED }
}

export async function summarizeTranscript(
  input: { prompt: string; transcript: string; overall?: boolean },
  mode: TranscribeMode = interviewTranscribeMode(),
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  if (mode === "none") return { ok: false, error: TRANSCRIBE_NOT_CONFIGURED }
  const text = input.overall
    ? "The applicant recorded answers to three questions. No model summarized them."
    : `The applicant answered “${input.prompt}”. No model summarized the recording.`
  const summary = mode === "stub" ? STUB_SUMMARY : text
  if (containsForbiddenEvaluation(summary)) return { ok: false, error: FORBIDDEN_EVALUATION }
  return { ok: true, summary }
}

export async function processInterviewAnswers(
  answers: InterviewAnswerInput[],
  mode: TranscribeMode = interviewTranscribeMode(),
): Promise<ProcessResult> {
  const processed: ProcessedAnswer[] = []
  if (answers.length !== 3) {
    return { ok: false, error: TRANSCRIBE_FAILED, answers: processed }
  }
  if (mode !== "stub" && answers.some((answer) => !answer.playbackUrl)) {
    return { ok: false, error: TRANSCRIBE_FAILED, answers: processed }
  }

  for (const answer of answers) {
    const transcript = await transcribeAnswer(answer, mode)
    if (!transcript.ok) return { ok: false, error: transcript.error, answers: processed }
    const summary = await summarizeTranscript({ prompt: answer.prompt, transcript: transcript.transcript }, mode)
    if (!summary.ok) return { ok: false, error: summary.error, answers: processed }
    processed.push({
      questionIndex: answer.questionIndex,
      transcript: transcript.transcript,
      summary: summary.summary,
    })
  }

  const overallSource = processed
    .map(
      (answer, index) =>
        `Question ${index + 1}: ${answers[index]?.prompt ?? ""}\n${wrapUntrusted("Applicant transcript", answer.transcript)}`,
    )
    .join("\n\n")
  const overall = await summarizeTranscript({ prompt: "overall", transcript: overallSource, overall: true }, mode)
  if (!overall.ok) return { ok: false, error: overall.error, answers: processed }
  if (containsForbiddenEvaluation(overall.summary) || processed.some((row) => containsForbiddenEvaluation(row.summary))) {
    return { ok: false, error: FORBIDDEN_EVALUATION, answers: processed }
  }
  return { ok: true, answers: processed, overallSummary: overall.summary }
}
