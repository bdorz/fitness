const { buildAndroid } = require('./android-artifact');

try {
  const output = buildAndroid();
  console.log(`\nAPK 建置完成：${output}`);
  console.log('此檔案位於已忽略的 build 目錄，不會進入 Git。');
} catch (error) {
  console.error(`\nAndroid 建置失敗：${error.message}`);
  process.exitCode = 1;
}
