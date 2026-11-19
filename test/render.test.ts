import test from "node:test"
import assert from "node:assert/strict"
import { buildHalfBlockRows } from "../src/sprites/render.ts"

const palette = {
  A: "#111111",
  B: "#222222",
  C: "#333333",
  D: "#444444",
}
const surface = "#000000"

test("pairs two pixel rows into one half-block row", () => {
  assert.deepEqual(buildHalfBlockRows(["AB", "CD"], palette, surface), [
    [
      { text: "▀", fg: "#111111", bg: "#333333" },
      { text: "▀", fg: "#222222", bg: "#444444" },
    ],
  ])
})

test("uses upper and lower half blocks when one pixel is transparent", () => {
  assert.deepEqual(buildHalfBlockRows(["A.", ".B"], palette, surface), [
    [
      { text: "▀", fg: "#111111", bg: "#000000" },
      { text: "▄", fg: "#222222", bg: "#000000" },
    ],
  ])
})

test("groups adjacent cells with identical colors", () => {
  assert.deepEqual(buildHalfBlockRows(["AA", "BB"], palette, surface), [
    [{ text: "▀▀", fg: "#111111", bg: "#222222" }],
  ])
})

test("pads an odd final pixel row", () => {
  assert.deepEqual(buildHalfBlockRows(["A"], palette, surface), [
    [{ text: "▀", fg: "#111111", bg: "#000000" }],
  ])
})
