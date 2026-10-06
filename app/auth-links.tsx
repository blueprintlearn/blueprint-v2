import Link from "next/link"

export function AuthLinks() {
  return (
    <p className="flex gap-4">
      <Link className="underline" href="/sign-in">
        Sign in
      </Link>
      <Link className="underline" href="/sign-up">
        Sign up
      </Link>
    </p>
  )
}
