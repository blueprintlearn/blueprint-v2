import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export async function isCurrentTrainingPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: claimsData, error } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (error || typeof userId !== "string" || !userId) return false
  const { data } = await supabase.from("training_platform_admins").select("user_id").eq("user_id", userId).maybeSingle()
  return Boolean(data?.user_id)
}

export async function requireTrainingPlatformAdmin() {
  const supabase = await createClient()
  const { data: claimsData, error } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  if (error || typeof userId !== "string" || !userId) redirect("/")
  const { data } = await supabase.from("training_platform_admins").select("user_id").eq("user_id", userId).maybeSingle()
  if (!data?.user_id) notFound()
  return { supabase, userId }
}
