# Production releases: `main` for integration, `production` for release

Status: **setup and rehearsal complete (Oct 27, 2026).** Steps 1–7 are done. Step 8 (README update) is prepared in PR #19, pending merge. Step 9 (resuming normal work) is open. The first release, PR #18, deployed `b07d57c` to production. Every release from now on follows the "Release procedure" below and needs an explicit, named yes. This runbook implements the Production Release Principle (Engineering Constitution §26) and does not override it.

## Current state (verified Oct 27, 2026)

- **Vercel:** Production tracks `production`. `main`, `staging`, feature branches and PRs deploy as Preview on the staging project.
- **Branches:** `production` is at `b07d57c`, the merge commit of release PR #18 with parents `090bbf1` and `aff5a57`. `main` is at `aff5a57`.
- **Production deployment:** 7374377648 for `b07d57c` succeeded. The production domain returns HTTP 200, and its bundle contains production Sentry project `4512220125593600` and not staging's `4512220113469440`.
- **Rulesets:** "Protect Main" (24578499) requires `prove`. "Protect Production" (25639327) requires `prove` and `production-source`, allows merge commits only, and has an empty bypass list. Both checks are pinned to GitHub Actions (integration id 15368).
- **Staging:** all four migrations are applied (`20261015120000` on Oct 23). All three staging Sentry variables cover every Preview branch.
- **Vercel build settings:** defaults, with no Ignored Build Step.

The sections below record how the setup was planned and verified. The "Before the change" state is historical.

## Target

| Branch | Purpose | Vercel deploys as | Supabase |
|---|---|---|---|
| feature branches and PRs | work in progress | Preview | staging project |
| `main` | integration of reviewed work | Preview | staging project |
| `staging` | stable, seeded staging deployment branch (unchanged) | Preview | staging project |
| `production` | exactly what users get | Production | production project |

`production` only ever receives `main`, through a pull request that passes CI. It never receives direct pushes, feature branches, `staging`, or hotfixes. A hotfix lands on `main` first and is then released.

## Before the change (verified Oct 22, 2026)

- **Vercel production branch:** `main`. Every merge to `main` has produced a Production deployment (`02e6d6e`, `606303f`, `f85844d`, `16f5faa`, `090bbf1`). All other branches produce Preview deployments. There is no `vercel.json`, so this comes from Vercel's project settings.
- **Production URL:** `https://blueprint-v2-three.vercel.app` (the repository homepage). It currently serves `090bbf1`. Its browser bundle contains the production Sentry project and not the staging one.
- **Deployment Protection:** every generated deployment URL and branch URL (including `staging` and `main`) redirects to Vercel login. Only the production domain is public.
- **Branches:**
  - `production` is at `090bbf1`, created in step 1. It is not protected yet.
  - `staging` is at `606303f`. It is the existing staging deployment branch (README, "Environments").
- **Supabase:** there are two hosted projects, staging and production. The README requires:
  - Preview (every branch except `main`) uses only the staging project's public keys, the staging Sentry DSN and `SENTRY_ENVIRONMENT=staging`;
  - Production uses the production project, has zero companies and zero auth users, and never receives the seed;
  - the Vercel ↔ Supabase marketplace integration is not used.

  The app reads Supabase values only on the server, so they cannot be verified from outside. This is why the audit in step 3 is required.
- **GitHub environments:** `Production` and `Preview` are created by Vercel's deployment status reporting. Neither has protection rules.
- **Ruleset "Protect Main"** (id 24578499), targeting the default branch:
  - requires a pull request with 0 approvals;
  - blocks deletion and force-push;
  - allows the merge, squash and rebase methods;
  - has no bypass actors;
  - has an **empty** `required_status_checks` list.

  Classic branch protection on `main` is off. `GET /repos/blueprintlearn/blueprint-v2/rules/branches/main` confirms that no status check is required today, so README's "`main` requires `CI / prove`" is out of date.
