import { createClient } from "@/lib/supabase/server"
import { getCurrentMembership } from "@/lib/tenancy/queries"

import { AuthLinks } from "./auth-links"
import { CreateCompanyForm } from "./create-company-form"
import { SignOutButton } from "./sign-out-button"

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const signedIn = Boolean(data?.claims)
  const membership = signedIn ? await getCurrentMembership() : null

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Blueprint</h1>

      {!signedIn ? (
        <>
          <p>Sign in or create an account to start a company.</p>
          <AuthLinks />
        </>
      ) : membership ? (
        <>
          <p>
            Company: <strong>{membership.companyName}</strong>
          </p>
          <p>
            Role: <strong>{membership.role}</strong>
          </p>
          <SignOutButton />
        </>
      ) : (
        <>
          <p>You do not belong to a company yet.</p>
          <CreateCompanyForm />
          <SignOutButton />
        </>
      )}
    </main>
  )
}
