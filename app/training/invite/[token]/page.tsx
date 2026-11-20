import Link from "next/link"
import type { Metadata } from "next"

import { AcceptTrainingInviteForm } from "@/app/training-enrollment-forms"
import { TopNav } from "@/components/blueprint"
import { SignOutButton } from "@/app/sign-out-button"
import { AuthLinks } from "@/app/auth-links"
import { TRAINING_INVITE_HELP, TRAINING_INVITE_TITLE } from "@/lib/blueprint/training-enrollment"
import { loadTrainingInvitation } from "@/lib/blueprint/training-enrollment-store"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type InviteParams = { token: string }

export async function generateMetadata(): Promise<Metadata> {
  return { title: TRAINING_INVITE_TITLE }
}

export default async function TrainingInvitePage({ params }: { params: Promise<InviteParams> }) {
  const { token } = await params
  const supabase = await createClient()
  const invitation = await loadTrainingInvitation(supabase, token)
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  if ("error" in invitation) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
        <h1 className="text-2xl font-semibold">{TRAINING_INVITE_TITLE}</h1>
        <p role="alert">{invitation.error}</p>
        <Link href="/" className="bp-link font-bold">
          Back home
        </Link>
      </main>
    )
  }
  const closed = invitation.status === "revoked" || invitation.status === "cancelled"
  const accepted = invitation.status === "active"
  return (
    <>
      {signedIn ? <TopNav actions={<SignOutButton />} /> : null}
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16" data-training-invite={invitation.status}>
        <h1 className="text-2xl font-semibold">{TRAINING_INVITE_TITLE}</h1>
        <p>
          {invitation.companyName} assigned {invitation.contentTitle}. Sign in as {invitation.inviteEmail} to accept.
        </p>
        <p className="m-0 text-[14px] text-muted">{TRAINING_INVITE_HELP}</p>
        {closed ? <p role="alert">This invitation is no longer valid.</p> : null}
        {accepted ? (
          <Link href="/training" className="bp-link font-bold">
            Open assigned training
          </Link>
        ) : null}
        {!closed && !accepted && !signedIn ? <AuthLinks /> : null}
        {!closed && !accepted && signedIn ? <AcceptTrainingInviteForm token={token} /> : null}
      </main>
    </>
  )
}
