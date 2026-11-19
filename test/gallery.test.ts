import test from "node:test"
import assert from "node:assert/strict"
import {
  columnsFor,
  renameActive,
  resetCollection,
  sortRetired,
} from "../src/state.ts"
import { generateName, validateName } from "../src/names.ts"

test("gallery cards sort newest retired first", () => {
  const pets = [
    { id: "a", retiredAt: 1 },
    { id: "b", retiredAt: 3 },
    { id: "c", retiredAt: 2 },
  ] as never
  assert.deepEqual(sortRetired(pets).map((pet) => pet.id), ["b", "c", "a"])
})

test("names are unique and validated", () => {
  const existing = ["Pip", "Pip II"]
  const name = generateName("cinder", existing, () => 0)
  assert.equal(existing.includes(name), false)
  assert.equal(validateName("Pip"), null)
  assert.notEqual(validateName(""), null)
  assert.notEqual(validateName("x".repeat(17)), null)
  assert.notEqual(validateName("bad!"), null)
})

test("renaming updates only the active pet", () => {
  const state = resetCollection(1, "cinder", "Pip", "pet-1")
  const next = renameActive(state, "Ash")
  assert.equal(next.active.name, "Ash")
  assert.equal(state.active.name, "Pip")
})

test("column count adapts to panel width", () => {
  assert.equal(columnsFor(120), 4)
  assert.equal(columnsFor(80), 3)
  assert.equal(columnsFor(50), 2)
})
