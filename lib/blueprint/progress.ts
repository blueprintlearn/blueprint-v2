import type { CurrentTeamToday } from "@/lib/blueprint/queries"

export type BlueprintSectionSlug =
  | "goals"
  | "team"
  | "events"
  | "services"
  | "numbers"
  | "development"
  | "ideal-dj"
  | "review"

export type BlueprintSection = {
  number: number
  slug: BlueprintSectionSlug
  /** Used for the overview row and the section page heading. */
  name: string
  description: string
  /** Sections without a page yet are shown as "Coming soon". */
  live: boolean
}

export const BLUEPRINT_SECTIONS: readonly BlueprintSection[] = [
  {
    number: 1,
    slug: "goals",
    name: "Your goals",
    description: "What you want Blueprint to help you do",
    live: true,
  },
  {
    number: 2,
    slug: "team",
    name: "Your team today",
    description: "How many DJs you have, and how many you’d like",
    live: true,
  },
  {
    number: 3,
    slug: "events",
    name: "Your events",
    description: "How many events you book, who works them, and your busiest dates",
    live: false,
  },
  {
    number: 4,
    slug: "services",
    name: "Your services and market",
    description: "What your DJs handle at events, and where your prices sit",
    live: false,
  },
  {
    number: 5,
    slug: "numbers",
    name: "Your numbers",
    description: "What each event really earns, private to you",
    live: false,
  },
  {
    number: 6,
    slug: "development",
    name: "How you develop DJs",
    description: "How you hire and train today, and what to keep",
    live: false,
  },
  {
    number: 7,
    slug: "ideal-dj",
    name: "Your ideal DJ",
    description: "Your core values and the skills you hire for",
    live: false,
  },
  {
    number: 8,
    slug: "review",
    name: "Your Blueprint",
    description: "Blueprint’s recommendations, for you to approve or change",
    live: false,
  },
]

export const LIVE_SECTION_SLUGS = BLUEPRINT_SECTIONS.filter((section) => section.live).map(
  (section) => section.slug,
)

export function blueprintSection(slug: string): BlueprintSection | undefined {
  return BLUEPRINT_SECTIONS.find((section) => section.slug === slug)
}

export const TOTAL_SECTIONS = BLUEPRINT_SECTIONS.length

export type SectionStatus = "not_started" | "in_progress" | "done" | "coming_soon"

export type BlueprintProgress = {
  statuses: Record<BlueprintSectionSlug, SectionStatus>
  doneCount: number
  /** First live section that isn't done, or null when nothing live is left. */
  next: BlueprintSectionSlug | null
  /** start: nothing saved yet. continue: something is saved and a live section remains. review: no live section left. */
  action: "start" | "continue" | "review"
}

/**
 * Derived only from saved data. A saved 0 counts as saved; only a missing value is unanswered.
 */
export function getBlueprintProgress(
  goals: { primary: unknown } | null,
  teamToday: Pick<CurrentTeamToday, "currentDjCount" | "desiredDjCount"> | null,
): BlueprintProgress {
  const goalsStatus: SectionStatus = goals?.primary ? "done" : "not_started"
  const team: SectionStatus =
    teamToday === null ? "not_started" : teamToday.desiredDjCount === null ? "in_progress" : "done"

  const statuses = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, "coming_soon" satisfies SectionStatus]),
  ) as Record<BlueprintSectionSlug, SectionStatus>
  statuses.goals = goalsStatus
  statuses.team = team

  const liveStatuses = LIVE_SECTION_SLUGS.map((slug) => statuses[slug])
  const next = LIVE_SECTION_SLUGS.find((slug) => statuses[slug] !== "done") ?? null
  const doneCount = liveStatuses.filter((status) => status === "done").length

  return {
    statuses,
    doneCount,
    next,
    action: next === null ? "review" : liveStatuses.every((status) => status === "not_started") ? "start" : "continue",
  }
}
