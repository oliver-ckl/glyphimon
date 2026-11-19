import test from "node:test"
import assert from "node:assert/strict"
import { FAMILY_TIDE } from "../src/sprites/tide.ts"
import { validateSprite } from "../src/sprites/validate.ts"

test("Tide has all required forms", () => {
  assert.equal(FAMILY_TIDE.id, "tide")
  assert.ok(FAMILY_TIDE.sprites.egg)
  assert.ok(FAMILY_TIDE.sprites.baby)
  assert.ok(FAMILY_TIDE.sprites.teen)
  assert.deepEqual(Object.keys(FAMILY_TIDE.finals).sort(), [
    "builder",
    "scholar",
    "tinkerer",
  ])
})

test("every Tide sprite is 20x20 and uses defined palette keys", () => {
  const sprites = [
    FAMILY_TIDE.sprites.egg,
    FAMILY_TIDE.sprites.baby,
    FAMILY_TIDE.sprites.teen,
    ...Object.values(FAMILY_TIDE.finals).map((final) => final.sprite),
  ]
  for (const sprite of sprites) {
    assert.deepEqual(validateSprite(sprite, FAMILY_TIDE.palette), [])
  }
})
