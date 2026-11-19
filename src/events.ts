import type { Nature } from "./sprites/types.ts"
import type { GlyphimonState, TokenUsage } from "./state.ts"

const BUILDER_TOOLS = new Set([
  "edit",
  "write",
  "patch",
  "multiedit",
  "apply_patch",
])

const SCHOLAR_TOOLS = new Set([
  "read",
  "grep",
  "glob",
  "list",
  "webfetch",
  "websearch",
  "skill",
  "context7",
])

const TINKERER_TOOLS = new Set([
  "bash",
  "task",
  "todowrite",
  "background",
  "pty",
  "shell",
])

export function toolCategory(tool: string): Nature | null {
  const name = tool.toLowerCase()
  if (BUILDER_TOOLS.has(name)) return "builder"
  if (SCHOLAR_TOOLS.has(name)) return "scholar"
  if (TINKERER_TOOLS.has(name)) return "tinkerer"
  return null
}

export function shouldSeedFromZero(
  info: { time: { created: number }; fork?: unknown } | undefined,
  installedAt: number,
): boolean {
  return Boolean(info && info.time.created > installedAt && !info.fork)
}

export function isDuplicateEvent(
  state: Pick<GlyphimonState, "countedUsageEvents">,
  eventID: string,
): boolean {
  return Boolean(state.countedUsageEvents[eventID])
}

export function pruneByTimestamp<T>(
  record: Record<string, T>,
  max: number,
  timestamp: (value: T) => number,
): Record<string, T> {
  const entries = Object.entries(record)
    .sort(([, left], [, right]) => timestamp(right) - timestamp(left))
    .slice(0, Math.max(0, max))
  return Object.fromEntries(entries)
}

export function pruneSessionBaselines(
  baselines: Record<string, TokenUsage>,
  seenAt: Record<string, number>,
  max: number,
): Record<string, TokenUsage> {
  const keep = Object.keys(baselines)
    .sort((left, right) => (seenAt[right] ?? 0) - (seenAt[left] ?? 0))
    .slice(0, Math.max(0, max))
  return Object.fromEntries(keep.map((key) => [key, baselines[key]!]))
}
