import { cx } from "./cx"

export const DEFAULT_STAGES = ["Learn", "Practice", "Prove", "Advance"] as const

/**
 * A person's path toward a target, sketch-to-solid: done stages solid, the current stage hatched,
 * stages ahead empty. Stage words are always visible; "Now: …" is visible unless showStatus is false.
 */
export function JourneyTrack({
  stages = [...DEFAULT_STAGES],
  current = 1,
  complete = false,
  showStatus = true,
  className,
}: {
  stages?: string[]
  /** 1-based stage the person is in now. */
  current?: number
  complete?: boolean
  showStatus?: boolean
  className?: string
}) {
  const now = Math.max(1, Math.min(stages.length, current))
  const cols = { gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }
  const statusText = complete ? "All stages complete" : `Now: ${stages[now - 1]}`
  return (
    <div className={cx("bp-journey", className)}>
      <div className="bp-journey__track" style={cols} aria-hidden="true">
        {stages.map((s, i) => (
          <span
            key={s}
            className={cx(
              "bp-journey__seg",
              (complete || i < now - 1) && "bp-journey__seg--done",
              !complete && i === now - 1 && "bp-journey__seg--now bp-hatch",
            )}
          />
        ))}
      </div>
      <div className="bp-journey__labels" style={cols} aria-hidden="true">
        {stages.map((s, i) => (
          <span key={s} className={!complete && i === now - 1 ? "is-now" : undefined}>
            {s}
          </span>
        ))}
      </div>
      <span className={showStatus ? "bp-journey__status" : "bp-sr"}>{statusText}</span>
    </div>
  )
}
