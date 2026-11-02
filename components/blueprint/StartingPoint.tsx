"use client"

import type { ReactNode } from "react"

import { Button } from "./Button"
import { cx } from "./cx"

export type StartingPointProps = {
  /** Blueprint's suggestion and why, e.g. "Same as last year: 180". */
  text: ReactNode
  value: unknown
  onUse: (value: unknown) => void
  useLabel?: string
  className?: string
}

/** Blueprint's suggested value with "Use this". A used starting point is an estimate. */
export function StartingPoint({ text, value, onUse, useLabel, className }: StartingPointProps) {
  return (
    <div className={cx("bp-form-row bp-start", className)}>
      <span className="bp-start__text">{text}</span>
      <Button variant="soft" size="sm" type="button" onClick={() => onUse(value)}>
        {useLabel ?? "Use this"}
      </Button>
    </div>
  )
}
