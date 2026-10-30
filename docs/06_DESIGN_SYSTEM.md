# Blueprint V2 — Design System

> Design-system reference (v1.2, approved by David Osborne on 2026-10-28; v1.1 on 2026-10-21). Visual and interaction rules only; the Product Constitution, Engineering Constitution, Data Model and Golden Paths take precedence. Where this document and the Engineering Constitution disagree on implementation (architecture, tenant isolation, testing, security, dependencies), the Engineering Constitution wins.
>
> Values live in `design-tokens/tokens.json`. `styles/blueprint/tokens.css` is generated from it with `pnpm tokens:build`, and CI fails if it drifts (`pnpm tokens:check`).

Blueprint helps DJ-company owners build the team they need: hire, train, verify, develop, advance, without the owner being the system. The brand should feel **warm, innovative, helpful and joyful**: calm and in control for owners, exciting and rewarding for the people growing. Every screen built from this system follows the seven principles below.

## Principles

1. **Calm for owners, joyful for growth.** Owner screens lead with what needs a decision and keep everything else quiet. Celebrate only real progress: an advancement, a hire, a finished course. Owner workflows stay focused; don't fill every screen to the density of the home dashboard.
2. **Sketch to solid.** The signature motif, taken from the B mark. **Solid** = proven or done. **Hatched** = in progress. **Drafted** (construction lines overshooting the corners) = planned, not started. The motif always comes with a clear status label (StatusTag, a legend with counts, or visible stage words). It never relies on pattern or color alone, and it's never decoration.
3. **Evidence, not scores.** Show readiness through proof: verified competencies, interview quotes, observations, events. Never show an unexplained percentage or match score.
4. **Blueprint recommends, you decide.** Suggestions explain why, offer a draft (a message, a plan), and leave the click to a person. **Reversible actions offer Undo. Consequential decisions (hiring, advancement, overrides, pay) require confirmation and keep an audit trail** of who decided, when, and why.
5. **Warm, plain voice.** See Content below.
6. **One family across both themes.** Light is warm paper; dark is deep navy, designed on purpose rather than inverted. Every text pair meets WCAG AA, including small labels and secondary text on colored cards.
7. **Customer-branded where employees, trainers and applicants see it.** Owner screens are Blueprint-branded. Trainee, trainer and applicant screens keep this system's layout, type and motif but swap in the DJ company's logo and its primary color (override `brand`, and `solid` follows in light). A small "Powered by Blueprint" sits in the footer.

## Content

- **Talk like a helpful colleague.** First names, short sentences, no jargon. "Jake is ready to become an Assistant DJ," not "Advancement eligibility met."
- **"You" is the owner. "Blueprint" is the product**, in the third person: "Blueprint drafted this for you," "Blueprint suggests. You decide." Blueprint has no persona or mascot.
- **Sentence case everywhere:** headings, buttons, chips. Buttons start with a verb and name the outcome: "Send to Devon", "Plan my next hire", "Approve Jake".
- **Headlines can smile once per screen:** "You're one great DJ away from a fully staffed spring." Everything else is plain.
- **Numbers come with meaning:** "12 of 12 competencies proven", "4 days past due", "40 things Blueprint handled for you this week". Spell out small counts in prose ("Three things need you today").
- **No emoji in the interface.** Celebration comes from the confetti burst on a DecisionCard and the words.
- **Use the product's own terms:** Company Blueprint, Talent Role, Competency, Development Path, Evidence, Advancement. Nav tabs are Home, People, Development, Recruiting, Library.
- **Never show internal values:** no database codes, enum names, ids, `null` or `snake_case` anywhere a customer can see it. Map them to the words below.
- **Labels have no colons and no "Your X: X" echoes.** If the card says "Your goal", the value is just "Scale".

### Role labels

**System roles** (what someone can do in Blueprint) have fixed display names. Show the role only where it changes what the person sees or can do, as plain small text, never as a chip that looks like a status.

| System role (code) | Show as | Describes |
| --- | --- | --- |
| `owner_admin` | Owner | Runs the company account; can change company settings and approve advancement |
| `manager` | Manager | Runs day-to-day development; reviews evidence |
| `trainer_mentor` | Trainer | Evaluates and coaches trainees at events |
| `dj_trainee` | DJ | Learns, practices and proves skills |
| `applicant` (planned) | Applicant | Applying to join the company |

