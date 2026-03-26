jest.mock('@actions/core');
jest.mock('@actions/exec');
jest.mock('@actions/io');

const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');

const { extractInstanceName } = require('../src/utils/domoHelpers');
const { validateInputs } = require('../src/steps/validateInputs');
const { changeDirectory } = require('../src/steps/changeDirectory');
const { detectPackageManager } = require('../src/utils/packageManager');

describe('Domo Publish Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    exec.exec.mockResolvedValue(0);
  });

  describe('extractInstanceName', () => {
    test('strips https:// prefix', () => {
      expect(extractInstanceName('https://company.domo.com')).toBe(
        'company.domo.com',
      );
    });

    test('strips http:// prefix', () => {
      expect(extractInstanceName('http://company.domo.com')).toBe(
        'company.domo.com',
      );
    });

    test('strips trailing slash', () => {
      expect(extractInstanceName('https://company.domo.com/')).toBe(
        'company.domo.com',
      );
    });

    test('handles subdomains', () => {
      expect(extractInstanceName('https://sub.company.domo.com')).toBe(
        'sub.company.domo.com',
      );
    });
  });

  describe('validateInputs', () => {
    test('returns true for valid inputs', () => {
      expect(validateInputs('token-123', 'https://company.domo.com')).toBe(
        true,
      );
    });

    test('fails when token is empty', () => {
      expect(validateInputs('', 'https://company.domo.com')).toBe(false);
      expect(core.setFailed).toHaveBeenCalledWith(
        'Domo token is required for authentication.',
      );
    });

    test('fails when instance URL is empty', () => {
      expect(validateInputs('token-123', '')).toBe(false);
      expect(core.setFailed).toHaveBeenCalled();
    });

    test('fails when instance URL does not contain .domo.com', () => {
      expect(validateInputs('token-123', 'https://not-domo.com')).toBe(false);
      expect(core.setFailed).toHaveBeenCalled();
    });

    test('accepts URLs that contain .domo.com', () => {
      expect(validateInputs('token-123', 'https://test.domo.com')).toBe(true);
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('changeDirectory', () => {
    test('does not change directory when path is "."', () => {
      const spy = jest.spyOn(process, 'chdir').mockImplementation(() => {});
      changeDirectory('.');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('changes directory for non-default paths', () => {
      const spy = jest.spyOn(process, 'chdir').mockImplementation(() => {});
      changeDirectory('./build');
      expect(spy).toHaveBeenCalledWith('./build');
      spy.mockRestore();
    });

    test('throws a descriptive error for invalid directory', () => {
      const spy = jest.spyOn(process, 'chdir').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      expect(() => changeDirectory('./nonexistent')).toThrow(
        /Working directory '\.\/nonexistent' does not exist/,
      );
      spy.mockRestore();
    });
  });

  describe('detectPackageManager', () => {
    let existsSyncSpy;

    beforeEach(() => {
      existsSyncSpy = jest.spyOn(fs, 'existsSync');
    });

    afterEach(() => {
      existsSyncSpy.mockRestore();
    });

    test('detects pnpm from lock file', () => {
      existsSyncSpy.mockImplementation(
        (file) => file === 'pnpm-lock.yaml',
      );
      expect(detectPackageManager()).toBe('pnpm');
    });

    test('detects yarn from lock file', () => {
      existsSyncSpy.mockImplementation((file) => file === 'yarn.lock');
      expect(detectPackageManager()).toBe('yarn');
    });

    test('detects npm from lock file', () => {
      existsSyncSpy.mockImplementation(
        (file) => file === 'package-lock.json',
      );
      expect(detectPackageManager()).toBe('npm');
    });

    test('defaults to npm when no lock file exists', () => {
      existsSyncSpy.mockReturnValue(false);
      expect(detectPackageManager()).toBe('npm');
    });

    test('pnpm takes priority over yarn and npm', () => {
      existsSyncSpy.mockReturnValue(true);
      expect(detectPackageManager()).toBe('pnpm');
    });
  });

  describe('Build Command Execution', () => {
    const { runBuild } = require('../src/steps/runBuild');

    test('skips when no build command provided', async () => {
      await runBuild('');
      expect(exec.exec).not.toHaveBeenCalled();
    });

    test('executes build command via bash', async () => {
      await runBuild('npm run build');
      expect(exec.exec).toHaveBeenCalledWith('bash', [
        '-c',
        'npm run build',
      ]);
    });

    test('throws on build failure', async () => {
      exec.exec.mockRejectedValue(new Error('build failed'));
      await expect(runBuild('npm run build')).rejects.toThrow('build failed');
      expect(core.setFailed).toHaveBeenCalled();
    });
  });

  describe('Domo Authentication', () => {
    const {
      authenticateWithDomo,
    } = require('../src/utils/domoHelpers');

    test('calls domo login with correct args', async () => {
      await authenticateWithDomo('my-token', 'https://company.domo.com');
      expect(exec.exec).toHaveBeenCalledWith('domo', [
        'login',
        '-i',
        'company.domo.com',
        '-t',
        'my-token',
      ]);
    });
  });

  describe('Domo Publish', () => {
    const { publishApp } = require('../src/utils/domoHelpers');

    test('calls domo publish with correct args', async () => {
      await publishApp('./dist', 'https://company.domo.com');
      expect(exec.exec).toHaveBeenCalledWith('domo', [
        'publish',
        '--build-dir',
        './dist',
      ]);
    });

    test('sets success outputs', async () => {
      await publishApp('./dist', 'https://company.domo.com');
      expect(core.setOutput).toHaveBeenCalledWith(
        'deployment-status',
        'success',
      );
      expect(core.setOutput).toHaveBeenCalledWith(
        'app-url',
        'https://company.domo.com/app/./dist',
      );
    });
  });
});
