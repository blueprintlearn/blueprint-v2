# Blueprint V2

## Core Data Model v0.1

### Purpose

This document defines the conceptual data model for Blueprint V2.

It is intentionally not SQL.

Its purpose is to establish the business objects and relationships that the eventual database must represent.

The database implementation must conform to the Product Constitution and Engineering Constitution.



---



# 1. Core Principle

Blueprint is not fundamentally organized around courses.

Blueprint is organized around:

**People → Capabilities → Evidence → Qualification → Development**

Courses are one mechanism used to develop capability.

The central model is:

**Person**

→ has a target

→ Blueprint determines requirements

→ person completes development activities

→ activities generate evidence

→ evidence verifies competencies

→ competencies satisfy qualifications

→ authorized humans approve consequential advancement.



---



# 2. Company

```
Company
```

Represents one Blueprint customer/tenant.

Examples of related information:

- company name
- locations/markets
- subscription
- settings
- status
- timezone
- branding

Almost all private operational records ultimately belong to a Company.

Tenant-owned records must be isolated from other companies.



---



# 3. Company Membership

```
CompanyMembership
```

Connects a Person/User to a Company and determines software access.

Examples:

- Owner/Admin
- Manager
- Trainer/Mentor
- DJ/Trainee
- Applicant

System permissions are separate from talent qualifications.

Someone being a Trainer for the DJ company does not inherently make them a Blueprint administrator.



---



# 4. Company Blueprint

```
CompanyBlueprint
```

Stores the approved strategic configuration Blueprint learns during onboarding and later updates.

Major areas include:

### Team

- current DJ count
- utilization
- event volume
- reliability
- pain points
- desired capacity
- growth targets
- trainer availability

### Owner Goals

Examples:

- stop DJing
- reduce events
- scale revenue
- expand markets
- improve consistency
- develop management
- increase capacity

### Business Model

- pricing
- packages
- tiers
- enhancements
- event types
- markets
- service complexity

### Economics

- relevant COGS assumptions
- DJ compensation
- training compensation
- assistant compensation
- direct event costs
- target margins

### Workforce Model

- employee
- contractor
- mixed
- company-defined structure

### Talent Philosophy

- hire inexperienced/develop
- hire experienced
- mixed strategy
- quality level
- training intensity
- launch philosophy

The Company Blueprint is configuration used by other Blueprint systems.



---



# 5. Core Values

```
CoreValue
```

Each company defines three primary behavioral core values.

A Core Value should include:

- name
- description
- observable behaviors
- positive indicators
- negative indicators
- interview guidance

Core Values may influence:

- recruiting copy
- application questions
- one-way interview questions
- interview analysis
- evaluations
- development conversations



---



# 6. Ideal Candidate Profile

```
CandidateProfile
```

Defines the type of person the company wants to recruit.

Includes:

### Soft Skills

Examples:

- reliability
- coachability
- communication
- composure
- initiative
- confidence

### Hard Skills

Each may be classified as:

**Must Arrive With**

or

**Can Be Developed**

### Practical Requirements

Examples:

- proximity
- transportation
- weekend availability
- minimum availability
- equipment expectations
- expected event commitment

Companies may eventually maintain multiple Candidate Profiles for different talent needs.



---



# 7. Person

```
Person
```

Represents a human throughout their relationship with the company.

Blueprint should avoid creating unrelated identities for:

Applicant David\
Trainee David\
DJ David\
Trainer David

when they are the same person.

A Person can progress through lifecycle states such as:

**Applicant → Candidate → Hired → Active → Alumni**

Lifecycle state does not determine talent qualification.



---



# 8. Recruiting Record

```
Application
```

Represents a person's application for a particular opportunity/company.

Related records may include:

- application responses
- screening results
- communications
- deadlines
- one-way interviews
- transcripts
- AI analysis
- audition requirements
- work samples
- status history
- human decisions

Recruiting feeds into the Person model rather than creating a separate permanent identity.



---



