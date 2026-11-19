/**
 * Deterministic job ads and recruiting-page copy from a current approved
 * Stage 3.1 strategy. Does not invent compensation, benefits, job guarantees,
 * or company claims. Does not post ads or enable applications.
 */

import {
  RECRUIT_EMPLOYMENT_LABELS,
  RECRUIT_PROFILE_LABELS,
  type RecruitEmployment,
  type RecruitProfile,
} from "@/lib/blueprint/recruitment-engine"
import type { RecruitmentStrategyHandoff } from "@/lib/blueprint/recruitment-strategy-handoff"

export const AD_CHANNELS = ["indeed", "social", "referral", "general"] as const
export type AdChannel = (typeof AD_CHANNELS)[number]

export const RECRUITING_ROW_STATUSES = ["draft", "published", "unpublished", "superseded"] as const
export type RecruitingRowStatus = (typeof RECRUITING_ROW_STATUSES)[number]

export const AD_CHANNEL_LABELS: Record<AdChannel, string> = {
  indeed: "Indeed",
  social: "Facebook and Instagram",
  referral: "Referral sharing",
  general: "General job boards",
}

export const HEADLINE_MAX = 120
export const INTRO_MAX = 800
export const ROLE_TITLE_MAX = 80
export const ROLE_DESCRIPTION_MAX = 1200
export const LIST_ITEM_MAX = 200
export const LIST_MAX = 20
export const AD_TITLE_MAX = 80
export const AD_BODY_MAX: Record<AdChannel, number> = {
  indeed: 5000,
  social: 1200,
  referral: 1500,
  general: 3000,
}
export const COMPANY_NAME_MAX = 80
export const SLUG_MIN = 3
export const SLUG_MAX = 48

export const RESERVED_SLUGS = new Set([
  "join",
  "blueprint",
  "sign-in",
  "sign-up",
  "api",
  "auth",
  "admin",
  "www",
  "app",
  "recruit",
  "recruiting",
  "jobs",
  "apply",
  "preview",
  "privacy",
  "applicants",
])

export const APPLICATIONS_NOT_ENABLED =
  "Applications are not open yet. This preview is for reviewing the page. Candidates cannot submit an application here."

export const APPLICATION_QUESTION_MAX = 8
export const APPLICATION_ANSWER_MAX = 2000
export const NAME_MAX = 80
export const EMAIL_MAX = 254
export const PHONE_MAX = 32
export const LOCATION_MAX = 120

export type RecruitingPageContent = {
  companyName: string
  headline: string
  introduction: string
  roleTitle: string
  roleDescription: string
  responsibilities: string[]
  required: string[]
  preferred: string[]
  compensation: string | null
  showCompensation: boolean
  values: { value: string; behavior: string }[]
  arrangement: string | null
  availability: string | null
  travel: string | null
  primaryColor: string | null
  accentColor: string | null
  applicationQuestions: string[]
}

export type JobAd = {
  channel: AdChannel
  title: string
  body: string
}

export type RecruitingAds = Record<AdChannel, JobAd>

export type RecruitingMaterials = {
  page: RecruitingPageContent
  ads: RecruitingAds
}

const DUTY_HINT = /^(available for|able to reach)|is required for this role/i

export function recruitingPublicPath(slug: string): string {
  return `/join/${slug}`
}

export function suggestSlug(companyName: string): string {
  const fromName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
  const base = fromName.length >= SLUG_MIN && !RESERVED_SLUGS.has(fromName) ? fromName : "dj-company"
  return base.slice(0, SLUG_MAX)
}

export function isValidSlug(value: string): boolean {
  return (
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) &&
    value.length >= SLUG_MIN &&
    value.length <= SLUG_MAX &&
    !RESERVED_SLUGS.has(value)
  )
}

