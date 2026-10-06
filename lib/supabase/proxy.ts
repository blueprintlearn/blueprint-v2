import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getPublicEnv } from "@/lib/env"
import type { Database } from "@/types/database"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { url, publishableKey } = getPublicEnv()

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        if (headers) {
          for (const header of ["cache-control", "expires", "pragma"] as const) {
            const value = headers[header] ?? headers[header.toUpperCase()]
            if (value) {
              supabaseResponse.headers.set(header, value)
            }
          }
        }
      },
    },
  })

  await supabase.auth.getClaims()

  return supabaseResponse
}
