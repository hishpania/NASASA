import { Heading } from '@/components/catalyst/heading'
import { ClimateView } from '@/features/climate'

export function NasaDataPage() {
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Heading>NASA data</Heading>
        <ClimateView />
      </div>
    </main>
  )
}
