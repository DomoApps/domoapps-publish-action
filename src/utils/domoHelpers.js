const exec = require('@actions/exec');
const core = require('@actions/core');

/**
 * Extracts instance name from Domo URL
 * @param {string} domoInstance - The full Domo instance URL
 * @returns {string} The instance name
 */
function extractInstanceName(domoInstance) {
  return domoInstance.replace(/^https?:\/\//, '').replace(/\/$/, '');
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

  // Add token to domo CLI
  const addTokenCommand = `domo token -i ${instanceName} -t ${domoToken} add`;
  await exec.exec('bash', ['-c', addTokenCommand]);
  core.info('✅ Token added successfully');

  // Login to Domo
  const loginCommand = `domo login --instance ${instanceName}`;
  await exec.exec('bash', ['-c', loginCommand]);
  core.info('✅ Successfully authenticated with Domo');
}

/**
 * Publishes the app to Domo
 * @param {string} appPath - The path to the app to publish
 * @param {string} domoInstance - The Domo instance URL
 */
async function publishApp(appPath, domoInstance) {
  core.info('📤 Publishing app to Domo...');

  const publishCommand = `domo publish "${appPath}"`;
  await exec.exec('bash', ['-c', publishCommand]);
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
