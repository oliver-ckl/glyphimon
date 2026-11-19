import test from "node:test"
import assert from "node:assert/strict"
import { createSignal } from "solid-js/dist/solid.js"
import { createPanelVisibility } from "../src/components/panel-visibility.ts"

test("panel visibility follows the hidden signal", () => {
  const [hidden, setHidden] = createSignal(false)
  const visible = createPanelVisibility(hidden)

  assert.equal(visible(), true)
  setHidden(true)
  assert.equal(visible(), false)
  setHidden(false)
  assert.equal(visible(), true)
})
