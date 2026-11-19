import Link from "next/link"

import { Card, Chip, Fact } from "@/components/blueprint"
import { ApplicantNoteForm, ApplicantStageForm } from "@/app/applicant-forms"
import {
  APPLICANT_STAGE_LABELS,
  applicantDisplayName,
  type ApplicantProfile,
  type ApplicantStage,
} from "@/lib/blueprint/applicants"

const STAGE_CHIP: Record<ApplicantStage, "sky" | "butter" | "lavender" | "blush" | "mint" | "danger"> = {
  new_application: "sky",
  screening: "butter",
  interview: "lavender",
  decision: "blush",
  hired: "mint",
  rejected: "danger",
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US")
}

export function ApplicantProfileView({
  companyName,
  profile,
}: {
  companyName: string
  profile: ApplicantProfile
}) {
  return (
    <>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-applicant-profile={profile.applicationId}>
        <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
          Back to applicants
        </Link>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{applicantDisplayName(profile)}</h1>
          <Chip tone={STAGE_CHIP[profile.stage]}>{APPLICANT_STAGE_LABELS[profile.stage]}</Chip>
        </div>
        <p className="bp-type-lead max-w-[620px] text-ink-2">
          Applied {when(profile.submittedAt)} for {profile.roleTitle}.
        </p>
      </section>
      <Card as="section" aria-labelledby="applicant-contact-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="applicant-contact-title" className="bp-card__title">
          Contact
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Fact label="Email" value={profile.email} />
          <Fact label="Phone" value={profile.phone} />
          <Fact label="Location" value={profile.location} />
          <Fact label="Campaign" value={`${profile.roleTitle} · /join/${profile.slug}`} />
        </div>
      </Card>
      <Card as="section" aria-labelledby="applicant-answers-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="applicant-answers-title" className="bp-card__title">
          Application answers
        </h2>
        <p className="bp-card__body">These answers stay as submitted, even if you later change the recruiting page.</p>
        <Fact label="Availability" value={profile.answers.availability} />
        <Fact label="Experience" value={profile.answers.experience} />
        <Fact label="Why this company" value={profile.answers.motivation} />
        {profile.answers.ownerQuestions.map((row) => (
          <Fact key={row.prompt} label={row.prompt} value={row.answer} />
        ))}
      </Card>
      <Card as="section" aria-labelledby="applicant-stage-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="applicant-stage-title" className="bp-card__title">
          Pipeline stage
        </h2>
        <p className="bp-card__body">Move people when you have reviewed them. There is no required path.</p>
        <ApplicantStageForm applicationId={profile.applicationId} stage={profile.stage} />
      </Card>
      <Card as="section" aria-labelledby="applicant-notes-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="applicant-notes-title" className="bp-card__title">
          Private notes
        </h2>
        {profile.notes.length === 0 ? (
          <p className="bp-card__body">No notes yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {profile.notes.map((note) => (
              <li key={note.id} className="grid gap-1" data-applicant-note={note.id}>
                <p className="m-0 text-[14px] text-ink">{note.body}</p>
                <p className="m-0 text-[13px] text-muted">{when(note.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
        <ApplicantNoteForm applicationId={profile.applicationId} />
      </Card>
      <Card as="section" aria-labelledby="applicant-history-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="applicant-history-title" className="bp-card__title">
          Stage history
        </h2>
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {profile.history.map((event) => (
            <li key={event.id} className="text-[14px] text-muted" data-applicant-history={event.id}>
              {event.fromStage
                ? `${APPLICANT_STAGE_LABELS[event.fromStage]} → ${APPLICANT_STAGE_LABELS[event.toStage]}`
                : `Entered ${APPLICANT_STAGE_LABELS[event.toStage]}`}
              <span className="block text-[13px]">{when(event.changedAt)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </>
  )
}
