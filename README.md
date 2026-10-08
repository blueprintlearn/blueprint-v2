# Blueprint V2

Talent-development operating system for multi-op DJ companies.

Slice 0.1 is the local engineering foundation: authentication, companies, memberships, and tenant isolation. Slice 0.2 is the GitHub `CI / prove` gate. Slice 0.3 is complete: local, staging, and production exist and are separate. Slice 0.5A adds optional Sentry error monitoring. It stays disabled unless a DSN is set.

## Requirements

- Node.js 24.21.0 (see `.nvmrc`)
- pnpm 12.9.1
- Docker (for local Supabase)

## Local setup

```bash
corepack prepare pnpm@12.9.1 --activate
pnpm install
pnpm exec supabase start
```

Copy the local API URL and publishable/anon key from `supabase start` into `.env.local`:

```bash
cp .env.example .env.local
```

Then:

```bash
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > types/database.ts
pnpm dev
```

## Seed credentials

| Email | Password | Company |
| --- | --- | --- |
| `owner-a@blueprint.test` | `blueprint-local-password` | Company A |
| `owner-b@blueprint.test` | `blueprint-local-password` | Company B |

These accounts are synthetic. They are allowed in local development and on staging. They must never be applied to production.

## Commands that must pass

```bash
node -v
pnpm --version
pnpm install
pnpm exec supabase start
pnpm exec supabase db reset
pnpm exec supabase gen types typescript --local > types/database.ts
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` and `pnpm test:e2e` require local Supabase to be running. Unit tests live in `tests/unit`. RLS and integration tests live in `tests/rls` and `tests/integration`. Browser E2E tests live in `e2e` and run against `pnpm start` after `pnpm build`.

## CI

Every pull request to `main`, and every push to `main`, runs the `CI / prove` GitHub Actions job on `ubuntu-24.04`.

That job installs Node 24.21.0 and pnpm 12.9.1, then rejects committed secrets, runs typecheck, lint, local Supabase (`supabase start` + `db reset` from committed migrations and seed), the existing Slice 0.1 tests, a production build, and Chromium Playwright E2E against that local stack. It does not use hosted Supabase, Vercel, or service-role credentials.

`CI / prove` fails if a tracked `.env*` file other than `.env.example` is committed, or if a committed file contains a hosted secret-key prefix, a service-role key assignment, or the service-role environment-variable name.

Requiring the check before merge is a GitHub setting, not repository code. `main` requires **`CI / prove`**.

## Environments

Slice 0.3 is verified. Local, staging, and production are separate. Staging has the synthetic Company A / Company B seed. Production has the same schema and RLS, zero companies, and zero auth users.

`staging` is a deployment branch. Documentation and product PRs target `main`.

| Environment | Where it runs | Database | Seed |
| --- | --- | --- | --- |
| Development | Laptop | Local Supabase | `db reset` |
| Staging | Vercel Preview on branch `staging` | Dedicated hosted staging project | Existing `seed.sql` only |
| Production | Vercel Production on `main` | Dedicated hosted production project | Never |

One Vercel project. Two hosted Supabase projects. No fourth hosted “dev” project. No custom domains in Slice 0.3.

### App environment variables

Only these names, in Vercel and in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`

| Target | Values |
| --- | --- |
| Local `.env.local` | Local API URL + publishable/anon key. Leave Sentry unset. |
| GitHub `CI / prove` | Local Supabase public keys only. Leave Sentry unset. |
| Vercel Preview (all non-`main`, including PRs and `staging`) | Staging Supabase public keys + staging Sentry DSN. `SENTRY_ENVIRONMENT=staging`. |
| Vercel Production | Production Supabase public keys. Do not set a production Sentry DSN in Slice 0.5A. |
| Vercel Development | Unset |

`NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` must be the same project DSN for a given target. Staging and production must use different Sentry projects. Source-map upload is deferred: do not set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, or `SENTRY_PROJECT`.

Forbidden everywhere, including Vercel Production: service-role keys, hosted secret API keys, database passwords, JWT secret, Sentry auth tokens, and any `NEXT_PUBLIC_*` secret other than the publishable Supabase key and the public Sentry DSN. Preview must never receive production credentials or the production Sentry DSN.

Sentry is fail-closed. If the DSN is missing, sanitization fails, or Sentry is down, the app continues. Raw `Error.message` values are replaced with `Application error` unless they match an explicit allowlisted error code. Request bodies, cookies, users, breadcrumbs, extras, traces, replay, logs, and unknown metadata are discarded. There is no permanent test endpoint.

### How migrations are applied

- Hosted schema changes use `pnpm exec supabase db push --project-ref <ref>` from committed files in `supabase/migrations/`.
- `db push` without `--include-seed` does not run `seed.sql`.
- Never run `supabase db reset --linked`, `--project-ref`, or `--db-url` against a hosted project.
- Never change hosted schema in the Supabase dashboard.

### Staging seed

```bash
pnpm exec supabase db push --project-ref "$STAGING_REF" --include-seed --dry-run
pnpm exec supabase db push --project-ref "$STAGING_REF" --include-seed
```

If migrations apply and seed is skipped:

```bash
pnpm exec supabase db query --project-ref "$STAGING_REF" --file supabase/seed.sql
```

Then prove Company A / Company B and the two seed emails exist on staging.

### Production migration

```bash
test "$PRODUCTION_REF" != "$STAGING_REF"
pnpm exec supabase db push --project-ref "$PRODUCTION_REF" --dry-run
# Must list only the migration. If it mentions seed.sql, STOP.
pnpm exec supabase db push --project-ref "$PRODUCTION_REF"
```

Do not pass `--include-seed`. Do not run `seed.sql` against production. Prove `public.companies` and `auth.users` counts are 0.

### Vercel / Preview / RED gate

- Production branch is `main`. Staging is the `staging` deployment branch.
- Preview (including `staging`) uses staging public keys. Production uses production public keys.
- Preview must never receive production credentials. Production must never receive the synthetic seed.
- Do not use a Vercel “staged production” deployment as staging (it uses production env vars).
- Do not use the Vercel ↔ Supabase marketplace integration.
- RED production changes still need staging verification and explicit human approval before Promote.
- Do not run `vercel --prod` as a substitute for that approval.
