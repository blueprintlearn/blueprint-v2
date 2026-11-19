import Link from "next/link"

import { Card, Chip, StatusTag } from "@/components/blueprint"
import { ApplicantBoardFilters, ApplicantStageForm } from "@/app/applicant-forms"
import {
  APPLICANT_STAGE_LABELS,
  APPLICANT_STAGES,
  APPLICANTS_EMPTY,
  APPLICANTS_OPENING,
  APPLICANTS_PAGE_TITLE,
  applicantDisplayName,
  cardsByStage,
  type ApplicantBoard,
  type ApplicantCard,
  type ApplicantStage,
} from "@/lib/blueprint/applicants"
import {
  APPLICANT_REVIEW_STATUS_LABELS,
  EVALUATION_STATUS_LABELS,
  FOLLOW_UP_ACTION_LABELS,
  OWNER_DECISION_LABELS,
  followUpIsOutstanding,
} from "@/lib/blueprint/candidate-review"
import {
  auditionStatusChipLabel,
  checklistChipLabel,
  conversationStatusChipLabel,
  hiringPathChipLabel,
} from "@/lib/blueprint/hiring-workflow"
import { trainingReadinessChipLabel } from "@/lib/blueprint/training-preparation"
import { INTERVIEW_STATUS_LABELS, interviewStatusTone } from "@/lib/blueprint/interviews"

const STAGE_CHIP: Record<ApplicantStage, "sky" | "butter" | "lavender" | "blush" | "mint" | "danger"> = {
  new_application: "sky",
  screening: "butter",
  interview: "lavender",
  decision: "blush",
  hired: "mint",
  rejected: "danger",
}

function submittedLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function ApplicantCardView({ card }: { card: ApplicantCard }) {
  return (
    <article
      className="grid gap-3 rounded-[18px] bg-surface p-4 shadow-[var(--shadow-card)]"
      data-applicant-card={card.applicationId}
      data-applicant-stage={card.stage}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link href={`/blueprint/applicants/${card.applicationId}`} className="bp-link font-bold">
          {applicantDisplayName(card)}
        </Link>
        <Chip tone={STAGE_CHIP[card.stage]}>{APPLICANT_STAGE_LABELS[card.stage]}</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        <span data-review-status={card.reviewStatus}>
          <Chip tone={card.reviewStatus === "reviewed" ? "mint" : "butter"}>
            {APPLICANT_REVIEW_STATUS_LABELS[card.reviewStatus]}
          </Chip>
        </span>
        <span data-interview-status={card.interviewStatus}>
          <Chip tone={interviewStatusTone(card.interviewStatus)}>
            {INTERVIEW_STATUS_LABELS[card.interviewStatus]}
          </Chip>
        </span>
        <span data-evaluation-status={card.evaluationStatus}>
          <Chip
            tone={
              card.evaluationStatus === "complete"
                ? "mint"
                : card.evaluationStatus === "incomplete"
                  ? "butter"
                  : "neutral"
            }
          >
            {EVALUATION_STATUS_LABELS[card.evaluationStatus]}
          </Chip>
        </span>
        {card.latestDecision ? (
          <span data-latest-decision={card.latestDecision}>
            <Chip
              tone={
                card.latestDecision === "hired"
                  ? "mint"
                  : card.latestDecision === "reject"
                    ? "danger"
                    : card.latestDecision === "hold"
                      ? "butter"
                      : "sky"
              }
            >
              {OWNER_DECISION_LABELS[card.latestDecision]}
            </Chip>
          </span>
        ) : null}
        {followUpIsOutstanding(card.followUp) ? (
          <span data-follow-up={card.followUp?.action}>
            <Chip tone="lavender">{FOLLOW_UP_ACTION_LABELS[card.followUp!.action]}</Chip>
          </span>
        ) : null}
        <span data-hiring-path={card.hiringPath}>
          <Chip tone="lavender">{hiringPathChipLabel(card.hiringPath)}</Chip>
        </span>
        {card.nextActivityTitle ? (
          <span data-next-activity="">
            <Chip tone="butter">{card.nextActivityTitle}</Chip>
          </span>
        ) : null}
        <span data-conversation-status={card.conversationStatus}>
          <Chip tone={card.conversationStatus === "completed" ? "mint" : card.conversationStatus === "planned" ? "sky" : "neutral"}>
            {conversationStatusChipLabel(card.conversationStatus)}
          </Chip>
        </span>
        <span data-audition-status={card.auditionStatus}>
          <Chip tone={card.auditionStatus === "completed" ? "mint" : card.auditionStatus === "planned" ? "sky" : "neutral"}>
            {auditionStatusChipLabel(card.auditionStatus)}
          </Chip>
        </span>
        <span data-hiring-checklist={`${card.checklistComplete}/${card.checklistTotal}`}>
          <Chip tone={card.checklistComplete === card.checklistTotal && card.checklistTotal > 0 ? "mint" : "neutral"}>
            {checklistChipLabel(card.checklistComplete, card.checklistTotal)}
          </Chip>
        </span>
        {card.stage === "hired" ? (
          <span data-training-readiness={card.trainingReadiness}>
            <Chip
              tone={
                card.trainingReadiness === "ready"
                  ? "mint"
                  : card.trainingReadiness === "draft"
                    ? "butter"
                    : "neutral"
              }
            >
              {trainingReadinessChipLabel(card.trainingReadiness)}
            </Chip>
          </span>
        ) : null}
      </div>
      <p className="m-0 text-[14px] text-muted">{card.roleTitle}</p>
      <p className="m-0 text-[13px] text-muted">Applied {submittedLabel(card.submittedAt)}</p>
      <ApplicantStageForm applicationId={card.applicationId} stage={card.stage} compact />
    </article>
  )
}

