"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cx } from "./cx"
import { Icon, type IconName } from "./icons"
import { isCurrentPath } from "./nav-match"

export type TabItem = {
  href: string
  label: string
  icon: IconName
  /** Count of things that need the person (decisions, overdue items), never totals. */
  badge?: number
}

/**
 * Phone navigation: up to five destinations, the same as TopNav, pinned to the bottom.
 * Wrap it in `.bp-mobile-only` (or render it only on phone layouts) so it hides above 760px.
 */
export function BottomTabBar({
  items,
  currentHref,
  label = "Main",
  className,
}: {
  items: TabItem[]
  currentHref?: string
  label?: string
  className?: string
}) {
  const pathname = usePathname()
  return (
    <nav className={cx("bp-tabbar", className)} aria-label={label}>
      <ul className="bp-tabbar__list">
        {items.slice(0, 5).map((it) => {
          const current = currentHref ? currentHref === it.href : isCurrentPath(it.href, pathname)
          return (
            <li key={it.href}>
              <Link href={it.href} className="bp-tabbar__item" aria-current={current ? "page" : undefined}>
                <span className="bp-tabbar__icon">
                  <Icon name={it.icon} size={22} />
                  {it.badge ? (
                    <span className="bp-tabbar__badge" aria-hidden="true">
                      {it.badge > 9 ? "9+" : it.badge}
                    </span>
                  ) : null}
                </span>
                <span className="bp-tabbar__label">{it.label}</span>
                {it.badge ? <span className="bp-sr">{`, ${it.badge} need you`}</span> : null}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
