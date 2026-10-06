# Blueprint V2

## Build Plan v0.1

### Objective

Build Blueprint V2 incrementally toward a self-service SaaS business capable of reaching **10k–20k MRR** without requiring founder-led implementation or consulting.

Target progression:

**Internal Alpha → 2–3 Testers → Paid Beta → Public V2**

Each stage advances based on evidence, not merely feature completion.



---



# STAGE 0 — Engineering Foundation

## Goal

Create the environment where Blueprint can be built safely.

## Build

- GitHub repository
- Next.js / TypeScript application
- Supabase
- Vercel
- local/development environment
- staging environment
- production environment
- version-controlled database migrations
- automated test framework
- end-to-end test framework
- CI
- error monitoring
- secrets management
- seed/test data

Create:

**Company A**

and

**Company B**

from the beginning.

## Prove

Automated tests demonstrate:

- authentication works
- companies can be created
- memberships work
- Company A cannot access Company B
- migrations can be applied reliably
- staging and production are separate

## Exit Gate

We can safely build customer data on top of the architecture without relying on frontend filtering for tenant security.



---



# STAGE 1 — Company Blueprint

## Goal

Blueprint learns enough about a DJ company to make intelligent talent recommendations.

## Build

Guided onboarding covering:

### Team Today

- DJs
- utilization
- reliability
- event volume
- pain points
- current trainers
- desired team size

### Owner Goal

- DJ less
- stop DJing
- scale
- expand
- improve quality
- create leadership
- other company-defined goals

### Business

- pricing
- packages
- service tiers
- enhancements
- event types
- service complexity

### Market

- geography
- positioning
- competitors
- owner perception of market

### Economics

- DJ compensation
- direct event costs
- COGS
- gross-profit education
- training compensation
- workforce economics

### Workforce

- employee
- contractor
- mixed

### Talent Profile

- three core values
- soft skills
- hard skills
- must-arrive-with vs trainable
- proximity
- transportation
- availability
- practical fit

## AI Layer

Blueprint can:

- ask follow-up questions
- identify contradictions
- explain concepts
- recommend choices
- summarize the business
- propose a Talent Profile

Owner must be able to:

**Approve**

or

**Change**

recommendations.

## Prove

An owner can complete Company Blueprint without David explaining every question.

Blueprint produces a useful summary of:

**where the company is today**

**where the owner wants to go**

**what talent they need**

**whether recruiting appears appropriate**

**what type of candidate they should pursue**

## Exit Gate

An outside owner can say:

> “Blueprint actually understands my company.”



---



# STAGE 2 — Talent Engine

## Goal

Represent what the company needs its people to become.

## Build

- People
- Talent Roles
- Event Qualifications
- Skill/Service Certifications
- Competencies
- competency levels
- qualification requirements
- human advancement decisions
- qualification achievements

## Include Initial Blueprint Templates

At minimum:

- Assistant DJ
- Wedding Lead DJ
- common private-event qualifications
- Karaoke extension
- Scratch extension

Exact requirements remain configurable.

## Prove

Two different companies can define materially different Wedding Lead standards without changing the core software.

A Wedding Lead can qualify for general private events without automatically qualifying for specialty events.

## Exit Gate

Blueprint can accurately answer:

> “What is Jake currently qualified to do?”

and

> “What does Jake still need to demonstrate to reach his target?”



---



# STAGE 3 — Development & Training Engine

## Goal

Turn qualification gaps into an actual development journey.

## Build

- Development Path Templates
- individual Development Paths
- courses
- modules
- lessons
- video
- quizzes
- assignments
- deadlines
- prerequisites
- evidence
- competency verification
- trainer evaluation
- basic remediation/retry behavior

## Initial Content

Import only the legacy Blueprint content required to prove the system.

Do NOT immediately migrate all 150+ lessons simply because they exist.

First prove the new content model.

Then migrate useful legacy content deliberately.

## Required Routes

### New DJ

Full development route.

### Experienced DJ

Assessment → verified prior competencies → gap training.

