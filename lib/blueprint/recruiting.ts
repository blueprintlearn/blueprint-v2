import {
  AD_BODY_MAX,
  AD_CHANNELS,
  AD_TITLE_MAX,
  COMPANY_NAME_MAX,
  HEADLINE_MAX,
  INTRO_MAX,
  LIST_ITEM_MAX,
  LIST_MAX,
  RECRUITING_ROW_STATUSES,
  ROLE_DESCRIPTION_MAX,
  ROLE_TITLE_MAX,
  adsFromPage,
  composeRecruitingMaterials,
  isValidHexColor,
  isValidSlug,
  recruitingPublicPath,
  suggestSlug,
  type AdChannel,
  type JobAd,
  type RecruitingAds,
  type RecruitingMaterials,
  type RecruitingPageContent,
  type RecruitingRowStatus,
} from "@/lib/blueprint/recruiting-engine"
import type { RecruitmentStrategyHandoff } from "@/lib/blueprint/recruitment-strategy-handoff"

export const RECRUITING_PAGE_TITLE = "Job ads and recruiting page"
export const RECRUITING_OPENING =
  "Turn your approved recruiting strategy into job ads and a company recruiting page. Saving a draft does not make the page public. Publishing does not post ads or open applications."
export const RECRUITING_NEED_STRATEGY =
  "Approve a recruiting strategy before Blueprint can write job ads or a recruiting page. Draft, stale, and unapproved strategies are not used."
export const RECRUITING_STALE_STRATEGY =
  "Your recruiting strategy changed after this page was written. The published page, if any, is unchanged. Review the copy before you publish an update."
export const RECRUITING_PUBLISHED =
  "This recruiting page is live at the public URL. Editing the draft does not change the live page until you publish an update."
export const RECRUITING_UNPUBLISHED = "This recruiting page is not public. The URL is reserved until you publish again."
export const RECRUITING_CONFIRM_MESSAGE = "Confirm that you have reviewed this page before publishing it."
export const RECRUITING_SLUG_MESSAGE = "Use a public URL of 3–48 lowercase letters, numbers, and hyphens."
export const RECRUITING_SLUG_TAKEN = "That public URL is already in use."
export const RECRUITING_NO_APPLY =
  "Publishing this page does not open applications, post ads, or contact anyone."
export const COLOR_MESSAGE = "Use a hex color like #253860, or leave it blank."

export type StoredRecruitingPage = {
  id: string
  version: number
  status: RecruitingRowStatus
  slug: string
  sourceFingerprint: string
  sourceStrategyId: string | null
  sourceStrategyVersion: number | null
  page: RecruitingPageContent
  ads: RecruitingAds
  publishedBy: string | null
  publishedAt: string | null
}

export type RecruitingView = {
  handoff: RecruitmentStrategyHandoff | null
  materials: RecruitingMaterials | null
  draft: StoredRecruitingPage | null
  published: StoredRecruitingPage | null
  unpublished: StoredRecruitingPage | null
  previousPublished: StoredRecruitingPage | null
  editor: StoredRecruitingPage | RecruitingMaterials | null
  slug: string
  joinPath: string
  strategyStatus: "current" | "stale" | "missing"
  pageStatus: "none" | "draft" | "published" | "unpublished"
  needsStrategyReview: boolean
}

export type RecruitingEditorInput = {
  slug: string
  page: RecruitingPageContent
  ads: RecruitingAds
}

function asStatus(value: unknown): RecruitingRowStatus | null {
  return typeof value === "string" && (RECRUITING_ROW_STATUSES as readonly string[]).includes(value)
    ? (value as RecruitingRowStatus)
    : null
}

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (!text || text.length > max) return null
  return text
}

function asStringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const items = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
  if (items.length > LIST_MAX) return null
  if (items.some((item) => item.length > LIST_ITEM_MAX)) return null
  return items
}

function asValues(value: unknown): { value: string; behavior: string }[] | null {
  if (!Array.isArray(value)) return null
  const rows: { value: string; behavior: string }[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") return null
    const record = item as { value?: unknown; behavior?: unknown }
    const name = asString(record.value, LIST_ITEM_MAX)
    const behavior = asString(record.behavior, LIST_ITEM_MAX)
    if (!name || !behavior) return null
    rows.push({ value: name, behavior })
  }
  if (rows.length > LIST_MAX) return null
  return rows
}

