import { createClient } from "@/lib/supabase/server"

export type CurrentMembership = {
  companyId: string
  companyName: string
  role: string
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims) {
    return null
  }

  const { data, error } = await supabase
    .from("company_memberships")
    .select("role, status, companies ( id, name )")
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (error || !data?.companies) {
    return null
  }

  const company = Array.isArray(data.companies) ? data.companies[0] : data.companies

  if (!company) {
    return null
  }

  return {
    companyId: company.id,
    companyName: company.name,
    role: data.role,
  }
}