# 9. Talent Role

```
TalentRole
```

Represents a meaningful role or level within the company's talent system.

Examples:

- Assistant DJ
- Wedding Lead DJ
- Trainer
- Mentor
- Production Technician
- Venue Representative
- Bridal Show Representative

Talent Roles are company-configurable.

A Person may hold multiple Talent Roles.

Talent Roles should not be confused with event types or software permissions.



---



# 10. Event Qualification

```
EventQualification
```

Represents authorization/readiness to perform a particular category of event.

Examples:

- Wedding
- Corporate/Private Event
- Birthday
- Graduation
- Quinceañera
- Bar/Bat Mitzvah
- Club

A Wedding Lead DJ may automatically satisfy the company's requirements for several general private-event categories.

For example:

**Wedding Lead**

may qualify someone for:

- weddings
- birthdays
- graduation parties
- many corporate/private events

while not automatically qualifying them for:

- club work
- Quinceañeras
- Bar/Bat Mitzvahs
- other specialty event formats

Each company may define these mappings differently.



---



# 11. Skill / Service Certification

```
Certification
```

Represents an additional capability that does not necessarily justify a separate primary Talent Role.

Examples:

- Karaoke
- Scratch DJ
- Photo Booth
- Uplighting
- Cold Sparks
- Advanced Ceremony Audio
- specialty production systems

Certifications may require:

- competencies
- coursework
- assignments
- test-outs
- event experience
- human approval

A Person may hold many Certifications.



---



# 12. Competency

```
Competency
```

Represents something a person can actually know or do.

Examples:

- Wedding Flow
- Basic MC
- Advanced MC
- Beatmixing
- Music Knowledge
- Ceremony Audio
- Equipment Troubleshooting
- Client Communication
- Karaoke Hosting
- Scratch Fundamentals

Competencies should be reusable.

Blueprint may provide master competencies.

Companies may create company-specific competencies.



---



# 13. Competency Level

Where appropriate, a competency may support levels.

Example:

**MC**

Level 1 — Basic Announcements\
Level 2 — Wedding MC\
Level 3 — Advanced MC

or:

**Beatmixing**

Basic\
Intermediate\
Advanced

A company determines the level required for a qualification.



---



# 14. Qualification Requirement

```
QualificationRequirement
```

Connects a qualification to what must be proven.

A qualification can be:

- Talent Role
- Event Qualification
- Certification

Example:

### Wedding Lead DJ

requires:

Wedding Flow — Advanced\
MC — Wedding Level\
Music Knowledge — Required\
Ceremony Audio — Required

### Scratch Certification

requires:

Scratch Fundamentals\
Technique Assessment\
Final Performance Test-Out

This allows the same competency engine to support many kinds of advancement.



---



# 15. Learning Content

Blueprint learning content may contain:

```
Course
```

→ `Module`

→ `Lesson`

with associated:

- video
- text
- resources
- quiz
- assignment
- checklist
- test-out instructions

Content teaches.

Content alone does not prove competency.



---



# 16. Content Origin

Every content item has an origin/owner model.

Possible origins:

### Blueprint Master

Official Blueprint-created content.

### Company Private

Created for one company's internal use.

### Community

Explicitly shared for use by other Blueprint companies.

### Marketplace

Future commercially distributed content.

Marketplace functionality is not required for initial launch.

The data model should not prevent it later.



---



# 17. Content Visibility

Content should support explicit visibility states such as:

**Private**

**Blueprint Global**

**Community Shared**

**Marketplace Published**

Company-created content defaults to:

**Private**

Sharing must always be intentional.



---



# 18. Content Version

```
ContentVersion
```

Training content must be versionable.

Blueprint must be able to know:

**what version Jake actually completed.**

Updating a course must not silently change historical evidence.

Companies may:

**Use Blueprint Master**

or

**Fork/Customize**

Customized content becomes company-owned while retaining lineage back to the source where useful.



---



# 19. Content Lineage

Blueprint should know when content came from another piece of content.

