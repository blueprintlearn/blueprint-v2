# Blueprint V2

## Engineering Constitution v0.1

### Purpose

Blueprint will be built primarily through AI-assisted development.

AI may write most of the code.

That does **not** mean AI determines whether the software is correct.

The engineering system must make it possible for the product owner to confidently answer:

**What changed? Why? What could break? How was it tested? Is it safe to ship?**

The goal is not maximum engineering ceremony.

The goal is:

> **Move quickly without using production customers as QA.**



---



# 1. Source of Truth

Blueprint has one authoritative software-development workflow.

**GitHub = code source of truth**

**Supabase = database/auth/backend infrastructure**

**Vercel = application deployment**

**Cursor / Claude = primary AI development agents**

Other AI/design tools may assist with planning, UI concepts, copy, prototypes or analysis.

They may not independently become another authority over production code or database schema.

There must never be competing systems independently changing the Blueprint database.



---



# 2. Architecture Documents Are Authoritative

Agents must respect, in order:

1. Product Constitution
2. Engineering Constitution
3. Product Invariants
4. Golden Paths
5. Data Model
6. Accepted feature specification
7. Existing implementation

If implementation conflicts with a higher-level rule, the agent must flag the conflict rather than silently redefining the product.

Agents may recommend changes to architecture.

They may not silently make them.



---



# 3. Environments

Blueprint must have separate environments.

## Development

Used for active development and experimentation.

Contains no production customer data.

Destructive operations are acceptable when intentional.

## Staging

Represents production as closely as reasonably possible.

Used for:

- Golden Path testing
- migration testing
- integrations
- permissions testing
- email/notification testing
- AI workflow testing
- manual acceptance testing

Staging uses synthetic/test data.

## Production

Contains real customers and real business data.

Production is not a testing environment.

Experiments should not be performed against production data simply because they are convenient.



---



# 4. Database Discipline

Blueprint uses one authoritative migration system.

Database schema changes must exist as version-controlled migrations in GitHub.

No production schema changes should exist only because an agent manually changed Supabase.

No second AI tool may maintain a separate migration history.

Every meaningful schema change should answer:

**Why is this migration required?**

**What existing data can it affect?**

**Can it safely run with existing records?**

**What happens if deployment fails halfway through?**

**How will we verify it after migration?**



---



# 5. Migration Safety

Database migrations should favor safe, incremental changes.

When practical:

**Add → migrate/backfill → verify → switch behavior → remove old structure later**

rather than:

**destroy old structure → replace immediately**

Destructive migrations require explicit attention.

Production migrations affecting important customer records must first run successfully against staging data representative of production conditions.

Migration success alone does not prove application correctness.

Relevant workflows must also be tested after migration.



---



# 6. Multi-Tenant Security

Tenant isolation is a foundational architectural requirement.

Almost all customer-owned operational data must be scoped to a company.

Tenant security must be enforced below the frontend.

The UI hiding another company's data is not security.

Blueprint should use database authorization/RLS or equivalent enforcement so unauthorized records cannot be retrieved.



---



# 7. Tenant Isolation Testing

Automated security tests must create at least:

**Company A**

and

**Company B**

with separate:

- users
- applicants
- DJs
- courses/content
- evaluations
- compensation information
- development records

Tests must deliberately attempt cross-tenant access.

Examples:

Company A user attempts to read Company B applicant.

Company A manager attempts to update Company B DJ.

Company A trainer attempts to submit an evaluation for Company B trainee.

Company A AI request attempts to retrieve Company B context.

Expected result:

**Access denied.**

Not merely:

**Frontend did not display the record.**

These tests should remain part of the permanent test suite.



---



# 8. Authorization Is Separate From Talent Roles

Blueprint distinguishes:

### System Permission

What a person may do inside Blueprint.

Examples:

Owner/Admin\
Manager\
Trainer/Mentor\
DJ/Trainee\
Applicant

### Talent Role

What a person is qualified to do for their company.

Examples:

Assistant DJ\
Wedding Lead DJ\
Trainer\
Venue Representative

Talent status must never automatically grant software permissions unless explicitly designed to do so.



---



# 9. Testing Strategy

Blueprint should use multiple types of tests because different failures require different detection methods.

## Unit Tests

Used for deterministic business rules.

Examples:

- capacity calculations
- competency completion logic
- deadline calculations
- advancement eligibility
- compensation calculations
- version selection

## Database / Authorization Tests

Used for:

- tenant isolation
- RLS
- permissions
- ownership
- protected records

## Integration Tests

Used where systems interact.

Examples:

- database + application
- email provider
- calendar integration
- AI provider
- file/video storage
- billing

## End-to-End Tests

Used to prove critical Golden Paths through the application.

Examples:

Applicant → Hire

Hire → Training

