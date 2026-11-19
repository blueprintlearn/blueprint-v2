import Link from "next/link"

import { EvaluationTemplateForm } from "@/app/candidate-review-forms"
import { BlueprintShell } from "@/app/blueprint/blueprint-ui"
import { Card } from "@/components/blueprint"
import {
  COMPANY_EVALUATION_SLUG,
  DEFAULT_EVALUATION_CATEGORIES,
  SCORECARD_OPENING,
  SCORECARD_TITLE,
} from "@/lib/blueprint/candidate-review"
import { loadEvaluationTemplate } from "@/lib/blueprint/candidate-review-store"
import { loadGuidedBlueprint, requireGuidedOwner } from "@/lib/blueprint/guard"
import { loadRecruitingRows } from "@/lib/blueprint/recruiting-store"
import { createClient } from "@/lib/supabase/server"

export default async function EvaluationScorecardPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>
}) {
  const membership = await requireGuidedOwner()
  await loadGuidedBlueprint()
  const params = await searchParams
  const supabase = await createClient()
  const rows = await loadRecruitingRows(supabase, membership.companyId)
  const campaigns = [
    { slug: COMPANY_EVALUATION_SLUG, label: "Company default" },
    ...[...new Map(rows.map((row) => [row.slug, `${row.page.roleTitle} · /join/${row.slug}`])).entries()].map(
      ([slug, label]) => ({ slug, label }),
    ),
  ]
  const requested = typeof params.slug === "string" ? params.slug : ""
  const slug = campaigns.some((campaign) => campaign.slug === requested)
    ? requested
    : COMPANY_EVALUATION_SLUG
  const saved = await loadEvaluationTemplate(supabase, membership.companyId, slug)
  const template = saved ?? {
    slug,
    categories: [...DEFAULT_EVALUATION_CATEGORIES],
  }

  return (
    <BlueprintShell>
      <section className="flex flex-col gap-3 pt-7 md:pt-12" data-scorecard-setup="">
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
            Back to applicants
          </Link>
          <Link href="/blueprint/recruiting/interview" className="bp-link self-start font-bold">
            Video interview questions
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
        <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{SCORECARD_TITLE}</h1>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{SCORECARD_OPENING}</p>
      </section>
      <Card as="section" aria-labelledby="scorecard-categories-title" className="max-w-[900px] max-[760px]:p-[22px]!">
        <h2 id="scorecard-categories-title" className="bp-card__title">
          Categories you rate
        </h2>
        <p className="bp-card__body">
          Editing {campaigns.find((campaign) => campaign.slug === slug)?.label ?? "Company default"}. Saving
          here does not change evaluations already recorded. Those keep the categories from the day you first
          saved them.
        </p>
        <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
          {campaigns.map((campaign) => (
            <li key={campaign.slug}>
              <Link
                href={
                  campaign.slug === COMPANY_EVALUATION_SLUG
                    ? "/blueprint/recruiting/scorecard"
                    : `/blueprint/recruiting/scorecard?slug=${campaign.slug}`
                }
                className="bp-link font-bold"
              >
                {campaign.label}
              </Link>
            </li>
          ))}
        </ul>
        <EvaluationTemplateForm template={template} />
      </Card>
    </BlueprintShell>
  )
}
