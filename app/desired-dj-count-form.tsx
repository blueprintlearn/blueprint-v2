"use client"

import { Button, NumberField, SaveStatus } from "@/components/blueprint"
import { saveDesiredDjCount } from "@/lib/blueprint/actions"
import {
  DESIRED_DJ_COUNT_MAX,
  DESIRED_DJ_COUNT_MIN,
} from "@/lib/blueprint/team-today"

import { useSaveForm } from "./use-save-form"

export function DesiredDjCountForm({
  currentDjCount,
  desiredDjCount,
}: {
  /** Display only: the server still enforces current-before-desired. */
  currentDjCount: number | null
  desiredDjCount: number | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveDesiredDjCount)

  return (
    <form
      {...formProps}
      className="flex flex-col gap-3"
      data-saved-desired-dj-count={desiredDjCount === null ? "" : String(desiredDjCount)}
    >
      <NumberField
        label="Desired DJ count"
        name="desiredDjCount"
        defaultValue={desiredDjCount}
        min={DESIRED_DJ_COUNT_MIN}
        max={DESIRED_DJ_COUNT_MAX}
        placeholder="e.g. 6"
        help={currentDjCount === null ? "Save your current DJ count first." : "How many you’d like to have."}
        error={error}
      />
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save desired DJ count
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
