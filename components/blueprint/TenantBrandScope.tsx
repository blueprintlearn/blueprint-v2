import type { ReactNode } from "react"

import { computeTenantTheme, tenantThemeCss, type TenantBrandInput } from "@/lib/brand/tenant-theme"

/**
 * Wraps customer-branded screens (trainee, trainer, applicant). Computes safe overrides from the
 * company's colors on the server and scopes them to this subtree. Owner screens do not use this.
 *
 * Only validated #RRGGBB values reach the <style> tag (see tenantThemeCss), so inlining is safe.
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
  const css = tenantThemeCss(computeTenantTheme(brand))
  return (
    <div data-tenant-brand="" className={className}>
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      {children}
    </div>
  )
}
