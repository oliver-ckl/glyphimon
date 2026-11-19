import { type Component } from "solid-js"

export const XpBar: Component<{
  ratio: number
  width: number
  label: string
}> = (props) => {
  const width = () => Math.max(0, Math.floor(props.width))
  const filled = () =>
    Math.max(0, Math.min(width(), Math.round(width() * props.ratio)))
  const empty = () => Math.max(0, width() - filled())

  return (
    <box flexDirection="column">
      <text wrapMode="none">
        <span style={{ fg: "#7ee787" }}>{"█".repeat(filled())}</span>
        <span style={{ fg: "#2f3b33" }}>{"░".repeat(empty())}</span>
      </text>
      <text fg="#8a8a8a" wrapMode="none">
        {props.label}
      </text>
    </box>
  )
}
