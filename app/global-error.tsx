"use client"

import { useEffect } from "react"

import { reportIsolatedException } from "@/lib/observability/report"

export default function GlobalError({
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
    <html lang="en">
      <body>
        <main>
          <h1>Something went wrong</h1>
          <button onClick={() => retry()} type="button">
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