function asColor(value: unknown): string | null | undefined {
  if (value === null || value === "") return null
  if (typeof value !== "string") return undefined
  return isValidHexColor(value) ? value : undefined
}

export function pageContentFromUnknown(value: unknown): RecruitingPageContent | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const companyName = asString(record.companyName, COMPANY_NAME_MAX)
  const headline = asString(record.headline, HEADLINE_MAX)
  const introduction = asString(record.introduction, INTRO_MAX)
  const roleTitle = asString(record.roleTitle, ROLE_TITLE_MAX)
  const roleDescription = asString(record.roleDescription, ROLE_DESCRIPTION_MAX)
  const responsibilities = asStringList(record.responsibilities)
  const required = asStringList(record.required)
  const preferred = asStringList(record.preferred)
  const values = asValues(record.values)
  const primaryColor = asColor(record.primaryColor)
  const accentColor = asColor(record.accentColor)
  if (
    !companyName ||
    !headline ||
    !introduction ||
    !roleTitle ||
    !roleDescription ||
    !responsibilities ||
    !required ||
    !preferred ||
    !values ||
    primaryColor === undefined ||
    accentColor === undefined
  ) {
    return null
  }
  const compensation =
    record.compensation == null ? null : asString(record.compensation, LIST_ITEM_MAX)
  if (record.compensation != null && compensation === null) return null
  return {
    companyName,
    headline,
    introduction,
    roleTitle,
    roleDescription,
    responsibilities,
    required,
    preferred,
    compensation,
    showCompensation: record.showCompensation === true && compensation !== null,
    values,
    arrangement: record.arrangement == null ? null : asString(record.arrangement, LIST_ITEM_MAX),
    availability: record.availability == null ? null : asString(record.availability, LIST_ITEM_MAX),
    travel: record.travel == null ? null : asString(record.travel, LIST_ITEM_MAX),
    primaryColor,
    accentColor,
  }
}

function adFromUnknown(channel: AdChannel, value: unknown): JobAd | null {
  if (!value || typeof value !== "object") return null
  const record = value as { channel?: unknown; title?: unknown; body?: unknown }
  const title = asString(record.title, AD_TITLE_MAX)
  const body = asString(record.body, AD_BODY_MAX[channel])
  if (!title || !body) return null
  if (record.channel !== channel) return null
  return { channel, title, body }
}

export function adsFromUnknown(value: unknown): RecruitingAds | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const ads = {} as RecruitingAds
  for (const channel of AD_CHANNELS) {
    const ad = adFromUnknown(channel, record[channel])
    if (!ad) return null
    ads[channel] = ad
  }
  return ads
}

export function storedPageFromRow(row: {
  id: string
  version: number
  status: string
  slug: string
  source_fingerprint: string
  source_strategy_id: string | null
  source_strategy_version: number | null
  page_content: unknown
  ads_content: unknown
  published_by: string | null
  published_at: string | null
}): StoredRecruitingPage | null {
  const status = asStatus(row.status)
  const page = pageContentFromUnknown(row.page_content)
  const ads = adsFromUnknown(row.ads_content)
  if (!status || !page || !ads || !isValidSlug(row.slug)) return null
  return {
    id: row.id,
    version: row.version,
    status,
    slug: row.slug,
    sourceFingerprint: row.source_fingerprint,
    sourceStrategyId: row.source_strategy_id,
    sourceStrategyVersion: row.source_strategy_version,
    page,
    ads,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
  }
}

function linesFromForm(formData: FormData, name: string): string[] {
  return String(formData.get(name) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, LIST_MAX)
}

function formString(formData: FormData, name: string, max: number): string | null {
  return asString(formData.get(name), max)
}

