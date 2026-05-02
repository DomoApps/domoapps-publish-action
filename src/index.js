const core = require('@actions/core');
const { validateInputs } = require('./steps/validateInputs');
const { setupEnvironment } = require('./steps/setupEnvironment');
const { authenticateDomo } = require('./steps/authenticateDomo');
const { runBuild } = require('./steps/runBuild');
const { changeDirectory } = require('./steps/changeDirectory');
const { publishAppStep } = require('./steps/publishApp');

async function run() {
  try {
    const domoToken = core.getInput('domo-token', { required: true });
    const domoInstance = core.getInput('domo-instance', { required: true });
    const buildCommand = core.getInput('build-command', { required: false });
    const workingDirectory =
      core.getInput('working-directory', { required: false }) || '.';
    const publishDirInput = core.getInput('publish-dir', { required: false });
    const publishDir = publishDirInput && publishDirInput.trim() !== ''
      ? publishDirInput
      : '.';

    if (!validateInputs(domoToken, domoInstance)) {
      core.setOutput('deployment-status', 'failed');
      return;
    }

    core.info('🚀 Starting Domo app deployment...');
    core.info(`📁 Working directory: ${workingDirectory}`);
    core.info(`📦 Publish directory: ${publishDir}`);
    core.info(`🌐 Domo instance: ${domoInstance}`);

    await setupEnvironment();

    await authenticateDomo(domoToken, domoInstance);

    changeDirectory(workingDirectory);

    await runBuild(buildCommand);

    await publishAppStep(publishDir, domoInstance);

    core.info('🎉 Deployment completed successfully!');
  } catch (error) {
    core.setFailed(`❌ Action failed: ${error.message}`);
    core.setOutput('deployment-status', 'failed');
  }
}

run();
