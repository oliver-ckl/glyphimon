import test from "node:test"
import assert from "node:assert/strict"
import { FAMILIES, chooseFamily } from "../src/sprites/index.ts"
import { validateSprite } from "../src/sprites/validate.ts"

test("all three families are registered and valid", () => {
  assert.deepEqual(Object.keys(FAMILIES).sort(), ["cinder", "moss", "tide"])
  for (const family of Object.values(FAMILIES)) {
    for (const sprite of [
      family.sprites.egg,
      family.sprites.baby,
      family.sprites.teen,
      ...Object.values(family.finals).map((final) => final.sprite),
    ]) {
      assert.deepEqual(validateSprite(sprite, family.palette), [])
    }
  }
})

test("the next egg avoids repeating the previous family", () => {
  const choices = new Set<string>()
  for (let i = 0; i < 20; i++) {
    choices.add(chooseFamily("cinder", () => i / 20))
  }
  assert.equal(choices.has("cinder"), false)
})
