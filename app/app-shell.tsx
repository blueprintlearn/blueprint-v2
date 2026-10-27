import Link from "next/link"
import type { ReactNode } from "react"

import { SignOutButton } from "./sign-out-button"

export function AppShell({
  signedIn,
  children,
}: {
  signedIn: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link className="text-sm font-semibold tracking-tight" href="/">
            Blueprint
          </Link>
          {signedIn ? <SignOutButton /> : null}
        </div>
      </header>
      {children}
    </div>
  )
}
