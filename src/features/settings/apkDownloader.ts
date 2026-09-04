import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import type { GithubReleaseAsset } from './updateService';
import { AppUpdateError, technicalMessage } from './updateErrors';

const APK_MIME = 'application/vnd.android.package-archive';
const DOWNLOAD_ATTEMPTS = 3;

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

async function removeFile(path: string): Promise<void> {
  try {
    if (await ReactNativeBlobUtil.fs.exists(path)) {
      await ReactNativeBlobUtil.fs.unlink(path);
    }
  } catch (error) {
    throw new AppUpdateError('UPD-205', technicalMessage(error));
  }
}

async function fileSize(path: string): Promise<number> {
  try {
    if (!(await ReactNativeBlobUtil.fs.exists(path))) {
      return 0;
    }
    const stat = await ReactNativeBlobUtil.fs.stat(path);
    const size = Number(stat.size);
    if (!Number.isFinite(size) || size < 0) {
      throw new Error(`invalid file size: ${stat.size}`);
    }
    return size;
  } catch (error) {
    if (error instanceof AppUpdateError) {
      throw error;
    }
    throw new AppUpdateError('UPD-205', technicalMessage(error));
  }
}

function normalizeDownloadError(error: unknown): AppUpdateError {
  if (error instanceof AppUpdateError) {
    return error;
  }
  const message = technicalMessage(error);
  if (
    /space|storage|write|file|directory|permission|EACCES|ENOSPC/i.test(message)
  ) {
    return new AppUpdateError('UPD-205', message);
  }
  return new AppUpdateError('UPD-202', message, true);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function verifyDownload(
  path: string,
  expectedSize: number,
  expectedDigest?: string,
): Promise<void> {
  const downloadedSize = await fileSize(path);
  if (downloadedSize !== expectedSize) {
    if (downloadedSize > expectedSize) {
      await removeFile(path);
    }
    throw new AppUpdateError(
      'UPD-204',
      `expected ${expectedSize} bytes, received ${downloadedSize}`,
      downloadedSize < expectedSize,
    );
  }

  if (expectedDigest?.startsWith('sha256:')) {
    try {
      const actualDigest = await ReactNativeBlobUtil.fs.hash(path, 'sha256');
      if (`sha256:${actualDigest}` !== expectedDigest.toLowerCase()) {
        await removeFile(path);
        throw new AppUpdateError('UPD-204', 'SHA-256 digest mismatch');
      }
    } catch (error) {
      if (error instanceof AppUpdateError) {
        throw error;
      }
      throw new AppUpdateError('UPD-205', technicalMessage(error));
    }
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

  // 與 book 專案一致使用 CacheDir，避免共用儲存空間權限與 DownloadManager 路徑問題。
  const destination = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/${apkFileName(
    url,
  )}`;
  const partial = `${destination}.part`;
  await removeFile(destination);

  let completed = false;
  let lastError: AppUpdateError | null = null;

  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt += 1) {
    let existingSize = await fileSize(partial);
    if (existingSize > asset.size) {
      await removeFile(partial);
      existingSize = 0;
    }

    if (existingSize === asset.size) {
      await verifyDownload(partial, asset.size, asset.digest);
      completed = true;
      break;
    }

    const isResume = existingSize > 0;
    const requestPath = isResume ? `${partial}?append=true` : partial;
    const headers: Record<string, string> = {
      Accept: 'application/octet-stream',
      'User-Agent': `FitnessApp/${currentVersion}`,
    };
    if (isResume) {
      headers.Range = `bytes=${existingSize}-`;
    }

    try {
      const response = await ReactNativeBlobUtil.config({
        path: requestPath,
        overwrite: !isResume,
        followRedirect: true,
        timeout: 30000,
      })
        .fetch('GET', url, headers)
        .progress({ interval: 250 }, received => {
          const downloaded = existingSize + Number(received);
          onProgress(Math.min(downloaded / asset.size, 0.99));
        });

      const status = response.info().status;
      if (status < 200 || status >= 300) {
        await removeFile(partial);
        throw new AppUpdateError('UPD-203', `HTTP ${status}`);
      }
      if (isResume && status !== 206) {
        await removeFile(partial);
        throw new AppUpdateError(
          'UPD-203',
          `server ignored range request: HTTP ${status}`,
          true,
        );
      }

      await verifyDownload(partial, asset.size, asset.digest);
      completed = true;
      break;
    } catch (error) {
      lastError = normalizeDownloadError(error);
      if (!lastError.retryable || attempt === DOWNLOAD_ATTEMPTS) {
        throw lastError;
      }
      await wait(attempt * 750);
    }
  }

  if (!completed) {
    throw lastError ?? new AppUpdateError('UPD-202');
  }

  try {
    await ReactNativeBlobUtil.fs.mv(partial, destination);
  } catch (error) {
    throw new AppUpdateError('UPD-205', technicalMessage(error));
  }
  onProgress(1);

  try {
    // 不可在 Intent 後立刻刪檔；Android 安裝器仍需透過套件的 FileProvider 讀取。
    await ReactNativeBlobUtil.android.actionViewIntent(destination, APK_MIME);
  } catch (error) {
    throw new AppUpdateError('UPD-301', technicalMessage(error));
  }
}
