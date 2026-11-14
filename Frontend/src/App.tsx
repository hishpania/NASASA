import { AuthProvider, useAuth } from '@/features/auth'
import { SignInPage } from '@/pages/SignInPage'
import { FieldsPage } from '@/pages/FieldsPage'

function Screen() {
  const { session } = useAuth()
  return session ? <FieldsPage key={session.user.id} /> : <SignInPage />
}

export function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
