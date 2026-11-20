import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, Chip } from "@/components/blueprint"
import { TopNav } from "@/components/blueprint"
import { SignOutButton } from "@/app/sign-out-button"
import {
  ENROLLMENT_SOURCE_LABELS,
  ENROLLMENT_STATUS_LABELS,
  TRAINING_NO_ASSIGNMENTS,
  TRAINING_TRAINEE_OPENING,
  TRAINING_TRAINEE_TITLE,
} from "@/lib/blueprint/training-enrollment"
import { loadTraineeEnrollments } from "@/lib/blueprint/training-enrollment-store"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export const dynamic = "force-dynamic"

export default async function TraineeTrainingPage() {
  const membership = await getCurrentMembership()
  if (!membership) redirect("/sign-in")
  const supabase = await createClient()
  const enrollments = await loadTraineeEnrollments(supabase)
  return (
    <>
      <TopNav actions={<SignOutButton />} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
        <section className="flex flex-col gap-3 pt-7 md:pt-12" data-trainee-training="">
          <Link href="/" className="bp-link self-start font-bold">
            Back home
          </Link>
          <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{TRAINING_TRAINEE_TITLE}</h1>
          <p className="bp-type-lead max-w-[620px] text-ink-2">{TRAINING_TRAINEE_OPENING}</p>
        </section>
        <Card as="section" aria-labelledby="assigned-title">
          <h2 id="assigned-title" className="bp-card__title">
            Assigned training
          </h2>
          <div data-trainee-assignments="">
          {enrollments.length === 0 ? <p className="bp-card__body">{TRAINING_NO_ASSIGNMENTS}</p> : null}
          <ul className="m-0 grid list-none gap-4 p-0">
            {enrollments.map((row) => (
              <li key={row.id} className="grid gap-1 border-t border-line pt-4 first:border-t-0 first:pt-0" data-trainee-enrollment={row.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="m-0 font-bold text-ink">{row.contentTitle}</p>
                  <Chip tone="mint">{ENROLLMENT_STATUS_LABELS[row.status]}</Chip>
                </div>
                <p className="m-0 text-[14px] text-muted">
                  {row.targetKind === "path" ? "Path" : "Course"} v{row.contentVersion} · {ENROLLMENT_SOURCE_LABELS[row.source]}
                </p>
              </li>
            ))}
          </ul>
          </div>
        </Card>
      </main>
    </>
  )
}
