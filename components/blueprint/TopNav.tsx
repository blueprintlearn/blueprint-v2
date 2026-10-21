"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cx } from "./cx"
import { Icon } from "./icons"
import { isCurrentPath } from "./nav-match"

export type NavItem = { href: string; label: string }

/**
 * The top bar for desktop and tablet. Below 760px its tabs hide and BottomTabBar takes over.
 * Owner screens: Blueprint mark + wordmark. Customer-branded screens: pass the company's logo and name.
 */
export function TopNav({
  items,
  currentHref,
  logoSrc = "/brand/blueprint-b-mark.jpg",
  brandName = "Blueprint",
  workspace,
  alerts = 0,
  userInitial,
  onToggleTheme,
  onOpenSearch,
  className,
}: {
  items: NavItem[]
  /** Overrides route matching, e.g. on a nested page that belongs to a parent tab. */
  currentHref?: string
  logoSrc?: string
  brandName?: string
  workspace?: string
  alerts?: number
  userInitial?: string
  onToggleTheme?: () => void
  onOpenSearch?: () => void
  className?: string
}) {
  const pathname = usePathname()
  return (
    <header className={cx("bp-nav", className)}>
      <div className="bp-nav__in">
        <div className="bp-nav__brand">
          <Image src={logoSrc} alt="" width={38} height={38} priority />
          <span className="bp-nav__word">{brandName}</span>
          {workspace ? (
            <button type="button" className="bp-nav__ws">
              {workspace}
              <Icon name="chevron" size={14} strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
        <nav className="bp-nav__tabs" aria-label="Main">
          {items.slice(0, 5).map((it) => {
            const current = currentHref ? currentHref === it.href : isCurrentPath(it.href, pathname)
            return (
              <Link key={it.href} href={it.href} className="bp-nav__tab" aria-current={current ? "page" : undefined}>
                {it.label}
              </Link>
            )
          })}
        </nav>
        <div className="bp-nav__right">
          <button type="button" className="bp-nav__icon bp-nav__search" aria-label="Search" onClick={onOpenSearch}>
            <Icon name="search" size={20} />
          </button>
          {onToggleTheme ? (
            <button type="button" className="bp-nav__icon" aria-label="Switch light or dark theme" onClick={onToggleTheme}>
              <Icon name="moon" size={20} />
            </button>
          ) : null}
          <button type="button" className="bp-nav__icon" aria-label={alerts ? `Notifications, ${alerts} new` : "Notifications"}>
            <Icon name="bell" size={20} />
            {alerts ? <span className="bp-nav__pip" /> : null}
          </button>
          {userInitial ? (
            <button type="button" className="bp-nav__me" aria-label="Account">
              {userInitial}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
