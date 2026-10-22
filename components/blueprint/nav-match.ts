/** Whether a nav destination is the current page: exact for "/", prefix match for everything else. */
export function isCurrentPath(href: string, pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
