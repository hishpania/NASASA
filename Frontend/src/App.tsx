import { AuthProvider, useAuth } from '@/features/auth'
import { DashboardPage } from '@/pages/DashboardPage'
import { FieldsPage } from '@/pages/FieldsPage'
import { SignInPage } from '@/pages/SignInPage'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'

const router = createBrowserRouter([
  { path: '/', element: <FieldsPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])

function Screen() {
  const { session } = useAuth()
  return session ? <RouterProvider key={session.user.id} router={router} /> : <SignInPage />
}

export function App() {
  return (
    <AuthProvider>
      <Screen />
    </AuthProvider>
  )
}
