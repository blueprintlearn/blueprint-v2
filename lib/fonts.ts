import localFont from "next/font/local"

/**
 * Blueprint's two typefaces, self-hosted (SIL Open Font License; licenses in app/fonts/).
 * Self-hosting keeps builds deterministic: CI and Vercel never depend on reaching Google Fonts.
 * The files are the Latin subsets (covers English and Spanish accents) of the variable fonts.
 */

/** Display face: wordmark, greeting, headings, card titles. Variable weight 200–800 and optical size 12–96. */
export const bricolage = localFont({
  src: "../app/fonts/BricolageGrotesque-Variable-latin.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-bricolage",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
})

/** Body face: everything else. Variable weight 300–900. */
export const figtree = localFont({
  src: "../app/fonts/Figtree-Variable-latin.woff2",
  weight: "300 900",
  style: "normal",
  variable: "--font-figtree",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
})
