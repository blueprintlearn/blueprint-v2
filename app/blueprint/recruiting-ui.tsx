import Link from "next/link"

import { Card, StatusTag } from "@/components/blueprint"
import {
  RECRUITING_NEED_STRATEGY,
  RECRUITING_NO_APPLY,
  RECRUITING_OPENING,
  RECRUITING_PAGE_TITLE,
  RECRUITING_PUBLISHED,
  RECRUITING_STALE_STRATEGY,
  RECRUITING_UNPUBLISHED,
  materialsFromEditor,
  type RecruitingView,
  type StoredRecruitingPage,
} from "@/lib/blueprint/recruiting"
import {
  RecruitingEditorForm,
  RecruitingRebuildForm,
  RecruitingReviseForm,
  RecruitingUnpublishForm,
} from "../recruiting-form"

const PAGE_TAG: Record<RecruitingView["pageStatus"], { status: "proven" | "progress" | "planned"; label: string }> = {
  published: { status: "proven", label: "Published" },
  unpublished: { status: "progress", label: "Unpublished" },
  draft: { status: "progress", label: "Draft" },
  none: { status: "planned", label: "Not published" },
}

function FrozenPage({ title, page }: { title: string; page: StoredRecruitingPage }) {
  return (
    <Card as="section" aria-labelledby="recruiting-previous-title" className="max-w-[900px] max-[760px]:p-[22px]!">
      <h2 id="recruiting-previous-title" className="bp-card__title">
        {title}
      </h2>
      <p className="bp-card__body">
        Version {page.version}
        {page.publishedAt ? `, published ${new Date(page.publishedAt).toLocaleString("en-US")}` : ""}. This copy was
        not changed.
      </p>
      <p className="m-0 font-bold text-ink">{page.page.headline}</p>
      <p className="m-0 text-[14px] text-muted">{page.page.roleTitle}</p>
    </Card>
  )
}

export function RecruitingMaterialsView({
  companyName,
  view,
}: {
  companyName: string
  view: RecruitingView
}) {
  const tag = PAGE_TAG[view.pageStatus]
  const editor = view.editor ? materialsFromEditor(view.editor) : null
  const readOnly = Boolean(view.published && !view.draft)
  return (
    <>
      <section
        className="flex flex-col gap-3 pt-7 md:pt-12"
        data-recruiting-status={view.pageStatus}
        data-recruiting-strategy={view.strategyStatus}
      >
        <div className="flex flex-wrap gap-4">
          <Link href="/blueprint/recruit" className="bp-link self-start font-bold">
            Back to recruiting strategy
          </Link>
          <Link href="/blueprint/applicants" className="bp-link self-start font-bold">
            Review applicants
          </Link>
        </div>
        <p className="bp-type-small font-bold! text-muted">{companyName}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{RECRUITING_PAGE_TITLE}</h1>
          <StatusTag status={tag.status} label={tag.label} />
        </div>
        <p className="bp-type-lead max-w-[620px] text-ink-2">{RECRUITING_OPENING}</p>
        {view.pageStatus === "published" ? <p className="m-0 text-[14px] text-muted">{RECRUITING_PUBLISHED}</p> : null}
        {view.pageStatus === "unpublished" ? (
          <p className="m-0 text-[14px] text-muted">{RECRUITING_UNPUBLISHED}</p>
        ) : null}
        {view.needsStrategyReview ? (
          <p className="m-0 text-[14px] text-muted" data-recruiting-needs-review="">
            {RECRUITING_STALE_STRATEGY}
          </p>
        ) : null}
        <p className="m-0 text-[14px] text-muted">{RECRUITING_NO_APPLY}</p>
      </section>
      {view.strategyStatus === "missing" ? (
        <Card as="section" aria-labelledby="recruiting-need-strategy" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruiting-need-strategy" className="bp-card__title">
            Recruiting strategy needed
          </h2>
          <p className="bp-card__body">{RECRUITING_NEED_STRATEGY}</p>
          <Link href="/blueprint/recruit" className="bp-btn bp-btn--primary self-start">
            Go to recruiting strategy
          </Link>
        </Card>
      ) : null}
      {view.published ? <FrozenPage title="Live published version" page={view.published} /> : null}
      {view.unpublished && !view.published ? (
        <FrozenPage title="Last unpublished version" page={view.unpublished} />
      ) : null}
      {view.handoff && editor && !readOnly ? (
        <Card as="section" aria-labelledby="recruiting-editor-title" className="max-w-[900px] max-[760px]:p-[22px]!">
          <h2 id="recruiting-editor-title" className="bp-card__title">
            Edit job ads and the recruiting page
          </h2>
          <p className="bp-card__body">
            Change the copy, save a draft, then publish when you want the public URL to go live. Job ads stay here for
            you to copy. Blueprint does not post them.
          </p>
          <p className="m-0 text-[14px] text-muted">
            Public URL: <span data-recruiting-path={view.joinPath}>{view.joinPath}</span>
          </p>
          <Link href="/blueprint/recruiting/preview" className="bp-link self-start font-bold">
            Preview draft
          </Link>
          <RecruitingEditorForm
            page={editor.page}
            ads={editor.ads}
            slug={view.slug}
            joinPath={view.joinPath}
            canPublish
          />
        </Card>
      ) : null}
      {view.handoff && (view.needsStrategyReview || view.draft || view.published) ? <RecruitingRebuildForm /> : null}
      {readOnly ? <RecruitingReviseForm /> : null}
      {view.published ? <RecruitingUnpublishForm /> : null}
      <div id="blueprint-section-footer" className="flex flex-wrap items-center gap-3">
        <Link href="/blueprint/recruit" className="bp-btn bp-btn--plain">
          Previous: Recruiting strategy
        </Link>
        <Link href="/blueprint/applicants" className="bp-btn bp-btn--soft">
          Next: Applicants
        </Link>
        <Link href="/blueprint" className="bp-btn bp-btn--plain">
          Back to your Blueprint
        </Link>
      </div>
    </>
  )
}
