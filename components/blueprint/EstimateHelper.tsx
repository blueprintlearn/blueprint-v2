"use client"

import { useState, type KeyboardEvent } from "react"

import { Button } from "./Button"
import { NumberField } from "./NumberField"
import { cx } from "./cx"

export type EstimateHelperInput = {
  name: string
  label: string
  min?: number
  max?: number
  help?: string
  placeholder?: string
}

export type EstimateHelperProps = {
  inputs: EstimateHelperInput[]
  /** Pure formula from the question registry. Return null when there's no sensible result. */
  compute: (values: Record<string, number>) => number | null
  /** Caps the result at the question's maximum. */
  max?: number
  /** Shown after the result, e.g. "events". */
  unit?: string
  /** Writes the result into the question's field and marks it Estimated. Nothing saves here. */
  onUse: (result: number) => void
  className?: string
}

/**
 * A short calculator. The component holds no business logic: formulas live in the registry.
 */
export function EstimateHelper({ inputs, compute, max, unit, onUse, className }: EstimateHelperProps) {
  const [vals, setVals] = useState<Record<string, string>>({})

  const parsed = inputs.map((input) => {
    const raw = vals[input.name]
    if (raw === undefined || raw === "") return null
    const n = Number(raw)
    const min = input.min ?? 0
    const ceiling = input.max ?? 9999
    return Number.isInteger(n) && n >= min && n <= ceiling ? n : null
  })
  const ready = parsed.every((value) => value !== null)
  let result: number | null = null
  if (ready) {
    const values: Record<string, number> = {}
    inputs.forEach((input, index) => {
      values[input.name] = parsed[index] as number
    })
    result = compute(values)
    if (typeof result === "number" && max != null) result = Math.min(result, max)
  }

  function preventEnterSubmit(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.preventDefault()
  }

  const unitText = unit ? ` ${unit}` : ""

  return (
    <div className={cx("bp-helper", className)}>
      <div className="bp-helper__inputs">
        {inputs.map((input) => (
          <NumberField
            key={input.name}
            label={input.label}
            name={input.name}
            help={input.help}
            min={input.min}
            max={input.max}
            placeholder={input.placeholder}
            defaultValue={null}
            onChange={(event) => {
              const next = event.currentTarget.value
              setVals((previous) => ({ ...previous, [input.name]: next }))
            }}
            onKeyDown={preventEnterSubmit}
          />
        ))}
      </div>
      <div className="bp-form-row bp-helper__result">
        {result === null ? (
          <span className="bp-helper__pending">Fill these in to see an estimate</span>
        ) : (
          <>
            <span className="bp-helper__value">{`Estimate: ${result.toLocaleString("en-US")}${unitText}`}</span>
            <Button
              variant="soft"
              size="sm"
              type="button"
              onClick={() => onUse(result)}
            >
              {`Use ${result.toLocaleString("en-US")}`}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
