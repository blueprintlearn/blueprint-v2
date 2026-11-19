"use client"

import { startTransition, useActionState, type FormEvent } from "react"
import Link from "next/link"

import { Button, TextArea, TextField } from "@/components/blueprint"
import { submitJoinApplication } from "@/lib/blueprint/applicant-actions"
import {
  APPLICATION_RECEIVED,
  PRIVACY_NOTICE_HREF,
  type SubmitApplicationState,
} from "@/lib/blueprint/applicants"

const initial: SubmitApplicationState = { error: null, submitted: false }

export function JoinApplyForm({
  slug,
  questions,
  idempotencyKey,
}: {
  slug: string
  questions: string[]
  idempotencyKey: string
}) {
  const [state, dispatch, pending] = useActionState(submitJoinApplication, initial)

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }

  if (state.submitted) {
    return (
      <p className="m-0 text-[16px] text-ink" data-join-apply="submitted" role="status">
        {APPLICATION_RECEIVED}
      </p>
    )
  }

  return (
    <form
      action={dispatch}
      onSubmit={onSubmit}
      noValidate
      className="grid gap-5"
      data-join-apply="form"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="grid gap-5 md:grid-cols-2">
        <TextField id="firstName" name="firstName" label="First name" autoComplete="given-name" />
        <TextField id="lastName" name="lastName" label="Last name" autoComplete="family-name" />
      </div>
      <TextField id="email" name="email" type="email" label="Email" autoComplete="email" />
      <TextField id="phone" name="phone" type="tel" label="Phone" autoComplete="tel" />
      <TextField
        id="location"
        name="location"
        label="General location or service area"
        help="City, region, or the area you can work."
        autoComplete="address-level2"
      />
      <TextArea
        id="availability"
        name="availability"
        label="Availability for events"
        help="Weekends matter for most DJ work. Say what you can commit to."
        rows={3}
      />
      <TextArea
        id="experience"
        name="experience"
        label="Previous DJ or event experience"
        help="It is fine if you are new. Say what you have done."
        rows={4}
      />
      <TextArea
        id="motivation"
        name="motivation"
        label="Why do you want to work with this company?"
        rows={4}
      />
      {questions.map((question, index) => (
        <TextArea
          key={`${index}-${question}`}
          id={`ownerAnswer-${index}`}
          name={`ownerAnswer-${index}`}
          label={question}
          rows={3}
        />
      ))}
      <label className="flex items-start gap-3 text-[14px] text-ink">
        <input type="checkbox" name="consent" value="1" className="mt-1" />
        <span>
          I agree that this company may store my application to review me for this role. Read the{" "}
          <Link href={PRIVACY_NOTICE_HREF} className="bp-link font-bold">
            privacy notice
          </Link>
          .
        </span>
      </label>
      {state.error ? (
        <p className="bp-field__error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting" : "Submit application"}
        </Button>
      </div>
    </form>
  )
}
