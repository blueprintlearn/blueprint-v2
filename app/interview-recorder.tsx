"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/blueprint"
import { savePublicInterviewAnswer, submitPublicInterview } from "@/lib/blueprint/interview-actions"
import {
  INTERVIEW_CONFIRM,
  INTERVIEW_PERMISSION,
  INTERVIEW_SUBMITTED,
  INTERVIEW_UNSUPPORTED,
  INTERVIEW_UPLOAD_FAILED,
  hasCompleteAnswers,
  mapInterviewRpcError,
  type ApplicantInterviewSession,
} from "@/lib/blueprint/interviews"

type Mode = "preview" | "live"

function pickMime(): { mimeType: string; contentType: "video/webm" | "video/mp4" } | null {
  if (typeof MediaRecorder === "undefined") return null
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
    return { mimeType: "video/webm;codecs=vp8,opus", contentType: "video/webm" }
  }
  if (MediaRecorder.isTypeSupported("video/webm")) {
    return { mimeType: "video/webm", contentType: "video/webm" }
  }
  if (MediaRecorder.isTypeSupported("video/mp4")) {
    return { mimeType: "video/mp4", contentType: "video/mp4" }
  }
  return null
}

export function InterviewRecorder({
  token,
  session,
  mode = "live",
}: {
  token?: string
  session: Pick<ApplicantInterviewSession, "tokenHash" | "questions" | "acceptedIndexes" | "status">
  mode?: Mode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [index, setIndex] = useState(() => {
    for (let i = 0; i < session.questions.length; i += 1) {
      if (!session.acceptedIndexes.includes(i)) return i
    }
    return 0
  })
  const [accepted, setAccepted] = useState<Set<number>>(() => new Set(session.acceptedIndexes))
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"ready" | "recording" | "review">("ready")
  const [secondsLeft, setSecondsLeft] = useState(session.questions[0]?.timeLimitSeconds ?? 60)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(session.status === "submitted" || session.status === "ready" || session.status === "transcribing" || session.status === "failed")
  const question = session.questions[index]
  const mime = useMemo(() => (typeof MediaRecorder === "undefined" ? null : pickMime()), [])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function ensureStream() {
    const live = streamRef.current?.getTracks().some((track) => track.readyState === "live")
    if (live && streamRef.current) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current
        await videoRef.current.play().catch(() => undefined)
      }
      return streamRef.current
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    streamRef.current = stream
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play().catch(() => undefined)
    }
    return stream
  }

  function stopTimer() {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  async function startRecording() {
    setError(null)
    setPermissionError(null)
    try {
      const stream = await ensureStream()
      if (!mime || !navigator.mediaDevices?.getUserMedia) {
        setError(INTERVIEW_UNSUPPORTED)
        return
      }
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: mime.mimeType })
      recorderRef.current = recorder
      const started = Date.now()
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        stopTimer()
        const recorded = new Blob(chunksRef.current, { type: mime.contentType })
        setBlob(recorded)
        setDurationMs(Math.max(1, Date.now() - started))
        const url = URL.createObjectURL(recorded)
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return url
        })
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = url
        }
        setPhase("review")
      }
      recorder.start(250)
      setPhase("recording")
      const limit = question?.timeLimitSeconds ?? 60
      setSecondsLeft(limit)
      timerRef.current = window.setInterval(() => {
        setSecondsLeft((left) => {
          if (left <= 1) {
            recorder.stop()
            return 0
          }
          return left - 1
        })
      }, 1000)
    } catch {
      setPermissionError("Camera or microphone permission was blocked. Allow both, then try again.")
    }
  }

  function stopRecording() {
    recorderRef.current?.stop()
  }

  async function acceptTake() {
    if (!question || !blob || !mime) return
    if (mode === "preview") {
      const next = new Set(accepted)
      next.add(index)
      setAccepted(next)
      advance(next)
      return
    }
    if (!token) return
    if (blob.size < 256) {
      setError("That take was empty. Record again.")
      return
    }
    setBusy(true)
    setError(null)
    const answerId = crypto.randomUUID()
    try {
      const payload = new FormData()
      payload.set("token", token)
      payload.set("questionIndex", String(index))
      payload.set("answerId", answerId)
      payload.set("contentType", mime.contentType)
      payload.set("durationMs", String(durationMs))
      payload.set("file", blob, `${answerId}.${mime.contentType === "video/mp4" ? "mp4" : "webm"}`)
      const saved = await savePublicInterviewAnswer(payload)
      if (!saved.ok) {
        setError(mapInterviewRpcError(saved.error))
        setBusy(false)
        return
      }
      const next = new Set(accepted)
      next.add(index)
      setAccepted(next)
      setBusy(false)
      advance(next)
    } catch {
      setError(INTERVIEW_UPLOAD_FAILED)
      setBusy(false)
    }
  }

  function advance(nextAccepted: Set<number>) {
    setBlob(null)
    setPhase("ready")
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    const nextIndex = session.questions.findIndex((_, i) => i > index && !nextAccepted.has(i))
    if (nextIndex >= 0) setIndex(nextIndex)
    else if (!hasCompleteAnswers(nextAccepted)) {
      const first = session.questions.findIndex((_, i) => !nextAccepted.has(i))
      if (first >= 0) setIndex(first)
    }
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.removeAttribute("src")
    }
  }

  async function submit() {
    if (mode === "preview") {
      setDone(true)
      return
    }
    if (!token) return
    setBusy(true)
    const result = await submitPublicInterview(token)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <p className="m-0 text-[18px] font-bold" data-interview-complete="">
        {INTERVIEW_SUBMITTED}
      </p>
    )
  }

  return (
    <div className="grid gap-4" data-interview-recorder="" data-interview-index={index}>
      <p className="m-0 text-[14px] text-muted">{INTERVIEW_PERMISSION}</p>
      {permissionError ? (
        <p className="bp-field__error" role="alert">
          {permissionError}
        </p>
      ) : null}
      <p className="m-0 text-[13px] font-bold text-muted">
        Question {index + 1} of {session.questions.length}
      </p>
      <h2 className="m-0 text-[22px] font-bold text-ink">{question?.prompt}</h2>
      <p className="m-0 text-[14px] text-muted">Up to {question?.timeLimitSeconds} seconds.</p>
      <video
        ref={videoRef}
        className="aspect-video w-full rounded-[18px] bg-ink"
        playsInline
        autoPlay={phase !== "review"}
        muted={phase !== "review"}
        controls={phase === "review"}
      />
      {phase === "recording" ? (
        <p className="m-0 font-bold" data-interview-timer="">
          {secondsLeft}s left
        </p>
      ) : null}
      {phase === "review" ? <p className="m-0 text-[14px] text-muted">{INTERVIEW_CONFIRM}</p> : null}
      {error ? (
        <p className="bp-field__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {phase === "ready" ? (
          <Button variant="coral" onClick={() => void startRecording()}>
            {accepted.has(index) ? "Record again" : "Start recording"}
          </Button>
        ) : null}
        {phase === "recording" ? (
          <Button variant="coral" onClick={stopRecording}>
            Stop
          </Button>
        ) : null}
        {phase === "review" ? (
          <>
            <Button variant="coral" disabled={busy} onClick={() => void acceptTake()}>
              Use this take
            </Button>
            <Button variant="soft" disabled={busy} onClick={() => void startRecording()}>
              Record again
            </Button>
          </>
        ) : null}
      </div>
      <ol className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-muted">
        {session.questions.map((item, i) => (
          <li key={item.prompt} data-interview-progress={accepted.has(i) ? "accepted" : "open"}>
            {accepted.has(i) ? "Saved" : "Not saved"} · Question {i + 1}
          </li>
        ))}
      </ol>
      {hasCompleteAnswers(accepted) ? (
        <Button variant="coral" disabled={busy} onClick={() => void submit()}>
          Submit interview
        </Button>
      ) : null}
    </div>
  )
}
