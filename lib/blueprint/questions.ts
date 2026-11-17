import { z } from "zod"

import type { BlueprintSectionSlug } from "@/lib/blueprint/progress"
import type { OwnerGoalCode } from "@/lib/blueprint/goals"

export const QUESTION_KEY_PATTERN = /^[A-Z]{1,2}[0-9]{1,2}[a-z]?$/

export const G3_CODES = ["within_6_months", "6_to_12_months", "1_to_2_years", "no_set_date"] as const
export type G3Code = (typeof G3_CODES)[number]

export const G3_OPTIONS: { value: G3Code; label: string }[] = [
  { value: "within_6_months", label: "Within 6 months" },
  { value: "6_to_12_months", label: "In 6 to 12 months" },
  { value: "1_to_2_years", label: "In 1 to 2 years" },
  { value: "no_set_date", label: "No set date" },
]

export const G3_SCHEMA = z.enum(G3_CODES)
export const G3_CHOOSE_MESSAGE = "Choose one of the options."
export const G3_HELP = "Applies to your main goal."
export const G3_LABEL = "When would you like to get there?"
export const ADD_MORE_DETAIL = "Add more detail (optional)"

export const ALREADY_ANSWERED_MESSAGE = "You’ve already answered this. Change your answer instead."
export const OWNER_ONLY_MESSAGE = "Only the company owner can change this."
export const SAVE_FAILED_MESSAGE = "That didn’t save. Please try again."

export type QuestionLevel = "core" | "go_deeper"
export type QuestionStorage = "typed" | "answers"
export type QuestionKey =
  | "G1"
  | "G2"
  | "G3"
  | "T0"
  | "T1"
  | "T1b"
  | "T2"
  | "T3"
  | "T4"
  | "T5"
  | "T6"
  | "T7"
  | "T8"
  | "E1"
  | "E2"
  | "E3"
  | "E4"
  | "E5"
  | "E6"
  | "E7"
  | "E8"
  | "E9"
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "S9"
  | "N1"
  | "N2"
  | "N3"
  | "N4"
  | "N5"
  | "N6"
  | "N7"
  | "N8"
  | "N9"
  | "D1"
  | "D2"
  | "D3"
  | "D4"
  | "D5"
  | "D6"
  | "D7"
  | "D8"
  | "D9"
  | "D10"

export type GuidanceExample = {
  text: string
  /** Hidden below 760px so the phone panel keeps the DJ less and Scale examples. */
  desktopOnly?: boolean
}

export type GuidanceContent = {
  why: string
  examples: readonly GuidanceExample[]
}

export type QuestionDefinition = {
  key: QuestionKey
  section: BlueprintSectionSlug
  level: QuestionLevel
  storage: QuestionStorage
  skipAllowed: boolean
  estimable: boolean
  version: number
  label: string
  whyNeeded: string
  guidance: GuidanceContent | null
}