## Prove

Two people pursuing Wedding Lead can receive different development paths.

Completing educational content does not automatically grant competency.

## Exit Gate

A real trainee can move through a development path and Blueprint can accurately explain:

**what they've completed**

**what they've demonstrated**

**what remains**

**why they are or are not ready to advance**



---



# INTERNAL ALPHA GATE

At this point Blueprint becomes usable internally.

David acts as the first demanding customer.

## Alpha Test

Create a realistic DJ company.

Add:

- inexperienced DJ
- experienced DJ
- trainer

Run both development routes.

Attempt to break:

- permissions
- tenant isolation
- progress
- evidence
- advancement
- content versions

## Alpha Exit Test

Blueprint's core model works without requiring database surgery or architectural workarounds.

Only then move to external testers.



---



# STAGE 4 — Recruiting Engine

## Goal

Connect the talent strategy to the actual acquisition of people.

## Build

- recruiting campaign
- careers/join page
- application
- screening questions
- candidate pipeline
- automated email
- reminders
- deadlines
- one-way video interview
- transcription
- core-value interview analysis
- work samples
- audition route where configured
- human advance/hold/reject decisions

## Important

Blueprint uses Company Blueprint data to generate recruiting materials.

Core Values influence interview questions and evaluation.

Workforce model influences candidate journey.

Experienced-DJ recruiting may differ from inexperienced-talent recruiting.

## Prove

A candidate can go:

**Job Page → Application → Screening → One-Way Interview → Human Decision → Hired → Development Path**

without the owner manually rebuilding information between systems.

## Exit Gate

The recruiting-to-training handoff works as one continuous Person lifecycle.



---



# STAGE 5 — Real-World Development

## Goal

Connect digital training to real DJ work.

## Build

- manual events
- calendar feed / Google Calendar path as appropriate
- eligible training events
- observation assignment
- assistant event
- supervised event
- trainer rubric
- trainee reflection
- Event Experience
- event-count requirements
- advancement readiness

## Prove

Blueprint can manage:

**Learn → Practice → Observe → Work → Evaluate → Advance**

without becoming an event-management CRM.



---



# TESTER RELEASE

Invite **2–3 multi-op owners**.

Choose deliberately different businesses.

Recommended mix:

### Tester A

Simpler/lower-complexity DJ model.

### Tester B

More sophisticated multi-op with multiple services.

### Tester C

Experienced-DJ / subcontractor-heavy model.

Do not choose only people who operate like David.

## What We're Testing

Not:

> “Do you like the UI?”

Primary questions:

- Can they onboard without David?
- Does Blueprint understand their business?
- Are recommendations sensible?
- Can they configure their talent model?
- Does their real training structure fit the engine?
- Where do they become confused?
- What do they try to do that the architecture cannot represent?
- Where does David have to intervene?
- Would they be upset if access disappeared?

## Founder Rule

David may observe and interview testers.

David should avoid becoming their implementation consultant.

Every repeated explanation is a product problem to investigate.

## Tester Exit Gate

At least 2 outside companies can successfully configure and use the core product without founder-led setup.



---



# STAGE 6 — Ongoing Development

## Goal

Solve the:

**“I'm not training anyone right now, so why am I paying?”**

problem.

## Build

- development cycles
- quarterly surveys
- SWOT
- self-assessment
- manager review
- performance-review templates
- development goals
- recurring checkpoints
- event-count checkpoints
- continuing education
- reverification
- new-skill development
- advancement toward roles such as Trainer

## Important Boundary

Blueprint manages talent development.

It does not become a complete HRIS.

## Prove

A company with no current applicants or trainees still has meaningful reasons to use Blueprint.



---



# STAGE 7 — Course Builder Coach

## Goal

Make company-specific training creation easy enough that owners actually do it.

## Build

Guided creation for common training needs.

Initial strong use case:

### Photo Booth

Blueprint provides:

- recommended course structure
- filming guidance
- shot list
- upload workflow

AI assists with:

