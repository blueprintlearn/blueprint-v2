"use client"

import { useId, useRef, useState, type ReactNode } from "react"

import { cx } from "./cx"

export type NotSureProps = {
  /** The question text; names the panel for screen readers ("Help with: …"). */
  question: string
  /** One sentence tying the question to a result. */
  why?: ReactNode
  /** 2–3 short examples, no names or real companies. */
  examples?: ReactNode[]
  /** An EstimateHelper or StartingPoint, or nothing. */
  helper?: ReactNode
  /** Show "Skip for now" only when the question allows it AND is unanswered. */
  canSkip?: boolean
  onSkip?: () => void
  defaultOpen?: boolean
  id?: string
  className?: string
}

/**
 * "I'm not sure" link and its inline guidance panel.
 * Place immediately after the existing field component.
 */
export function NotSure({
  question,
  why,
  examples,
  helper,
  canSkip,
  onSkip,
  defaultOpen,
  id,
  className,
}: NotSureProps) {
  const autoId = useId()
  const panelId = `${id ?? autoId}-panel`
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [announce, setAnnounce] = useState("")
  const linkRef = useRef<HTMLButtonElement>(null)
  const lines = examples ?? []

  function toggle() {
    const next = !open
    setOpen(next)
    if (!next) linkRef.current?.focus()
  }

  return (
    <div className={cx("bp-notsure", className)}>
      <button
        type="button"
        ref={linkRef}
        className="bp-link bp-notsure__link"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        {open ? "Hide help" : "I’m not sure"}
      </button>
      {open ? (
        <div
          className="bp-notsure__panel"
          id={panelId}
          role="region"
          aria-label={`Help with: ${question}`}
        >
          {why ? (
            <div className="bp-notsure__block">
              <p className="bp-notsure__label">Why we ask</p>
              <p className="bp-notsure__text">{why}</p>
            </div>
          ) : null}
          {lines.length ? (
            <div className="bp-notsure__block">
              <p className="bp-notsure__label">Examples</p>
              <ul className="bp-notsure__list">
                {lines.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {helper ? (
            <div className="bp-notsure__block">
              <p className="bp-notsure__label">Help me answer</p>
              {helper}
            </div>
          ) : null}
          {canSkip && onSkip ? (
            <button
              type="button"
              className="bp-link bp-notsure__skip"
              onClick={() => {
                setAnnounce("Skipped for now. You can answer it later.")
                onSkip()
              }}
            >
              Skip for now. You can answer it later.
            </button>
          ) : null}
        </div>
      ) : null}
      <span className="bp-sr" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  )
}
