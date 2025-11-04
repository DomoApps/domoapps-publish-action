# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GitHub Action that deploys Domo apps from GitHub to Domo instances using the `ryuu` npm package (which provides the `domo` CLI). The action handles authentication, optional build steps, and publishing to Domo.

## Key Commands

### Development
- `npm install` - Install dependencies
- `npm run build` - Build the action using @vercel/ncc (compiles src/index.js to dist/index.js)
- `npm run lint` - Run ESLint on source files
- `npm test` - Run Jest tests

### Git Workflow
- Pre-commit hooks are managed by Husky and lint-staged
- lint-staged runs ESLint on JS files and Prettier on JSON/YAML files

## Architecture

### Entry Point
The action starts in `src/index.js`, which orchestrates a sequential pipeline of steps:

1. **Input Validation** (`validateInputs`) - Validates domo-token and domo-instance
2. **Environment Setup** (`setupEnvironment`) - Detects and installs package managers, dependencies, and ryuu
3. **Authentication** (`authenticateDomo`) - Logs into Domo using token-based auth
4. **Build** (`runBuild`) - Optionally runs user-specified build command
5. **Directory Change** (`changeDirectory`) - Switches to working directory
6. **Publish** (`publishAppStep`) - Publishes the app to Domo

### Key Components

**Steps** (`src/steps/`):
Each step is a separate module that performs one part of the deployment pipeline. Steps are executed sequentially and throw errors on failure.

**Utilities** (`src/utils/`):
- `domoHelpers.js` - Core Domo CLI operations:
  - `extractInstanceName()` - Converts full URL to instance name
  - `ensureRyuuInstalled()` - Installs ryuu@beta globally if needed
  - `authenticateWithDomo()` - Runs `npx -c "domo login -i <instance> -t <token>"`
  - `publishApp()` - Runs `npx -c "domo publish --build-dir <path>"`

- `packageManager.js` - Detects and manages package managers (npm, yarn, pnpm) based on lock files

### Domo CLI Invocation Pattern

**IMPORTANT**: The action pre-installs ryuu@beta globally, then uses `npx -c` to execute commands:
```javascript
await exec.exec('npx', ['-c', `domo login -i ${instanceName} -t ${domoToken}`]);
```

**Why this approach:**
1. ryuu@beta is installed globally first for version control and performance
2. `npx -c` (command mode) executes in a shell context, bypassing the shebang issue
3. The shebang `#!/usr/bin/env node --harmony` in ryuu's domo script fails on systems where env doesn't support passing flags
4. `npx -c` finds the globally-installed domo command without needing `-y` since it's already installed

### Build Output

The action uses @vercel/ncc to compile everything into a single `dist/index.js` file. This is what GitHub Actions actually runs (specified in action.yml as `main: 'dist/index.js'`).

**Critical**: After making code changes, always run `npm run build` to regenerate `dist/index.js`.

## Domo App Requirements

Apps must have a `manifest.json` in the working directory with required fields:
- `name` - App display name
- `version` - Semantic version
- `size` - Width and height
- `id` - Design ID (UUID) from Domo Asset Library
- `mapping` - Array of dataset mappings with `dataSetId`, `alias`, and `fields`

## Testing

Tests are located in `__tests__/` and use Jest. Run tests with `npm test`.

## Action Inputs & Outputs

**Inputs**:
- `domo-token` (required) - Domo API token
- `domo-instance` (required) - Full Domo URL (e.g., https://company.domo.com)
- `build-command` (optional) - Command to run before deployment
- `working-directory` (optional, default: '.') - Directory containing the app or build output

**Outputs**:
- `deployment-status` - 'success' or 'failed'
- `app-url` - URL of the deployed app

## Important Notes

- The action installs `ryuu@beta` globally, not the stable version
- Authentication happens before build in case the build needs Domo access
- Directory change happens after build so the build output directory exists
- All Domo CLI commands are executed via `npx -c` which bypasses shebang issues in the domo script
- The shebang issue: ryuu's domo script uses `#!/usr/bin/env node --harmony` which fails on systems where env doesn't support passing flags
