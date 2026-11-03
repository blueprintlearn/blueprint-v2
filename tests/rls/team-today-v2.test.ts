import { randomUUID } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  asUser,
  COMPANY_A_ID,
  createAnonClient,
  INACTIVE_A_EMAIL,
  MANAGER_A_EMAIL,
  MANAGER_A_ID,
  OWNER_A_ID,
  OWNER_B_EMAIL,
  OWNER_B_ID,
  SEED_PASSWORD,
} from "./helpers"
import { getPublicEnv } from "@/lib/env"
import { asJwtSql, querySql, querySqlAllowError } from "./sql"

async function newOwner() {
  const email = `team-v2-${randomUUID()}@blueprint.test`
  const client = createAnonClient()
  expect((await client.auth.signUp({ email, password: SEED_PASSWORD })).error).toBeNull()
  const { data: company, error } = await client.rpc("create_company", {
    p_name: `Team V2 ${email}`,
  })
  expect(error).toBeNull()
  return { client, companyId: company?.id as string }
}

async function readTeam(client: Awaited<ReturnType<typeof newOwner>>["client"], companyId: string) {
  const { data, error } = await client
    .from("company_team_today")
    .select(
      "company_id, current_dj_count, desired_dj_count, count_basis, desired_count_basis, count_confirmed_at, desired_confirmed_at, assistant_only_count, owner_dj_frequency, lead_capable_count, earlier_dj_count, earlier_desired_dj_count",
    )
    .eq("company_id", companyId)
    .maybeSingle()
  expect(error).toBeNull()
  return data
}

