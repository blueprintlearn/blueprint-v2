import { StatusTag } from "./StatusTag"
import { cx } from "./cx"

export type AnswerStateNoteProps = {
  /** estimated: hatched "Estimate" tag + line. skipped: muted line. Not a completion status. */
  state: "estimated" | "skipped"
  text?: string
  /** For skipped: the question's why-it's-needed sentence. */
  why?: string
  id?: string
  className?: string
}

/** The line under a field that is Estimated or Skipped. Never a section status. */
export function AnswerStateNote({ state, text, why, id, className }: AnswerStateNoteProps) {
  if (state === "estimated") {
    return (
      <p className={cx("bp-answer-note bp-answer-note--estimated", className)} id={id}>
        <StatusTag status="progress" label="Estimate" />
        <span>{text ?? "Blueprint estimated this. Change it any time."}</span>
      </p>
    )
  }

  if (state === "skipped") {
    return (
      <p className={cx("bp-answer-note bp-answer-note--skipped", className)} id={id}>
        {text ?? "You skipped this for now."}
        {why ? ` ${why}` : null}
      </p>
    )
  }

  return null
}
