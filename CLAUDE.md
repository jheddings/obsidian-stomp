# CLAUDE.md - obsidian-stomp

Obsidian plugin for foot pedal integration. Maps keyboard events (emitted by
foot pedals at the OS level) to configurable scroll behaviors in Markdown
preview mode. The name 'STOMP' is similar to the Code STOMP music pedal.

## Architecture

Six source files in `src/`, each with a single responsibility:

- **main.ts** - Plugin lifecycle (`onload`/`onunload`), key event routing, settings persistence
- **config.ts** - Settings interfaces, key binding lookup utilities, available keys
- **settings.ts** - Settings UI using tabbed pages (obskit `SettingsTabPage`)
- **controller.ts** - Command registry and dispatch; maps command IDs to scroll strategies
- **engine.ts** - Scroll animation state machine (frame timing, position interpolation)
- **scroller.ts** - Scroll strategy implementations (page, section, auto, toggle, stop)

### Key Design Patterns

- **Strategy pattern** in scroller.ts: abstract `ViewScroller` base with concrete
  implementations for each scroll type. ScrollController maintains a
  `Map<commandId, ViewScroller>` for O(1) dispatch.

- **Composition over inheritance** for `ScrollToggler`: wraps any `ViewScroller`
  to add toggle behavior without modifying the underlying strategy.

- **Template method** in section scrollers: `SectionScroller` defines the
  algorithm; subclasses override direction-specific behavior.

- **Observer-like settings**: each setting class has getter/setter that syncs
  UI state to `plugin.settings` and persists immediately via `saveSettings()`.

### Plugin Constraints

- Only active in `MarkdownPreviewView` (reading mode, not editing)
- Animation uses `setTimeout` at 60 FPS (not `requestAnimationFrame`)
- All scroll strategies are instantiated once in the controller constructor

## Dependencies

- **obskit** (production) - Logger, settings UI base classes (`SettingsTabPage`,
  typed setting controls). This is a shared library across Obsidian plugins.
- **obsidian** (dev/external) - Obsidian API, externalized from the bundle

## Build & Tooling

| Command          | Purpose                                        |
| ---------------- | ---------------------------------------------- |
| `npm run dev`    | Watch mode with inline sourcemaps              |
| `npm run build`  | Type-check (`tsc -noEmit`) + production bundle |
| `just tidy`      | Auto-format + lint fix                         |
| `just check`     | Format + lint checks (no fix)                  |
| `just preflight` | build + format check + lint                    |
| `just release`   | preflight + repo-guard + version bump + push   |
| `just clean`     | Remove build artifacts                         |
| `just clobber`   | clean + remove data.json + remove node_modules |

- **Bundler**: esbuild targeting ES2018, CommonJS output to `main.js`
- **Externals**: obsidian, electron, @codemirror/\*, @lezer/\*, builtin-modules
- **Pre-commit hooks**: husky + lint-staged runs prettier --check and eslint
- **No unit tests**: `npm test` runs the build as validation; testing is manual

### Versioning

`just release <patch|minor|major>` bumps the version in package.json,
runs `version.mjs` to update `manifest.json` and `versions.json`,
commits, tags with the format `obsidian-stomp-X.Y.Z`, and pushes.

## Code Conventions

- **Formatting**: uses prettier - run `npm run format:check` to verify
- **Linting**: uses eslint - run `npm run lint` to verify
- **Logging**: one `Logger.getLogger("ClassName")` per module; global level controlled via settings

## Best Practices

- Keep single-responsibility per file; avoid adding subdirectories unless the source count grows significantly
- New scroll behaviors should extend `ViewScroller` and be registered in `ScrollController`
- Settings changes persist immediately; there is no apply/cancel pattern
- Error handling at the controller level: strategies may throw, controller catches and shows `Notice` to the user
- Prefer `document.querySelectorAll` + `compareDocumentPosition` for stable element ordering over offset-based approaches
- When modifying settings interfaces, update `DEFAULT_SETTINGS` in main.ts to ensure backwards compatibility with existing user data
