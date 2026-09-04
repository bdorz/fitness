const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(projectRoot, 'android');
const releaseOutput = path.join(
  androidRoot,
  'app',
  'build',
  'outputs',
  'apk',
  'release',
  'app-release.apk',
);
const stagingDirectory = path.join(projectRoot, '.release');

function readVersion() {
  const packageVersion = require('../package.json').version;
  const gradle = fs.readFileSync(
    path.join(androidRoot, 'app', 'build.gradle'),
    'utf8',
  );
  const updater = fs.readFileSync(
    path.join(projectRoot, 'src', 'features', 'settings', 'updateService.ts'),
    'utf8',
  );
  const gradleVersion = gradle.match(/versionName\s+"([^"]+)"/)?.[1];
  const updaterVersion = updater.match(/CURRENT_VERSION\s*=\s*'([^']+)'/)?.[1];

  if (
    !gradleVersion ||
    !updaterVersion ||
    packageVersion !== gradleVersion ||
    packageVersion !== updaterVersion
  ) {
    throw new Error(
      `版本號不一致：package=${packageVersion}, Android=${
        gradleVersion ?? '找不到'
      }, updater=${updaterVersion ?? '找不到'}`,
    );
  }

  return packageVersion;
}

function removeFile(file) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

function run(command, args, cwd = projectRoot, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    shell: false,
    stdio: 'inherit',
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} 執行失敗（exit ${result.status}）`);
  }
}

function buildAndroid() {
  readVersion();
  removeFile(releaseOutput);
  if (process.platform === 'win32') {
    run(
      process.env.ComSpec || 'cmd.exe',
      ['/d', '/s', '/c', 'gradlew.bat assembleRelease --no-daemon'],
      androidRoot,
    );
  } else {
    run('./gradlew', ['assembleRelease', '--no-daemon'], androidRoot);
  }
  if (!fs.existsSync(releaseOutput)) {
    throw new Error(`找不到建置產物：${releaseOutput}`);
  }
  return releaseOutput;
}

function stagedArtifact(version) {
  return path.join(stagingDirectory, `健身紀錄-v${version}.apk`);
}

function cleanupReleaseArtifacts(version) {
  removeFile(releaseOutput);
  removeFile(stagedArtifact(version));
  if (
    fs.existsSync(stagingDirectory) &&
    fs.readdirSync(stagingDirectory).length === 0
  ) {
    fs.rmdirSync(stagingDirectory);
  }
}

module.exports = {
  buildAndroid,
  cleanupReleaseArtifacts,
  readVersion,
  run,
  stagedArtifact,
  stagingDirectory,
};
