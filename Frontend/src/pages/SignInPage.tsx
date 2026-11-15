import marsSky1280 from '@/assets/auth/mars-sky-1280.webp'
import marsSky2048 from '@/assets/auth/mars-sky-2048.webp'
import { SignInForm } from '@/features/auth'

export function SignInPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 p-4 sm:p-6">
      <img
        src={marsSky2048}
        srcSet={`${marsSky1280} 1280w, ${marsSky2048} 2048w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-[35%_bottom]"
      />
      <div className="w-full max-w-md rounded-2xl bg-white/95 p-6 shadow-2xl ring-1 ring-zinc-950/5 backdrop-blur-md sm:p-10 dark:bg-zinc-900/85 dark:ring-white/10">
        <SignInForm />
      </div>
      <p className="text-center text-xs/5 text-white/50 sm:absolute sm:right-4 sm:bottom-3">
        Earth seen from Mars · NASA/JPL-Caltech/MSSS/TAMU
      </p>
    </main>
  )
}
