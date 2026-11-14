import { Heading } from '@/components/catalyst/heading'
import { Text } from '@/components/catalyst/text'
import { AppNav } from '@/components/navigation/AppNav'
import { SignOutButton } from '@/components/navigation/SignOutButton'
import { useAuth } from '@/features/auth'
import { DashboardView } from '@/features/dashboard'

export function DashboardPage() {
  const { session } = useAuth()

  return (
    <div className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-950/5 bg-white dark:border-white/5 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <Heading>Dashboard</Heading>
            <Text className="truncate">{session?.user.email}</Text>
          </div>
          <div className="flex items-center gap-2">
            <AppNav />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <DashboardView />
      </main>
    </div>
  )
}
