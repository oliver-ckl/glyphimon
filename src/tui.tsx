import { Plugin } from "@opencode/plugin/tui"
import { PetPanel } from "./components/pet-panel.tsx"
import { DEFAULT_THRESHOLDS } from "./options.ts"
import { addTokens, createInitialState } from "./state.ts"

const now = Date.now()
const demo = addTokens(
  createInitialState(now, "cinder", "Pip", "demo"),
  4_500_000,
  now,
  DEFAULT_THRESHOLDS,
).state

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
        <PetPanel state={demo} activity="idle" thresholds={DEFAULT_THRESHOLDS} />
      ),
    })
  },
})
