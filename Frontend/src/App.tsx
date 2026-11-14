import { AuthProvider, useAuth } from '@/features/auth'
import { SignInPage } from '@/pages/SignInPage'
import { TerritorySelectorPage } from '@/pages/TerritorySelectorPage'

function Screen() {
  const { session } = useAuth()
  return session ? <TerritorySelectorPage key={session.user.id} /> : <SignInPage />
}

export function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
