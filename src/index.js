const core = require('@actions/core');
const { validateInputs } = require('./steps/validateInputs');
const { setupEnvironment } = require('./steps/setupEnvironment');
const { authenticateDomo } = require('./steps/authenticateDomo');
const { runBuild } = require('./steps/runBuild');
const { changeDirectory } = require('./steps/changeDirectory');
const { publishAppStep } = require('./steps/publishApp');

async function run() {
  try {
    // Get inputs
    const domoToken = core.getInput('domo-token', { required: true });
    const domoInstance = core.getInput('domo-instance', { required: true });
    const buildCommand = core.getInput('build-command', { required: false });
    const workingDirectory =
      core.getInput('working-directory', { required: false }) || '.';

    // The app path is determined by the working directory
    const appPath = workingDirectory;

    // Validate inputs
    if (!validateInputs(domoToken, domoInstance)) {
      core.setOutput('deployment-status', 'failed');
      return;
    }

    core.info('🚀 Starting Domo app deployment...');
    core.info(`📁 App path: ${appPath}`);
    core.info(`🌐 Domo instance: ${domoInstance}`);

    // Setup environment (package manager, dependencies, ryuu)
    await setupEnvironment();

    // Authenticate with Domo (before build, in case build needs Domo access)
    await authenticateDomo(domoToken, domoInstance);

    // Run build command if provided (after authentication, in case it needs Domo access)
    await runBuild(buildCommand);

    // Change to working directory (after build, so the directory exists)
    changeDirectory(workingDirectory);

    // Publish the app
    await publishAppStep(appPath, domoInstance);

    core.info('🎉 Deployment completed successfully!');
  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.setOutput('deployment-status', 'failed');
  }
}

// Run the action
run();
