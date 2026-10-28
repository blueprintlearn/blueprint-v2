import type { Metadata } from "next"
import type { ReactNode } from "react"

import { bricolage, figtree } from "@/lib/fonts"

import "./globals.css"

export const metadata: Metadata = {
  title: "Blueprint",
  description: "Talent-development operating system for multi-op DJ companies",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}>
      <body className="bp-root min-h-full flex flex-col">{children}</body>
    </html>
  )
}
