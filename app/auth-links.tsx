import Link from "next/link"

export function AuthLinks() {
  return (
    <p className="flex flex-wrap gap-4">
      <Link className="text-accent underline" href="/sign-in">
        Sign in
      </Link>
      <Link className="text-accent underline" href="/sign-up">
        Sign up
      </Link>
    </p>
  )
}
