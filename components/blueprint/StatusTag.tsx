import { cx } from "./cx"

/** The sketch-to-solid motif. proven = solid, progress = hatched, planned = drafted. */
export type MotifStatus = "proven" | "progress" | "planned"

export const STATUS_WORDS: Record<MotifStatus, string> = {
  proven: "Proven",
  progress: "In progress",
  planned: "Planned",
}

/** A motif swatch that is never shown without its words. */
export function StatusTag({
  status = "proven",
  label,
  className,
}: {
  status?: MotifStatus
  /** A more specific word ("Verified", "Practising"). Never empty. */
  label?: string
  className?: string
}) {
  return (
    <span className={cx("bp-status", `bp-status--${status}`, className)}>
      <span className={cx("bp-status__swatch", status === "progress" && "bp-hatch")} aria-hidden="true" />
      {label?.trim() ? label : STATUS_WORDS[status]}
    </span>
  )
}
