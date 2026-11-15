import { useContext } from 'react'
import { GuideContext, type Guide } from '../model/guideContext'

export function useGuide(): Guide {
  const guide = useContext(GuideContext)
  if (!guide) {
    throw new Error('useGuide must be used inside GuideProvider')
  }
  return guide
}
