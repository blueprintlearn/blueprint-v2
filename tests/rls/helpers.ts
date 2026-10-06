import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

export const SEED_PASSWORD = "blueprint-local-password"
export const COMPANY_A_ID = "00000000-0000-4000-8000-0000000000a1"
export const COMPANY_B_ID = "00000000-0000-4000-8000-0000000000b1"
export const OWNER_A_EMAIL = "owner-a@blueprint.test"
export const OWNER_B_EMAIL = "owner-b@blueprint.test"

export function createAnonClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getPublicEnv()
  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function asUser(email: string, password = SEED_PASSWORD) {
  const client = createAnonClient()
  const { error } = await client.auth.signInWithPassword({ email, password })

  if (error) {
    throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  }

  return client
}
