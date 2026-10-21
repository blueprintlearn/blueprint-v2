import { signOut } from "@/lib/auth/actions"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button className="text-sm text-mute underline" type="submit">
        Sign out
      </button>
    </form>
  )
}
