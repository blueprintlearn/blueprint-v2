import { useId, type InputHTMLAttributes } from "react"

import { describedBy, Field, type FieldProps } from "./Field"

export type NumberFieldProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "required" | "defaultValue"> & {
    /** null = never saved: the input is empty and shows its placeholder. 0 is a real value and shows "0". */
    defaultValue?: number | null
  }

/** A labelled whole-number input, 180px wide. Pass min, max and a placeholder example ("e.g. 6"). */
export function NumberField({
  label,
  help,
  error,
  optional,
  className,
  id,
  defaultValue,
  step = 1,
  ...rest
}: NumberFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field id={fieldId} label={label} help={help} error={error} optional={optional} className={className}>
      <input
        {...rest}
        id={fieldId}
        type="number"
        inputMode="numeric"
        step={step}
        defaultValue={defaultValue === null || defaultValue === undefined ? "" : defaultValue}
        className="bp-input bp-input--number"
        required={!optional}
        aria-describedby={describedBy(fieldId, help, error)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  )
}
