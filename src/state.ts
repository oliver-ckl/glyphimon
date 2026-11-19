import type { FamilyId, Nature } from "./sprites/types.ts"

export type TokenUsage = {
  input: number
  output: number
  reasoning: number
  cache: {
    read: number
    write: number
  }
}

export type PetStage = "egg" | "baby" | "teen" | "final"

export type Pet = {
  id: string
  name: string
  family: FamilyId
  stage: PetStage
  tokens: number
  stats: Record<Nature, number>
  nature?: Nature
  createdAt: number
  stageAt: number
  retiredAt?: number
}

export type GlyphimonState = {
  version: 1
  installedAt: number
  active: Pet
  gallery: Pet[]
  sessionBaselines: Record<string, TokenUsage>
  sessionSeenAt: Record<string, number>
  countedUsageEvents: Record<string, number>
  countedToolCalls: Record<string, number>
  totalFreshTokens: number
}

export type EvolutionEvent = {
  petID: string
  from: PetStage
  to: PetStage
  nature?: Nature
}

export type Thresholds = {
  hatch: number
  teen: number
  final: number
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeUsage(usage: TokenUsage | undefined): TokenUsage {
  return {
    input: number(usage?.input),
    output: number(usage?.output),
    reasoning: number(usage?.reasoning),
    cache: {
      read: number(usage?.cache?.read),
      write: number(usage?.cache?.write),
    },
  }
}

export function emptyUsage(): TokenUsage {
  return {
    input: 0,
    output: 0,
    reasoning: 0,
    cache: { read: 0, write: 0 },
  }
}

export function freshTokens(usage: TokenUsage): number {
  const normalized = normalizeUsage(usage)
  return (
    normalized.input +
    normalized.output +
    normalized.reasoning +
    normalized.cache.write
  )
}

export function usageDelta(current: TokenUsage, previous: TokenUsage): TokenUsage {
  const next = normalizeUsage(current)
  const base = normalizeUsage(previous)
  return {
    input: Math.max(0, next.input - base.input),
    output: Math.max(0, next.output - base.output),
    reasoning: Math.max(0, next.reasoning - base.reasoning),
    cache: {
      read: Math.max(0, next.cache.read - base.cache.read),
      write: Math.max(0, next.cache.write - base.cache.write),
    },
  }
}

function createEgg(
  now: number,
  family: FamilyId,
  name: string,
  id: string,
): Pet {
  return {
    id,
    name,
    family,
    stage: "egg",
    tokens: 0,
    stats: { builder: 0, scholar: 0, tinkerer: 0 },
    createdAt: now,
    stageAt: now,
  }
}

export function createInitialState(
  now: number,
  family: FamilyId,
  name: string,
  id: string,
): GlyphimonState {
  return {
    version: 1,
    installedAt: now,
    active: createEgg(now, family, name, id),
    gallery: [],
    sessionBaselines: {},
    sessionSeenAt: {},
    countedUsageEvents: {},
    countedToolCalls: {},
    totalFreshTokens: 0,
  }
}

export function seedSession(
  state: GlyphimonState,
  sessionID: string,
  usage: TokenUsage = emptyUsage(),
): GlyphimonState {
  if (state.sessionBaselines[sessionID]) return state
  return {
    ...state,
    sessionBaselines: {
      ...state.sessionBaselines,
      [sessionID]: normalizeUsage(usage),
    },
  }
}

export function recordUsage(
  state: GlyphimonState,
  sessionID: string,
  usage: TokenUsage,
  now: number,
  thresholds: Thresholds,
): { state: GlyphimonState; fresh: number; evolved: EvolutionEvent[] } {
  const current = normalizeUsage(usage)
  const previous = state.sessionBaselines[sessionID]

  if (!previous) {
    return {
      state: {
        ...state,
        sessionBaselines: {
          ...state.sessionBaselines,
          [sessionID]: current,
        },
        sessionSeenAt: {
          ...state.sessionSeenAt,
          [sessionID]: now,
        },
      },
      fresh: 0,
      evolved: [],
    }
  }

  const fresh = freshTokens(usageDelta(current, previous))
  const next: GlyphimonState = {
    ...state,
    active:
      fresh > 0
        ? { ...state.active, tokens: state.active.tokens + fresh }
        : state.active,
    totalFreshTokens: state.totalFreshTokens + fresh,
    sessionBaselines: {
      ...state.sessionBaselines,
      [sessionID]: current,
    },
    sessionSeenAt: {
      ...state.sessionSeenAt,
      [sessionID]: now,
    },
  }

  const advanced = advanceEvolution(next, now, thresholds)
  return { state: advanced.state, fresh, evolved: advanced.evolved }
}

export function advanceEvolution(
  state: GlyphimonState,
  now: number,
  thresholds: Thresholds,
): { state: GlyphimonState; evolved: EvolutionEvent[] } {
  let active = state.active
  const evolved: EvolutionEvent[] = []

  if (active.stage === "egg" && active.tokens >= thresholds.hatch) {
    evolved.push({ petID: active.id, from: "egg", to: "baby" })
    active = { ...active, stage: "baby", stageAt: now }
  }

  if (active.stage === "baby" && active.tokens >= thresholds.teen) {
    evolved.push({ petID: active.id, from: "baby", to: "teen" })
    active = { ...active, stage: "teen", stageAt: now }
  }

  if (active.stage === "teen" && active.tokens >= thresholds.final) {
    const nature = selectNature(active.stats)
    evolved.push({ petID: active.id, from: "teen", to: "final", nature })
    active = { ...active, stage: "final", nature, stageAt: now }
  }

  if (evolved.length === 0) return { state, evolved }

  return {
    state: { ...state, active },
    evolved,
  }
}

export function finalizeRetired(
  state: GlyphimonState,
  now: number,
  nextFamily: FamilyId,
  nextName: string,
  nextID: string,
): GlyphimonState {
  if (state.active.stage !== "final") return state

  const retired: Pet = { ...state.active, retiredAt: now }
  return {
    ...state,
    active: createEgg(now, nextFamily, nextName, nextID),
    gallery: [...state.gallery, retired],
  }
}

export function selectNature(stats: Record<Nature, number>): Nature {
  const builder = number(stats?.builder)
  const scholar = number(stats?.scholar)
  const tinkerer = number(stats?.tinkerer)

  if (builder + scholar + tinkerer <= 0) return "scholar"
  if (builder >= scholar && builder >= tinkerer) return "builder"
  if (scholar >= tinkerer) return "scholar"
  return "tinkerer"
}

export function addTokens(
  state: GlyphimonState,
  amount: number,
  now: number,
  thresholds: Thresholds,
): { state: GlyphimonState; evolved: EvolutionEvent[] } {
  const added = Math.max(0, number(amount))
  const next: GlyphimonState = {
    ...state,
    active: { ...state.active, tokens: state.active.tokens + added },
    totalFreshTokens: state.totalFreshTokens + added,
  }
  return advanceEvolution(next, now, thresholds)
}

export function replaceState(draft: GlyphimonState, next: GlyphimonState): void {
  Object.assign(draft, next)
}
