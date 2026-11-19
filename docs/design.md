# Glyphimon — Design

## Intent

A small pixel-art creature that lives in the OpenCode session sidebar and grows from the tokens burned while the agent works. It is company for the waiting time, not a productivity dashboard.

## Goals

- One active pet at a time, fed by fresh token usage across every project and session.
- A visible life cycle: egg → baby → teen → final form.
- A hidden final-form branch based on how the user works: Builder, Scholar, or Tinkerer.
- A gallery of all retired pets, with several visible at once.
- Persistent, low-maintenance, and fun to watch while the agent runs.

## Non-goals

- Feeding, hunger, decay, guilt, or daily-maintenance mechanics.
- Competitive scoring, leaderboards, or cloud sync.
- Copying any existing Pokémon or Digimon sprite, name, or creature design.
- Changing Rails application behaviour. The plugin lives entirely in the global OpenCode config.

## Token accounting

The pet grows from **fresh tokens**:

```
input + output + reasoning + cache.write
```

`cache.read` is excluded because it is mostly the model re-reading context and would dominate the bar.

- The first pet starts at zero when the plugin is installed.
- History from before installation is ignored by baselining existing sessions.
- Usage is counted from `session.usage.updated` events, which carry cumulative per-session usage.
- New sessions count from their first token. Forked sessions are baselined at their copied usage so history is not double-counted.
- Missing usage fields are treated as zero.

Default thresholds:

| Stage | Fresh tokens | Approximate pace for this user |
| --- | ---: | --- |
| Hatch | 200,000 | a few hours |
| Teen | 4,000,000 | 2–3 days |
| Final | 10,000,000 | around a week |

Thresholds are configurable through plugin options and can be lowered for testing.

## Life cycle and natures

- An egg is created on install. The family is chosen at creation but hidden until hatching.
- At the hatch threshold the egg becomes a baby and its generated name and family are revealed.
- At the teen threshold it becomes a teen. The final branch is still hidden.
- At the final threshold it becomes one of three final forms based on accumulated tool usage:
  - **Builder** — edits and writes.
  - **Scholar** — reads, searches, and web lookups.
  - **Tinkerer** — shell commands, tests, tasks, and other execution tools.
- Ties resolve Builder → Scholar → Tinkerer. No tool activity defaults to Scholar.
- The final form is revealed with a flash and toast, then immediately retires to the gallery and a new egg takes its place.
- The next egg avoids repeating the just-retired family.

## Families

Three original families, each with an egg, baby, teen, and three final forms:

- **Cinder** — ember/fire.
- **Tide** — water/pearl.
- **Moss** — seed/forest.

Each final form has a distinct silhouette and palette. Art is authored as 20×20 pixel grids with a small shared palette vocabulary, rendered as half-block terminal pixels. All names and designs are original.

## UI

### Session sidebar

A compact card appended to the sidebar:

- 20×20 pixel sprite rendered in true color.
- Idle bob and blink.
- Reactions while the agent works: thinking, tool-specific prop (book/pencil/wrench), success hop, failure droop.
- Egg wobble and cracks as hatching approaches.
- Name, stage, and a small fresh-token progress bar.
- Nature stays hidden until the final evolution.

### Gallery

`/pet` opens a full-screen panel:

- Active pet shown large and animated.
- Retired pets in a grid, several visible at once: sprite, name, family, final form, nature, token total, hatch/retire dates.
- Retired sprites are static for performance.
- Active pet can be renamed with `/pet rename <name>`.
- `/pet reset` clears the collection after confirmation.

## Persistence

- Durable TUI storage, global across projects and sessions.
- Stores the active pet, gallery, per-session baselines, and deduplicated usage-event and tool-call IDs.
- Prunes old session, usage-event, and tool-call records to keep the state small.
- State is local to the machine. Multiple simultaneously open TUIs are guarded against double-counting by event and tool-call ID deduplication.

## Constraints

- Original creatures, names, and art only.
- No new services, network calls, or credentials.
- No changes outside `~/.config/opencode/plugins/glyphimon/`, except an entry in the global OpenCode config only if discovery does not pick the plugin up.
- The plugin must not throw on missing token fields, unknown tools, missing session metadata, or a hidden sidebar.
