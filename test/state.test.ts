import test from "node:test"
import assert from "node:assert/strict"
import {
  addTokens,
  advanceEvolution,
  createInitialState,
  emptyUsage,
  finalizeRetired,
  freshTokens,
  recordUsage,
  seedSession,
  selectNature,
  usageDelta,
} from "../src/state.ts"
import { DEFAULT_THRESHOLDS, resolveThresholds } from "../src/options.ts"

const NOW = 1_700_000_000_000
const THRESHOLDS = { hatch: 10, teen: 20, final: 30 }

test("fresh tokens exclude cache reads and treat missing fields as zero", () => {
  assert.equal(
    freshTokens({
      input: 2,
      output: 3,
      reasoning: 5,
      cache: { read: 1_000_000, write: 7 },
    }),
    17,
  )
  assert.equal(freshTokens({} as never), 0)
})

test("usage deltas clamp negative and missing values", () => {
  assert.deepEqual(
    usageDelta(
      { input: 5, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
      { input: 2, output: 3, reasoning: 0, cache: { read: 0, write: 0 } },
    ),
    { input: 3, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  )
})

test("the first usage event for an unknown session is a baseline, not growth", () => {
  const state = createInitialState(NOW, "cinder", "Pip", "pet-1")
  const result = recordUsage(state, "s1", emptyUsage(), NOW, THRESHOLDS)
  assert.equal(result.fresh, 0)
  assert.equal(result.state.active.tokens, 0)
})

test("seeding a new session from zero counts its full first event", () => {
  const state = seedSession(createInitialState(NOW, "cinder", "Pip", "pet-1"), "s1")
  const usage = { input: 7, output: 1, reasoning: 0, cache: { read: 999, write: 2 } }
  const result = recordUsage(state, "s1", usage, NOW, THRESHOLDS)
  assert.equal(result.fresh, 10)
  assert.equal(result.state.active.tokens, 10)
})

test("thresholds advance egg to baby to teen to final in order", () => {
  let result = addTokens(createInitialState(NOW, "cinder", "Pip", "pet-1"), 10, NOW, THRESHOLDS)
  assert.equal(result.state.active.stage, "baby")
  result = addTokens(result.state, 10, NOW, THRESHOLDS)
  assert.equal(result.state.active.stage, "teen")
  result = addTokens(result.state, 10, NOW, THRESHOLDS)
  assert.equal(result.state.active.stage, "final")
  assert.equal(result.state.active.nature, "scholar")
})

test("one large jump crosses several stages without duplicating pets", () => {
  const result = addTokens(
    createInitialState(NOW, "cinder", "Pip", "pet-1"),
    100,
    NOW,
    THRESHOLDS,
  )
  assert.deepEqual(
    result.evolved.map((event) => event.to),
    ["baby", "teen", "final"],
  )
  assert.equal(result.state.gallery.length, 0)
})

test("final handover retires exactly once and creates a new egg", () => {
  const final = advanceEvolution(
    addTokens(createInitialState(NOW, "cinder", "Pip", "pet-1"), 30, NOW, THRESHOLDS).state,
    NOW,
    THRESHOLDS,
  ).state
  assert.equal(final.active.stage, "final")
  const handedOver = finalizeRetired(final, NOW + 1, "tide", "Mira", "pet-2")
  assert.equal(handedOver.gallery.length, 1)
  assert.equal(handedOver.gallery[0].retiredAt, NOW + 1)
  assert.equal(handedOver.active.id, "pet-2")
  assert.equal(handedOver.active.stage, "egg")
  assert.equal(handedOver.active.family, "tide")
  assert.equal(handedOver.active.tokens, 0)
  assert.deepEqual(finalizeRetired(handedOver, NOW + 2, "moss", "Fern", "pet-3"), handedOver)
})

test("nature uses the dominant stat and falls back to scholar", () => {
  assert.equal(selectNature({ builder: 2, scholar: 1, tinkerer: 0 }), "builder")
  assert.equal(selectNature({ builder: 0, scholar: 2, tinkerer: 1 }), "scholar")
  assert.equal(selectNature({ builder: 0, scholar: 0, tinkerer: 2 }), "tinkerer")
  assert.equal(selectNature({ builder: 0, scholar: 0, tinkerer: 0 }), "scholar")
})

test("threshold options fall back per field when invalid", () => {
  assert.deepEqual(resolveThresholds({ hatch: 5, teen: -1, final: "x" }), {
    hatch: 5,
    teen: DEFAULT_THRESHOLDS.teen,
    final: DEFAULT_THRESHOLDS.final,
  })
})
