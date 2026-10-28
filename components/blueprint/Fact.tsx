import { cx } from "./cx"

/**
 * A read-only value with its label, for people who can see a value but not change it.
 * null (never saved) shows quiet empty text. 0 is a real answer and shows "0" at full size.
 */
export function Fact({
  label,
  value,
  emptyText = "Not set yet",
  className,
}: {
  /** Sentence case, no colon. */
  label: string
  value: string | number | null
  /** A more specific empty message, e.g. "No goal chosen yet". */
  emptyText?: string
  className?: string
}) {
  const empty = value === null || value === ""
  return (
    <div className={cx("bp-fact", className)}>
      <span className="bp-fact__label">{label}</span>
      <span className={cx("bp-fact__value", empty && "is-empty")}>{empty ? emptyText : String(value)}</span>
    </div>
  )
}
