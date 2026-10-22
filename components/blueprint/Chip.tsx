import type { ReactNode } from "react"

import { cx } from "./cx"
import { Icon, type IconName } from "./icons"

export type Tone = "blush" | "butter" | "mint" | "sky" | "lavender"
export type ChipTone = Tone | "neutral" | "danger"

/** A small label that names what a card or row is about. Not interactive. The words must carry the meaning. */
export function Chip({
  tone = "neutral",
  onTint = false,
  icon,
  className,
  children,
}: {
  tone?: ChipTone
  /** Set when the chip sits on a card of the same tint: the chip turns white so its text stays legible. */
  onTint?: boolean
  icon?: IconName
  className?: string
  children: ReactNode
}) {
  return (
    <span className={cx("bp-chip", `bp-chip--${tone}`, onTint && "bp-chip--on-tint", className)}>
      {icon ? <Icon name={icon} size={15} strokeWidth={2.4} /> : null}
      {children}
    </span>
  )
}
