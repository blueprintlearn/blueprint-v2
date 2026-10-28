"use client"

/**
 * Reference composition of the approved B4 owner home, using only design-system components and
 * static sample data. Not a route: mount it on a preview page while building, then replace the
 * sample data with real queries. Handlers here are placeholders for server actions.
 */
import {
  Avatar,
  BottomTabBar,
  Card,
  DecisionCard,
  JourneyTrack,
  MessageBubble,
  SeatMap,
  TopNav,
  type NavItem,
  type TabItem,
} from "@/components/blueprint"

const NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/people", label: "People" },
  { href: "/development", label: "Development" },
  { href: "/recruiting", label: "Recruiting" },
  { href: "/library", label: "Library" },
]

const TABS: TabItem[] = [
  { href: "/", label: "Home", icon: "home", badge: 3 },
  { href: "/people", label: "People", icon: "people" },
  { href: "/development", label: "Develop", icon: "development" },
  { href: "/recruiting", label: "Recruit", icon: "recruiting" },
  { href: "/library", label: "Library", icon: "library" },
]

export function OwnerHomeExample() {
  return (
    <div className="bp-root min-h-full flex flex-col">
      <TopNav
        items={NAV}
        workspace="Riverside DJ Co."
        workspaceHref="/settings/company"
        alerts={3}
        notificationsHref="/notifications"
        userInitial="D"
        accountHref="/account"
        searchHref="/search"
      />
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-16 px-4 pb-11 md:px-8">
        <section className="pt-14">
          <p className="bp-type-small text-muted">Wednesday, October 21</p>
          <h1 className="bp-type-display-xl mt-3">
            Good afternoon, <span className="bp-hl">David.</span>
          </h1>
          <p className="bp-type-lead mt-5 max-w-[620px] text-ink-2">Three things need you today. Everything else is moving along nicely.</p>
        </section>

        <section aria-labelledby="needs">
          <h2 id="needs" className="bp-type-heading-l mb-5">
            Just these need you
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            <DecisionCard
              tone="blush"
              kicker="Ready to advance"
              title="Jake is ready to become an Assistant DJ"
              body="Three observed events, every requirement backed by evidence, and Sarah Kim says he’s ready."
              secondaryLabel="See his evidence"
              onSecondary={() => {
                /* router.push(`/people/${jake.id}/evidence`) */
              }}
              primaryLabel="Approve Jake"
              consequential
              celebrate
              confirmTitle="Approve Jake as Assistant DJ?"
              confirmLabel="Yes, approve"
              doneKicker="Advanced today"
              doneTitle="Jake is officially an Assistant DJ!"
              doneBody="His Wedding Lead journey just opened up."
              onDecide={async () => {
                /* await approveAdvancement(...) — server action writes the AdvancementDecision + audit entry */
              }}
            >
              <Avatar name="Jake Morales" initials="J" tone="blush" size="lg" onTint />
            </DecisionCard>
            <DecisionCard
              tone="sky"
              kicker="Could use a nudge"
              title="A quick note from you usually does it"
              secondaryLabel="Edit message"
              onSecondary={() => {
                /* open the message editor */
              }}
              primaryLabel="Send to Devon"
              onDecide={async () => {
                /* await sendNudge(...) — server action sends the drafted message */
              }}
              doneKicker="Message sent"
              doneTitle="Devon heard from you"
              doneBody="Blueprint will check in Friday."
            >
              <MessageBubble>Hey Devon! Saw MC Foundations slipped a few days. Everything okay?</MessageBubble>
            </DecisionCard>
          </div>
        </section>

        <Card tone="surface" title="You’re one great DJ away from a fully staffed spring.">
          <SeatMap
            label="Spring Wedding Lead seats"
            seats={[
              { initials: "MR" }, { initials: "TK" }, { initials: "JB" }, { initials: "AL" }, { initials: "CS" },
              { initials: "RN" }, { initials: "EH" }, { initials: "PS", status: "progress" },
              { initials: "LO", status: "progress" }, { status: "planned", label: "Your next hire" },
            ]}
          />
        </Card>

        <Card tone="surface" title="Luis Ortega">
          <p className="bp-card__body">Becoming a Wedding Lead</p>
          <JourneyTrack current={2} />
        </Card>
      </main>
      {/* Last child of the page column, not wrapped, so position: sticky pins it to the screen bottom. */}
      <BottomTabBar items={TABS} className="bp-mobile-only" />
    </div>
  )
}