describe("team today v2 security", () => {
  it("lets the owner confirm through save_team_today_v2 and keeps historical counts", async () => {
    const { client, companyId } = await newOwner()
    const seed = await client.from("company_team_today").upsert(
      { company_id: companyId, current_dj_count: 6, desired_dj_count: 8 },
      { onConflict: "company_id" },
    )
    expect(seed.error).toBeNull()

    const before = await readTeam(client, companyId)
    expect(before?.count_basis).toBe("unknown")
    const earlier = before?.earlier_dj_count ?? null

    const t0Yes = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_count_basis: "includes_owner",
    })
    expect(t0Yes.error).toBeNull()

    const afterYes = await readTeam(client, companyId)
    expect(afterYes).toMatchObject({
      current_dj_count: 6,
      count_basis: "includes_owner",
      earlier_dj_count: earlier,
    })
    expect(afterYes?.count_confirmed_at).toBeTruthy()

    const t1 = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_current_dj_count: 4,
      p_count_basis: "excludes_owner",
      p_assistant_only_count: 1,
      p_owner_dj_frequency: "sometimes",
      p_lead_capable_count: 2,
    })
    expect(t1.error).toBeNull()

    const afterT1 = await readTeam(client, companyId)
    expect(afterT1).toMatchObject({
      current_dj_count: 4,
      count_basis: "excludes_owner",
      assistant_only_count: 1,
      owner_dj_frequency: "sometimes",
      lead_capable_count: 2,
      earlier_dj_count: earlier,
    })
  })

  it("lets T6 save on its own and keeps a null current count", async () => {
    const { client, companyId } = await newOwner()
    const saved = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_desired_dj_count: 9,
      p_desired_count_basis: "excludes_owner",
    })
    expect(saved.error).toBeNull()

    expect(await readTeam(client, companyId)).toMatchObject({
      current_dj_count: null,
      desired_dj_count: 9,
      desired_count_basis: "excludes_owner",
      count_basis: "unknown",
      earlier_dj_count: null,
    })
  })

  it("resets the matching basis when a legacy upsert changes a count", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_current_dj_count: 4,
          p_count_basis: "excludes_owner",
          p_desired_dj_count: 7,
          p_desired_count_basis: "excludes_owner",
        })
      ).error,
    ).toBeNull()

    const before = await readTeam(client, companyId)
    const legacy = await client.from("company_team_today").upsert(
      { company_id: companyId, current_dj_count: 5 },
      { onConflict: "company_id" },
    )
    expect(legacy.error).toBeNull()

    const row = await readTeam(client, companyId)
    expect(row).toMatchObject({
      current_dj_count: 5,
      count_basis: "unknown",
      count_confirmed_at: null,
      desired_dj_count: 7,
      desired_count_basis: "excludes_owner",
      earlier_dj_count: before?.earlier_dj_count ?? null,
    })
  })

  it("blocks authenticated direct writes to basis, timestamps, v2 fields and history", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_current_dj_count: 4,
          p_count_basis: "excludes_owner",
        })
      ).error,
    ).toBeNull()

    const denied = await Promise.all([
      client.from("company_team_today").update({ count_basis: "excludes_owner" }).eq("company_id", companyId),
      client.from("company_team_today").update({ count_confirmed_at: new Date().toISOString() }).eq("company_id", companyId),
      client.from("company_team_today").update({ assistant_only_count: 3 }).eq("company_id", companyId),
      client.from("company_team_today").update({ owner_dj_frequency: "regularly" }).eq("company_id", companyId),
      client.from("company_team_today").update({ lead_capable_count: 1 }).eq("company_id", companyId),
      client.from("company_team_today").update({ earlier_dj_count: 999 }).eq("company_id", companyId),
    ])
    for (const result of denied) {
      expect(result.error).not.toBeNull()
    }

    const still = await readTeam(client, companyId)
    expect(still?.earlier_dj_count).not.toBe(999)
    expect(still?.assistant_only_count).not.toBe(3)
    expect(still?.current_dj_count).toBe(4)
  })

  it("refuses a manager and a cross-company owner on save_team_today_v2", async () => {
    const manager = await asUser(MANAGER_A_EMAIL)
    const asManager = await manager.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(asManager.error).not.toBeNull()
    expect(asManager.error?.code).toBe("PBG07")

    const ownerB = await asUser(OWNER_B_EMAIL)
    const cross = await ownerB.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(cross.error).not.toBeNull()
    expect(cross.error?.code).toBe("PBG07")

    const managerRead = await manager
      .from("company_team_today")
      .select("company_id")
      .eq("company_id", COMPANY_A_ID)
    expect(managerRead.error).toBeNull()
  })

  it("rejects lead_capable_count above current_dj_count", async () => {
    const { client, companyId } = await newOwner()
    const result = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_current_dj_count: 2,
      p_lead_capable_count: 5,
      p_count_basis: "excludes_owner",
    })
    expect(result.error).not.toBeNull()
  })

  it("does not let set_config authorize a confirm write", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.from("company_team_today").insert({
          company_id: companyId,
          current_dj_count: 3,
        })
      ).error,
    ).toBeNull()
    const denied = await client
      .from("company_team_today")
      .update({ count_basis: "excludes_owner" })
      .eq("company_id", companyId)
    expect(denied.error).not.toBeNull()
    expect((await readTeam(client, companyId))?.count_basis).toBe("unknown")
  })

  it("keeps anonymous clients out", async () => {
    const anon = createAnonClient()
    const read = await anon.from("company_team_today").select("company_id")
    expect(read.data ?? []).toEqual([])
    const write = await anon.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_current_dj_count: 1,
      p_count_basis: "excludes_owner",
    })
    expect(write.error).not.toBeNull()
  })

  it("rejects T1 = 0 with T3 > 0", async () => {
    const { client, companyId } = await newOwner()
    const result = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_current_dj_count: 0,
      p_lead_capable_count: 2,
      p_count_basis: "excludes_owner",
    })
    expect(result.error).not.toBeNull()
    expect(await readTeam(client, companyId)).toBeNull()
  })

  it("rejects T3 when T1 is null", async () => {
    const { client, companyId } = await newOwner()
    const withoutT1 = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_lead_capable_count: 2,
    })
    expect(withoutT1.error).not.toBeNull()
    expect(await readTeam(client, companyId)).toBeNull()

    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_assistant_only_count: 1,
        })
      ).error,
    ).toBeNull()
    expect(await readTeam(client, companyId)).toMatchObject({
      current_dj_count: null,
      lead_capable_count: null,
      assistant_only_count: 1,
    })

    const ontoNullT1 = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_lead_capable_count: 2,
    })
    expect(ontoNullT1.error).not.toBeNull()
    expect(await readTeam(client, companyId)).toMatchObject({
      current_dj_count: null,
      lead_capable_count: null,
      assistant_only_count: 1,
    })
  })

  it("lets a Slice 3-style read and legacy save work on a null T1 row", async () => {
    const { client, companyId } = await newOwner()
    expect(
      (
        await client.rpc("save_team_today_v2", {
          p_company_id: companyId,
          p_assistant_only_count: 1,
        })
      ).error,
    ).toBeNull()

    const row = await readTeam(client, companyId)
    expect(row).toMatchObject({
      current_dj_count: null,
      assistant_only_count: 1,
      count_basis: "unknown",
    })

    const legacy = await client
      .from("company_team_today")
      .update({ desired_dj_count: 4 })
      .eq("company_id", companyId)
      .select("company_id, current_dj_count, desired_dj_count, count_basis, desired_count_basis")
    expect(legacy.error).toBeNull()
    expect(legacy.data).toEqual([
      {
        company_id: companyId,
        current_dj_count: null,
        desired_dj_count: 4,
        count_basis: "unknown",
        desired_count_basis: "unknown",
      },
    ])
  })
})

