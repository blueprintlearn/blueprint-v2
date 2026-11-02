"use client"

import { useEffect } from "react"

/** Focuses the label of the first unanswered core question, or the hash target. */
export function FocusQuestion({ questionId }: { questionId: string | null }) {
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : ""
    const id = hash || questionId
    if (!id) return
    const root = document.getElementById(id)
    if (!root) return
    const target =
      root.querySelector<HTMLElement>("legend, label, button, a, input, select, textarea") ?? root
    target.focus()
  }, [questionId])

  return null
}
