import { Button } from "@/components/blueprint"
import { signOut } from "@/lib/auth/actions"

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="plain">
        Sign out
      </Button>
    </form>
  )
}
