const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const src = path.resolve(__dirname, '../android/app/build/outputs/apk/release/app-release.apk');
const version = pkg.version;
const dest = path.resolve(__dirname, `../健身紀錄-v${version}.apk`);

if (!fs.existsSync(src)) {
  console.error('找不到 APK，建置可能失敗了。');
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`\nAPK 已產生：健身紀錄-v${version}.apk`);
