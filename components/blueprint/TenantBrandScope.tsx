import type { ReactNode } from "react"

import { computeTenantTheme, tenantBrandKey, tenantThemeCss, type TenantBrandInput } from "@/lib/brand/tenant-theme"

/**
 * Wraps customer-branded screens (trainee, trainer, applicant). Computes safe overrides from the
 * company's colors on the server and scopes them to this subtree. Owner screens do not use this.
 *
 * Only validated #RRGGBB values reach the <style> tag (see tenantThemeCss), so inlining is safe.
 * The scope is keyed by the colors, so two scopes with different brands on one page stay separate.
 * Pass colors from the company's tenant-isolated record; never from query strings or user input
 * that has not been validated and saved by an authorized owner.
 */
export function TenantBrandScope({
  brand,
  className,
  children,
}: {
  brand: TenantBrandInput
  className?: string
  children: ReactNode
}) {
  const key = tenantBrandKey(brand)
  const css = tenantThemeCss(computeTenantTheme(brand), `[data-tenant-brand="${key}"]`)
  return (
    <div data-tenant-brand={key} className={className}>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {children}
    </div>
  )
}
