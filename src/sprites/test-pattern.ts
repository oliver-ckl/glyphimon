import type { Palette, Sprite } from "./types.ts"

export const TEST_PALETTE: Palette = {
  o: "#2a1210",
  a: "#e4572e",
  e: "#fff4e0",
}

export const TEST_SPRITE: Sprite = {
  grid: [
    "..oooo..",
    ".oaaaao.",
    "oaaeeaao",
    "oaaaaaao",
    "oaaooaao",
    ".oaaaao.",
    "..oooo..",
    "........",
  ],
  eyes: [
    [3, 2],
    [4, 2],
  ],
}
