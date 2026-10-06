# Blueprint V2

Talent-development operating system for multi-op DJ companies.

Slice 0.1 is the local engineering foundation: authentication, companies, memberships, and tenant isolation.

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

These accounts are synthetic. They are allowed in local development, and on staging once 0.3B exists. They must never be applied to production. Do not change `supabase/seed.sql` in Slice 0.3A.

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
```

`pnpm test` requires local Supabase to be running. Unit tests live in `tests/unit`. RLS and integration tests live in `tests/rls` and `tests/integration`.

## CI

Every pull request to `main`, and every push to `main`, runs the `CI / prove` GitHub Actions job on `ubuntu-24.04`.

That job installs Node 24.21.0 and pnpm 12.9.1, then rejects committed secrets, runs typecheck, lint, local Supabase (`supabase start` + `db reset` from committed migrations and seed), the existing Slice 0.1 tests, and a production build. It does not use hosted Supabase, Vercel, or service-role credentials.

`CI / prove` fails if a tracked `.env*` file other than `.env.example` is committed, or if a committed file contains a hosted secret-key prefix, a service-role key assignment, or the service-role environment-variable name.

Requiring the check before merge is a GitHub setting, not repository code. After the workflow has run once, set a branch protection rule on `main` that requires **`CI / prove`**.

## Environments

These are the Slice 0.3 environment rules. Staging and production infrastructure are created in 0.3B and 0.3C; they do not exist yet.

| Environment | Where it runs | Database | Seed |
| --- | --- | --- | --- |
| Development | Laptop | Local Supabase | `db reset` |
| Staging | Vercel Preview on branch `staging` (0.3B) | Dedicated hosted staging project | Existing `seed.sql` only |
| Production | Vercel Production on `main` (0.3C) | Dedicated hosted production project | Never |

One Vercel project. Two hosted Supabase projects. No fourth hosted “dev” project. No custom domains in Slice 0.3.

### App environment variables

Only these names, in Vercel and in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

| Target | Values |
| --- | --- |
| Local `.env.local` | Local API URL + publishable/anon key |
| Vercel Preview (all non-`main`, including PRs and `staging`) | Staging URL + staging publishable key |
| Vercel Production | Production URL + production publishable key |
| Vercel Development | Unset |

Forbidden everywhere, including Vercel Production: service-role keys, hosted secret API keys, database passwords, JWT secret, and any `NEXT_PUBLIC_*` secret. Preview must never receive production credentials.

### How migrations are applied

- Hosted schema changes use `pnpm exec supabase db push --project-ref <ref>` from committed files in `supabase/migrations/`.
- `db push` without `--include-seed` does not run `seed.sql`.
- Never run `supabase db reset --linked`, `--project-ref`, or `--db-url` against a hosted project.
- Never change hosted schema in the Supabase dashboard.

### Staging seed (0.3B only)

```bash
pnpm exec supabase db push --project-ref "$STAGING_REF" --include-seed --dry-run
pnpm exec supabase db push --project-ref "$STAGING_REF" --include-seed
```

If migrations apply and seed is skipped:

```bash
pnpm exec supabase db query --project-ref "$STAGING_REF" --file supabase/seed.sql
```

Then prove Company A / Company B and the two seed emails exist on staging.

### Production migration (0.3C only)

```bash
test "$PRODUCTION_REF" != "$STAGING_REF"
pnpm exec supabase db push --project-ref "$PRODUCTION_REF" --dry-run
# Must list only the migration. If it mentions seed.sql, STOP.
pnpm exec supabase db push --project-ref "$PRODUCTION_REF"
```

Do not pass `--include-seed`. Do not run `seed.sql` against production. Prove `public.companies` and `auth.users` counts are 0.

### Vercel / Preview / RED gate

- Production branch is `main`. Staging is the `staging` branch (created in 0.3B, not in 0.3A).
- Disable auto-assignment of production domains. A `main` Production build is not live until explicit Promote.
- Do not use a Vercel “staged production” deployment as staging (it uses production env vars).
- Do not use the Vercel ↔ Supabase marketplace integration.
- Production Promote requires written RED approval after staging is verified.
- Do not run `vercel --prod` as a substitute for that approval.
