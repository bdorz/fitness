import ReactNativeBlobUtil from 'react-native-blob-util';
import {Alert, Platform} from 'react-native';

export const GITHUB_OWNER = 'bdorz';
export const GITHUB_REPO = 'fitness';
export const CURRENT_VERSION = '1.0.2';

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
  const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const requestOptions = {
    headers: {
      Accept: 'application/vnd.github+json',
      'Cache-Control': 'no-cache, no-store',
    },
    cache: 'no-store' as const,
  };
  const cacheBuster = Date.now();
  const latestResponse = await fetch(
    `${baseUrl}/releases/latest?ts=${cacheBuster}`,
    requestOptions,
  );
  if (latestResponse.ok) {
    return latestResponse.json();
  }

  // 部分裝置可能保留 repository 尚未公開時的 404，改用列表端點重試。
  const listResponse = await fetch(
    `${baseUrl}/releases?per_page=1&ts=${cacheBuster}`,
    requestOptions,
  );
  if (!listResponse.ok) {
    throw new Error(
      `GitHub API 錯誤：${latestResponse.status}/${listResponse.status}`,
    );
  }
  const releases: GithubRelease[] = await listResponse.json();
  if (!releases.length) {
    throw new Error('GitHub 尚未發布任何版本');
  }
  return releases[0];
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