describe("team today v2 JWT impersonation", () => {
  function cleanup(companyId: string) {
    querySql(`
      delete from public.company_team_today where company_id = '${companyId}';
      delete from public.company_memberships where company_id = '${companyId}';
      delete from public.companies where id = '${companyId}';
    `)
  }

  it("lets owner A confirm through an impersonated JWT session and keeps history", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'JWT A');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
      insert into public.company_team_today (company_id, current_dj_count, desired_dj_count)
      values ('${companyId}', 6, 8);
    `)

    const before = querySql(`
      select earlier_dj_count, count_basis::text
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    expect(before).toMatch(/unknown/)

    querySql(
      asJwtSql(
        OWNER_A_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_count_basis := 'includes_owner'
        );`,
      ),
    )

    const afterYes = querySql(`
      select current_dj_count, count_basis::text, earlier_dj_count, count_confirmed_at is not null as stamped
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    expect(afterYes).toMatch(/6/)
    expect(afterYes).toMatch(/includes_owner/)
    expect(afterYes).toMatch(/t/)

    querySql(
      asJwtSql(
        OWNER_A_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_current_dj_count := 4,
          p_count_basis := 'excludes_owner'
        );`,
      ),
    )

    const afterT1 = querySql(`
      select current_dj_count, count_basis::text, earlier_dj_count is null as history_null
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    expect(afterT1).toMatch(/4/)
    expect(afterT1).toMatch(/excludes_owner/)
    expect(afterT1).toMatch(/t/)

    cleanup(companyId)
  })

  it("refuses owner B and manager JWTs on owner A's company", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'JWT deny');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
    `)

    const asOwnerB = querySqlAllowError(
      asJwtSql(
        OWNER_B_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_count_basis := 'excludes_owner'
        );`,
      ),
    )
    expect(asOwnerB.ok).toBe(false)
    expect(asOwnerB.output).toContain("Only the company owner can change this.")

    const asManager = querySqlAllowError(
      asJwtSql(
        MANAGER_A_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_count_basis := 'excludes_owner'
        );`,
      ),
    )
    expect(asManager.ok).toBe(false)
    expect(asManager.output).toContain("Only the company owner can change this.")

    cleanup(companyId)
  })

  it("does not let set_config authorize a confirm write in an impersonated session", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'JWT set_config');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
      insert into public.company_team_today (company_id, current_dj_count)
      values ('${companyId}', 3);
    `)

    const denied = querySqlAllowError(
      asJwtSql(
        OWNER_A_ID,
        `
        select set_config('blueprint.confirm_team_counts', '1', true);
        update public.company_team_today
        set count_basis = 'excludes_owner',
            count_confirmed_at = now()
        where company_id = '${companyId}';
        `,
      ),
    )
    expect(denied.ok).toBe(false)
    expect(denied.output.toLowerCase()).toMatch(/permission|privilege/)

    const still = querySql(`
      select count_basis::text
      from public.company_team_today
      where company_id = '${companyId}'
    `)
    expect(still).toMatch(/unknown/)

    cleanup(companyId)
  })

  it("keeps historical columns immutable for the table owner", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'History freeze');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
      insert into public.company_team_today (company_id, current_dj_count)
      values ('${companyId}', 6);
    `)

    querySql(
      asJwtSql(
        OWNER_A_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_count_basis := 'includes_owner'
        );`,
      ),
    )

    const earlier = querySql(`
      select earlier_dj_count
      from public.company_team_today
      where company_id = '${companyId}'
    `)

    querySql(`
      update public.company_team_today
      set earlier_dj_count = 999
      where company_id = '${companyId}'
    `)

    expect(
      querySql(`
        select earlier_dj_count
        from public.company_team_today
        where company_id = '${companyId}'
      `),
    ).toBe(earlier)
    expect(earlier).not.toMatch(/999/)

    cleanup(companyId)
  })

  it("records writer, function, and column privileges", () => {
    const writer = querySql(`
      select rolcanlogin
      from pg_roles
      where rolname = 'blueprint_team_today_writer'
    `)
    expect(writer).toMatch(/f/)

    const grantedToApi = querySql(`
      select exists (
        select 1
        from pg_auth_members am
        join pg_roles member on member.oid = am.member
        join pg_roles role on role.oid = am.roleid
        where role.rolname = 'blueprint_team_today_writer'
          and member.rolname in ('authenticated', 'anon', 'authenticator')
      )
    `)
    expect(grantedToApi).toMatch(/f/)

    const fn = querySql(`
      select r.rolname, p.prosecdef, p.proconfig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      join pg_roles r on r.oid = p.proowner
      where n.nspname = 'public' and p.proname = 'save_team_today_v2'
    `)
    expect(fn).toMatch(/blueprint_team_today_writer/)
    expect(fn).toMatch(/t/)
    expect(fn).toMatch(/search_path=pg_catalog, public/)

    const protectedCols = querySql(`
      select
        has_column_privilege('authenticated', 'public.company_team_today', 'count_basis', 'UPDATE') as basis,
        has_column_privilege('authenticated', 'public.company_team_today', 'assistant_only_count', 'UPDATE') as assistant,
        has_column_privilege('authenticated', 'public.company_team_today', 'earlier_dj_count', 'UPDATE') as history,
        has_column_privilege('authenticated', 'public.company_team_today', 'current_dj_count', 'UPDATE') as current,
        has_column_privilege('authenticated', 'public.company_team_today', 'company_id', 'INSERT') as company_insert
    `)
    expect(protectedCols).toMatch(/f/)
    expect(protectedCols).toMatch(/t/)
  })

  it("refuses a session with no JWT identity", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'Missing JWT');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
    `)

    const missing = querySqlAllowError(`
      set role authenticated;
      select public.save_team_today_v2(
        p_company_id := '${companyId}',
        p_count_basis := 'excludes_owner'
      );
    `)
    expect(missing.ok).toBe(false)
    expect(missing.output).toContain("Only the company owner can change this.")

    cleanup(companyId)
  })

  it("refuses a malformed JWT subject", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'Malformed JWT');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'active');
    `)

    const malformed = querySqlAllowError(`
      set role authenticated;
      select set_config('request.jwt.claim.sub', 'not-a-uuid', false);
      select set_config('request.jwt.claims', '{"sub":"not-a-uuid","role":"authenticated"}', false);
      select public.save_team_today_v2(
        p_company_id := '${companyId}',
        p_count_basis := 'excludes_owner'
      );
    `)
    expect(malformed.ok).toBe(false)
    expect(malformed.output.toLowerCase()).toMatch(/invalid input syntax for type uuid|only the company owner/)

    cleanup(companyId)
  })

  it("refuses an inactive owner", () => {
    const companyId = randomUUID()
    querySql(`
      insert into public.companies (id, name) values ('${companyId}', 'Inactive owner');
      insert into public.company_memberships (company_id, user_id, role, status)
      values ('${companyId}', '${OWNER_A_ID}', 'owner_admin', 'inactive');
    `)

    const inactive = querySqlAllowError(
      asJwtSql(
        OWNER_A_ID,
        `select public.save_team_today_v2(
          p_company_id := '${companyId}',
          p_count_basis := 'excludes_owner'
        );`,
      ),
    )
    expect(inactive.ok).toBe(false)
    expect(inactive.output).toContain("Only the company owner can change this.")

    cleanup(companyId)
  })
})

