"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

import { cx } from "./cx"
import { Icon } from "./icons"
import { isCurrentPath } from "./nav-match"

export type NavItem = { href: string; label: string }

/**
 * A link when href is set, a button when onSelect is set, otherwise static content.
 * Interactive markup is never rendered without somewhere to go or something to do.
 */
function NavControl({
  href,
  onSelect,
  className,
  label,
  staticLabel,
  children,
}: {
  href?: string
  onSelect?: () => void
  className: string
  label?: string
  /** Accessible name for the static form. Omit when the visible text is the name. */
  staticLabel?: string
  children: ReactNode
}) {
  if (href) {
    return (
      <Link href={href} className={className} aria-label={label}>
        {children}
      </Link>
    )
  }
  if (onSelect) {
    return (
      <button type="button" className={className} aria-label={label} onClick={onSelect}>
        {children}
      </button>
    )
  }
  return (
    <span
      className={cx(className, "bp-nav__static")}
      role={staticLabel ? "img" : undefined}
      aria-label={staticLabel}
    >
      {children}
    </span>
  )
}

/**
 * The top bar for desktop and tablet. Below 760px its tabs hide and BottomTabBar takes over.
 * Owner screens: Blueprint mark + wordmark. Customer-branded screens: pass the company's logo and name.
 *
 * Workspace, notifications, account and search each take an href or a callback. Without one,
 * workspace and account render as plain content, notifications show only when there are alerts,
 * and search is left out.
 *
 * No-tabs mode: leave items empty (or omit it) on screens that don't have the main tabs yet.
 * No <nav> is rendered. actions is a slot on the right for page-level controls such as Sign out.
 */
export function TopNav({
  items = [],
  currentHref,
  logoSrc = "/brand/blueprint-b-mark.jpg",
  brandName = "Blueprint",
  workspace,
  workspaceHref,
  onOpenWorkspace,
  alerts = 0,
  notificationsHref,
  onOpenNotifications,
  userInitial,
  accountLabel = "Account",
  accountHref,
  onOpenAccount,
  searchHref,
  onOpenSearch,
  onToggleTheme,
  actions,
  className,
}: {
  /** The main tabs (at most 5). Empty or omitted = no-tabs mode. */
  items?: NavItem[]
  /** Overrides route matching, e.g. on a nested page that belongs to a parent tab. */
  currentHref?: string
  logoSrc?: string
  brandName?: string
  workspace?: string
  workspaceHref?: string
  onOpenWorkspace?: () => void
  alerts?: number
  notificationsHref?: string
  onOpenNotifications?: () => void
  userInitial?: string
  /** Accessible name for the account control, e.g. "Account for David Osborne". */
  accountLabel?: string
  accountHref?: string
  onOpenAccount?: () => void
  searchHref?: string
  onOpenSearch?: () => void
  onToggleTheme?: () => void
  /** Page-level controls on the far right, e.g. <SignOutButton />. Keep it to one or two quiet buttons. */
  actions?: ReactNode
  className?: string
}) {
  const pathname = usePathname()
  const workspaceActive = Boolean(workspaceHref || onOpenWorkspace)
  const notificationsActive = Boolean(notificationsHref || onOpenNotifications)
  const notificationsLabel = alerts ? `Notifications, ${alerts} new` : "Notifications"
  const tabs = items.slice(0, 5)
  return (
    <header className={cx("bp-nav", tabs.length === 0 && "bp-nav--no-tabs", className)}>
      <div className="bp-nav__in">
        <div className="bp-nav__brand">
          <Image src={logoSrc} alt="" width={38} height={38} priority />
          <span className="bp-nav__word">{brandName}</span>
          {workspace ? (
            <NavControl
              href={workspaceHref}
              onSelect={onOpenWorkspace}
              className="bp-nav__ws"
              label={workspaceActive ? `Workspace: ${workspace}` : undefined}
            >
              {workspace}
              {workspaceActive ? <Icon name="chevron" size={14} strokeWidth={2.2} /> : null}
            </NavControl>
          ) : null}
        </div>
        {tabs.length > 0 ? (
          <nav className="bp-nav__tabs" aria-label="Main">
            {tabs.map((it) => {
              const current = currentHref ? currentHref === it.href : isCurrentPath(it.href, pathname)
              return (
                <Link key={it.href} href={it.href} className="bp-nav__tab" aria-current={current ? "page" : undefined}>
                  {it.label}
                </Link>
              )
            })}
          </nav>
        ) : null}
        <div className="bp-nav__right">
          {searchHref || onOpenSearch ? (
            <NavControl href={searchHref} onSelect={onOpenSearch} className="bp-nav__icon bp-nav__search" label="Search">
              <Icon name="search" size={20} />
            </NavControl>
          ) : null}
          {onToggleTheme ? (
            <button type="button" className="bp-nav__icon" aria-label="Switch light or dark theme" onClick={onToggleTheme}>
              <Icon name="moon" size={20} />
            </button>
          ) : null}
          {notificationsActive || alerts ? (
            <NavControl
              href={notificationsHref}
              onSelect={onOpenNotifications}
              className="bp-nav__icon"
              label={notificationsLabel}
              staticLabel={notificationsLabel}
            >
              <Icon name="bell" size={20} />
              {alerts ? <span className="bp-nav__pip" /> : null}
            </NavControl>
          ) : null}
          {userInitial ? (
            <NavControl
              href={accountHref}
              onSelect={onOpenAccount}
              className="bp-nav__me"
              label={accountLabel}
              staticLabel={accountLabel}
            >
              {userInitial}
            </NavControl>
          ) : null}
          {actions ? <div className="bp-nav__actions">{actions}</div> : null}
        </div>
      </div>
    </header>
  )
}
