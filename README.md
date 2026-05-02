# Domo Publish Action

A GitHub Action for deploying Domo Custom Apps to a Domo instance using the `ryuu` npm package (which provides the `domo` CLI command).

v3 ships first-class support for **React, Vite, and CRA** projects: the action now cleanly separates the source directory (where your build runs) from the publish directory (the artifact ryuu uploads).

## Features

- 🔐 Token-based authentication with Domo
- 📦 Auto-installs `ryuu` (the Domo CLI) on the runner
- ⚛️ React / Vite / CRA friendly — separate `working-directory` (source) and `publish-dir` (build output)
- 🔨 Optional build step run inside your source directory
- ✅ Detailed status reporting on success / failure

## Usage

### React / Vite app (recommended pattern)

Source lives in `./app`, Vite emits to `./app/dist`:

```yaml
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
        uses: DomoApps/domoapps-publish-action@v3
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
          working-directory: ./app
          build-command: npm run build
          publish-dir: ./dist
```

`publish-dir` is resolved **relative to `working-directory`**, so `./dist` above means `./app/dist`.

### ProCode / flat app (no build step)

When your app files (manifest.json, index.html, …) sit at the repo root:

```yaml
- uses: DomoApps/domoapps-publish-action@v3
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
```

Defaults handle this — `working-directory: .` and `publish-dir` defaults to `working-directory`.

### CRA app

```yaml
- uses: DomoApps/domoapps-publish-action@v3
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
    publish-dir: ./build
```

## Inputs

| Input               | Description                                                                                                  | Required | Default |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------- |
| `domo-token`        | Domo API token for authentication                                                                            | ✅       | —       |
| `domo-instance`     | Domo instance URL (e.g., `https://your-company.domo.com`)                                                    | ✅       | —       |
| `working-directory` | Source directory — where deps install and `build-command` runs                                               | ❌       | `.`     |
| `build-command`     | Optional build command, run inside `working-directory`                                                       | ❌       | —       |
| `publish-dir`       | Built artifact to upload. Resolved relative to `working-directory`. Defaults to `working-directory` itself.  | ❌       | —       |

## Outputs

| Output              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `deployment-status` | Status of the deployment (`success` or `failed`) |
| `app-url`           | URL of the deployed app                          |

## Migrating from v2

v3 reframes `working-directory` to mean the **source** directory. The new `publish-dir` input names the build output. If you were using v2 with a build-command, your old config was likely broken (the action was effectively looking for `./build/build`); v3 fixes this.

```diff
- uses: DomoApps/domoapps-publish-action@v2
+ uses: DomoApps/domoapps-publish-action@v3
  with:
    domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
    domo-instance: https://your-company.domo.com
    build-command: npm run build
-   working-directory: ./build
+   publish-dir: ./build
```

If you don't run a build (flat ProCode app), no change is needed — defaults still publish from the repo root.

## Setup

### 1. Create a Domo API token

1. Log in to your Domo instance
2. Go to **Admin** → **API** → **Personal Access Tokens**
3. Create a token with permissions for app deployment
4. Save it as a GitHub secret (e.g., `DOMO_ACCESS_TOKEN`)

### 2. Configure your app

Your published directory must contain a valid `manifest.json`. Minimal example:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "size": { "width": 1, "height": 1 },
  "id": "f46a7a19-9237-1234-1234-ef453e181614",
  "mapping": [
    { "dataSetId": "a918ca2b-1234-42ec-1234-a71a2e1f9b43", "alias": "sales", "fields": [] }
  ]
}
```

For React/Vite apps, place `manifest.json` so the build copies it into the publish dir (e.g. in `public/` for CRA or `public/` for Vite).

### Manifest fields

| Field         | Required | Description                         |
| ------------- | -------- | ----------------------------------- |
| `name`        | ✅       | Display name of your app            |
| `version`     | ✅       | Semantic version (e.g., "1.0.0")    |
| `size.width`  | ✅       | App width in pixels                 |
| `size.height` | ✅       | App height in pixels                |
| `id`          | ✅       | Unique app identifier (UUID format) |
| `mapping`     | ✅       | Array of dataset mappings           |

## How it works

1. Detect package manager (npm / yarn / pnpm) and install `ryuu` globally.
2. `domo login -i <instance> -t <token>`
3. `cd <working-directory>`
4. Run `build-command` (if provided)
5. `domo publish --build-dir <publish-dir>`

## Troubleshooting

- **Authentication failed** — verify token validity and that `domo-instance` is correct.
- **Manifest not found** — verify `publish-dir` (relative to `working-directory`) contains `manifest.json` after build.
- **Build failed** — confirm `build-command` runs locally inside your `working-directory`.
- **Debug logs** — set repo secret `ACTIONS_STEP_DEBUG` to `true`.

## License

MIT — see [LICENSE](LICENSE).

## Support

- Issues: open a GitHub issue on this repo
- [Domo Developer Documentation](https://developer.domo.com/)
- [ryuu on npm](https://www.npmjs.com/package/ryuu)
