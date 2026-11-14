import clsx from 'clsx'
import { NavLink } from 'react-router'

const LINKS = [
  { to: '/', label: 'Fields' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/nasa', label: 'NASA data' },
] as const

export function AppNav() {
  return (
    <nav aria-label="Main" className="flex gap-1 rounded-lg bg-zinc-950/5 p-1 dark:bg-white/5">
      {LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            clsx(
              'flex-1 rounded-md px-3 py-1.5 text-center text-sm/6 font-medium whitespace-nowrap transition',
              isActive
                ? 'bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-950/5 dark:bg-zinc-700 dark:text-white dark:ring-white/10'
                : 'text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white',
            )
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
