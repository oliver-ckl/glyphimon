# Glyphimon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global OpenCode TUI plugin that raises an original pixel-art creature from lifetime fresh-token usage, evolves it through a hidden branching final form, and shows retired pets in a gallery.

**Architecture:** A TUI-only plugin (with a no-op server entrypoint) living in the global OpenCode config. Pure TypeScript modules own token accounting and evolution; Solid/OpenTUI components render 20×20 pixel sprites as half-block terminal pixels. Durable TUI storage keeps the active pet, gallery, and session baselines. Server events drive live XP and activity reactions.

**Tech Stack:** TypeScript, SolidJS, OpenTUI, `@opencode/plugin/tui`, Node test runner through `tsx`, pnpm.

**Spec:** `docs/design.md` (relative to this plugin repo).

## Global Constraints

- All creatures, names, sprites, and palettes are original. Do not copy Pokémon or Digimon designs or names.
- Fresh tokens are `input + output + reasoning + cache.write`. Never include `cache.read`.
- Default thresholds: hatch `200_000`, teen `4_000_000`, final `10_000_000` fresh tokens.
- Start at zero on install. Tokens from before installation must never grow the first pet.
- One active pet. A final form is revealed, then immediately retires to the gallery and a new egg appears.
- Durable state lives in OpenCode plugin storage. No network calls, services, or credentials.
- Do not modify the Rails repository. The plugin lives at `~/.config/opencode/plugins/glyphimon/`.
- Missing token fields, unknown tools, missing session metadata, a fork, and a hidden sidebar must never throw.

## Review Focus

- Existing history must not grow a new pet: a first usage event for an old session is baselined, not counted.
- Cache reads must not inflate XP: a usage object with a huge `cache.read` and zero other fields yields fresh tokens equal to zero.
- Forked sessions must not double-count copied usage: a fork is baselined at its first event.
- A single large usage jump must not duplicate pets or skip the gallery: crossing every threshold ends as one final pet with one gallery entry after handover.
- Event replay or two TUIs must not double-count tool stats or usage: tool events dedupe by event ID, and repeated cumulative usage produces zero delta.
- Providers may omit `reasoning` or `cache`; missing fields are zero, never `NaN`.
- Unknown tool names are ignored; a hidden sidebar or missing session record must not crash setup or event handlers.

---

### Task 1: Scaffold the plugin and prove half-block pixel rendering

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `src/tui.tsx`
- Create: `src/sprites/types.ts`
- Create: `src/sprites/render.ts`
- Create: `src/components/sprite.tsx`
- Create: `src/sprites/test-pattern.ts`
- Create: `test/render.test.ts`

**Interfaces:**
- Produces: `buildHalfBlockRows(grid: string[], palette: Record<string, string>, surface: string): HalfBlockRun[][]`
- Produces: `HalfBlockRun = { text: string; fg: string; bg: string }`
- Produces: `Sprite = { grid: string[]; eyes?: [number, number][] }`, `Palette = Record<string, string>`
- Produces: `FamilyId = "cinder" | "tide" | "moss"`, `Nature = "builder" | "scholar" | "tinkerer"`
- Produces: `SpriteView` Solid component taking `{ sprite: Sprite; palette: Palette; surface: string }`

- [ ] **Step 1: Initialize the plugin repo and package**

Run:

```bash
mkdir -p ~/.config/opencode/plugins/glyphimon
cd ~/.config/opencode/plugins/glyphimon
git init
```

Create `package.json`:

```json
{
  "name": "opencode-glyphimon",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@11.7.0",
  "exports": {
    ".": "./src/index.ts",
    "./tui": "./src/tui.tsx"
  },
  "scripts": {
    "test": "tsx --test test/*.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@opencode/plugin": "^2.3.2"
  },
  "peerDependencies": {
    "@opentui/core": ">=0.9.2",
    "@opentui/solid": ">=0.9.2",
    "solid-js": ">=1.9.0"
  },
  "devDependencies": {
    "@opentui/core": "^0.9.2",
    "@opentui/solid": "^0.9.2",
    "@types/node": "^24.0.0",
    "solid-js": "^1.9.0",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0"
  }
}
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "jsxImportSource": "@opentui/solid",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "types": ["node"]
  },
  "include": ["src", "test"]
}
```

Create `.gitignore`:

```text
node_modules
*.log
```

Run:

```bash
pnpm install
```

- [ ] **Step 2: Write the failing half-block renderer test**

Create `test/render.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/sprites/render.ts` does not exist.

- [ ] **Step 4: Implement the sprite types and renderer**

Create `src/sprites/types.ts`:

```ts
export type Palette = Record<string, string>

export type Sprite = {
  grid: string[]
  eyes?: [number, number][]
}

export type Nature = "builder" | "scholar" | "tinkerer"

export type FamilyId = "cinder" | "tide" | "moss"
```

