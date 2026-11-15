import { Button } from '@/components/catalyst/button'
import { useAuth } from '@/features/auth'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/16/solid'

export function SignOutButton({ withLabel = false }: { withLabel?: boolean }) {
  const { signOut } = useAuth()

  return (
    <Button plain aria-label={withLabel ? undefined : 'Sign out'} onClick={signOut}>
      <ArrowRightStartOnRectangleIcon data-slot="icon" />
      {withLabel && 'Sign out'}
    </Button>
  )
}