export const QUESTIONS: readonly QuestionDefinition[] = [
  {
    key: "G1",
    section: "goals",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What do you want Blueprint to help you do? Choose all that apply.",
    whyNeeded: "Your goals shape every recommendation Blueprint makes.",
    guidance: {
      why: "Everything Blueprint suggests ties back to your goals, so this shapes every recommendation.",
      examples: [
        { text: "An owner who plays most Saturdays and wants weekends back picks DJ less." },
        { text: "A company turning down bookings it can’t staff picks Scale." },
        {
          text: "An owner whose DJs all do things differently picks Improve quality.",
          desktopOnly: true,
        },
      ],
    },
  },
  {
    key: "G2",
    section: "goals",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Which one matters most right now?",
    whyNeeded: "Blueprint puts your main goal first in its recommendations.",
    guidance: {
      why: "When your goals pull in different directions, Blueprint follows your main goal first.",
      examples: [
        { text: "If weekends back matter most, pick DJ less." },
        { text: "If you can’t staff the bookings you have, pick Scale." },
      ],
    },
  },
  {
    key: "G3",
    section: "goals",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: G3_LABEL,
    whyNeeded: "Blueprint uses your timeframe to decide when to start recruiting.",
    guidance: null,
  },
  {
    key: "T0",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "Earlier you told us you have DJs. Did that number include you?",
    whyNeeded: "We now count you separately from your team.",
    guidance: null,
  },
  {
    key: "T1",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Not counting yourself, how many DJs work events for your company?",
    whyNeeded:
      "Blueprint needs to know who can work events for you now, not counting you, to see what your team can cover.",
    guidance: {
      why: "Blueprint needs to know who can work events for you now, not counting you, to see what your team can cover.",
      examples: [
        { text: "Three regular DJs and one contractor who fills in on busy weekends: 4." },
        { text: "A DJ who moved away last spring: don’t count them." },
      ],
    },
  },
  {
    key: "T1b",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How many people work your events only as assistants?",
    whyNeeded: "Assistants share the work at events, but they never count as lead DJs.",
    guidance: {
      why: "Assistants share the work at events, but they never count as lead DJs.",
      examples: [
        { text: "Two lighting techs who never DJ: 2." },
        { text: "A trainee who only helps set up: 1." },
      ],
    },
  },
  {
    key: "T2",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Do you DJ events yourself?",
    whyNeeded: "Your own events are work your team would take over if you DJ less.",
    guidance: {
      why: "Your own events are work your team would take over if you DJ less.",
      examples: [
        { text: "Plays most Saturdays: Yes, regularly." },
        { text: "Covers when someone’s sick: Yes, now and then." },
      ],
    },
  },
  {
    key: "T3",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How many of those DJs can lead an event on their own today?",
    whyNeeded: "Only DJs who can run an event alone count toward lead capacity.",
    guidance: {
      why: "Only DJs who can run an event alone count toward lead capacity.",
      examples: [
        { text: "Four DJs, two you’d send alone to a wedding: 2." },
        { text: "Everyone’s still learning: 0." },
      ],
    },
  },
  {
    key: "T4",
    section: "team",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Who trains or mentors your DJs today? Choose all that apply.",
    whyNeeded: "Training takes someone’s time. Blueprint wants to know whose.",
    guidance: {
      why: "Training takes someone’s time. Blueprint wants to know whose.",
      examples: [
        { text: "The owner and one senior DJ." },
        { text: "An outside program, nobody in-house." },
      ],
    },
  },
  {
    key: "T5",
    section: "team",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What’s hardest about your team right now? Choose up to three.",
    whyNeeded: "Blueprint focuses its suggestions on what costs you the most.",
    guidance: {
      why: "Blueprint focuses its suggestions on what costs you the most.",
      examples: [
        { text: "New DJs take months to be ready." },
        { text: "Not enough DJs on busy dates." },
      ],
    },
  },
  {
    key: "T6",
    section: "team",
    level: "core",
    storage: "typed",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Not counting yourself, how many DJs would you like to have?",
    whyNeeded: "Blueprint compares the team you want with what your work needs.",
    guidance: {
      why: "Your gut answer is fine.",
      examples: [
        { text: "Today 4, would like 6." },
        { text: "Happy with today’s size: same as today." },
      ],
    },
  },
  {
    key: "T7",
    section: "team",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "What’s the main reason you want more DJs?",
    whyNeeded: "Blueprint uses your reason when it later checks the team you want.",
    guidance: null,
  },
  {
    key: "T8",
    section: "team",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: false,
    estimable: false,
    version: 1,
    label: "In the last 12 months, how often did a DJ problem affect an event?",
    whyNeeded: "Problems at events tell Blueprint where your team is stretched.",
    guidance: null,
  },
  {
    key: "E1",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What kinds of events do you book today? Choose all that apply.",
    whyNeeded: "Blueprint needs to know the events you already run, so later suggestions stay grounded in your real work.",
    guidance: {
      why: "Blueprint needs to know the events you already run, so later suggestions stay grounded in your real work.",
      examples: [
        { text: "Mostly weddings, plus a few school dances." },
        { text: "Corporate events and private parties, no weddings yet." },
      ],
    },
  },
  {
    key: "E2",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "About how many events do you book in a year, across every type?",
    whyNeeded: "A single yearly number is enough for Blueprint to understand your current volume.",
    guidance: {
      why: "A round number is enough. Count every event you staffed in the last 12 months.",
      examples: [
        { text: "A busy wedding company: about 80." },
        { text: "A newer company: about 20." },
      ],
    },
  },
  {
    key: "E3",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which of those are most common? Choose all that apply.",
    whyNeeded: "Your most common events are where staffing and training matter most.",
    guidance: {
      why: "Pick the types you book most often, from the ones you already offer.",
      examples: [
        { text: "Weddings most weeks, school dances a few times a year." },
        { text: "Corporate and private parties about equally." },
      ],
    },
  },
  {
    key: "E4",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which event types can your DJs lead on their own today? Choose all that apply.",
    whyNeeded: "Lead-ready event types tell Blueprint what your team can cover without you.",
    guidance: {
      why: "Lead means you’d send them alone to run the whole event.",
      examples: [
        { text: "They can lead school dances, but not weddings yet." },
        { text: "They can lead every type you offer." },
      ],
    },
  },
  {
    key: "E5",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which event types still need you there? Choose all that apply.",
    whyNeeded: "Owner-dependent events are separate from what your DJs can already lead.",
    guidance: {
      why: "This is about the events that still depend on you, even if a DJ is there too.",
      examples: [
        { text: "You still run every wedding yourself." },
        { text: "You’re only needed for the largest corporate events." },
      ],
    },
  },
  {
    key: "E6",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How do new DJs usually start?",
    whyNeeded: "How people start tells Blueprint whether new DJs typically assist, lead, or follow a mixed path.",
    guidance: {
      why: "There is no right path. Tell us what usually happens today.",
      examples: [
        { text: "They assist for a season, then lead." },
        { text: "Experienced hires start leading right away." },
      ],
    },
  },
  {
    key: "E7",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which event types do you want to book more often? Choose all that apply.",
    whyNeeded: "Growth from types you already offer is different from adding something new.",
    guidance: {
      why: "Choose from the work you already do. New types come next.",
      examples: [
        { text: "More corporate events, same wedding volume." },
        { text: "More of everything you already book." },
      ],
    },
  },
  {
    key: "E8",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which new event types do you want to offer? Choose all that apply.",
    whyNeeded: "New types are work you don’t offer today. They stay separate from what you already book.",
    guidance: {
      why: "Only pick types you don’t already offer. Skip this if you’re not adding anything new.",
      examples: [
        { text: "You do weddings today and want to add school dances." },
        { text: "You’re not adding new types: skip this." },
      ],
    },
  },
  {
    key: "E9",
    section: "events",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What do you want more of?",
    whyNeeded: "More bookings and less of your own time at events are different goals, and you can want both.",
    guidance: {
      why: "This is about the future, not what is true today.",
      examples: [
        { text: "More bookings, and you’re fine still DJing." },
        { text: "Same volume, but you want to DJ less." },
      ],
    },
  },
  {
    key: "S1",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What services do you currently offer? Choose all that apply.",
    whyNeeded: "Blueprint needs the services you already sell, so later suggestions stay grounded in what you do today.",
    guidance: {
      why: "Choose every service you currently offer, not the ones you hope to add later.",
      examples: [
        { text: "DJ and MC plus uplighting at most weddings." },
        { text: "DJ and MC only. Photo booths come from someone else." },
      ],
    },
  },
  {
    key: "S2",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which services require additional training beyond basic DJ skills? Choose all that apply.",
    whyNeeded: "Extra training needs are separate from the services you already offer.",
    guidance: {
      why: "Pick services that need more than basic DJ skills, from the ones you already offer.",
      examples: [
        { text: "Uplighting and photo booths need extra training. DJ and MC does not." },
        { text: "Every service you offer needs extra training except DJ and MC." },
      ],
    },
  },
  {
    key: "S3",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which services can your current DJs deliver independently? Choose all that apply.",
    whyNeeded: "Independent delivery is separate from what the company offers, and from what still needs you.",
    guidance: {
      why: "Do not assume every DJ can deliver every service. Pick what they can already do without you.",
      examples: [
        { text: "They can DJ and MC alone, but not run lighting." },
        { text: "They can deliver every service you offer." },
      ],
    },
  },
  {
    key: "S4",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How would you describe your company’s positioning?",
    whyNeeded: "Your own view of where you sit in the market is enough. Blueprint will not rank competitors.",
    guidance: {
      why: "This is how you see the company, not a price list or a ranking against others.",
      examples: [
        { text: "Most clients treat you as mid-market." },
        { text: "You’re not sure yet: pick I’m not sure, or skip." },
      ],
    },
  },
  {
    key: "S5",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Why do clients choose your company? Choose up to three.",
    whyNeeded: "The reasons clients pick you are owner-reported, not a market study.",
    guidance: {
      why: "Pick up to three reasons clients give you. This is your view, not a survey.",
      examples: [
        { text: "DJ talent and professionalism, more than price." },
        { text: "Reputation and referrals, plus the customer experience." },
      ],
    },
  },
  {
    key: "S6",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What makes it difficult to compete in your market? Choose up to three.",
    whyNeeded: "The hard parts of competing are your perceptions, not verified competitor data.",
    guidance: {
      why: "Pick up to three. Blueprint will not turn this into competitor rankings or price comparisons.",
      examples: [
        { text: "Finding qualified DJs, and larger companies nearby." },
        { text: "Seasonality more than price." },
      ],
    },
  },
  {
    key: "S7",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which services would you like to offer in the future? Choose all that apply.",
    whyNeeded: "New services are work you don’t offer today. They stay separate from what you already sell.",
    guidance: {
      why: "Only pick services you don’t already offer. Skip this if you’re not adding anything new.",
      examples: [
        { text: "You DJ today and want to add photo booths." },
        { text: "You’re not adding new services: skip this." },
      ],
    },
  },
  {
    key: "S8",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Which existing services would you like to sell more often? Choose all that apply.",
    whyNeeded: "Selling more of what you already offer is different from adding something new.",
    guidance: {
      why: "Choose from the services you already offer. New services were the previous question.",
      examples: [
        { text: "More uplighting, same DJ and MC volume." },
        { text: "More of everything you already sell." },
      ],
    },
  },
  {
    key: "S9",
    section: "services",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What is your biggest service-related goal?",
    whyNeeded: "One service goal is enough for now. Blueprint will not recommend training from this yet.",
    guidance: {
      why: "Pick the service goal that matters most. Training recommendations come later.",
      examples: [
        { text: "Train more DJs to deliver what you already sell." },
        { text: "You’re still deciding: pick Not sure yet, or skip." },
      ],
    },
  },
  {
    key: "N1",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "About how much revenue does your company generate annually?",
    whyNeeded: "A yearly revenue number, even approximate, is the starting point for later financial work.",
    guidance: {
      why: "Use last year’s total, or estimate this year from typical monthly sales. Approximate is enough.",
      examples: [
        { text: "Last year you invoiced about $250,000." },
        { text: "Typical months are about $20,000, so this year is around $240,000." },
      ],
    },
  },
  {
    key: "N2",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "Approximately how many events do you book per year?",
    whyNeeded: "Yearly volume is the same number as in Your events, so Blueprint keeps one consistent count.",
    guidance: {
      why: "This is the same yearly volume as Your events. Confirm it or update it here.",
      examples: [
        { text: "A busy wedding company: about 80." },
        { text: "A newer company: about 20." },
      ],
    },
  },
  {
    key: "N3",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "What is your typical booking price?",
    whyNeeded: "Typical booking price is owner-reported. Blueprint will not divide company revenue by bookings.",
    guidance: {
      why: "If you know yearly DJ-event revenue and bookings, you can estimate a typical price. Don’t use company-wide revenue if it includes rentals or production.",
      examples: [
        { text: "Most bookings are about $1,800." },
        { text: "DJ-event revenue of $144,000 across 80 bookings is about $1,800." },
      ],
    },
  },
  {
    key: "N4",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How do you typically pay your lead DJs?",
    whyNeeded: "How you pay lead DJs decides whether the next amount is dollars or a percentage.",
    guidance: {
      why: "Pick the usual method. If it varies, say so and you can still give a representative amount next.",
      examples: [
        { text: "A flat amount per event." },
        { text: "A percentage of the booking." },
      ],
    },
  },
  {
    key: "N5",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "Approximately how much does a typical lead DJ cost you per event?",
    whyNeeded: "Lead DJ cost per event stays separate from other direct costs and from company revenue.",
    guidance: {
      why: "Match the amount to how you pay: dollars per event, or a percent of the booking. Skip if you don’t know.",
      examples: [
        { text: "About $400 per event." },
        { text: "About 30 percent of the booking." },
      ],
    },
  },
  {
    key: "N6",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What other direct costs do you typically have per event?",
    whyNeeded: "Other direct event costs stay separate from lead DJ pay and from general overhead.",
    guidance: {
      why: "Direct event costs are things you spend to run that event. Rent, insurance, and office costs are overhead, not this list.",
      examples: [
        { text: "Travel and an assistant, most events." },
        { text: "None beyond the lead DJ." },
      ],
    },
  },
  {
    key: "N7",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "Approximately how much are those other direct costs per event?",
    whyNeeded: "A typical other-cost amount, without lead DJ pay, keeps event costs from being double-counted.",
    guidance: {
      why: "Add the usual assistants, rentals, travel, and supplies for one event. Don’t include lead DJ compensation.",
      examples: [
        { text: "About $150 for travel and supplies." },
        { text: "You’re not sure: skip, or enter an estimate." },
      ],
    },
  },
  {
    key: "N8",
    section: "numbers",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What is your biggest financial priority?",
    whyNeeded: "One financial priority is enough. Blueprint will not score your margins or health from this.",
    guidance: {
      why: "Pick the financial outcome that matters most. This is not a diagnosis of how healthy the company is.",
      examples: [
        { text: "Increase revenue." },
        { text: "You’re still deciding: pick Not sure yet, or skip." },
      ],
    },
  },
  {
    key: "N9",
    section: "numbers",
    level: "go_deeper",
    storage: "answers",
    skipAllowed: true,
    estimable: true,
    version: 1,
    label: "What annual revenue would you eventually like your company to reach?",
    whyNeeded: "An optional revenue target has no deadline. Blueprint will not assume when you want to get there.",
    guidance: {
      why: "A number is enough. There is no date attached. Skip this if you don’t have a target yet.",
      examples: [
        { text: "Eventually about $400,000 a year." },
        { text: "No target yet: skip." },
      ],
    },
  },
  {
    key: "D1",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How do new DJs typically join your company?",
    whyNeeded: "How people join tells Blueprint whether you hire beginners, experienced DJs, or have not recruited yet.",
    guidance: {
      why: "Solo operators and companies with a team both belong here. There is no right path.",
      examples: [
        { text: "You hire people with no DJ experience and train them." },
        { text: "You haven’t recruited anyone yet." },
      ],
    },
  },
  {
    key: "D2",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How do new DJs currently learn? Choose all that apply.",
    whyNeeded: "How people learn today is intake only. Blueprint will not recommend a training path from this yet.",
    guidance: {
      why: "Tell us what happens today, even if there is no formal process.",
      examples: [
        { text: "They shadow, then assist at events." },
        { text: "There is no formal training process yet." },
      ],
    },
  },
  {
    key: "D3",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "Who currently handles training?",
    whyNeeded: "Who trains today is separate from whether you already have a full training program.",
    guidance: {
      why: "Pick the person who usually handles it. Nobody yet is a complete answer.",
      examples: [
        { text: "You train people yourself." },
        { text: "Nobody handles training yet." },
      ],
    },
  },
  {
    key: "D4",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How do you decide when a DJ is ready to work independently? Choose all that apply.",
    whyNeeded: "Readiness is owner-defined. Blueprint will not certify anyone from this yet.",
    guidance: {
      why: "This is how you decide today, even if there is no defined process.",
      examples: [
        { text: "They assist at events, then you approve them." },
        { text: "There is no defined process yet." },
      ],
    },
  },
  {
    key: "D5",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What training materials do you already have? Choose all that apply.",
    whyNeeded: "Existing materials stay separate from anything Blueprint might help you create later.",
    guidance: {
      why: "Only what you already have. You don’t need to create anything here.",
      examples: [
        { text: "A checklist and a few videos." },
        { text: "Nothing documented yet." },
      ],
    },
  },
  {
    key: "D6",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What equipment can trainees practice with?",
    whyNeeded: "Practice equipment tells Blueprint what hands-on training is possible today.",
    guidance: {
      why: "This is access today, not a shopping list.",
      examples: [
        { text: "Shared company gear in the warehouse." },
        { text: "They use their own equipment." },
      ],
    },
  },
  {
    key: "D7",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How can trainees get hands-on experience? Choose all that apply.",
    whyNeeded: "Hands-on time is separate from classroom materials and from later recommendations.",
    guidance: {
      why: "What is possible today, even if it is not regular yet.",
      examples: [
        { text: "They observe live events, then assist." },
        { text: "No regular opportunities yet." },
      ],
    },
  },
  {
    key: "D8",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What is your biggest training challenge? Choose up to three.",
    whyNeeded: "Your current challenges stay owner-reported. Blueprint will not diagnose your program from this.",
    guidance: {
      why: "Pick up to three. No major challenge yet is a complete answer on its own.",
      examples: [
        { text: "Finding time, and knowing when someone is ready." },
        { text: "No major challenge yet." },
      ],
    },
  },
  {
    key: "D9",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "What would you most like Blueprint to improve? Choose up to three.",
    whyNeeded: "What you want improved is intake only. Blueprint will not recommend a certification path from this yet.",
    guidance: {
      why: "Pick up to three outcomes. Training recommendations come later.",
      examples: [
        { text: "Make training more organized, and reduce how much you have to do." },
        { text: "Standardize experienced DJs, not only beginners." },
      ],
    },
  },
  {
    key: "D10",
    section: "development",
    level: "core",
    storage: "answers",
    skipAllowed: true,
    estimable: false,
    version: 1,
    label: "How much time can you realistically dedicate to training?",
    whyNeeded: "This is your own availability, not the whole team’s training capacity.",
    guidance: {
      why: "Your personal time each week, not everyone on the team combined.",
      examples: [
        { text: "About 1–2 hours a week." },
        { text: "It varies, or you’re not sure." },
      ],
    },
  },
]

