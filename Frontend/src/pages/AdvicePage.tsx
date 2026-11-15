import { Heading } from '@/components/catalyst/heading'
import { AdviceView } from '@/features/advice'

export function AdvicePage() {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Heading>Recommendations</Heading>
        <AdviceView />
      </div>
    </main>
  )
}
