# Production releases: `main` for integration, `production` for release

Status: **in progress.** Step 1 is done: `production` exists at `090bbf1`. Every later step marked **[approval]** needs an explicit, named yes before anyone performs it. This runbook implements the Production Release Principle (Engineering Constitution §26) and does not override it.

## Target

| Branch | Purpose | Vercel deploys as | Supabase |
|---|---|---|---|
| feature branches and PRs | work in progress | Preview | staging project |
| `main` | integration of reviewed work | Preview | staging project |
| `staging` | stable, seeded staging deployment branch (unchanged) | Preview | staging project |
| `production` | exactly what users get | Production | production project |

`production` only ever receives `main`, through a pull request that passes CI. It never receives direct pushes, feature branches, `staging`, or hotfixes. A hotfix lands on `main` first and is then released.

## Current state (verified Oct 22, 2026)

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

## Repository changes (this PR)

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
2. **[approval] Create "Protect Production"** from the JSON file, then run the read-back above. From this point no PR into `production` can merge until `main` carries this PR's `production-source` job. That is intentional.
3. **[approval] Environment-variable audit** (read-only, above). It must fully pass.
4. **[approval] Switch Vercel branch tracking to `production`.** Confirm the production domain still serves `090bbf1`.
5. **[approval] Merge this infrastructure PR into `main`.** This is the test that the switch worked:
   - it must create a Preview deployment, with `environment: Preview` for the new SHA in the GitHub deployments API;
   - the production domain must not change.

   If it creates a Production deployment instead, the switch did not take effect. The app is identical to `090bbf1` (only CI and docs differ), so nothing user-facing changes, but stop and recheck Vercel.
6. **[approval] Update "Protect Main"** to require `prove`.
7. **[approval] Run a dry-run release.** Open a PR from `main` to `production` that contains only this PR's commit. Confirm:
   - the PR cannot merge until `prove` and `production-source` pass;
   - a direct `git push` to `production` is rejected;
   - merging produces exactly one Production deployment of the merge commit, with app behaviour unchanged.
8. **[approval] Update the README** (next section) in a docs-only PR to `main`.
9. Resume normal work: #14 → #15 → #16 into `main` (each retargeted to `main` so CI runs), then a release PR when you choose to ship.

**Release procedure from then on:** open a PR from `main` to `production` and title it "Release YYYY-MM-DD". In the body, answer §26's questions: what is released, what evidence says it works, the risk, how failure would be noticed, and how to recover. Include the migration statement above if relevant. Wait for checks, get the named yes, then merge using "Create a merge commit". Verify the production deployment and the golden paths, not just HTTP 200.

## README updates after the switch (step 8)

These lines describe the old arrangement where `main` was the production branch. Update them only after step 5 confirms the switch; until then they are accurate. The exception is line 72, which is already inaccurate.

| README line | Current text | Change to |
|---|---|---|
| 66 | "Every pull request to `main`, and every push to `main`, runs the `CI / prove` …" | "… to `main` or `production` …", and mention `production-source`. |
| 72 | "`main` requires **`CI / prove`**." | It is inaccurate today. Once step 6 is done, state that `main` requires `prove` and `production` requires `prove` and `production-source`. |
| 78 | "`staging` is a deployment branch. Documentation and product PRs target `main`." | Add: "`production` is the release branch and only receives `main` through a release PR." |
| 84 | "Production \| Vercel Production on `main`" | "Vercel Production on `production`". Add a row for `main` as a Vercel Preview on the staging project. |
| 102 | "Vercel Preview (all non-`main`, including PRs and `staging`)" | "all non-`production`, including `main`, PRs and `staging`". |
| 166 | "Production branch is `main`. Staging is the `staging` deployment branch." | "Production branch is `production`; `main` and `staging` are Preview branches." |
| 171 | "… explicit human approval before Promote." | "… before merging the release PR into `production`." |

Historical verification tables (Slice 0.3 and 0.5) stay as written.

## Rollback

- **A bad production release:** use Vercel → Project → Production Deployment → **Instant Rollback** to the previous production deployment. This takes effect immediately and needs no Git change. After a rollback, Vercel stops assigning production domains automatically, so new merges to `production` will not go live. Fix on `main`, release through a PR, then use **Undo Rollback** or promote the fixed deployment. On the Hobby plan, rollback only goes back one deployment.
- **Database changes are not rolled back by Vercel.** Migrations must stay backward compatible with the previous release (expand, then contract), so rolling back the app is always safe.
- **The branch switch misbehaves** (step 4 or 5): set branch tracking back to `main`. No deployment changes when you do. Leave `production` and its ruleset in place, or set the ruleset's enforcement to `disabled`.
- **The rulesets block legitimate work:** set the affected ruleset's enforcement to `disabled` (or `evaluate`). Don't delete it, so its configuration is kept.
- **CI change:** revert this PR on `main`. Until the required checks are removed, release PRs then cannot merge.
- **The `production` branch itself:** it is a plain pointer to `090bbf1` until the first release. If the plan is abandoned before step 4, an admin can disable its ruleset and delete the branch. Nothing deploys from it before the switch.
