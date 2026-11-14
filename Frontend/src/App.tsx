import { AuthProvider, useAuth } from '@/features/auth'
import { AppLayout } from '@/components/layout/AppLayout'
import { FieldsPage } from '@/pages/FieldsPage'
import { NasaDataPage } from '@/pages/NasaDataPage'
import { SignInPage } from '@/pages/SignInPage'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <FieldsPage /> },
      { path: '/nasa', element: <NasaDataPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
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
