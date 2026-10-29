import type { CurrentOwnerGoal, CurrentTeamToday } from "@/lib/blueprint/queries"

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
  /** Row label on the overview. */
  name: string
  /** Page heading on the section page. */
  title: string
  description: string
  /** Sections without a page yet are shown as "Coming soon". */
  live: boolean
}

export const BLUEPRINT_SECTIONS: readonly BlueprintSection[] = [
  {
    number: 1,
    slug: "goals",
    name: "Goals",
    title: "Your goal",
    description: "Where you want your company to go",
    live: true,
  },
  {
    number: 2,
    slug: "team",
    name: "Team today",
    title: "Your team today",
    description: "How many DJs you have, and how many you’d like",
    live: true,
  },
  { number: 3, slug: "events", name: "Events", title: "Events", description: "The events you book", live: false },
  {
    number: 4,
    slug: "services",
    name: "Services & market",
    title: "Services & market",
    description: "What you offer and where you compete",
    live: false,
  },
  { number: 5, slug: "numbers", name: "Numbers", title: "Numbers", description: "What your events earn", live: false },
  {
    number: 6,
    slug: "development",
    name: "Development",
    title: "Development",
    description: "How you hire and train DJs",
    live: false,
  },
  {
    number: 7,
    slug: "ideal-dj",
    name: "Ideal DJ",
    title: "Ideal DJ",
    description: "The values and skills you hire for",
    live: false,
  },
  {
    number: 8,
    slug: "review",
    name: "Review",
    title: "Review",
    description: "Look over your Blueprint and approve it",
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
  ownerGoal: Pick<CurrentOwnerGoal, "ownerGoal"> | null,
  teamToday: Pick<CurrentTeamToday, "currentDjCount" | "desiredDjCount"> | null,
): BlueprintProgress {
  const goals: SectionStatus = ownerGoal ? "done" : "not_started"
  const team: SectionStatus =
    teamToday === null ? "not_started" : teamToday.desiredDjCount === null ? "in_progress" : "done"

  const statuses = Object.fromEntries(
    BLUEPRINT_SECTIONS.map((section) => [section.slug, "coming_soon" satisfies SectionStatus]),
  ) as Record<BlueprintSectionSlug, SectionStatus>
  statuses.goals = goals
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