- **Account:** the repository is owned by the personal account `blueprintlearn`, which authors and merges every PR. GitHub does not let an author approve their own PR, so a required approval count above 0 would block every merge.
- **CI** (`.github/workflows/ci.yml`): before this change it ran only for PRs to and pushes on `main`. Its single job reports the check `prove`, from the GitHub Actions app (integration id 15368).

## Repository changes (PR #17)

1. `ci.yml` now also runs on PRs to `production` and on pushes to `production`.
2. New job `production-source` runs only on PRs whose base is `production`. It fails unless the head branch is `main` in this repository. Branch names reach the script through environment variables and are never interpolated into it.
3. This runbook, and [`rulesets/protect-production.json`](rulesets/protect-production.json).

For `pull_request` events, GitHub runs the workflow as it exists on the PR's merge commit. A `main` → `production` PR therefore always uses `main`'s `ci.yml`, so this change must be on `main` before the first release PR.

## GitHub configuration [approval]

### New ruleset "Protect Production"

The exact ruleset is [`rulesets/protect-production.json`](rulesets/protect-production.json). Creating it requires repository admin. Use either method:

- **UI:** Settings → Rules → Rulesets → New ruleset ▾ → **Import a ruleset** → select the file → review → Create. Do not edit fields during import.
- **API:** as an admin, run `gh api -X POST repos/blueprintlearn/blueprint-v2/rulesets --input docs/runbooks/rulesets/protect-production.json`.

What it enforces:

- **It targets only `refs/heads/production`.**
- **The `pull_request` rule blocks direct pushes.** Every change to `production` must arrive through a merged PR. `non_fast_forward` blocks force-pushes and `deletion` blocks deletion.
- **The required checks block merging** until `prove` (the full suite) and `production-source` pass. Pinning `integration_id` 15368 means only GitHub Actions can satisfy them, not an arbitrary commit status.
- **Merge method is `merge` only.** Squash or rebase would create commits that are not on `main` and would let the branches drift. A merge commit of `main` into `production` has exactly `main`'s tree.
- **Strict "branch up to date" is off.** `production` gains a merge commit at every release that `main` never contains, so strict mode would block every later release. CI already tests the PR's merge result, which is exactly what lands.
- **Bypass list is empty.** No one, including the owner, can push directly without first editing the ruleset, and that edit is visible in the ruleset history.
- **Approvals stay at 0** because of the single-account limit described above. The release approval is the named yes, recorded on the release PR.

Read-back after creation. None of these need admin:

```bash
R=repos/blueprintlearn/blueprint-v2
ID=$(gh api $R/rulesets --jq '.[] | select(.name=="Protect Production") | .id')
gh api $R/rulesets/$ID --jq '{enforcement, target, conditions, bypass_actors, rules}'
gh api $R/rules/branches/production --jq '.[] | {type, ruleset_id, parameters}'
gh api $R/rules/branches/main --jq '[.[].ruleset_id] | unique'   # must still be only Protect Main
```

Expected results:
- `enforcement: active`, include `["refs/heads/production"]`, exclude `[]`, and `bypass_actors` empty or null;
- exactly `deletion`, `non_fast_forward`, `pull_request` (allowed methods `["merge"]`) and `required_status_checks` (`prove` and `production-source`, both 15368);
- `main` unaffected.

### Update "Protect Main" (recommended, step 6)

Add a required check `{ "context": "prove", "integration_id": 15368 }` to the existing ruleset. Keep strict mode off and leave everything else unchanged. After this, PRs #14, #15 and #16 can only merge into `main` once each targets `main` and passes CI. That matches the planned order: merge #14, retarget #15 to `main`, merge it, then do the same for #16.

## Required environment-variable audit before the Vercel switch [step 3]

This is read-only and done in the Vercel dashboard by a project member. Do not copy values anywhere. Record only assignments and project refs. A Supabase URL's project ref is not secret; keys and DSNs are.

