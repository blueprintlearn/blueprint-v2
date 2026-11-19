import Link from "next/link"

import { InterviewTemplateForm } from "@/app/interview-forms"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { Card } from "@/components/blueprint"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import {
  DEFAULT_INTERVIEW_QUESTIONS,
  INTERVIEW_DEADLINE_DEFAULT,
  INTERVIEW_INVITE_HELP,
  INTERVIEW_RETENTION_DEFAULT,
  INTERVIEW_SETUP_OPENING,
  INTERVIEW_SETUP_TITLE,
} from "@/lib/blueprint/interviews"
import { loadInterviewTemplate } from "@/lib/blueprint/interview-store"
import { loadRecruitingRows } from "@/lib/blueprint/recruiting-store"
import { createClient } from "@/lib/supabase/server"

export default async function InterviewSetupPage() {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, membership.companyId)
  const published = rows.find((row) => row.status === "published") ?? rows.find((row) => row.status === "unpublished")
  const slug = published?.slug ?? "company-campaign"
  const saved = await loadInterviewTemplate(supabase, membership.companyId, slug)
  const template = saved ?? {
    slug,
    questions: DEFAULT_INTERVIEW_QUESTIONS,
    deadlineDays: INTERVIEW_DEADLINE_DEFAULT,
    retentionDays: INTERVIEW_RETENTION_DEFAULT,
  }

  return (
    <BlueprintShell>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-interview-setup="">
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint/recruiting" className="bp-link self-start font-bold">
            Back to job ads
          </Link>
          <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
            Review applicants
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{INTERVIEW_SETUP_TITLE}</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{INTERVIEW_SETUP_OPENING}</p>
      </section>
      <Card as="section" aria-labelledby="interview-questions-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="interview-questions-title" className="bp-card__title">
          Questions for /join/{slug}
        </h2>
        <p className="bp-card__body">{INTERVIEW_INVITE_HELP}</p>
        <InterviewTemplateForm template={template} />
        <p className="mt-4">
          <Link href="/blueprint/recruiting/interview/preview" className="bp-link font-bold">
            Preview applicant interview
          </Link>
        </p>
      </Card>
    </BlueprintShell>
  )
}
