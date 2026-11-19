import { Card, TenantBrandScope } from "@/components/blueprint"
import { APPLICATIONS_NOT_ENABLED, type RecruitingPageContent } from "@/lib/blueprint/recruiting-engine"

export function JoinRecruitingPage({
  page,
  preview = false,
}: {
  page: RecruitingPageContent
  preview?: boolean
}) {
  return (
    <TenantBrandScope brand={{ primary: page.primaryColor, accent: page.accentColor }}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-[900px] items-center gap-3 px-4 py-4 md:px-8">
          <p className="m-0 text-[18px] font-bold text-ink">{page.companyName}</p>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[900px] flex-1 flex-col gap-8 px-4 py-8 md:px-8 md:py-12">
        {preview ? (
          <p className="m-0 rounded-md bg-surface-soft px-3 py-2 text-[14px] text-muted" data-join-preview="">
            Preview only. This draft is not public.
          </p>
        ) : null}
        <section className="flex flex-col gap-3" data-join-company={page.companyName} data-apply="disabled">
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{page.headline}</h1>
          <p className="bp-type-lead max-w-[620px] text-ink-2">{page.introduction}</p>
        </section>
        <Card as="section" aria-labelledby="join-role-title">
          <h2 id="join-role-title" className="bp-card__title">
            {page.roleTitle}
          </h2>
          <p className="bp-card__body">{page.roleDescription}</p>
        </Card>
        {page.responsibilities.length ? (
          <Card as="section" aria-labelledby="join-duties-title">
            <h2 id="join-duties-title" className="bp-card__title">
              Responsibilities
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
              {page.responsibilities.map((item) => (
                <li key={item} className="text-[14px] text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {page.required.length ? (
          <Card as="section" aria-labelledby="join-required-title">
            <h2 id="join-required-title" className="bp-card__title">
              Required qualifications
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
              {page.required.map((item) => (
                <li key={item} className="text-[14px] text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {page.preferred.length ? (
          <Card as="section" aria-labelledby="join-preferred-title">
            <h2 id="join-preferred-title" className="bp-card__title">
              Preferred qualifications
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
              {page.preferred.map((item) => (
                <li key={item} className="text-[14px] text-muted">
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {page.showCompensation && page.compensation ? (
          <Card as="section" aria-labelledby="join-pay-title">
            <h2 id="join-pay-title" className="bp-card__title">
              Compensation
            </h2>
            <p className="bp-card__body">{page.compensation}</p>
          </Card>
        ) : null}
        {page.arrangement || page.availability || page.travel ? (
          <Card as="section" aria-labelledby="join-details-title">
            <h2 id="join-details-title" className="bp-card__title">
              Role details
            </h2>
            {page.arrangement ? <p className="m-0 text-[14px] text-muted">{page.arrangement}</p> : null}
            {page.availability ? <p className="m-0 text-[14px] text-muted">{page.availability}</p> : null}
            {page.travel ? <p className="m-0 text-[14px] text-muted">{page.travel}</p> : null}
          </Card>
        ) : null}
        {page.values.length ? (
          <Card as="section" aria-labelledby="join-values-title">
            <h2 id="join-values-title" className="bp-card__title">
              Company values
            </h2>
            <ul className="m-0 flex list-disc flex-col gap-2 pl-5">
              {page.values.map((row) => (
                <li key={row.value} className="text-[14px] text-muted">
                  <span className="font-bold text-ink">{row.value}.</span> {row.behavior}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <Card as="section" aria-labelledby="join-apply-title" data-join-apply="closed">
          <h2 id="join-apply-title" className="bp-card__title">
            How to apply
          </h2>
          <p className="bp-card__body">{APPLICATIONS_NOT_ENABLED}</p>
        </Card>
      </main>
    </TenantBrandScope>
  )
}
