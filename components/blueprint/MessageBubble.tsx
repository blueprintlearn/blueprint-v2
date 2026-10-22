import type { ReactNode } from "react"

import { cx } from "./cx"

/** A drafted or received message. Drafts are always paired with Edit and Send; never auto-sent. */
export function MessageBubble({
  from = "Blueprint drafted this for you",
  className,
  children,
}: {
  /** Who wrote it; false hides the line. */
  from?: string | false
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx("bp-bubble", className)}>
      {from !== false ? <small className="bp-bubble__from">{from}</small> : null}
      {children}
    </div>
  )
}