Create `src/sprites/render.ts`:

```ts
export type HalfBlockRun = { text: string; fg: string; bg: string }

export function buildHalfBlockRows(
  grid: string[],
  palette: Record<string, string>,
  surface: string,
): HalfBlockRun[][] {
  // For each pair of pixel rows, choose ▀, ▄, or a space.
  // Group adjacent cells with identical fg/bg into one run.
}
```

Implementation rules:
- `.` or a missing palette key means transparent.
- Both pixels colored: `▀` with `fg = top`, `bg = bottom`.
- Only top colored: `▀` with `fg = top`, `bg = surface`.
- Only bottom colored: `▄` with `fg = bottom`, `bg = surface`.
- Neither: `" "` with `fg = surface`, `bg = surface`.
- Missing bottom row is treated as all transparent.
- Group consecutive cells with the same `fg` and `bg`; concatenate their characters into one `text`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, 4 tests.

- [ ] **Step 6: Add the Solid sprite view, server stub, and TUI smoke entrypoint**

Create `src/components/sprite.tsx`:

```tsx
import { For, type Component } from "solid-js"
import { buildHalfBlockRows } from "../sprites/render.ts"
import type { Palette, Sprite } from "../sprites/types.ts"

export const SpriteView: Component<{
  sprite: Sprite
  palette: Palette
  surface: string
}> = (props) => {
  const rows = () => buildHalfBlockRows(props.sprite.grid, props.palette, props.surface)
  return (
    <box flexDirection="column">
      <For each={rows()}>
        {(row) => (
          <text>
            <For each={row}>
              {(run) => <span style={{ fg: run.fg, bg: run.bg }}>{run.text}</span>}
            </For>
          </text>
        )}
      </For>
    </box>
  )
}
```

Create `src/sprites/test-pattern.ts` with a small 8×8 checkerboard or smiley using keys `o`, `a`, `e` and a palette. Keep it clearly temporary; Task 3 replaces the sidebar demo with Cinder art.

Create `src/index.ts`:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "glyphimon",
  setup() {},
})
```

Create `src/tui.tsx`:

```tsx
import { Plugin } from "@opencode/plugin/tui"
import { SpriteView } from "./components/sprite.tsx"
import { TEST_PALETTE, TEST_SPRITE } from "./sprites/test-pattern.ts"

export default Plugin.define({
  id: "glyphimon.tui",
  setup(context) {
    context.ui.toast.show({
      title: "Glyphimon",
      message: "Plugin loaded",
      variant: "success",
    })
    return context.ui.slot({
      append: "sidebar.content",
      render: () => (
        <SpriteView sprite={TEST_SPRITE} palette={TEST_PALETTE} surface="#0b0f14" />
      ),
    })
  },
})
```

- [ ] **Step 7: Typecheck and run the suite**

Run:

```bash
pnpm typecheck
pnpm test
```

Expected: both pass.

- [ ] **Step 8: Manual smoke check**

Run `opencode --standalone` (or reload an open TUI with `/reload`).
Expected: a “Glyphimon / Plugin loaded” toast and a small colored test sprite in the session sidebar. If the sprite does not appear, adjust the slot placement or the span styling before continuing.

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "feat: scaffold Glyphimon TUI plugin with half-block sprite renderer"
```

---

### Task 2: Token accounting and evolution state

**Files:**
- Create: `src/state.ts`
- Create: `src/options.ts`
- Create: `test/state.test.ts`

**Interfaces:**
- Consumes: `FamilyId`, `Nature` from `src/sprites/types.ts`
- Produces: `TokenUsage`, `PetStage`, `Pet`, `GlyphimonState`, `EvolutionEvent`, `Thresholds`
- Produces: `freshTokens(usage: TokenUsage): number`
- Produces: `emptyUsage(): TokenUsage`
- Produces: `usageDelta(current: TokenUsage, previous: TokenUsage): TokenUsage`
- Produces: `createInitialState(now: number, family: FamilyId, name: string, id: string): GlyphimonState`
- Produces: `recordUsage(state, sessionID, usage, now, thresholds): { state: GlyphimonState; fresh: number; evolved: EvolutionEvent[] }`
- Produces: `seedSession(state, sessionID, usage?): GlyphimonState`
- Produces: `advanceEvolution(state, now, thresholds): { state: GlyphimonState; evolved: EvolutionEvent[] }`
- Produces: `finalizeRetired(state, now, nextFamily, nextName, nextID): GlyphimonState`
- Produces: `selectNature(stats: Record<Nature, number>): Nature`
- Produces: `addTokens(state, amount, now, thresholds): { state: GlyphimonState; evolved: EvolutionEvent[] }`
- Produces: `replaceState(draft: GlyphimonState, next: GlyphimonState): void`
- Produces: `DEFAULT_THRESHOLDS: Thresholds`
- Produces: `resolveThresholds(input: unknown): Thresholds`

