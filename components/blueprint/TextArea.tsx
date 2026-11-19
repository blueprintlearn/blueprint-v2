import { useId, type TextareaHTMLAttributes } from "react"

import { describedBy, Field, type FieldProps } from "./Field"

export type TextAreaProps = FieldProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "required">

/** A labelled multi-line text input. Uncontrolled by default; pass value/onChange to control it. */
export function TextArea({ label, help, error, optional, className, id, rows = 6, ...rest }: TextAreaProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  return (
    <Field id={fieldId} label={label} help={help} error={error} optional={optional} className={className}>
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        className="bp-input bp-textarea"
        required={!optional}
        aria-describedby={describedBy(fieldId, help, error)}
        aria-invalid={error ? true : undefined}
      />
    </Field>
  )
}
