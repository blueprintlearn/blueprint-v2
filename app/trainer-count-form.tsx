"use client"

import { useActionState } from "react"

import { saveTrainerCount, type SaveTrainerCountState } from "@/lib/blueprint/actions"
import {
  CURRENT_TRAINER_COUNT_MAX,
  CURRENT_TRAINER_COUNT_MIN,
} from "@/lib/blueprint/team-today"

const initialState: SaveTrainerCountState = { error: null }

export function TrainerCountForm({
  currentTrainerCount,
}: {
  currentTrainerCount: number | null
}) {
  const [state, action] = useActionState(saveTrainerCount, initialState)

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      data-saved-current-trainer-count={
        currentTrainerCount === null ? "" : String(currentTrainerCount)
      }
    >
      <label className="flex flex-col gap-1">
        Current trainer count
        <input
          className="border px-3 py-2"
          defaultValue={currentTrainerCount === null ? "" : currentTrainerCount}
          max={CURRENT_TRAINER_COUNT_MAX}
          min={CURRENT_TRAINER_COUNT_MIN}
          name="currentTrainerCount"
          required
          step={1}
          type="number"
        />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button className="border px-3 py-2" type="submit">
        Save trainer count
      </button>
    </form>
  )
}