`GlyphimonState` includes `countedUsageEvents: Record<string, number>` alongside `countedToolCalls`.

- [ ] **Step 1: Write the failing state tests**

Create `test/state.test.ts` with these tests:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/state.ts` does not exist.

- [ ] **Step 3: Implement the state module and default options**

Create `src/options.ts`:

```ts
import type { Thresholds } from "./state.ts"

export const DEFAULT_THRESHOLDS: Thresholds = {
  hatch: 200_000,
  teen: 4_000_000,
  final: 10_000_000,
}

export function resolveThresholds(input: unknown): Thresholds {
  // Accept an object with optional hatch/teen/final numbers.
  // Keep each valid positive finite value; otherwise use the default.
}
```

Create `src/state.ts` with the types and functions from the Interfaces block.

Rules:
- `freshTokens` sums `input + output + reasoning + cache.write`, using `0` for missing numbers.
- `usageDelta` subtracts each field and clamps to `>= 0`.
- `createInitialState` starts with an egg, empty gallery, empty session baselines, empty `sessionSeenAt`, empty `countedUsageEvents`, empty `countedToolCalls`, and zero lifetime tokens.
- `recordUsage`:
  - If the session has no baseline, store the current usage as the baseline and return `fresh = 0`.
  - Otherwise, compute the delta from the stored baseline, store the new baseline, add the fresh count to `active.tokens` and `totalFreshTokens`, then call `advanceEvolution`.
- `seedSession` sets a zero baseline only when the session has none.
- `advanceEvolution`:
  - `egg` → `baby` at `hatch`.
  - `baby` → `teen` at `teen`.
  - `teen` → `final` at `final`, setting `nature = selectNature(active.stats)`.
  - Each transition sets `stageAt = now` and returns an `EvolutionEvent` with `petID`, `from`, `to`, and `nature` for the final event.
  - It must handle several transitions in one call.
- `finalizeRetired` only acts when `active.stage === "final"`; it appends a copy with `retiredAt` to `gallery` and replaces `active` with a fresh egg. It is idempotent.
- `selectNature` uses Builder → Scholar → Tinkerer as the tie order; all-zero stats return `"scholar"`.
- `replaceState(draft, next)` assigns every top-level field of `next` onto `draft` so a Solid store update reflects the new state.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, all state tests.

- [ ] **Step 5: Typecheck and commit**

Run:

```bash
pnpm typecheck
git add src/state.ts src/options.ts test/state.test.ts
git commit -m "feat: add fresh-token accounting and pet evolution state"
```

---

### Task 3: Cinder family sprites

**Files:**
- Modify: `src/sprites/types.ts`
- Create: `src/sprites/validate.ts`
- Create: `src/sprites/cinder.ts`
- Create: `test/cinder.test.ts`

**Interfaces:**
- Produces: `Family = { id: FamilyId; name: string; blurb: string; babyName: string; teenName: string; sprites: { egg: Sprite; baby: Sprite; teen: Sprite }; finals: Record<Nature, { name: string; title: string; sprite: Sprite }>; palette: Palette }`
- Produces: `validateSprite(sprite: Sprite, palette: Palette): string[]`
- Produces: `FAMILY_CINDER: Family`

- [ ] **Step 1: Write the failing family validation test**

Create `test/cinder.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/sprites/cinder.ts` does not exist.

- [ ] **Step 3: Extend types and implement the validator**

Add to `src/sprites/types.ts`:

```ts
export type Family = {
  id: FamilyId
  name: string
  blurb: string
  babyName: string
  teenName: string
  sprites: { egg: Sprite; baby: Sprite; teen: Sprite }
  finals: Record<Nature, { name: string; title: string; sprite: Sprite }>
  palette: Palette
}
```

Create `src/sprites/validate.ts`:

```ts
import type { Palette, Sprite } from "./types.ts"

