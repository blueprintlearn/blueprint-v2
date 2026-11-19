"use client"

import { useEffect, useRef, useState } from "react"

import { Button, SaveStatus, TextArea, TextField } from "@/components/blueprint"
import {
  rebuildRecruitingDraft,
  saveRecruitingEditor,
  startRecruitingRevision,
  unpublishRecruitingPage,
} from "@/lib/blueprint/recruiting-actions"
import {
  AD_CHANNEL_LABELS,
  AD_CHANNELS,
  type RecruitingAds,
  type RecruitingPageContent,
} from "@/lib/blueprint/recruiting-engine"
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

function CopyField({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="m-0 min-w-0 flex-1 break-all text-[14px] text-ink" data-recruiting-url={text}>
        {text}
      </p>
      <Button
        type="button"
        variant="soft"
        onClick={async () => {
          const value = text.startsWith("/") ? `${window.location.origin}${text}` : text
          await navigator.clipboard.writeText(value)
          setCopied(true)
        }}
      >
        {copied ? "Copied" : label}
      </Button>
    </div>
  )
}

function PageFields({ page, slug }: { page: RecruitingPageContent; slug: string }) {
  return (
    <div className="grid gap-5">
      <TextField
        id="slug"
        name="slug"
        label="Public URL"
        help="Lowercase letters, numbers, and hyphens. This is reserved for your company."
        defaultValue={slug}
      />
      <TextField id="companyName" name="companyName" label="Company name on the page" defaultValue={page.companyName} />
      <TextField
        id="primaryColor"
        name="primaryColor"
        label="Brand color"
        help="Optional hex color such as #253860."
        optional
        defaultValue={page.primaryColor ?? ""}
      />
      <TextField
        id="accentColor"
        name="accentColor"
        label="Accent color"
        help="Optional hex color for buttons."
        optional
        defaultValue={page.accentColor ?? ""}
      />
      <TextField id="headline" name="headline" label="Headline" defaultValue={page.headline} />
      <TextArea id="introduction" name="introduction" label="Introduction" defaultValue={page.introduction} rows={4} />
      <TextField id="roleTitle" name="roleTitle" label="Job title" defaultValue={page.roleTitle} />
      <TextArea
        id="roleDescription"
        name="roleDescription"
        label="Role description"
        defaultValue={page.roleDescription}
        rows={4}
      />
      <TextArea
        id="responsibilities"
        name="responsibilities"
        label="Responsibilities"
        help="One item per line."
        defaultValue={page.responsibilities.join("\n")}
        rows={5}
      />
      <TextArea
        id="required"
        name="required"
        label="Required qualifications"
        help="One item per line."
        defaultValue={page.required.join("\n")}
        rows={5}
      />
      <TextArea
        id="preferred"
        name="preferred"
        label="Preferred qualifications"
        help="One item per line. Leave blank if none."
        optional
        defaultValue={page.preferred.join("\n")}
        rows={4}
      />
      <TextField
        id="compensation"
        name="compensation"
        label="Compensation"
        help="Only shown if you provided it. Blueprint will not invent a rate."
        optional
        defaultValue={page.compensation ?? ""}
      />
      <label className="flex items-start gap-3 text-[14px] text-ink">
        <input type="checkbox" name="showCompensation" value="1" defaultChecked={page.showCompensation} className="mt-1" />
        Show compensation on the public page
      </label>
      <TextArea
        id="values"
        name="values"
        label="Company values"
        help="One value per line. You can write “Value — how it shows up”."
        optional
        defaultValue={page.values.map((row) => `${row.value} — ${row.behavior}`).join("\n")}
        rows={4}
      />
      <TextField
        id="arrangement"
        name="arrangement"
        label="Employment arrangement"
        optional
        defaultValue={page.arrangement ?? ""}
      />
      <TextField
        id="availability"
        name="availability"
        label="Availability"
        optional
        defaultValue={page.availability ?? ""}
      />
      <TextField id="travel" name="travel" label="Service area" optional defaultValue={page.travel ?? ""} />
      <TextArea
        id="applicationQuestions"
        name="applicationQuestions"
        label="Additional application questions"
        help="Optional. One question per line. Do not ask for Social Security numbers, birth dates, or other sensitive information."
        optional
        defaultValue={page.applicationQuestions.join("\n")}
        rows={4}
      />
    </div>
  )
}

function AdFields({ ads }: { ads: RecruitingAds }) {
  return (
    <div className="grid gap-8">
      {AD_CHANNELS.map((channel) => (
        <div key={channel} className="grid gap-3" data-ad-channel={channel}>
          <h3 className="m-0 text-[16px] font-bold text-ink">{AD_CHANNEL_LABELS[channel]}</h3>
          <TextField
            id={`${channel}Title`}
            name={`${channel}Title`}
            label={`${AD_CHANNEL_LABELS[channel]} title`}
            defaultValue={ads[channel].title}
          />
          <TextArea
            id={`${channel}Body`}
            name={`${channel}Body`}
            label={`${AD_CHANNEL_LABELS[channel]} advertisement`}
            defaultValue={ads[channel].body}
            rows={channel === "indeed" ? 12 : 8}
          />
          <CopyField label="Copy advertisement" text={`${ads[channel].title}\n\n${ads[channel].body}`} />
        </div>
      ))}
    </div>
  )
}

export function RecruitingEditorForm({
  page,
  ads,
  slug,
  joinPath,
  canPublish,
}: {
  page: RecruitingPageContent
  ads: RecruitingAds
  slug: string
  joinPath: string
  canPublish: boolean
}) {
  const editor = useSaveForm(saveRecruitingEditor)
  useReloadWhenSaved(editor.saveState)
  return (
    <form {...editor.formProps} data-recruiting-form="editor" className="grid gap-5">
      <PageFields page={page} slug={slug} />
      <AdFields ads={ads} />
      <CopyField label="Copy public URL" text={joinPath} />
      {canPublish ? (
        <label className="flex items-start gap-3 text-[14px] text-ink">
          <input type="checkbox" name="confirmPublish" value="1" className="mt-1" />
          I have reviewed this recruiting page. Publishing makes it public and opens applications. Blueprint does not post ads.
        </label>
      ) : null}
      {editor.error ? (
        <p className="bp-field__error" role="alert">
          {editor.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="intent" value="draft" variant="soft" disabled={editor.pending}>
          Save draft
        </Button>
        {canPublish ? (
          <Button type="submit" name="intent" value="publish" disabled={editor.pending}>
            Publish recruiting page
          </Button>
        ) : null}
        <SaveStatus state={editor.saveState} />
      </div>
    </form>
  )
}

export function RecruitingUnpublishForm() {
  const { error, pending, saveState, formProps } = useSaveForm(unpublishRecruitingPage)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-recruiting-form="unpublish" className="grid gap-3">
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="plain" disabled={pending}>
          Unpublish
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function RecruitingReviseForm() {
  const { error, pending, saveState, formProps } = useSaveForm(startRecruitingRevision)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-recruiting-form="revise" className="grid gap-3">
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="soft" disabled={pending}>
          Edit a new draft
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}

export function RecruitingRebuildForm() {
  const { error, pending, saveState, formProps } = useSaveForm(rebuildRecruitingDraft)
  useReloadWhenSaved(saveState)
  return (
    <form {...formProps} data-recruiting-form="rebuild" className="grid gap-3">
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="plain" disabled={pending}>
          Rebuild draft from the current strategy
        </Button>
        <SaveStatus state={saveState} />
      </div>
    </form>
  )
}
