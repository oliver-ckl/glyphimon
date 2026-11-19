import test from "node:test"
import assert from "node:assert/strict"
import {
  isDuplicateEvent,
  pruneByTimestamp,
  pruneSessionBaselines,
  rememberToolCall,
  resolveToolName,
  shouldHandleCommand,
  shouldSeedFromZero,
  toolCategory,
} from "../src/events.ts"
import { emptyUsage } from "../src/state.ts"

test("tool categories map the expected tools", () => {
  assert.equal(toolCategory("edit"), "builder")
  assert.equal(toolCategory("read"), "scholar")
  assert.equal(toolCategory("bash"), "tinkerer")
  assert.equal(toolCategory("shell"), "tinkerer")
  assert.equal(toolCategory("subagent"), "tinkerer")
  assert.equal(toolCategory("mystery"), null)
})

test("tool call ids resolve to their tool names", () => {
  const registry = new Map<string, string>()
  rememberToolCall(registry, "call_abc", "edit")
  assert.equal(resolveToolName(registry, "call_abc"), "edit")
  assert.equal(toolCategory(resolveToolName(registry, "call_abc")), "builder")
  assert.equal(resolveToolName(registry, "call_missing", "read"), "read")
  assert.equal(resolveToolName(registry, "call_missing"), "")
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

test("commands are handled only for the current session", () => {
  assert.equal(shouldHandleCommand("s1", "s1"), true)
  assert.equal(shouldHandleCommand("s1", ""), true)
  assert.equal(shouldHandleCommand("s1", "s2"), false)
})
