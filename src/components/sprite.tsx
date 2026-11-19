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
          <text wrapMode="none">
            <For each={row}>
              {(run) => <span style={{ fg: run.fg, bg: run.bg }}>{run.text}</span>}
            </For>
          </text>
        )}
      </For>
    </box>
  )
}
