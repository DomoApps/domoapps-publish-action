# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GitHub Action that deploys Domo apps to Domo instances using the `ryuu` npm package (provides the `domo` CLI). Handles authentication, optional build steps, and publishing.

## Key Commands

- `npm run build` — Build with @vercel/ncc (compiles `src/index.js` → `dist/index.js`)
- `npm run lint` — ESLint on source files
- `npm test` — Jest tests (`__tests__/`)
- CI uses yarn (`yarn install --frozen-lockfile`); local dev uses npm

**Critical**: After any code change, run `npm run build` to regenerate `dist/index.js`. This is what GitHub Actions actually executes (per `action.yml` `main: 'dist/index.js'`).

Pre-commit hooks (Husky + lint-staged) auto-run ESLint on JS files and Prettier on JSON/YAML files.

## Architecture

### Inputs

- `working-directory` (default `.`) — **source** dir where deps install and `build-command` runs.
- `build-command` — optional, runs inside `working-directory`.
- `publish-dir` (default `working-directory`) — built artifact ryuu uploads. Resolved **relative to `working-directory`**.

### Pipeline

`src/index.js` orchestrates a sequential pipeline:

1. **validateInputs** — Validates domo-token and domo-instance
2. **setupEnvironment** — Detects package manager, installs deps, installs ryuu globally (runs from repo root)
3. **authenticateDomo** — Logs into Domo (before build, in case build needs Domo access)
4. **changeDirectory(workingDirectory)** — chdirs into source dir before build
5. **runBuild** — Runs user-specified build command (in source dir)
6. **changeDirectory(publishDir)** — chdirs into publish dir (relative to source dir)
7. **publishAppStep** — Runs plain `domo publish` from inside the publish dir

Each step is a separate module in `src/steps/` that throws on failure.

### Utilities

- `domoHelpers.js` — Domo CLI operations: `extractInstanceName()`, `ensureRyuuInstalled()`, `authenticateWithDomo()`, `publishApp()`
- `packageManager.js` — Detects package manager (npm/yarn/pnpm) from lock files

### Domo CLI Invocation

The action installs ryuu globally, then invokes `domo` directly:
```javascript
await exec.exec('domo', ['login', '-i', instanceName, '-t', domoToken]);
await exec.exec('domo', ['publish']);   // run from inside publish-dir
```

**Why no `--build-dir`**: ryuu's `publish` command calls `getManifest()` *before* applying its own `--build-dir` chdir (see `dist/commands/publish.js` in ryuu 5.x). With `--build-dir`, the manifest gets resolved against the caller's CWD via ryuu's `findManifest` lookup order (`./manifest.json` → `./public/manifest.json` → `./src/manifest.json` → glob), so a typical Vite/CRA repo with `public/manifest.json` (no `id`) causes ryuu to take the `createDesign` branch on every run — a brand-new design every CI build. The action chdirs into `publish-dir` itself, so ryuu's `findManifest` lands directly on the resolved `manifest.json` your build emitted (the one `da apply-manifest` populated with the right `id`).

Action inputs/outputs are defined in `action.yml`.
