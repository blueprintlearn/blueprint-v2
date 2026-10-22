"use client"

import { useState, type ReactNode } from "react"

import { Button } from "./Button"
import { Chip, type Tone } from "./Chip"
import { cx } from "./cx"
import { Icon } from "./icons"

export type CardState = "open" | "confirm" | "done"

export const DECIDE_FAILED = "That didn’t save. Nothing was changed. Try again."
export const UNDO_FAILED = "Undo didn’t save. The decision still stands. Try again."

type DecisionAction = (() => void | Promise<void>) | undefined

/**
 * The only way a DecisionCard changes state after a click. Done is reached only when onDecide
 * completes; open is reached again only when onUndo completes. A missing handler changes nothing.
 */
export async function runDecisionStep(
  step: "decide" | "undo",
  action: DecisionAction,
  from: CardState,
): Promise<{ state: CardState; error: string | null }> {
  if (typeof action !== "function") return { state: from, error: null }
  try {
    await action()
    return { state: step === "decide" ? "done" : "open", error: null }
  } catch {
    return { state: from, error: step === "decide" ? DECIDE_FAILED : UNDO_FAILED }
  }
}

export type DecisionCardProps = {
  tone?: Tone
  kicker?: ReactNode
  title: ReactNode
  body?: ReactNode
  /** The evidence slot between kicker and title: an Avatar row, a quote, a MessageBubble. */
  children?: ReactNode
  primaryLabel?: string
  /** Shown only together with onSecondary. */
  secondaryLabel?: string
  onSecondary?: () => void
  /**
   * Performs the decision (e.g. a server action). May be async. If it throws, the card returns to
   * its previous state and shows an error; nothing is shown as done unless this resolves.
   * Without it the primary action is disabled.
   */
  onDecide?: () => void | Promise<void>
  /** Reverses a reversible decision. Undo is offered only when this is set, never for consequential ones. */
  onUndo?: () => void | Promise<void>
  /**
   * Hiring, advancement, overrides, pay: asks for confirmation first, and the done state shows
   * the record instead of Undo. The caller's onDecide must write the audit entry (who, when, what, why).
   */
  consequential?: boolean
  confirmTitle?: string
  confirmBody?: string
  confirmLabel?: string
  auditText?: string
  onViewRecord?: () => void
  doneKicker?: ReactNode
  doneTitle?: ReactNode
  doneBody?: ReactNode
  /** Small confetti burst on the done state. Advancement and hires only. */
  celebrate?: boolean
  initialState?: CardState
  className?: string
}

function Burst() {
  return (
    <svg className="bp-decision__burst" viewBox="0 0 200 150" aria-hidden="true">
      <circle cx="140" cy="38" r="7" fill="var(--confetti-1)" />
      <circle cx="172" cy="66" r="5" fill="var(--confetti-2)" />
      <circle cx="112" cy="20" r="4" fill="var(--confetti-3)" />
      <circle cx="182" cy="26" r="8" fill="var(--confetti-3)" />
      <rect x="152" y="90" width="12" height="5" rx="2.5" fill="var(--confetti-1)" transform="rotate(-30 158 92)" />
      <rect x="118" y="58" width="12" height="5" rx="2.5" fill="var(--confetti-2)" transform="rotate(40 124 60)" />
      <circle cx="90" cy="44" r="3.5" fill="var(--confetti-1)" />
    </svg>
  )
}

/**
 * One decision that needs a human, with safety matched to the stakes:
 * reversible actions offer Undo; consequential decisions confirm first and keep an audit trail.
 */
export function DecisionCard({
  tone = "blush",
  kicker,
  title,
  body,
  children,
  primaryLabel = "Approve",
  secondaryLabel,
  onSecondary,
  onDecide,
  onUndo,
  consequential = false,
  confirmTitle = "Confirm this decision?",
  confirmBody = "This is recorded with your name and the time.",
  confirmLabel = "Confirm",
  auditText = "Recorded with your name and the time.",
  onViewRecord,
  doneKicker,
  doneTitle = "Done",
  doneBody,
  celebrate = false,
  initialState = "open",
  className,
}: DecisionCardProps) {
  const [state, setState] = useState<CardState>(initialState)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDecide = typeof onDecide === "function"
  const canUndo = !consequential && typeof onUndo === "function"

  async function run(step: "decide" | "undo", action: DecisionAction) {
    setPending(true)
    setError(null)
    const result = await runDecisionStep(step, action, state)
    setState(result.state)
    setError(result.error)
    setPending(false)
  }

  function primary() {
    if (!canDecide) return
    if (consequential && state === "open") {
      setState("confirm")
      return
    }
    void run("decide", onDecide)
  }

  if (state === "done") {
    return (
      <article className={cx("bp-card", `bp-card--${tone}`, "bp-decision", className)} aria-live="polite">
        {celebrate ? <Burst /> : null}
        {doneKicker ? (
          <Chip tone={tone} onTint icon="check">
            {doneKicker}
          </Chip>
        ) : null}
        <h3 className="bp-card__title">{doneTitle}</h3>
        {doneBody ? <p className="bp-card__body">{doneBody}</p> : null}
        {consequential ? (
          <p className="bp-decision__audit">
            <Icon name="record" size={16} />
            {auditText}{" "}
            {onViewRecord ? (
              <button type="button" className="bp-link" onClick={onViewRecord}>
                View record
              </button>
            ) : null}
          </p>
        ) : canUndo ? (
          <button
            type="button"
            className="bp-link"
            style={{ alignSelf: "flex-start" }}
            disabled={pending}
            aria-busy={pending}
            onClick={() => void run("undo", onUndo)}
          >
            Undo
          </button>
        ) : null}
        {error ? (
          <p className="bp-decision__error" role="alert">
            {error}
          </p>
        ) : null}
      </article>
    )
  }

  return (
    <article className={cx("bp-card", `bp-card--${tone}`, "bp-decision", className)}>
      {kicker ? (
        <Chip tone={tone} onTint>
          {kicker}
        </Chip>
      ) : null}
      {children}
      <h3 className="bp-card__title">{title}</h3>
      {body ? <p className="bp-card__body">{body}</p> : null}
      {state === "confirm" ? (
        <div className="bp-decision__confirm" role="group" aria-label="Confirm decision">
          <b>{confirmTitle}</b>
          <span>{confirmBody}</span>
          <div className="bp-card__actions" style={{ marginTop: 10 }}>
            <Button variant="plain" disabled={pending} onClick={() => setState("open")}>
              Cancel
            </Button>
            <Button variant="primary" aria-busy={pending} disabled={pending || !canDecide} onClick={primary}>
              {confirmLabel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bp-card__actions">
          {secondaryLabel && onSecondary ? (
            <Button variant="soft" disabled={pending} onClick={onSecondary}>
              {secondaryLabel}
            </Button>
          ) : null}
          <Button variant="primary" aria-busy={pending} disabled={pending || !canDecide} onClick={primary}>
            {primaryLabel}
          </Button>
        </div>
      )}
      {error ? (
        <p className="bp-decision__error" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  )
}
