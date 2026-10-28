import { cx } from "./cx"
import { Icon } from "./icons"

export type SaveState = "idle" | "saving" | "saved"

/**
 * Sits beside a Save button. Always rendered (idle is an empty live region) so later changes are announced.
 * Show "saved" only after the server confirms, and keep it until that form is edited again. Never on a timer.
 * Errors don't go here: they go on the field.
 */
export function SaveStatus({
  state,
  savedText = "Saved",
  savingText = "Saving…",
  className,
}: {
  state: SaveState
  savedText?: string
  savingText?: string
  className?: string
}) {
  return (
    <span className={cx("bp-save", `bp-save--${state}`, className)} role="status" aria-live="polite">
      {state === "saved" ? (
        <>
          <Icon name="check" size={16} strokeWidth={2.4} />
          <span>{savedText}</span>
        </>
      ) : null}
      {state === "saving" ? savingText : null}
    </span>
  )
}
