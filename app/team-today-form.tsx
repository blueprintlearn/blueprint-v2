"use client"

import { Button, NumberField, SaveStatus } from "@/components/blueprint"
import { saveTeamToday } from "@/lib/blueprint/actions"
import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
} from "@/lib/blueprint/team-today"

import { useSaveForm } from "./use-save-form"

export function TeamTodayForm({
  currentDjCount,
}: {
  currentDjCount: number | null
}) {
  const { error, pending, saveState, formProps } = useSaveForm(saveTeamToday)

  return (
    <form
      {...formProps}
      className="flex flex-col gap-3"
      data-saved-current-dj-count={currentDjCount === null ? "" : String(currentDjCount)}
    >
      <NumberField
        label="Current DJ count"
        name="currentDjCount"
        defaultValue={currentDjCount}
        min={CURRENT_DJ_COUNT_MIN}
        max={CURRENT_DJ_COUNT_MAX}
        placeholder="e.g. 6"
        help="DJs who work events for you now."
        error={error}
      />
      <div className="bp-form-row">
        <Button type="submit" variant="soft" size="sm" disabled={pending} aria-busy={pending || undefined}>
          Save DJ count
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
