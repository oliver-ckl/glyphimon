import type { Accessor } from "solid-js"

export function createPanelVisibility(hidden: Accessor<boolean>): Accessor<boolean> {
  return () => !hidden()
}
