"use client"

import Link from "next/link"
import { useActionState } from "react"

import { signUp, type AuthFormState } from "@/lib/auth/actions"

const initialState: AuthFormState = { error: null }

export default function SignUpPage() {
  const [state, action] = useActionState(signUp, initialState)

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <form action={action} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          Email
          <input className="border px-3 py-2" name="email" required type="email" />
        </label>
        <label className="flex flex-col gap-1">
          Password
          <input
            className="border px-3 py-2"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        {state.error ? <p role="alert">{state.error}</p> : null}
        <button className="border px-3 py-2" type="submit">
          Create account
        </button>
      </form>
      <Link className="underline" href="/sign-in">
        Already have an account
      </Link>
    </main>
  )
}
