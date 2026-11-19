import { Plugin } from "@opencode/plugin/tui"
import { Show } from "solid-js"
import { Gallery } from "./components/gallery.tsx"
import { PetPanel } from "./components/pet-panel.tsx"
import {
  evolutionMessages,
  finalEvent,
  type Activity,
} from "./animations.ts"
import {
  isDuplicateEvent,
  pruneByTimestamp,
  pruneSessionBaselines,
  shouldSeedFromZero,
  toolCategory,
} from "./events.ts"
import { generateName, validateName } from "./names.ts"
import { resolveThresholds } from "./options.ts"
import { GlyphimonRpc } from "./rpc.ts"
import { FAMILIES, chooseFamily } from "./sprites/index.ts"
import type { FamilyId } from "./sprites/types.ts"
import {
  addTokens,
  createInitialState,
  finalizeRetired,
  reconcileFinalState,
  recordUsage,
  renameActive,
  replaceState,
  resetCollection,
  seedSession,
  type EvolutionEvent,
  type GlyphimonState,
} from "./state.ts"

function freshState(
  now: number,
  previous?: FamilyId,
  existing: string[] = [],
): GlyphimonState {
  const family = chooseFamily(previous, Math.random)
  return createInitialState(
    now,
    family,
    generateName(family, existing, Math.random),
    crypto.randomUUID(),
  )
}

