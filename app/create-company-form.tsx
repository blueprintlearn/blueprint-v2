"use client"

import { useActionState } from "react"

import { createCompany, type CreateCompanyState } from "@/lib/tenancy/actions"

const initialState: CreateCompanyState = { error: null }

export function CreateCompanyForm() {
  const [state, action] = useActionState(createCompany, initialState)

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        Company name
        <input
          className="border px-3 py-2"
          name="name"
          required
          maxLength={80}
          type="text"
        />
      </label>
      {state.error ? <p role="alert">{state.error}</p> : null}
      <button className="border px-3 py-2" type="submit">
        Create company
      </button>
    </form>
  )
}
