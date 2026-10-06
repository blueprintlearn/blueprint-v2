# Blueprint V2

## Golden Paths & Acceptance Scenarios v0.1

### Purpose

Golden Paths describe the critical journeys Blueprint must always be able to complete correctly.

They serve three purposes:

1. Define expected product behavior.
2. Give AI development agents unambiguous acceptance criteria.
3. Become the foundation for automated end-to-end and integration tests.

The language intentionally uses:

**GIVEN** — starting conditions\
**WHEN** — an action occurs\
**THEN** — expected result

Not every scenario needs to be automated immediately.

Critical paths should gain automated coverage as they are implemented.



---



# GOLDEN PATH 1

## New Company Creates Its Company Blueprint

### Scenario 1A — New Owner

**GIVEN**

A new paying customer creates a Blueprint company.

**WHEN**

the owner begins Company Blueprint onboarding

**THEN**

Blueprint guides them through:

- current DJ team
- DJ utilization
- event volume
- owner goals
- business model
- pricing
- services/enhancements
- market positioning
- economics
- compensation
- workforce model
- talent expectations
- culture
- core values
- ideal candidate

AND Blueprint may make recommendations based on their answers.

AND recommendations must be presented for owner review.

AND Blueprint must not silently make consequential business decisions for the company.



---



### Scenario 1B — Owner Doesn't Know

**GIVEN**

the owner is asked how they want to structure an area such as training or DJ development

**WHEN**

they indicate:

**I don't know / recommend one for me**

**THEN**

Blueprint recommends an appropriate starting framework.

AND explains enough reasoning for the owner to make an informed decision.

AND allows the owner to:

**Approve**

or

**Customize**

the recommendation.



---



### Scenario 1C — Owner Already Has A Process

**GIVEN**

the owner already has a process

**WHEN**

they choose:

**I already have a process**

**THEN**

Blueprint helps capture and structure that process rather than forcing the Blueprint default.



---



# GOLDEN PATH 2

## Capacity Before Recruiting

### Scenario 2A — Owner Wants More DJs But Doesn't Need Them

**GIVEN**

a company has:

5 active DJs

75 annual DJ events

15 average events per DJ

AND the owner says they want 10 DJs

**WHEN**

Blueprint evaluates the company's talent capacity

**THEN**

Blueprint must not automatically conclude:

**Recruit 5 DJs**

Blueprint should compare:

- current demand
- current utilization
- desired utilization
- expected growth
- company goals

AND explain whether the stated hiring target appears justified.



---



### Scenario 2B — Company Is Capacity Constrained

**GIVEN**

a company's existing DJs are working near or above the company's desired utilization

AND expected demand supports additional talent

**WHEN**

Blueprint evaluates capacity

**THEN**

Blueprint may recommend beginning recruitment.



---



# GOLDEN PATH 3

## Build The Ideal Candidate

### Scenario 3A — Core Values

**GIVEN**

an owner has not clearly defined behavioral core values

**WHEN**

they use the Core Values exercise

**THEN**

Blueprint uses guided questions and feedback to help them define exactly three primary behavioral core values.

AND each value includes observable behaviors.



---



### Scenario 3B — Values Affect Recruiting

**GIVEN**

the company has an approved Core Value

**WHEN**

Blueprint generates one-way interview questions

**THEN**

at least some questions should be designed to surface behavioral evidence related to that value.



---



### Scenario 3C — Trainable Versus Required

**GIVEN**

a company identifies desired hard and soft skills

**WHEN**

the Ideal Candidate Profile is created

**THEN**

Blueprint distinguishes between:

**Must Arrive With**

and

**Can Be Developed**

AND this distinction influences recruiting and development recommendations.



---



# GOLDEN PATH 4

## New Inexperienced DJ

### Scenario 4A — Applicant To Hire

**GIVEN**

an inexperienced candidate applies

**WHEN**

they move through the company's configured recruiting process

**THEN**

Blueprint may manage:

- application
- screening
- reminders
- deadlines
- one-way video
- transcript
- interview analysis
- human decision points

AND the same Person identity continues after hiring.

Blueprint must not create an unrelated second human record simply because the applicant becomes a trainee.



---



### Scenario 4B — Full Training Route

**GIVEN**

the new hire has little relevant DJ experience

AND the company uses a full development path

**WHEN**

the person enters development