**Talent roles** (Assistant DJ, Wedding Lead DJ, Trainer, Mentor…) are company-defined, and are shown exactly as the company names them. Never present a system role as a talent role or the other way round: "Trainer" the permission and "Trainer" the qualification are different things. Where both could appear, say "Access: Trainer" vs. "Role: Wedding Lead DJ".

## Color

- **Grounds:** `paper` is the page, `surface` is cards and panels, `surface-soft` is quiet fills inside cards.
- **Text:** `ink` for headings and primary text, `ink-2` for body, `muted` for dates and hints. All three are safe on paper, surface, surface-soft and every tint, in both themes.
- **Brand:** `brand` navy (#253860, from the B mark) anchors the system. Use one navy `brand` card per screen at most (the "handled for you" panel), with `text-on-brand`.
- **Coral** is the secondary accent and the important-action color. Use one `coral` button per view, notification pips, and the hatched highlight under a key word (`.bp-hl`). When coral is text, use `coral-text`.
- **Tints carry meaning, never decoration.** `blush` is advancement and celebration, `butter` is hiring and gentle attention, `sky` is nudges and info, `mint` is success and on track, `lavender` is training content, `danger` is errors only. Text on a tint uses `ink`, `ink-2`, `muted` or that tint's own `*-ink`. A chip on a card of the same tint sits on white (`onTint`).
- **Status is never color alone.** Every status has a word, and errors also get an icon.
- **Form controls** use `control-border` (3:1 or better on every surface in both themes), never `line`. Hover darkens to `ink`, errors turn `danger-ink`, and focus adds the `focus` ring.

## Type

- **Bricolage Grotesque** (`display`) is for the wordmark, the greeting, section headings and card titles. It's warm and slightly hand-made, which echoes the sketched B.
- **Figtree** (`body`) is for everything else.
- **Sizes:** display-xl (76) is for the one greeting per home screen; heading-l (38) for sections; heading-m (27) for card titles; body is 16. On phones, scale display-xl to 46, display-l to 33, heading-l to 29 and heading-m to 24.
- **Minimum sizes:** sentences are never smaller than 14px, and no text is smaller than 12px (stage labels, tab-bar labels). Small labels are bold.
- Both families are self-hosted through `next/font/local` in `lib/fonts.ts`, from the variable Latin subsets in `app/fonts/` (SIL OFL 1.1, licenses alongside). Builds never fetch Google Fonts. `next/font` sets `--font-bricolage` and `--font-figtree` on `<html>`; `app/globals.css` maps them to `--font-display` and `--font-body`, and Tailwind exposes them as `font-heading` and `font-sans`. Add latin-ext files to `app/fonts/` and `lib/fonts.ts` if another script is needed.

## The motif in practice

- **Solid** (`solid` fill, `.bp-solid`): verified competencies, completed journey stages, current leads in a seat map, the selected nav tab, primary buttons.
- **Hatched** (`.bp-hatch`, lines in `hatch`): the current journey stage, a person still developing toward a seat, a Company Blueprint section still in progress, a core value with limited evidence.
- **Drafted** (`.bp-drafted`, lines in `draft`, square `bp-radius-drafted` corners): an open seat on the plan, a course on the drawing board, a section not started.
- **Shape follows status.** Finished things are rounded (`bp-radius-lg` to `bp-radius-2xl`), planned things are square. Pair every motif shape with words: StatusTag for swatches, the SeatMap legend with counts, JourneyTrack stage names.

## Layout and spacing

- **Desktop owner pages:** max width 1240px, 32px gutters (`space-7`), 56px above the greeting, 64px between sections (`space-10`).
- **Phones:** 16px gutters and 44px between sections. Card rows become horizontal swipe rails, and a bottom tab bar replaces the top tabs.
- **Order of the home screen:** greeting, then up to three decisions, then one forward-looking feature panel, then people, then ideas, then calendar and pipeline.
- **Cards and radius:** cards use `bp-radius-xl` and feature panels `bp-radius-2xl`. Buttons, chips and tabs are pills. White cards get `shadow-card`; tinted cards don't. In CSS the radius tokens are `var(--bp-radius-*)`; in Tailwind use `rounded-bp-*`. Tailwind's own `rounded-sm` … `rounded-2xl` keep Tailwind's values, because no Blueprint custom property may share a name with a Tailwind default theme variable (a unit test enforces this).
- **Touch targets** are at least 44px. Every interactive element shows a 2px `focus` ring at a 3px offset.

## Forms

- **Build every input from TextField, NumberField or Select.** Never use raw `<input>` or `<select>` styling.
- **Anatomy:** label (body-strong, sentence case, no colon), then optional help (one short sentence, `muted`), then the 48px control, then the error.
- **Required by default.** Label optional fields "Optional". Never use asterisks.
- **Help text answers "why are you asking?"** in the owner's terms. Placeholders show an example ("e.g. 6"), never the only instruction.
- **Errors** appear after a submit attempt. They're specific about what to do ("Enter a whole number from 0 to 999."), sit under the field in `danger-ink` with an alert icon, and set `aria-invalid` and `aria-describedby`.
- **Layout:** one column on phones. Related short fields (two counts) can share a row on desktop.
- **Buttons:** one primary button per card. When a card holds several small independent forms, each Save is `soft` and `sm`, sitting in a row with its SaveStatus. A card with one form uses one primary Save.
- **Reveal, don't clutter:** a field that only applies to one choice (like "Other goal") appears only when that choice is selected.
- **Editors see fields, viewers see Facts.** Never show both for the same value.
- **In code:** `TextField`, `NumberField`, `Select`, `Fact` and `SaveStatus` live in `components/blueprint/` and are exported from `@/components/blueprint`. Server actions that save a form return `{ error, savedAt }` so the form can tell a confirmed save from the initial state.

## Empty values and saving

- **Empty is quiet.** A value that was never saved shows "Not set yet" (or something more specific, like "No goal chosen yet") in 16px `muted` body text, using Fact. It never appears at headline size, as a dash, as "0", or as `null`.
- **Zero is a real answer.** A saved 0 shows "0" at full size. Code must keep NULL (never saved) and 0 (saved zero) distinct end to end.
- **Empty fields show a placeholder example**, not a fake default.
- **Saving:** the Save button is disabled with `aria-busy` while the request runs and keeps its label. SaveStatus reads "Saving…".
- **Saved:** only after the server confirms, SaveStatus shows a check and "Saved" in `mint-ink` beside the button. It stays until that form is edited again, never on a timer.
- **Failed:** the field shows the error, nothing is shown as saved, and the previous value is kept.
- **No toasts for routine saves.** Celebration (confetti, coral) is reserved for real progress such as an advancement or a hire.

## Imagery and iconography

- **Logo:** the B mark (navy tile, sketched B in a drafting frame) beside the wordmark "Blueprint" in Bricolage Grotesque. See the Logos group. Use the mark as supplied; a cleaner redraw is planned separately.
- **Icons:** simple 24px stroke icons, rounded caps, 1.9px stroke, drawn in `ink` or `ink-2`. This system doesn't ship a full icon set yet; the bundle carries the handful it needs. For production, adopt one open-source stroke set with matching weight, such as Lucide, and keep strokes at 1.9.
- **Photography:** real photos of the DJ company's own people and events, uploaded by the customer. Never stock faces. With no photo, use an Avatar with initials on a tint.

## Accessibility

- Text meets WCAG AA (4.5:1) in both themes on every ground and tint it's documented for. Small labels on colored cards use the tint's `*-ink` or sit on a white chip.
- Interactive elements are real buttons and links. Icon-only buttons carry an `aria-label`.
- Motion is minimal: no animation is required to understand anything, and the confetti burst is static.

## Customer branding

Trainee, trainer and applicant screens wear the DJ company's brand. Owner screens stay Blueprint-branded. A company supplies three things: its **logo**, a **primary color** and, optionally, an **accent color**. Everything else (type, spacing, motif, tints, layout) stays Blueprint's, so every customer gets the same quality and the same accessibility.

### What a company can change

| Token | Default | Becomes | Rule |
| --- | --- | --- | --- |
| `brand`, `brand-deep` | Navy #253860 | Primary color | Brand panels. Text on them is white or ink, whichever reaches 4.5:1. |
| `text-on-brand`, `text-on-brand-muted` | White, #DCE4F3 | Computed | Always 4.5:1 or better on the panel. |
| `solid`, `text-on-solid` (light theme) | Navy, white | Primary, darkened if needed | Must reach 3:1 against paper and surface (it marks "proven" and "you are here") and carry white text at 4.5:1. |
| `hatch`, `draft` (light theme) | Navy at 42% and 55% | The adjusted solid at the same strengths | The motif's hatching and drafting lines follow the brand. They're always paired with a text label. |
| `coral`, `text-on-coral` | Coral, ink | Accent | Button fill. Text is ink or white, whichever reaches 4.5:1. |
| `coral-text`, `focus` | #B13E1D / #FF9C7C | Accent, darkened in light and lightened in dark | 4.5:1 on paper, surface and surface-soft in both themes. |

**Never changeable:** the status tints and their inks (`blush`, `butter`, `mint`, `sky`, `lavender`, `danger`), `ink`, `ink-2`, `muted`, `paper`, `surface`, and the dark-theme `solid` (cream). This keeps a red or green brand from ever looking like an error or a success.

### How unsafe colors are handled

1. **Validate.** Only `#RRGGBB` is accepted. Anything else is ignored and Blueprint's color is used.
2. **Adjust, keeping the hue.** If a color misses a contrast rule, its lightness moves in small steps (hue and saturation stay) until it passes. A bright yellow keeps its yellow panels with ink text, and gets a darker gold for buttons and done states.
3. **Fall back if it would change too much.** If passing needs more than a 35% lightness shift (a pale pastel, for example), that color falls back to Blueprint navy or coral.
4. **Report.** Every result comes with a report: the input, the color used, whether it was adjusted or fell back and why, and every contrast pair with its ratio. The brand settings screen shows this to the owner in plain words: "We darkened your color slightly so buttons stay readable."
5. **Dark theme.** Brand panels use a version of the primary that holds white text and stays visibly distinct from the dark page. Dark `solid`, `hatch` and `draft` stay Blueprint cream for every customer.

### Logo

Customers upload PNG, JPG or SVG. It shows at 38px tall in the top bar, on `paper`, with no recoloring. If there's no logo, the company name appears in `wordmark` style. "Powered by Blueprint" (`small`, `muted`) sits in the footer of every customer-branded screen, never in the top bar.

### In code

`lib/brand/tenant-theme.ts` implements this exactly: `computeTenantTheme({ primary, accent })` returns the overrides and the report, and `tenantThemeCss()` writes them as CSS scoped to `[data-tenant-brand]`. Unit tests cover the defaults, invalid input, adjustment, fallback, reserved tokens, and 600 random colors with zero failing contrast pairs.

## v1.3: CheckboxGroup

Added 30 October 2026. Approved for Slice 2. Every v1.2 token, component and pattern above is unchanged.

A labelled list of checkboxes for choosing any number of options from a short fixed list (2–8), with optional one-line descriptions, a follow-up field for an option like “Other”, and the same help, error and focus behaviour as the other form fields. To choose exactly one, use Select.

**In code:** `CheckboxGroup` lives beside TextField, NumberField and Select in `components/blueprint/` and is exported from `@/components/blueprint`. It reuses `bp-field__label`, `bp-field__help`, `bp-field__error` and `bp-field__optional`. It is a borderless `fieldset` with a `legend`; do not wrap it in `Field` (`htmlFor` is wrong on a legend).

**Props:** `label`, `name`, `options` (`{ value, label, description? }`), `value` + `onChange` or `defaultValue`, and optionally `help`, `error`, `note`, `followUp`, `optional`, `id`.

**Rules between options** (two that exclude each other, a maximum) live in the form, not the component. The form updates `value` and explains the change with `note`.

**Anatomy, in order:** legend (15px bold `ink`, sentence case, no colon; “Optional” when set), help (14px `muted`), options (one column, 8px gap, at most 560px), follow-up under its own checked option (indented 46px), note (14px `ink-2`, polite `role="status"`, always mounted), error (14px `danger-ink` with the alert icon, `role="alert"`).

**Row:** a `label` around a real `input type="checkbox"` (`appearance: none`) and the text; at least 44px tall; padding 10px 12px; radius `bp-radius-md`. The whole row toggles the box. The box is 22×22px with a 1.5px `control-border` edge on `surface`. Name is 16px bold `ink`; description is 14px `muted`, no ending period.

**States:** hover fills the row `surface-soft` and darkens the edge to `ink`. Checked fills the box `solid` with a `text-on-solid` check. Keyboard focus puts the `focus` ring around the whole row (`:has()`). An error turns unchecked edges `danger-ink` and sets `aria-invalid` on every box. Disabled options are not part of v1.3.

**Phones:** the same single column, 44px rows, wrapping descriptions, no horizontal scroll at 320px or 390px. No new tokens.
