"use client"

import Link from "next/link"
import { useActionState } from "react"

import { signIn, type AuthFormState } from "@/lib/auth/actions"

import { fieldClassName, panelClassName, primaryButtonClassName } from "../ui"

const initialState: AuthFormState = { error: null }

export default function SignInPage() {
  const [state, action] = useActionState(signIn, initialState)

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <section className={panelClassName}>
        <form action={action} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            Email
            <input className={fieldClassName} name="email" required type="email" />
          </label>
          <label className="flex flex-col gap-1">
            Password
            <input
              className={fieldClassName}
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          {state.error ? (
            <p className="text-danger" role="alert">
              {state.error}
            </p>
          ) : null}
          <button className={primaryButtonClassName} type="submit">
            Sign in
          </button>
        </form>
        <Link className="text-sm text-accent underline" href="/sign-up">
          Create an account
        </Link>
      </section>
    </main>
  )
}
