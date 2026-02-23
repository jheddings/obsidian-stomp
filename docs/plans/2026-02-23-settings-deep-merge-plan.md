# Settings Deep Merge + Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace shallow `Object.assign` settings merge with obskit's `PluginConfig` to support deep merge and schema migrations.

**Architecture:** Single-file change in `src/main.ts`. Import `PluginConfig` from obskit, instantiate with `DEFAULT_SETTINGS` and a defensive migration for the edge-scroll command rename, replace `loadSettings()` body.

**Tech Stack:** TypeScript, obskit (`PluginConfig`), Obsidian Plugin API

---

### Task 1: File GitHub Issue

**Step 1: Create the issue**

Run:

```bash
gh issue create \
  --title "[Bug]: Settings shallow merge loses nested defaults and stale renamed bindings persist" \
  --body "$(cat <<'ISSUE_EOF'
### What happened?

Two related bugs in settings persistence:

1. **Shallow merge loses nested defaults.** \`Object.assign({}, DEFAULT_SETTINGS, savedData)\` in \`main.ts:64\` performs a top-level merge. When a new key is added to any nested settings group (\`pageScrollSettings\`, \`quickScrollSettings\`, \`sectionScrollSettings\`, \`autoScrollSettings\`), existing users never receive the new default — their saved object completely replaces the default one.

2. **Renamed command IDs leave stale bindings.** In commit \`23903f0\`, edge scroll commands were renamed from \`stomp-edge-scroll-up\`/\`down\` to \`stomp-edge-scroll-top\`/\`bottom\`. Users with the old IDs saved in \`commandBindings\` kept the stale entries and the new commands had no binding.

Both are symptoms of the same root cause: settings persistence has no schema evolution support.

### Steps to Reproduce

**Shallow merge:**
1. Install the plugin and configure any setting (saves \`data.json\`)
2. Upgrade to a version that adds a new key inside a nested settings group
3. The new setting's value is \`undefined\` instead of the expected default

**Stale bindings:**
1. Have edge scroll bindings saved as \`stomp-edge-scroll-up\`/\`stomp-edge-scroll-down\`
2. Upgrade to the version that renamed them to \`stomp-edge-scroll-top\`/\`stomp-edge-scroll-bottom\`
3. The old bindings persist but no longer match any command; new commands have no binding

### What did you expect to happen?

- New settings added to nested groups should receive their default values even when the user has a previously saved \`data.json\` that doesn't include the new keys.
- Renamed command IDs should be migrated automatically in saved bindings.

### What actually happened?

- \`Object.assign\` only merges top-level keys. Nested objects in saved data completely overwrite the corresponding defaults.
- No migration mechanism exists, so renamed command IDs remain as stale entries.

### Additional Context

Related: obsidian-chopro#233 — same shallow merge bug, same fix approach.

Fix will adopt obskit's \`PluginConfig\` class (deep merge + ordered migrations). Blocked on obskit \`plugin-config\` branch being implemented and released.

### How often does this happen?

Every time
ISSUE_EOF
)"
```

Expected: Issue created, URL printed.

**Step 2: Note the issue number** for use in the PR (Task 4).

**Step 3: Commit** — nothing to commit for this task.

---

### Task 2: Update the obskit import

**Files:**

- Modify: `src/main.ts:3`

**Step 1: Change the import**

In `src/main.ts`, replace line 3:

```typescript
import { Logger, LogLevel } from "obskit";
```

with:

```typescript
import { Logger, LogLevel, PluginConfig } from "obskit";
```

**Step 2: Verify the build**

Run: `npm run build`

Expected: Build fails — `PluginConfig` does not yet exist in the installed obskit.
This is expected. The branch is prepared for the upcoming obskit release.

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "Import PluginConfig from obskit"
```

---

### Task 3: Add PluginConfig instance and replace loadSettings

**Files:**

- Modify: `src/main.ts:7-67`

**Step 1: Add the config instance**

After the `DEFAULT_SETTINGS` block (after line 32), add:

```typescript
const config = new PluginConfig<StompPluginSettings>({
    defaults: DEFAULT_SETTINGS,
    migrations: [
        // v0 → v1: rename edge scroll command IDs (defensive — idempotent for
        // users who already have the new names or never used edge scroll)
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
    ],
});
```

**Step 2: Replace loadSettings body**

Replace:

```typescript
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        this.applySettings();
    }
```

with:

```typescript
    async loadSettings() {
        this.settings = await config.load(this);

        this.applySettings();
    }
```

**Step 3: Commit**

```bash
git add src/main.ts
git commit -m "Use PluginConfig for deep merge and edge-scroll migration

Replaces shallow Object.assign with obskit's PluginConfig, which
deep-merges nested defaults and runs ordered migrations. Includes
a defensive migration to rename the legacy edge-scroll command IDs."
```

---

### Task 4: Push branch and open PR

**Step 1: Push the branch**

```bash
git push -u origin fix/settings-deep-merge
```

**Step 2: Create the PR**

Use the issue number from Task 1 (replace `<N>` below):

```bash
gh pr create --title "Fix settings shallow merge and add edge-scroll migration" --body "$(cat <<'EOF'
## Summary

- Replace `Object.assign` shallow merge with obskit's `PluginConfig` for deep merge of nested settings defaults
- Add defensive migration to rename legacy edge-scroll command IDs (`stomp-edge-scroll-up`/`down` → `stomp-edge-scroll-top`/`bottom`)
- Fixes #<N>

## Dependency

Blocked on obskit `plugin-config` branch being implemented and released. The build will fail until `PluginConfig` is available in obskit.

## Related

- obsidian-chopro#233 / obsidian-chopro `fix/settings-deep-merge` — same fix for the chopro plugin

## Test plan

- [ ] Verify build succeeds once obskit exports `PluginConfig`
- [ ] Test with fresh install (no `data.json`) — all defaults applied
- [ ] Test with existing `data.json` missing new nested keys — defaults filled in
- [ ] Test with existing `data.json` containing legacy `stomp-edge-scroll-up`/`down` bindings — migrated to new IDs
- [ ] Test with existing `data.json` already using new command IDs — no changes made

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR created, URL printed.
