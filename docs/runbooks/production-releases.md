# Production releases: `main` for integration, `production` for release

Status: **prepared, not applied.** Every step marked **[approval]** needs an explicit, named yes before anyone performs it. This runbook implements the Production Release Principle (Engineering Constitution §26) and does not override it.

## Target

| Branch | Purpose | Vercel deploys as |
|---|---|---|
| feature branches | work in progress | Preview |
| `main` | integration of reviewed work | Preview |
| `production` | exactly what users get | Production |

`production` only ever receives `main`, through a pull request that passes CI. It never receives direct pushes, feature branches, or hotfixes. A hotfix lands on `main` first and is then released.

## Current state (verified Oct 22, 2026)

- **Vercel production branch:** `main`. Every merge to `main` has produced a Production deployment (`02e6d6e`, `606303f`, `f85844d`, `16f5faa`, `090bbf1`). All other branches produce Preview deployments. There is no `vercel.json`, so this comes from Vercel's project settings.
- **Production URL:** `https://blueprint-v2-three.vercel.app` (the repository homepage). It currently serves `090bbf1`.
- **GitHub environments:** `Production` and `Preview` are created by Vercel's deployment status reporting. Neither has protection rules.
- **Ruleset "Protect Main"** (id 24578499), targeting the default branch:
  - requires a pull request with 0 approvals;
  - blocks deletion and force-push;
  - allows the merge, squash and rebase methods;
  - has an empty `required_status_checks` list, so **CI is not currently required** to merge into `main`;
  - has no bypass actors.
- **Account:** the repository is owned by the personal account `blueprintlearn`, which authors and merges every PR. GitHub does not let an author approve their own PR, so a required approval count above 0 would block every merge.
- **CI** (`.github/workflows/ci.yml`): before this change it ran only for PRs to and pushes on `main`. Its single job reports the check `prove`, from the GitHub Actions app (integration id 15368).

## Repository changes (this PR)

1. `ci.yml` now also runs on PRs to `production` and on pushes to `production`.
2. New job `production-source` runs only on PRs whose base is `production`. It fails unless the head branch is `main` in this repository. Branch names reach the script through environment variables and are never interpolated into it.
3. This runbook.

For `pull_request` events, GitHub runs the workflow as it exists on the PR's merge commit. A `main` → `production` PR therefore always uses `main`'s `ci.yml`, so this change must be on `main` before the first release PR.

## GitHub configuration [approval]

### New ruleset "Protect Production"

Create it under Settings → Rules → Rulesets → New branch ruleset, or `POST /repos/blueprintlearn/blueprint-v2/rulesets` with:

```json
{
  "name": "Protect Production",
  "target": "branch",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["refs/heads/production"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "pull_request",
      "parameters": {
        "required_approving_review_count": 0,
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_review_thread_resolution": true,
        "allowed_merge_methods": ["merge"]
      }
    },
    {
      "type": "required_status_checks",
      "parameters": {
        "strict_required_status_checks_policy": false,
        "do_not_enforce_on_create": false,
        "required_status_checks": [
          { "context": "prove", "integration_id": 15368 },
          { "context": "production-source", "integration_id": 15368 }
        ]
      }
    }
  ]
}
```

- **The `pull_request` rule blocks direct pushes.** Every change to `production` must arrive through a merged PR.
- **The required checks block merging** until `prove` (the full suite) and `production-source` pass. Pinning `integration_id` means only GitHub Actions can satisfy them, not an arbitrary commit status.
- **Merge method is `merge` only.** Squash or rebase would create commits that are not on `main` and would let the branches drift. A merge commit of `main` into `production` has exactly `main`'s tree.
- **Strict "branch up to date" is off.** `production` gains a merge commit at every release that `main` never contains, so strict mode would block every later release. CI already tests the PR's merge result, which is exactly what lands.
- **Bypass list is empty.** No one, including the owner, can push directly without first editing the ruleset, and that edit is visible in the ruleset history.
- **Approvals stay at 0** because of the single-account limit described above. The release approval is the named yes, recorded on the release PR.

### Update "Protect Main" (recommended)

Add a required check `{ "context": "prove", "integration_id": 15368 }` to the existing ruleset. Keep strict mode off and leave everything else unchanged. After this, PRs #14, #15 and #16 can only merge into `main` once each targets `main` and passes CI. That matches the planned order: merge #14, retarget #15 to `main`, merge it, then do the same for #16.

## Vercel configuration [approval]

Project → Settings → Environments → **Production** → **Branch Tracking**: change `main` to `production` and save. Nothing else changes. Check these settings without changing them:

