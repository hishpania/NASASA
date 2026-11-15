import { AuthLayout } from '@/components/catalyst/auth-layout'
import { SignInForm } from '@/features/auth'

export function SignInPage() {
  return (
    <AuthLayout>
      <SignInForm />
    </AuthLayout>
  )
}