**THEN**

Blueprint assigns the appropriate full path toward their target qualification.



---



### Scenario 4C — Training Completion

**GIVEN**

the trainee completes all required videos and quizzes

**WHEN**

practical competencies still require assignments, observations or test-outs

**THEN**

Blueprint must NOT mark the person qualified merely because the educational content is complete.



---



### Scenario 4D — Advancement

**GIVEN**

all required competencies and experience requirements are satisfied

**WHEN**

the trainee becomes advancement-eligible

**THEN**

Blueprint presents the evidence to an authorized human.

AND the consequential Talent Role is not granted until the required human approval occurs.



---



# GOLDEN PATH 5

## Experienced DJ / Standardization Route

### Scenario 5A — Experienced Candidate

**GIVEN**

a candidate has substantial prior DJ experience

**WHEN**

the company's process permits prior-skill assessment

**THEN**

Blueprint creates or assigns an assessment route rather than automatically requiring the full beginner curriculum.



---



### Scenario 5B — Competency Pass-Off

**GIVEN**

the experienced DJ demonstrates required Beatmixing competency during an approved assessment

**WHEN**

the assessment is successfully evaluated

**THEN**

Blueprint may verify the appropriate Beatmixing competency without requiring beginner Beatmixing training.



---



### Scenario 5C — Gap Training

**GIVEN**

an experienced DJ satisfies 80% of the target qualification

**WHEN**

Blueprint generates their development path

**THEN**

the path should focus on the unsatisfied requirements rather than assigning unnecessary training for competencies already verified.



---



# GOLDEN PATH 6

## Different Companies, Different Launch Paths

### Scenario 6A — Simple DJ Model

**GIVEN**

Company A sells relatively simple DJ services

AND does not require advanced mixing or complex production skills

**WHEN**

Blueprint recommends a development path

**THEN**

the recommended path may be shorter and simpler.



---



### Scenario 6B — Premium / Complex Model

**GIVEN**

Company B sells higher-complexity services

AND expects advanced MC, mixing and technical capabilities

**WHEN**

Blueprint recommends a development path

**THEN**

the path may contain additional:

- competencies
- training
- test-outs
- assistant experience
- observations
- supervised events
- technical training

Blueprint must not assume every DJ company needs the same training duration or structure.



---



# GOLDEN PATH 7

## Evidence & Verification

### Scenario 7A — Video

**GIVEN**

a lesson requires meaningful video completion

**WHEN**

a trainee attempts to skip or scrub through required material

**THEN**

Blueprint should not treat the behavior as equivalent to normal completion if the configured completion rules are not satisfied.



---



### Scenario 7B — Quiz

**GIVEN**

a trainee attempts a quiz multiple times

**WHEN**

Blueprint evaluates progress

**THEN**

attempt count, scores and relevant behavior remain available as evidence rather than only storing:

**Completed = true**



---



### Scenario 7C — Assignment

**GIVEN**

a trainee submits a practical assignment

**WHEN**

the assignment requires subjective skill evaluation

**THEN**

Blueprint may use AI assistance where appropriate

BUT should preserve the configured human/rubric verification requirement.



---



### Scenario 7D — Observation

**GIVEN**

a trainee attends a real event with a qualified trainer

**WHEN**

the trainer completes the configured observation rubric

**THEN**

the evaluation becomes evidence connected to:

- trainee
- event experience
- evaluator
- rubric version
- relevant competencies



---



# GOLDEN PATH 8

## Event Experience

### Scenario 8A — Eligible Event

**GIVEN**

Blueprint receives an upcoming event through an approved source

**WHEN**

a manager marks the event as eligible for observation or training

**THEN**

Blueprint may make the opportunity available to the appropriate development workflow.



---



### Scenario 8B — Experience Completed

**GIVEN**

Jake is assigned to an observation

**WHEN**

the event occurs and required post-event steps are completed

**THEN**

Blueprint records the Event Experience

AND triggers any required:

- evaluation
- reflection
- evidence
- next development activity.



---



# GOLDEN PATH 9

## Talent Role vs Event Qualification

### Scenario 9A — Wedding Lead

**GIVEN**

Jake becomes an approved Wedding Lead DJ

**WHEN**

the company's configuration maps Wedding Lead to general private-event qualifications

**THEN**

Jake may automatically receive the configured qualifications for:

- weddings
- birthdays
- graduations
- general private events

without separate duplicate training.



---



### Scenario 9B — Specialty Event

**GIVEN**

Jake is a Wedding Lead DJ

BUT has not completed the company's Quinceañera requirements

**WHEN**

Blueprint checks his qualifications

**THEN**

Jake must NOT be represented as Quinceañera-qualified.

The same principle applies to other specialty formats such as Bar/Bat Mitzvah or club DJ work where configured.



---



# GOLDEN PATH 10

## Extension / Certification

### Scenario 10A — Karaoke

**GIVEN**

Jake is already a Wedding Lead

**WHEN**

he completes the company's Karaoke requirements and receives required approval

**THEN**

Blueprint adds Karaoke Certification without changing or recreating his Wedding Lead role.



---



### Scenario 10B — Scratch

**GIVEN**

Jake wants to add Scratch DJ capability

**WHEN**

he completes the required curriculum and skills verification

**THEN**

Blueprint records the Scratch Certification separately from his primary Talent Role.



---



# GOLDEN PATH 11

## Company Creates Its Own Training

### Scenario 11A — Photo Booth

**GIVEN**

a company needs training for its specific Photo Booth system

AND Blueprint does not know the company's equipment-specific process

**WHEN**

the owner chooses to create Photo Booth training

**THEN**

Blueprint provides a recommended instructional architecture such as:

Overview\
Equipment\
Setup\
Operation\
Guest Experience\
Troubleshooting\
Breakdown\
Verification

AND provides guidance on what the owner should demonstrate or film.



---



### Scenario 11B — AI Assists Creation

**GIVEN**

the owner uploads or records the company's training material

**WHEN**

AI assists with course creation

**THEN**

Blueprint may help generate:

- transcript
- lesson structure
- written steps
- quizzes
- checklists
- troubleshooting material
- assignments
- suggested verification

AND the owner reviews the resulting training before it becomes active.



---



### Scenario 11C — Training Becomes Useful

**GIVEN**

the new course is approved

**WHEN**

Blueprint understands its competencies and intended qualification

**THEN**

Blueprint can recommend where it belongs in appropriate Development Paths.

The owner should not have to independently understand instructional sequencing to make the course useful.



---



# GOLDEN PATH 12

## Ongoing Development

### Scenario 12A — Lead DJ Is Already Trained

**GIVEN**

Jake is already a fully launched Wedding Lead

AND the company is not currently hiring

**WHEN**

the owner opens Blueprint

**THEN**

Blueprint may still provide meaningful ongoing development value through configured:

- check-ins
- SWOTs
- surveys
- reviews
- goals
- advanced skills
- new certifications
- reverification
- future advancement

Blueprint's usefulness must not depend entirely on an active new-hire class.



---



### Scenario 12B — Development Review

**GIVEN**

Jake reaches a configured quarterly or event-count checkpoint

**WHEN**

the review becomes due

**THEN**

Blueprint prompts the appropriate participants

AND collects the configured inputs

AND helps identify development needs.



---



### Scenario 12C — Review Creates Development

**GIVEN**

a review identifies Advanced MC as a development need

**WHEN**

the manager approves that development goal

**THEN**

Blueprint may create or recommend the relevant Development Path or activities.



---



# GOLDEN PATH 13

## Advancement Beyond Wedding Lead

### Scenario 13A — Trainer

**GIVEN**

Jake is an experienced Wedding Lead

AND the company wants to develop him into a Trainer

**WHEN**

Trainer becomes his target qualification

**THEN**

Blueprint creates the appropriate development path using the company's Trainer requirements.



---



### Scenario 13B — Company Has No Trainer Process

**GIVEN**

the company wants Trainers

BUT has no existing trainer-development system

**WHEN**

the owner asks Blueprint for help

**THEN**

Blueprint can recommend a generic Trainer-development framework.

It must not expose protected processes belonging to another company.



---



# GOLDEN PATH 14

## Content Ownership

### Scenario 14A — Blueprint Master

**GIVEN**

a company uses an unchanged Blueprint Master course

**WHEN**

the company assigns it

**THEN**

the company references the approved Blueprint content/version rather than unnecessarily duplicating the master.



---



### Scenario 14B — Company Customizes Master Content

**GIVEN**

a company wants to modify Blueprint Master content

**WHEN**

