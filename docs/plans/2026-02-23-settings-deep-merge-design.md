# Settings Deep Merge + Migration

## Problem

Two related bugs in stomp's settings persistence:

1. **Shallow merge loses nested defaults.** `Object.assign({}, DEFAULT_SETTINGS, savedData)`
   in `main.ts:64` does a top-level merge. If a new key is added to any of the 4 nested
   settings groups (`pageScrollSettings`, `quickScrollSettings`, `sectionScrollSettings`,
   `autoScrollSettings`), existing users never receive the new default -- their saved object
   completely replaces the default one.

2. **Renamed command IDs leave stale bindings.** In commit `23903f0`, edge scroll commands
   were renamed from `stomp-edge-scroll-up`/`down` to `stomp-edge-scroll-top`/`bottom`.
   Users with the old IDs saved in `commandBindings` kept the stale entries and the new
   commands had no binding. There is no migration mechanism to transform saved data on
   upgrade.

Both are symptoms of the same root cause: settings persistence has no schema evolution
support.

## Solution

Adopt obskit's `PluginConfig<T>` class, which provides deep merge and ordered migrations.
This matches the fix already prepared for obsidian-chopro (`fix/settings-deep-merge` branch,
issue #233).

### Changes

Single file change in `src/main.ts`:

1. Import `PluginConfig` from obskit
2. Create a module-level `config` instance with `DEFAULT_SETTINGS` and a defensive migration
3. Replace `loadSettings()` body with `this.settings = await config.load(this)`

No changes to config.ts, settings.ts, controller.ts, engine.ts, or scroller.ts.

### Migration: Edge Scroll Rename

The migration must be defensive because existing users will not have the
`__obskit_config_version__` field yet. When `PluginConfig` first loads, it defaults
to version 0 and runs all migrations. The rename migration is idempotent -- it only
transforms bindings that still have the old IDs.

```typescript
(data) => {
    const renames: Record<string, string> = {
        "stomp-edge-scroll-up": "stomp-edge-scroll-top",
        "stomp-edge-scroll-down": "stomp-edge-scroll-bottom",
    };

    for (const binding of data.commandBindings ?? []) {
        if (binding.commandId in renames) {
            binding.commandId = renames[binding.commandId];
        }
    }
},
```

### Deep Merge Behavior

Handled by obskit's `PluginConfig.load()`:

- Recursively fills missing nested keys from `DEFAULT_SETTINGS`
- Preserves user's saved values (including falsy values like `false`, `0`, `""`)
- Arrays are atomic -- user's saved arrays replace defaults entirely
- Top-level keys not in defaults are ignored (no stale key cleanup needed)

## Deliverables

- GitHub issue covering both bugs
- Branch `fix/settings-deep-merge` with the one-file fix
- PR referencing the issue, noting dependency on obskit `PluginConfig`

## Dependencies

- obskit `plugin-config` branch must be implemented and released before this can merge
