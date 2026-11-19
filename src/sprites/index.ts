import type { Family, FamilyId } from "./types.ts"
import { FAMILY_CINDER } from "./cinder.ts"
import { FAMILY_TIDE } from "./tide.ts"
import { FAMILY_MOSS } from "./moss.ts"

export const FAMILIES: Record<FamilyId, Family> = {
  cinder: FAMILY_CINDER,
  tide: FAMILY_TIDE,
  moss: FAMILY_MOSS,
}

export function chooseFamily(
  previous: FamilyId | undefined,
  random: () => number,
): FamilyId {
  const options = (Object.keys(FAMILIES) as FamilyId[]).filter(
    (id) => id !== previous,
  )
  const index = Math.min(
    options.length - 1,
    Math.max(0, Math.floor(random() * options.length)),
  )
  return options[index]!
}
