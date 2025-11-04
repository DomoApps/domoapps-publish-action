const exec = require('@actions/exec');
const core = require('@actions/core');
const { execSync } = require('child_process');

/**
 * Extracts instance name from Domo URL
 * @param {string} domoInstance - The full Domo instance URL
 * @returns {string} The instance name
 */
function extractInstanceName(domoInstance) {
  return domoInstance.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Gets the path to the ryuu domo script
 * @returns {string} Path to the domo script
 */
function getDomoScriptPath() {
  try {
    // Get the global npm prefix
    const npmPrefix = execSync('npm config get prefix', {
      encoding: 'utf8',
    }).trim();
    // Path to the globally installed ryuu domo script
    return `${npmPrefix}/lib/node_modules/ryuu/bin/domo`;
  } catch (error) {
    // Fallback: try to find it via npm root
    const npmRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return `${npmRoot}/ryuu/bin/domo`;
  }
}

/**
 * Installs ryuu (Domo CLI) if not already installed
 */
async function ensureRyuuInstalled() {
  core.info('📦 Checking for ryuu installation...');
  try {
    await exec.exec('npm', ['list', '-g', 'ryuu'], { silent: true });
    core.info('✅ ryuu is already installed');
  } catch (error) {
    core.info('📦 Installing ryuu globally...');
    await exec.exec('npm', ['install', '-g', 'ryuu@beta']);
    core.info('✅ ryuu installed successfully');
  }
}

/**
 * Authenticates with Domo using token
 * @param {string} domoToken - The Domo API token
 * @param {string} domoInstance - The Domo instance URL
 */
async function authenticateWithDomo(domoToken, domoInstance) {
  core.info('🔐 Adding Domo token and authenticating...');

  const instanceName = extractInstanceName(domoInstance);

  // Login to Domo with Token (execute via node to bypass shebang issues)
  const domoScript = getDomoScriptPath();
  await exec.exec('node', [
    domoScript,
    'login',
    '-i',
    instanceName,
    '-t',
    domoToken,
  ]);
  core.info('✅ Successfully authenticated with Domo');
}

/**
 * Publishes the app to Domo
 * @param {string} appPath - The path to the app to publish
 * @param {string} domoInstance - The Domo instance URL
 */
async function publishApp(appPath, domoInstance) {
  core.info('📤 Publishing app to Domo...');

  // Execute via node to bypass shebang issues
  const domoScript = getDomoScriptPath();
  await exec.exec('node', [domoScript, 'publish', '--build-dir', appPath]);
  core.info('✅ App published successfully');

  // Set outputs
  core.setOutput('deployment-status', 'success');
  core.setOutput('app-url', `${domoInstance}/app/${appPath}`);
}

module.exports = {
  extractInstanceName,
  ensureRyuuInstalled,
  authenticateWithDomo,
  publishApp,
};
