"use client"

import { useEffect } from "react"

import { reportIsolatedException } from "@/lib/observability/report"

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    reportIsolatedException(error)
  }, [error])

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <button className="border px-3 py-2" onClick={() => retry()} type="button">
        Try again
      </button>
    </main>
  )
}