the owner chooses Customize

**THEN**

Blueprint creates a company-owned version/fork.

The Blueprint Master remains unchanged.



---



### Scenario 14C — Blueprint Publishes New Version

**GIVEN**

Jake completed version 2.0 of a course

**WHEN**

Blueprint releases version 2.1

**THEN**

Jake's historical evidence continues to show that he completed version 2.0.

Blueprint must not rewrite history to say he completed 2.1.



---



# GOLDEN PATH 15

## Sharing Content

### Scenario 15A — Private By Default

**GIVEN**

Company A creates a custom course

**WHEN**

the course is saved

**THEN**

it is private to Company A by default.



---



### Scenario 15B — Community Sharing

**GIVEN**

Company A chooses to share an eligible course

**WHEN**

the company explicitly approves community sharing

**THEN**

Blueprint may create a publishable shared artifact according to future community rules.

Private Company A information must not become visible merely because the course was shared.



---



### Scenario 15C — Future Marketplace

**GIVEN**

Blueprint eventually supports paid marketplace content

**WHEN**

a creator publishes an approved course for sale

**THEN**

buyers receive the licensed publishable content.

They do not receive access to the creator's private company records, source workspace or unrelated proprietary processes.



---



# GOLDEN PATH 16

## Tenant Isolation

### Scenario 16A — Read Attack

**GIVEN**

David belongs to Company A

AND Jake belongs to Company B

**WHEN**

David attempts to retrieve Jake's private Company B record directly

**THEN**

the database denies access.



---



### Scenario 16B — Write Attack

**GIVEN**

a Manager belongs to Company A

**WHEN**

they attempt to modify a Company B record

**THEN**

the database denies the write.



---



### Scenario 16C — AI Isolation

**GIVEN**

Company A asks Blueprint AI to analyze its talent

**WHEN**

AI context is assembled

**THEN**

only authorized Blueprint global information and Company A information may be included.

Company B private information must not enter the context.



---



# GOLDEN PATH 17

## Bulk Action Safety

### Scenario 17A — Applicant Email

**GIVEN**

an owner initiates an email action that could contact 260 applicants

**WHEN**

they reach the send step

**THEN**

Blueprint clearly identifies the audience and number of recipients before execution.

AND high-impact bulk actions use appropriate confirmation/safeguards.

A filtering assumption must not be treated as sufficient protection against unintended sends.



---



# GOLDEN PATH 18

## AI Failure

### Scenario 18A — Interview Analysis Fails

**GIVEN**

a candidate submits a valid one-way interview

**WHEN**

the AI analysis provider fails

**THEN**

the interview and transcript remain intact.

The candidate is not automatically rejected.

The manager can still review the evidence manually.



---



### Scenario 18B — AI Gives A Recommendation

**GIVEN**

Blueprint AI believes a candidate strongly matches a company core value

**WHEN**

the manager views the candidate

**THEN**

Blueprint shows useful reasoning/evidence.

It should not merely display an unexplained:

**92% Culture Match**

and treat that number as authoritative.



---



# GOLDEN PATH 19

## Human Override

### Scenario 19A — Authorized Exception

**GIVEN**

a trainee does not satisfy the normal advancement rules

BUT an authorized owner intentionally wants to make an exception

**WHEN**

Blueprint permits that type of override

**THEN**

the system requires the appropriate explicit action

AND records:

- who approved it
- when
- what requirement was overridden
- reason/notes where required

Blueprint should never disguise an exception as normal completion.



---



# GOLDEN PATH 20

## Historical Truth

### Scenario 20A — Company Changes Its Standards

**GIVEN**

Jake became Wedding Lead under Company Standard v1

**WHEN**

the company later changes Wedding Lead requirements

**THEN**

Blueprint retains historical truth about:

- what requirements Jake satisfied
- what evidence existed
- what standard/version applied
- who approved him

The company may separately decide whether the new standard creates a reverification requirement.

History must not be rewritten.



---



# Golden Path Rule

When an implementation changes behavior covered by a Golden Path:

1. Identify the affected scenario.
2. Determine whether the intended behavior is changing.
3. Update tests.
4. If product behavior is intentionally changing, update this document through an explicit product decision.
5. Never silently change the application and leave the Golden Path describing obsolete behavior.

Golden Paths are part of Blueprint's behavioral contract.