export function parseRecruitingEditor(formData: FormData): { ok: true; value: RecruitingEditorInput } | { ok: false; error: string } {
  const slug = String(formData.get("slug") ?? "").trim()
  if (!isValidSlug(slug)) return { ok: false, error: RECRUITING_SLUG_MESSAGE }
  const companyName = formString(formData, "companyName", COMPANY_NAME_MAX)
  const headline = formString(formData, "headline", HEADLINE_MAX)
  const introduction = formString(formData, "introduction", INTRO_MAX)
  const roleTitle = formString(formData, "roleTitle", ROLE_TITLE_MAX)
  const roleDescription = formString(formData, "roleDescription", ROLE_DESCRIPTION_MAX)
  const primaryRaw = String(formData.get("primaryColor") ?? "").trim()
  const accentRaw = String(formData.get("accentColor") ?? "").trim()
  if (!isValidHexColor(primaryRaw === "" ? null : primaryRaw) || !isValidHexColor(accentRaw === "" ? null : accentRaw)) {
    return { ok: false, error: COLOR_MESSAGE }
  }
  if (!companyName || !headline || !introduction || !roleTitle || !roleDescription) {
    return { ok: false, error: "Enter the recruiting page fields before saving." }
  }
  const compensationRaw = formString(formData, "compensation", LIST_ITEM_MAX)
  const page: RecruitingPageContent = {
    companyName,
    headline,
    introduction,
    roleTitle,
    roleDescription,
    responsibilities: linesFromForm(formData, "responsibilities"),
    required: linesFromForm(formData, "required"),
    preferred: linesFromForm(formData, "preferred"),
    compensation: compensationRaw,
    showCompensation: formData.get("showCompensation") === "1" && compensationRaw !== null,
    values: linesFromForm(formData, "values").map((line) => {
      const [name, ...rest] = line.split(" — ")
      const value = (name ?? line).trim()
      const behavior = rest.join(" — ").trim()
      return {
        value,
        behavior: behavior || `Show “${value}” in how you prepare, communicate, and run events.`,
      }
    }),
    arrangement: formString(formData, "arrangement", LIST_ITEM_MAX),
    availability: formString(formData, "availability", LIST_ITEM_MAX),
    travel: formString(formData, "travel", LIST_ITEM_MAX),
    primaryColor: primaryRaw === "" ? null : primaryRaw,
    accentColor: accentRaw === "" ? null : accentRaw,
  }
  const ads = {} as RecruitingAds
  for (const channel of AD_CHANNELS) {
    const title = formString(formData, `${channel}Title`, AD_TITLE_MAX)
    const body = formString(formData, `${channel}Body`, AD_BODY_MAX[channel])
    if (!title || !body) return { ok: false, error: `Enter the ${channel} advertisement before saving.` }
    ads[channel] = { channel, title, body }
  }
  return { ok: true, value: { slug, page, ads } }
}

export function editorFromStored(row: StoredRecruitingPage): RecruitingMaterials {
  return { page: row.page, ads: row.ads }
}

export function buildRecruitingView(input: {
  companyName: string
  handoff: RecruitmentStrategyHandoff | null
  rows: StoredRecruitingPage[]
}): RecruitingView {
  const draft = input.rows.find((row) => row.status === "draft") ?? null
  const published = input.rows.find((row) => row.status === "published") ?? null
  const unpublished = input.rows.find((row) => row.status === "unpublished") ?? null
  const previousPublished = input.rows.find((row) => row.status === "superseded") ?? null
  const live = published ?? unpublished ?? draft
  const slug = draft?.slug ?? published?.slug ?? unpublished?.slug ?? suggestSlug(input.companyName)
  const joinPath = recruitingPublicPath(slug)
  const generated = input.handoff ? composeRecruitingMaterials(input.companyName, input.handoff, joinPath) : null
  const editor: StoredRecruitingPage | RecruitingMaterials | null = draft
    ? draft
    : generated
      ? { page: generated.page, ads: generated.ads }
      : (published ?? unpublished)
  const needsStrategyReview = Boolean(
    live && (!input.handoff || fingerprintOf(input.handoff) !== live.sourceFingerprint),
  )
  const pageStatus = published ? "published" : unpublished ? "unpublished" : draft ? "draft" : "none"
  const strategyStatus = !input.handoff && !live ? "missing" : needsStrategyReview ? "stale" : "current"
  return {
    handoff: input.handoff,
    materials: generated,
    draft,
    published,
    unpublished,
    previousPublished,
    editor,
    slug,
    joinPath,
    strategyStatus,
    pageStatus,
    needsStrategyReview,
  }
}

export function fingerprintOf(handoff: RecruitmentStrategyHandoff): string {
  return `${handoff.strategyId}:${handoff.version}:${handoff.approvedAt}`
}

export function materialsFromEditor(editor: StoredRecruitingPage | RecruitingMaterials): RecruitingMaterials {
  if ("page" in editor && "ads" in editor && !("status" in editor)) return editor
  const stored = editor as StoredRecruitingPage
  return { page: stored.page, ads: stored.ads }
}

export function refreshAdsFromPage(page: RecruitingPageContent, joinPath: string): RecruitingAds {
  return adsFromPage(page, joinPath)
}