export default Plugin.define({
  id: "glyphimon.tui",
  setup(context) {
    const thresholds = resolveThresholds(context.options?.thresholds)
    const initial = freshState(Date.now())
    const [state, updateState] = context.storage.store("state", { initial })
    const [ui, updateUi] = context.storage.store("ui", {
      initial: { petHidden: false },
    })
    const [activity, updateActivity] = context.storage.memory("activity", {
      initial: { kind: "idle" as Activity },
    })

    void context.data.location.command
      .sync(context.location)
      .catch((error) => console.error("[glyphimon] command sync failed", error))

    const version = (state as unknown as { version?: number }).version
    if (version !== 1 || !state.active) {
      const fresh = freshState(Date.now())
      void updateState((draft) => replaceState(draft, fresh))
      context.ui.toast.show({
        title: "Glyphimon",
        message: "Pet state reset",
        variant: "warning",
      })
    }

    if (state.active?.stage === "final") {
      const finalPet = state.active
      const family = chooseFamily(finalPet.family, Math.random)
      const name = generateName(
        family,
        state.gallery.map((pet) => pet.name),
        Math.random,
      )
      const next = reconcileFinalState(
        state as unknown as GlyphimonState,
        Date.now(),
        family,
        name,
        crypto.randomUUID(),
      )
      void updateState((draft) => replaceState(draft, next))
      context.ui.toast.show({
        title: "Glyphimon",
        message: `${finalPet.name} retired to the gallery. A new egg appeared.`,
        variant: "success",
      })
    }

    let activityTimer: ReturnType<typeof setTimeout> | undefined
    let handoverTimer: ReturnType<typeof setTimeout> | undefined
    let handoverScheduled = false
    const setActivity = (
      kind: Activity,
      resetMs?: number,
      restore: Activity = "idle",
    ) => {
      updateActivity((draft) => {
        draft.kind = kind
      })
      if (activityTimer) clearTimeout(activityTimer)
      activityTimer = undefined
      if (resetMs) {
        activityTimer = setTimeout(() => {
          updateActivity((draft) => {
            draft.kind = restore
          })
        }, resetMs)
      }
    }

    let queue = Promise.resolve()
    const enqueue = (task: () => Promise<void>) => {
      queue = queue.then(task).catch((error) => {
        console.error("[glyphimon]", error)
      })
    }

    const handOverFinal = () => {
      handoverScheduled = false
      enqueue(async () => {
        const finalPet = state.active
        if (finalPet.stage !== "final") return

        const existing = state.gallery.map((pet) => pet.name)
        const family = chooseFamily(finalPet.family, Math.random)
        const name = generateName(family, existing, Math.random)
        const next = finalizeRetired(
          state as unknown as GlyphimonState,
          Date.now(),
          family,
          name,
          crypto.randomUUID(),
        )
        await updateState((draft) => replaceState(draft, next))
        context.ui.toast.show({
          title: "Glyphimon",
          message: `${finalPet.name} retired to the gallery. A new egg appeared.`,
          variant: "success",
        })
      })
    }

    const scheduleHandover = () => {
      if (handoverScheduled) return
      handoverScheduled = true
      if (handoverTimer) clearTimeout(handoverTimer)
      handoverTimer = setTimeout(handOverFinal, 2400)
    }

    const showEvolution = (evolved: EvolutionEvent[]) => {
      if (evolved.length === 0) return
      const family = FAMILIES[state.active.family]
      const messages = evolutionMessages(
        evolved,
        family,
        state as unknown as GlyphimonState,
      )
      context.ui.toast.show({
        title: "Glyphimon",
        message: messages[messages.length - 1]!,
        variant: "success",
      })
      if (finalEvent(evolved)) {
        setActivity("evolving", 2400, "idle")
        scheduleHandover()
      } else {
        setActivity("evolving", 1200, "idle")
      }
    }

    const openGallery = () => {
      if (
        !context.ui.panel.open("glyphimon.gallery", {
          presentation: "fullscreen",
        })
      ) {
        context.ui.toast.show({
          title: "Glyphimon",
          message: "Open a session first.",
          variant: "info",
        })
      }
    }

    const handlePetCommand = async (raw: string) => {
      const input = raw.trim()

      if (!input) {
        openGallery()
        return
      }

      if (input === "hide") {
        await updateUi((draft) => {
          draft.petHidden = true
        })
        return
      }

      if (input === "show") {
        await updateUi((draft) => {
          draft.petHidden = false
        })
        return
      }

      if (input === "toggle") {
        await updateUi((draft) => {
          draft.petHidden = !draft.petHidden
        })
        return
      }

      if (input === "reset") {
        const confirmed = await context.ui.dialog.confirm({
          title: "Reset Glyphimon?",
          message: "This clears your active pet and the entire gallery.",
          label: { confirm: "Reset", cancel: "Cancel" },
        })
        if (!confirmed) return
        const family = chooseFamily(undefined, Math.random)
        const fresh = resetCollection(
          Date.now(),
          family,
          generateName(family, [], Math.random),
          crypto.randomUUID(),
        )
        enqueue(async () => {
          await updateState((draft) => replaceState(draft, fresh))
        })
        context.ui.toast.show({
          title: "Glyphimon",
          message: "A new egg appeared.",
          variant: "info",
        })
        return
      }

      if (input.startsWith("rename ")) {
        const name = input.slice("rename ".length).trim()
        const error = validateName(name)
        if (error) {
          context.ui.toast.show({
            title: "Glyphimon",
            message: error,
            variant: "error",
          })
          return
        }
        enqueue(async () => {
          await updateState((draft) =>
            replaceState(draft, renameActive(draft, name)),
          )
        })
        context.ui.toast.show({
          title: "Glyphimon",
          message: `Renamed to ${name}.`,
          variant: "success",
        })
        return
      }

      if (
        input.startsWith("debug ") &&
        process.env.GLYPHIMON_DEBUG === "1"
      ) {
        const amount = Number.parseInt(input.slice("debug ".length).trim(), 10)
        if (!Number.isFinite(amount) || amount <= 0) {
          context.ui.toast.show({
            title: "Glyphimon",
            message: "Usage: /pet debug <tokens>",
            variant: "info",
          })
          return
        }
        const result = addTokens(
          state as unknown as GlyphimonState,
          amount,
          Date.now(),
          thresholds,
        )
        enqueue(async () => {
          await updateState((draft) => replaceState(draft, result.state))
        })
        showEvolution(result.evolved)
        return
      }

      context.ui.toast.show({
        title: "Glyphimon",
        message: "Try /pet, /pet rename <name>, or /pet reset.",
        variant: "info",
      })
    }

    const rpc = context.client.rpc(GlyphimonRpc)
    const unsubRpc = rpc.events.on("command", (event) => {
      const text = (event.data as { text?: unknown }).text
      if (typeof text === "string") void handlePetCommand(text)
    })

    const unsubUsage = context.data.on("session.usage.updated", (event) => {
      enqueue(async () => {
        if (isDuplicateEvent(state, event.id)) return

        const sessionID = event.data.sessionID
        const info = state.sessionBaselines[sessionID]
          ? undefined
          : context.data.session.get(sessionID)
        const evolved: EvolutionEvent[] = []

        await updateState((draft) => {
          if (isDuplicateEvent(draft, event.id)) return

          if (
            !draft.sessionBaselines[sessionID] &&
            shouldSeedFromZero(info, draft.installedAt)
          ) {
            replaceState(draft, seedSession(draft, sessionID))
          }

          const result = recordUsage(
            draft,
            sessionID,
            event.data.tokens,
            Date.now(),
            thresholds,
          )
          replaceState(draft, result.state)
          draft.countedUsageEvents[event.id] = Date.now()
          draft.countedUsageEvents = pruneByTimestamp(
            draft.countedUsageEvents,
            2000,
            (value) => value,
          )
          draft.sessionBaselines = pruneSessionBaselines(
            draft.sessionBaselines,
            draft.sessionSeenAt,
            1000,
          )
          for (const known of Object.keys(draft.sessionSeenAt)) {
            if (!draft.sessionBaselines[known]) delete draft.sessionSeenAt[known]
          }
          evolved.push(...result.evolved)
        })

        showEvolution(evolved)
      })
    })

    const unsubTool = context.data.on("session.tool.success", (event) => {
      const category = toolCategory(event.data.id)
      if (!category) return

      enqueue(async () => {
        if (state.countedToolCalls[event.id]) return
        await updateState((draft) => {
          if (draft.countedToolCalls[event.id]) return
          draft.countedToolCalls[event.id] = Date.now()
          draft.active.stats[category] += 1
          draft.countedToolCalls = pruneByTimestamp(
            draft.countedToolCalls,
            2000,
            (value) => value,
          )
        })
      })
    })

    const unsubStarted = context.data.on("session.execution.started", () => {
      setActivity("thinking")
    })

    const unsubToolCalled = context.data.on("session.tool.called", (event) => {
      const category = toolCategory(event.data.id)
      if (category) setActivity({ tool: category }, 1500, "thinking")
    })

    const unsubSucceeded = context.data.on(
      "session.execution.succeeded",
      () => {
        setActivity("success", 1500, "idle")
      },
    )

    const unsubFailed = context.data.on("session.execution.failed", () => {
      setActivity("failure", 2000, "idle")
    })

    const unsubInterrupted = context.data.on(
      "session.execution.interrupted",
      () => {
        setActivity("failure", 2000, "idle")
      },
    )

    const unregister = context.ui.slot({
      append: "sidebar.content",
      render: () => (
        <PetPanel
          state={state as unknown as GlyphimonState}
          activity={activity.kind}
          thresholds={thresholds}
          hidden={ui.petHidden}
          onToggleHidden={() => {
            void updateUi((draft) => {
              draft.petHidden = !draft.petHidden
            })
          }}
          onOpenGallery={openGallery}
        />
      ),
    })

    const unregisterGallery = context.ui.slot({
      append: "session.panel",
      render: (panel) => (
        <Show when={panel.name === "glyphimon.gallery"}>
          <Gallery
            panel={panel}
            state={state as unknown as GlyphimonState}
          />
        </Show>
      ),
    })

    return () => {
      unsubUsage()
      unsubTool()
      unsubStarted()
      unsubToolCalled()
      unsubSucceeded()
      unsubFailed()
      unsubInterrupted()
      if (activityTimer) clearTimeout(activityTimer)
      if (handoverTimer) clearTimeout(handoverTimer)
      unsubRpc()
      unregister()
      unregisterGallery()
    }
  },
})
