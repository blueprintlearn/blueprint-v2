import { useId, type SelectHTMLAttributes } from "react"

import { describedBy, Field, type FieldProps } from "./Field"
import { Icon } from "./icons"

export type SelectOption = { value: string; label: string }

export type SelectProps = FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "required" | "defaultValue" | "children"> & {
    /** value is the stored code; label is the customer-facing words. Never show a code as a label. */
    options: readonly SelectOption[]
    /** A disabled first option shown while nothing is chosen, e.g. "Select a goal". */
    placeholderOption?: string
    /** null = nothing chosen yet: the placeholder option is selected. */
    defaultValue?: string | null
  }

/** A labelled native select with the Blueprint chevron. */
export function Select({
  label,
  help,
  error,
  optional,
  className,
  id,
  options,
  placeholderOption,
  defaultValue,
  ...rest
}: SelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field id={fieldId} label={label} help={help} error={error} optional={optional} className={className}>
      <span className="bp-select-wrap">
        <select
          {...rest}
          id={fieldId}
          className="bp-select"
          defaultValue={defaultValue ?? ""}
          required={!optional}
          aria-describedby={describedBy(fieldId, help, error)}
          aria-invalid={error ? true : undefined}
        >
          {placeholderOption ? (
            <option value="" disabled>
              {placeholderOption}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="bp-select-wrap__icon" aria-hidden="true">
          <Icon name="chevron" size={18} strokeWidth={2} />
        </span>
      </span>
    </Field>
  )
}
