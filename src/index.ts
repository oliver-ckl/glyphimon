import { Plugin } from "@opencode/plugin"
import { GlyphimonRpc } from "./rpc.ts"

export default Plugin.define({
  id: "glyphimon",
  async setup(ctx) {
    const registration = await ctx.rpc.register(GlyphimonRpc, {})

    const command = await ctx.command.transform((editor) => {
      editor.add({
        name: "pet",
        description:
          "Open the Glyphimon gallery, or hide/show/toggle the sidebar pet",
        execute: async ({ prompt }) => {
          const text = prompt.text.replace(/^\/pet\b\s*/, "").trim()
          await registration.events.emit("command", { text })
        },
      })
    })

    return async () => {
      await command.dispose()
      await registration.dispose()
    }
  },
})
