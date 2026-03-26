const core = require('@actions/core');

/**
 * Validates the required inputs
 * @param {string} domoToken - The Domo API token
 * @param {string} domoInstance - The Domo instance URL
 */
function validateInputs(domoToken, domoInstance) {
  // Validate Domo instance URL
  if (!domoInstance || !domoInstance.includes('.domo.com')) {
    core.setFailed('Invalid Domo instance URL. Must be a valid Domo instance.');
    return false;
  }

  // Validate Domo token
  if (!domoToken) {
    core.setFailed('Domo token is required for authentication.');
    return false;
  }

  return true;
}

module.exports = {
  validateInputs,
};