Example:

Blueprint Photo Booth Framework

→ Company A customized version

or eventually:

Marketplace Quinceañera Course

→ Company B licensed version

This enables:

- updates
- version comparison
- licensing
- attribution
- marketplace support

without exposing the creator's private company data.



---



# 20. Development Path Template

```
DevelopmentPathTemplate
```

Defines a reusable recommended journey.

Examples:

- New Wedding DJ
- Experienced DJ Standardization
- Assistant → Wedding Lead
- Trainer Development
- Karaoke Certification
- Scratch Certification

Blueprint can provide templates.

Companies can customize them.

Templates are not individual trainee progress.



---



# 21. Individual Development Path

```
DevelopmentPath
```

Represents an actual person's journey toward a target.

Examples:

**Jake → Wedding Lead**

**Sarah → Karaoke Certification**

**Mike → Trainer**

A Development Path may originate from a template but becomes specific to the person.

Blueprint can personalize it based on:

- prior experience
- assessment results
- verified competencies
- company requirements
- remediation needs



---



# 22. Development Requirement / Activity

```
DevelopmentActivity
```

Represents something the person must do or prove.

Possible types include:

- lesson
- course
- quiz
- assignment
- practice
- equipment practice
- work sample
- audition
- observation
- assistant event
- supervised event
- non-wedding event
- group training
- live test-out
- trainer evaluation
- reflection
- review
- custom requirement

Activities may have:

- deadline
- prerequisite
- sequence
- instructions
- required evidence
- evaluator
- retry rules



---



# 23. Assessment

```
Assessment
```

Determines what someone already knows or can do.

Used especially for:

- experienced DJs
- subcontractors
- existing company DJs
- specialty qualifications

Assessment can include:

- audition
- mix submission
- interview
- knowledge test
- live demonstration
- skills check
- trainer evaluation

Assessment generates Evidence.

Passing an assessment may satisfy competencies without requiring unnecessary training.



---



# 24. Evidence

```
Evidence
```

Represents proof that a person completed, demonstrated or experienced something.

Examples:

- lesson/video completion record
- quiz attempt
- assignment submission
- uploaded audio
- uploaded video
- test-out result
- trainer rubric
- observation
- completed event
- reflection
- assessment result

Evidence records should retain enough historical information to remain meaningful later.



---



# 25. Competency Verification

```
CompetencyVerification
```

Records the conclusion that evidence satisfies a competency requirement.

Possible states:

- Not Evaluated
- In Progress
- Needs Work
- Verified
- Expired / Reverification Required

Verification should record:

- competency
- person
- evidence used
- level achieved
- verifier
- verification method
- date
- relevant content/rubric version

AI may assist evaluation.

Consequential verification may require a human depending on company configuration.



---



# 26. Advancement Decision

```
AdvancementDecision
```

Records a human decision to grant a consequential qualification.

Examples:

**Approve Assistant DJ**

**Approve Wedding Lead**

**Approve Trainer**

**Approve Karaoke Certification**

The system should retain:

- approver
- date
- requirements satisfied
- exceptions/overrides
- notes

Advancement should be auditable.



---



# 27. Qualification Achievement

```
QualificationAchievement
```

Represents a qualification a Person currently holds.

Qualification may reference:

- Talent Role
- Event Qualification
- Certification

Examples:

Jake:

**Wedding Lead DJ — Active**

**Wedding Events — Qualified**

**General Private Events — Qualified**

**Karaoke — Certified**

**Scratch DJ — Certified**

**Quinceañera — Not Qualified**

Achievements may support:

- issue date
- expiration
- reverification date
- status
- supporting Advancement Decision



---



# 28. Event / Experience Opportunity

```
ExperienceEvent
```

Represents an event used for development.

Blueprint is not the company's event-management system.

It only needs enough event information to support development.

Possible sources:

- Google Calendar
- iCal/calendar feed
- manual creation
- future integration

An event may be marked eligible for:

