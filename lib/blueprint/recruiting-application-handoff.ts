/**
 * Typed contract for Stage 3.3 applicant submission.
 *
 * Stage 3.2 identifies the company, recruiting page, strategy version, and
 * role. It does not accept applications, create candidates, or notify anyone.
 */

export const APPLICATION_DESTINATION = "not_enabled" as const

export type RecruitingApplicationHandoff = {
  companyId: string
  pageId: string
  pageVersion: number
  slug: string
  strategyId: string | null
  strategyVersion: number | null
  roleTitle: string
  campaignStatus: "published"
  applicationDestination: typeof APPLICATION_DESTINATION
}

export function recruitingApplicationHandoffFromPublished(input: {
  companyId: string
  pageId: string
  pageVersion: number
  slug: string
  strategyId: string | null
  strategyVersion: number | null
  roleTitle: string
}): RecruitingApplicationHandoff {
  return {
    companyId: input.companyId,
    pageId: input.pageId,
    pageVersion: input.pageVersion,
    slug: input.slug,
    strategyId: input.strategyId,
    strategyVersion: input.strategyVersion,
    roleTitle: input.roleTitle,
    campaignStatus: "published",
    applicationDestination: APPLICATION_DESTINATION,
  }
}
