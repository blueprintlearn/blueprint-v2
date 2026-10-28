import type { ReactNode } from "react"

import { cx } from "./cx"
import { Icon } from "./icons"

/** Props shared by TextField, NumberField and Select. */
export type FieldProps = {
  /** Sentence case, no colon. Always visible: never replace it with a placeholder. */
  label: string
  /** One short sentence that answers "why are you asking?". */
  help?: ReactNode
  /** What to do, not what went wrong: "Enter a whole number from 0 to 999." */
  error?: string | null
  /** Fields are required by default. Optional ones say "Optional" after the label. */
  optional?: boolean
  className?: string
}

/** ids for the help and error text, joined for aria-describedby. */
export function describedBy(id: string, help: unknown, error: unknown): string | undefined {
  const ids = [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean)
  return ids.length ? ids.join(" ") : undefined
}

/** Internal layout: label, help, control, error. Not exported from the package index. */
export function Field({
  id,
  label,
  help,
  error,
  optional,
  className,
  children,
}: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={cx("bp-field", className)}>
      <label className="bp-field__label" htmlFor={id}>
        {label}
        {optional ? <span className="bp-field__optional"> Optional</span> : null}
      </label>
      {help ? (
        <p className="bp-field__help" id={`${id}-help`}>
          {help}
        </p>
      ) : null}
      {children}
      {error ? (
        <p className="bp-field__error" id={`${id}-error`} role="alert">
          <Icon name="alert" size={16} strokeWidth={2.2} />
          {error}
        </p>
      ) : null}
    </div>
  )
}
