import type { CSSProperties, ReactNode } from "react"

import { Chip, type Tone } from "./Chip"
import { cx } from "./cx"

export type CardTone = "surface" | Tone | "brand"

/** The basic container. surface = white card with shadow; tints carry meaning; brand = one navy moment per screen. */
export function Card({
  tone = "surface",
  kicker,
  title,
  actions,
  as: Tag = "article",
  className,
  style,
  "aria-labelledby": labelledBy,
  children,
}: {
  tone?: CardTone
  kicker?: ReactNode
  title?: ReactNode
  actions?: ReactNode
  as?: "article" | "section" | "div" | "aside" | "li"
  className?: string
  style?: CSSProperties
  /** id of the heading that names this card. Use with as="section" so the card is a named region. */
  "aria-labelledby"?: string
  children?: ReactNode
}) {
  const chipTone = tone === "surface" || tone === "brand" ? "neutral" : tone
  return (
    <Tag className={cx("bp-card", `bp-card--${tone}`, className)} style={style} aria-labelledby={labelledBy}>
      {kicker ? (
        <Chip tone={chipTone} onTint={tone !== "surface" && tone !== "brand"}>
          {kicker}
        </Chip>
      ) : null}
      {title ? <h3 className="bp-card__title">{title}</h3> : null}
      {children}
      {actions ? <div className="bp-card__actions">{actions}</div> : null}
    </Tag>
  )
}