- **Domains:** the production domain stays assigned to the Production environment, not to a specific Git branch. If any domain is pinned to the branch `main`, decide separately whether it should move. A domain pinned to `main` would then serve `main`'s Preview deployments.
- **Environment variables:** note which values are scoped to Production and which to Preview, including any branch-specific Preview values.
- **Deployment Protection** settings for Preview deployments.

## Behaviour after the change

- **Production domain:** keeps serving the current production deployment (`090bbf1`). Changing branch tracking does not redeploy. The domain only moves when a new commit lands on `production`, or when someone promotes or rolls back a deployment by hand.
- **Merges to `main`:** produce Preview deployments only, with Preview-scoped variables and `VERCEL_ENV=preview`.
- **Merges to `production`:** produce Production deployments, with Production-scoped variables and `VERCEL_ENV=production`.
- **Environment variables:** Vercel scopes variables by environment, not by branch name (except for explicit branch overrides), so Production keeps its values unchanged. **Check before switching:** whatever is scoped to Preview today, including the Supabase URL and key, will now also be used by `main`'s previews. If Preview points at the hosted production Supabase project, every PR preview already uses live data today, and `main` previews will too. That is an existing exposure and this change does not alter it. It is worth fixing separately with a non-production Supabase project.
- **Sentry:** `main` deployments now report as `staging`, because `VERCEL_ENV=preview` maps to `staging` in `lib/observability/env.ts`. `production` deployments report as `production`. The exception is if `SENTRY_ENVIRONMENT` is set explicitly in a Vercel scope; check this.
- **Feature-branch and PR previews:** unchanged. `production` itself never gets a Preview deployment, and `main` gets a stable branch preview URL.
- **Supabase:** unaffected. Hosted migrations remain a separate, manual, approved step. Confirm in the Supabase dashboard that no GitHub integration applies migrations on merges to `main`.

## Order of operations

Each step needs its own approval. Stop at any failed check. No step before 6 changes what users are served.

1. **[approval] Create `production`** at `090bbf1`, the commit that is live now. Vercel will make a Preview deployment of it, which is harmless. CI does not run, because the `ci.yml` at `090bbf1` does not yet know about `production`.
2. **[approval] Create "Protect Production"** immediately. Read it back with `gh api repos/blueprintlearn/blueprint-v2/rules/branches/production`. From this point no PR into `production` can merge until `main` carries this PR's `production-source` job. That is intentional.
3. **[approval] Switch Vercel branch tracking to `production`.** Confirm the production domain still serves `090bbf1`.
4. **[approval] Merge this infrastructure PR into `main`.** This is the test that the switch worked:
   - it must create a Preview deployment, with `environment: Preview` for the new SHA in the GitHub deployments API;
   - the production domain must not change.

   If it creates a Production deployment instead, the switch did not take effect. The app is identical to `090bbf1` (only CI and docs differ), so nothing user-facing changes, but stop and recheck Vercel.
5. **[approval] Update "Protect Main"** to require `prove`.
6. **[approval] Run a dry-run release.** Open a PR from `main` to `production` that contains only this PR's commit. Confirm:
   - the PR cannot merge until `prove` and `production-source` pass;
   - a direct `git push` to `production` is rejected;
   - merging produces exactly one Production deployment of the merge commit, with app behaviour unchanged.
7. Resume normal work: #14 → #15 → #16 into `main` (each retargeted to `main` so CI runs), then a release PR when you choose to ship.

**Release procedure from then on:** open a PR from `main` to `production` and title it "Release YYYY-MM-DD". In the body, answer §26's questions: what is released, what evidence says it works, the risk, how failure would be noticed, and how to recover. Wait for checks, get the named yes, then merge using "Create a merge commit". Verify the production deployment and the golden paths, not just HTTP 200.

## Rollback

- **A bad production release:** use Vercel → Project → Production Deployment → **Instant Rollback** to the previous production deployment. This takes effect immediately and needs no Git change. After a rollback, Vercel stops assigning production domains automatically, so new merges to `production` will not go live. Fix on `main`, release through a PR, then use **Undo Rollback** or promote the fixed deployment. On the Hobby plan, rollback only goes back one deployment.
- **Database changes are not rolled back by Vercel.** Migrations must stay backward compatible with the previous release (expand, then contract), so rolling back the app is always safe.
- **The branch switch misbehaves** (step 3 or 4): set branch tracking back to `main`. No deployment changes when you do. Leave `production` and its ruleset in place, or set the ruleset's enforcement to `disabled`.
- **The rulesets block legitimate work:** set the affected ruleset's enforcement to `disabled` (or `evaluate`). Don't delete it, so its configuration is kept.
- **CI change:** revert this PR on `main`. Until the required checks are removed, release PRs then cannot merge.
