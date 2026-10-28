"use client"

import { startTransition, useActionState, useState, type FormEvent } from "react"

import type { SaveState } from "@/components/blueprint"

type SaveResult = { error: string | null; savedAt: number | null }

const initialState: SaveResult = { error: null, savedAt: null }

/**
 * Shared wiring for the owner home save forms.
 *
 * React resets a form after every submission made through its action prop,
 * including failed ones, which would throw away what the owner typed. Once
 * hydrated, submissions go through onSubmit instead: preventDefault plus a
 * transition tells React to track the pending state without the reset, so
 * the fields keep exactly what was entered after an error and after a save.
 * The action prop stays for submissions made before hydration.
 */
export function useSaveForm(save: (prev: SaveResult, formData: FormData) => Promise<SaveResult>) {
  const [state, dispatch, pending] = useActionState(save, initialState)
  // The savedAt the owner has edited after: "Saved" hides once they change anything.
  const [editedAfter, setEditedAfter] = useState<number | null>(null)

  const saveState: SaveState = pending
    ? "saving"
    : state.savedAt !== null && editedAfter !== state.savedAt
      ? "saved"
      : "idle"

  const formProps = {
    action: dispatch,
    noValidate: true,
    onChange: () => setEditedAfter(state.savedAt),
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const formData = new FormData(event.currentTarget)
      startTransition(() => dispatch(formData))
    },
  }

  return { error: state.error, pending, saveState, formProps }
}
