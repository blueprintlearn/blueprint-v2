import type { ButtonHTMLAttributes } from "react"

import { cx } from "./cx"
import { Icon, type IconName } from "./icons"

export type ButtonVariant = "primary" | "coral" | "soft" | "plain"

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary = solid; coral = the one important action per view; soft = secondary; plain = tertiary. */
  variant?: ButtonVariant
  size?: "md" | "sm"
  icon?: IconName
}

/** A pill-shaped action. Label is verb-first, sentence case: "Approve Jake", "Plan my next hire". */
export function Button({ variant = "primary", size = "md", icon, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx("bp-btn", `bp-btn--${variant}`, size === "sm" && "bp-btn--sm", className)}
      {...rest}
    >
      {icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  )
}