export function ApplicantsBoardView({
  companyName,
  board,
  query,
  campaignId,
  stage,
  review,
  followUp,
}: {
  companyName: string
  board: ApplicantBoard
  query: string
  campaignId: string
  stage: string
  review: string
  followUp: boolean
}) {
  const grouped = cardsByStage(board.cards)
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-applicants="">
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint/recruiting" className="bp-link self-start font-bold">
            Back to job ads
          </Link>
          <Link href="/blueprint/recruiting/interview" className="bp-link self-start font-bold">
            Video interview questions
          </Link>
          <Link href="/blueprint/recruiting/scorecard" className="bp-link self-start font-bold">
            Evaluation categories
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{APPLICANTS_PAGE_TITLE}</h1>
          <StatusTag
            status={board.cards.length ? "progress" : "planned"}
            label={board.cards.length ? `${board.cards.length} in pipeline` : "Empty"}
          />
        </div>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{APPLICANTS_OPENING}</p>
        <ApplicantBoardFilters
          query={query}
          campaignId={campaignId}
          stage={stage}
          review={review}
          followUp={followUp}
          campaigns={board.campaigns}
        />
      </section>
      {board.cards.length === 0 ? (
        <Card as="section" aria-labelledby="applicants-empty-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="applicants-empty-title" className="bp-card__title">
            No applicants yet
          </h2>
          <p className="bp-card__body">{APPLICANTS_EMPTY}</p>
        </Card>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" data-applicant-board="">
          <div className="flex min-w-[1100px] gap-4 pb-4 md:min-w-0 md:gap-3">
            {APPLICANT_STAGES.map((stage) => (
              <section
                key={stage}
                className="flex w-[220px] shrink-0 flex-col gap-3 rounded-[22px] bg-surface-soft p-3 md:w-auto md:flex-1"
                data-applicant-column={stage}
                aria-labelledby={`kanban-${stage}`}
              >
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <h2 id={`kanban-${stage}`} className="m-0 text-[14px] font-bold text-ink">
                    {APPLICANT_STAGE_LABELS[stage]}
                  </h2>
                  <span className="text-[13px] text-muted">{grouped[stage].length}</span>
                </div>
                {grouped[stage].length === 0 ? (
                  <p className="m-0 px-1 text-[13px] text-muted">None</p>
                ) : (
                  grouped[stage].map((card) => <ApplicantCardView key={card.applicationId} card={card} />)
                )}
              </section>
            ))}
          </div>
        </div>
      )}
      <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
        <Link href="/blueprint/recruiting" className="bp-btn bp-btn--plain">
          Previous: Job ads
        </Link>
        <Link href="/blueprint" className="bp-btn bp-btn--soft">
          Back to your Blueprint
        </Link>
      </div>
    </>
  )
}
