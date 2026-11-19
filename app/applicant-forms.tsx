"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

import { Button, SaveStatus, Select, TextArea, TextField } from "@/components/blueprint"
import { addApplicantNote, moveApplicantStage } from "@/lib/blueprint/applicant-actions"
import {
  APPLICANT_STAGE_LABELS,
  APPLICANT_STAGES,
  type ApplicantStage,
} from "@/lib/blueprint/applicants"
import { useSaveForm } from "./use-save-form"

function useReloadWhenSaved(saveState: string) {
  const reloaded = useRef(false)
  useEffect(() => {
    if (saveState === "saved" && !reloaded.current) {
      reloaded.current = true
      window.location.reload()
    }
    if (saveState !== "saved") reloaded.current = false
  }, [saveState])
}

export function ApplicantStageForm({
  applicationId,
  stage,
  compact = false,
}: {
  applicationId: string
  stage: ApplicantStage
  compact?: boolean
}) {
  const { error, pending, saveState, formProps } = useSaveForm(moveApplicantStage)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-applicant-form="stage" className={compact ? "grid gap-2" : "grid gap-3"}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <Select
        id={`stage-${applicationId}`}
        name="stage"
        label={compact ? "Move to" : "Pipeline stage"}
        options={APPLICANT_STAGES.map((value) => ({ value, label: APPLICANT_STAGE_LABELS[value] }))}
        defaultValue={stage}
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={compact ? "soft" : "primary"} disabled={pending}>
          Update stage
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ApplicantNoteForm({ applicationId }: { applicationId: string }) {
  const { error, pending, saveState, formProps } = useSaveForm(addApplicantNote)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-applicant-form="note" className="grid gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <TextArea
        id={`note-${applicationId}`}
        name="body"
        label="Private note"
        help="Only your company can see this. It is not sent to the applicant."
        rows={4}
      />
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Add note
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function ApplicantBoardFilters({
  query,
  campaignId,
  campaigns,
}: {
  query: string
  campaignId: string
  campaigns: { pageId: string; label: string }[]
}) {
  const router = useRouter()
  return (
    <form
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
      data-applicant-form="filters"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const next = new URLSearchParams()
        const q = String(data.get("q") ?? "").trim()
        const campaign = String(data.get("campaign") ?? "").trim()
        if (q) next.set("q", q)
        if (campaign) next.set("campaign", campaign)
        const suffix = next.toString()
        router.push(suffix ? `/blueprint/applicants?${suffix}` : "/blueprint/applicants")
      }}
    >
      <TextField id="applicant-search" name="q" label="Search by name" defaultValue={query} optional />
      <Select
        id="applicant-campaign"
        name="campaign"
        label="Recruiting campaign"
        optional
        placeholderOption="All campaigns"
        options={campaigns.map((campaign) => ({ value: campaign.pageId, label: campaign.label }))}
        defaultValue={campaignId || null}
      />
      <Button type="submit" variant="soft">
        Filter
      </Button>
    </form>
  )
}
