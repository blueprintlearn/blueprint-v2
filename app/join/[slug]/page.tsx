import type { Metadata } from "next"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

import { JoinRecruitingPage } from "@/app/join-page-ui"
import { pageContentFromUnknown } from "@/lib/blueprint/recruiting"
import { isValidSlug } from "@/lib/blueprint/recruiting-engine"
import { loadPublishedPageBySlug } from "@/lib/blueprint/recruiting-store"
import { createClient } from "@/lib/supabase/server"

type JoinParams = { slug: string }

async function publishedPage(slug: string) {
  if (!isValidSlug(slug)) return null
  const supabase = await createClient()
  const row = await loadPublishedPageBySlug(supabase, slug)
  if (!row) return null
  const page = pageContentFromUnknown(row.page_content)
  if (!page) return null
  return { row, page }
}

export async function generateMetadata({ params }: { params: Promise<JoinParams> }): Promise<Metadata> {
  const { slug } = await params
  const loaded = await publishedPage(slug)
  if (!loaded) return { title: "Recruiting" }
  return { title: `${loaded.page.roleTitle} · ${loaded.page.companyName}` }
}

export default async function PublicJoinPage({ params }: { params: Promise<JoinParams> }) {
  const { slug } = await params
  const loaded = await publishedPage(slug)
  if (!loaded) notFound()
  return <JoinRecruitingPage page={loaded.page} slug={loaded.row.slug} />
}
