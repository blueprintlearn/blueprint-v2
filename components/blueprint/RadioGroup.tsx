"use client"

import { useId, useState, type ReactNode } from "react"

import { cx } from "./cx"
import { Icon } from "./icons"
import type { CheckboxGroupOption } from "./CheckboxGroup"

export type RadioGroupOption = CheckboxGroupOption

export type RadioGroupProps = {
  /** The fieldset's legend. Sentence case, no colon. */
  label: string
  name: string
  /** 2–6 options. Use Select for 7–12, CheckboxGroup for any-number choices. */
  options: readonly RadioGroupOption[]
  value?: string | null
  defaultValue?: string | null
  onChange?: (next: string) => void
  help?: ReactNode
  error?: string | null
  note?: ReactNode
  followUp?: Record<string, ReactNode>
  optional?: boolean
  id?: string
  className?: string
}

/**
 * Exactly one of 2–6 choices. CheckboxGroup anatomy with native radios.
 * Arrow keys move and select; Tab enters and leaves the group.
 */
export function RadioGroup({
  label,
  name,
  options,
  value,
  defaultValue,
  onChange,
  help,
  error,
  note,
  followUp,
  optional,
  id,
  className,
}: RadioGroupProps) {
  const autoId = useId()
  const groupId = id ?? autoId
  const controlled = value !== undefined
  const [inner, setInner] = useState<string | null>(defaultValue ?? null)
  const selected = controlled ? (value ?? null) : inner

  function choose(next: string) {
    if (!controlled) setInner(next)
    onChange?.(next)
  }

  const describedBy = [
    help ? `${groupId}-help` : null,
    `${groupId}-note`,
    error ? `${groupId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <fieldset
      className={cx("bp-check-group bp-radio-group", error && "is-invalid", className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className="bp-field__label bp-check-group__legend">
        {label}
        {optional ? <span className="bp-field__optional"> Optional</span> : null}
      </legend>
      {help ? (
        <p className="bp-field__help" id={`${groupId}-help`}>
          {help}
        </p>
      ) : null}
      <div className="bp-check-group__list">
        {options.map((option, index) => {
          const optionId = `${groupId}-${index}`
          const checked = selected === option.value
          return (
            <div key={option.value}>
              <label className="bp-check" htmlFor={optionId}>
                <input
                  type="radio"
                  className="bp-check__box bp-radio__dot"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => choose(option.value)}
                  aria-describedby={option.description ? `${optionId}-desc` : undefined}
                />
                <span className="bp-check__text">
                  <span className="bp-check__name">{option.label}</span>
                  {option.description ? (
                    <span className="bp-check__desc" id={`${optionId}-desc`}>
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </label>
              {checked && followUp?.[option.value] ? (
                <div className="bp-check-group__follow">{followUp[option.value]}</div>
              ) : null}
            </div>
          )
        })}
      </div>
      <p className="bp-check-group__note" id={`${groupId}-note`} role="status" aria-live="polite">
        {note ?? null}
      </p>
      {error ? (
        <p className="bp-field__error" id={`${groupId}-error`} role="alert">
          <Icon name="alert" size={16} strokeWidth={2.2} />
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
