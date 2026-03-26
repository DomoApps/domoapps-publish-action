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

### Pipeline

`src/index.js` orchestrates a sequential pipeline:

1. **validateInputs** — Validates domo-token and domo-instance
2. **setupEnvironment** — Detects package manager, installs deps, installs ryuu globally
3. **authenticateDomo** — Logs into Domo (before build, in case build needs Domo access)
4. **runBuild** — Optionally runs user-specified build command
5. **changeDirectory** — Switches to working directory (after build, so output dir exists)
6. **publishAppStep** — Publishes the app to Domo

Each step is a separate module in `src/steps/` that throws on failure.

### Utilities

- `domoHelpers.js` — Domo CLI operations: `extractInstanceName()`, `ensureRyuuInstalled()`, `authenticateWithDomo()`, `publishApp()`
- `packageManager.js` — Detects package manager (npm/yarn/pnpm) from lock files

### Domo CLI Invocation

The action installs ryuu globally, then invokes `domo` directly:
```javascript
await exec.exec('domo', ['login', '-i', instanceName, '-t', domoToken]);
await exec.exec('domo', ['publish', '--build-dir', appPath]);
```

Action inputs/outputs are defined in `action.yml`.
