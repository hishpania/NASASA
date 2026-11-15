import clsx from 'clsx'
import type { ComponentType, SVGProps } from 'react'
import Beans from '~icons/fluent-emoji-flat/beans'
import Blossom from '~icons/fluent-emoji-flat/blossom'
import BrownSquare from '~icons/fluent-emoji-flat/brown-square'
import CookedRice from '~icons/fluent-emoji-flat/cooked-rice'
import DeciduousTree from '~icons/fluent-emoji-flat/deciduous-tree'
import EarOfCorn from '~icons/fluent-emoji-flat/ear-of-corn'
import GingerRoot from '~icons/fluent-emoji-flat/ginger-root'
import PeaPod from '~icons/fluent-emoji-flat/pea-pod'
import Peanuts from '~icons/fluent-emoji-flat/peanuts'
import Potato from '~icons/fluent-emoji-flat/potato'
import Seedling from '~icons/fluent-emoji-flat/seedling'
import Shamrock from '~icons/fluent-emoji-flat/shamrock'
import SheafOfRice from '~icons/fluent-emoji-flat/sheaf-of-rice'
import Sunflower from '~icons/fluent-emoji-flat/sunflower'
import Yarn from '~icons/fluent-emoji-flat/yarn'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Picture for each land use id of the crop advisor; unknown ids fall back to a seedling. */
const LAND_USE_ICONS: Record<string, Icon> = {
  corn: EarOfCorn,
  soybeans: Beans,
  dry_beans: Beans,
  peas: PeaPod,
  peanuts: Peanuts,
  winter_wheat: SheafOfRice,
  spring_wheat: SheafOfRice,
  barley: SheafOfRice,
  oats: SheafOfRice,
  sorghum: SheafOfRice,
  rice: CookedRice,
  cotton: Yarn,
  sunflower: Sunflower,
  canola: Blossom,
  sugar_beets: GingerRoot,
  potatoes: Potato,
  alfalfa: Shamrock,
  fallow: BrownSquare,
  non_crop: DeciduousTree,
  other_crop: Seedling,
}

type CropIconProps = {
  landUseId: string
  className?: string
}

export function CropIcon({ landUseId, className }: CropIconProps) {
  const Icon = LAND_USE_ICONS[landUseId] ?? Seedling
  return <Icon className={clsx('shrink-0', className)} aria-hidden="true" />
}
