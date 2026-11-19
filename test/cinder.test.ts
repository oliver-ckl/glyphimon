import test from "node:test"
import assert from "node:assert/strict"
import { FAMILY_CINDER } from "../src/sprites/cinder.ts"
import { validateSprite } from "../src/sprites/validate.ts"

test("Cinder has all required forms", () => {
  assert.equal(FAMILY_CINDER.id, "cinder")
  assert.ok(FAMILY_CINDER.sprites.egg)
  assert.ok(FAMILY_CINDER.sprites.baby)
  assert.ok(FAMILY_CINDER.sprites.teen)
  assert.deepEqual(Object.keys(FAMILY_CINDER.finals).sort(), [
    "builder",
    "scholar",
    "tinkerer",
  ])
})

test("every Cinder sprite is 20x20 and uses defined palette keys", () => {
  const sprites = [
    FAMILY_CINDER.sprites.egg,
    FAMILY_CINDER.sprites.baby,
    FAMILY_CINDER.sprites.teen,
    ...Object.values(FAMILY_CINDER.finals).map((final) => final.sprite),
  ]
  for (const sprite of sprites) {
    assert.deepEqual(validateSprite(sprite, FAMILY_CINDER.palette), [])
  }
})
