const core = require('@actions/core');

/**
 * Changes to the working directory if needed
 * @param {string} workingDirectory - The working directory path
 */
function changeDirectory(workingDirectory) {
  if (workingDirectory !== '.') {
    core.info(`📂 Changing to working directory: ${workingDirectory}`);
    try {
      process.chdir(workingDirectory);
    } catch (error) {
      throw new Error(
        `Working directory '${workingDirectory}' does not exist or is not accessible: ${error.message}`,
      );
    }
  }
}

module.exports = {
  changeDirectory,
};
