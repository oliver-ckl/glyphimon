import { Plugin } from "@opencode/plugin/tui"
import { SpriteView } from "./components/sprite.tsx"
import { TEST_PALETTE, TEST_SPRITE } from "./sprites/test-pattern.ts"

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
        <SpriteView
          sprite={TEST_SPRITE}
          palette={TEST_PALETTE}
          surface="#0b0f14"
        />
      ),
    })
  },
})
