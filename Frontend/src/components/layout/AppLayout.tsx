import { Text } from '@/components/catalyst/text'
import { AppNav } from '@/components/navigation/AppNav'
import { SignOutButton } from '@/components/navigation/SignOutButton'
import { useAuth } from '@/features/auth'
import { FieldSwitcher, FieldsProvider } from '@/features/fields'
import { GuideBar, GuideProvider, GuideToggle } from '@/features/guide'
import { Outlet } from 'react-router'

export function AppLayout() {
  const { session } = useAuth()

  return (
    <FieldsProvider>
      <GuideProvider>
        <div className="flex h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
          <header className="shrink-0 border-b border-zinc-950/5 bg-white dark:border-white/5 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="text-base/7 font-semibold text-zinc-950 dark:text-white">Peter67's Farm</span>
                <FieldSwitcher />
                <AppNav />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <GuideToggle />
                <Text className="truncate">{session?.user.email}</Text>
                <SignOutButton />
              </div>
            </div>
          </header>
          <GuideBar />
          <div className="min-h-0 flex-1">
            <Outlet />
          </div>
        </div>
      </GuideProvider>
    </FieldsProvider>
  )
}
