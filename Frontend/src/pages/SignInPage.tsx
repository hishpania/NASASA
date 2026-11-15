import issArray1280 from '@/assets/auth/iss-array-1280.webp'
import issArray2048 from '@/assets/auth/iss-array-2048.webp'
import { SignInForm } from '@/features/auth'

export function SignInPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-950 p-4 sm:p-6">
      <img
        src={issArray2048}
        srcSet={`${issArray1280} 1280w, ${issArray2048} 2048w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 size-full object-cover object-[30%_center]"
      />
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-950/5 sm:p-10 dark:bg-zinc-900 dark:ring-white/10">
        <SignInForm />
      </div>
      <p className="text-center text-xs/5 text-white/50 sm:absolute sm:right-4 sm:bottom-3">
        Earth beyond the ISS solar arrays · NASA, Expedition 40
      </p>
    </main>
  )
}
