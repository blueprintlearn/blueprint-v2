import { useId, type InputHTMLAttributes } from "react"

import { describedBy, Field, type FieldProps } from "./Field"

export type TextFieldProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "required"> & {
    type?: "text" | "email" | "tel" | "url" | "search"
  }

/** A labelled single-line text input. Uncontrolled by default; pass value/onChange to control it. */
export function TextField({ label, help, error, optional, className, id, type = "text", ...rest }: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field id={fieldId} label={label} help={help} error={error} optional={optional} className={className}>
      <input
        {...rest}
        id={fieldId}
        type={type}
        className="bp-input"
        required={!optional}
        aria-describedby={describedBy(fieldId, help, error)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  )
}
