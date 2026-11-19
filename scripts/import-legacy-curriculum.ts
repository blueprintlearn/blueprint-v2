/**
 * Local-only LearnDash curriculum import.
 *
 *   pnpm curriculum:import -- --dry-run --export /path/to/learndash-export-production.json
 *   pnpm curriculum:import -- --apply --export /path/to/learndash-export-production.json
 *
 * Defaults to dry-run. --apply writes private published master snapshots on the
 * local database only. It refuses hosted URLs, does not import trainees, and
 * never sets Starter visibility.
 */

import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { createClient } from "@supabase/supabase-js"

import {
  LEGACY_CANONICAL_EXPORT,
  LEGACY_CANONICAL_EXPORT_BRANCH,
} from "@/lib/blueprint/training-legacy-contract"
import { importLegacyCurriculum } from "@/lib/blueprint/training-legacy-import-store"
import { mapLegacyExport, summarizeReport } from "@/lib/blueprint/training-legacy-import"
import type { Database } from "@/types/database"

function argValue(args: string[], name: string): string | null {
  const index = args.indexOf(name)
  if (index < 0) return null
  return args[index + 1] ?? null
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name)
}

function assertLocalUrl(url: string) {
  const host = new URL(url).hostname
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error(`Refusing to import to a non-local database (${host}).`)
  }
}

function supabaseStatusEnv(): Record<string, string> {
  const raw = execFileSync("pnpm", ["exec", "supabase", "status", "-o", "env"], {
    encoding: "utf8",
  })
  const env: Record<string, string> = {}
  for (const line of raw.split("\n")) {
    const index = line.indexOf("=")
    if (index < 0) continue
    let value = line.slice(index + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    env[line.slice(0, index)] = value
  }
  return env
}

function defaultExportPath(): string {
  if (process.env.BLUEPRINT_LEGACY_EXPORT) return resolve(process.env.BLUEPRINT_LEGACY_EXPORT)
  return resolve(LEGACY_CANONICAL_EXPORT)
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = !hasFlag(args, "--apply")
  const exportPath = resolve(argValue(args, "--export") ?? defaultExportPath())
  const reportPath = argValue(args, "--report") ? resolve(argValue(args, "--report") as string) : null

  let document: unknown
  try {
    document = JSON.parse(readFileSync(exportPath, "utf8"))
  } catch {
    throw new Error(
      `Could not read ${exportPath}. Checkout ${LEGACY_CANONICAL_EXPORT} from branch ${LEGACY_CANONICAL_EXPORT_BRANCH} (or pass --export). The raw export stays off main.`,
    )
  }

  if (dryRun) {
    const { report } = mapLegacyExport(document, { dryRun: true })
    process.stdout.write(`${summarizeReport(report)}\n`)
    if (reportPath) {
      mkdirSync(dirname(reportPath), { recursive: true })
      writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
      process.stdout.write(`Wrote ${reportPath}\n`)
    }
    return
  }

  const status = supabaseStatusEnv()
  const url = status.API_URL || status.SUPABASE_URL
  const serviceRole = status.SERVICE_ROLE_KEY || status.SECRET_KEY
  if (!url || !serviceRole) {
    throw new Error("Local supabase status did not provide API_URL and SERVICE_ROLE_KEY.")
  }
  assertLocalUrl(url)
  const client = createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: admins, error } = await client.from("training_platform_admins").select("user_id").limit(1)
  if (error || !admins?.[0]?.user_id) {
    throw new Error("Local database has no training_platform_admins row to stamp published_by.")
  }
  const { report } = await importLegacyCurriculum(client, document, {
    dryRun: false,
    publishedBy: admins[0].user_id,
  })
  process.stdout.write(`${summarizeReport(report)}\n`)
  if (reportPath) {
    mkdirSync(dirname(reportPath), { recursive: true })
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(`Wrote ${reportPath}\n`)
  }
  if (report.totals.failed > 0) process.exitCode = 1
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
