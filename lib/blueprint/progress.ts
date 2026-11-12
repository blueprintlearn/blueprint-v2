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
    description: "How many DJs you have, who can lead, and how many you’d like",
    live: true,
  },
  {
    number: 3,
    slug: "events",
    name: "Your events",
    description: "How many events you book, who works them, and your busiest dates",
    live: true,
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

export type SectionStatus = "not_started" | "needs_attention" | "complete" | "coming_soon"

export type BlueprintProgress = {
  statuses: Record<BlueprintSectionSlug, SectionStatus>
  skippedCounts: Record<BlueprintSectionSlug, number>
  toAnswerCounts: Record<BlueprintSectionSlug, number>
  completeCount: number
  /** Live sections that Need attention. Hidden in the UI when 0. */
  startedCount: number
  /** First live section with an unanswered core question, or null when none remain. */
  next: BlueprintSectionSlug | null
  /** Core question to focus inside `next`, when there is one. */
  focusQuestionKey: string | null
  /** start: nothing answered or skipped. continue: a live unanswered core remains. review: only skips or everything complete. */
  action: "start" | "continue" | "review"
}