describe("team today v2 API identity", () => {
  function tamperJwtSub(token: string, sub: string) {
    const [header, payload, signature] = token.split(".")
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string }
    claims.sub = sub
    return `${header}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.${signature}`
  }

  async function postSave(companyId: string, authorization?: string) {
    const { url, publishableKey } = getPublicEnv()
    const headers: Record<string, string> = {
      apikey: publishableKey,
      "Content-Type": "application/json",
    }
    if (authorization !== undefined) headers.Authorization = authorization
    return fetch(`${url}/rest/v1/rpc/save_team_today_v2`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_company_id: companyId,
        p_count_basis: "excludes_owner",
      }),
    })
  }

  it("rejects a forged token that substitutes another owner's claims", async () => {
    const { client, companyId } = await newOwner()
    const session = await client.auth.getSession()
    const token = session.data.session?.access_token
    expect(token).toBeTruthy()

    const allowed = await postSave(companyId, `Bearer ${token}`)
    expect(allowed.ok).toBe(true)
    expect(await readTeam(client, companyId)).toMatchObject({ count_basis: "excludes_owner" })

    const forged = tamperJwtSub(token as string, OWNER_B_ID)
    const asForged = await postSave(companyId, `Bearer ${forged}`)
    expect(asForged.status).toBe(401)

    const missing = await postSave(companyId)
    expect([401, 403]).toContain(missing.status)

    const malformed = await postSave(companyId, "Bearer not-a-jwt")
    expect(malformed.status).toBe(401)

    expect(await readTeam(client, companyId)).toMatchObject({
      count_basis: "excludes_owner",
      current_dj_count: null,
    })
  })

  it("rejects a signed-in inactive owner through the API", async () => {
    const { client, companyId } = await newOwner()
    querySql(`
      update public.company_memberships
      set status = 'inactive'
      where company_id = '${companyId}'
    `)

    const denied = await client.rpc("save_team_today_v2", {
      p_company_id: companyId,
      p_count_basis: "excludes_owner",
    })
    expect(denied.error).not.toBeNull()
    expect(denied.error?.code).toBe("PBG07")
    expect(await readTeam(client, companyId)).toBeNull()
  })

  it("rejects the seeded inactive member on save_team_today_v2", async () => {
    const inactive = await asUser(INACTIVE_A_EMAIL)
    const denied = await inactive.rpc("save_team_today_v2", {
      p_company_id: COMPANY_A_ID,
      p_count_basis: "excludes_owner",
    })
    expect(denied.error).not.toBeNull()
  })
})