export function isValidHexColor(value: string | null): boolean {
  if (value === null || value === "") return true
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function roleTitleFromProfile(profile: RecruitProfile | null): string {
  if (profile === "beginner") return "DJ (training provided)"
  if (profile === "experienced") return "Experienced DJ"
  return "DJ"
}

export function compensationForDisplay(text: string): string | null {
  if (!text || text.startsWith("Not provided")) return null
  return text.replace(" (owner-provided range)", "").replace(" (owner-provided)", "")
}

function arrangementForDisplay(arrangement: string | null): string | null {
  if (!arrangement || arrangement === "unsure") return null
  if (arrangement === "w2" || arrangement === "1099" || arrangement === "either") {
    return RECRUIT_EMPLOYMENT_LABELS[arrangement as RecruitEmployment]
  }
  return null
}

function splitDuties(required: string[]): { responsibilities: string[]; required: string[] } {
  const responsibilities: string[] = []
  const rest: string[] = []
  for (const item of required) {
    if (DUTY_HINT.test(item)) rest.push(item)
    else responsibilities.push(item)
  }
  if (responsibilities.length === 0) {
    return { responsibilities: required.slice(0, LIST_MAX), required: required.slice(0, LIST_MAX) }
  }
  return {
    responsibilities: responsibilities.slice(0, LIST_MAX),
    required: rest.slice(0, LIST_MAX),
  }
}

function availabilityFromRequired(required: string[]): string | null {
  return required.find((item) => item.startsWith("Available for typical event times:")) ?? null
}

function travelFromRequired(required: string[]): string | null {
  return required.find((item) => item.startsWith("Able to reach event locations:")) ?? null
}

function clip(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim()
}

function list(items: string[]): string {
  return items.map((item) => `• ${item}`).join("\n")
}

export function composeRecruitingMaterials(
  companyName: string,
  handoff: RecruitmentStrategyHandoff,
  joinPath: string,
): RecruitingMaterials {
  const name = clip(companyName, COMPANY_NAME_MAX) || "This company"
  const roleTitle = roleTitleFromProfile(handoff.hireProfile)
  const compensation = compensationForDisplay(handoff.employment.compensation)
  const split = splitDuties(handoff.candidate.required)
  const preferred = handoff.candidate.preferred.slice(0, LIST_MAX)
  const values = handoff.candidate.values.map((row) => ({ value: row.value, behavior: row.behavior }))
  const arrangement = arrangementForDisplay(handoff.employment.arrangement)
  const count =
    handoff.hiringTarget === null
      ? "DJs"
      : handoff.hiringTarget === 1
        ? "one DJ"
        : `${handoff.hiringTarget} DJs`
  const profile = handoff.hireProfile ? RECRUIT_PROFILE_LABELS[handoff.hireProfile] : "DJs"
  const headline = clip(
    handoff.hireProfile === "beginner"
      ? `${name} is hiring DJs (training provided)`
      : handoff.hireProfile === "experienced"
        ? `${name} is hiring experienced DJs`
        : `${name} is hiring DJs`,
    HEADLINE_MAX,
  )
  const introduction = clip(
    `${name} is hiring ${count}. This page describes the role using the company’s approved recruiting strategy. It does not promise a job or a rate that was not provided.`,
    INTRO_MAX,
  )
  const roleDescription = clip(
    `This search is for ${profile.toLowerCase()}. ${
      handoff.hiringTarget === null
        ? "The number of people to hire was not set."
        : `The approved hiring target is ${count}.`
    }`,
    ROLE_DESCRIPTION_MAX,
  )
  const page: RecruitingPageContent = {
    companyName: name,
    headline,
    introduction,
    roleTitle,
    roleDescription,
    responsibilities: split.responsibilities,
    required: split.required,
    preferred,
    compensation,
    showCompensation: compensation !== null,
    values,
    arrangement,
    availability: availabilityFromRequired(handoff.candidate.required),
    travel: travelFromRequired(handoff.candidate.required),
    primaryColor: null,
    accentColor: null,
    applicationQuestions: [],
  }
  return { page, ads: adsFromPage(page, joinPath) }
}

export function adsFromPage(page: RecruitingPageContent, joinPath: string): RecruitingAds {
  const call = `Read the role and apply at ${joinPath}.`
  const pay = page.showCompensation && page.compensation ? page.compensation : null
  const title = clip(`${page.roleTitle} at ${page.companyName}`, AD_TITLE_MAX)
  const indeedSections = [
    page.introduction,
    `Role: ${page.roleTitle}`,
    page.roleDescription,
    page.responsibilities.length ? `Responsibilities:\n${list(page.responsibilities)}` : null,
    page.required.length ? `Required qualifications:\n${list(page.required)}` : null,
    page.preferred.length ? `Preferred qualifications:\n${list(page.preferred)}` : null,
    pay ? `Compensation: ${pay}` : null,
    page.arrangement ? `Employment: ${page.arrangement}` : null,
    page.values.length ? `Company values: ${page.values.map((row) => row.value).join(", ")}.` : null,
    call,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n")
  const socialBits = [
    `${page.companyName} is hiring a ${page.roleTitle}.`,
    page.roleDescription,
    pay ? `Pay: ${pay}` : null,
    call,
  ].filter((part): part is string => Boolean(part))
  const referral = [
    `We are hiring a ${page.roleTitle} at ${page.companyName}.`,
    page.roleDescription,
    pay ? `Compensation (if you share this, keep it as written): ${pay}` : "Compensation was not provided, so do not add a rate.",
    call,
  ].join("\n\n")
  const general = [
    `${title}`,
    page.introduction,
    page.required.length ? `Required:\n${list(page.required)}` : null,
    pay ? `Compensation: ${pay}` : null,
    call,
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n")

  return {
    indeed: { channel: "indeed", title, body: clip(indeedSections, AD_BODY_MAX.indeed) },
    social: { channel: "social", title, body: clip(socialBits.join(" "), AD_BODY_MAX.social) },
    referral: { channel: "referral", title, body: clip(referral, AD_BODY_MAX.referral) },
    general: { channel: "general", title, body: clip(general, AD_BODY_MAX.general) },
  }
}
