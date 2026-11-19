import type { Thresholds } from "./state.ts"

export const DEFAULT_THRESHOLDS: Thresholds = {
  hatch: 200_000,
  teen: 4_000_000,
  final: 10_000_000,
}

function positiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

export function resolveThresholds(input: unknown): Thresholds {
  const source =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {}

  return {
    hatch: positiveNumber(source.hatch)
      ? source.hatch
      : DEFAULT_THRESHOLDS.hatch,
    teen: positiveNumber(source.teen)
      ? source.teen
      : DEFAULT_THRESHOLDS.teen,
    final: positiveNumber(source.final)
      ? source.final
      : DEFAULT_THRESHOLDS.final,
  }
}
