"use client"

import { useActionState } from "react"

import { Button } from "@/components/blueprint"
import { saveDesiredDjCount, type SaveDesiredDjCountState } from "@/lib/blueprint/actions"
import {
  DESIRED_DJ_COUNT_MAX,
  DESIRED_DJ_COUNT_MIN,
} from "@/lib/blueprint/team-today"

const initialState: SaveDesiredDjCountState = { error: null }

export function DesiredDjCountForm({
  desiredDjCount,
}: {
  desiredDjCount: number | null
}) {
  const [state, action] = useActionState(saveDesiredDjCount, initialState)

  return (
    <form
      action={action}
      className="flex flex-col gap-3"
      data-saved-desired-dj-count={desiredDjCount === null ? "" : String(desiredDjCount)}
    >
      <label className="flex flex-col gap-1">
        Desired DJ count
        <input
          className="border px-3 py-2"
          defaultValue={desiredDjCount === null ? "" : desiredDjCount}
          max={DESIRED_DJ_COUNT_MAX}
          min={DESIRED_DJ_COUNT_MIN}
          name="desiredDjCount"
          required
          step={1}
          type="number"
        />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <Button className="sm:self-start" type="submit">
        Save desired DJ count
      </Button>
    </form>
  )
}