export function validateSprite(sprite: Sprite, palette: Palette): string[] {
  // Return human-readable errors for:
  // - grid length not 20
  // - any row length not 20
  // - any non-"." key missing from the palette
  // - any eye coordinate outside the grid
}
```

- [ ] **Step 4: Create the Cinder family**

Create `src/sprites/cinder.ts` with 20×20 grids for:

- Egg: warm speckled egg.
- Baby “Emberling”: round ember creature with a flame tuft.
- Teen “Cinderling”: upright teenager with a tail flame.
- Builder final “Forgeclaw”: bulky, anvil-like fists, furnace chest.
- Scholar final “Ashwing”: owl-like, ember feathers, floating book motif.
- Tinkerer final “Sparkscrew”: mechanical, gear tail, wrench horn.

Use the shared palette keys: `.` transparent, `o` outline, `a` base, `b` shade, `c` highlight, `d` accent, `e` eye, `f` white. Mark eye pixels in `eyes`.

Palette suggestion: outline `#2a1210`, base `#e4572e`, shade `#a8321c`, highlight `#f6a35c`, accent `#ffd166`, eye `#1b1b1b`, white `#fff4e0`.

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/sprites/types.ts src/sprites/validate.ts src/sprites/cinder.ts test/cinder.test.ts
git commit -m "feat: add Cinder creature family sprites"
```

---

### Task 4: Tide family sprites

**Files:**
- Create: `src/sprites/tide.ts`
- Create: `test/tide.test.ts`

**Interfaces:**
- Produces: `FAMILY_TIDE: Family`
- Consumes: `validateSprite` from Task 3

- [ ] **Step 1: Write the failing Tide validation test**

Create `test/tide.test.ts` with the same structure as `test/cinder.test.ts`, importing `FAMILY_TIDE` and asserting its id is `"tide"`, all three final natures exist, and every sprite validates.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/sprites/tide.ts` does not exist.

- [ ] **Step 3: Create the Tide family**

Create `src/sprites/tide.ts` with 20×20 grids for:

- Egg: pearlescent egg with wave marks.
- Baby “Dewdrop”: droplet creature with tiny fins.
- Teen “Ripplefin”: otter-like swimmer with a fin crest.
- Builder final “Reefguard”: coral-armored crab with heavy claws.
- Scholar final “Tide Oracle”: jellyfish sage with a floating pearl.
- Tinkerer final “Bubbletink”: otter engineer with diving gear.

Palette suggestion: outline `#0c2233`, base `#3aa6b9`, shade `#1f6f8b`, highlight `#9be7e0`, accent `#ffd6a5`, eye `#102a33`, white `#f4ffff`.

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sprites/tide.ts test/tide.test.ts
git commit -m "feat: add Tide creature family sprites"
```

---

### Task 5: Moss family sprites and family registry

**Files:**
- Create: `src/sprites/moss.ts`
- Create: `src/sprites/index.ts`
- Create: `test/families.test.ts`

**Interfaces:**
- Produces: `FAMILY_MOSS: Family`
- Produces: `FAMILIES: Record<FamilyId, Family>`
- Produces: `chooseFamily(previous: FamilyId | undefined, random: () => number): FamilyId`

- [ ] **Step 1: Write the failing family registry test**

Create `test/families.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/sprites/index.ts` does not exist.

- [ ] **Step 3: Create the Moss family and registry**

Create `src/sprites/moss.ts` with 20×20 grids for:

- Egg: seed pod with a leaf sprout.
- Baby “Sproutle”: round seedling creature.
- Teen “Thornpup”: fox-like forest teenager with leaf tail.
- Builder final “Timberox”: wooden ox with branch horns.
- Scholar final “Glimmerfern”: moth with fern wings and a glowing spore.
- Tinkerer final “Rootrig”: mechanical planter with vine gears.

Palette suggestion: outline `#1d2a1a`, base `#6a994e`, shade `#386641`, highlight `#a7c957`, accent `#f2e8cf`, eye `#14210f`, white `#f8fff0`.

Create `src/sprites/index.ts`:

```ts
import type { Family, FamilyId } from "./types.ts"
import { FAMILY_CINDER } from "./cinder.ts"
import { FAMILY_TIDE } from "./tide.ts"
import { FAMILY_MOSS } from "./moss.ts"

export const FAMILIES: Record<FamilyId, Family> = {
  cinder: FAMILY_CINDER,
  tide: FAMILY_TIDE,
  moss: FAMILY_MOSS,
}

export function chooseFamily(
  previous: FamilyId | undefined,
  random: () => number,
): FamilyId {
  // Pick from the families other than previous, using random() in [0, 1).
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sprites/moss.ts src/sprites/index.ts test/families.test.ts
git commit -m "feat: add Moss family and sprite registry"
```

---

### Task 6: Animated corner pet panel

**Files:**
- Create: `src/animations.ts`
- Create: `src/components/pet-panel.tsx`
- Create: `src/components/xp-bar.tsx`
- Create: `test/animations.test.ts`
- Modify: `src/tui.tsx`

**Interfaces:**
- Produces: `Activity = "idle" | "thinking" | "success" | "failure" | "evolving" | { tool: Nature }`
- Produces: `bob(grid: string[], tick: number): string[]`
- Produces: `blink(grid: string[], eyes: [number, number][] | undefined, tick: number): string[]`
- Produces: `overlay(grid: string[], icon: string[], x: number, y: number): string[]`
- Produces: `stageProgress(stage: PetStage, tokens: number, thresholds: Thresholds): { current: number; next: number; ratio: number }`
- Produces: `eggCrackLevel(tokens: number, thresholds: Thresholds): 0 | 1 | 2 | 3`
- Produces: `spriteForPet(pet: Pet, family: Family): Sprite`
- Produces: `formNameForPet(pet: Pet, family: Family): string`
- Produces: `PetPanel` Solid component taking `{ state: GlyphimonState; activity: Activity; thresholds: Thresholds }`

