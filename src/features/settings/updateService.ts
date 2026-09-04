import { AppUpdateError, technicalMessage } from './updateErrors';

export const GITHUB_OWNER = 'bdorz';
export const GITHUB_REPO = 'fitness';
export const CURRENT_VERSION = '1.0.6';

export interface GithubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  digest?: string;
}

export interface GithubRelease {
  tag_name: string;
  name: string;
  body: string;
  assets: GithubReleaseAsset[];
}

function versionParts(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split('.')
    .map(part => Number(part) || 0);
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

function isGithubRelease(value: unknown): value is GithubRelease {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const release = value as Partial<GithubRelease>;
  return typeof release.tag_name === 'string' && Array.isArray(release.assets);
}

async function parseReleaseResponse(
  response: Response,
): Promise<GithubRelease> {
  try {
    const data: unknown = await response.json();
    if (!isGithubRelease(data)) {
      throw new Error('missing tag_name or assets');
    }
    return data;
  } catch (error) {
    throw new AppUpdateError('UPD-103', technicalMessage(error));
  }
}

async function githubFetch(url: string): Promise<Response> {
  try {
    return await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (error) {
    throw new AppUpdateError('UPD-101', technicalMessage(error));
  }
}

export async function fetchLatestRelease(): Promise<GithubRelease> {
  const baseUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`;
  const cacheBuster = Date.now();
  const latestResponse = await githubFetch(
    `${baseUrl}/releases/latest?ts=${cacheBuster}`,
  );
  if (latestResponse.ok) {
    return parseReleaseResponse(latestResponse);
  }

  // 部分裝置可能保留 repository 尚未公開時的 404，改用列表端點重試。
  const listResponse = await githubFetch(
    `${baseUrl}/releases?per_page=1&ts=${cacheBuster}`,
  );
  if (!listResponse.ok) {
    throw new AppUpdateError(
      'UPD-102',
      `HTTP ${latestResponse.status}/${listResponse.status}`,
    );
  }

  let releases: unknown;
  try {
    releases = await listResponse.json();
  } catch (error) {
    throw new AppUpdateError('UPD-103', technicalMessage(error));
  }
  if (!Array.isArray(releases) || !releases.length) {
    throw new AppUpdateError('UPD-104');
  }
  if (!isGithubRelease(releases[0])) {
    throw new AppUpdateError('UPD-103', 'invalid releases response');
  }
  return releases[0];
}
