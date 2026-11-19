import type { FamilyId } from "./sprites/types.ts"

const NAMES: Record<FamilyId, string[]> = {
  cinder: ["Pip", "Brim", "Ash", "Sol", "Kindle", "Torch", "Ember", "Cinder"],
  tide: ["Mira", "Rill", "Kelp", "Pearl", "Brine", "Cove", "Wade", "Nori"],
  moss: ["Fern", "Sprout", "Moss", "Bramble", "Clover", "Thorn", "Sage", "Root"],
}

const ROMAN = [
  "",
  "",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
]

export function generateName(
  family: FamilyId,
  existing: string[],
  random: () => number,
): string {
  const pool = NAMES[family]
  const index = Math.min(
    pool.length - 1,
    Math.max(0, Math.floor(random() * pool.length)),
  )
  const base = pool[index]!

  if (!existing.includes(base)) return base

  let suffix = 2
  while (existing.includes(`${base} ${ROMAN[suffix] ?? suffix}`)) suffix += 1
  return `${base} ${ROMAN[suffix] ?? suffix}`
}

export function validateName(name: string): string | null {
  if (name !== name.trim()) return "Name cannot start or end with a space."
  if (name.length === 0 || name.length > 16) {
    return "Name must be 1-16 characters."
  }
  if (!/^[A-Za-z0-9 -]+$/.test(name)) {
    return "Use letters, numbers, spaces, and hyphens only."
  }
  return null
}
