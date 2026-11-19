import type { Palette, Sprite } from "./types.ts"

export const SPRITE_SIZE = 20

export function validateSprite(sprite: Sprite, palette: Palette): string[] {
  const errors: string[] = []

  if (sprite.grid.length !== SPRITE_SIZE) {
    errors.push(`expected ${SPRITE_SIZE} rows, got ${sprite.grid.length}`)
  }

  sprite.grid.forEach((row, y) => {
    if (row.length !== SPRITE_SIZE) {
      errors.push(`row ${y} has length ${row.length}, expected ${SPRITE_SIZE}`)
    }

    Array.from(row).forEach((key, x) => {
      if (key !== "." && !(key in palette)) {
        errors.push(`row ${y} col ${x} uses undefined palette key "${key}"`)
      }
    })
  })

  for (const [x, y] of sprite.eyes ?? []) {
    if (x < 0 || x >= SPRITE_SIZE || y < 0 || y >= SPRITE_SIZE) {
      errors.push(`eye (${x}, ${y}) is outside the ${SPRITE_SIZE}x${SPRITE_SIZE} grid`)
    }
  }

  return errors
}
