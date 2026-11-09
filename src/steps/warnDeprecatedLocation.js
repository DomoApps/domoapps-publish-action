const core = require('@actions/core');

const OLD_LOCATION = 'DomoApps/domoapps-publish-action';
const NEW_LOCATION = 'domoinc/domoapps-publish-action';

/**
 * Warns when the workflow references the action by its pre-migration
 * location. GitHub redirects the old name, so the run still works, but the
 * redirect only lasts as long as the DomoApps org does.
 */
function warnDeprecatedLocation() {
  const actionRepository = process.env.GITHUB_ACTION_REPOSITORY || '';
  if (actionRepository.toLowerCase() !== OLD_LOCATION.toLowerCase()) {
    return;
  }

  core.warning(
    `${OLD_LOCATION} has moved to ${NEW_LOCATION}. Update your workflow to ` +
      `"uses: ${NEW_LOCATION}@v3". The old location will stop working when ` +
      'the DomoApps GitHub org is retired.',
    { title: 'Domo Publish Action has moved' },
  );
}

module.exports = {
  warnDeprecatedLocation,
};
