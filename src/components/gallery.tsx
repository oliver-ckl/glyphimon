import { usePlugin } from "@opencode/plugin/tui"
import {
  For,
  Show,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js"
import {
  blink,
  bob,
  formNameForPet,
  spriteForPet,
} from "../animations.ts"
import { sortRetired, columnsFor, type GlyphimonState, type Pet } from "../state.ts"
import { FAMILIES } from "../sprites/index.ts"
import type { Sprite } from "../sprites/types.ts"
import { SpriteView } from "./sprite.tsx"

const SURFACE = "#0b0f14"

type ThemeLike = {
  text?: { base?: string; muted?: string }
  border?: { base?: string }
}

type PanelLike = {
  width: number
  close: () => void
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.floor(value))
}

function formatDate(value: number | undefined): string {
  if (!value) return "unknown"
  return new Date(value).toISOString().slice(0, 10)
}

function scaleGrid(grid: string[], factor: number): string[] {
  return grid
    .flatMap((row) => Array.from({ length: factor }, () => row))
    .map((row) =>
      Array.from(row)
        .flatMap((key) => Array.from({ length: factor }, () => key))
        .join(""),
    )
}

const PetCard: Component<{
  pet: Pet
  width: number
  textColor: string
  mutedColor: string
  borderColor: string
}> = (props) => {
  const family = () => FAMILIES[props.pet.family]
  const sprite = (): Sprite => spriteForPet(props.pet, family())
  const form = () => formNameForPet(props.pet, family())

  return (
    <box
      width={props.width}
      borderStyle="single"
      borderColor={props.borderColor}
      backgroundColor={SURFACE}
      padding={1}
      flexDirection="column"
      alignItems="center"
    >
      <SpriteView sprite={sprite()} palette={family().palette} surface={SURFACE} />
      <text fg={props.textColor} wrapMode="none">
        {props.pet.name}
      </text>
      <text fg={props.mutedColor} wrapMode="none">
        {form()}
      </text>
      <text fg={props.mutedColor} wrapMode="none">
        {props.pet.nature ?? "scholar"} · {formatTokens(props.pet.tokens)}
      </text>
      <text fg={props.mutedColor} wrapMode="none">
        retired {formatDate(props.pet.retiredAt)}
      </text>
    </box>
  )
}

export const Gallery: Component<{
  panel: PanelLike
  state: GlyphimonState
}> = (props) => {
  const context = usePlugin()
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 250)
    onCleanup(() => clearInterval(timer))
  })

  context.keymap.layer(() => ({
    mode: "global",
    commands: [
      {
        id: "glyphimon.gallery.close",
        title: "Close pet gallery",
        bind: "escape",
        run: () => props.panel.close(),
      },
    ],
  }))

  const theme = () => context.theme as unknown as ThemeLike
  const textColor = () => theme().text?.base ?? "#d8d8d8"
  const mutedColor = () => theme().text?.muted ?? "#8a8a8a"
  const borderColor = () => theme().border?.base ?? "#5a4a42"

  const activeFamily = () => FAMILIES[props.state.active.family]
  const activeForm = () => formNameForPet(props.state.active, activeFamily())
  const activeSprite = () => spriteForPet(props.state.active, activeFamily())
  const activeGrid = () => {
    const base = blink(activeSprite().grid, activeSprite().eyes, tick())
    return scaleGrid(bob(base, tick()), 2)
  }

  const retired = () => sortRetired(props.state.gallery)
  const columns = () => columnsFor(props.panel.width)
  const cardWidth = () =>
    Math.max(24, Math.floor((props.panel.width - 4) / columns()) - 2)
  const activeWidth = () =>
    props.panel.width >= 100
      ? Math.max(44, Math.floor(props.panel.width * 0.38))
      : props.panel.width

  return (
    <box flexDirection="column" width="100%" height="100%" padding={1} gap={1}>
      <text fg={textColor()}>GLYPHIMON GALLERY</text>

      <box
        flexDirection={props.panel.width >= 100 ? "row" : "column"}
        flexGrow={1}
        gap={1}
      >
        <box
          width={activeWidth()}
          borderStyle="rounded"
          borderColor={borderColor()}
          backgroundColor={SURFACE}
          padding={1}
          flexDirection="column"
          alignItems="center"
        >
          <text fg={mutedColor()}>ACTIVE</text>
          <SpriteView
            sprite={{ grid: activeGrid() }}
            palette={activeFamily().palette}
            surface={SURFACE}
          />
          <text fg={textColor()} wrapMode="none">
            {props.state.active.stage === "egg" ? "Egg" : props.state.active.name}
          </text>
          <text fg={mutedColor()} wrapMode="none">
            {activeForm()}
          </text>
          <text fg={mutedColor()} wrapMode="none">
            {formatTokens(props.state.active.tokens)} fresh tokens
          </text>
          <text fg={mutedColor()} wrapMode="none">
            hatched {formatDate(props.state.active.createdAt)}
          </text>
        </box>

        <scrollbox
          flexGrow={1}
          borderStyle="rounded"
          borderColor={borderColor()}
          backgroundColor={SURFACE}
          padding={1}
        >
          <text fg={mutedColor()}>RETIRED COMPANIONS</text>
          <Show
            when={retired().length > 0}
            fallback={
              <text fg={mutedColor()}>
                No retired companions yet. Raise one to its final form.
              </text>
            }
          >
            <box flexDirection="row" flexWrap="wrap" gap={1}>
              <For each={retired()}>
                {(pet) => (
                  <PetCard
                    pet={pet}
                    width={cardWidth()}
                    textColor={textColor()}
                    mutedColor={mutedColor()}
                    borderColor={borderColor()}
                  />
                )}
              </For>
            </box>
          </Show>
        </scrollbox>
      </box>

      <text fg={mutedColor()} wrapMode="none">
        /pet rename &lt;name&gt; · /pet reset · esc to close
      </text>
    </box>
  )
}
