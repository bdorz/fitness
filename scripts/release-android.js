const fs = require('fs');
const { spawnSync } = require('child_process');
const {
  buildAndroid,
  cleanupReleaseArtifacts,
  readVersion,
  run,
  stagedArtifact,
  stagingDirectory,
} = require('./android-artifact');

const version = readVersion();
const tag = `v${version}`;
const staged = stagedArtifact(version);

try {
  const output = buildAndroid();
  fs.mkdirSync(stagingDirectory, { recursive: true });
  fs.copyFileSync(output, staged);

  const view = spawnSync('gh', ['release', 'view', tag], { stdio: 'ignore' });

  if (view.status === 0) {
    run('gh', ['release', 'upload', tag, staged, '--clobber']);
  } else {
    run('gh', [
      'release',
      'create',
      tag,
      staged,
      '--title',
      `健身紀錄 ${tag}`,
      '--generate-notes',
    ]);
  }

  console.log(`\n${tag} 已上傳至 GitHub Releases。`);
} catch (error) {
  console.error(`\n發布失敗：${error.message}`);
  process.exitCode = 1;
} finally {
  cleanupReleaseArtifacts(version);
  console.log('本機 APK 已清理。');
}