- observation
- assistant training
- supervised lead
- specialty-event experience
- other company-defined development



---



# 29. Event Experience

```
EventExperience
```

Connects a Person to a development experience at an event.

Examples:

- observed
- assisted
- partially led
- supervised lead
- full lead
- specialty-event practice

Event Experience may generate Evidence and trigger evaluations.



---



# 30. Evaluation / Rubric

```
Evaluation
```

Represents structured human or assisted evaluation.

Examples:

- observation rubric
- MC test-out
- assignment rubric
- trainer evaluation
- post-event review

Blueprint can provide rubric templates.

Companies may customize them.

Evaluation results can become Evidence.



---



# 31. Development Cycle

```
DevelopmentCycle
```

Supports development after launch.

Examples:

- quarterly development
- annual review
- five-event check-in
- ten-event check-in
- advanced MC development
- new equipment rollout
- trainer development

A Development Cycle may generate:

- reflections
- evaluations
- SWOT
- goals
- assignments
- training
- reverification



---



# 32. SWOT / Review

```
DevelopmentReview
```

Supports structured ongoing development.

Possible types:

- SWOT
- quarterly survey
- performance review
- self-assessment
- manager review

Reviews should be configurable.

Blueprint may provide recommended templates.

Companies may customize them.

Reviews can identify development needs without automatically changing qualifications.



---



# 33. Development Goal

```
DevelopmentGoal
```

Represents an improvement objective.

Examples:

- improve MC transitions
- achieve intermediate beatmixing
- become Trainer-ready
- improve equipment troubleshooting

Goals may generate new Development Activities or Development Paths.



---



# 34. Marketplace Architecture — Future Only

Blueprint should not build marketplace functionality for initial launch.

However, content architecture should permit future objects such as:

```
CreatorProfile
MarketplaceListing
License
Purchase
RevenueShare
Rating/Review
```

A marketplace item must be a publishable content artifact separate from the creator's private company records.

A purchase should grant defined usage rights without exposing private source data.

Marketplace design is deferred until customer/content demand exists.



---



# 35. Conceptual Relationship

At the center of Blueprint:

**COMPANY**

defines

**COMPANY BLUEPRINT**

which helps define

**TALENT ROLES + EVENT QUALIFICATIONS + CERTIFICATIONS**

which require

**COMPETENCIES**

which can be developed through

**LEARNING CONTENT + DEVELOPMENT ACTIVITIES + EXPERIENCE**

which produces

**EVIDENCE**

which supports

**COMPETENCY VERIFICATION**

which enables

**HUMAN ADVANCEMENT**

which creates

**QUALIFICATION ACHIEVEMENTS**

while

**DEVELOPMENT CYCLES**

continue improving the Person over time.



---



# 36. Core Data Invariants

1. A Person is not duplicated simply because their lifecycle stage changes.
2. System permissions are separate from talent qualifications.
3. Talent Roles are separate from Event Qualifications.
4. Event Qualifications are separate from Skill/Service Certifications.
5. Courses teach; they do not automatically prove competency.
6. Competency verification must be supported by defined evidence.
7. Development Paths may differ between people pursuing the same qualification.
8. Experienced people may satisfy requirements through assessment rather than unnecessary training.
9. Company-owned operational records must remain tenant-isolated.
10. Company content defaults to private.
11. Sharing company content requires explicit action.
12. Blueprint Master content cannot be modified by customer customization.
13. Historical evidence must remain connected to the relevant version of content/evaluation.
14. Consequential advancement must remain auditable.
15. AI assistance does not bypass authorization or required human decisions.
16. Marketplace architecture must never expose a creator's private company data.



---



# 37. Scope Rule

This document defines conceptual entities.

It does not authorize implementation of every entity immediately.

Cursor should implement only the entities required for the currently approved vertical slice.

The existence of an object in this document is not an instruction to build the entire feature.

This model exists so each small feature is built toward a coherent long-term architecture rather than inventing incompatible structures as Blueprint grows.
