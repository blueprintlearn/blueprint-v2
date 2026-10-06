import { describe, expect, it } from "vitest"

import { getPublicEnv } from "@/lib/env"

describe("getPublicEnv", () => {
  it("throws when required public env vars are missing", () => {
    expect(() => getPublicEnv({})).toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    )
  })

  it("returns url and publishable key when both are present", () => {
    expect(
      getPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "publishable-key",
    })
  })
})