Project → Settings → **Environment Variables**. For each of `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` and `SENTRY_ENVIRONMENT`, record:

| Check | Pass condition |
|---|---|
| Environments assigned | One Production value and one Preview value. Development unset. |
| Branch-specific overrides | None. No value may be pinned to the Git branch `main`, because after the switch it would apply to `main` Previews and be missing from `production`. A Preview override pinned to `staging` is acceptable only if it also points at the staging project. |
| Supabase URL project ref | Preview's ref is the staging project, Production's ref is `vuiuhptuytbsadkdotca`, and they differ. |
| Publishable key | Preview's and Production's values differ. Compare by eye in the dashboard; do not paste them. |
| Sentry | Preview uses staging project `4512220113469440` with `SENTRY_ENVIRONMENT=staging`. Production uses `4512220125593600` with `SENTRY_ENVIRONMENT=production`. |
| Forbidden names | None present (README, "App environment variables"). |

Also check:
- **Domains:** `blueprint-v2-three.vercel.app` is assigned to the Production environment, not to the Git branch `main`.
- **Integrations:** there is no Supabase marketplace integration.
- **Supabase dashboard:** no GitHub integration applies migrations on push or merge.

Behavioural cross-check (optional, non-destructive): while logged into Vercel, open the `staging` branch preview and sign in as `owner-a@blueprint.test`. Success proves Preview talks to staging, because production has zero auth users. Do not sign up or create data there.

**Any failure blocks step 4.** Fixing a variable is a separate, approved Vercel change.

### Audit result (Oct 23, 2026)

