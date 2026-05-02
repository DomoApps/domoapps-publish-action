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
    await exec.exec('npm', ['install', '-g', 'ryuu']);
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

  // Login to Domo using the globally-installed ryuu CLI
  await exec.exec('domo', ['login', '-i', instanceName, '-t', domoToken]);
  core.info('✅ Successfully authenticated with Domo');
}

/**
 * Publishes the app to Domo. Caller is expected to have chdir'd into the
 * directory containing manifest.json — we run plain `domo publish` (no
 * --build-dir) so ryuu's findManifest resolves against the right CWD.
 * @param {string} appPath - The publish dir, used only for the app-url output
 * @param {string} domoInstance - The Domo instance URL
 */
async function publishApp(appPath, domoInstance) {
  core.info('📤 Publishing app to Domo...');

  await exec.exec('domo', ['publish']);
  core.info('✅ App published successfully');

  core.setOutput('deployment-status', 'success');
  core.setOutput('app-url', `${domoInstance}/app/${appPath}`);
}

module.exports = {
  extractInstanceName,
  ensureRyuuInstalled,
  authenticateWithDomo,
  publishApp,
};
