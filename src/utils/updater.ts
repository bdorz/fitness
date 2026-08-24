import ReactNativeBlobUtil from 'react-native-blob-util';
import {Alert, Platform} from 'react-native';

export const GITHUB_OWNER = 'bdorz';
export const GITHUB_REPO = 'fitness';
export const CURRENT_VERSION = '1.0.1';

export interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
}

function versionParts(version: string): number[] {
  return version.replace(/^v/i, '').split('.').map(part => Number(part) || 0);
}

export function hasNewVersion(latestTag: string): boolean {
  const latest = versionParts(latestTag);
  const current = versionParts(CURRENT_VERSION);
  const length = Math.max(latest.length, current.length);
  for (let index = 0; index < length; index += 1) {
    if ((latest[index] || 0) !== (current[index] || 0)) {
      return (latest[index] || 0) > (current[index] || 0);
    }
  }
  return false;
}

export async function fetchLatestRelease(): Promise<GithubRelease> {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
    {headers: {Accept: 'application/vnd.github+json'}},
  );
  if (!response.ok) {
    throw new Error(`GitHub API 錯誤：${response.status}`);
  }
  return response.json();
}

export async function downloadAndInstallApk(
  url: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    Alert.alert('不支援', '目前僅支援 Android 版 APP 內更新');
    return;
  }

  const destination = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/FitnessApp-update.apk`;
  if (await ReactNativeBlobUtil.fs.exists(destination)) {
    await ReactNativeBlobUtil.fs.unlink(destination);
  }
  await ReactNativeBlobUtil.config({path: destination})
    .fetch('GET', url)
    .progress({interval: 250}, (received, total) => {
      onProgress(Number(total) > 0 ? Number(received) / Number(total) : 0);
    });
  await ReactNativeBlobUtil.android.actionViewIntent(
    destination,
    'application/vnd.android.package-archive',
  );
}
