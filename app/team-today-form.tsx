"use client"

import { useActionState } from "react"

import { saveTeamToday, type SaveTeamTodayState } from "@/lib/blueprint/actions"
import {
  CURRENT_DJ_COUNT_MAX,
  CURRENT_DJ_COUNT_MIN,
} from "@/lib/blueprint/team-today"

import { fieldClassName, primaryButtonClassName } from "./ui"

const initialState: SaveTeamTodayState = { error: null }

export function TeamTodayForm({
  currentDjCount,
}: {
  currentDjCount: number | null
}) {
  const [state, action] = useActionState(saveTeamToday, initialState)

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      data-saved-current-dj-count={currentDjCount === null ? "" : String(currentDjCount)}
    >
      <label className="flex flex-col gap-1">
        Current DJ count
        <input
          className={fieldClassName}
          defaultValue={currentDjCount === null ? "" : currentDjCount}
          max={CURRENT_DJ_COUNT_MAX}
          min={CURRENT_DJ_COUNT_MIN}
          name="currentDjCount"
          required
          step={1}
          type="number"
        />
      </label>
      {state.error ? (
        <p className="text-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className={primaryButtonClassName} type="submit">
        Save DJ count
      </button>
    </form>
  )
}
