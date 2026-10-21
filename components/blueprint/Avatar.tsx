import { cx } from "./cx"
import type { Tone } from "./Chip"

const TONE_INK: Record<Tone, string> = {
  blush: "var(--blush-ink)",
  butter: "var(--butter-ink)",
  mint: "var(--mint-ink)",
  sky: "var(--sky-ink)",
  lavender: "var(--lavender-ink)",
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/** A rounded-square portrait: the person's own photo, or initials on a tint. Never stock faces. */
export function Avatar({
  name,
  initials,
  src,
  tone = "sky",
  size = "md",
  onTint = false,
  className,
}: {
  /** Always required: it is the accessible label. */
  name: string
  initials?: string
  /** A customer-uploaded photo URL. */
  src?: string
  tone?: Tone
  size?: "md" | "lg"
  /** On a card of the same tint: white tile, tint-ink initials. */
  onTint?: boolean
  className?: string
}) {
  return (
    <span
      className={cx("bp-avatar", `bp-avatar--${size}`, className)}
      role="img"
      aria-label={name}
      style={{ background: onTint ? "var(--surface)" : `var(--${tone})`, color: TONE_INK[tone] }}
    >
      {src ? (
        // Customer-uploaded photos come from tenant storage at arbitrary URLs; a plain img avoids
        // next/image remotePatterns config per tenant. Swap to next/image once storage domains are fixed.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" />
      ) : (
        initials ?? initialsOf(name)
      )}
    </span>
  )
}