export const QUESTION_BY_KEY: Record<QuestionKey, QuestionDefinition> = Object.fromEntries(
  QUESTIONS.map((question) => [question.key, question]),
) as Record<QuestionKey, QuestionDefinition>

export function isQuestionKey(value: string): value is QuestionKey {
  return value in QUESTION_BY_KEY
}

export function questionsForSection(section: BlueprintSectionSlug): QuestionDefinition[] {
  return QUESTIONS.filter((question) => question.section === section)
}

export const G1_SKIPPED_TEXT =
  "You skipped this for now. When you’re ready, choose your goals above and press Save goals."

export const M1_COPY: Record<OwnerGoalCode, string> = {
  dj_less: "To DJ less, your team needs room to take on some of your events. We’ll measure how many in a minute.",
  stop_djing:
    "To stop DJing, your team has to take over every event you play now. The next two sections measure exactly how many that is.",
  scale: "To scale, you need enough ready DJs for more bookings, and a way to get new DJs ready faster.",
  expand: "To expand, you’ll need DJs where the new market is, and someone there to train them.",
  improve_quality: "To improve quality, every DJ needs the same standard, and a way to show they meet it.",
  create_leadership:
    "To create leadership, some DJs need to grow into trainers or leads, so it doesn’t all run through you.",
  other: "Got it. Blueprint will keep ‘{text}’ in front of every recommendation.",
}

/** D-4 option (b): build the copy now; show it once the capacity check is live. */
export function shouldShowM1(): boolean {
  return false
}

export function m1Copy(primary: OwnerGoalCode, otherText?: string | null): string {
  if (primary === "other") {
    const text = otherText?.trim() || "your goal"
    return M1_COPY.other.replace("{text}", text)
  }
  return M1_COPY[primary]
}
