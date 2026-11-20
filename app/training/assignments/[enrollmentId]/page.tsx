import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { TopNav } from "@/components/blueprint"
import { SignOutButton } from "@/app/sign-out-button"
import { TraineeAssignedView } from "@/app/training-viewer-ui"
import { loadAssignedTrainingView } from "@/lib/blueprint/training-viewer-store"
import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

export const dynamic = "force-dynamic"

export default async function AssignedTrainingPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  const membership = await getCurrentMembership()
  if (!membership) redirect("/sign-in")
  const { enrollmentId } = await params
  const supabase = await createClient()
  const view = await loadAssignedTrainingView(supabase, enrollmentId)
  if (!view) notFound()

  return (
    <>
      <TopNav actions={<SignOutButton />} />
      <main className="mx-auto flex w-full max-w-[1240px] flex-1 flex-col gap-8 px-4 pb-11 md:gap-12 md:px-8 md:pb-16">
        <section className="flex flex-col gap-3 pt-7 md:pt-12">
          <Link href="/training" className="bp-link self-start font-bold">
            Back to your training
          </Link>
          <p className="bp-type-small font-bold! text-muted">{membership.companyName}</p>
          <h1 className="bp-type-display-xl max-[760px]:text-[46px]!">{view.title}</h1>
        </section>
        <TraineeAssignedView view={view} />
      </main>
    </>
  )
}
