"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const createCompanySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export type CreateCompanyState = {
  error: string | null
}

export async function createCompany(
  _prevState: CreateCompanyState,
  formData: FormData,
): Promise<CreateCompanyState> {
  const parsed = createCompanySchema.safeParse({
    name: formData.get("name"),
  })

  if (!parsed.success) {
    return { error: "Enter a company name between 1 and 80 characters." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("create_company", {
    p_name: parsed.data.name,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { error: null }
}
