import { Card } from "@/components/blueprint"
import { InterviewRecorder } from "@/app/interview-recorder"
import {
  INTERVIEW_EXPIRED,
  INTERVIEW_INVALID,
  INTERVIEW_RESUME,
  INTERVIEW_SUBMITTED,
  mapInterviewRpcError,
  type ApplicantInterviewSession,
} from "@/lib/blueprint/interviews"

export function InterviewUnavailable({ reason }: { reason: "expired" | "invalid" | "unavailable" }) {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Video interview</h1>
      <p className="bp-type-lead" data-interview-error={reason}>
        {reason === "expired" ? INTERVIEW_EXPIRED : reason === "unavailable" ? mapInterviewRpcError("unavailable") : INTERVIEW_INVALID}
      </p>
    </main>
  )
}

export function InterviewApplicantView({
  token,
  session,
  preview = false,
}: {
  token?: string
  session: ApplicantInterviewSession
  preview?: boolean
}) {
  const submitted =
    session.status === "submitted" ||
    session.status === "transcribing" ||
    session.status === "ready" ||
    session.status === "failed"
  const resuming = session.acceptedIndexes.length > 0 && !submitted
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      {preview ? (
        <p className="m-0 rounded-md bg-surface-soft px-3 py-2 text-[14px] text-muted" data-interview-preview="">
          Preview only. Recordings are not uploaded.
        </p>
      ) : null}
      <p className="bp-type-small font-bold! text-muted">{session.companyName}</p>
      <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Video interview</h1>
      <p className="bp-type-lead max-w-[620px] text-ink-2">
        {session.roleTitle}. One question at a time. You can practice and record again before you submit.
      </p>
      <Card as="section" aria-labelledby="interview-record-title">
        <h2 id="interview-record-title" className="bp-card__title">
          Record your answers
        </h2>
        {submitted ? (
          <p className="bp-card__body" data-interview-complete="">
            {INTERVIEW_SUBMITTED}
          </p>
        ) : (
          <>
            {resuming ? <p className="bp-card__body">{INTERVIEW_RESUME}</p> : null}
            <InterviewRecorder token={token} session={session} mode={preview ? "preview" : "live"} />
          </>
        )}
      </Card>
    </main>
  )
}
