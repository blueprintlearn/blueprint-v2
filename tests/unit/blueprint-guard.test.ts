import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  membership: null as null | { companyId: string; companyName: string; role: string },
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`)
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND")
  }),
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirect, notFound: mocks.notFound }))
vi.mock("@/lib/tenancy/queries", () => ({ getCurrentMembership: async () => mocks.membership }))
vi.mock("@/lib/blueprint/queries", () => ({
  getCurrentOwnerGoal: async () => null,
  getCurrentTeamToday: async () => null,
}))

import { requireGuidedOwner } from "@/lib/blueprint/guard"

const A = "00000000-0000-4000-8000-0000000000a1"
const B = "00000000-0000-4000-8000-0000000000b1"
const member = (companyId: string, role: string) => ({ companyId, companyName: "Co", role })

beforeEach(() => {
  mocks.redirect.mockClear()
  mocks.notFound.mockClear()
  mocks.membership = null
  process.env.BLUEPRINT_GUIDED_COMPANY_IDS = A
})

describe("requireGuidedOwner", () => {
  it("sends signed-out visitors and people without a company to /", async () => {
    await expect(requireGuidedOwner()).rejects.toThrow("REDIRECT:/")
    expect(mocks.notFound).not.toHaveBeenCalled()
  })

  it("lets the owner of a switched-on company in", async () => {
    mocks.membership = member(A, "owner_admin")
    await expect(requireGuidedOwner()).resolves.toMatchObject({ companyId: A })
  })

  it("is not found for every role when the switch is off for their company", async () => {
    for (const role of ["owner_admin", "manager", "trainer_mentor", "dj_trainee"]) {
      mocks.membership = member(B, role)
      await expect(requireGuidedOwner()).rejects.toThrow("NOT_FOUND")
    }
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it("is not found for everyone when the variable is unset", async () => {
    delete process.env.BLUEPRINT_GUIDED_COMPANY_IDS
    mocks.membership = member(A, "owner_admin")
    await expect(requireGuidedOwner()).rejects.toThrow("NOT_FOUND")
  })

  it("sends non-owners of a switched-on company to /", async () => {
    for (const role of ["manager", "trainer_mentor", "dj_trainee", "applicant"]) {
      mocks.membership = member(A, role)
      await expect(requireGuidedOwner()).rejects.toThrow("REDIRECT:/")
    }
    expect(mocks.notFound).not.toHaveBeenCalled()
  })
})