| Item | Finding | Decision |
|---|---|---|
| Supabase URL | Production is `vuiuhptuytbsadkdotca`. Preview is `tvttoiiamdmylhlsiprg` (`blueprint-v2-staging`). They are separate entries. | Pass |
| Supabase URL scope | It applies to all Preview branches. A feature-branch Preview (PR #9, Oct 14) ran against staging, which would fail with "Missing NEXT_PUBLIC_SUPABASE_URL" if the variable were limited to `staging`. | Pass |
| Publishable key | Production and Preview have separate entries. The Preview key is marked Sensitive, so the values can't be compared directly. On Oct 14, the PR #9 Preview signed in as `owner-a` and `owner-b`, persisted values and kept the companies isolated. Those users exist only on staging (production has 0 auth users), and a mismatched key would fail with "Invalid API key". | Leave unchanged. Reconfirm by signing in on `main`'s Preview in step 5. |
| Sentry (Preview) | `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` and `SENTRY_ENVIRONMENT` are Preview-scoped to the Git branch `staging` only. Every other Preview, including `main` after the switch, builds without a DSN, so Sentry stays off (fail-closed) and the app is unaffected. This differs from README line 102. | Expand to all Preview branches: step 3c. **Done:** all three now cover every Preview branch. |
| Sentry (Production) | Vercel only allows branch-specific values in Preview, so Production values belong to the Production environment and are unaffected by the switch. | Pass |

## Staging migration history [step 3a, read-only]

The repository's `main` (`090bbf1`) has four migrations:

| Version | File | sha256 (first 16) | Production | Staging (last known) |
|---|---|---|---|---|
| `20261006120000` | `companies_and_memberships.sql` | `23d98d54df9c2d02` | applied | applied |
| `20261009200000` | `company_blueprints_owner_goal.sql` | `78e4192dea4149f6` | applied Oct 16 | applied |
| `20261013130000` | `company_team_today_dj_count.sql` | `1dd9fc47560abb3f` | applied Oct 16 | applied Oct 14, the identical file from `6c4e65f` |
| `20261015120000` | `company_team_today_desired_dj_count.sql` | `195a00a071cf8a79` | applied Oct 16 | **no record of any apply. Presumed missing.** Applied Oct 23 (step 3b). |

**Resolved Oct 23:** staging now has all four migrations, with none pending and existing data unchanged. The rest of this section records the finding.

So production is ahead of staging. That reverses the required order ("staging is migrated before production"). The "Staging" column comes from the Oct 14 `migration list` output and the session record, not a fresh read. Hosted reads need Supabase credentials that the Cloud Agent VM does not have. Confirm it with either read-only method:

- **Dashboard:** staging project `blueprint-v2-staging` → Database → Migrations.
- **CLI**, from a machine already logged in to Supabase:

  ```bash
  pnpm exec supabase migration list --project-ref tvttoiiamdmylhlsiprg
  ```

  Never use `--linked`: the laptop's linked project is **production**.

If `20261015120000` is missing, `main`'s Preview on staging will:
- show "Not set" for Team Today, because the query selects `desired_dj_count`, errors, and returns null;
- fail to save a desired count.

Production is unaffected.

## Staging catch-up: apply only `20261015120000` [step 3b, approval]

The migration is additive and nullable: `alter table public.company_team_today add column desired_dj_count integer` with a `0–999` check. It does not rewrite existing staging rows. It is the same file, with the same checksum, that production received on Oct 16.

```bash
STAGING_REF=tvttoiiamdmylhlsiprg
PRODUCTION_REF=vuiuhptuytbsadkdotca
test "$STAGING_REF" != "$PRODUCTION_REF"

git fetch origin main
git switch --detach 090bbf1ad87b483c983a218311b14f8e867df8c5
test "$(git rev-parse HEAD)" = 090bbf1ad87b483c983a218311b14f8e867df8c5
sha256sum supabase/migrations/20261015120000_company_team_today_desired_dj_count.sql
# must be 195a00a071cf8a7951cd5d842793f4aa5c7c0ea047297dec083f3b12708046ee

# 1. Read-only: remote must have exactly 20261006120000, 20261009200000 and 20261013130000.
pnpm exec supabase migration list --project-ref "$STAGING_REF"

# 2. Dry run: must list only 20261015120000_company_team_today_desired_dj_count.sql,
#    with no seed and no roles. Anything else: STOP.
pnpm exec supabase db push --project-ref "$STAGING_REF" --dry-run --skip-vault

# 3. [separate named approval] Apply.
pnpm exec supabase db push --project-ref "$STAGING_REF" --skip-vault
```

Forbidden here: `--linked`, `--db-url`, `--include-seed`, `--include-all`, `--include-roles`, `db reset` against any hosted project, and dashboard schema edits.

Verification after the apply:
1. `migration list --project-ref "$STAGING_REF"` shows all four versions as both local and remote.
2. Rerunning the dry run reports "up to date".
3. Generated types match the repository:

   ```bash
   pnpm exec supabase gen types typescript --project-id "$STAGING_REF" --schema public | diff - types/database.ts
   ```

   This is read-only and must print nothing.
4. Preview smoke on any non-`staging` Preview, behind Vercel login:
   - sign in as `owner-a@blueprint.test`;
   - *Historical expectation:* Team Today shows staging's saved current count instead of "Not set", and Desired shows "Not set". *Verified Oct 27:* DJs today `0` and Desired DJs "Not set", matching staging (`current_dj_count` 0, `desired_dj_count` NULL);
   - sign out.

   Saving a desired count, and checking it against `owner-b`, writes staging data, so it is optional and needs its own yes.
5. Production is untouched: its migration list is unchanged. Do not run any write command against it.

Rollback: this migration is additive and nothing depends on it except the app code already on `main`. If it must be undone on staging, do it with a new forward migration through the normal process, never `db reset` or a dashboard edit.

## Sentry Preview coverage [step 3c, approval]

**Done.** All three variables now cover every Preview branch; Production entries are unchanged. The plan is kept below for reference.

Proposed Vercel change. Only the scope changes; values stay the same. Before editing, confirm no other Preview entry exists for these names, because Vercel rejects a duplicate for the same scope.

| Variable | Now | Proposed |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Preview, Git branch `staging` (staging project `4512220113469440`) | Preview, **all Preview branches**, same value |
| `SENTRY_DSN` | Preview, Git branch `staging` | Preview, **all Preview branches**, same value |
| `SENTRY_ENVIRONMENT` | Preview, Git branch `staging`, value `staging` | Preview, **all Preview branches**, value `staging` |
| Production entries | Production | unchanged; do not touch |

Effects:
- Every Preview reports to the staging Sentry project, with environment `staging`. That includes `main` after the switch, feature branches, PRs and `staging`.
- `NEXT_PUBLIC_SENTRY_DSN` is compiled in at build time, so existing deployments are unchanged. Only new Preview builds pick it up, and no redeploy is needed.
- The staging Sentry project must keep the `[Remove] [Anything] from [$user.geo.**]` scrubbing rule. Check it before the change.

Verification:
1. **Production** (public, can be run from anywhere): the production domain's bundle still contains `4512220125593600` and not `4512220113469440`.
2. **The first new non-`staging` Preview build after the change**, in a browser logged into Vercel: view-source and the `_next/static` chunks contain `4512220113469440`, and do not contain `4512220125593600`.
3. **No synthetic errors.** Do not add a test route. Confirm delivery from the next naturally occurring staging error, or skip it. The Slice 0.5 staging delivery check already stands.
4. **README line 102 is now accurate again,** with "all non-`production`" after the switch.

Rollback: set the three entries back to Git branch `staging`. Only builds made after the change are affected.

## Integration and build-override check (Oct 23, 2026)

| Concern | Evidence | Result |
|---|---|---|
| Supabase GitHub integration or branching that applies migrations automatically | No Supabase app check runs, statuses, comments or deployments on any commit or migration PR (#7, #9, #10). Only `github-actions` and Vercel appear. Production's migration table held only `20261006120000` on Oct 16, after `main` already contained three more migrations. That is impossible if merges applied migrations automatically. | None active. |
| Vercel ↔ Supabase marketplace integration | It is forbidden by the README. No Supabase-created environment variables were found in the audit. | None. |
| `vercel.json`, `vercel-build` script, `.vercelignore` | None in the repository. `build` is `next build`. | None. |
| Ignored Build Step or build command override | These are not visible from GitHub. Every merge to `main` since #1 produced exactly one Production deployment (10 of 10), and feature branches deploy as Preview, so nothing branch-specific skips builds today. | **Check in the dashboard** before step 4: Settings → Build and Deployment → Ignored Build Step is "Automatic" or empty, and the build command is the default. A script naming `main` must be updated together with the switch. **Confirmed (step 3d):** defaults, no Ignored Build Step. |
| Manual production deployments | All 10 Production deployments are `vercel[bot]` Git deployments of `main` commits. | None. |

## Vercel configuration [approval, step 4]

Project → Settings → Environments → **Production** → **Branch Tracking**: change `main` to `production` and save. Nothing else changes.

## Behaviour after the change

- **Production domain:** keeps serving the current production deployment (`090bbf1`). Changing branch tracking does not redeploy. The domain only moves when a new commit lands on `production`, or when someone promotes or rolls back a deployment by hand.
- **Merges to `main`:** produce Preview deployments only, with `VERCEL_ENV=preview`, Preview-scoped variables, and therefore the **staging Supabase project** and staging Sentry. `main` previews get a stable branch URL behind Vercel login.
- **Merges to `production`:** produce Production deployments, with Production-scoped variables, `VERCEL_ENV=production` and the production Supabase project.
- **Environment variables:** Vercel scopes variables by environment, not by branch name (apart from explicit branch overrides, which the audit rules out). Production keeps its values unchanged.
- **`staging`:** unchanged. It is still a Preview deployment branch on the staging project and is still updated separately. It never feeds `production`.
- **Feature-branch and PR previews:** unchanged. `production` itself never gets a Preview deployment.
- **Sentry:** `main` deployments report as `staging`; `production` deployments report as `production`.
- **Supabase:** unaffected. Hosted migrations remain a separate, manual, approved step.

## Risk: staging migrations can lag application code

This happened once: staging lacked `20261015120000` until Oct 23 (steps 3a and 3b).

Hosted migrations are applied by hand with `supabase db push --project-ref`. After the switch, `main` deploys straight onto the staging database. If `main` contains a migration that has not been pushed to staging (for example PR #12's), the `main` Preview will fail wherever it touches the new schema. That failure is visible only in Preview, never in production.

Rules:
1. When a PR with a migration merges to `main`, push that migration to staging as part of the same approved change. Then verify the `main` Preview, including the generated types matching (`supabase gen types` vs `types/database.ts`).
2. A release PR into `production` that contains a migration must state:
   - that the migration is already on staging and verified there;
   - the production `db push --dry-run` output;
   - the order. Migrations run **before** the merge (expand), and must be backward compatible with the currently live app, because Vercel rollback does not undo them.
3. Never run `seed.sql` or `--include-seed` against production (README, "Production migration").

## Order of operations

Each step needs its own approval. Stop at any failed check. No step before 7 changes what users are served.

1. ~~Create `production` at `090bbf1`.~~ **Done.** Read back at `090bbf1`. `main` unchanged, no PR merged, the production deployment and ETag unchanged. Vercel created no deployment for the new branch and no CI ran.
2. ~~Create "Protect Production".~~ **Done.** Ruleset 25639327 is active and verified Oct 22. Its bypass list is hidden from non-admins, so confirm in the UI that it is empty. From this point no PR into `production` can merge until `main` carries this PR's `production-source` job. That is intentional.
3. ~~Environment-variable audit.~~ **Done** (Oct 23), with the findings above.
   - ~~**3a. [read-only] Confirm staging's migration history**~~ **Done.** `20261015120000` was missing.
   - ~~**3b. [approval] Apply `20261015120000` to staging**~~ **Done** Oct 23. All four migrations present, none pending, existing data unchanged.
   - ~~**3c. [approval] Expand staging Sentry to all Preview branches**~~ **Done.**
   - ~~**3d. [read-only, dashboard] Confirm build settings**~~ **Done.** Defaults, no Ignored Build Step.

   3a, 3b and 3d had to be complete before step 4, and 3c before step 5.
4. ~~**[approval] Switch Vercel branch tracking to `production`.**~~ **Done** Oct 27. The production domain kept serving `090bbf1`, and no deployment was created. The original checks were:
   - the production domain still serves `090bbf1`;
   - the `blueprint-v2-blueprintlearn.vercel.app` alias still points at the production deployment.

   `blueprint-v2-git-main-…` will start following `main`'s Preview. It is behind Vercel login, so this is expected.
5. ~~**[approval] Merge this infrastructure PR into `main`.**~~ **Done** Oct 27. PR #17 merged as `aff5a57` (squash, with the same tree as the reviewed head `4dee40c`). `prove` passed on `main`. Vercel created only Preview deployment 7369537734, and the production domain served the same assets as before. On `main`'s Preview, `owner-a` saw Company A with staging data: DJs today `0`, Desired "Not set", matching staging's `desired_dj_count` of NULL. The original checks were:
   - it must create a Preview deployment, with `environment: Preview` for the new SHA in the GitHub deployments API;
   - the production domain must not change;
   - **required:** sign in to `main`'s Preview (behind Vercel login) as `owner-a@blueprint.test`. Company A's home loads with staging data, which proves the Preview publishable key works with the staging project on `main`. *Historical expectation:* Team Today shows staging's saved count instead of "Not set", which proves 3b. *Verified Oct 27:* DJs today `0` and Desired DJs "Not set". Make no saves, then sign out;
   - if 3c was done, `main`'s Preview bundle contains staging Sentry project `4512220113469440` and not `4512220125593600`.

   If it creates a Production deployment instead, the switch did not take effect. The app is identical to `090bbf1` (only CI and docs differ), so nothing user-facing changes, but stop and recheck Vercel.
6. ~~**[approval] Update "Protect Main"** to require `prove`.~~ **Done** Oct 27. `prove` (integration 15368) is the only required check. Nothing else in either ruleset changed.
7. ~~**[approval] Run a dry-run release.**~~ **Done** Oct 27 with release PR #18 (`main` → `production`, containing only `aff5a57`):
   - `prove` and `production-source` both ran on the PR and passed (`Source is blueprintlearn/blueprint-v2:main`). Only "Create a merge commit" was offered.
   - The merge produced `b07d57c`, with parents `090bbf1` and `aff5a57`. It created exactly one Production deployment (7374377648), which succeeded. The production domain returns HTTP 200 with unchanged page content and the production Sentry project. `main` stayed at `aff5a57`.
   - A direct `git push` to `production` was not attempted. The ruleset's `pull_request` rule, with an empty bypass list, rejects it.
8. **[approval] Update the README.** Prepared in PR #19 (docs-only, into `main`), pending merge. See "README updates".
9. Resume normal work: #14 → #15 → #16 into `main` (each retargeted to `main` so CI runs), then a release PR when you choose to ship.

## Release procedure

1. Open a PR from `main` to `production` titled "Release YYYY-MM-DD". In the body, answer §26's questions: what is released, the evidence that it works, the risk, how failure would be noticed, and how to recover. Include the migration statement from "Risk: staging migrations can lag application code" if relevant.
2. Wait for `prove` and `production-source` to pass. Get the named yes on the PR.
3. Merge using **Create a merge commit**. Protect Production allows no other method.
4. Verify:
   - `production` is a merge commit whose parents are the previous `production` commit and `main`'s head;
   - exactly one new Production deployment, for that merge commit, and it succeeded;
   - the production domain serves the new build, its bundle contains production Sentry project `4512220125593600` and not `4512220113469440`, and the golden paths work, not just HTTP 200;
   - `main` did not move, and no other deployments appeared.

PRs into `main` may use any merge method. Release PRs into `production` must use a merge commit, so `production`'s tree always equals the `main` commit it released.

## README updates (step 8)

Prepared in PR #19, pending merge. Once merged, the README describes `production` as the Production branch, with `main`, `staging`, feature branches and PRs as Preview on the staging project. It lists the required checks for both rulesets and adds a short "Releasing to production" section that points here. Historical verification tables (Slice 0.3 and 0.5) stay as written.

## Rollback

- **A bad production release:** use Vercel → Project → Production Deployment → **Instant Rollback** to the previous production deployment. This takes effect immediately and needs no Git change. After a rollback, Vercel stops assigning production domains automatically, so new merges to `production` will not go live. Fix on `main`, release through a PR, then use **Undo Rollback** or promote the fixed deployment. On the Hobby plan, rollback only goes back one deployment.
- **Database changes are not rolled back by Vercel.** Migrations must stay backward compatible with the previous release (expand, then contract), so rolling back the app is always safe.
- **Abandoning the branch split:** set Vercel branch tracking back to `main`. No deployment changes when you do. Leave `production` and its ruleset in place, or set the ruleset's enforcement to `disabled`.
- **The rulesets block legitimate work:** set the affected ruleset's enforcement to `disabled` (or `evaluate`). Don't delete it, so its configuration is kept.
- **CI change:** revert PR #17 on `main`. Until the required checks are removed, release PRs then cannot merge.
- **Never repair `production` by hand.** Fix forward on `main` and release through a PR, or use Vercel Instant Rollback.
