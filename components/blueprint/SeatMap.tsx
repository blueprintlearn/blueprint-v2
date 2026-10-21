import { cx } from "./cx"
import { STATUS_WORDS, StatusTag, type MotifStatus } from "./StatusTag"

export type Seat = {
  initials?: string
  name?: string
  status?: MotifStatus
  /** Text for a planned seat, e.g. "Your next hire". Defaults to "Open". */
  label?: string
}

export type SeatLegend = Record<MotifStatus, string>

const DEFAULT_LEGEND: SeatLegend = { proven: "Leads today", progress: "On their way", planned: "Open seat" }

/** The team a company needs, as seats: filled (solid), developing (hatched), open on the plan (drafted). */
export function SeatMap({
  seats,
  columns = 5,
  label = "Seats",
  legend = DEFAULT_LEGEND,
  className,
}: {
  seats: Seat[]
  columns?: number
  /** Accessible name of the list, e.g. "Spring Wedding Lead seats". */
  label?: string
  legend?: SeatLegend
  className?: string
}) {
  const counts: Record<MotifStatus, number> = { proven: 0, progress: 0, planned: 0 }
  for (const s of seats) counts[s.status ?? "proven"] += 1
  return (
    <div className={cx("bp-seats", className)}>
      <ul
        className="bp-seats__grid"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, listStyle: "none", margin: 0 }}
        aria-label={label}
      >
        {seats.map((s, i) => {
          const status = s.status ?? "proven"
          return (
            <li
              key={`${s.initials ?? s.label ?? "seat"}-${i}`}
              className={cx("bp-seat", `bp-seat--${status}`, status === "progress" && "bp-hatch", status === "planned" && "bp-drafted")}
            >
              {status === "progress" ? <span>{s.initials}</span> : status === "planned" ? s.label ?? "Open" : s.initials}
              <span className="bp-sr">{` ${s.name ?? ""}, ${STATUS_WORDS[status]}`}</span>
            </li>
          )
        })}
      </ul>
      <div className="bp-seats__legend">
        {(["proven", "progress", "planned"] as const)
          .filter((k) => counts[k] > 0)
          .map((k) => (
            <StatusTag key={k} status={k} label={`${STATUS_WORDS[k]}: ${counts[k]} ${legend[k].toLowerCase()}`} />
          ))}
      </div>
    </div>
  )
}
