/**
 * Typed contract for Stage 3.3 applicant submission from a published page.
 *
 * Published pages accept applications through the Blueprint-hosted form.
 * Drafts, unpublished pages, and owner previews stay closed.
 */

export const APPLICATION_DESTINATION = "blueprint_form" as const
export const APPLICATION_DESTINATION_CLOSED = "not_enabled" as const

export type ApplicationDestination =
  | typeof APPLICATION_DESTINATION
  | typeof APPLICATION_DESTINATION_CLOSED

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
