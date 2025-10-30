# Domo Publish Action

A GitHub Action for deploying Domo apps from GitHub to a Domo instance using the `ryuu` npm package (which provides the `domo` CLI command).

## Features

- 🔐 **Token-based Authentication**: Secure authentication using Domo API tokens
- 🔨 **Optional Build Step**: Run custom build commands before deployment
- 📦 **Automatic Ryuu Installation**: Installs the ryuu package globally (provides `domo` CLI) if not present
- ✅ **Comprehensive Error Handling**: Detailed error messages and status reporting
- 🚀 **Easy Integration**: Simple setup with minimal configuration

## Usage

### Basic Example

```yaml
name: Deploy to Domo
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Domo
        uses: DomoApps/domoapps-publish-action@v1
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
```

### Merge to Main Example

```yaml
name: Deploy on Merge to Main
on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Only run when PR is actually merged (not just closed)
    if: github.event.pull_request.merged == true
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Domo
        uses: DomoApps/domoapps-publish-action@v1
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
          build-command: npm run build
          working-directory: ./build
```

### With Build Command

```yaml
name: Deploy to Domo
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Domo
        uses: DomoApps/domoapps-publish-action@v1
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
          build-command: npm run build
          working-directory: ./dist
```

## Inputs

| Input               | Description                                               | Required | Default |
| ------------------- | --------------------------------------------------------- | -------- | ------- |
| `domo-token`        | Domo API token for authentication                         | ✅       | -       |
| `domo-instance`     | Domo instance URL (e.g., `https://your-company.domo.com`) | ✅       | -       |
| `build-command`     | Optional build command to run before deployment           | ❌       | -       |
| `working-directory` | Build output directory containing the Domo app files      | ❌       | `.`     |

## Outputs

| Output              | Description                                      |
| ------------------- | ------------------------------------------------ |
| `deployment-status` | Status of the deployment (`success` or `failed`) |
| `app-url`           | URL of the deployed app                          |

## Setup

### 1. Create a Domo API Token

1. Log in to your Domo instance
2. Go to **Admin** → **API** → **Personal Access Tokens**
3. Create a new token with appropriate permissions for app deployment
4. Copy the token for use in GitHub Secrets

### 2. Configure GitHub Secrets

Add the following secrets to your repository:

- `DOMO_ACCESS_TOKEN`: Your Domo API token
- (Optional) `DOMO_INSTANCE`: Your Domo instance URL if you want to use it as a secret

### 3. Create Your Domo App

Ensure your Domo app follows the standard structure:

```text
my-domo-app/
├── manifest.json
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
    └── images/
```

## App Manifest Configuration

For your Domo app to be successfully deployed, you must have a properly configured `manifest.json` file in your app directory. Here's how to set it up:

### Minimal Manifest Structure

Here's the minimal manifest structure required for Domo app deployment:

```json
{
  "name": "test-git-action",
  "version": "1.0.0",
  "size": {
    "width": 1,
    "height": 1
  },
  "id": "f46a7a19-9237-1234-1234-ef453e181614",
  "mapping": [
    {
      "dataSetId": "a918ca2b-1234-42ec-1234-a71a2e1f9b43",
      "alias": "sales",
      "fields": []
    }
  ]
}
```

### Manifest Field Descriptions

| Field         | Required | Description                         |
| ------------- | -------- | ----------------------------------- |
| `name`        | ✅       | Display name of your app            |
| `version`     | ✅       | Semantic version (e.g., "1.0.0")    |
| `size.width`  | ✅       | App width in pixels                 |
| `size.height` | ✅       | App height in pixels                |
| `id`          | ✅       | Unique app identifier (UUID format) |
| `mapping`     | ✅       | Array of dataset mappings           |

### Common Manifest Issues

1. **Missing Required Fields**: Ensure all required fields are present (`name`, `version`, `size`, `id`, `mapping`)
2. **Invalid UUID Format**: The `id` field must be a valid UUID format
3. **Invalid Dataset ID**: The `dataSetId` must be a valid dataset ID from your Domo instance
4. **Missing Mapping**: At least one dataset mapping is required
5. **Invalid Alias**: Dataset aliases should be descriptive and unique within your app

### Getting Required IDs

#### Design ID (id)

The Design ID is automatically generated by Domo when you create an app. You can find it in the Domo interface:

1. Go to your app in Domo Asset Library
2. Navigate to the **Overview** tab
3. Look for "Design Id:" in the app details section
4. Copy the UUID (e.g., `f46a7a19-9237-41f5-9850-ef453e181614`)

## Advanced Usage

### Multiple Environments

```yaml
name: Deploy to Multiple Environments
on:
  push:
    branches: [main]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Staging
        uses: DomoApps/domoapps-publish-action@v1
        with:
          domo-token: ${{ secrets.DOMO_STAGING_ACCESS_TOKEN }}
          domo-instance: https://staging.domo.com

  deploy-production:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to Production
        uses: DomoApps/domoapps-publish-action@v1
        with:
          domo-token: ${{ secrets.DOMO_PRODUCTION_TOKEN }}
          domo-instance: https://your-company.domo.com
```

### With Custom Build Process

```yaml
name: Deploy with Custom Build
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Domo
        uses: DomoApps/domoapps-publish-action@latest
        with:
          domo-token: ${{ secrets.DOMO_ACCESS_TOKEN }}
          domo-instance: https://your-company.domo.com
          build-command: npm run build
          working-directory: ./build
```

## Working Directory

The `working-directory` parameter should point to the **build output directory** containing your compiled Domo app files (typically `./build`, `./dist`, or `./out`). This is where your build process outputs the final Domo app files that will be deployed.

**Common patterns:**

- `./build` - Most common build output directory
- `./dist` - Alternative build output directory
- `./out` - Another common build output directory
- `.` - Only use if your app files are in the repository root, such as **ProCode apps**

## How It Works

The action uses the `ryuu` npm package (which provides the `domo` CLI command) to deploy Domo apps. With the latest ryuu CLI, the process is:

1. **Login with Token**: `domo login -i <instance>.domo.com -t <token>`
2. **Publish Build Directory**: `domo publish --build-dir <build-directory>`

The action automatically handles the instance name extraction from the full Domo URL.

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your Domo token is correct and has proper permissions
   - Check that the Domo instance URL is correct

1. **Build Command Failed**
   - Ensure the build command is valid for your environment
   - Check that all required dependencies are installed

1. **Manifest Not Found**
   - Ensure the working directory contains a valid `manifest.json`
   - Verify the manifest has the correct `id` field for your Domo asset

1. **Manifest Errors**
   - Verify required fields are present
   - Ensure there are no blank spaces (' ') in the field aliases

### Debug Mode

To enable debug logging, set the `ACTIONS_STEP_DEBUG` secret to `true` in your repository settings.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For issues and questions:

- Create an issue in this repository
- Check the [Domo Developer Documentation](https://developer.domo.com/)
- Review the [ryuu documentation](https://www.npmjs.com/package/ryuu)
