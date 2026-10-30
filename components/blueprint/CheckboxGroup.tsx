"use client"

import { useId, useState, type ReactNode } from "react"

import { cx } from "./cx"
import { Icon } from "./icons"

export type CheckboxGroupOption = {
  /** The stored code. Never displayed. */
  value: string
  /** The words, 1–3 in sentence case. */
  label: string
  /** One line, no ending period. */
  description?: string
}

export type CheckboxGroupProps = {
  /** Rendered as the fieldset's legend. Sentence case, no colon. */
  label: string
  /** Shared by every checkbox: the form posts one value per checked option. */
  name: string
  options: readonly CheckboxGroupOption[]
  /** Controlled checked values. Rules between options live in the form. */
  value?: string[]
  defaultValue?: string[]
  onChange?: (next: string[]) => void
  help?: ReactNode
  /** After a submit attempt. Marks every box aria-invalid and announces with role="alert". */
  error?: string | null
  /** Short line in a polite live region under the options, for automatic changes. */
  note?: ReactNode
  /** Follow-up field per option value, shown directly under that option only while it is checked. */
  followUp?: Record<string, ReactNode>
  optional?: boolean
  id?: string
  className?: string
}

function uniqueValues(values: string[]): string[] {
  return values.filter((value, index, all) => all.indexOf(value) === index)
}

/**
 * A labelled list of checkboxes for choosing any number of options from a short fixed list.
 * Reuses Field label, help and error classes. Do not wrap Field: a legend must not use htmlFor.
 */
export function CheckboxGroup({
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
}: CheckboxGroupProps) {
  const autoId = useId()
  const groupId = id ?? autoId
  const controlled = Array.isArray(value)
  const [inner, setInner] = useState<string[]>(() => uniqueValues(defaultValue ?? []))
  const selected = uniqueValues(controlled ? (value ?? []) : inner)

  function toggle(optionValue: string, checked: boolean) {
    const next = checked
      ? uniqueValues([...selected, optionValue])
      : selected.filter((entry) => entry !== optionValue)
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
      className={cx("bp-check-group", error && "is-invalid", className)}
      aria-describedby={describedBy}
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
          const checked = selected.includes(option.value)
          return (
            <div key={option.value}>
              <label className="bp-check" htmlFor={optionId}>
                <input
                  type="checkbox"
                  className="bp-check__box"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                  aria-describedby={option.description ? `${optionId}-desc` : undefined}
                  aria-invalid={error ? true : undefined}
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
