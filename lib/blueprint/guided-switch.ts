/**
 * Per-company switch for the guided Company Blueprint (/blueprint).
 *
 * Server-only by convention: call it from server components, route handlers and
 * server actions, never from a "use client" module. It reads a variable without
 * the NEXT_PUBLIC_ prefix, so it can't reach the browser, and nothing from the
 * request (query, cookie, header) can change the answer. Off for everyone unless
 * the company's id is listed.
 */
export const GUIDED_COMPANY_IDS_ENV = "BLUEPRINT_GUIDED_COMPANY_IDS"

export type GuidedEnvSource = Record<string, string | undefined>

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function parseGuidedCompanyIds(value: string | undefined): ReadonlySet<string> {
  const ids = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => UUID.test(entry))
  return new Set(ids)
}

export function isGuidedBlueprintEnabled(
  companyId: string,
  source: GuidedEnvSource = process.env,
): boolean {
  return parseGuidedCompanyIds(source[GUIDED_COMPANY_IDS_ENV]).has(companyId.trim().toLowerCase())
}