- [ ] **Step 1: Write the failing animation tests**

Create `test/animations.test.ts` with tests:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import {
  bob,
  eggCrackLevel,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/animations.ts` does not exist.

- [ ] **Step 3: Implement the animation helpers**

Rules:
- `bob` returns a new grid shifted down by one row on odd ticks, with a transparent top row.
- `blink` replaces the marked eye pixels with `"b"` on every 12th tick, otherwise returns the grid unchanged.
- `overlay` copies the grid, then writes every non-`.` icon pixel at `(x + iconX, y + iconY)`, ignoring out-of-bounds and transparent pixels.
- `stageProgress` returns the token count at the start of the stage, the next threshold, and a clamped ratio. For `final`, current is the final threshold and next equals current, ratio `1`.
- `eggCrackLevel` returns 0 below 50%, 1 at 50%, 2 at 75%, 3 at 90% of the hatch threshold.
- `spriteForPet` returns the egg, baby, teen, or nature-specific final sprite from the family.
- `formNameForPet` returns `"Egg"`, the family’s baby name, teen name, or final name.

- [ ] **Step 4: Build the XP bar and pet panel**

Create `src/components/xp-bar.tsx`:

```tsx
export const XpBar: Component<{
  ratio: number
  width: number
  label: string
}> = (props) => {
  // Render a █/░ bar with the label beneath or beside it.
}
```

Create `src/components/pet-panel.tsx`:

- Use `usePlugin()` for theme tokens.
- Render a bordered card with title `name` (or “Egg”) and stage label.
- Render the 20×20 sprite through `SpriteView`.
- Apply `blink`, `bob`, and activity overlays:
  - `thinking`: draw a small `...` above the head.
  - `{ tool: "builder" }`: pencil icon.
  - `{ tool: "scholar" }`: book icon.
  - `{ tool: "tinkerer" }`: wrench icon.
  - `success`: sparkle icon and one upward bob frame.
  - `failure`: sweat drop.
  - `evolving`: alternate the sprite with a white flash frame.
- Render the XP bar with the fresh-token label.
- Use a `setInterval` at 250ms to advance a local `tick` signal; clear it on cleanup.
- Hide family and nature until the stage is past egg; show “Egg” for the egg.

Modify `src/tui.tsx` to render a demo `PetPanel` in `sidebar.content` using `createInitialState` and a mock activity loop. This is temporary; Task 7 wires real state and events. Delete `src/sprites/test-pattern.ts` once `PetPanel` replaces the smoke-test sprite.

- [ ] **Step 5: Run tests, typecheck, and manually inspect the animation**

Run:

```bash
pnpm test
pnpm typecheck
opencode --standalone
```

Expected: a 20×20 creature in the sidebar that bobs and blinks; no layout overflow in a normal terminal.

- [ ] **Step 6: Commit**

```bash
git add src/animations.ts src/components/pet-panel.tsx src/components/xp-bar.tsx test/animations.test.ts src/tui.tsx
git commit -m "feat: add animated sidebar pet panel"
```

---

### Task 7: Live token and tool event wiring

**Files:**
- Create: `src/events.ts`
- Create: `test/events.test.ts`
- Modify: `src/tui.tsx`

**Interfaces:**
- Produces: `toolCategory(tool: string): Nature | null`
- Produces: `shouldSeedFromZero(info: { time: { created: number }; fork?: unknown } | undefined, installedAt: number): boolean`
- Produces: `pruneByTimestamp<T>(record: Record<string, T>, max: number, timestamp: (value: T) => number): Record<string, T>`
- Produces: `isDuplicateEvent(state: Pick<GlyphimonState, "countedUsageEvents">, eventID: string): boolean`
- Consumes: state functions from Task 2, family registry from Task 5, panel from Task 6

- [ ] **Step 1: Write the failing event-helper tests**

Create `test/events.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import {
  isDuplicateEvent,
  pruneByTimestamp,
  shouldSeedFromZero,
  toolCategory,
} from "../src/events.ts"

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/events.ts` does not exist.

- [ ] **Step 3: Implement the event helpers**

Mapping:
- Builder: `edit`, `write`, `patch`, `multiedit`, `apply_patch`.
- Scholar: `read`, `grep`, `glob`, `list`, `webfetch`, `websearch`, `skill`, `context7`.
- Tinkerer: `bash`, `task`, `todowrite`, `background`, `pty`, `shell`.
- Everything else returns `null`.

`shouldSeedFromZero` returns true only when a session exists, was created after `installedAt`, and has no `fork` field.

`isDuplicateEvent` returns true when the event ID already exists in the state’s counted-usage ledger.

`pruneByTimestamp` sorts entries by timestamp descending, keeps `max`, and returns a new record.

- [ ] **Step 4: Wire the plugin setup**

In `src/tui.tsx`:

- Load or create durable state with `context.storage.store("state", { initial })`.
  - Initial family: `chooseFamily(undefined, Math.random)`.
  - Initial id: `crypto.randomUUID()`.
  - Initial name: generate a name in Task 8; for now use `"Pip"` as a temporary name.
  - If an existing stored state has a version other than `1`, replace it with a fresh egg and toast that the pet was reset.
  - Resolve thresholds with `resolveThresholds(context.options?.thresholds)`.
- Create a memory activity store:
  ```ts
  const [activity, updateActivity] = context.storage.memory("activity", {
    initial: "idle" as Activity,
  })
  ```
- Serialize state updates through a promise chain so concurrent events do not lose deltas.
- Subscribe to `session.usage.updated`:
  - Inside the serialized update, skip the event when `isDuplicateEvent(state, event.id)` is true.
  - Normalize `event.data.tokens`.
  - If the session has no baseline, call `context.data.session.get(sessionID)`.
  - Seed from zero when `shouldSeedFromZero(info, state.installedAt)`.
  - Call `recordUsage`, assign the new state, record `countedUsageEvents[event.id] = Date.now()`, and process evolution events.
  - Prune `sessionBaselines` and `sessionSeenAt` to 1000 entries, and `countedUsageEvents` to 2000 entries.
- Subscribe to `session.tool.success`:
  - Skip if `event.id` is already in `countedToolCalls`.
  - Map `event.data.id` through `toolCategory`; ignore unknown tools.
  - Increment the active pet’s stat and record the event ID.
  - Prune `countedToolCalls` to 2000 entries.
- Subscribe to `session.execution.started`, `session.execution.succeeded`, `session.execution.failed`, `session.execution.interrupted`, and `session.tool.called` to set transient activity:
  - started → `thinking`
  - tool called → `{ tool: category }` when known
  - succeeded → `success` for 1.5s
  - failed/interrupted → `failure` for 2s
  - Then reset to `idle`.
- Register the real `PetPanel` in `sidebar.content` using the durable state and activity store.
- Return a cleanup function that unsubscribes every listener and clears every timer.

Evolution events are handled more fully in Task 9; for now show a toast with the new stage.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Manual live check**

Run `opencode --standalone` and send a prompt that causes tool calls.
Expected:
- The egg/pet’s XP grows while the agent works.
- A hidden (pre-install) session does not immediately evolve the pet.
- Restarting OpenCode preserves the XP.
- Unknown tools do not throw.

- [ ] **Step 7: Commit**

```bash
git add src/events.ts test/events.test.ts src/tui.tsx
git commit -m "feat: wire live token usage and tool events into the pet"
```

---

### Task 8: Gallery, names, and commands

**Files:**
- Create: `src/names.ts`
- Create: `src/components/gallery.tsx`
- Create: `test/gallery.test.ts`
- Modify: `src/state.ts`
- Modify: `src/tui.tsx`

**Interfaces:**
- Produces: `generateName(family: FamilyId, existing: string[], random: () => number): string`
- Produces: `validateName(name: string): string | null`
- Produces: `sortRetired(pets: Pet[]): Pet[]`
- Produces: `columnsFor(width: number): number`
- Produces: `renameActive(state: GlyphimonState, name: string): GlyphimonState`
- Produces: `resetCollection(now: number, family: FamilyId, name: string, id: string): GlyphimonState`
- Consumes: `FAMILIES` from Task 5

- [ ] **Step 1: Write the failing gallery and name tests**

Create `test/gallery.test.ts`:

```ts
import test from "node:test"
import assert from "node:assert/strict"
import { columnsFor, renameActive, resetCollection, sortRetired, validateName } from "../src/state.ts"
import { generateName } from "../src/names.ts"

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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `src/names.ts` and the new state helpers do not exist.

- [ ] **Step 3: Implement names, gallery helpers, and reset**

Create `src/names.ts` with three original name pools:

- Cinder: Pip, Brim, Ash, Sol, Kindle, Torch, Ember, Cinder.
- Tide: Mira, Rill, Kelp, Pearl, Brine, Cove, Wade, Nori.
- Moss: Fern, Sprout, Moss, Bramble, Clover, Thorn, Sage, Root.

`generateName` picks from the family pool using `random`, then appends `" II"`, `" III"`, etc. until unique.

`validateName` accepts 1–16 characters of letters, numbers, spaces, and hyphens; returns an error string or `null`.

Add to `src/state.ts`:

- `sortRetired(pets)` sorts by `retiredAt` descending.
- `columnsFor(width)` returns 4 for `>= 100`, 3 for `>= 70`, otherwise 2.
- `renameActive` returns a copy with the active pet renamed.
- `resetCollection` returns a fresh state with a new egg, empty gallery, and `installedAt = now`.

- [ ] **Step 4: Build the gallery component**

Create `src/components/gallery.tsx`:

- Accept `{ panel, state }`.
- Use `usePlugin()` for theme and dialogs.
- Header: “GLYPHIMON GALLERY”.
- Left/top section: active pet large, animated with the same sprite/panel helpers.
- Right/bottom section: `scrollbox` with retired cards from `sortRetired`.
- Each card: sprite (static), name, family, final form name, nature, fresh-token total, retired date.
- Use `columnsFor(panel.width)` to set the grid width; use flex wrap.
- Add a footer hint: `/pet rename <name>` and `/pet reset`.
- Close with `escape` via `context.keymap.layer` or the panel’s close action.

- [ ] **Step 5: Register the panel and commands**

In `src/tui.tsx`:

- Register `context.ui.slot({ append: "session.panel", render: ... })` showing the gallery only when `panel.name === "glyphimon.gallery"`.
- Register a global keymap layer with:
  - `glyphimon.pet.open`, title “Pets: Open gallery”, slash `pet` with arguments, opens the panel fullscreen.
  - If `panel.open` returns false, toast “Open a session first.”
- Parse the slash input:
  - Empty → open gallery.
  - `rename <name>` → validate and rename the active pet; toast success or the validation error.
  - `reset` → confirmation dialog; on confirm, reset to a new egg.
  - `debug <number>` → only when `process.env.GLYPHIMON_DEBUG === "1"`; add tokens with `addTokens` for manual testing.
  - Anything else → short usage toast.
- Use `generateName` when creating the first egg and the next egg (Task 9).

- [ ] **Step 6: Run tests, typecheck, and manual gallery check**

Run:

```bash
pnpm test
pnpm typecheck
opencode --standalone
```

Expected:
- `/pet` opens the gallery.
- The active pet is large and animated; retired cards show static sprites.
- `/pet rename Ash` works; invalid names show an error.
- `/pet reset` asks for confirmation and starts a new egg.

- [ ] **Step 7: Commit**

```bash
git add src/names.ts src/components/gallery.tsx src/state.ts src/tui.tsx test/gallery.test.ts
git commit -m "feat: add pet gallery, names, and pet commands"
```

---

### Task 9: Evolution choreography and handover

**Files:**
- Modify: `src/animations.ts`
- Modify: `src/components/pet-panel.tsx`
- Modify: `src/tui.tsx`
- Modify: `test/animations.test.ts`
- Modify: `test/state.test.ts`

**Interfaces:**
- Produces: `evolutionMessages(events: EvolutionEvent[], family: Family, state: GlyphimonState): string[]`
- Produces: `finalEvent(events: EvolutionEvent[]): EvolutionEvent | undefined`
- Produces: `reconcileFinalState(state: GlyphimonState, now: number, nextFamily: FamilyId, nextName: string, nextID: string): GlyphimonState`

- [ ] **Step 1: Write the failing choreography tests**

Add to `test/state.test.ts`:

```ts
import { reconcileFinalState } from "../src/state.ts"

test("a final pet left over from a closed TUI is handed over on startup", () => {
  const final = addTokens(
    createInitialState(NOW, "cinder", "Pip", "pet-1"),
    30,
    NOW,
    THRESHOLDS,
  ).state
  const reconciled = reconcileFinalState(final, NOW + 1, "tide", "Mira", "pet-2")
  assert.equal(reconciled.gallery.length, 1)
  assert.equal(reconciled.active.stage, "egg")
  assert.equal(reconciled.active.id, "pet-2")
})
```

Add to `test/animations.test.ts`:

```ts
import { createInitialState } from "../src/state.ts"
import { FAMILY_CINDER } from "../src/sprites/cinder.ts"
import { evolutionMessages, finalEvent } from "../src/animations.ts"

const NOW = 1_700_000_000_000
const state = createInitialState(NOW, "cinder", "Pip", "p")

test("evolution messages name each new stage and the final nature", () => {
  const messages = evolutionMessages(
    [
      { petID: "p", from: "egg", to: "baby" },
      { petID: "p", from: "teen", to: "final", nature: "builder" },
    ],
    FAMILY_CINDER,
    state,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL because `reconcileFinalState`, `evolutionMessages`, and `finalEvent` do not exist.

- [ ] **Step 3: Implement the choreography helpers**

- `evolutionMessages` builds user-facing strings:
  - egg → baby: `"Pip hatched into Emberling!"`
  - baby → teen: `"Pip grew into Cinderling!"`
  - teen → final: `"Pip evolved into Forgeclaw — Builder!"`
  - final handover: `"Pip retired to the gallery. A new egg appeared."`
- `finalEvent` returns the event with `to === "final"`.
- `reconcileFinalState` calls `finalizeRetired` when the active pet is final; otherwise returns the state unchanged.

- [ ] **Step 4: Wire the reveal and handover**

In `src/tui.tsx`:

- On setup, call `reconcileFinalState` before rendering, so a final pet left from a closed TUI is handed over. Pass a next family from `chooseFamily`, a unique name from `generateName`, and a new `crypto.randomUUID()` id.
- When `recordUsage` returns evolution events:
  - Show each message as a toast.
  - Set activity to `"evolving"` for 1.2s for hatch/teen and 2.4s for final.
  - If there is a final event, schedule `finalizeRetired` after 2.4s using the serialized update queue.
  - Choose the next family with `chooseFamily(finalPet.family, Math.random)`, a unique name with `generateName`, and a new `crypto.randomUUID()` id.
  - Show the handover toast after the new egg is created.
- If multiple threshold events occur in one update, show the highest stage message; do not schedule more than one handover.

In `src/components/pet-panel.tsx`:

- While activity is `"evolving"`, alternate the sprite with a white flash every 120ms.
- For eggs, overlay cracks from `eggCrackLevel`.
- For `success`, use a one-frame upward hop and a sparkle.
- For `failure`, add a sweat-drop pixel.
- Do not show the nature or family name before hatching.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm test
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Manual debug evolution**

Run with a low threshold override or the debug command:

```bash
GLYPHIMON_DEBUG=1 opencode --standalone
```

Then run `/pet debug 10000000`.
Expected:
- The egg cracks, hatches, becomes a teen, and reaches a final form.
- The final form flashes, shows the nature, retires, and a new egg appears.
- The gallery contains exactly one retired pet.
- Restarting during the reveal still hands over the final pet on startup.

- [ ] **Step 7: Commit**

```bash
git add src/animations.ts src/components/pet-panel.tsx src/tui.tsx test/animations.test.ts test/state.test.ts
git commit -m "feat: add evolution reveal and immediate handover"
```

---

### Task 10: Install, document, and final verification

**Files:**
- Create: `README.md`
- Modify: `docs/design.md` only if implementation changed a decision
- Optional: `~/.config/opencode/opencode.jsonc` only if discovery does not load the plugin

**Interfaces:**
- Consumes: everything above

- [ ] **Step 1: Write the README**

Include:

- What Glyphimon is.
- Install/load behaviour: plugin folder under `~/.config/opencode/plugins/glyphimon/`; reload with `/reload`.
- Commands: `/pet`, `/pet rename <name>`, `/pet reset`, `/pet debug <n>` (debug only).
- Thresholds and how to change them.
- The fresh-token definition and why cache reads are excluded.
- Where state is stored and that it is local to the machine.
- A development section: `pnpm install`, `pnpm test`, `pnpm typecheck`, and how to run with `GLYPHIMON_DEBUG=1`.
- A note that all creatures and art are original.

- [ ] **Step 2: Run the full checks**

Run:

```bash
cd ~/.config/opencode/plugins/glyphimon
pnpm test
pnpm typecheck
git status --short
```

Expected: tests pass, typecheck passes, and `git status --short` shows only the README/design changes that Step 6 will commit.

- [ ] **Step 3: Verify global discovery**

Run `opencode --standalone` (or reload an open TUI).
Expected: the Glyphimon toast appears and the pet panel is visible without editing `opencode.jsonc`.

If it does not appear, add the plugin as an object entry to the existing `plugins` array in `~/.config/opencode/opencode.jsonc` without replacing the file:

```jsonc
{ "package": "/Users/olivercheng/.config/opencode/plugins/glyphimon" }
```

Then reload and confirm again.

- [ ] **Step 4: Run the final manual checklist**

- Fresh install shows an egg at zero; existing history does not evolve it.
- The egg wobbles and cracks near hatching.
- Hatching reveals a name and family.
- Tool calls move the three hidden stats; the final form reflects the dominant one.
- The final form flashes, retires, and a new egg appears.
- The gallery shows the active pet and every retired pet, several per row.
- Rename, reset, and restart persistence work.
- A terminal without a visible sidebar does not crash.

- [ ] **Step 5: Confirm no Rails changes**

Run:

```bash
git -C /Users/olivercheng/Desktop/spacious-rails status --short
```

Expected: no Glyphimon-related changes in the Rails repository.

- [ ] **Step 6: Commit**

```bash
cd ~/.config/opencode/plugins/glyphimon
git add README.md docs/design.md
git commit -m "docs: document Glyphimon usage and development"
```
