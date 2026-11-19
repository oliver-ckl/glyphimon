import { Rpc } from "@opencode/plugin/rpc"

export const GlyphimonRpc = Rpc.define({
  id: "glyphimon",
  methods: {},
  events: {
    command: {
      schema: {
        type: "object",
        properties: {
          text: { type: "string" },
        },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
})
