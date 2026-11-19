import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy notice · Blueprint recruiting",
}

export default function PrivacyNoticePage() {
  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-10 md:px-8 md:py-16">
      <p className="bp-type-small font-bold! text-muted">Blueprint</p>
      <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">Privacy notice for job applications</h1>
      <p className="bp-type-lead text-ink-2">
        This notice covers applications submitted on a Blueprint-hosted recruiting page. It does not cover a DJ
        company’s own website, ads, or other tools.
      </p>
      <section className="grid gap-3">
        <h2 className="m-0 text-[20px] font-bold text-ink">Who receives your application</h2>
        <p className="m-0 text-[16px] text-ink-2">
          You apply to the company named on the recruiting page. That company can read your answers, contact details,
          and later notes they write. Other companies on Blueprint cannot see your application.
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="m-0 text-[20px] font-bold text-ink">What we collect</h2>
        <p className="m-0 text-[16px] text-ink-2">
          Name, email, phone, general location, availability, experience, why you want the role, answers to extra
          questions the company asked, and that you agreed to this notice. We do not ask for a Social Security number,
          birth date, or other unnecessary sensitive information.
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="m-0 text-[20px] font-bold text-ink">How it is used</h2>
        <p className="m-0 text-[16px] text-ink-2">
          The company uses your application to review you for the role you applied to. Blueprint does not sell applicant
          information, post your application publicly, or automatically reject you.
        </p>
      </section>
      <section className="grid gap-3">
        <h2 className="m-0 text-[20px] font-bold text-ink">Accounts</h2>
        <p className="m-0 text-[16px] text-ink-2">
          You do not need a Blueprint account to apply. Submitting an application does not create a login.
        </p>
      </section>
      <p className="m-0 text-[14px] text-muted">
        Questions about a specific application should go to the company named on the recruiting page.
      </p>
      <Link href="/" className="bp-link self-start font-bold">
        Back to Blueprint
      </Link>
    </main>
  )
}
