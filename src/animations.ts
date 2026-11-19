import type { Family, Nature, Sprite } from "./sprites/types.ts"
import type {
  EvolutionEvent,
  GlyphimonState,
  Pet,
  PetStage,
  Thresholds,
} from "./state.ts"

export type Activity =
  | "idle"
  | "thinking"
  | "success"
  | "failure"
  | "evolving"
  | { tool: Nature }

export function bob(grid: string[], tick: number): string[] {
  if (grid.length === 0 || tick % 2 === 0) return [...grid]
  const width = grid[0]?.length ?? 0
  return [".".repeat(width), ...grid.slice(0, -1)]
}

export function blink(
  grid: string[],
  eyes: [number, number][] | undefined,
  tick: number,
): string[] {
  if (!eyes?.length || tick % 12 !== 0) return [...grid]
  const next = grid.map((row) => row.split(""))
  for (const [x, y] of eyes) {
    if (next[y]?.[x] !== undefined) next[y]![x] = "b"
  }
  return next.map((row) => row.join(""))
}

export function overlay(
  grid: string[],
  icon: string[],
  x: number,
  y: number,
): string[] {
  const next = grid.map((row) => row.split(""))
  icon.forEach((row, iconY) => {
    row.split("").forEach((key, iconX) => {
      if (key === ".") return
      const targetY = y + iconY
      const targetX = x + iconX
      if (next[targetY]?.[targetX] !== undefined) {
        next[targetY]![targetX] = key
      }
    })
  })
  return next.map((row) => row.join(""))
}

export function flashSprite(grid: string[]): string[] {
  return grid.map((row) => row.replace(/[^.]/g, "f"))
}

export function stageProgress(
  stage: PetStage,
  tokens: number,
  thresholds: Thresholds,
): { current: number; next: number; ratio: number } {
  const current =
    stage === "egg"
      ? 0
      : stage === "baby"
        ? thresholds.hatch
        : stage === "teen"
          ? thresholds.teen
          : thresholds.final
  const next =
    stage === "egg"
      ? thresholds.hatch
      : stage === "baby"
        ? thresholds.teen
        : stage === "teen"
          ? thresholds.final
          : thresholds.final
  const span = next - current
  const ratio =
    stage === "final" || span <= 0
      ? 1
      : Math.max(0, Math.min(1, (tokens - current) / span))
  return { current, next, ratio }
}

export function eggCrackLevel(tokens: number, thresholds: Thresholds): 0 | 1 | 2 | 3 {
  const ratio = thresholds.hatch > 0 ? tokens / thresholds.hatch : 1
  if (ratio >= 0.9) return 3
  if (ratio >= 0.75) return 2
  if (ratio >= 0.5) return 1
  return 0
}

export function spriteForPet(pet: Pet, family: Family): Sprite {
  if (pet.stage === "egg") return family.sprites.egg
  if (pet.stage === "baby") return family.sprites.baby
  if (pet.stage === "teen") return family.sprites.teen
  return family.finals[pet.nature ?? "scholar"].sprite
}

export function formNameForPet(pet: Pet, family: Family): string {
  if (pet.stage === "egg") return "Egg"
  if (pet.stage === "baby") return family.babyName
  if (pet.stage === "teen") return family.teenName
  return family.finals[pet.nature ?? "scholar"].name
}

export function evolutionMessages(
  events: EvolutionEvent[],
  family: Family,
  state: GlyphimonState,
): string[] {
  const name = state.active.name
  return events.map((event) => {
    if (event.to === "baby") {
      return `${name} hatched into ${family.babyName} — ${family.name} family!`
    }
    if (event.to === "teen") return `${name} grew into ${family.teenName}!`
    if (event.to === "final") {
      const final = family.finals[event.nature ?? "scholar"]
      return `${name} evolved into ${final.name} — ${final.title}!`
    }
    return `${name} reached ${event.to}.`
  })
}

export function finalEvent(
  events: EvolutionEvent[],
): EvolutionEvent | undefined {
  return events.find((event) => event.to === "final")
}
