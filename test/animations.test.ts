import test from "node:test"
import assert from "node:assert/strict"
import {
  bob,
  eggCrackLevel,
  evolutionMessages,
  finalEvent,
  formNameForPet,
  overlay,
  spriteForPet,
  stageProgress,
} from "../src/animations.ts"
import { addTokens, createInitialState } from "../src/state.ts"
import { FAMILY_CINDER } from "../src/sprites/cinder.ts"

test("bob shifts the sprite down by one pixel on odd ticks", () => {
  assert.deepEqual(bob(["A", "B"], 0), ["A", "B"])
  assert.deepEqual(bob(["A", "B"], 1), [".", "A"])
})

test("overlay draws an icon and ignores transparent icon pixels", () => {
  assert.deepEqual(overlay(["..."], [".X."], 0, 0), [".X."])
})

test("stage progress clamps between stages", () => {
  assert.deepEqual(stageProgress("egg", 10, { hatch: 10, teen: 20, final: 30 }), {
    current: 0,
    next: 10,
    ratio: 1,
  })
  assert.equal(stageProgress("teen", 25, { hatch: 10, teen: 20, final: 30 }).ratio, 0.5)
})

test("egg cracks appear progressively near hatching", () => {
  const thresholds = { hatch: 100, teen: 200, final: 300 }
  assert.equal(eggCrackLevel(0, thresholds), 0)
  assert.equal(eggCrackLevel(50, thresholds), 1)
  assert.equal(eggCrackLevel(75, thresholds), 2)
  assert.equal(eggCrackLevel(90, thresholds), 3)
})

test("form names and sprites follow the stage and nature", () => {
  const egg = createInitialState(0, "cinder", "Pip", "p")
  assert.equal(formNameForPet(egg.active, FAMILY_CINDER), "Egg")
  assert.equal(spriteForPet(egg.active, FAMILY_CINDER), FAMILY_CINDER.sprites.egg)

  const final = addTokens(egg, 30, 0, { hatch: 10, teen: 20, final: 30 }).state
  assert.equal(
    formNameForPet(final.active, FAMILY_CINDER),
    FAMILY_CINDER.finals.scholar.name,
  )
  assert.equal(
    spriteForPet(final.active, FAMILY_CINDER),
    FAMILY_CINDER.finals.scholar.sprite,
  )
})

const EVOLUTION_NOW = 1_700_000_000_000
const evolutionState = createInitialState(EVOLUTION_NOW, "cinder", "Pip", "p")

test("evolution messages name each new stage and the final nature", () => {
  const messages = evolutionMessages(
    [
      { petID: "p", from: "egg", to: "baby" },
      { petID: "p", from: "teen", to: "final", nature: "builder" },
    ],
    FAMILY_CINDER,
    evolutionState,
  )
  assert.ok(messages[0].includes("hatched"))
  assert.ok(messages[1].includes("Forgeclaw"))
})

test("finalEvent finds the final transition", () => {
  assert.equal(
    finalEvent([
      { petID: "p", from: "egg", to: "baby" },
      { petID: "p", from: "teen", to: "final", nature: "builder" },
    ])?.to,
    "final",
  )
})