Experienced DJ → Assessment → Gap Training

Training → Verification → Advancement

Company creates custom training

Lead DJ enters ongoing development

## AI Evaluation Tests

AI behavior must be tested differently from deterministic software.

Blueprint should maintain representative evaluation examples for important AI workflows.

Examples:

- interview transcript analysis
- course generation
- rubric assistance
- company diagnosis
- candidate-profile recommendations

AI outputs should be evaluated against expected qualities and boundaries rather than exact wording.



---



# 10. Golden Paths Become Tests

The Golden Paths defined in the Product Constitution are not merely documentation.

As Blueprint matures, each critical Golden Path should have automated coverage.

At minimum:

### New DJ

Applicant → Hire → Full Development → Evidence → Advancement

### Experienced DJ

Assessment → Existing Skills Verified → Gap Training → Advancement

### Existing Team Member

Import/Add → Standardization → Development

### Custom Training

Company describes skill → creates company content → adds it to path → assigns it

### Ongoing Development

Lead DJ → review/checkpoint → development need → development activity

### Tenant Isolation

Company A cannot access Company B.

A feature affecting one of these paths cannot be considered complete if it breaks that path.



---



# 11. Definition of Done

A feature is not complete because:

**the page loads**

or

**Cursor says it works.**

Before meaningful work is considered done, the development agent should verify applicable items:

- acceptance criteria satisfied
- business rules tested
- permissions tested
- tenant isolation considered
- errors handled
- loading states handled
- empty states handled
- relevant mobile behavior checked
- database migrations tested
- relevant Golden Paths still pass
- notifications cannot accidentally mass-send
- AI failure has a safe fallback where appropriate
- monitoring/error reporting exists where appropriate
- documentation updated if architecture changed

Not every item applies to every change.

The agent must identify which ones apply.



---



# 12. Change Risk Levels

Every meaningful change should be classified.

## RED — High Risk

Examples:

- authentication
- authorization
- RLS
- tenant isolation
- billing
- advancement/certification logic
- destructive database migrations
- migrations affecting significant customer data
- bulk email/SMS/notifications
- AI actions that modify important records
- permissions
- customer data deletion
- security-sensitive integrations

RED changes require:

**automated tests + staging verification + explicit human approval before production**

## YELLOW — Medium Risk

Examples:

- workflows
- reminders
- deadlines
- training assignment logic
- calculations
- AI recommendations
- calendar integrations
- content versioning
- evaluation logic

YELLOW changes require:

**appropriate automated tests + staging verification**

## GREEN — Low Risk

Examples:

- copy changes
- visual polish
- minor layout
- non-functional presentation changes

GREEN changes may use a lighter process.

Risk level should reflect potential harm, not how many lines of code changed.



---



# 13. Dangerous Actions Need Friction

Actions capable of affecting many people or records must be deliberately designed.

Examples:

- sending messages to all applicants
- assigning training to an entire company
- changing a live development path
- deleting records
- changing compensation settings
- publishing a new company-wide requirement

Appropriate safeguards may include:

- previews
- counts of affected people
- confirmation
- dry-run mode
- staging
- audit logs
- reversible actions

The system should make accidental mass action difficult.



---



# 14. Notifications

Emails, SMS, reminders and notifications are production actions.

Notification logic must be testable without contacting real customers.

Staging should use safe recipient routing or equivalent safeguards.

Bulk communication features should show:

**who will receive the message**

before the message is sent.

Where practical, notification events should be logged.



---



# 15. AI Is Not A Trusted Database Operator

AI may:

- recommend
- analyze
- draft
- summarize
- classify
- generate content
- propose changes

AI should not receive unrestricted authority to modify consequential customer records.

For important actions:

**AI proposes → deterministic application logic validates → authorized human approves when appropriate → system executes**

Examples include:

- hiring
- advancement
- competency verification
- compensation changes
- company-wide training changes



---



# 16. AI Context Security

AI receives only information required for the current authorized task.

Company A AI context may contain:

**Blueprint global knowledge + authorized Company A information**

It may never contain:

**Company B private information**

or protected operating-company information.

Authorization must occur before context is assembled.

The prompt itself is not a security boundary.



---



# 17. AI Evaluation

Blueprint should not assume that because an AI response sounds intelligent, it is correct.

Important AI features should have evaluation datasets.

Example:

For one-way interview analysis, maintain representative candidate responses showing:

- strong evidence of a core value
- weak evidence
- ambiguous evidence
- irrelevant response
- potentially biased/inappropriate inference traps

Model or prompt changes should be evaluated against those examples before production when practical.



---



# 18. Human Judgment

Blueprint automates administration more aggressively than judgment.

Consequential decisions should remain human-controlled where appropriate.

Examples:

- hire/reject
- major role advancement
- subjective competency verification
- significant compensation decisions

