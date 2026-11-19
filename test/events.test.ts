import test from "node:test"
import assert from "node:assert/strict"
import {
  isDuplicateEvent,
  pruneByTimestamp,
  pruneSessionBaselines,
  shouldSeedFromZero,
  toolCategory,
} from "../src/events.ts"
import { emptyUsage } from "../src/state.ts"

test("tool categories map the expected tools", () => {
  assert.equal(toolCategory("edit"), "builder")
  assert.equal(toolCategory("read"), "scholar")
  assert.equal(toolCategory("bash"), "tinkerer")
  assert.equal(toolCategory("mystery"), null)
})

test("new non-forked sessions count from zero; old or forked sessions do not", () => {
  const installedAt = 100
  assert.equal(shouldSeedFromZero({ time: { created: 101 } }, installedAt), true)
  assert.equal(shouldSeedFromZero({ time: { created: 100 } }, installedAt), false)
  assert.equal(shouldSeedFromZero({ time: { created: 101 }, fork: {} }, installedAt), false)
  assert.equal(shouldSeedFromZero(undefined, installedAt), false)
})

test("pruning keeps the newest entries", () => {
  const record = { a: 1, b: 3, c: 2 }
  assert.deepEqual(pruneByTimestamp(record, 2, (value) => value), { b: 3, c: 2 })
})

test("a previously counted usage event is a duplicate", () => {
  assert.equal(isDuplicateEvent({ countedUsageEvents: { e1: 1 } }, "e1"), true)
  assert.equal(isDuplicateEvent({ countedUsageEvents: {} }, "e1"), false)
})

test("session baselines keep the newest seen sessions", () => {
  const baselines = { a: emptyUsage(), b: emptyUsage(), c: emptyUsage() }
  const seen = { a: 1, b: 3, c: 2 }
  assert.deepEqual(
    Object.keys(pruneSessionBaselines(baselines, seen, 2)).sort(),
    ["b", "c"],
  )
})
