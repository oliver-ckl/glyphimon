import { Plugin } from "@opencode/plugin/tui"
import { PetPanel } from "./components/pet-panel.tsx"
import type { Activity } from "./animations.ts"
import {
  isDuplicateEvent,
  pruneByTimestamp,
  pruneSessionBaselines,
  shouldSeedFromZero,
  toolCategory,
} from "./events.ts"
import { resolveThresholds } from "./options.ts"
import { chooseFamily } from "./sprites/index.ts"
import {
  createInitialState,
  recordUsage,
  replaceState,
  seedSession,
  type EvolutionEvent,
  type GlyphimonState,
} from "./state.ts"

function initialName(): string {
  return "Pip"
}

export default Plugin.define({
  id: "glyphimon.tui",
  setup(context) {
    const thresholds = resolveThresholds(context.options?.thresholds)
    const initial = createInitialState(
      Date.now(),
      chooseFamily(undefined, Math.random),
      initialName(),
      crypto.randomUUID(),
    )
    const [state, updateState] = context.storage.store("state", { initial })
    const [activity, updateActivity] = context.storage.memory("activity", {
      initial: { kind: "idle" as Activity },
    })

    const version = (state as unknown as { version?: number }).version
    if (version !== 1 || !state.active) {
      const fresh = createInitialState(
        Date.now(),
        chooseFamily(undefined, Math.random),
        initialName(),
        crypto.randomUUID(),
      )
      void updateState((draft) => replaceState(draft, fresh))
      context.ui.toast.show({
        title: "Glyphimon",
        message: "Pet state reset",
        variant: "warning",
      })
    }

    let activityTimer: ReturnType<typeof setTimeout> | undefined
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

        for (const evolution of evolved) {
          context.ui.toast.show({
            title: "Glyphimon",
            message: `${state.active.name} reached ${evolution.to}`,
            variant: "success",
          })
        }
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
        />
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
      unregister()
    }
  },
})
