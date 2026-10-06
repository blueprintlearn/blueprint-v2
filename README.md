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

## Seed credentials (local only)

| Email | Password | Company |
| --- | --- | --- |
| `owner-a@blueprint.test` | `blueprint-local-password` | Company A |
| `owner-b@blueprint.test` | `blueprint-local-password` | Company B |

These accounts are synthetic. Do not use them in hosted environments.

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

That job installs Node 24.21.0 and pnpm 12.9.1, then runs typecheck, lint, local Supabase (`supabase start` + `db reset` from committed migrations and seed), the existing Slice 0.1 tests, and a production build. It does not use hosted Supabase, Vercel, or service-role credentials.

Requiring the check before merge is a GitHub setting, not repository code. After the workflow has run once, set a branch protection rule on `main` that requires **`CI / prove`**.
