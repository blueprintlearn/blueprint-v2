"use client"

import { useActionState } from "react"

import { saveOwnerGoal, type SaveOwnerGoalState } from "@/lib/blueprint/actions"
import {
  OWNER_GOAL_CODES,
  OWNER_GOAL_LABELS,
  OWNER_GOAL_OTHER_MAX_LENGTH,
  type OwnerGoalCode,
} from "@/lib/blueprint/goals"

const initialState: SaveOwnerGoalState = { error: null }

export function OwnerGoalForm({
  ownerGoal,
  ownerGoalOther,
}: {
  ownerGoal: OwnerGoalCode | null
  ownerGoalOther: string | null
}) {
  const [state, action] = useActionState(saveOwnerGoal, initialState)

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Owner goal
        <select className="border px-3 py-2" defaultValue={ownerGoal ?? ""} name="ownerGoal" required>
          <option disabled value="">
            Select a goal
          </option>
          {OWNER_GOAL_CODES.map((code) => (
            <option key={code} value={code}>
              {OWNER_GOAL_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Other goal
        <input
          className="border px-3 py-2"
          defaultValue={ownerGoalOther ?? ""}
          maxLength={OWNER_GOAL_OTHER_MAX_LENGTH}
          name="ownerGoalOther"
          type="text"
        />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button className="border px-3 py-2" type="submit">
        Save owner goal
      </button>
    </form>
  )
}
