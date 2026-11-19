import { usePlugin } from "@opencode/plugin/tui"
import {
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js"
import {
  blink,
  bob,
  eggCrackLevel,
  flashSprite,
  formNameForPet,
  overlay,
  spriteForPet,
  stageProgress,
  type Activity,
} from "../animations.ts"
import { FAMILIES } from "../sprites/index.ts"
import type { GlyphimonState, Thresholds } from "../state.ts"
import { SpriteView } from "./sprite.tsx"
import { XpBar } from "./xp-bar.tsx"

const SURFACE = "#0b0f14"

const THINKING = ["f.f.f"]
const PENCIL = [
  "....d",
  "...dd",
  "..dd.",
  ".dd..",
  "ff...",
]
const BOOK = ["ddddd", "dfffd", "dfffd", "ddddd"]
const WRENCH = ["dd.dd", ".ddd.", "..d..", "..d..", "..d.."]
const SPARKLE = ["..f..", "..f..", "fffff", "..f..", "..f.."]
const SWEAT = [".f.", "fff", ".f."]

const CRACKS: Record<number, string[]> = {
  1: ["..b..", ".b..."],
  2: ["..b..", ".b.b.", "b...b"],
  3: ["..b..", ".b.b.", "b.b.b", ".b.b."],
}

type ThemeLike = {
  text?: { base?: string; muted?: string }
  border?: { base?: string }
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.floor(value))
}

export const PetPanel: Component<{
  state: GlyphimonState
  activity: Activity
  thresholds: Thresholds
  hidden: boolean
  onToggleHidden: () => void
  onOpenGallery: () => void
}> = (props) => {
  const context = usePlugin()
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 250)
    onCleanup(() => clearInterval(timer))
  })

  const theme = () => context.theme as unknown as ThemeLike
  const textColor = () => theme().text?.base ?? "#d8d8d8"
  const mutedColor = () => theme().text?.muted ?? "#8a8a8a"
  const borderColor = () => theme().border?.base ?? "#5a4a42"

  const family = () => FAMILIES[props.state.active.family]
  const baseSprite = () => spriteForPet(props.state.active, family())
  const progress = () =>
    stageProgress(
      props.state.active.stage,
      props.state.active.tokens,
      props.thresholds,
    )

  const displayName = () =>
    props.state.active.stage === "egg" ? "Egg" : props.state.active.name

  const stageLabel = () => {
    const pet = props.state.active
    if (pet.stage === "egg") return "Egg · waiting to hatch"
    const form = formNameForPet(pet, family())
    if (pet.stage === "final") {
      return `${form} · ${pet.nature ?? "scholar"}`
    }
    return form
  }

  const grid = () => {
    let next = blink(baseSprite().grid, baseSprite().eyes, tick())
    next = bob(next, tick())

    if (props.state.active.stage === "egg") {
      const level = eggCrackLevel(props.state.active.tokens, props.thresholds)
      if (level > 0) next = overlay(next, CRACKS[level]!, 7, 8)
    }

    const activity = props.activity
    if (activity === "thinking") {
      next = overlay(next, THINKING, 15, 1)
    } else if (activity === "success") {
      if (tick() % 2 === 0) {
        const width = next[0]?.length ?? 0
        next = [...next.slice(1), ".".repeat(width)]
      }
      next = overlay(next, SPARKLE, 14, 1)
    } else if (activity === "failure") {
      next = overlay(next, SWEAT, 15, 2)
    } else if (activity === "evolving") {
      if (tick() % 2 === 0) next = flashSprite(next)
    } else if (typeof activity === "object" && "tool" in activity) {
      const icon =
        activity.tool === "builder"
          ? PENCIL
          : activity.tool === "scholar"
            ? BOOK
            : WRENCH
      next = overlay(next, icon, 14, 1)
    }

    return next
  }

  const barLabel = () => {
    if (props.state.active.stage === "final") return "FINAL"
    const value = progress()
    return `${formatTokens(props.state.active.tokens)} / ${formatTokens(value.next)}`
  }

  if (props.hidden) {
    return (
      <box
        onMouseDown={props.onToggleHidden}
        borderStyle="single"
        borderColor={borderColor()}
        padding={0}
      >
        <text fg={mutedColor()} wrapMode="none">
          🐾 {displayName()} · show
        </text>
      </box>
    )
  }

  return (
    <box
      borderStyle="rounded"
      borderColor={borderColor()}
      backgroundColor={SURFACE}
      title={displayName()}
      titleAlignment="left"
      flexDirection="column"
      padding={1}
    >
      <box
        flexDirection="row"
        justifyContent="center"
        onMouseDown={props.onOpenGallery}
      >
        <SpriteView
          sprite={{ grid: grid() }}
          palette={family().palette}
          surface={SURFACE}
        />
      </box>
      <text fg={textColor()} wrapMode="none">
        {stageLabel()}
      </text>
      <XpBar ratio={progress().ratio} width={18} label={barLabel()} />
      <box flexDirection="row" gap={1}>
        <box onMouseDown={props.onOpenGallery}>
          <text fg={mutedColor()} wrapMode="none">
            [gallery]
          </text>
        </box>
        <box onMouseDown={props.onToggleHidden}>
          <text fg={mutedColor()} wrapMode="none">
            [hide]
          </text>
        </box>
      </box>
    </box>
  )
}
