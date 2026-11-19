# Glyphimon

A pixel-art digital pet that lives in the OpenCode session sidebar and grows from the tokens you burn while the agent works.

- Starts as an egg, hatches, grows into a teen, then evolves into a final form.
- The final form is decided by how you work: **Builder** (edits/writes), **Scholar** (reads/searches), or **Tinkerer** (shell/tests/tasks).
- When a pet reaches its final form it retires to the gallery and a new egg appears.
- One pet grows from your **total fresh-token use** across every project and session.
- The collection is browsable in a full-screen gallery.

All creatures, names, and sprites are original, inspired by the monster-raising genre rather than copied from it.

## Loading

The plugin lives at `~/.config/opencode/plugins/glyphimon/` and is discovered automatically. Restart OpenCode, or run `/reload`, after changing plugin code.

If the pet does not appear, add the plugin to the existing `plugins` array in `~/.config/opencode/opencode.jsonc`:

```jsonc
{ "package": "/Users/olivercheng/.config/opencode/plugins/glyphimon" }
```

## Using the pet

- **Click the pet sprite** or **`[gallery]`** in the sidebar card to open the gallery.
- **Click `[hide]`** to collapse the card. The collapsed `🐾 <name> · show` row stays clickable to bring it back.
- **`/pet`** opens the gallery.
- **`/pet hide`**, **`/pet show`**, **`/pet toggle`** control the sidebar card.
- **`/pet rename <name>`** renames the active pet. Names are 1–16 letters, numbers, spaces, or hyphens.
- **`/pet reset`** clears the active pet and gallery after confirmation.
- **`/pet debug <tokens>`** adds test tokens. It only works when OpenCode is started with `GLYPHIMON_DEBUG=1`.

If you do not see `/pet`, restart OpenCode so the plugin’s server command and TUI command list are loaded together.

## Growth

Only **fresh tokens** count:

```
input + output + reasoning + cache.write
```

`cache.read` is excluded because it is mostly the model re-reading context and would dominate the progress bar. The first pet starts at zero; token history from before installation is ignored.

Default thresholds:

| Stage | Fresh tokens |
| --- | ---: |
| Hatch | 200,000 |
| Teen | 4,000,000 |
| Final | 10,000,000 |

At normal heavy use this is roughly a few hours to hatch, a couple of days for the first evolution, and around a week to finish.

Thresholds can be changed through plugin options:

```jsonc
{
  "plugins": [
    {
      "package": "/Users/olivercheng/.config/opencode/plugins/glyphimon",
      "options": {
        "thresholds": { "hatch": 100000, "teen": 2000000, "final": 5000000 }
      }
    }
  ]
}
```

Invalid or missing values fall back to the defaults.

## State

The active pet, gallery, session baselines, tool-call ledger, and sidebar visibility preference are kept in OpenCode’s durable plugin storage. They survive restarts and are local to this machine. There are no network calls or credentials.

Use `/pet reset` to start over. The sidebar card is independent of the sidebar itself; if the whole sidebar is hidden, toggle it with `<leader>b` (the leader defaults to `Ctrl+X`).

## Development

```bash
cd ~/.config/opencode/plugins/glyphimon
pnpm install
pnpm test
pnpm typecheck
```

To exercise evolution manually:

```bash
GLYPHIMON_DEBUG=1 opencode --standalone
```

Then run `/pet debug 10000000` to push the active pet through every stage.

The package has three parts:

- `src/index.ts` — server plugin: registers the `/pet` command and emits RPC events.
- `src/tui.tsx` — TUI plugin: sidebar card, gallery panel, animations, token/event tracking.
- `src/rpc.ts` — typed command bridge between the server command and the TUI.

The implementation plan and design notes are in `docs/`.