Blueprint should provide the human with useful evidence rather than merely an unexplained AI score.



---



# 19. Observability

Blueprint should reveal failures before customers report them.

Production should provide visibility into:

- application errors
- failed background jobs
- failed integrations
- failed emails/notifications
- AI provider failures
- database failures
- authentication failures
- important automation failures

Critical workflows should not fail silently.



---



# 20. Auditability

Important actions should be attributable.

Where appropriate, Blueprint should record:

**what happened**

**when**

**who or what initiated it**

**what record was affected**

This is especially important for:

- advancement
- competency verification
- evaluations
- compensation configuration
- permissions
- bulk actions
- content publishing



---



# 21. Content Versioning

Blueprint master content is versioned.

Company customizations must not modify master content.

Updating Blueprint master content must not silently rewrite historical completion/evidence.

Historical records should retain enough information to know what version of training or evaluation was actually completed.



---



# 22. Test Data

Development and staging require realistic synthetic data.

Seed data should include examples such as:

**Company A**

- owner
- manager
- trainer
- inexperienced trainee
- experienced DJ
- applicants

**Company B**

- equivalent users and records

Include edge cases:

- overdue trainee
- failed quiz
- experienced DJ testing out
- trainee requiring remediation
- multiple talent roles
- customized company course
- old version of Blueprint content

Good test data makes both humans and AI agents better at testing.



---



# 23. Pull Request / Change Report

Every meaningful AI-generated change should provide a concise report.

### What changed?

Plain English.

### Why?

What problem or requirement does this solve?

### Risk level

GREEN / YELLOW / RED

### What could break?

Identify likely failure areas.

### How was it tested?

List actual tests performed.

Do not say merely:

**tested successfully**

### Architecture impact

Does this affect:

- Product Constitution?
- Engineering Constitution?
- Data Model?
- Golden Path?
- Product Invariant?

### Manual verification

What should David personally check before approving?

The product owner should not need to read every line of code to understand the risk of a change.



---



# 24. Agent Behavior

Development agents must not:

- silently change product architecture
- redefine product terminology
- bypass authorization because it is easier
- remove tests merely to make CI pass
- disable RLS to fix a bug
- hard-code customer IDs
- use production customer data as test fixtures
- silently introduce a second migration system
- treat AI output as authoritative evidence
- expose protected operating-company IP
- implement an entire large phase when asked for one bounded slice

When uncertain, the agent should identify the decision rather than inventing product policy.



---



# 25. Small Vertical Slices

Blueprint should be built incrementally.

Avoid instructions such as:

**Build the recruiting module.**

Prefer bounded slices such as:

**Create a tenant-isolated Company record, company membership, and owner onboarding with automated RLS tests.**

Then verify it.

Then move forward.

The objective is to maintain a working system while complexity grows.



---



# 26. Production Release Principle

Production deployment should answer:

**What exactly are we releasing?**

**What evidence says it works?**

**What is the risk?**

**How would we know if it failed?**

**Can we recover?**

The amount of process should scale with risk.

A button-label change does not require the same release process as tenant authorization.



---



# 27. Security Baseline

Before accepting paying customers, Blueprint should complete a dedicated security review covering at minimum:

- authentication
- authorization
- RLS
- tenant isolation
- secrets management
- service-role usage
- storage permissions
- API/edge-function authorization
- webhook verification
- rate limiting where appropriate
- sensitive logging
- dependency vulnerabilities
- backup/recovery strategy

Secrets must never be committed to Git.

Service credentials should be scoped as narrowly as practical.



---



# 28. Backups & Recovery

Before real customer data becomes important, Blueprint must have a documented recovery strategy.

The team should understand:

- what is backed up
- how frequently
- how restoration works
- what happens after a bad migration
- how accidental deletion is handled
- how customer-generated content is recovered

A backup that has never been tested should not automatically be assumed recoverable.



---



# 29. Simplicity Is A Feature

Blueprint should resist unnecessary architecture.

Do not build:

- microservices because they sound sophisticated
- custom infrastructure when a mature managed service solves the problem
- integrations without demonstrated customer need
- generic abstractions before multiple real use cases exist

The architecture should be sophisticated where Blueprint genuinely requires sophistication:

**tenant isolation, competencies, evidence, paths, versioning, authorization, automation and testing.**

Everything else should remain as simple as practical.



---



# 30. Core Engineering Principle

Blueprint is being built in an era where AI can produce software extremely quickly.

Therefore, typing code is not the primary constraint.

The constraint is determining whether the software:

**represents the business correctly**

**protects customer data**

**behaves predictably**

**survives change**

**can be understood**

**can be verified before release**

Blueprint's engineering advantage should not be:

**AI writes lots of code.**

It should be:

# We can use AI to ship quickly because we have a system for proving what it built.
