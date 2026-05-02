# Domo Publish Action

A GitHub Action for deploying Domo Custom Apps to a Domo instance using the [`ryuu`](https://www.npmjs.com/package/ryuu) npm package (which provides the `domo` CLI).

**v3** ships first-class support for **React, Vite, and CRA** projects: the action cleanly separates the *source directory* (where your build runs) from the *publish directory* (the artifact `ryuu` uploads). If you've ever had `docs/`, `node_modules/`, or other repo-root junk leak into your published app — that's what this fixes.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Examples](#examples)
  - [React / Vite app](#react--vite-app-recommended-pattern)
  - [Create React App (CRA)](#create-react-app-cra)
  - [ProCode / flat app (no build)](#procode--flat-app-no-build)
  - [With pre-build checks (lint, test, type-check)](#with-pre-build-checks-lint-test-type-check)
  - [With per-environment manifest overrides](#with-per-environment-manifest-overrides)
  - [Multi-environment deploys (dev / qa / prod)](#multi-environment-deploys-dev--qa--prod)
  - [Deploy only when app code changes](#deploy-only-when-app-code-changes)
  - [Using outputs (status checks, notifications)](#using-outputs-status-checks-notifications)
  - [pnpm / yarn](#pnpm--yarn)
- [Inputs](#inputs)
- [Outputs](#outputs)
- [How it works](#how-it-works)
- [Setup](#setup)
- [Migrating from v2](#migrating-from-v2)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

- 🔐 Token-based authentication with Domo
- 📦 Auto-detects npm / yarn / pnpm from your lockfile and installs your dependencies for you
- 🛠 Auto-installs `ryuu` (the Domo CLI) on the runner
- ⚛️ React / Vite / CRA friendly — separate `working-directory` (source) and `publish-dir` (build output)
- 🔨 Optional build step run inside your source directory
- 📤 Publishes only the build artifact, not the whole repo
- 📊 Outputs `deployment-status` and `app-url` for downstream steps

> **You don't need a separate `npm install` / `yarn install` / `pnpm install` step.** The action runs it for you using whichever package manager matches your lockfile. Add your own install step only if you're running pre-build commands (lint, test, type-check) in earlier steps that need `node_modules`.

---

## Quick start

```yaml
# .github/workflows/deploy.yml
name: Deploy to Domo
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Deploy to Domo
        uses: DomoApps/domoapps-publish-action@v3.0.0
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
          build-command: npm run build
          publish-dir: ./build
```

---

## Examples

### React / Vite app (recommended pattern)

Source lives at the repo root, Vite emits to `./build`:

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
    publish-dir: ./build
```

Source lives in a subfolder (`./app`):

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    working-directory: ./app
    build-command: npm run build
    publish-dir: ./dist
```

> `publish-dir` is resolved **relative to `working-directory`**, so `./dist` above means `./app/dist`.

### Create React App (CRA)

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
    publish-dir: ./build
```

> **CRA + `da apply-manifest`** — if your CRA template uses `da apply-manifest` in its build (`prestart` / `prebuild` / `build:dev` etc.), add `@domoinc/da` to your `devDependencies`. The CLI is typically installed globally on developer machines, so locally it works; in CI's clean install it isn't on PATH and the build fails with `sh: 1: da: not found`. Pinning it as a devDependency puts the binary in `node_modules/.bin` where npm scripts can find it.
>
> ```jsonc
> // package.json
> {
>   "devDependencies": {
>     "@domoinc/da": "^2.3.0"
>   }
> }
> ```

### ProCode / flat app (no build)

When `manifest.json`, `index.html`, etc. live at the repo root and there's no build step:

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
```

Defaults handle this — `working-directory: .` and `publish-dir` falls back to `working-directory`.

### With pre-build checks (lint, test, type-check)

`build-command` is a shell string — chain with `&&` to gate the publish on quality checks:

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run lint && npm test -- --watchAll=false && npm run build
    publish-dir: ./build
```

Or split into a dedicated checks step *before* this one — failures block the deploy:

```yaml
- run: npm ci   # only needed because the steps below run before the action's auto-install

- name: Lint & test
  run: |
    npm run lint
    npm test -- --watchAll=false

- name: Build & deploy
  uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
    publish-dir: ./build
```

### With per-environment manifest overrides

Domo Apps templates ship with `da apply-manifest` (from the [`@domoinc/da`](https://www.npmjs.com/package/@domoinc/da) CLI) to swap dataset IDs / app IDs per environment. Add `@domoinc/da` to your `devDependencies` so it's available in CI, then chain it into your build:

```jsonc
// package.json
{
  "scripts": {
    "build:prod": "da apply-manifest production && vite build"
  },
  "devDependencies": {
    "@domoinc/da": "^2.3.0"
  }
}
```

```yaml
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build:prod
    publish-dir: ./build
```

`da apply-manifest <env>` reads `src/manifestOverrides.json` and writes a build-time manifest with that env's `id` / `proxyId` / dataset UUIDs.

### Multi-environment deploys (dev / qa / prod)

A single workflow keyed off the branch:

```yaml
name: Deploy to Domo
on:
  push:
    branches: [main, qa, develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Resolve environment
        id: env
        run: |
          case "${{ github.ref_name }}" in
            main)    echo "name=prod" >> $GITHUB_OUTPUT
                     echo "instance=https://prod.domo.com" >> $GITHUB_OUTPUT ;;
            qa)      echo "name=qa"   >> $GITHUB_OUTPUT
                     echo "instance=https://qa.domo.com"   >> $GITHUB_OUTPUT ;;
            develop) echo "name=dev"  >> $GITHUB_OUTPUT
                     echo "instance=https://dev.domo.com"  >> $GITHUB_OUTPUT ;;
          esac

      - uses: DomoApps/domoapps-publish-action@v3.0.0
        with:
          domo-token: ${{ secrets[format('DOMO_TOKEN_{0}', steps.env.outputs.name)] }}
          domo-instance: ${{ steps.env.outputs.instance }}
          build-command: npm run build:${{ steps.env.outputs.name }}
          publish-dir: ./build
```

Stash three secrets (`DOMO_TOKEN_DEV`, `DOMO_TOKEN_QA`, `DOMO_TOKEN_PROD`) and three build scripts (`build:dev`, `build:qa`, `build:prod`).

### Deploy only when app code changes

Skip a deploy when only docs or workflows change:

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'public/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/deploy.yml'
```

### Using outputs (status checks, notifications)

```yaml
- name: Deploy
  id: deploy
  uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
    publish-dir: ./build

- name: Slack on failure
  if: failure() && steps.deploy.outputs.deployment-status == 'failed'
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d "{\"text\":\"❌ Deploy failed for ${{ github.repository }} @ ${{ github.sha }}\"}"

- name: Comment on PR
  if: github.event_name == 'pull_request' && steps.deploy.outputs.app-url
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: `Deployed to ${{ steps.deploy.outputs.app-url }}`
      })
```

### pnpm / yarn

The action auto-detects your package manager from the lockfile and runs the install for you. For pnpm you still need to make the `pnpm` binary available on the runner:

```yaml
# pnpm
- uses: actions/checkout@v4
- uses: pnpm/action-setup@v4
  with: { version: 9 }
- uses: actions/setup-node@v4
  with: { node-version: '22', cache: 'pnpm' }
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: pnpm build
    publish-dir: ./build
```

```yaml
# yarn
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with: { node-version: '22', cache: 'yarn' }
- uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: yarn build
    publish-dir: ./build
```

---

## Inputs

| Input               | Required | Default                       | Description                                                                                                |
| ------------------- | :------: | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `domo-token`        |    ✅    | —                             | Domo API token for authentication. Store as a GitHub secret.                                                |
| `domo-instance`     |    ✅    | —                             | Domo instance URL, e.g. `https://your-company.domo.com`.                                                    |
| `working-directory` |    ❌    | `.`                           | Source directory. Where dependencies install and `build-command` runs.                                     |
| `build-command`     |    ❌    | —                             | Optional shell command, run inside `working-directory`. Chain multiple steps with `&&`.                     |
| `publish-dir`       |    ❌    | (matches `working-directory`) | Built artifact to upload. Resolved **relative to `working-directory`**. Set to your build output folder.    |

---

## Outputs

| Output              | Description                                  |
| ------------------- | -------------------------------------------- |
| `deployment-status` | `success` or `failed`                        |
| `app-url`           | URL of the deployed app on the Domo instance |

---

## How it works

1. **Detect package manager** from your lockfile (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`).
2. **Install dependencies** with that package manager (`npm ci` / `yarn install --frozen-lockfile` / `pnpm install --frozen-lockfile`).
3. **Install `ryuu` globally** on the runner.
4. **Authenticate**: `domo login -i <instance> -t <token>`. Done before the build so a build step can hit Domo APIs if needed.
5. **Build**: change to `working-directory` and run `build-command` (if provided).
6. **Publish**: `cd` into `publish-dir`, then run plain `domo publish`. Only the contents of `publish-dir` are uploaded.

> **Why we `cd` instead of using `domo publish --build-dir`**: ryuu loads `manifest.json` *before* applying its own `--build-dir` chdir, so it would resolve the manifest against the caller's CWD (often `public/manifest.json` with no `id`) — causing a brand-new design to be created on every run instead of updating the one your build emitted. Chdir-ing ourselves lets ryuu's `findManifest` land directly on the resolved `manifest.json` inside your build output.

You don't need a separate install step. The only setup the action *doesn't* do is making the package manager binary itself available — for npm and yarn, `actions/setup-node` already includes them; for pnpm you need `pnpm/action-setup`.

---

## Setup

### 1. Create a Domo API token

1. Log in to your Domo instance
2. **Admin** → **Authentication** → **Personal Access Tokens**
3. Create a token with permissions for app deployment
4. Save it as a GitHub Actions secret (e.g. `DOMO_ACCESS_TOKEN`)

### 2. Configure your app

Your `publish-dir` must contain a valid `manifest.json` after the build. Minimal example:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "size": { "width": 5, "height": 3 },
  "fullpage": true,
  "id": "f46a7a19-9237-1234-1234-ef453e181614",
  "mapping": [
    { "alias": "Sales", "dataSetId": "a918ca2b-1234-42ec-1234-a71a2e1f9b43", "fields": [] }
  ]
}
```

For React/Vite apps, place `manifest.json` in `public/` so the build copies it into `publish-dir`.

#### Manifest fields

| Field         | Required | Description                                                                                                            |
| ------------- | :------: | ---------------------------------------------------------------------------------------------------------------------- |
| `name`        |    ✅    | Display name of your app                                                                                                |
| `version`     |    ✅    | Semantic version (e.g. `"1.0.0"`)                                                                                       |
| `size.width`  |    ✅    | Grid width (1–12)                                                                                                       |
| `size.height` |    ✅    | Grid height (1–12)                                                                                                      |
| `fullpage`    |    ❌    | If `true`, app takes full page                                                                                          |
| `id`          |    ❌    | App UUID. Generated on first publish; copy back from `build/manifest.json` so subsequent publishes update the same app. |
| `proxyId`     |    ❌    | Required if using AppDB collections                                                                                     |
| `mapping`     |    ❌    | Array of `{ alias, dataSetId, fields }` for dataset mappings                                                            |
| `collections` |    ❌    | Array of AppDB collection schemas (STRING-only columns)                                                                 |

---

## Migrating from v2

v3 reframes `working-directory` to mean the **source** directory. The new `publish-dir` input names the build output. In v2, the action used `working-directory` for both — which meant if you set it to `./build`, your build command tried to run from there (no `package.json`). If you left it at `.`, the publish step uploaded the entire repo (including `docs/`, `node_modules/`, etc.).

```diff
- uses: DomoApps/domoapps-publish-action@v2
+ uses: DomoApps/domoapps-publish-action@v3.0.0
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
-   working-directory: ./build
+   publish-dir: ./build
```

If you don't run a build (flat ProCode app), no change is needed — defaults still publish from the repo root.

### Also fixed in v3

- **Each deploy no longer creates a new design.** v2 invoked `domo publish --build-dir <dir>`, which made ryuu read the manifest from the *caller's* CWD (your repo root, where `public/manifest.json` typically has no `id`). Result: a new app was created on every run, even though your build output had the right `id`. v3 chdirs into `publish-dir` first and runs plain `domo publish`, so ryuu reads the manifest your build actually emitted. Tools like `da apply-manifest` that write the resolved id into the build output Just Work now.
- **`./build/build` resolution bug** (the old action's `changeDirectory` + `--build-dir` interaction) is gone.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Manifest not found` | `publish-dir` doesn't contain `manifest.json` after build | Ensure your build copies `manifest.json` into the publish output (e.g. via Vite's `public/` folder). Verify locally: `ls $(your-build-dir)/manifest.json` |
| `Authentication failed` | Bad / expired token, or wrong instance URL | Regenerate token in Domo admin. Ensure `domo-instance` includes the `https://` scheme. |
| Each deploy creates a new app | `manifest.json` inside `publish-dir` has no `id`, or its `id` doesn't exist on the target instance | After the first publish, ensure the `id` from `<publish-dir>/manifest.json` is what subsequent runs publish. If you use `da apply-manifest` for per-env overrides, confirm `manifestOverrides.json` has the right `id` for that env. v3 reads the manifest from the build output, so anything written there at build time is what ryuu sees. |
| Repo files leak into the published app | Using v2 without an isolated `working-directory`, or upgraded to v3 but didn't set `publish-dir` | Set `publish-dir` to your build output folder. |
| `sh: 1: da: not found` (or other CLI not on PATH in CI) | The CLI is installed globally locally but not in CI's clean install | Add the CLI as a `devDependency` (e.g. `@domoinc/da`) so `npm ci` puts it in `node_modules/.bin`. |
| AppDB calls fail at runtime | Missing `proxyId` in `manifest.json` | After first publish with `collections`, copy `proxyId` from `build/manifest.json`. |

### Debug logs

Enable verbose logs by setting these as GitHub Actions secrets on your repo:

- `ACTIONS_STEP_DEBUG` = `true`
- `ACTIONS_RUNNER_DEBUG` = `true`

---

## License

MIT — see [LICENSE](LICENSE).

## Support

- **Issues** — open one on this repo
- **Domo Developer Documentation** — https://developer.domo.com/
- **`ryuu` on npm** — https://www.npmjs.com/package/ryuu
- **`@domoinc/da` on npm** — https://www.npmjs.com/package/@domoinc/da