- transcription
- lesson creation
- written steps
- quizzes
- checklists
- troubleshooting
- assignments
- recommended verification

Owner reviews before publishing.

## Prove

A DJ owner with no instructional-design experience can create useful company-specific training without David building it for them.



---



# PAID BETA

Target:

**10–20 paying companies**

Likely price:

**99–149/month**

Final beta pricing is a commercial decision, not an engineering decision.

## Paid Beta Must Include

- self-service signup
- billing
- Company Blueprint
- recruiting
- training/development paths
- evidence
- advancement
- real-world development
- basic ongoing development
- sufficient Blueprint curriculum
- help/onboarding content
- monitoring
- reliable notifications
- secure tenancy

Course Builder Coach may enter beta progressively if sufficiently reliable.

## Primary Paid Beta Test

Can someone:

**discover Blueprint → subscribe → configure their company → begin getting value**

without scheduling a call with David?

## Success Signals

- owners complete onboarding
- owners invite team members
- applicants/trainees actually move through workflows
- companies continue using Blueprint when not actively hiring
- support burden remains manageable
- customers create/customize their own system
- customers would be disappointed to lose access
- meaningful customers remain after the initial training need passes



---



# PUBLIC BLUEPRINT V2

## Goal

Blueprint becomes a repeatable self-service SaaS product.

## Acquisition Channels May Include

- previous Blueprint customers
- DJ-industry communities
- founder audience/reputation
- educational content
- referrals
- partnerships
- Google Ads
- retargeting
- industry events

## Revenue Math

At $99/month:

102 customers ≈ $10k MRR\
202 customers ≈ $20k MRR

At $149/month:

68 customers ≈ $10k MRR\
135 customers ≈ $20k MRR

The product does not require thousands of customers to reach its initial financial objective.



---



# POST-V2 / NOT REQUIRED FOR LAUNCH

Potential later expansion:

### Community Library

Customers explicitly share useful templates/content.

### Marketplace

Creators sell approved training or development content.

Blueprint may participate economically in transactions.

### Industry Benchmarks

Opt-in/anonymized ecosystem insights.

### Additional Integrations

Build only where demonstrated customer demand exists.

### Specialized Training Ecosystem

Potential creator-led content for:

- Quinceañeras
- Bar/Bat Mitzvahs
- advanced mixing
- production
- Photo Booth platforms
- specialty events
- sales
- leadership

These are opportunities.

They are not excuses to delay V2.



---



# Build Discipline

Each stage should follow:

**SPECIFY**

What exactly should happen?

↓

**BUILD**

Implement one bounded vertical slice.

↓

**AUTOMATE TESTS**

Prove deterministic behavior.

↓

**STAGING**

Use realistic synthetic scenarios.

↓

**HUMAN VERIFY**

Check behavior requiring judgment.

↓

**RELEASE**

Ship according to risk level.

↓

**OBSERVE**

Watch actual behavior and failures.

↓

**LEARN**

Update the product deliberately.



---



# Anti-Pattern

Do not instruct Cursor:

> “Build Stage 3.”

Stages describe direction.

Individual Cursor work orders should remain small.

Example:

> Create Company and CompanyMembership with Owner/Admin membership. Implement tenant-isolated RLS. Seed Company A and Company B. Add automated tests proving a Company A owner cannot read or update Company B.

Finish.

Verify.

Then issue the next work order.



---



# Build Priority Rule

When deciding between:

**another feature**

and

**making an existing critical workflow trustworthy**

choose trustworthiness.

Blueprint's competitive advantage will not come from having the longest feature list.

It will come from combining:

**DJ-industry expertise**

**strong talent-development architecture**

**useful AI guidance**

**automation**

and

**software customers can trust.**



---



# North Star

Blueprint V2 should eventually allow a DJ-company owner to say:

> “I told Blueprint what kind of company I'm trying to build. It helped me figure out the people I need, helped me hire them, trained them, showed me whether they were actually ready, and keeps helping me develop them—without me having to personally run the entire system.”

That is the product we are building.
