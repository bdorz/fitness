import ReactNativeBlobUtil from 'react-native-blob-util';
import { PermissionsAndroid, Platform } from 'react-native';
import type { GithubReleaseAsset } from './updateService';
import {
  AppUpdateError,
  classifyDownloadError,
  technicalMessage,
} from './updateErrors';

const APK_MIME = 'application/vnd.android.package-archive';
const ANDROID_Q = 29;

function apkFileName(url: string): string {
  try {
    const withoutQuery = url.split('?')[0];
    const name = decodeURIComponent(
      withoutQuery.substring(withoutQuery.lastIndexOf('/') + 1),
    );
    if (!/^[a-z0-9._-]+\.apk$/i.test(name)) {
      throw new Error('invalid APK file name');
    }
    return name;
  } catch (error) {
    throw new AppUpdateError('UPD-201', technicalMessage(error));
  }
}

async function requestLegacyStoragePermission(): Promise<void> {
  if (Number(Platform.Version) >= ANDROID_Q) {
    return;
  }

  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  const alreadyGranted = await PermissionsAndroid.check(permission);
  if (alreadyGranted) {
    return;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: '允許下載更新檔',
    message: 'Android 9 以下版本需要儲存空間權限，才能下載 APK 更新檔。',
    buttonPositive: '允許',
    buttonNegative: '取消',
  });
  if (result !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new AppUpdateError('UPD-207', `permission result: ${result}`);
  }
}

async function removeExistingFile(path: string): Promise<void> {
  try {
    if (await ReactNativeBlobUtil.fs.exists(path)) {
      await ReactNativeBlobUtil.fs.unlink(path);
    }
  } catch (error) {
    throw new AppUpdateError('UPD-205', technicalMessage(error));
  }
}

export async function downloadAndInstallApk(
  asset: GithubReleaseAsset,
  currentVersion: string,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new AppUpdateError('UPD-001');
  }

  const url = asset.browser_download_url;
  if (!url?.startsWith('https://')) {
    throw new AppUpdateError('UPD-201', 'download URL must use HTTPS');
  }
  if (!Number.isFinite(asset.size) || asset.size <= 0) {
    throw new AppUpdateError('UPD-204', `invalid expected size: ${asset.size}`);
  }

  await requestLegacyStoragePermission();

  const fileName = apkFileName(url);
  const isModernAndroid = Number(Platform.Version) >= ANDROID_Q;
  const legacyDestination = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;

  if (!isModernAndroid) {
    await removeExistingFile(legacyDestination);
  }

  let downloadedPath: string;
  try {
    // Large APKs are handled by Android's DownloadManager. This is the same
    // download service used by browsers, and it can continue through brief
    // network interruptions without keeping the React Native process alive.
    const response = await ReactNativeBlobUtil.config({
      addAndroidDownloads: {
        useDownloadManager: true,
        notification: true,
        title: fileName,
        description: 'Fitness App 更新檔',
        mime: APK_MIME,
        mediaScannable: true,
        ...(isModernAndroid
          ? { storeInDownloads: true }
          : { path: legacyDestination }),
      },
    })
      .fetch('GET', url, {
        Accept: 'application/octet-stream',
        'User-Agent': `FitnessApp/${currentVersion}`,
      })
      .progress({ interval: 250 }, (received, total) => {
        const expected = Number(total) > 0 ? Number(total) : asset.size;
        onProgress(
          Math.max(0, Math.min(Number(received) / expected, 0.99)),
        );
      });

    downloadedPath = response.path();
    if (!downloadedPath) {
      throw new AppUpdateError('UPD-206', 'DownloadManager returned no path');
    }
  } catch (error) {
    if (error instanceof AppUpdateError) {
      throw error;
    }
    const normalized = classifyDownloadError(error);
    if (normalized.code === 'UPD-206') {
      throw normalized;
    }
    throw normalized;
  }

  onProgress(1);
  try {
    await ReactNativeBlobUtil.android.actionViewIntent(
      downloadedPath,
      APK_MIME,
    );
  } catch (error) {
    throw new AppUpdateError('UPD-301', technicalMessage(error));
  }
}
