import { Button } from '@/components/catalyst/button'
import { useAuth } from '@/features/auth'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'

export function SignOutButton() {
  const { signOut } = useAuth()

  return (
    <Button plain aria-label="Sign out" onClick={signOut}>
      <ArrowRightStartOnRectangleIcon data-slot="icon" />
    </Button>
  )
}
